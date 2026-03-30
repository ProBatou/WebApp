import { db, type SqliteDatabase } from "./db.js";
import type { UserPreferencesRecord } from "./types.js";

const defaultPreferences = {
  theme: "auto" as const,
  language: "auto",
  default_app_id: null,
  accent_color: null,
  sidebar_color: null,
  button_color: null,
  accent_color_dark: null,
  sidebar_color_dark: null,
  button_color_dark: null,
};

export function createPreferencesRepository(database: SqliteDatabase) {
  function getPreferences(userId: number): UserPreferencesRecord {
    const row = database
      .prepare("SELECT * FROM user_preferences WHERE user_id = ?")
      .get(userId) as UserPreferencesRecord | undefined;

    if (!row) {
      return { user_id: userId, updated_at: new Date().toISOString(), ...defaultPreferences };
    }

    return row;
  }

  const upsertPreferencesStmt = database.prepare(`
    INSERT INTO user_preferences (user_id, theme, language, default_app_id, accent_color, sidebar_color, button_color, accent_color_dark, sidebar_color_dark, button_color_dark, updated_at)
    VALUES (@user_id, @theme, @language, @default_app_id, @accent_color, @sidebar_color, @button_color, @accent_color_dark, @sidebar_color_dark, @button_color_dark, @updated_at)
    ON CONFLICT(user_id) DO UPDATE SET
      theme = excluded.theme,
      language = excluded.language,
      default_app_id = excluded.default_app_id,
      accent_color = excluded.accent_color,
      sidebar_color = excluded.sidebar_color,
      button_color = excluded.button_color,
      accent_color_dark = excluded.accent_color_dark,
      sidebar_color_dark = excluded.sidebar_color_dark,
      button_color_dark = excluded.button_color_dark,
      updated_at = excluded.updated_at
  `);

  function upsertPreferences(
    userId: number,
    patch: Partial<Omit<UserPreferencesRecord, "user_id" | "updated_at">>
  ): UserPreferencesRecord {
    const current = getPreferences(userId);
    const sanitizedPatch = Object.fromEntries(
      Object.entries(patch).filter(([, value]) => value !== undefined)
    ) as Partial<Omit<UserPreferencesRecord, "user_id" | "updated_at">>;
    const next: UserPreferencesRecord = {
      ...current,
      ...sanitizedPatch,
      user_id: userId,
      updated_at: new Date().toISOString(),
    };
    upsertPreferencesStmt.run(next);
    return next;
  }

  return {
    getPreferences,
    upsertPreferences,
  };
}

export const preferencesRepository = createPreferencesRepository(db);

export const getPreferences = preferencesRepository.getPreferences;
export const upsertPreferences = preferencesRepository.upsertPreferences;
