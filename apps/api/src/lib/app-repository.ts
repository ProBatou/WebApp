import { serializeAppRecord } from "./apps.js";
import { db, type SqliteDatabase } from "./db.js";
import type { AppRecord, UserRole } from "./types.js";
import type { SharedAppPayload } from "@webapp-v2/shared";

export type AppPayload = SharedAppPayload;

export type ImportMode = "merge" | "replace";
export type ReorderAppItem = {
  id: number;
  groupId: number | null;
};

export function createAppRepository(database: SqliteDatabase) {
  function listApps() {
    return (database.prepare("SELECT * FROM apps ORDER BY sort_order ASC, id ASC").all() as AppRecord[]).map(serializeAppRecord);
  }

  function listAppsForRole(role: UserRole) {
    if (role === "admin") {
      return listApps();
    }

    return (database.prepare("SELECT * FROM apps WHERE is_shared = 1 ORDER BY sort_order ASC, id ASC").all() as AppRecord[]).map(serializeAppRecord);
  }

  function getAppById(appId: number) {
    const app = database.prepare("SELECT * FROM apps WHERE id = ?").get(appId) as AppRecord | undefined;
    return app ? serializeAppRecord(app) : null;
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
        `INSERT INTO apps (name, url, icon, icon_variant_mode, icon_variant_inverted, accent, open_mode, is_default, is_shared, group_id, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)`
      )
      .run(
        payload.name,
        payload.url,
        payload.icon.trim(),
        payload.iconVariantMode,
        payload.iconVariantInverted ? 1 : 0,
        payload.accent,
        payload.openMode,
        payload.isShared === false ? 0 : 1,
        payload.groupId ?? null,
        sortRow.maxOrder + 1,
        now,
        now
      );

    return database.prepare("SELECT * FROM apps WHERE id = ?").get(Number(result.lastInsertRowid)) as AppRecord;
  });

  function insertApp(payload: AppPayload) {
    return insertAppTransaction(payload);
  }

  function updateApp(appId: number, payload: AppPayload) {
    const now = new Date().toISOString();
    database
      .prepare(
        `UPDATE apps
         SET name = ?, url = ?, icon = ?, icon_variant_mode = ?, icon_variant_inverted = ?, accent = ?, open_mode = ?, is_shared = ?, group_id = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(
        payload.name,
        payload.url,
        payload.icon.trim(),
        payload.iconVariantMode,
        payload.iconVariantInverted ? 1 : 0,
        payload.accent,
        payload.openMode,
        payload.isShared === false ? 0 : 1,
        payload.groupId ?? null,
        now,
        appId
      );

    return getAppById(appId);
  }

  function reorderApps(items: ReorderAppItem[]) {
    const reorder = database.transaction((nextItems: ReorderAppItem[]) => {
      const statement = database.prepare("UPDATE apps SET sort_order = ?, group_id = ? WHERE id = ?");
      nextItems.forEach((item, index) => {
        statement.run(index + 1, item.groupId, item.id);
      });
    });

    reorder(items);
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
    const deleteTransaction = database.transaction((targetAppId: number) => {
      const existing = database.prepare("SELECT sort_order FROM apps WHERE id = ?").get(targetAppId) as
        | { sort_order: number }
        | undefined;

      if (!existing) {
        return false;
      }

      database.prepare("DELETE FROM apps WHERE id = ?").run(targetAppId);
      database.prepare("UPDATE apps SET sort_order = sort_order - 1 WHERE sort_order > ?").run(existing.sort_order);
      return true;
    });

    return deleteTransaction(appId);
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
        `INSERT INTO apps (name, url, icon, icon_variant_mode, icon_variant_inverted, accent, open_mode, is_default, is_shared, group_id, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)`
      );

      items.forEach((item, index) => {
        const result = insertStatement.run(
          item.name,
          item.url,
          item.icon.trim(),
          item.iconVariantMode,
          item.iconVariantInverted ? 1 : 0,
          item.accent,
          item.openMode,
          item.isShared === false ? 0 : 1,
          item.groupId ?? null,
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
    listAppsForRole,
    getAppById,
    getOrderedAppIds,
    hasExactOrderedIds,
    insertApp,
    updateApp,
    reorderApps,
    setDefaultApp,
    deleteAppAndReindex,
    importApps,
  };
}

export const appRepository = createAppRepository(db);
