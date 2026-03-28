import { db } from "./db.js";
import type { UserPreferencesRecord } from "./types.js";

const defaultPreferences = {
  theme: "auto" as const,
  language: "auto",
  default_app_id: null,
  accent_color: null,
  sidebar_color: null,
  button_color: null,
};

export function getPreferences(userId: number): UserPreferencesRecord {
  const row = db
    .prepare("SELECT * FROM user_preferences WHERE user_id = ?")
    .get(userId) as UserPreferencesRecord | undefined;

  if (!row) {
    return { user_id: userId, updated_at: new Date().toISOString(), ...defaultPreferences };
  }

  return row;
}

const upsertPreferencesStmt = db.prepare(`
  INSERT INTO user_preferences (user_id, theme, language, default_app_id, accent_color, sidebar_color, button_color, updated_at)
  VALUES (@user_id, @theme, @language, @default_app_id, @accent_color, @sidebar_color, @button_color, @updated_at)
  ON CONFLICT(user_id) DO UPDATE SET
    theme = excluded.theme,
    language = excluded.language,
    default_app_id = excluded.default_app_id,
    accent_color = excluded.accent_color,
    sidebar_color = excluded.sidebar_color,
    button_color = excluded.button_color,
    updated_at = excluded.updated_at
`);

export function upsertPreferences(
  userId: number,
  patch: Partial<Omit<UserPreferencesRecord, "user_id" | "updated_at">>
): UserPreferencesRecord {
  const current = getPreferences(userId);
  const next: UserPreferencesRecord = {
    ...current,
    ...patch,
    user_id: userId,
    updated_at: new Date().toISOString(),
  };
  upsertPreferencesStmt.run(next);
  return next;
}
