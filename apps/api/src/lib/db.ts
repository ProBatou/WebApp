import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type SqliteDatabase = Database.Database;

type Migration = {
  id: string;
  up: (database: SqliteDatabase) => void;
};

const currentDir = dirname(fileURLToPath(import.meta.url));
const databasePath = process.env.DATABASE_PATH
  ? resolve(process.env.DATABASE_PATH)
  : resolve(currentDir, "../../data/webapp-v2.db");
mkdirSync(dirname(databasePath), { recursive: true });

export const db = new Database(databasePath);
db.pragma("journal_mode = WAL");

function hasColumn(database: SqliteDatabase, tableName: string, columnName: string) {
  const columns = database.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  return columns.some((column) => column.name === columnName);
}

const migrations: Migration[] = [
  {
    id: "001_initial_schema",
    up: (database) => {
      database.exec(`
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
          accent TEXT NOT NULL,
          open_mode TEXT NOT NULL CHECK(open_mode IN ('iframe', 'external')),
          is_default INTEGER NOT NULL DEFAULT 0 CHECK(is_default IN (0, 1)),
          sort_order INTEGER NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);
    },
  },
  {
    id: "002_add_icon_variant_mode",
    up: (database) => {
      if (!hasColumn(database, "apps", "icon_variant_mode")) {
        database.exec("ALTER TABLE apps ADD COLUMN icon_variant_mode TEXT NOT NULL DEFAULT 'auto' CHECK(icon_variant_mode IN ('auto', 'base'))");
      }
    },
  },
  {
    id: "003_add_icon_variant_inverted",
    up: (database) => {
      if (!hasColumn(database, "apps", "icon_variant_inverted")) {
        database.exec("ALTER TABLE apps ADD COLUMN icon_variant_inverted INTEGER NOT NULL DEFAULT 0 CHECK(icon_variant_inverted IN (0, 1))");
      }
    },
  },
  {
    id: "004_add_is_default",
    up: (database) => {
      if (!hasColumn(database, "apps", "is_default")) {
        database.exec("ALTER TABLE apps ADD COLUMN is_default INTEGER NOT NULL DEFAULT 0 CHECK(is_default IN (0, 1))");
      }
    },
  },
];

export function applyMigrations(database: SqliteDatabase) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const appliedMigrationIds = new Set(
    (database.prepare("SELECT id FROM schema_migrations ORDER BY id ASC").all() as Array<{ id: string }>).map((migration) => migration.id)
  );

  const applyMigration = database.transaction((migration: Migration) => {
    migration.up(database);
    database.prepare("INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)").run(migration.id, new Date().toISOString());
  });

  migrations.forEach((migration) => {
    if (!appliedMigrationIds.has(migration.id)) {
      applyMigration(migration);
    }
  });
}

applyMigrations(db);
