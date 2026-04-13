import { db, type SqliteDatabase } from "./db.js";

export type OidcSettingsRecord = {
  issuer_url: string | null;
  client_id: string | null;
  client_secret: string | null;
  provider_name: string | null;
  scopes: string | null;
  disable_password_login: number;
  redirect_uri: string | null;
  post_login_redirect_uri: string | null;
  username_claim: string | null;
  groups_claim: string | null;
  admin_groups: string | null;
  updated_at: string;
};

function createOidcSettingsRepository(database: SqliteDatabase) {
  function getOidcSettings(): OidcSettingsRecord | null {
    return (
      (database.prepare("SELECT * FROM oidc_settings WHERE id = 1").get() as OidcSettingsRecord | undefined) ?? null
    );
  }

  const upsertStmt = database.prepare(`
    INSERT INTO oidc_settings (id, issuer_url, client_id, client_secret, provider_name, scopes,
      disable_password_login, redirect_uri, post_login_redirect_uri, username_claim, groups_claim,
      admin_groups, updated_at)
    VALUES (1, @issuer_url, @client_id, @client_secret, @provider_name, @scopes,
      @disable_password_login, @redirect_uri, @post_login_redirect_uri, @username_claim, @groups_claim,
      @admin_groups, @updated_at)
    ON CONFLICT(id) DO UPDATE SET
      issuer_url = excluded.issuer_url,
      client_id = excluded.client_id,
      client_secret = CASE WHEN excluded.client_secret IS NULL THEN oidc_settings.client_secret ELSE excluded.client_secret END,
      provider_name = excluded.provider_name,
      scopes = excluded.scopes,
      disable_password_login = excluded.disable_password_login,
      redirect_uri = excluded.redirect_uri,
      post_login_redirect_uri = excluded.post_login_redirect_uri,
      username_claim = excluded.username_claim,
      groups_claim = excluded.groups_claim,
      admin_groups = excluded.admin_groups,
      updated_at = excluded.updated_at
  `);

  function upsertOidcSettings(patch: Omit<OidcSettingsRecord, "updated_at"> & { client_secret: string | null }) {
    upsertStmt.run({ ...patch, updated_at: new Date().toISOString() });
    return getOidcSettings()!;
  }

  function deleteOidcSettings() {
    database.prepare("DELETE FROM oidc_settings WHERE id = 1").run();
  }

  return { getOidcSettings, upsertOidcSettings, deleteOidcSettings };
}

export const oidcSettingsRepository = createOidcSettingsRepository(db);
