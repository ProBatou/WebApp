import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const databasePath = process.env.DATABASE_PATH
  ? resolve(process.env.DATABASE_PATH)
  : resolve(process.cwd(), "apps/api/data/webapp-v2.db");
mkdirSync(dirname(databasePath), { recursive: true });

export const db = new Database(databasePath);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS apps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    url TEXT NOT NULL,
    icon TEXT NOT NULL,
    icon_variant_mode TEXT NOT NULL DEFAULT 'auto' CHECK(icon_variant_mode IN ('auto', 'base')),
    icon_variant_inverted INTEGER NOT NULL DEFAULT 0 CHECK(icon_variant_inverted IN (0, 1)),
    accent TEXT NOT NULL,
    open_mode TEXT NOT NULL CHECK(open_mode IN ('iframe', 'external')),
    sort_order INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

const appColumns = db.prepare("PRAGMA table_info(apps)").all() as Array<{ name: string }>;
if (!appColumns.some((column) => column.name === "icon_variant_mode")) {
  db.exec("ALTER TABLE apps ADD COLUMN icon_variant_mode TEXT NOT NULL DEFAULT 'auto' CHECK(icon_variant_mode IN ('auto', 'base'))");
}

if (!appColumns.some((column) => column.name === "icon_variant_inverted")) {
  db.exec("ALTER TABLE apps ADD COLUMN icon_variant_inverted INTEGER NOT NULL DEFAULT 0 CHECK(icon_variant_inverted IN (0, 1))");
}

