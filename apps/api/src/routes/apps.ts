import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { createAppRepository } from "../lib/app-repository.js";
import { db } from "../lib/db.js";
import { isDemoMode } from "../lib/demo.js";
import { createGroupRepository } from "../lib/group-repository.js";
import { requireAdmin, requireSession } from "../lib/auth.js";
import type { AppRecord } from "../lib/types.js";

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

const appRepository = createAppRepository(db);
const groupRepository = createGroupRepository(db);

function blockDemoWrites(reply: FastifyReply) {
  if (!isDemoMode) {
    return false;
  }

  reply.code(403).send({ message: "errors.demoMode" });
  return true;
}

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

  server.get("/api/apps/:id/ping", async (request, reply) => {
    const user = requireSession(request, reply);
    if (!user) {
      return reply;
    }

    const id = Number((request.params as { id: string }).id);
    if (!Number.isInteger(id)) {
      return reply.code(400).send({ message: "errors.invalidId" });
    }

    const app = db.prepare("SELECT id, url, is_shared FROM apps WHERE id = ?").get(id) as
      | Pick<AppRecord, "id" | "url" | "is_shared">
      | undefined;
    if (!app) {
      return reply.code(404).send({ message: "errors.invalidApp" });
    }

    if (user.role !== "admin" && app.is_shared !== 1) {
      return reply.code(404).send({ message: "errors.invalidApp" });
    }

    const checkUrl = async (method: "HEAD" | "GET") => {
      const response = await fetch(app.url, {
        method,
        signal: AbortSignal.timeout(3000),
      });

      return response.ok;
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

  server.post("/api/apps/:id/default", writeRouteConfig, async (request, reply) => {
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

    const id = Number((request.params as { id: string }).id);
    if (!Number.isInteger(id)) {
      return reply.code(400).send({ message: "errors.invalidId" });
    }

    const app = db.prepare("SELECT id FROM apps WHERE id = ?").get(id) as Pick<AppRecord, "id"> | undefined;
    if (!app) {
      return reply.code(404).send({ message: "errors.invalidApp" });
    }

    return {
      items: appRepository.setDefaultApp(id),
    };
  });

  server.delete("/api/apps/:id/default", writeRouteConfig, async (request, reply) => {
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

    const id = Number((request.params as { id: string }).id);
    if (!Number.isInteger(id)) {
      return reply.code(400).send({ message: "errors.invalidId" });
    }

    const app = db.prepare("SELECT id FROM apps WHERE id = ?").get(id) as Pick<AppRecord, "id"> | undefined;
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

  server.put("/api/apps/:id", writeRouteConfig, async (request, reply) => {
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

    const id = Number((request.params as { id: string }).id);
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

    const now = new Date().toISOString();
    db.prepare(
      `UPDATE apps
       SET name = ?, url = ?, icon = ?, icon_variant_mode = ?, icon_variant_inverted = ?, accent = ?, open_mode = ?, is_shared = ?, group_id = ?, updated_at = ?
       WHERE id = ?`
    ).run(
      parsed.data.name,
      parsed.data.url,
      parsed.data.icon.trim(),
      parsed.data.iconVariantMode,
      parsed.data.iconVariantInverted ? 1 : 0,
      parsed.data.accent,
      parsed.data.openMode,
      parsed.data.isShared ? 1 : 0,
      parsed.data.groupId ?? null,
      now,
      id
    );

    const app = db.prepare("SELECT * FROM apps WHERE id = ?").get(id) as AppRecord | undefined;
    if (!app) {
      return reply.code(404).send({ message: "errors.invalidApp" });
    }

    return { item: appRepository.listApps().find((item) => item.id === app.id) };
  });

  server.delete("/api/apps/:id", writeRouteConfig, async (request, reply) => {
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

    const id = Number((request.params as { id: string }).id);
    if (!Number.isInteger(id)) {
      return reply.code(400).send({ message: "errors.invalidId" });
    }

    appRepository.deleteAppAndReindex(id);

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
