import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import staticPlugin from "@fastify/static";
import { db } from "./lib/db.js";
import { purgeExpiredSessions } from "./lib/auth.js";
import { ensureDemoState } from "./lib/demo.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerAppRoutes } from "./routes/apps.js";
import { registerGroupRoutes } from "./routes/groups.js";
import { registerIconRoutes } from "./routes/icons.js";
import { registerPreferencesRoutes } from "./routes/preferences.js";

const currentDir = dirname(fileURLToPath(import.meta.url));
const webDistPath = resolve(currentDir, "../../web/dist");
const hasWebBuild = existsSync(resolve(webDistPath, "index.html"));

const server = Fastify({
  logger: true,
  trustProxy: true,
});

await ensureDemoState();

try {
  purgeExpiredSessions();
} catch {}

await server.register(cors, {
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : ["http://localhost:5173"],
  credentials: true,
  allowedHeaders: ["Content-Type", "X-Requested-With"],
});

await server.register(cookie);
await server.register(rateLimit, {
  global: true,
  max: 120,
  timeWindow: "1 minute",
  allowList: [],
});

server.addHook("onRequest", async (request, reply) => {
  const isMutation = request.method !== "GET" && request.method !== "HEAD" && request.method !== "OPTIONS";
  const isApiRoute = request.url.startsWith("/api/");

  if (isMutation && isApiRoute) {
    const xRequestedWith = request.headers["x-requested-with"];
    if (xRequestedWith !== "webapp-v2") {
      return reply.code(403).send({ message: "Forbidden: missing CSRF header." });
    }
  }
});

const SESSION_PURGE_INTERVAL_MS = 1000 * 60 * 60;
setInterval(() => {
  try {
    const purged = purgeExpiredSessions();
    if (purged > 0) {
      server.log.info({ purged }, "Expired sessions purged");
    }
  } catch (error) {
    server.log.error(error, "Failed to purge expired sessions");
  }
}, SESSION_PURGE_INTERVAL_MS);

server.addHook("onSend", async (_request, reply, payload) => {
  reply.header(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'self'",
      "form-action 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' http: https: ws: wss:",
      "frame-src 'self' http: https:",
    ].join("; ")
  );

  return payload;
});

server.get("/api/health", async () => {
  db.prepare("SELECT 1").get();

  return {
    status: "ok",
    service: "webapp-v2-api",
    timestamp: new Date().toISOString(),
  };
});

await registerAuthRoutes(server);
await registerAppRoutes(server);
await registerGroupRoutes(server);
await registerIconRoutes(server);
await registerPreferencesRoutes(server);

if (hasWebBuild) {
  await server.register(staticPlugin, {
    root: webDistPath,
    prefix: "/",
  });

  server.setNotFoundHandler((request, reply) => {
    if (request.raw.method !== "GET" && request.raw.method !== "HEAD") {
      return reply.code(404).send({ message: "Route introuvable." });
    }

    if (request.url.startsWith("/api")) {
      return reply.code(404).send({ message: "Route API introuvable." });
    }

    return reply.sendFile("index.html");
  });
}

const start = async () => {
  try {
    await server.listen({
      host: "0.0.0.0",
      port: Number(process.env.PORT ?? 3001),
    });
  } catch (error) {
    server.log.error(error);
    process.exit(1);
  }
};

start();
