import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { appRepository } from "../lib/app-repository.js";
import { blockDemoWrites } from "../lib/demo-guard.js";
import { groupRepository } from "../lib/group-repository.js";
import { requireAdmin, requireSession } from "../lib/auth.js";

type IdParams = {
  id: string;
};

type EmbedCheckResult = {
  embeddable: boolean;
  openExternally: boolean;
  checkedAt: string;
  reason:
    | "ok"
    | "network_error"
    | "x_frame_options"
    | "csp_frame_ancestors"
    | "auth_redirect"
    | "too_many_redirects";
  externalUrl: string | null;
};

const authPathHints = ["/authorize", "/oauth", "/oidc", "/login", "/signin", "/auth"];
const authHostHints = new Set(["auth", "login", "signin", "sso", "id", "account"]);
const MAX_EMBED_REDIRECTS = 20;

function splitHeaderValue(value: string | string[] | undefined) {
  const normalized = Array.isArray(value) ? value[0] : value;
  return normalized?.split(",")[0]?.trim() ?? null;
}

function normalizeOrigin(value: string | null | undefined) {
  if (!value?.trim()) {
    return null;
  }

  try {
    return new URL(value).origin.toLowerCase();
  } catch {
    return null;
  }
}

function resolveRequesterOrigin(request: FastifyRequest) {
  const headerOrigin = normalizeOrigin(splitHeaderValue(request.headers.origin));
  if (headerOrigin) {
    return headerOrigin;
  }

  const forwardedHost = splitHeaderValue(request.headers["x-forwarded-host"]);
  const forwardedProto = splitHeaderValue(request.headers["x-forwarded-proto"]);
  const host = forwardedHost ?? splitHeaderValue(request.headers.host);
  if (!host) {
    return null;
  }

  const protocol = forwardedProto ?? request.protocol ?? "http";
  return normalizeOrigin(`${protocol}://${host}`);
}

function extractFrameAncestorsDirective(contentSecurityPolicy: string | null) {
  if (!contentSecurityPolicy) {
    return null;
  }

  const directive = contentSecurityPolicy
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.toLowerCase().startsWith("frame-ancestors"));

  if (!directive) {
    return null;
  }

  return directive.slice("frame-ancestors".length).trim().toLowerCase();
}

function matchesFrameAncestorHost(hostPattern: string, requesterHost: string) {
  if (hostPattern.startsWith("*.")) {
    const bareHost = hostPattern.slice(2);
    return requesterHost === bareHost || requesterHost.endsWith(`.${bareHost}`);
  }

  return requesterHost === hostPattern;
}

function isFrameAncestorsSourceMatch(source: string, requesterOrigin: string, targetOrigin: string) {
  const normalizedSource = source.trim().toLowerCase();
  if (!normalizedSource) {
    return false;
  }

  if (normalizedSource === "'self'") {
    return requesterOrigin === targetOrigin;
  }

  if (normalizedSource === "*") {
    return true;
  }

  const requesterUrl = new URL(requesterOrigin);
  const targetUrl = new URL(targetOrigin);

  if (/^[a-z][a-z0-9+.-]*:$/.test(normalizedSource)) {
    return requesterUrl.protocol === normalizedSource;
  }

  const exactOrigin = normalizeOrigin(normalizedSource);
  if (exactOrigin) {
    return requesterOrigin === exactOrigin;
  }

  const wildcardOriginMatch = normalizedSource.match(/^([a-z][a-z0-9+.-]*):\/\/(\*\.[^/:]+)(?::(\d+|\*))?$/);
  if (wildcardOriginMatch) {
    const [, scheme, hostPattern, port] = wildcardOriginMatch;
    if (requesterUrl.protocol !== `${scheme}:`) {
      return false;
    }

    if (port && port !== "*" && requesterUrl.port !== port) {
      return false;
    }

    return matchesFrameAncestorHost(hostPattern, requesterUrl.hostname.toLowerCase());
  }

  const hostSourceMatch = normalizedSource.match(/^(\*\.[^/:]+|[^/:]+)(?::(\d+|\*))?$/);
  if (hostSourceMatch) {
    const [, hostPattern, port] = hostSourceMatch;
    if (requesterUrl.protocol !== targetUrl.protocol) {
      return false;
    }

    if (port && port !== "*" && requesterUrl.port !== port) {
      return false;
    }

    return matchesFrameAncestorHost(hostPattern, requesterUrl.hostname.toLowerCase());
  }

  return false;
}

function isFrameAncestorsBlocking(directiveValue: string | null, requesterOrigin: string | null, targetOrigin: string) {
  if (!directiveValue) {
    return false;
  }

  const sources = directiveValue.split(/\s+/).map((source) => source.trim()).filter(Boolean);
  if (sources.includes("'none'")) {
    return true;
  }

  if (sources.includes("*")) {
    return false;
  }

  if (!requesterOrigin) {
    return true;
  }

  return !sources.some((source) => isFrameAncestorsSourceMatch(source, requesterOrigin, targetOrigin));
}

function isXFrameOptionsBlocking(xFrameOptions: string | null, requesterOrigin: string | null, targetOrigin: string) {
  if (!xFrameOptions) {
    return false;
  }

  const normalized = xFrameOptions.toLowerCase();
  if (normalized.includes("deny")) {
    return true;
  }

  if (normalized.includes("sameorigin")) {
    return requesterOrigin !== targetOrigin;
  }

  return false;
}

function isLikelyAuthRedirect(targetUrl: URL) {
  const lowerPathname = targetUrl.pathname.toLowerCase();
  if (authPathHints.some((pathHint) => lowerPathname.includes(pathHint))) {
    return true;
  }

  const hostnameLabels = targetUrl.hostname.toLowerCase().split(".");
  if (hostnameLabels.some((label) => authHostHints.has(label))) {
    return true;
  }

  const query = targetUrl.searchParams;
  if (query.has("client_id") && query.has("redirect_uri")) {
    return true;
  }

  return query.has("code_challenge") || query.has("response_type");
}

async function checkEmbeddingBehavior(appUrl: string, requesterOrigin: string | null): Promise<EmbedCheckResult> {
  const checkedAt = new Date().toISOString();

  let currentUrl: URL;
  try {
    currentUrl = new URL(appUrl);
  } catch {
    return {
      embeddable: false,
      openExternally: true,
      checkedAt,
      reason: "network_error",
      externalUrl: appUrl,
    };
  }

  let sawAuthRedirect = false;
  let lastAuthUrl: URL | null = null;

  for (let redirectIndex = 0; redirectIndex < MAX_EMBED_REDIRECTS; redirectIndex += 1) {
    let response: Response;

    try {
      response = await fetch(currentUrl.toString(), {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(4000),
      });
    } catch {
      return {
        embeddable: false,
        openExternally: true,
        checkedAt,
        reason: "network_error",
        externalUrl: currentUrl.toString(),
      };
    }

    const targetOrigin = currentUrl.origin.toLowerCase();
    const currentUrlLooksAuth = isLikelyAuthRedirect(currentUrl);
    const xFrameOptions = response.headers.get("x-frame-options");
    if (isXFrameOptionsBlocking(xFrameOptions, requesterOrigin, targetOrigin)) {
      if (currentUrlLooksAuth) {
        return {
          embeddable: false,
          openExternally: true,
          checkedAt,
          reason: "auth_redirect",
          externalUrl: currentUrl.toString(),
        };
      }

      return {
        embeddable: false,
        openExternally: true,
        checkedAt,
        reason: "x_frame_options",
        externalUrl: currentUrl.toString(),
      };
    }

    const frameAncestors = extractFrameAncestorsDirective(response.headers.get("content-security-policy"));
    if (isFrameAncestorsBlocking(frameAncestors, requesterOrigin, targetOrigin)) {
      if (currentUrlLooksAuth) {
        return {
          embeddable: false,
          openExternally: true,
          checkedAt,
          reason: "auth_redirect",
          externalUrl: currentUrl.toString(),
        };
      }

      return {
        embeddable: false,
        openExternally: true,
        checkedAt,
        reason: "csp_frame_ancestors",
        externalUrl: currentUrl.toString(),
      };
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        if (currentUrlLooksAuth) {
          return {
            embeddable: false,
            openExternally: true,
            checkedAt,
            reason: "auth_redirect",
            externalUrl: currentUrl.toString(),
          };
        }

        return {
          embeddable: true,
          openExternally: false,
          checkedAt,
          reason: "ok",
          externalUrl: null,
        };
      }

      const redirectUrl = new URL(location, currentUrl);
      if (isLikelyAuthRedirect(redirectUrl)) {
        sawAuthRedirect = true;
        lastAuthUrl = redirectUrl;
      }

      currentUrl = redirectUrl;
      continue;
    }

    if (currentUrlLooksAuth) {
      return {
        embeddable: false,
        openExternally: true,
        checkedAt,
        reason: "auth_redirect",
        externalUrl: currentUrl.toString(),
      };
    }

    return {
      embeddable: true,
      openExternally: false,
      checkedAt,
      reason: "ok",
      externalUrl: null,
    };
  }

  return {
    embeddable: false,
    openExternally: true,
    checkedAt,
    reason: sawAuthRedirect ? "auth_redirect" : "too_many_redirects",
    externalUrl: (lastAuthUrl ?? currentUrl).toString(),
  };
}

const appSchema = z.object({
  name: z.string().trim().min(2).max(64),
  url: z.string().url(),
  icon: z.string().trim().min(1).max(2_000_000).refine((value) => {
    if (/^[A-Za-z0-9-]+$/.test(value)) {
      return true;
    }

    if (/^data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+$/.test(value)) {
      return true;
    }

    try {
      const parsedUrl = new URL(value);
      return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
    } catch {
      return false;
    }
  }, "errors.invalidIcon"),
  iconVariantMode: z.enum(["auto", "base"]).default("auto"),
  iconVariantInverted: z.boolean().default(false),
  accent: z.string().regex(/^#([0-9a-fA-F]{6})$/, "errors.invalidData"),
  openMode: z.enum(["iframe", "external"]),
  isShared: z.boolean().default(true),
  groupId: z.number().int().positive().nullable().optional(),
});

const reorderSchema = z.object({
  items: z.array(
    z.object({
      id: z.number().int().positive(),
      groupId: z.number().int().positive().nullable(),
    })
  ).min(1),
});

const importAppItemSchema = appSchema.extend({
  groupName: z.string().trim().min(1).max(40).nullable().optional(),
});

const importAppsSchema = z.object({
  mode: z.enum(["merge", "replace"]).default("merge"),
  items: z.array(importAppItemSchema).min(1).max(500),
});

export async function registerAppRoutes(server: FastifyInstance) {
  const writeRouteConfig = {
    config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
  } as const;

  server.get("/api/apps", async (request, reply) => {
    const user = requireSession(request, reply);
    if (!user) {
      return reply;
    }

    return {
      items: appRepository.listAppsForRole(user.role),
    };
  });

  server.get<{ Params: IdParams }>("/api/apps/:id/ping", { config: { rateLimit: false } }, async (request, reply) => {
    const user = requireSession(request, reply);
    if (!user) {
      return reply;
    }

    const id = Number(request.params.id);
    if (!Number.isInteger(id)) {
      return reply.code(400).send({ message: "errors.invalidId" });
    }

    const app = appRepository.getAppById(id);
    if (!app) {
      return reply.code(404).send({ message: "errors.invalidApp" });
    }

    if (user.role !== "admin" && !app.is_shared) {
      return reply.code(404).send({ message: "errors.invalidApp" });
    }

    const isReachableResponseStatus = (status: number) =>
      (status >= 200 && status < 300) || status === 401 || status === 403;

    const checkUrl = async (method: "HEAD" | "GET") => {
      const response = await fetch(app.url, {
        method,
        signal: AbortSignal.timeout(3000),
      });

      return isReachableResponseStatus(response.status);
    };

    try {
      const headOnline = await checkUrl("HEAD");
      if (headOnline) {
        return {
          status: "online",
          checkedAt: new Date().toISOString(),
        };
      }
    } catch {
      // Some services do not support HEAD reliably.
    }

    try {
      const getOnline = await checkUrl("GET");
      return {
        status: getOnline ? "online" : "offline",
        checkedAt: new Date().toISOString(),
      };
    } catch {
      return {
        status: "offline",
        checkedAt: new Date().toISOString(),
      };
    }
  });

  server.get<{ Params: IdParams }>("/api/apps/:id/embed-check", { config: { rateLimit: false } }, async (request, reply) => {
    const user = requireSession(request, reply);
    if (!user) {
      return reply;
    }

    const id = Number(request.params.id);
    if (!Number.isInteger(id)) {
      return reply.code(400).send({ message: "errors.invalidId" });
    }

    const app = appRepository.getAppById(id);
    if (!app) {
      return reply.code(404).send({ message: "errors.invalidApp" });
    }

    if (user.role !== "admin" && !app.is_shared) {
      return reply.code(404).send({ message: "errors.invalidApp" });
    }

    if (app.open_mode !== "iframe") {
      const result: EmbedCheckResult = {
        embeddable: false,
        openExternally: true,
        checkedAt: new Date().toISOString(),
        reason: "ok",
        externalUrl: app.url,
      };
      return result;
    }

    const requesterOrigin = resolveRequesterOrigin(request);
    return checkEmbeddingBehavior(app.url, requesterOrigin);
  });

  server.post<{ Params: IdParams }>("/api/apps/:id/default", writeRouteConfig, async (request, reply) => {
    const user = requireSession(request, reply);
    if (!user) {
      return reply;
    }

    if (!requireAdmin(user, reply)) {
      return reply;
    }

    if (blockDemoWrites(reply)) {
      return reply;
    }

    const id = Number(request.params.id);
    if (!Number.isInteger(id)) {
      return reply.code(400).send({ message: "errors.invalidId" });
    }

    const app = appRepository.getAppById(id);
    if (!app) {
      return reply.code(404).send({ message: "errors.invalidApp" });
    }

    return {
      items: appRepository.setDefaultApp(id),
    };
  });

  server.delete<{ Params: IdParams }>("/api/apps/:id/default", writeRouteConfig, async (request, reply) => {
    const user = requireSession(request, reply);
    if (!user) {
      return reply;
    }

    if (!requireAdmin(user, reply)) {
      return reply;
    }

    if (blockDemoWrites(reply)) {
      return reply;
    }

    const id = Number(request.params.id);
    if (!Number.isInteger(id)) {
      return reply.code(400).send({ message: "errors.invalidId" });
    }

    const app = appRepository.getAppById(id);
    if (!app) {
      return reply.code(404).send({ message: "errors.invalidApp" });
    }

    return {
      items: appRepository.setDefaultApp(null),
    };
  });

  server.post("/api/apps", writeRouteConfig, async (request, reply) => {
    const user = requireSession(request, reply);
    if (!user) {
      return reply;
    }

    if (!requireAdmin(user, reply)) {
      return reply;
    }

    if (blockDemoWrites(reply)) {
      return reply;
    }

    const parsed = appSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "errors.invalidData", issues: parsed.error.flatten() });
    }

    if (parsed.data.groupId !== undefined && parsed.data.groupId !== null && !groupRepository.hasGroup(parsed.data.groupId)) {
      return reply.code(400).send({ message: "errors.invalidGroup" });
    }

    const app = appRepository.insertApp(parsed.data);
    return reply.code(201).send({ item: appRepository.listApps().find((item) => item.id === app.id) });
  });

  server.put<{ Params: IdParams }>("/api/apps/:id", writeRouteConfig, async (request, reply) => {
    const user = requireSession(request, reply);
    if (!user) {
      return reply;
    }

    if (!requireAdmin(user, reply)) {
      return reply;
    }

    if (blockDemoWrites(reply)) {
      return reply;
    }

    const id = Number(request.params.id);
    if (!Number.isInteger(id)) {
      return reply.code(400).send({ message: "errors.invalidId" });
    }

    const parsed = appSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "errors.invalidData", issues: parsed.error.flatten() });
    }

    if (parsed.data.groupId !== undefined && parsed.data.groupId !== null && !groupRepository.hasGroup(parsed.data.groupId)) {
      return reply.code(400).send({ message: "errors.invalidGroup" });
    }

    const app = appRepository.updateApp(id, parsed.data);
    if (!app) {
      return reply.code(404).send({ message: "errors.invalidApp" });
    }

    return { item: app };
  });

  server.delete<{ Params: IdParams }>("/api/apps/:id", writeRouteConfig, async (request, reply) => {
    const user = requireSession(request, reply);
    if (!user) {
      return reply;
    }

    if (!requireAdmin(user, reply)) {
      return reply;
    }

    if (blockDemoWrites(reply)) {
      return reply;
    }

    const id = Number(request.params.id);
    if (!Number.isInteger(id)) {
      return reply.code(400).send({ message: "errors.invalidId" });
    }

    const deleted = appRepository.deleteAppAndReindex(id);
    if (!deleted) {
      return reply.code(404).send({ message: "errors.invalidApp" });
    }

    return reply.code(204).send();
  });

  server.post("/api/apps/reorder", writeRouteConfig, async (request, reply) => {
    const user = requireSession(request, reply);
    if (!user) {
      return reply;
    }

    if (!requireAdmin(user, reply)) {
      return reply;
    }

    if (blockDemoWrites(reply)) {
      return reply;
    }

    const parsed = reorderSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "errors.invalidOrder" });
    }

    if (!appRepository.hasExactOrderedIds(parsed.data.items.map((item) => item.id))) {
      return reply.code(400).send({ message: "errors.invalidOrderDuplicate" });
    }

    if (parsed.data.items.some((item) => item.groupId !== null && !groupRepository.hasGroup(item.groupId))) {
      return reply.code(400).send({ message: "errors.invalidGroup" });
    }

    return {
      items: appRepository.reorderApps(parsed.data.items),
    };
  });

  server.post("/api/apps/import", writeRouteConfig, async (request, reply) => {
    const user = requireSession(request, reply);
    if (!user) {
      return reply;
    }

    if (!requireAdmin(user, reply)) {
      return reply;
    }

    if (blockDemoWrites(reply)) {
      return reply;
    }

    const parsed = importAppsSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "errors.invalidJsonImport", issues: parsed.error.flatten() });
    }

    const groupNameToId = new Map<string, number>();
    for (const item of parsed.data.items) {
      const name = item.groupName ?? null;
      if (!name || (item.groupId != null && groupRepository.hasGroup(item.groupId))) {
        continue;
      }
      if (groupNameToId.has(name)) {
        continue;
      }
      const existing = groupRepository.listGroups().find((g) => g.name.toLowerCase() === name.toLowerCase());
      groupNameToId.set(name, existing ? existing.id : groupRepository.createGroup(name).id);
    }

    const sanitizedItems = parsed.data.items.map((item) => {
      if (item.groupId != null && groupRepository.hasGroup(item.groupId)) {
        return item;
      }
      const mappedId = item.groupName ? groupNameToId.get(item.groupName) ?? null : null;
      return { ...item, groupId: mappedId };
    });

    return appRepository.importApps(parsed.data.mode, sanitizedItems);
  });
}
