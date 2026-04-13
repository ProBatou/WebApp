import { randomBytes } from "node:crypto";
import type { TLSSocket } from "node:tls";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { SqliteDatabase } from "./db.js";
import type { AuthProvider, SessionUser } from "./types.js";

export const sessionDurationMs = 1000 * 60 * 60 * 24 * 30;
export const sessionCookieName = "webapp_v2_session";
const oidcLoginRequestDurationMs = 1000 * 60 * 10;

type CreateUserOptions = {
  authProvider?: AuthProvider;
  oidcIssuer?: string | null;
  oidcSubject?: string | null;
};

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

  function normalizeUsernameBase(username: string) {
    const normalized = username.trim().replace(/\s+/g, " ").slice(0, 32);
    return normalized.length >= 3 ? normalized : "user";
  }

  function buildAvailableUsername(baseUsername: string, excludedUserId?: number) {
    const base = normalizeUsernameBase(baseUsername);

    const isAvailable = (candidate: string) => {
      const existing = database.prepare("SELECT id FROM users WHERE username = ?").get(candidate) as { id: number } | undefined;
      return !existing || existing.id === excludedUserId;
    };

    if (isAvailable(base)) {
      return base;
    }

    for (let suffixIndex = 2; suffixIndex < 1_000; suffixIndex += 1) {
      const suffix = `-${suffixIndex}`;
      const prefixLength = Math.max(3, 32 - suffix.length);
      const candidate = `${base.slice(0, prefixLength)}${suffix}`;
      if (isAvailable(candidate)) {
        return candidate;
      }
    }

    const randomSuffix = `-${randomBytes(3).toString("hex")}`;
    return `${base.slice(0, Math.max(3, 32 - randomSuffix.length))}${randomSuffix}`;
  }

  function getUserById(userId: number) {
    return database
      .prepare("SELECT id, username, role, auth_provider FROM users WHERE id = ?")
      .get(userId) as SessionUser | undefined;
  }

  function listUsers() {
    return database
      .prepare("SELECT id, username, role, created_at, auth_provider FROM users ORDER BY id ASC")
      .all() as Array<{ id: number; username: string; role: SessionUser["role"]; created_at: string; auth_provider: AuthProvider }>;
  }

  function countAdmins() {
    const row = database.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get() as { count: number };
    return row.count;
  }

  function hasUsers() {
    const row = database.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
    return row.count > 0;
  }

  function createUser(
    username: string,
    passwordHash: string,
    role: SessionUser["role"] = "admin",
    options: CreateUserOptions = {}
  ) {
    const now = new Date().toISOString();
    const authProvider = options.authProvider ?? "local";
    const result = database
      .prepare(
        "INSERT INTO users (username, password_hash, role, created_at, auth_provider, oidc_issuer, oidc_subject) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .run(username, passwordHash, role, now, authProvider, options.oidcIssuer ?? null, options.oidcSubject ?? null);
    return {
      id: Number(result.lastInsertRowid),
      username,
      role,
      auth_provider: authProvider,
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
        .prepare("INSERT INTO users (username, password_hash, created_at, auth_provider) VALUES (?, ?, ?, 'local')")
        .run(nextUsername, nextPasswordHash, now);

      return {
        id: Number(result.lastInsertRowid),
        username: nextUsername,
        role: "admin",
        auth_provider: "local",
      } satisfies SessionUser;
    });

    return createInitialUserTransaction(username, passwordHash);
  }

  function findUserByUsername(username: string) {
    return database.prepare("SELECT id, username, password_hash, role, auth_provider FROM users WHERE username = ?").get(username) as
      | { id: number; username: string; password_hash: string; role: SessionUser["role"]; auth_provider: AuthProvider }
      | undefined;
  }

  function findUserByOidcIdentity(oidcIssuer: string, oidcSubject: string) {
    return database
      .prepare("SELECT id, username, role, auth_provider FROM users WHERE oidc_issuer = ? AND oidc_subject = ?")
      .get(oidcIssuer, oidcSubject) as SessionUser | undefined;
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
                , users.auth_provider
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

  function purgeExpiredSessions() {
    const now = new Date().toISOString();
    const result = database.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(now);
    return result.changes;
  }

  function createOidcLoginRequest(state: string, codeVerifier: string, nonce: string, redirectTo: string) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + oidcLoginRequestDurationMs);

    database
      .prepare(
        "INSERT INTO oidc_login_requests (state, code_verifier, nonce, redirect_to, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .run(state, codeVerifier, nonce, redirectTo, expiresAt.toISOString(), now.toISOString());
  }

  function consumeOidcLoginRequest(state: string) {
    const now = new Date().toISOString();

    const consumeLoginRequestTransaction = database.transaction((requestState: string) => {
      const row = database
        .prepare(
          `SELECT state, code_verifier, nonce, redirect_to, expires_at
           FROM oidc_login_requests
           WHERE state = ? AND expires_at > ?`
        )
        .get(requestState, now) as
        | { state: string; code_verifier: string; nonce: string; redirect_to: string; expires_at: string }
        | undefined;

      database.prepare("DELETE FROM oidc_login_requests WHERE state = ? OR expires_at <= ?").run(requestState, now);

      return row;
    });

    return consumeLoginRequestTransaction(state);
  }

  function purgeExpiredOidcLoginRequests() {
    const now = new Date().toISOString();
    const result = database.prepare("DELETE FROM oidc_login_requests WHERE expires_at <= ?").run(now);
    return result.changes;
  }

  function syncOidcUser({
    oidcIssuer,
    oidcSubject,
    username,
    role,
    syncRole,
    passwordHash,
  }: {
    oidcIssuer: string;
    oidcSubject: string;
    username: string;
    role: SessionUser["role"];
    syncRole: boolean;
    passwordHash?: string;
  }) {
    const now = new Date().toISOString();

    const syncOidcUserTransaction = database.transaction(
      (nextOidcIssuer: string, nextOidcSubject: string, nextUsername: string, nextRole: SessionUser["role"], nextSyncRole: boolean, nextPasswordHash?: string) => {
        const existing = findUserByOidcIdentity(nextOidcIssuer, nextOidcSubject);
        if (existing) {
          if (nextSyncRole && existing.role !== nextRole) {
            database.prepare("UPDATE users SET role = ? WHERE id = ?").run(nextRole, existing.id);
          }

          return getUserById(existing.id) as SessionUser;
        }

        if (!nextPasswordHash) {
          throw new Error("A password hash is required when creating a new OIDC user.");
        }

        const uniqueUsername = buildAvailableUsername(nextUsername);
        const result = database
          .prepare(
            `INSERT INTO users (username, password_hash, role, created_at, auth_provider, oidc_issuer, oidc_subject)
             VALUES (?, ?, ?, ?, 'oidc', ?, ?)`
          )
          .run(uniqueUsername, nextPasswordHash, nextRole, now, nextOidcIssuer, nextOidcSubject);

        return {
          id: Number(result.lastInsertRowid),
          username: uniqueUsername,
          role: nextRole,
          auth_provider: "oidc",
        } satisfies SessionUser;
      }
    );

    return syncOidcUserTransaction(oidcIssuer, oidcSubject, username, role, syncRole, passwordHash);
  }

  function requireSession(request: FastifyRequest, reply: FastifyReply) {
    const user = getSessionUser(request);
    if (!user) {
      reply.code(401).send({ message: "errors.authRequired" });
      return null;
    }

    return user;
  }

  function updateUsername(userId: number, newUsername: string) {
    const existing = database.prepare("SELECT id FROM users WHERE username = ?").get(newUsername);
    if (existing) {
      return { error: "username_taken" as const };
    }
    database.prepare("UPDATE users SET username = ? WHERE id = ?").run(newUsername, userId);
    return { ok: true as const };
  }

  function updatePassword(userId: number, currentPasswordHash: string, newPasswordHash: string) {
    const user = database
      .prepare("SELECT password_hash, auth_provider FROM users WHERE id = ?")
      .get(userId) as { password_hash: string; auth_provider: AuthProvider } | undefined;
    if (!user) {
      return { error: "not_found" as const };
    }
    if (user.auth_provider === "oidc") {
      return { error: "password_managed_by_oidc" as const };
    }
    return { ok: true as const, currentPasswordHash: user.password_hash, newPasswordHash };
  }

  function applyPasswordUpdate(userId: number, newPasswordHash: string) {
    database.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(newPasswordHash, userId);
  }

  function deleteSelf(userId: number) {
    const user = database
      .prepare("SELECT role FROM users WHERE id = ?")
      .get(userId) as { role: SessionUser["role"] } | undefined;
    if (!user) {
      return { error: "not_found" as const };
    }
    if (user.role === "admin" && countAdmins() <= 1) {
      return { error: "last_admin" as const };
    }
    database.prepare("DELETE FROM users WHERE id = ?").run(userId);
    return { deleted: true as const };
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
    findUserByOidcIdentity,
    listUsers,
    createSession,
    clearSession,
    getSessionUser,
    purgeExpiredSessions,
    createOidcLoginRequest,
    consumeOidcLoginRequest,
    purgeExpiredOidcLoginRequests,
    syncOidcUser,
    requireSession,
    requireAdmin,
    updateUserRole,
    deleteUser,
    updateUsername,
    updatePassword,
    applyPasswordUpdate,
    deleteSelf,
    createInvitation,
    getInvitation,
    consumeInvitation,
  };
}
