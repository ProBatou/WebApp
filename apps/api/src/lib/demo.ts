import bcrypt from "bcryptjs";
import { db } from "./db.js";
import { demoApps } from "./demo-apps.js";

export const isDemoMode = process.env.DEMO_MODE === "true";
export const demoUsername = process.env.DEMO_USERNAME?.trim() || "demo";
export const demoPassword = process.env.DEMO_PASSWORD || "demo";

const demoPasswordHashes: Record<string, string> = {
  demo: "$2b$10$ZUi.YxW2tJOvyHVYqZ4jK.x/hsDTjstynk4Wus2M6TyV6mJS7aQVG",
};

export async function ensureDemoState() {
  if (!isDemoMode) {
    return;
  }

  const passwordHash = demoPasswordHashes[demoPassword] ?? (await bcrypt.hash(demoPassword, 10));

  const now = new Date().toISOString();

  const resetDemoState = db.transaction(() => {
    db.prepare("DELETE FROM sessions").run();
    db.prepare("DELETE FROM apps").run();
    db.prepare("DELETE FROM users").run();

    db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('users', 'apps')").run();

    db.prepare("INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)").run(demoUsername, passwordHash, now);

    const insertApp = db.prepare(
      `INSERT INTO apps (name, url, icon, icon_variant_mode, icon_variant_inverted, accent, open_mode, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    demoApps.forEach((app, index) => {
      insertApp.run(
        app.name,
        app.url,
        app.icon,
        app.iconVariantMode,
        app.iconVariantInverted,
        app.accent,
        app.openMode,
        index + 1,
        now,
        now
      );
    });
  });

  resetDemoState();
}
