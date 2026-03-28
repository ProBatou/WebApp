import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { accessSync, constants } from "node:fs";
import type { FastifyInstance } from "fastify";

const iconSlugPattern = /^[a-z0-9-]+$/;
const dashboardIconsCdnBaseUrl = "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg";
const currentDir = dirname(fileURLToPath(import.meta.url));
const iconsCacheDir = resolve(currentDir, "../../data/icons");

function getIconCachePath(slug: string) {
  return resolve(iconsCacheDir, `${slug}.svg`);
}

function hasCachedIcon(path: string) {
  try {
    accessSync(path, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

export async function registerIconRoutes(server: FastifyInstance) {
  await mkdir(iconsCacheDir, { recursive: true });

  server.get("/api/icons/proxy/:slug", async (request, reply) => {
    const rawSlug = (request.params as { slug: string }).slug;
    const slug = rawSlug.trim().toLowerCase();
    if (!iconSlugPattern.test(slug)) {
      return reply.code(400).send({ message: "errors.invalidIcon" });
    }

    const cachePath = getIconCachePath(slug);
    const cached = hasCachedIcon(cachePath);
    if (cached) {
      const data = await readFile(cachePath);
      reply.header("Content-Type", "image/svg+xml; charset=utf-8");
      reply.header("Cache-Control", "public, max-age=86400");
      return reply.send(data);
    }

    const upstreamUrl = `${dashboardIconsCdnBaseUrl}/${slug}.svg`;

    try {
      const response = await fetch(upstreamUrl, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) {
        return reply.code(404).send({ message: "errors.iconNotFound" });
      }

      const iconSvg = await response.text();
      await writeFile(cachePath, iconSvg, "utf8");

      reply.header("Content-Type", "image/svg+xml; charset=utf-8");
      reply.header("Cache-Control", "public, max-age=86400");
      return reply.send(iconSvg);
    } catch {
      return reply.code(404).send({ message: "errors.iconNotFound" });
    }
  });
}
