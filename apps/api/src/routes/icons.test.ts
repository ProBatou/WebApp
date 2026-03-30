import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import { registerIconRoutes } from "./icons.js";

const currentDir = dirname(fileURLToPath(import.meta.url));
const iconsCacheDir = resolve(currentDir, "../../data/icons");

async function createTestServer() {
  const server = Fastify();
  await registerIconRoutes(server);
  return server;
}

async function cleanupIcon(slug: string) {
  await rm(resolve(iconsCacheDir, `${slug}.svg`), { force: true });
}

test("GET /api/icons/proxy/:slug rejects invalid slugs", async () => {
  const server = await createTestServer();

  try {
    const response = await server.inject({
      method: "GET",
      url: "/api/icons/proxy/bad/icon",
    });

    assert.equal(response.statusCode, 404);
  } finally {
    await server.close();
  }
});

test("GET /api/icons/proxy/:slug rejects upstream non-SVG content types", async () => {
  const originalFetch = globalThis.fetch;
  const server = await createTestServer();

  try {
    globalThis.fetch = (async () =>
      new Response("<svg></svg>", {
        status: 200,
        headers: {
          "content-type": "text/plain; charset=utf-8",
        },
      })) as typeof fetch;

    const response = await server.inject({
      method: "GET",
      url: "/api/icons/proxy/plaintexticon",
    });

    assert.equal(response.statusCode, 400);
    assert.deepEqual(response.json(), { message: "errors.invalidIcon" });
  } finally {
    globalThis.fetch = originalFetch;
    await cleanupIcon("plaintexticon");
    await server.close();
  }
});

test("GET /api/icons/proxy/:slug rejects dangerous SVG payloads", async () => {
  const originalFetch = globalThis.fetch;
  const server = await createTestServer();

  try {
    globalThis.fetch = (async () =>
      new Response('<svg onload="alert(1)"></svg>', {
        status: 200,
        headers: {
          "content-type": "image/svg+xml; charset=utf-8",
        },
      })) as typeof fetch;

    const response = await server.inject({
      method: "GET",
      url: "/api/icons/proxy/dangerousicon",
    });

    assert.equal(response.statusCode, 400);
    assert.deepEqual(response.json(), { message: "errors.invalidIcon" });
  } finally {
    globalThis.fetch = originalFetch;
    await cleanupIcon("dangerousicon");
    await server.close();
  }
});

test("GET /api/icons/proxy/:slug caches valid SVGs and serves cached content", async () => {
  const originalFetch = globalThis.fetch;
  const server = await createTestServer();
  const slug = "cachedicon-test";
  let fetchCalls = 0;

  try {
    await mkdir(iconsCacheDir, { recursive: true });
    await cleanupIcon(slug);

    globalThis.fetch = (async () => {
      fetchCalls += 1;
      return new Response('<svg viewBox="0 0 1 1"></svg>', {
        status: 200,
        headers: {
          "content-type": "image/svg+xml; charset=utf-8",
        },
      });
    }) as typeof fetch;

    const firstResponse = await server.inject({
      method: "GET",
      url: `/api/icons/proxy/${slug}`,
    });
    const secondResponse = await server.inject({
      method: "GET",
      url: `/api/icons/proxy/${slug}`,
    });

    assert.equal(firstResponse.statusCode, 200);
    assert.equal(firstResponse.headers["content-type"], "image/svg+xml; charset=utf-8");
    assert.match(firstResponse.body, /<svg/);
    assert.equal(secondResponse.statusCode, 200);
    assert.match(secondResponse.body, /<svg/);
    assert.equal(fetchCalls, 1);
  } finally {
    globalThis.fetch = originalFetch;
    await cleanupIcon(slug);
    await server.close();
  }
});
