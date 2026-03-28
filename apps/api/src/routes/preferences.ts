import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireSession } from "../lib/auth.js";
import { getPreferences, upsertPreferences } from "../lib/preferences-repository.js";

const updatePreferencesSchema = z.object({
  theme: z.enum(["light", "dark", "auto"]).optional(),
  language: z.string().max(8).optional(),
  defaultAppId: z.number().int().positive().nullable().optional(),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
  sidebarColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
  buttonColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
});

function toResponse(record: ReturnType<typeof getPreferences>) {
  return {
    theme: record.theme,
    language: record.language,
    defaultAppId: record.default_app_id,
    accentColor: record.accent_color,
    sidebarColor: record.sidebar_color,
    buttonColor: record.button_color,
  };
}

export async function registerPreferencesRoutes(server: FastifyInstance) {
  server.get("/api/user/preferences", async (request, reply) => {
    const user = requireSession(request, reply);
    if (!user) return reply;
    return toResponse(getPreferences(user.id));
  });

  server.put("/api/user/preferences", async (request, reply) => {
    const user = requireSession(request, reply);
    if (!user) return reply;

    const parsed = updatePreferencesSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "errors.invalidData" });
    }

    const { defaultAppId, accentColor, sidebarColor, buttonColor, ...rest } = parsed.data;
    const updated = upsertPreferences(user.id, {
      ...rest,
      default_app_id: defaultAppId,
      accent_color: accentColor,
      sidebar_color: sidebarColor,
      button_color: buttonColor,
    });

    return toResponse(updated);
  });
}
