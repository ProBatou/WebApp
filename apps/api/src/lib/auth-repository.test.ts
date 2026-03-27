import test from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3";
import type { FastifyReply, FastifyRequest } from "fastify";
import { createAuthRepository, sessionCookieName } from "./auth-repository.js";
import { applyMigrations } from "./db.js";

function createTestAuthRepository() {
  const database = new Database(":memory:");
  applyMigrations(database);
  return {
    database,
    repository: createAuthRepository(database, () => "fixed-session-id"),
  };
}

function createRequest(overrides: Partial<FastifyRequest> = {}) {
  return {
    headers: {},
    protocol: "http",
    raw: { socket: {} },
    cookies: {},
    ...overrides,
  } as FastifyRequest;
}

function createReply() {
  let statusCode: number | null = null;
  let payload: unknown = null;
  let cookieArgs: unknown[] | null = null;
  let clearCookieArgs: unknown[] | null = null;

  const reply = {
    setCookie: (...args: unknown[]) => {
      cookieArgs = args;
      return reply;
    },
    clearCookie: (...args: unknown[]) => {
      clearCookieArgs = args;
      return reply;
    },
    code: (code: number) => {
      statusCode = code;
      return reply;
    },
    send: (nextPayload: unknown) => {
      payload = nextPayload;
      return reply;
    },
  } as unknown as FastifyReply;

  return {
    reply,
    getStatusCode: () => statusCode,
    getPayload: () => payload,
    getCookieArgs: () => cookieArgs,
    getClearCookieArgs: () => clearCookieArgs,
  };
}

test("createSession stores a session and sets an httpOnly cookie", () => {
  const { database, repository } = createTestAuthRepository();
  try {
    const user = repository.createUser("alice", "hash");
    const request = createRequest();
    const replyState = createReply();

    repository.createSession(request, replyState.reply, user.id);

    const sessionRow = database.prepare("SELECT id, user_id FROM sessions WHERE id = ?").get("fixed-session-id") as
      | { id: string; user_id: number }
      | undefined;

    assert.deepEqual(sessionRow, { id: "fixed-session-id", user_id: user.id });
    const cookieArgs = replyState.getCookieArgs();
    assert.ok(cookieArgs);
    assert.equal(cookieArgs[0], sessionCookieName);
    assert.equal(cookieArgs[1], "fixed-session-id");
    const cookieOptions = cookieArgs[2] as {
      path: string;
      httpOnly: boolean;
      sameSite: string;
      secure: boolean;
      expires: Date;
    };
    assert.equal(cookieOptions.path, "/");
    assert.equal(cookieOptions.httpOnly, true);
    assert.equal(cookieOptions.sameSite, "lax");
    assert.equal(cookieOptions.secure, false);
    assert.ok(cookieOptions.expires instanceof Date);
  } finally {
    database.close();
  }
});

test("getSessionUser returns the linked user for an active session", () => {
  const { database, repository } = createTestAuthRepository();
  try {
    const user = repository.createUser("alice", "hash");
    database
      .prepare("INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)")
      .run("active-session", user.id, "2099-01-01T00:00:00.000Z", "2026-01-01T00:00:00.000Z");

    const request = createRequest({
      cookies: {
        [sessionCookieName]: "active-session",
      },
    });

    assert.deepEqual(repository.getSessionUser(request), {
      id: user.id,
      username: "alice",
      role: "admin",
    });
  } finally {
    database.close();
  }
});

test("getSessionUser removes expired sessions and returns null", () => {
  const { database, repository } = createTestAuthRepository();
  try {
    const user = repository.createUser("alice", "hash");
    database
      .prepare("INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)")
      .run("expired-session", user.id, "2000-01-01T00:00:00.000Z", "1999-01-01T00:00:00.000Z");

    const request = createRequest({
      cookies: {
        [sessionCookieName]: "expired-session",
      },
    });

    assert.equal(repository.getSessionUser(request), null);

    const remainingRow = database.prepare("SELECT id FROM sessions WHERE id = ?").get("expired-session");
    assert.equal(remainingRow, undefined);
  } finally {
    database.close();
  }
});

test("requireSession returns 401 with the expected payload when unauthenticated", () => {
  const { database, repository } = createTestAuthRepository();
  try {
    const request = createRequest();
    const replyState = createReply();

    assert.equal(repository.requireSession(request, replyState.reply), null);
    assert.equal(replyState.getStatusCode(), 401);
    assert.deepEqual(replyState.getPayload(), { message: "Authentification requise." });
  } finally {
    database.close();
  }
});

test("requireAdmin rejects viewer users and allows admin users", () => {
  const { database, repository } = createTestAuthRepository();
  try {
    const viewer = repository.createUser("viewer", "hash");
    database.prepare("UPDATE users SET role = 'viewer' WHERE id = ?").run(viewer.id);

    const viewerReplyState = createReply();
    assert.equal(
      repository.requireAdmin(
        {
          id: viewer.id,
          username: "viewer",
          role: "viewer",
        },
        viewerReplyState.reply
      ),
      null
    );
    assert.equal(viewerReplyState.getStatusCode(), 403);
    assert.deepEqual(viewerReplyState.getPayload(), { message: "Acces administrateur requis." });

    const admin = repository.createUser("admin", "hash");
    const adminReplyState = createReply();
    assert.deepEqual(
      repository.requireAdmin(
        {
          id: admin.id,
          username: "admin",
          role: "admin",
        },
        adminReplyState.reply
      ),
      {
        id: admin.id,
        username: "admin",
        role: "admin",
      }
    );
    assert.equal(adminReplyState.getStatusCode(), null);
  } finally {
    database.close();
  }
});
