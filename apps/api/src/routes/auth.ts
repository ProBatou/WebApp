import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  clearSession,
  consumeInvitation,
  createInvitation,
  deleteUser,
  createInitialUser,
  createSession,
  findUserByUsername,
  getInvitation,
  getSessionUser,
  hasUsers,
  hashPassword,
  listUsers,
  requireAdmin,
  requireSession,
  sessionCookieName,
  updateUserRole,
  verifyPassword,
  updateUsername,
  updatePassword,
  applyPasswordUpdate,
  deleteSelf,
} from "../lib/auth.js";
import { isDemoMode } from "../lib/demo.js";
import { completeOidcLogin, createOidcAuthorizationUrl, getOidcBootstrapConfig, getOidcErrorRedirectUri } from "../lib/oidc.js";
import { getPreferences } from "../lib/preferences-repository.js";
import type { PublicSessionUser, SessionUser } from "../lib/types.js";

type TokenParams = {
  token: string;
};

type IdParams = {
  id: string;
};

type OidcCallbackQuery = {
  code?: string;
  state?: string;
  error?: string;
};

const setupPayloadSchema = z.object({
  username: z.string().trim().min(3).max(32),
  password: z.string().min(8).max(128),
});

const loginPayloadSchema = z.object({
  username: z.string().trim().min(3).max(32),
  password: z.string().min(1).max(128),
});

const createUserPayloadSchema = z.object({
  role: z.enum(["admin", "viewer"]).default("viewer"),
});

const updateUserRolePayloadSchema = z.object({
  role: z.enum(["admin", "viewer"]),
});

const acceptInvitationPayloadSchema = z.object({
  username: z.string().trim().min(3).max(32),
  password: z.string().min(8).max(128),
});

function toPublicUser(user: SessionUser): PublicSessionUser {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    authProvider: user.auth_provider,
  };
}

export async function registerAuthRoutes(server: FastifyInstance) {
  server.get("/api/bootstrap", async (request) => {
    const user = getSessionUser(request);
    const prefs = user ? getPreferences(user.id) : null;

    return {
      needsSetup: isDemoMode ? false : !hasUsers(),
      demoMode: isDemoMode,
      user: user ? toPublicUser(user) : null,
      preferences: prefs
        ? {
            theme: prefs.theme,
            language: prefs.language,
            defaultAppId: prefs.default_app_id,
            accentColor: prefs.accent_color,
            sidebarColor: prefs.sidebar_color,
            textColor: prefs.text_color,
            accentColorDark: prefs.accent_color_dark,
            sidebarColorDark: prefs.sidebar_color_dark,
            textColorDark: prefs.text_color_dark,
            buttonColor: prefs.button_color,
          }
        : null,
      oidc: getOidcBootstrapConfig(),
    };
  });

  server.get("/api/session", async (request, reply) => {
    const user = requireSession(request, reply);
    if (!user) {
      return reply;
    }

    return { user: toPublicUser(user) };
  });

  server.post(
    "/api/setup",
    {
      config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
    if (isDemoMode) {
      return reply.code(403).send({ message: "errors.setupDisabledInDemo" });
    }

    const parsed = setupPayloadSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "errors.invalidCredentials" });
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const user = createInitialUser(parsed.data.username, passwordHash);
    if (!user) {
      return reply.code(409).send({ message: "errors.appAlreadyInitialized" });
    }

    createSession(request, reply, user.id);

    return reply.code(201).send({ user: toPublicUser(user) });
    }
  );

  server.post(
    "/api/login",
    {
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
    const parsed = loginPayloadSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "errors.invalidCredentials" });
    }

    const user = findUserByUsername(parsed.data.username);
    if (!user) {
      return reply.code(401).send({ message: "errors.invalidUsernamePassword" });
    }

    if (user.auth_provider === "oidc") {
      return reply.code(401).send({ message: "errors.useOidcLogin" });
    }

    const isValid = await verifyPassword(parsed.data.password, user.password_hash);
    if (!isValid) {
      return reply.code(401).send({ message: "errors.invalidUsernamePassword" });
    }

    clearSession(request, reply, request.cookies[sessionCookieName]);
    createSession(request, reply, user.id);

    return {
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        authProvider: user.auth_provider,
      },
    };
    }
  );

  server.get("/api/oidc/login", async (request, reply) => {
    try {
      const authorizationUrl = await createOidcAuthorizationUrl(request);
      return reply.redirect(authorizationUrl);
    } catch (error) {
      request.log.error(error, "Unable to start OIDC login");
      return reply.code(503).send({ message: "errors.oidcUnavailable" });
    }
  });

  server.get<{ Querystring: OidcCallbackQuery }>("/api/oidc/callback", async (request, reply) => {
    if (request.query.error) {
      return reply.redirect(getOidcErrorRedirectUri(request, "errors.oidcSignIn"));
    }

    if (!request.query.code || !request.query.state) {
      return reply.redirect(getOidcErrorRedirectUri(request, "errors.oidcSignIn"));
    }

    try {
      const result = await completeOidcLogin(request, {
        code: request.query.code,
        state: request.query.state,
      });

      clearSession(request, reply, request.cookies[sessionCookieName]);
      createSession(request, reply, result.user.id);

      return reply.redirect(result.redirectTo);
    } catch (error) {
      request.log.error(error, "Unable to complete OIDC login");
      return reply.redirect(getOidcErrorRedirectUri(request, "errors.oidcSignIn"));
    }
  });

  server.post("/api/logout", async (request, reply) => {
    clearSession(request, reply, request.cookies[sessionCookieName]);
    return reply.code(204).send();
  });

  server.get("/api/users", async (request, reply) => {
    const user = requireSession(request, reply);
    if (!user) {
      return reply;
    }

    if (!requireAdmin(user, reply)) {
      return reply;
    }

    return { items: listUsers() };
  });

  server.post(
    "/api/invitations",
    {
      config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      if (isDemoMode) {
        return reply.code(403).send({ message: "errors.demoMode" });
      }

      const user = requireSession(request, reply);
      if (!user) {
        return reply;
      }

      if (!requireAdmin(user, reply)) {
        return reply;
      }

      const parsed = createUserPayloadSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ message: "errors.invalidData" });
      }

      const invitation = createInvitation(parsed.data.role, user.id);
      const host = request.headers.host ?? "localhost:3001";
      const requestOrigin = request.headers.origin ?? `${request.protocol}://${host}`;
      return reply.code(201).send({
        token: invitation.id,
        role: invitation.role,
        expiresAt: invitation.expires_at,
        inviteUrl: `${requestOrigin}/?invite=${encodeURIComponent(invitation.id)}`,
      });
    }
  );

  server.get<{ Params: TokenParams }>("/api/invitations/:token", async (request, reply) => {
    const token = request.params.token;
    const invitation = getInvitation(token);
    if (!invitation) {
      return reply.code(404).send({ message: "errors.invalidInvite" });
    }

    return {
      role: invitation.role,
      expiresAt: invitation.expires_at,
    };
  });

  server.post<{ Params: TokenParams }>(
    "/api/invitations/:token/accept",
    {
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      if (isDemoMode) {
        return reply.code(403).send({ message: "errors.demoMode" });
      }

      const token = request.params.token;
      const parsed = acceptInvitationPayloadSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ message: "errors.invalidData" });
      }

      const passwordHash = await hashPassword(parsed.data.password);
      const result = consumeInvitation(token, parsed.data.username, passwordHash);
      if ("error" in result) {
        if (result.error === "invalid_invitation") {
          return reply.code(404).send({ message: "errors.invalidInvite" });
        }

        if (result.error === "username_taken") {
          return reply.code(409).send({ message: "errors.usernameTaken" });
        }

        return reply.code(400).send({ message: "errors.invalidInvitation" });
      }

      clearSession(request, reply, request.cookies[sessionCookieName]);
      createSession(request, reply, result.user.id);

      return {
        user: toPublicUser(result.user),
      };
    }
  );

  server.put<{ Params: IdParams }>(
    "/api/users/:id/role",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      if (isDemoMode) {
        return reply.code(403).send({ message: "errors.demoMode" });
      }

      const user = requireSession(request, reply);
      if (!user) {
        return reply;
      }

      if (!requireAdmin(user, reply)) {
        return reply;
      }

      const id = Number(request.params.id);
      if (!Number.isInteger(id)) {
        return reply.code(400).send({ message: "errors.invalidId" });
      }

      const parsed = updateUserRolePayloadSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ message: "errors.invalidData" });
      }

      const result = updateUserRole(id, parsed.data.role, user.id);
      if ("error" in result) {
        if (result.error === "not_found") {
          return reply.code(404).send({ message: "errors.notFound" });
        }

        if (result.error === "self_change_forbidden") {
          return reply.code(400).send({ message: "errors.selfRoleChange" });
        }

        if (result.error === "last_admin") {
          return reply.code(400).send({ message: "errors.lastAdmin" });
        }

        return reply.code(500).send({ message: "errors.api" });
      }

      return { items: listUsers() };
    }
  );

  server.delete<{ Params: IdParams }>(
    "/api/users/:id",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      if (isDemoMode) {
        return reply.code(403).send({ message: "errors.demoMode" });
      }

      const user = requireSession(request, reply);
      if (!user) {
        return reply;
      }

      if (!requireAdmin(user, reply)) {
        return reply;
      }

      const id = Number(request.params.id);
      if (!Number.isInteger(id)) {
        return reply.code(400).send({ message: "errors.invalidId" });
      }

      const result = deleteUser(id, user.id);
      if ("error" in result) {
        if (result.error === "not_found") {
          return reply.code(404).send({ message: "errors.notFound" });
        }

        if (result.error === "self_delete_forbidden") {
          return reply.code(400).send({ message: "errors.selfDelete" });
        }

        if (result.error === "last_admin") {
          return reply.code(400).send({ message: "errors.lastAdmin" });
        }

        return reply.code(500).send({ message: "errors.api" });
      }

      return { items: listUsers() };
    }
  );

  const updateUsernameSchema = z.object({
    username: z.string().trim().min(3).max(32),
  });

  const updatePasswordSchema = z.object({
    currentPassword: z.string().min(1).max(128),
    newPassword: z.string().min(8).max(128),
  });

  server.put(
    "/api/user/username",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (request, reply) => {
      if (isDemoMode) return reply.code(403).send({ message: "errors.demoMode" });
      const user = requireSession(request, reply);
      if (!user) return reply;

      const parsed = updateUsernameSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ message: "errors.invalidData" });

      const result = updateUsername(user.id, parsed.data.username);
      if ("error" in result) {
        if (result.error === "username_taken") {
          return reply.code(409).send({ message: "errors.usernameTaken" });
        }

        return reply.code(500).send({ message: "errors.api" });
      }

      return { username: parsed.data.username };
    }
  );

  server.put(
    "/api/user/password",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (request, reply) => {
      if (isDemoMode) return reply.code(403).send({ message: "errors.demoMode" });
      const user = requireSession(request, reply);
      if (!user) return reply;

      const parsed = updatePasswordSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ message: "errors.invalidData" });

      const check = updatePassword(user.id, parsed.data.currentPassword, "");
      if ("error" in check) {
        if (check.error === "not_found") {
          return reply.code(404).send({ message: "errors.notFound" });
        }

        if (check.error === "password_managed_by_oidc") {
          return reply.code(400).send({ message: "errors.passwordManagedByOidc" });
        }

        return reply.code(500).send({ message: "errors.api" });
      }

      const valid = await verifyPassword(parsed.data.currentPassword, check.currentPasswordHash);
      if (!valid) return reply.code(401).send({ message: "errors.invalidCredentials" });

      const newHash = await hashPassword(parsed.data.newPassword);
      applyPasswordUpdate(user.id, newHash);

      return { ok: true };
    }
  );

  server.delete(
    "/api/user",
    { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } },
    async (request, reply) => {
      if (isDemoMode) return reply.code(403).send({ message: "errors.demoMode" });
      const user = requireSession(request, reply);
      if (!user) return reply;

      const result = deleteSelf(user.id);
      if ("error" in result) {
        if (result.error === "last_admin") return reply.code(400).send({ message: "errors.lastAdmin" });
        if (result.error === "not_found") return reply.code(404).send({ message: "errors.notFound" });
        return reply.code(500).send({ message: "errors.api" });
      }

      clearSession(request, reply);
      return { deleted: true };
    }
  );
}
