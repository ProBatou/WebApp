import { randomBytes } from "node:crypto";
import type { TLSSocket } from "node:tls";
import bcrypt from "bcryptjs";
import type { FastifyReply, FastifyRequest } from "fastify";
import { db } from "./db.js";
import type { SessionUser } from "./types.js";

const sessionDurationMs = 1000 * 60 * 60 * 24 * 30;
export const sessionCookieName = "webapp_v2_session";

function isSecureRequest(request: FastifyRequest) {
  const forwardedProto = request.headers["x-forwarded-proto"];
  const protoHeader = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto;
  const socket = request.raw.socket as TLSSocket;

  return request.protocol === "https" || protoHeader === "https" || Boolean(socket.encrypted);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export function hasUsers() {
  const row = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
  return row.count > 0;
}

export function createUser(username: string, passwordHash: string) {
  const now = new Date().toISOString();
  const result = db.prepare("INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)").run(username, passwordHash, now);
  return {
    id: Number(result.lastInsertRowid),
    username,
  } satisfies SessionUser;
}

export function createInitialUser(username: string, passwordHash: string) {
  const createInitialUserTransaction = db.transaction((nextUsername: string, nextPasswordHash: string) => {
    const row = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
    if (row.count > 0) {
      return null;
    }

    const now = new Date().toISOString();
    const result = db
      .prepare("INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)")
      .run(nextUsername, nextPasswordHash, now);

    return {
      id: Number(result.lastInsertRowid),
      username: nextUsername,
    } satisfies SessionUser;
  });

  return createInitialUserTransaction(username, passwordHash);
}

export function findUserByUsername(username: string) {
  return db.prepare("SELECT id, username, password_hash FROM users WHERE username = ?").get(username) as
    | { id: number; username: string; password_hash: string }
    | undefined;
}

export function createSession(request: FastifyRequest, reply: FastifyReply, userId: number) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + sessionDurationMs);
  const sessionId = randomBytes(24).toString("hex");
  const secure = isSecureRequest(request);

  db.prepare("INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)").run(
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

export function clearSession(request: FastifyRequest, reply: FastifyReply, sessionId?: string) {
  if (sessionId) {
    db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
  }

  const secure = isSecureRequest(request);

  reply.clearCookie(sessionCookieName, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure,
  });
}

export function getSessionUser(request: FastifyRequest) {
  const sessionId = request.cookies[sessionCookieName];
  if (!sessionId) {
    return null;
  }

  const now = new Date().toISOString();
  const row = db
    .prepare(
      `SELECT users.id, users.username
       FROM sessions
       INNER JOIN users ON users.id = sessions.user_id
       WHERE sessions.id = ? AND sessions.expires_at > ?`
    )
    .get(sessionId, now) as SessionUser | undefined;

  if (!row) {
    db.prepare("DELETE FROM sessions WHERE id = ? OR expires_at <= ?").run(sessionId, now);
    return null;
  }

  return row;
}

export function requireSession(request: FastifyRequest, reply: FastifyReply) {
  const user = getSessionUser(request);
  if (!user) {
    reply.code(401).send({ message: "Authentification requise." });
    return null;
  }

  return user;
}
