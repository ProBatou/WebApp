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
  function createInvitationToken() {
    return randomBytes(24).toString("hex");
  }

  function listUsers() {
    return database
      .prepare("SELECT id, username, role, created_at FROM users ORDER BY id ASC")
      .all() as Array<{ id: number; username: string; role: SessionUser["role"]; created_at: string }>;
  }

  function countAdmins() {
    const row = database.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get() as { count: number };
    return row.count;
  }

  function hasUsers() {
    const row = database.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
    return row.count > 0;
  }

  function createUser(username: string, passwordHash: string, role: SessionUser["role"] = "admin") {
    const now = new Date().toISOString();
    const result = database
      .prepare("INSERT INTO users (username, password_hash, role, created_at) VALUES (?, ?, ?, ?)")
      .run(username, passwordHash, role, now);
    return {
      id: Number(result.lastInsertRowid),
      username,
      role,
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

  function updateUserRole(userId: number, role: SessionUser["role"], actorUserId: number) {
    const existingUser = database
      .prepare("SELECT id, username, role, created_at FROM users WHERE id = ?")
      .get(userId) as
      | { id: number; username: string; role: SessionUser["role"]; created_at: string }
      | undefined;

    if (!existingUser) {
      return { error: "not_found" as const };
    }

    if (existingUser.id === actorUserId) {
      return { error: "self_change_forbidden" as const };
    }

    if (existingUser.role === "admin" && role === "viewer" && countAdmins() <= 1) {
      return { error: "last_admin" as const };
    }

    database.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, userId);

    const updatedUser = database
      .prepare("SELECT id, username, role, created_at FROM users WHERE id = ?")
      .get(userId) as { id: number; username: string; role: SessionUser["role"]; created_at: string };

    return { user: updatedUser };
  }

  function deleteUser(userId: number, actorUserId: number) {
    const existingUser = database
      .prepare("SELECT id, username, role FROM users WHERE id = ?")
      .get(userId) as
      | { id: number; username: string; role: SessionUser["role"] }
      | undefined;

    if (!existingUser) {
      return { error: "not_found" as const };
    }

    if (existingUser.id === actorUserId) {
      return { error: "self_delete_forbidden" as const };
    }

    if (existingUser.role === "admin" && countAdmins() <= 1) {
      return { error: "last_admin" as const };
    }

    database.prepare("DELETE FROM users WHERE id = ?").run(userId);
    return { deleted: true as const };
  }

  function createInvitation(role: SessionUser["role"], invitedByUserId: number) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7);
    const invitationId = createInvitationToken();

    database
      .prepare(
        `INSERT INTO invitations (id, role, invited_by_user_id, expires_at, used_at, created_at)
         VALUES (?, ?, ?, ?, NULL, ?)`
      )
      .run(invitationId, role, invitedByUserId, expiresAt.toISOString(), now.toISOString());

    return {
      id: invitationId,
      role,
      expires_at: expiresAt.toISOString(),
    };
  }

  function getInvitation(token: string) {
    const now = new Date().toISOString();
    return database
      .prepare(
        `SELECT id, role, expires_at
         FROM invitations
         WHERE id = ? AND used_at IS NULL AND expires_at > ?`
      )
      .get(token, now) as { id: string; role: SessionUser["role"]; expires_at: string } | undefined;
  }

  function consumeInvitation(token: string, username: string, passwordHash: string) {
    const now = new Date().toISOString();

    const consumeInvitationTransaction = database.transaction((invitationToken: string, nextUsername: string, nextPasswordHash: string) => {
      const invitation = database
        .prepare(
          `SELECT id, role
           FROM invitations
           WHERE id = ? AND used_at IS NULL AND expires_at > ?`
        )
        .get(invitationToken, now) as { id: string; role: SessionUser["role"] } | undefined;

      if (!invitation) {
        return { error: "invalid_invitation" as const };
      }

      const existingUser = findUserByUsername(nextUsername);
      if (existingUser) {
        return { error: "username_taken" as const };
      }

      const createdUser = createUser(nextUsername, nextPasswordHash, invitation.role);

      database
        .prepare("UPDATE invitations SET used_at = ?, accepted_user_id = ? WHERE id = ?")
        .run(now, createdUser.id, invitationToken);

      return { user: createdUser };
    });

    return consumeInvitationTransaction(token, username, passwordHash);
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
      reply.code(401).send({ message: "errors.authRequired" });
      return null;
    }

    return user;
  }

  function requireAdmin(user: SessionUser, reply: FastifyReply) {
    if (user.role !== "admin") {
      reply.code(403).send({ message: "errors.adminRequired" });
      return null;
    }

    return user;
  }

  return {
    hasUsers,
    createUser,
    createInitialUser,
    findUserByUsername,
    listUsers,
    createSession,
    clearSession,
    getSessionUser,
    requireSession,
    requireAdmin,
    updateUserRole,
    deleteUser,
    createInvitation,
    getInvitation,
    consumeInvitation,
  };
}
