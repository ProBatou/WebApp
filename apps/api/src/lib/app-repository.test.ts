import test from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { createAppRepository, type AppPayload } from "./app-repository.js";
import { applyMigrations } from "./db.js";
import { createGroupRepository } from "./group-repository.js";

function createTestAppRepository() {
  const database = new Database(":memory:");
  applyMigrations(database);
  return {
    database,
    repository: createAppRepository(database),
  };
}

function createApp(name: string, overrides: Partial<AppPayload> = {}): AppPayload {
  return {
    name,
    description: `${name} description`,
    url: `https://${name.toLowerCase()}.example.com`,
    icon: name.toLowerCase(),
    iconVariantMode: "auto",
    iconVariantInverted: false,
    accent: "#123456",
    openMode: "iframe",
    ...overrides,
  };
}

test("hasExactOrderedIds accepts a permutation of all existing app ids", () => {
  const { database, repository } = createTestAppRepository();
  try {
    repository.insertApp(createApp("Plex"));
    repository.insertApp(createApp("Grafana"));
    repository.insertApp(createApp("Jellyfin"));

    const currentIds = repository.getOrderedAppIds();

    assert.equal(repository.hasExactOrderedIds([currentIds[2], currentIds[0], currentIds[1]]), true);
    assert.equal(repository.hasExactOrderedIds([currentIds[0], currentIds[1]]), false);
    assert.equal(repository.hasExactOrderedIds([currentIds[0], currentIds[1], currentIds[1]]), false);
  } finally {
    database.close();
  }
});

test("reorderApps updates sort_order and list order", () => {
  const { database, repository } = createTestAppRepository();
  try {
    const plex = repository.insertApp(createApp("Plex"));
    const grafana = repository.insertApp(createApp("Grafana"));
    const jellyfin = repository.insertApp(createApp("Jellyfin"));

    const reordered = repository.reorderApps([
      { id: jellyfin.id, groupId: null },
      { id: plex.id, groupId: null },
      { id: grafana.id, groupId: null },
    ]);

    assert.deepEqual(
      reordered.map((app) => ({ id: app.id, sort_order: app.sort_order })),
      [
        { id: jellyfin.id, sort_order: 1 },
        { id: plex.id, sort_order: 2 },
        { id: grafana.id, sort_order: 3 },
      ]
    );
  } finally {
    database.close();
  }
});

test("reorderApps can move an app to a different group", () => {
  const { database, repository } = createTestAppRepository();
  try {
    const groupRepository = createGroupRepository(database);
    const mediaGroup = groupRepository.createGroup("Media");
    const monitorGroup = groupRepository.createGroup("Monitoring");

    const plex = repository.insertApp(createApp("Plex", { groupId: mediaGroup.id }));
    const grafana = repository.insertApp(createApp("Grafana", { groupId: mediaGroup.id }));
    const jellyfin = repository.insertApp(createApp("Jellyfin", { groupId: monitorGroup.id }));

    const reordered = repository.reorderApps([
      { id: plex.id, groupId: mediaGroup.id },
      { id: jellyfin.id, groupId: monitorGroup.id },
      { id: grafana.id, groupId: monitorGroup.id },
    ]);

    assert.equal(reordered.find((app) => app.id === grafana.id)?.group_id, monitorGroup.id);
    assert.deepEqual(
      reordered.map((app) => ({ id: app.id, sort_order: app.sort_order })),
      [
        { id: plex.id, sort_order: 1 },
        { id: jellyfin.id, sort_order: 2 },
        { id: grafana.id, sort_order: 3 },
      ]
    );
  } finally {
    database.close();
  }
});

test("importApps merge appends imported items after existing apps", () => {
  const { database, repository } = createTestAppRepository();
  try {
    const existing = repository.insertApp(createApp("Plex"));
    const result = repository.importApps("merge", [createApp("Grafana"), createApp("Jellyfin")]);

    assert.equal(result.importedIds.length, 2);
    assert.deepEqual(
      result.items.map((app) => ({ name: app.name, sort_order: app.sort_order })),
      [
        { name: "Plex", sort_order: 1 },
        { name: "Grafana", sort_order: 2 },
        { name: "Jellyfin", sort_order: 3 },
      ]
    );
    assert.equal(result.items[0]?.id, existing.id);
  } finally {
    database.close();
  }
});

test("importApps replace clears existing apps and restarts ordering", () => {
  const { database, repository } = createTestAppRepository();
  try {
    repository.insertApp(createApp("Plex"));
    repository.insertApp(createApp("Grafana"));

    const result = repository.importApps("replace", [createApp("Homepage"), createApp("Portainer")]);

    assert.deepEqual(
      result.items.map((app) => ({ name: app.name, sort_order: app.sort_order })),
      [
        { name: "Homepage", sort_order: 1 },
        { name: "Portainer", sort_order: 2 },
      ]
    );
    assert.deepEqual(result.items.map((app) => app.id), result.importedIds);
  } finally {
    database.close();
  }
});

test("setDefaultApp keeps a single default app and can clear it", () => {
  const { database, repository } = createTestAppRepository();
  try {
    const plex = repository.insertApp(createApp("Plex"));
    const grafana = repository.insertApp(createApp("Grafana"));

    let items = repository.setDefaultApp(grafana.id);
    assert.equal(items.find((app) => app.id === plex.id)?.is_default, false);
    assert.equal(items.find((app) => app.id === grafana.id)?.is_default, true);

    items = repository.setDefaultApp(null);
    assert.equal(items.some((app) => app.is_default), false);
  } finally {
    database.close();
  }
});
