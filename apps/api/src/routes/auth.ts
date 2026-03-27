import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  clearSession,
  createUser,
  deleteUser,
  createInitialUser,
  createSession,
  findUserByUsername,
  getSessionUser,
  hasUsers,
  hashPassword,
  listUsers,
  requireAdmin,
  requireSession,
  sessionCookieName,
  updateUserRole,
  verifyPassword,
} from "../lib/auth.js";
import { isDemoMode } from "../lib/demo.js";

const setupPayloadSchema = z.object({
  username: z.string().trim().min(3).max(32),
  password: z.string().min(8).max(128),
});

const loginPayloadSchema = z.object({
  username: z.string().trim().min(3).max(32),
  password: z.string().min(1).max(128),
});

const createUserPayloadSchema = z.object({
  username: z.string().trim().min(3).max(32),
  password: z.string().min(8).max(128),
  role: z.enum(["admin", "viewer"]).default("viewer"),
});

const updateUserRolePayloadSchema = z.object({
  role: z.enum(["admin", "viewer"]),
});

export async function registerAuthRoutes(server: FastifyInstance) {
  server.get("/api/bootstrap", async (request) => {
    const user = getSessionUser(request);

    return {
      needsSetup: isDemoMode ? false : !hasUsers(),
      demoMode: isDemoMode,
      user,
    };
  });

  server.get("/api/session", async (request, reply) => {
    const user = requireSession(request, reply);
    if (!user) {
      return reply;
    }

    return { user };
  });

  server.post(
    "/api/setup",
    {
      config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
    if (isDemoMode) {
      return reply.code(403).send({ message: "Mode demo: creation de compte desactivee." });
    }

    const parsed = setupPayloadSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Identifiants invalides." });
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const user = createInitialUser(parsed.data.username, passwordHash);
    if (!user) {
      return reply.code(409).send({ message: "L'application est deja initialisee." });
    }

    createSession(request, reply, user.id);

    return reply.code(201).send({ user });
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
      return reply.code(400).send({ message: "Identifiants invalides." });
    }

    const user = findUserByUsername(parsed.data.username);
    if (!user) {
      return reply.code(401).send({ message: "Utilisateur ou mot de passe incorrect." });
    }

    const isValid = await verifyPassword(parsed.data.password, user.password_hash);
    if (!isValid) {
      return reply.code(401).send({ message: "Utilisateur ou mot de passe incorrect." });
    }

    clearSession(request, reply, request.cookies[sessionCookieName]);
    createSession(request, reply, user.id);

    return {
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    };
    }
  );

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
    "/api/users",
    {
      config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      if (isDemoMode) {
        return reply.code(403).send({ message: "Mode demo: modifications desactivees." });
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
        return reply.code(400).send({ message: "Donnees invalides." });
      }

      const existingUser = findUserByUsername(parsed.data.username);
      if (existingUser) {
        return reply.code(409).send({ message: "Nom d'utilisateur deja utilise." });
      }

      const passwordHash = await hashPassword(parsed.data.password);
      createUser(parsed.data.username, passwordHash, parsed.data.role);

      return reply.code(201).send({ items: listUsers() });
    }
  );

  server.put(
    "/api/users/:id/role",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      if (isDemoMode) {
        return reply.code(403).send({ message: "Mode demo: modifications desactivees." });
      }

      const user = requireSession(request, reply);
      if (!user) {
        return reply;
      }

      if (!requireAdmin(user, reply)) {
        return reply;
      }

      const id = Number((request.params as { id: string }).id);
      if (!Number.isInteger(id)) {
        return reply.code(400).send({ message: "Identifiant invalide." });
      }

      const parsed = updateUserRolePayloadSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ message: "Donnees invalides." });
      }

      const result = updateUserRole(id, parsed.data.role, user.id);
      if ("error" in result) {
        if (result.error === "not_found") {
          return reply.code(404).send({ message: "Utilisateur introuvable." });
        }

        if (result.error === "self_change_forbidden") {
          return reply.code(400).send({ message: "Impossible de modifier votre propre role." });
        }

        if (result.error === "last_admin") {
          return reply.code(400).send({ message: "Impossible de retirer le dernier administrateur." });
        }
      }

      return { items: listUsers() };
    }
  );

  server.delete(
    "/api/users/:id",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      if (isDemoMode) {
        return reply.code(403).send({ message: "Mode demo: modifications desactivees." });
      }

      const user = requireSession(request, reply);
      if (!user) {
        return reply;
      }

      if (!requireAdmin(user, reply)) {
        return reply;
      }

      const id = Number((request.params as { id: string }).id);
      if (!Number.isInteger(id)) {
        return reply.code(400).send({ message: "Identifiant invalide." });
      }

      const result = deleteUser(id, user.id);
      if ("error" in result) {
        if (result.error === "not_found") {
          return reply.code(404).send({ message: "Utilisateur introuvable." });
        }

        if (result.error === "self_delete_forbidden") {
          return reply.code(400).send({ message: "Impossible de supprimer votre propre compte." });
        }

        if (result.error === "last_admin") {
          return reply.code(400).send({ message: "Impossible de supprimer le dernier administrateur." });
        }
      }

      return { items: listUsers() };
    }
  );
}
