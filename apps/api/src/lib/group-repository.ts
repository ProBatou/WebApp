import type { SqliteDatabase } from "./db.js";
import type { GroupRecord } from "./types.js";

export function createGroupRepository(database: SqliteDatabase) {
  function listGroups() {
    return database.prepare("SELECT * FROM groups ORDER BY sort_order ASC, id ASC").all() as GroupRecord[];
  }

  function reorderGroups(groupIds: number[]) {
    const reorder = database.transaction((items: number[]) => {
      const statement = database.prepare("UPDATE groups SET sort_order = ? WHERE id = ?");
      items.forEach((groupId, index) => {
        statement.run(index + 1, groupId);
      });
    });

    reorder(groupIds);
    return listGroups();
  }

  function createGroup(name: string) {
    const now = new Date().toISOString();
    const sortRow = database.prepare("SELECT COALESCE(MAX(sort_order), 0) as maxOrder FROM groups").get() as { maxOrder: number };
    const result = database
      .prepare("INSERT INTO groups (name, sort_order, created_at) VALUES (?, ?, ?)")
      .run(name.trim(), sortRow.maxOrder + 1, now);

    return database.prepare("SELECT * FROM groups WHERE id = ?").get(Number(result.lastInsertRowid)) as GroupRecord;
  }

  function updateGroup(groupId: number, name: string) {
    database.prepare("UPDATE groups SET name = ? WHERE id = ?").run(name.trim(), groupId);
    return database.prepare("SELECT * FROM groups WHERE id = ?").get(groupId) as GroupRecord | undefined;
  }

  function deleteGroup(groupId: number) {
    database.prepare("DELETE FROM groups WHERE id = ?").run(groupId);

    const groups = listGroups();
    const reorder = database.transaction((items: GroupRecord[]) => {
      const statement = database.prepare("UPDATE groups SET sort_order = ? WHERE id = ?");
      items.forEach((item, index) => {
        statement.run(index + 1, item.id);
      });
    });
    reorder(groups);
  }

  function hasGroup(groupId: number) {
    const row = database.prepare("SELECT id FROM groups WHERE id = ?").get(groupId) as { id: number } | undefined;
    return Boolean(row);
  }

  return {
    listGroups,
    reorderGroups,
    createGroup,
    updateGroup,
    deleteGroup,
    hasGroup,
  };
}
