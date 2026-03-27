import { randomBytes } from "node:crypto";
import type { TLSSocket } from "node:tls";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { SqliteDatabase } from "./db.js";
import type { SessionUser } from "./types.js";

export const sessionDurationMs = 1000 * 60 * 60 * 24 * 30;
export const sessionCookieName = "webapp_v2_session";

function isSecureRequest(request: FastifyRequest) {
  const forwardedProto = request.headers["x-forwarded-proto"];
  const protoHeader = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto;
  const socket = request.raw.socket as TLSSocket;

  return request.protocol === "https" || protoHeader === "https" || Boolean(socket.encrypted);
}

export function createAuthRepository(database: SqliteDatabase, createSessionId: () => string = () => randomBytes(24).toString("hex")) {
  function hasUsers() {
    const row = database.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
    return row.count > 0;
  }

  function createUser(username: string, passwordHash: string) {
    const now = new Date().toISOString();
    const result = database.prepare("INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)").run(username, passwordHash, now);
    return {
      id: Number(result.lastInsertRowid),
      username,
      role: "admin",
    } satisfies SessionUser;
  }

  function createInitialUser(username: string, passwordHash: string) {
    const createInitialUserTransaction = database.transaction((nextUsername: string, nextPasswordHash: string) => {
      const row = database.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
      if (row.count > 0) {
        return null;
      }

      const now = new Date().toISOString();
      const result = database
        .prepare("INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)")
        .run(nextUsername, nextPasswordHash, now);

      return {
        id: Number(result.lastInsertRowid),
        username: nextUsername,
        role: "admin",
      } satisfies SessionUser;
    });

    return createInitialUserTransaction(username, passwordHash);
  }

  function findUserByUsername(username: string) {
    return database.prepare("SELECT id, username, password_hash, role FROM users WHERE username = ?").get(username) as
      | { id: number; username: string; password_hash: string; role: SessionUser["role"] }
      | undefined;
  }

  function createSession(request: FastifyRequest, reply: FastifyReply, userId: number) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + sessionDurationMs);
    const sessionId = createSessionId();
    const secure = isSecureRequest(request);

    database.prepare("INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)").run(
      sessionId,
      userId,
      expiresAt.toISOString(),
      now.toISOString()
    );

    reply.setCookie(sessionCookieName, sessionId, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure,
      expires: expiresAt,
    });
  }

  function clearSession(request: FastifyRequest, reply: FastifyReply, sessionId?: string) {
    if (sessionId) {
      database.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
    }

    const secure = isSecureRequest(request);

    reply.clearCookie(sessionCookieName, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure,
    });
  }

  function getSessionUser(request: FastifyRequest) {
    const sessionId = request.cookies[sessionCookieName];
    if (!sessionId) {
      return null;
    }

    const now = new Date().toISOString();
    const row = database
      .prepare(
        `SELECT users.id, users.username
                , users.role
         FROM sessions
         INNER JOIN users ON users.id = sessions.user_id
         WHERE sessions.id = ? AND sessions.expires_at > ?`
      )
      .get(sessionId, now) as SessionUser | undefined;

    if (!row) {
      database.prepare("DELETE FROM sessions WHERE id = ? OR expires_at <= ?").run(sessionId, now);
      return null;
    }

    return row;
  }

  function requireSession(request: FastifyRequest, reply: FastifyReply) {
    const user = getSessionUser(request);
    if (!user) {
      reply.code(401).send({ message: "Authentification requise." });
      return null;
    }

    return user;
  }

  function requireAdmin(user: SessionUser, reply: FastifyReply) {
    if (user.role !== "admin") {
      reply.code(403).send({ message: "Acces administrateur requis." });
      return null;
    }

    return user;
  }

  return {
    hasUsers,
    createUser,
    createInitialUser,
    findUserByUsername,
    createSession,
    clearSession,
    getSessionUser,
    requireSession,
    requireAdmin,
  };
}
