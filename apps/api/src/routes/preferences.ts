import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireSession } from "../lib/auth.js";
import { appRepository } from "../lib/app-repository.js";
import { getPreferences, upsertPreferences } from "../lib/preferences-repository.js";

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional();

const updatePreferencesSchema = z.object({
  theme: z.enum(["light", "dark", "auto"]).optional(),
  language: z.string().max(8).optional(),
  defaultAppId: z.number().int().positive().nullable().optional(),
  accentColor: hexColor,
  sidebarColor: hexColor,
  textColor: hexColor,
  accentColorDark: hexColor,
  sidebarColorDark: hexColor,
  textColorDark: hexColor,
});

function toResponse(record: ReturnType<typeof getPreferences>) {
  return {
    theme: record.theme,
    language: record.language,
    defaultAppId: record.default_app_id,
    accentColor: record.accent_color,
    sidebarColor: record.sidebar_color,
    textColor: record.text_color,
    accentColorDark: record.accent_color_dark,
    sidebarColorDark: record.sidebar_color_dark,
    textColorDark: record.text_color_dark,
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

    const {
      defaultAppId,
      accentColor,
      sidebarColor,
      textColor,
      accentColorDark,
      sidebarColorDark,
      textColorDark,
      ...rest
    } = parsed.data;

    if (defaultAppId !== undefined && defaultAppId !== null) {
      const defaultApp = appRepository.getAppById(defaultAppId);
      if (!defaultApp || (user.role !== "admin" && !defaultApp.is_shared)) {
        return reply.code(400).send({ message: "errors.invalidApp" });
      }
    }

    const updated = upsertPreferences(user.id, {
      ...rest,
      default_app_id: defaultAppId,
      accent_color: accentColor,
      sidebar_color: sidebarColor,
      text_color: textColor,
      button_color: null,
      accent_color_dark: accentColorDark,
      sidebar_color_dark: sidebarColorDark,
      text_color_dark: textColorDark,
      button_color_dark: null,
    });

    return toResponse(updated);
  });
}
