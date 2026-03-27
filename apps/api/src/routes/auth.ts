import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  clearSession,
  createInitialUser,
  createSession,
  findUserByUsername,
  getSessionUser,
  hasUsers,
  hashPassword,
  requireSession,
  sessionCookieName,
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
      },
    };
    }
  );

  server.post("/api/logout", async (request, reply) => {
    clearSession(request, reply, request.cookies[sessionCookieName]);
    return reply.code(204).send();
  });
}
