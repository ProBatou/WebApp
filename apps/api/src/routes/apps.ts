import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { serializeAppRecord, type SerializedAppRecord } from "../lib/apps.js";
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

function listApps() {
  return (db.prepare("SELECT * FROM apps ORDER BY sort_order ASC, id ASC").all() as AppRecord[]).map(serializeAppRecord);
}

function blockDemoWrites(reply: FastifyReply) {
  if (!isDemoMode) {
    return false;
  }

  reply.code(403).send({ message: "Mode demo: modifications desactivees." });
  return true;
}

function getOrderedAppIds() {
  return (db.prepare("SELECT id FROM apps ORDER BY sort_order ASC, id ASC").all() as Array<{ id: number }>).map((row) => row.id);
}

function hasExactOrderedIds(candidateIds: number[]) {
  const uniqueIds = new Set(candidateIds);
  if (uniqueIds.size !== candidateIds.length) {
    return false;
  }

  const existingIds = getOrderedAppIds();
  if (existingIds.length !== candidateIds.length) {
    return false;
  }

  return existingIds.every((id) => uniqueIds.has(id));
}

const insertAppTransaction = db.transaction((payload: z.infer<typeof appSchema>) => {
  const now = new Date().toISOString();
  const sortRow = db.prepare("SELECT COALESCE(MAX(sort_order), 0) as maxOrder FROM apps").get() as { maxOrder: number };
  const result = db
    .prepare(
      `INSERT INTO apps (name, description, url, icon, icon_variant_mode, icon_variant_inverted, accent, open_mode, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      payload.name,
      payload.description,
      payload.url,
      payload.icon.trim(),
      payload.iconVariantMode,
      payload.iconVariantInverted ? 1 : 0,
      payload.accent,
      payload.openMode,
      sortRow.maxOrder + 1,
      now,
      now
    );

  return db.prepare("SELECT * FROM apps WHERE id = ?").get(Number(result.lastInsertRowid)) as AppRecord;
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
      items: listApps(),
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

    const app = insertAppTransaction(parsed.data);
    return reply.code(201).send({ item: serializeAppRecord(app) });
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

    return { item: serializeAppRecord(app) };
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

    db.prepare("DELETE FROM apps WHERE id = ?").run(id);

    const apps = listApps();
    const reorder = db.transaction((items: SerializedAppRecord[]) => {
      const statement = db.prepare("UPDATE apps SET sort_order = ? WHERE id = ?");
      items.forEach((item, index) => {
        statement.run(index + 1, item.id);
      });
    });
    reorder(apps);

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

    if (!hasExactOrderedIds(parsed.data.orderedIds)) {
      return reply.code(400).send({ message: "Ordre invalide: la liste doit contenir chaque application une seule fois." });
    }

    const reorder = db.transaction((orderedIds: number[]) => {
      const statement = db.prepare("UPDATE apps SET sort_order = ? WHERE id = ?");
      orderedIds.forEach((id, index) => {
        statement.run(index + 1, id);
      });
    });

    reorder(parsed.data.orderedIds);

    return {
      items: listApps(),
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

    const insertedIds: number[] = [];
    const now = new Date().toISOString();

    const importTransaction = db.transaction(() => {
      if (parsed.data.mode === "replace") {
        db.prepare("DELETE FROM apps").run();
      }

      const sortRow = db.prepare("SELECT COALESCE(MAX(sort_order), 0) as maxOrder FROM apps").get() as { maxOrder: number };
      const insertStatement = db.prepare(
        `INSERT INTO apps (name, description, url, icon, icon_variant_mode, icon_variant_inverted, accent, open_mode, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );

      parsed.data.items.forEach((item, index) => {
        const result = insertStatement.run(
          item.name,
          item.description,
          item.url,
          item.icon.trim(),
          item.iconVariantMode,
          item.iconVariantInverted ? 1 : 0,
          item.accent,
          item.openMode,
          sortRow.maxOrder + index + 1,
          now,
          now
        );

        insertedIds.push(Number(result.lastInsertRowid));
      });
    });

    importTransaction();

    return {
      items: listApps(),
      importedIds: insertedIds,
    };
  });
}
