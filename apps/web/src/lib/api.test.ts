import test from "node:test";
import assert from "node:assert/strict";
import { apiFetch } from "./api";

function createJsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(init.headers ?? {}),
    },
  });
}

test("apiFetch sends credentials, CSRF header and JSON content type for body requests", async () => {
  const originalFetch = globalThis.fetch;

  try {
    globalThis.fetch = (async (input, init) => {
      assert.equal(input, "/api/test");
      assert.equal(init?.credentials, "include");
      assert.equal((init?.headers as Headers).get("X-Requested-With"), "webapp-v2");
      assert.equal((init?.headers as Headers).get("Content-Type"), "application/json");
      assert.ok(init?.signal);

      return createJsonResponse({ ok: true });
    }) as typeof fetch;

    const result = await apiFetch<{ ok: boolean }>("/api/test", {
      method: "POST",
      body: JSON.stringify({ hello: "world" }),
    });

    assert.deepEqual(result, { ok: true });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("apiFetch does not set JSON content type for body-less mutation requests", async () => {
  const originalFetch = globalThis.fetch;

  try {
    globalThis.fetch = (async (_, init) => {
      assert.equal((init?.headers as Headers).get("X-Requested-With"), "webapp-v2");
      assert.equal((init?.headers as Headers).get("Content-Type"), null);

      return createJsonResponse({ ok: true });
    }) as typeof fetch;

    const result = await apiFetch<{ ok: boolean }>("/api/logout", {
      method: "POST",
    });

    assert.deepEqual(result, { ok: true });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("apiFetch preserves caller abort signals while adding its timeout", async () => {
  const originalFetch = globalThis.fetch;
  const controller = new AbortController();

  try {
    globalThis.fetch = ((_, init) =>
      new Promise((_, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      })) as typeof fetch;

    const requestPromise = apiFetch("/api/test", { signal: controller.signal });
    controller.abort();

    await assert.rejects(requestPromise, { name: "AbortError" });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("apiFetch returns null for 204 responses", async () => {
  const originalFetch = globalThis.fetch;

  try {
    globalThis.fetch = (async () => new Response(null, { status: 204 })) as typeof fetch;

    const result = await apiFetch<null>("/api/test", { method: "DELETE" });
    assert.equal(result, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("apiFetch throws the API message from JSON error responses", async () => {
  const originalFetch = globalThis.fetch;

  try {
    globalThis.fetch = (async () => createJsonResponse({ message: "errors.invalidData" }, { status: 400 })) as typeof fetch;

    await assert.rejects(apiFetch("/api/test"), /errors\.invalidData/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("apiFetch logs and falls back to a generic error for HTML responses", async () => {
  const originalFetch = globalThis.fetch;
  const originalConsoleError = console.error;
  const logged: unknown[] = [];

  try {
    console.error = (...args: unknown[]) => {
      logged.push(args);
    };

    globalThis.fetch = (async () =>
      new Response("<html><body>Bad Gateway</body></html>", {
        status: 502,
        headers: {
          "content-type": "text/html; charset=utf-8",
        },
      })) as typeof fetch;

    await assert.rejects(apiFetch("/api/test"), /errors\.api/);
    assert.equal(logged.length, 1);
  } finally {
    console.error = originalConsoleError;
    globalThis.fetch = originalFetch;
  }
});

test("apiFetch logs invalid JSON error bodies and falls back to a generic message", async () => {
  const originalFetch = globalThis.fetch;
  const originalConsoleError = console.error;
  const logged: unknown[] = [];

  try {
    console.error = (...args: unknown[]) => {
      logged.push(args);
    };

    globalThis.fetch = (async () =>
      new Response("{not-json", {
        status: 500,
        headers: {
          "content-type": "application/json; charset=utf-8",
        },
      })) as typeof fetch;

    await assert.rejects(apiFetch("/api/test"), /errors\.api/);
    assert.equal(logged.length, 1);
  } finally {
    console.error = originalConsoleError;
    globalThis.fetch = originalFetch;
  }
});
