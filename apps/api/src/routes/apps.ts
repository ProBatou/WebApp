import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { createAppRepository } from "../lib/app-repository.js";
import { db } from "../lib/db.js";
import { isDemoMode } from "../lib/demo.js";
import { requireSession } from "../lib/auth.js";
import type { AppRecord } from "../lib/types.js";

const appSchema = z.object({
  name: z.string().trim().min(2).max(64),
  description: z.string().trim().max(180).default(""),
  url: z.string().url(),
  icon: z.string().trim().min(1).max(80).regex(/^[A-Za-z0-9-]+$/, "Icone invalide."),
  iconVariantMode: z.enum(["auto", "base"]).default("auto"),
  iconVariantInverted: z.boolean().default(false),
  accent: z.string().regex(/^#([0-9a-fA-F]{6})$/, "Couleur invalide."),
  openMode: z.enum(["iframe", "external"]),
});

const reorderSchema = z.object({
  orderedIds: z.array(z.number().int().positive()).min(1),
});

const importAppsSchema = z.object({
  mode: z.enum(["merge", "replace"]).default("merge"),
  items: z.array(appSchema).min(1).max(500),
});

const appRepository = createAppRepository(db);

function blockDemoWrites(reply: FastifyReply) {
  if (!isDemoMode) {
    return false;
  }

  reply.code(403).send({ message: "Mode demo: modifications desactivees." });
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
      items: appRepository.listApps(),
    };
  });

  server.get("/api/apps/:id/ping", async (request, reply) => {
    const user = requireSession(request, reply);
    if (!user) {
      return reply;
    }

    const id = Number((request.params as { id: string }).id);
    if (!Number.isInteger(id)) {
      return reply.code(400).send({ message: "Identifiant invalide." });
    }

    const app = db.prepare("SELECT id, url FROM apps WHERE id = ?").get(id) as Pick<AppRecord, "id" | "url"> | undefined;
    if (!app) {
      return reply.code(404).send({ message: "Application introuvable." });
    }

    try {
      const response = await fetch(app.url, {
        method: "HEAD",
        signal: AbortSignal.timeout(3000),
      });

      return {
        status: response.ok ? "online" : "offline",
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
    if (blockDemoWrites(reply)) {
      return reply;
    }

    const user = requireSession(request, reply);
    if (!user) {
      return reply;
    }

    const id = Number((request.params as { id: string }).id);
    if (!Number.isInteger(id)) {
      return reply.code(400).send({ message: "Identifiant invalide." });
    }

    const app = db.prepare("SELECT id FROM apps WHERE id = ?").get(id) as Pick<AppRecord, "id"> | undefined;
    if (!app) {
      return reply.code(404).send({ message: "Application introuvable." });
    }

    return {
      items: appRepository.setDefaultApp(id),
    };
  });

  server.delete("/api/apps/:id/default", writeRouteConfig, async (request, reply) => {
    if (blockDemoWrites(reply)) {
      return reply;
    }

    const user = requireSession(request, reply);
    if (!user) {
      return reply;
    }

    const id = Number((request.params as { id: string }).id);
    if (!Number.isInteger(id)) {
      return reply.code(400).send({ message: "Identifiant invalide." });
    }

    const app = db.prepare("SELECT id FROM apps WHERE id = ?").get(id) as Pick<AppRecord, "id"> | undefined;
    if (!app) {
      return reply.code(404).send({ message: "Application introuvable." });
    }

    return {
      items: appRepository.setDefaultApp(null),
    };
  });

  server.post("/api/apps", writeRouteConfig, async (request, reply) => {
    if (blockDemoWrites(reply)) {
      return reply;
    }

    const user = requireSession(request, reply);
    if (!user) {
      return reply;
    }

    const parsed = appSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Donnees invalides.", issues: parsed.error.flatten() });
    }

    const app = appRepository.insertApp(parsed.data);
    return reply.code(201).send({ item: appRepository.listApps().find((item) => item.id === app.id) });
  });

  server.put("/api/apps/:id", writeRouteConfig, async (request, reply) => {
    if (blockDemoWrites(reply)) {
      return reply;
    }

    const user = requireSession(request, reply);
    if (!user) {
      return reply;
    }

    const id = Number((request.params as { id: string }).id);
    if (!Number.isInteger(id)) {
      return reply.code(400).send({ message: "Identifiant invalide." });
    }

    const parsed = appSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Donnees invalides.", issues: parsed.error.flatten() });
    }

    const now = new Date().toISOString();
    db.prepare(
      `UPDATE apps
       SET name = ?, description = ?, url = ?, icon = ?, icon_variant_mode = ?, icon_variant_inverted = ?, accent = ?, open_mode = ?, updated_at = ?
       WHERE id = ?`
    ).run(
      parsed.data.name,
      parsed.data.description,
      parsed.data.url,
      parsed.data.icon.trim(),
      parsed.data.iconVariantMode,
      parsed.data.iconVariantInverted ? 1 : 0,
      parsed.data.accent,
      parsed.data.openMode,
      now,
      id
    );

    const app = db.prepare("SELECT * FROM apps WHERE id = ?").get(id) as AppRecord | undefined;
    if (!app) {
      return reply.code(404).send({ message: "Application introuvable." });
    }

    return { item: appRepository.listApps().find((item) => item.id === app.id) };
  });

  server.delete("/api/apps/:id", writeRouteConfig, async (request, reply) => {
    if (blockDemoWrites(reply)) {
      return reply;
    }

    const user = requireSession(request, reply);
    if (!user) {
      return reply;
    }

    const id = Number((request.params as { id: string }).id);
    if (!Number.isInteger(id)) {
      return reply.code(400).send({ message: "Identifiant invalide." });
    }

    appRepository.deleteAppAndReindex(id);

    return reply.code(204).send();
  });

  server.post("/api/apps/reorder", writeRouteConfig, async (request, reply) => {
    if (blockDemoWrites(reply)) {
      return reply;
    }

    const user = requireSession(request, reply);
    if (!user) {
      return reply;
    }

    const parsed = reorderSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Ordre invalide." });
    }

    if (!appRepository.hasExactOrderedIds(parsed.data.orderedIds)) {
      return reply.code(400).send({ message: "Ordre invalide: la liste doit contenir chaque application une seule fois." });
    }

    return {
      items: appRepository.reorderApps(parsed.data.orderedIds),
    };
  });

  server.post("/api/apps/import", writeRouteConfig, async (request, reply) => {
    if (blockDemoWrites(reply)) {
      return reply;
    }

    const user = requireSession(request, reply);
    if (!user) {
      return reply;
    }

    const parsed = importAppsSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Import JSON invalide.", issues: parsed.error.flatten() });
    }

    return appRepository.importApps(parsed.data.mode, parsed.data.items);
  });
}
