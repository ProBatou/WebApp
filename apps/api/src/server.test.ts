import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const tempDir = await mkdtemp(join(tmpdir(), "webapp-v2-api-"));
process.env.DATABASE_PATH = join(tempDir, "integration.db");
process.env.DEMO_MODE = "false";

const [{ createServer }, { db }] = await Promise.all([
  import("./server.js"),
  import("./lib/db.js"),
]);

beforeEach(() => {
  db.exec(`
    DELETE FROM sessions;
    DELETE FROM invitations;
    DELETE FROM user_preferences;
    DELETE FROM apps;
    DELETE FROM groups;
    DELETE FROM users;
    DELETE FROM sqlite_sequence WHERE name IN ('users', 'groups', 'apps');
  `);
});

function getSessionCookie(setCookieHeader: string | string[] | undefined) {
  const headerValue = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
  assert.ok(headerValue, "Expected a session cookie to be set.");
  return headerValue.split(";")[0];
}

test("POST /api/setup rejects mutation requests without the CSRF header", async () => {
  const server = await createServer();

  try {
    const response = await server.inject({
      method: "POST",
      url: "/api/setup",
      payload: {
        username: "admin",
        password: "supersecret",
      },
    });

    assert.equal(response.statusCode, 403);
    assert.deepEqual(response.json(), { message: "Forbidden: missing CSRF header." });
  } finally {
    await server.close();
  }
});

test("GET /api/bootstrap stays accessible without the CSRF header", async () => {
  const server = await createServer();

  try {
    const response = await server.inject({
      method: "GET",
      url: "/api/bootstrap",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().needsSetup, true);
  } finally {
    await server.close();
  }
});

test("POST /api/setup creates a session and GET /api/session returns the authenticated user", async () => {
  const server = await createServer();

  try {
    const setupResponse = await server.inject({
      method: "POST",
      url: "/api/setup",
      headers: {
        "x-requested-with": "webapp-v2",
      },
      payload: {
        username: "admin",
        password: "supersecret",
      },
    });

    assert.equal(setupResponse.statusCode, 201);
    assert.equal(setupResponse.json().user.username, "admin");

    const sessionCookie = getSessionCookie(setupResponse.headers["set-cookie"]);
    const sessionResponse = await server.inject({
      method: "GET",
      url: "/api/session",
      headers: {
        cookie: sessionCookie,
      },
    });

    assert.equal(sessionResponse.statusCode, 200);
    assert.deepEqual(sessionResponse.json(), {
      user: {
        id: 1,
        username: "admin",
        role: "admin",
      },
    });
  } finally {
    await server.close();
  }
});

test("GET /api/apps requires authentication", async () => {
  const server = await createServer();

  try {
    const response = await server.inject({
      method: "GET",
      url: "/api/apps",
    });

    assert.equal(response.statusCode, 401);
    assert.deepEqual(response.json(), { message: "errors.authRequired" });
  } finally {
    await server.close();
  }
});

test("POST /api/groups requires both authentication and the CSRF header", async () => {
  const server = await createServer();

  try {
    const setupResponse = await server.inject({
      method: "POST",
      url: "/api/setup",
      headers: {
        "x-requested-with": "webapp-v2",
      },
      payload: {
        username: "admin",
        password: "supersecret",
      },
    });
    const sessionCookie = getSessionCookie(setupResponse.headers["set-cookie"]);

    const missingHeaderResponse = await server.inject({
      method: "POST",
      url: "/api/groups",
      headers: {
        cookie: sessionCookie,
      },
      payload: {
        name: "Media",
      },
    });
    assert.equal(missingHeaderResponse.statusCode, 403);

    const createGroupResponse = await server.inject({
      method: "POST",
      url: "/api/groups",
      headers: {
        cookie: sessionCookie,
        "x-requested-with": "webapp-v2",
      },
      payload: {
        name: "Media",
      },
    });

    assert.equal(createGroupResponse.statusCode, 201);
    assert.equal(createGroupResponse.json().item.name, "Media");
    assert.equal(createGroupResponse.json().items.length, 1);
  } finally {
    await server.close();
  }
});
