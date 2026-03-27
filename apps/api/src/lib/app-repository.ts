import { serializeAppRecord, type SerializedAppRecord } from "./apps.js";
import type { SqliteDatabase } from "./db.js";
import type { AppRecord } from "./types.js";

export type AppPayload = {
  name: string;
  description: string;
  url: string;
  icon: string;
  iconVariantMode: "auto" | "base";
  iconVariantInverted: boolean;
  accent: string;
  openMode: "iframe" | "external";
};

export type ImportMode = "merge" | "replace";

export function createAppRepository(database: SqliteDatabase) {
  function listApps() {
    return (database.prepare("SELECT * FROM apps ORDER BY sort_order ASC, id ASC").all() as AppRecord[]).map(serializeAppRecord);
  }

  function getOrderedAppIds() {
    return (database.prepare("SELECT id FROM apps ORDER BY sort_order ASC, id ASC").all() as Array<{ id: number }>).map((row) => row.id);
  }

  function hasExactOrderedIds(candidateIds: number[]) {
    const uniqueIds = new Set(candidateIds);
    if (uniqueIds.size !== candidateIds.length) {
      return false;
    }

    const existingIds = getOrderedAppIds();
    if (existingIds.length !== candidateIds.length) {
      return false;
    }

    return existingIds.every((id) => uniqueIds.has(id));
  }

  const insertAppTransaction = database.transaction((payload: AppPayload) => {
    const now = new Date().toISOString();
    const sortRow = database.prepare("SELECT COALESCE(MAX(sort_order), 0) as maxOrder FROM apps").get() as { maxOrder: number };
    const result = database
      .prepare(
        `INSERT INTO apps (name, description, url, icon, icon_variant_mode, icon_variant_inverted, accent, open_mode, is_default, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`
      )
      .run(
        payload.name,
        payload.description,
        payload.url,
        payload.icon.trim(),
        payload.iconVariantMode,
        payload.iconVariantInverted ? 1 : 0,
        payload.accent,
        payload.openMode,
        sortRow.maxOrder + 1,
        now,
        now
      );

    return database.prepare("SELECT * FROM apps WHERE id = ?").get(Number(result.lastInsertRowid)) as AppRecord;
  });

  function insertApp(payload: AppPayload) {
    return insertAppTransaction(payload);
  }

  function reorderApps(orderedIds: number[]) {
    const reorder = database.transaction((nextOrderedIds: number[]) => {
      const statement = database.prepare("UPDATE apps SET sort_order = ? WHERE id = ?");
      nextOrderedIds.forEach((id, index) => {
        statement.run(index + 1, id);
      });
    });

    reorder(orderedIds);
    return listApps();
  }

  function setDefaultApp(appId: number | null) {
    const setDefaultTransaction = database.transaction((nextDefaultAppId: number | null) => {
      database.prepare("UPDATE apps SET is_default = 0").run();

      if (nextDefaultAppId !== null) {
        database.prepare("UPDATE apps SET is_default = 1 WHERE id = ?").run(nextDefaultAppId);
      }
    });

    setDefaultTransaction(appId);
    return listApps();
  }

  function deleteAppAndReindex(appId: number) {
    database.prepare("DELETE FROM apps WHERE id = ?").run(appId);

    const apps = listApps();
    const reorder = database.transaction((items: SerializedAppRecord[]) => {
      const statement = database.prepare("UPDATE apps SET sort_order = ? WHERE id = ?");
      items.forEach((item, index) => {
        statement.run(index + 1, item.id);
      });
    });
    reorder(apps);
  }

  function importApps(mode: ImportMode, items: AppPayload[]) {
    const insertedIds: number[] = [];
    const now = new Date().toISOString();

    const importTransaction = database.transaction(() => {
      if (mode === "replace") {
        database.prepare("DELETE FROM apps").run();
      }

      const sortRow = database.prepare("SELECT COALESCE(MAX(sort_order), 0) as maxOrder FROM apps").get() as { maxOrder: number };
      const insertStatement = database.prepare(
        `INSERT INTO apps (name, description, url, icon, icon_variant_mode, icon_variant_inverted, accent, open_mode, is_default, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`
      );

      items.forEach((item, index) => {
        const result = insertStatement.run(
          item.name,
          item.description,
          item.url,
          item.icon.trim(),
          item.iconVariantMode,
          item.iconVariantInverted ? 1 : 0,
          item.accent,
          item.openMode,
          sortRow.maxOrder + index + 1,
          now,
          now
        );

        insertedIds.push(Number(result.lastInsertRowid));
      });
    });

    importTransaction();

    return {
      items: listApps(),
      importedIds: insertedIds,
    };
  }

  return {
    listApps,
    getOrderedAppIds,
    hasExactOrderedIds,
    insertApp,
    reorderApps,
    setDefaultApp,
    deleteAppAndReindex,
    importApps,
  };
}
