import bcrypt from "bcryptjs";
import { db } from "./db.js";

export const isDemoMode = process.env.DEMO_MODE === "true";
export const demoUsername = process.env.DEMO_USERNAME?.trim() || "demo";
export const demoPassword = process.env.DEMO_PASSWORD || "demo";

const demoApps = [
  {
    name: "Plex",
    description: "Media server",
    url: "https://app.plex.tv",
    icon: "plex",
    iconVariantMode: "auto",
    iconVariantInverted: 0,
    accent: "#e5a00d",
    openMode: "iframe",
  },
  {
    name: "Nextcloud",
    description: "Cloud perso et partage de fichiers",
    url: "https://nextcloud.com",
    icon: "nextcloud",
    iconVariantMode: "auto",
    iconVariantInverted: 0,
    accent: "#0082c9",
    openMode: "iframe",
  },
  {
    name: "Grafana",
    description: "Dashboards et monitoring",
    url: "https://grafana.com",
    icon: "grafana",
    iconVariantMode: "auto",
    iconVariantInverted: 0,
    accent: "#f46800",
    openMode: "iframe",
  },
  {
    name: "Home Assistant",
    description: "Domotique et automatisations",
    url: "https://www.home-assistant.io",
    icon: "home-assistant",
    iconVariantMode: "auto",
    iconVariantInverted: 0,
    accent: "#18bcf2",
    openMode: "iframe",
  },
  {
    name: "Portainer",
    description: "Gestion Docker",
    url: "https://www.portainer.io",
    icon: "portainer",
    iconVariantMode: "auto",
    iconVariantInverted: 0,
    accent: "#13bef9",
    openMode: "iframe",
  },
  {
    name: "Jellyfin",
    description: "Media server open source",
    url: "https://jellyfin.org",
    icon: "jellyfin",
    iconVariantMode: "auto",
    iconVariantInverted: 0,
    accent: "#8f59d0",
    openMode: "iframe",
  },
];

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
      `INSERT INTO apps (name, description, url, icon, icon_variant_mode, icon_variant_inverted, accent, open_mode, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    demoApps.forEach((app, index) => {
      insertApp.run(
        app.name,
        app.description,
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
