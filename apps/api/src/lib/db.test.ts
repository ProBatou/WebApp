import test from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { applyMigrations } from "./db.js";

function getColumnNames(database: Database.Database, table: string) {
  return (database.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>).map((column) => column.name);
}

function createSchemaMigrationsTable(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);
}

function markMigrationApplied(database: Database.Database, id: string) {
  database.prepare("INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)").run(id, "2026-03-30T00:00:00.000Z");
}

test("applyMigrations creates critical tables and schema_migrations on an empty database", () => {
  const database = new Database(":memory:");
  try {
    applyMigrations(database);

    const tableNames = (database
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all() as Array<{ name: string }>)
      .map((row) => row.name)
      .sort();

    assert.ok(tableNames.includes("apps"));
    assert.ok(tableNames.includes("users"));
    assert.ok(tableNames.includes("groups"));
    assert.ok(tableNames.includes("sessions"));
    assert.ok(tableNames.includes("invitations"));
    assert.ok(tableNames.includes("user_preferences"));
    assert.ok(tableNames.includes("schema_migrations"));

    const migrationCount = (database.prepare("SELECT COUNT(*) AS count FROM schema_migrations").get() as { count: number }).count;
    assert.equal(migrationCount, 13);
  } finally {
    database.close();
  }
});

test("applyMigrations applies pending incremental migrations", () => {
  const database = new Database(":memory:");
  try {
    createSchemaMigrationsTable(database);
    database.exec(`
      CREATE TABLE apps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        icon TEXT NOT NULL,
        accent TEXT NOT NULL,
        open_mode TEXT NOT NULL CHECK(open_mode IN ('iframe', 'external')),
        is_default INTEGER NOT NULL DEFAULT 0 CHECK(is_default IN (0, 1)),
        is_shared INTEGER NOT NULL DEFAULT 1 CHECK(is_shared IN (0, 1)),
        group_id INTEGER,
        sort_order INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'admin' CHECK(role IN ('admin', 'viewer')),
        created_at TEXT NOT NULL
      );
    `);

    markMigrationApplied(database, "001_initial_schema");

    applyMigrations(database);

    const appColumns = getColumnNames(database, "apps");
    assert.ok(appColumns.includes("icon_variant_mode"));
    assert.ok(appColumns.includes("icon_variant_inverted"));

    const preferencesColumns = getColumnNames(database, "user_preferences");
    assert.ok(preferencesColumns.includes("accent_color_dark"));
    assert.ok(preferencesColumns.includes("sidebar_color_dark"));
    assert.ok(preferencesColumns.includes("button_color_dark"));
    assert.ok(preferencesColumns.includes("text_color"));
    assert.ok(preferencesColumns.includes("text_color_dark"));

    const migrationCount = (database.prepare("SELECT COUNT(*) AS count FROM schema_migrations").get() as { count: number }).count;
    assert.equal(migrationCount, 13);
  } finally {
    database.close();
  }
});

test("applyMigrations tolerates optional columns already present", () => {
  const database = new Database(":memory:");
  try {
    createSchemaMigrationsTable(database);
    database.exec(`
      CREATE TABLE groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        sort_order INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'admin' CHECK(role IN ('admin', 'viewer')),
        created_at TEXT NOT NULL
      );

      CREATE TABLE invitations (
        id TEXT PRIMARY KEY,
        role TEXT NOT NULL CHECK(role IN ('admin', 'viewer')),
        invited_by_user_id INTEGER NOT NULL,
        accepted_user_id INTEGER,
        expires_at TEXT NOT NULL,
        used_at TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE apps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        icon TEXT NOT NULL,
        accent TEXT NOT NULL,
        open_mode TEXT NOT NULL CHECK(open_mode IN ('iframe', 'external')),
        is_default INTEGER NOT NULL DEFAULT 0 CHECK(is_default IN (0, 1)),
        is_shared INTEGER NOT NULL DEFAULT 1 CHECK(is_shared IN (0, 1)),
        group_id INTEGER REFERENCES groups(id) ON DELETE SET NULL,
        sort_order INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        icon_variant_mode TEXT NOT NULL DEFAULT 'auto' CHECK(icon_variant_mode IN ('auto', 'base')),
        icon_variant_inverted INTEGER NOT NULL DEFAULT 0 CHECK(icon_variant_inverted IN (0, 1))
      );

      CREATE TABLE sessions (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);

    markMigrationApplied(database, "001_initial_schema");
    markMigrationApplied(database, "005_create_groups");
    markMigrationApplied(database, "007_add_user_role");
    markMigrationApplied(database, "008_create_invitations");

    applyMigrations(database);

    const migrationRows = database
      .prepare("SELECT id FROM schema_migrations WHERE id IN ('002_add_icon_variant_mode', '003_add_icon_variant_inverted') ORDER BY id")
      .all() as Array<{ id: string }>;

    assert.deepEqual(migrationRows, [
      { id: "002_add_icon_variant_mode" },
      { id: "003_add_icon_variant_inverted" },
    ]);
  } finally {
    database.close();
  }
});
