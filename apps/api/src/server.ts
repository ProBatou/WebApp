import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import staticPlugin from "@fastify/static";
import "./lib/db.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerAppRoutes } from "./routes/apps.js";

const currentDir = dirname(fileURLToPath(import.meta.url));
const webDistPath = resolve(currentDir, "../../web/dist");
const hasWebBuild = existsSync(resolve(webDistPath, "index.html"));

const server = Fastify({
  logger: true,
  trustProxy: true,
});

await server.register(cors, {
  origin: ["http://localhost:5173"],
  credentials: true,
});

await server.register(cookie);

server.get("/api/health", async () => {
  return {
    status: "ok",
    service: "webapp-v2-api",
    timestamp: new Date().toISOString(),
  };
});

await registerAuthRoutes(server);
await registerAppRoutes(server);

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
