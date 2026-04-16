import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { exportJWK, generateKeyPair, SignJWT } from "jose";

const tempDir = await mkdtemp(join(tmpdir(), "webapp-v2-api-"));
process.env.DATABASE_PATH = join(tempDir, "integration.db");
process.env.DEMO_MODE = "false";

const [{ createServer }, { db }] = await Promise.all([
  import("./server.js"),
  import("./lib/db.js"),
]);

beforeEach(() => {
  db.exec(`
    DELETE FROM sessions;
    DELETE FROM oidc_login_requests;
    DELETE FROM invitations;
    DELETE FROM user_preferences;
    DELETE FROM apps;
    DELETE FROM groups;
    DELETE FROM users;
    DELETE FROM sqlite_sequence WHERE name IN ('users', 'groups', 'apps');
  `);
});

async function withPatchedFetch<T>(mockFetch: typeof fetch, callback: () => Promise<T>) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch;

  try {
    return await callback();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function withOidcEnv<T>(values: Record<string, string>, callback: () => Promise<T>) {
  const previous = new Map<string, string | undefined>();

  for (const [key, value] of Object.entries(values)) {
    previous.set(key, process.env[key]);
    process.env[key] = value;
  }

  try {
    return await callback();
  } finally {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

function getSessionCookie(setCookieHeader: string | string[] | undefined) {
  const headerValue = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
  assert.ok(headerValue, "Expected a session cookie to be set.");
  return headerValue.split(";")[0];
}

async function createAuthenticatedAdminSession(server: Awaited<ReturnType<typeof createServer>>) {
  const setupResponse = await server.inject({
    method: "POST",
    url: "/api/setup",
    headers: {
      "x-requested-with": "webapp-v2",
    },
    payload: {
      username: "admin",
      password: "supersecret",
    },
  });

  assert.equal(setupResponse.statusCode, 201);
  return getSessionCookie(setupResponse.headers["set-cookie"]);
}

async function createIframeApp(server: Awaited<ReturnType<typeof createServer>>, sessionCookie: string, url: string) {
  const createResponse = await server.inject({
    method: "POST",
    url: "/api/apps",
    headers: {
      cookie: sessionCookie,
      "x-requested-with": "webapp-v2",
    },
    payload: {
      name: "Service",
      url,
      icon: "plex",
      iconVariantMode: "auto",
      iconVariantInverted: false,
      accent: "#123456",
      openMode: "iframe",
      isShared: true,
      groupId: null,
    },
  });

  assert.equal(createResponse.statusCode, 201);
  return createResponse.json().item as { id: number };
}

test("POST /api/setup rejects mutation requests without the CSRF header", async () => {
  const server = await createServer();

  try {
    const response = await server.inject({
      method: "POST",
      url: "/api/setup",
      payload: {
        username: "admin",
        password: "supersecret",
      },
    });

    assert.equal(response.statusCode, 403);
    assert.deepEqual(response.json(), { message: "Forbidden: missing CSRF header." });
  } finally {
    await server.close();
  }
});

test("GET /api/bootstrap stays accessible without the CSRF header", async () => {
  const server = await createServer();

  try {
    const response = await server.inject({
      method: "GET",
      url: "/api/bootstrap",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().needsSetup, true);
  } finally {
    await server.close();
  }
});

test("OIDC login creates an authenticated Pocket ID session", async () => {
  const issuer = "https://id.example.com";
  const clientId = "webapp-client";
  const postLoginRedirect = "http://localhost:5173/";
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const publicJwk = await exportJWK(publicKey);
  publicJwk.kid = "test-key";
  let capturedNonce: string | null = null;

  await withOidcEnv(
    {
      OIDC_ISSUER_URL: issuer,
      OIDC_CLIENT_ID: clientId,
      OIDC_CLIENT_SECRET: "super-secret",
      OIDC_ADMIN_GROUPS: "webapp-admins",
      OIDC_POST_LOGIN_REDIRECT_URI: postLoginRedirect,
    },
    async () => {
      const mockFetch: typeof fetch = async (input, init) => {
        const url = String(input);

        if (url === `${issuer}/.well-known/openid-configuration`) {
          return new Response(
            JSON.stringify({
              issuer,
              authorization_endpoint: `${issuer}/authorize`,
              token_endpoint: `${issuer}/token`,
              jwks_uri: `${issuer}/jwks`,
            }),
            {
              status: 200,
              headers: { "content-type": "application/json" },
            }
          );
        }

        if (url === `${issuer}/token`) {
          assert.ok(capturedNonce);

          const idToken = await new SignJWT({
            sub: "pocket-id-user-1",
            preferred_username: "pocket-admin",
            groups: ["webapp-admins"],
            nonce: capturedNonce,
          })
            .setProtectedHeader({ alg: "RS256", kid: "test-key" })
            .setIssuer(issuer)
            .setAudience(clientId)
            .setIssuedAt()
            .setExpirationTime("5m")
            .sign(privateKey);

          return new Response(
            JSON.stringify({
              access_token: "access-token",
              id_token: idToken,
              token_type: "Bearer",
            }),
            {
              status: 200,
              headers: { "content-type": "application/json" },
            }
          );
        }

        if (url === `${issuer}/jwks`) {
          return new Response(JSON.stringify({ keys: [publicJwk] }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }

        assert.fail(`Unexpected fetch to ${url}`);
      };

      await withPatchedFetch(mockFetch, async () => {
        const server = await createServer();

        try {
          const bootstrapResponse = await server.inject({
            method: "GET",
            url: "/api/bootstrap",
          });

          assert.equal(bootstrapResponse.statusCode, 200);
          assert.deepEqual(bootstrapResponse.json().oidc, {
            enabled: true,
            providerName: "Pocket ID",
            loginUrl: "/api/oidc/login",
            passwordAuthEnabled: true,
          });

          const loginResponse = await server.inject({
            method: "GET",
            url: "/api/oidc/login",
          });

          assert.equal(loginResponse.statusCode, 302);
          const authorizationUrl = new URL(loginResponse.headers.location ?? "");
          assert.equal(authorizationUrl.searchParams.get("redirect_uri"), "http://localhost:5173/api/oidc/callback");
          const oidcState = db
            .prepare("SELECT state, nonce FROM oidc_login_requests LIMIT 1")
            .get() as { state: string; nonce: string } | undefined;
          assert.ok(oidcState);
          capturedNonce = oidcState.nonce;

          const callbackResponse = await server.inject({
            method: "GET",
            url: `/api/oidc/callback?code=test-code&state=${oidcState.state}`,
          });

          assert.equal(callbackResponse.statusCode, 302);
          assert.equal(callbackResponse.headers.location, postLoginRedirect);

          const sessionCookie = getSessionCookie(callbackResponse.headers["set-cookie"]);
          const sessionResponse = await server.inject({
            method: "GET",
            url: "/api/session",
            headers: {
              cookie: sessionCookie,
            },
          });

          assert.equal(sessionResponse.statusCode, 200);
          assert.deepEqual(sessionResponse.json(), {
            user: {
              id: 1,
              username: "pocket-admin",
              role: "admin",
              authProvider: "oidc",
            },
          });

          const passwordLoginResponse = await server.inject({
            method: "POST",
            url: "/api/login",
            headers: {
              "x-requested-with": "webapp-v2",
            },
            payload: {
              username: "pocket-admin",
              password: "irrelevant-password",
            },
          });

          assert.equal(passwordLoginResponse.statusCode, 401);
          assert.deepEqual(passwordLoginResponse.json(), { message: "errors.useOidcLogin" });
        } finally {
          await server.close();
        }
      });
    }
  );
});

test("OIDC login retries the token exchange with client_secret_post when basic auth fails", async () => {
  const issuer = "https://id.example.com";
  const clientId = "webapp-client";
  const postLoginRedirect = "https://app.example.com/";
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const publicJwk = await exportJWK(publicKey);
  publicJwk.kid = "test-key";
  let capturedNonce: string | null = null;
  const tokenRequests: Array<{ authorization: string | null; body: string }> = [];

  await withOidcEnv(
    {
      OIDC_ISSUER_URL: issuer,
      OIDC_CLIENT_ID: clientId,
      OIDC_CLIENT_SECRET: "super-secret",
      OIDC_POST_LOGIN_REDIRECT_URI: postLoginRedirect,
    },
    async () => {
      const mockFetch: typeof fetch = async (input, init) => {
        const url = String(input);

        if (url === `${issuer}/.well-known/openid-configuration`) {
          return new Response(
            JSON.stringify({
              issuer,
              authorization_endpoint: `${issuer}/authorize`,
              token_endpoint: `${issuer}/token`,
              jwks_uri: `${issuer}/jwks`,
              token_endpoint_auth_methods_supported: ["client_secret_basic", "client_secret_post"],
            }),
            {
              status: 200,
              headers: { "content-type": "application/json" },
            }
          );
        }

        if (url === `${issuer}/token`) {
          const requestHeaders = new Headers(init?.headers);
          const body = String(init?.body ?? "");
          tokenRequests.push({
            authorization: requestHeaders.get("authorization"),
            body,
          });

          if (requestHeaders.has("authorization")) {
            return new Response(JSON.stringify({ error: "invalid_client" }), {
              status: 400,
              headers: { "content-type": "application/json" },
            });
          }

          assert.ok(capturedNonce);
          assert.match(body, /client_secret=super-secret/);

          const idToken = await new SignJWT({
            sub: "pocket-id-user-2",
            preferred_username: "pocket-viewer",
            nonce: capturedNonce,
          })
            .setProtectedHeader({ alg: "RS256", kid: "test-key" })
            .setIssuer(issuer)
            .setAudience(clientId)
            .setIssuedAt()
            .setExpirationTime("5m")
            .sign(privateKey);

          return new Response(
            JSON.stringify({
              access_token: "access-token",
              id_token: idToken,
              token_type: "Bearer",
            }),
            {
              status: 200,
              headers: { "content-type": "application/json" },
            }
          );
        }

        if (url === `${issuer}/jwks`) {
          return new Response(JSON.stringify({ keys: [publicJwk] }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }

        assert.fail(`Unexpected fetch to ${url}`);
      };

      await withPatchedFetch(mockFetch, async () => {
        const server = await createServer();

        try {
          const loginResponse = await server.inject({
            method: "GET",
            url: "/api/oidc/login",
          });

          assert.equal(loginResponse.statusCode, 302);
          const oidcState = db
            .prepare("SELECT state, nonce FROM oidc_login_requests LIMIT 1")
            .get() as { state: string; nonce: string } | undefined;
          assert.ok(oidcState);
          capturedNonce = oidcState.nonce;

          const callbackResponse = await server.inject({
            method: "GET",
            url: `/api/oidc/callback?code=test-code&state=${oidcState.state}`,
          });

          assert.equal(callbackResponse.statusCode, 302);
          assert.equal(callbackResponse.headers.location, postLoginRedirect);
          assert.equal(tokenRequests.length, 2);
          assert.match(tokenRequests[0]?.authorization ?? "", /^Basic /);
          assert.doesNotMatch(tokenRequests[0]?.body ?? "", /client_secret=/);
          assert.equal(tokenRequests[1]?.authorization, null);
          assert.match(tokenRequests[1]?.body ?? "", /client_secret=super-secret/);
        } finally {
          await server.close();
        }
      });
    }
  );
});

test("OIDC callback auth errors redirect back to the app root instead of the callback route", async () => {
  await withOidcEnv(
    {
      OIDC_ISSUER_URL: "https://id.example.com",
      OIDC_CLIENT_ID: "webapp-client",
      CORS_ORIGIN: "",
      OIDC_POST_LOGIN_REDIRECT_URI: "",
    },
    async () => {
      const server = await createServer();

      try {
        const response = await server.inject({
          method: "GET",
          url: "/api/oidc/callback?authError=errors.oidcSignIn",
          headers: {
            host: "app.example.com",
            referer: "http://app.example.com/api/oidc/callback?authError=errors.oidcSignIn",
          },
        });

        assert.equal(response.statusCode, 302);
        assert.equal(response.headers.location, "http://app.example.com/?authError=errors.oidcSignIn");
      } finally {
        await server.close();
      }
    }
  );
});

test("POST /api/setup creates a session and GET /api/session returns the authenticated user", async () => {
  const server = await createServer();

  try {
    const setupResponse = await server.inject({
      method: "POST",
      url: "/api/setup",
      headers: {
        "x-requested-with": "webapp-v2",
      },
      payload: {
        username: "admin",
        password: "supersecret",
      },
    });

    assert.equal(setupResponse.statusCode, 201);
    assert.equal(setupResponse.json().user.username, "admin");

    const sessionCookie = getSessionCookie(setupResponse.headers["set-cookie"]);
    const sessionResponse = await server.inject({
      method: "GET",
      url: "/api/session",
      headers: {
        cookie: sessionCookie,
      },
    });

    assert.equal(sessionResponse.statusCode, 200);
    assert.deepEqual(sessionResponse.json(), {
      user: {
        id: 1,
        username: "admin",
        role: "admin",
        authProvider: "local",
      },
    });
  } finally {
    await server.close();
  }
});

test("POST /api/logout clears the session when called with CSRF header and JSON payload", async () => {
  const server = await createServer();

  try {
    const setupResponse = await server.inject({
      method: "POST",
      url: "/api/setup",
      headers: {
        "x-requested-with": "webapp-v2",
      },
      payload: {
        username: "admin",
        password: "supersecret",
      },
    });

    assert.equal(setupResponse.statusCode, 201);
    const sessionCookie = getSessionCookie(setupResponse.headers["set-cookie"]);

    const logoutResponse = await server.inject({
      method: "POST",
      url: "/api/logout",
      headers: {
        "x-requested-with": "webapp-v2",
        cookie: sessionCookie,
        "content-type": "application/json",
      },
      payload: {},
    });

    assert.equal(logoutResponse.statusCode, 204);

    const sessionResponse = await server.inject({
      method: "GET",
      url: "/api/session",
      headers: {
        cookie: sessionCookie,
      },
    });

    assert.equal(sessionResponse.statusCode, 401);
  } finally {
    await server.close();
  }
});

test("GET /api/apps requires authentication", async () => {
  const server = await createServer();

  try {
    const response = await server.inject({
      method: "GET",
      url: "/api/apps",
    });

    assert.equal(response.statusCode, 401);
    assert.deepEqual(response.json(), { message: "errors.authRequired" });
  } finally {
    await server.close();
  }
});

test("GET /api/apps/:id/embed-check follows auth redirects through to the final app URL", async () => {
  const server = await createServer();

  try {
    const sessionCookie = await createAuthenticatedAdminSession(server);
    const appUrl = "https://service.example.com/app";
    const loginUrl = "https://sso.example.com/login?client_id=webapp&redirect_uri=https%3A%2F%2Fservice.example.com%2Fapp%2Fcallback";
    const finalUrl = "https://service.example.com/app/home";
    const app = await createIframeApp(server, sessionCookie, appUrl);

    const mockFetch: typeof fetch = async (input) => {
      const url = String(input);

      if (url === appUrl) {
        return new Response(null, {
          status: 302,
          headers: { location: loginUrl },
        });
      }

      if (url === loginUrl) {
        return new Response(null, {
          status: 302,
          headers: { location: finalUrl },
        });
      }

      if (url === finalUrl) {
        return new Response("<html>ok</html>", {
          status: 200,
          headers: { "content-type": "text/html" },
        });
      }

      assert.fail(`Unexpected fetch to ${url}`);
    };

    await withPatchedFetch(mockFetch, async () => {
      const response = await server.inject({
        method: "GET",
        url: `/api/apps/${app.id}/embed-check`,
        headers: {
          cookie: sessionCookie,
          origin: "http://localhost:5173",
        },
      });

      assert.equal(response.statusCode, 200);
      assert.deepEqual(response.json(), {
        embeddable: true,
        openExternally: false,
        checkedAt: response.json().checkedAt,
        reason: "ok",
        externalUrl: null,
      });
      assert.match(response.json().checkedAt, /^\d{4}-\d{2}-\d{2}T/);
    });
  } finally {
    await server.close();
  }
});

test("GET /api/apps/:id/embed-check returns auth_redirect when the final response is still the login page", async () => {
  const server = await createServer();

  try {
    const sessionCookie = await createAuthenticatedAdminSession(server);
    const appUrl = "https://service.example.com/app";
    const loginUrl = "https://sso.example.com/login?client_id=webapp&redirect_uri=https%3A%2F%2Fservice.example.com%2Fapp%2Fcallback";
    const app = await createIframeApp(server, sessionCookie, appUrl);

    const mockFetch: typeof fetch = async (input) => {
      const url = String(input);

      if (url === appUrl) {
        return new Response(null, {
          status: 302,
          headers: { location: loginUrl },
        });
      }

      if (url === loginUrl) {
        return new Response("<html>login</html>", {
          status: 200,
          headers: { "content-type": "text/html" },
        });
      }

      assert.fail(`Unexpected fetch to ${url}`);
    };

    await withPatchedFetch(mockFetch, async () => {
      const response = await server.inject({
        method: "GET",
        url: `/api/apps/${app.id}/embed-check`,
        headers: {
          cookie: sessionCookie,
          origin: "http://localhost:5173",
        },
      });

      assert.equal(response.statusCode, 200);
      assert.deepEqual(response.json(), {
        embeddable: false,
        openExternally: true,
        checkedAt: response.json().checkedAt,
        reason: "auth_redirect",
        externalUrl: loginUrl,
      });
      assert.match(response.json().checkedAt, /^\d{4}-\d{2}-\d{2}T/);
    });
  } finally {
    await server.close();
  }
});

test("GET /api/apps/:id/embed-check keeps auth_redirect when the auth page blocks framing", async () => {
  const server = await createServer();

  try {
    const sessionCookie = await createAuthenticatedAdminSession(server);
    const appUrl = "https://service.example.com/app";
    const loginUrl = "https://auth.example.com/login?client_id=webapp&redirect_uri=https%3A%2F%2Fservice.example.com%2Fapp";
    const app = await createIframeApp(server, sessionCookie, appUrl);

    const mockFetch: typeof fetch = async (input) => {
      const url = String(input);

      if (url === appUrl) {
        return new Response(null, {
          status: 302,
          headers: { location: loginUrl },
        });
      }

      if (url === loginUrl) {
        return new Response("<html>login</html>", {
          status: 200,
          headers: {
            "content-type": "text/html",
            "x-frame-options": "DENY",
          },
        });
      }

      assert.fail(`Unexpected fetch to ${url}`);
    };

    await withPatchedFetch(mockFetch, async () => {
      const response = await server.inject({
        method: "GET",
        url: `/api/apps/${app.id}/embed-check`,
        headers: {
          cookie: sessionCookie,
          origin: "http://localhost:5173",
        },
      });

      assert.equal(response.statusCode, 200);
      assert.deepEqual(response.json(), {
        embeddable: false,
        openExternally: true,
        checkedAt: response.json().checkedAt,
        reason: "auth_redirect",
        externalUrl: loginUrl,
      });
      assert.match(response.json().checkedAt, /^\d{4}-\d{2}-\d{2}T/);
    });
  } finally {
    await server.close();
  }
});

test("GET /api/apps/:id/embed-check detects auth redirects from auth subdomains without login-like paths", async () => {
  const server = await createServer();

  try {
    const sessionCookie = await createAuthenticatedAdminSession(server);
    const appUrl = "https://service.example.com/app";
    const loginUrl = "https://auth.example.com/";
    const app = await createIframeApp(server, sessionCookie, appUrl);

    const mockFetch: typeof fetch = async (input) => {
      const url = String(input);

      if (url === appUrl) {
        return new Response(null, {
          status: 302,
          headers: { location: loginUrl },
        });
      }

      if (url === loginUrl) {
        return new Response("<html>login</html>", {
          status: 200,
          headers: { "content-type": "text/html" },
        });
      }

      assert.fail(`Unexpected fetch to ${url}`);
    };

    await withPatchedFetch(mockFetch, async () => {
      const response = await server.inject({
        method: "GET",
        url: `/api/apps/${app.id}/embed-check`,
        headers: {
          cookie: sessionCookie,
          origin: "http://localhost:5173",
        },
      });

      assert.equal(response.statusCode, 200);
      assert.deepEqual(response.json(), {
        embeddable: false,
        openExternally: true,
        checkedAt: response.json().checkedAt,
        reason: "auth_redirect",
        externalUrl: loginUrl,
      });
      assert.match(response.json().checkedAt, /^\d{4}-\d{2}-\d{2}T/);
    });
  } finally {
    await server.close();
  }
});

test("POST /api/groups requires both authentication and the CSRF header", async () => {
  const server = await createServer();

  try {
    const setupResponse = await server.inject({
      method: "POST",
      url: "/api/setup",
      headers: {
        "x-requested-with": "webapp-v2",
      },
      payload: {
        username: "admin",
        password: "supersecret",
      },
    });
    const sessionCookie = getSessionCookie(setupResponse.headers["set-cookie"]);

    const missingHeaderResponse = await server.inject({
      method: "POST",
      url: "/api/groups",
      headers: {
        cookie: sessionCookie,
      },
      payload: {
        name: "Media",
      },
    });
    assert.equal(missingHeaderResponse.statusCode, 403);

    const createGroupResponse = await server.inject({
      method: "POST",
      url: "/api/groups",
      headers: {
        cookie: sessionCookie,
        "x-requested-with": "webapp-v2",
      },
      payload: {
        name: "Media",
      },
    });

    assert.equal(createGroupResponse.statusCode, 201);
    assert.equal(createGroupResponse.json().item.name, "Media");
    assert.equal(createGroupResponse.json().items.length, 1);
  } finally {
    await server.close();
  }
});

test("DELETE /api/apps/:id returns 404 for missing apps", async () => {
  const server = await createServer();

  try {
    const setupResponse = await server.inject({
      method: "POST",
      url: "/api/setup",
      headers: {
        "x-requested-with": "webapp-v2",
      },
      payload: {
        username: "admin",
        password: "supersecret",
      },
    });
    const sessionCookie = getSessionCookie(setupResponse.headers["set-cookie"]);

    const response = await server.inject({
      method: "DELETE",
      url: "/api/apps/9999",
      headers: {
        cookie: sessionCookie,
        "x-requested-with": "webapp-v2",
      },
    });

    assert.equal(response.statusCode, 404);
    assert.deepEqual(response.json(), { message: "errors.invalidApp" });
  } finally {
    await server.close();
  }
});

test("GET /api/user/preferences returns default preferences for a new user", async () => {
  const server = await createServer();

  try {
    const setupResponse = await server.inject({
      method: "POST",
      url: "/api/setup",
      headers: {
        "x-requested-with": "webapp-v2",
      },
      payload: {
        username: "admin",
        password: "supersecret",
      },
    });
    const sessionCookie = getSessionCookie(setupResponse.headers["set-cookie"]);

    const response = await server.inject({
      method: "GET",
      url: "/api/user/preferences",
      headers: {
        cookie: sessionCookie,
      },
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), {
      theme: "auto",
      language: "auto",
      defaultAppId: null,
      accentColor: null,
      sidebarColor: null,
      textColor: null,
      accentColorDark: null,
      sidebarColorDark: null,
      textColorDark: null,
    });
  } finally {
    await server.close();
  }
});

test("PUT /api/user/preferences persists and returns the updated preferences", async () => {
  const server = await createServer();

  try {
    const setupResponse = await server.inject({
      method: "POST",
      url: "/api/setup",
      headers: {
        "x-requested-with": "webapp-v2",
      },
      payload: {
        username: "admin",
        password: "supersecret",
      },
    });
    const sessionCookie = getSessionCookie(setupResponse.headers["set-cookie"]);

    const updateResponse = await server.inject({
      method: "PUT",
      url: "/api/user/preferences",
      headers: {
        cookie: sessionCookie,
        "x-requested-with": "webapp-v2",
      },
      payload: {
        theme: "dark",
        language: "fr",
        accentColor: "#112233",
        sidebarColor: "#445566",
        textColor: "#223344",
        accentColorDark: "#778899",
        sidebarColorDark: "#aabbcc",
        textColorDark: "#ddeeff",
      },
    });

    assert.equal(updateResponse.statusCode, 200);
    assert.deepEqual(updateResponse.json(), {
      theme: "dark",
      language: "fr",
      defaultAppId: null,
      accentColor: "#112233",
      sidebarColor: "#445566",
      textColor: "#223344",
      accentColorDark: "#778899",
      sidebarColorDark: "#aabbcc",
      textColorDark: "#ddeeff",
    });

    const fetchResponse = await server.inject({
      method: "GET",
      url: "/api/user/preferences",
      headers: {
        cookie: sessionCookie,
      },
    });

    assert.equal(fetchResponse.statusCode, 200);
    assert.deepEqual(fetchResponse.json(), updateResponse.json());
  } finally {
    await server.close();
  }
});

test("OIDC login ignores off-origin referers when storing the post-login redirect", async () => {
  const issuer = "https://id.example.com";
  const clientId = "webapp-client";

  await withOidcEnv(
    {
      OIDC_ISSUER_URL: issuer,
      OIDC_CLIENT_ID: clientId,
      CORS_ORIGIN: "",
      OIDC_POST_LOGIN_REDIRECT_URI: "",
    },
    async () => {
      const mockFetch: typeof fetch = async (input) => {
        const url = String(input);

        if (url === `${issuer}/.well-known/openid-configuration`) {
          return new Response(
            JSON.stringify({
              issuer,
              authorization_endpoint: `${issuer}/authorize`,
              token_endpoint: `${issuer}/token`,
              jwks_uri: `${issuer}/jwks`,
            }),
            {
              status: 200,
              headers: { "content-type": "application/json" },
            }
          );
        }

        assert.fail(`Unexpected fetch to ${url}`);
      };

      await withPatchedFetch(mockFetch, async () => {
        const server = await createServer();

        try {
          const response = await server.inject({
            method: "GET",
            url: "/api/oidc/login",
            headers: {
              host: "app.example.com",
              referer: "https://evil.example/phish?step=1",
            },
          });

          assert.equal(response.statusCode, 302);
          const loginRequest = db.prepare("SELECT redirect_to FROM oidc_login_requests LIMIT 1").get() as { redirect_to: string } | undefined;
          assert.ok(loginRequest);
          assert.equal(loginRequest.redirect_to, "http://app.example.com/");
        } finally {
          await server.close();
        }
      });
    }
  );
});

test("GET /api/apps/:id/embed-check returns csp_frame_ancestors when explicit allowed origins exclude the requester", async () => {
  const server = await createServer();

  try {
    const sessionCookie = await createAuthenticatedAdminSession(server);
    const appUrl = "https://service.example.com/app";
    const app = await createIframeApp(server, sessionCookie, appUrl);

    const mockFetch: typeof fetch = async (input) => {
      const url = String(input);

      if (url === appUrl) {
        return new Response("<html>blocked</html>", {
          status: 200,
          headers: {
            "content-type": "text/html",
            "content-security-policy": "default-src 'self'; frame-ancestors https://allowed.example",
          },
        });
      }

      assert.fail(`Unexpected fetch to ${url}`);
    };

    await withPatchedFetch(mockFetch, async () => {
      const response = await server.inject({
        method: "GET",
        url: `/api/apps/${app.id}/embed-check`,
        headers: {
          cookie: sessionCookie,
          origin: "https://webapp.example",
        },
      });

      assert.equal(response.statusCode, 200);
      assert.deepEqual(response.json(), {
        embeddable: false,
        openExternally: true,
        checkedAt: response.json().checkedAt,
        reason: "csp_frame_ancestors",
        externalUrl: appUrl,
      });
    });
  } finally {
    await server.close();
  }
});

test("POST /api/apps/reorder rejects unknown group ids instead of surfacing a database error", async () => {
  const server = await createServer();

  try {
    const sessionCookie = await createAuthenticatedAdminSession(server);
    const app = await createIframeApp(server, sessionCookie, "https://service.example.com/app");

    const response = await server.inject({
      method: "POST",
      url: "/api/apps/reorder",
      headers: {
        cookie: sessionCookie,
        "x-requested-with": "webapp-v2",
      },
      payload: {
        items: [
          {
            id: app.id,
            groupId: 9999,
          },
        ],
      },
    });

    assert.equal(response.statusCode, 400);
    assert.deepEqual(response.json(), { message: "errors.invalidGroup" });
  } finally {
    await server.close();
  }
});

test("PUT /api/user/preferences rejects unknown default app ids instead of surfacing a database error", async () => {
  const server = await createServer();

  try {
    const sessionCookie = await createAuthenticatedAdminSession(server);

    const response = await server.inject({
      method: "PUT",
      url: "/api/user/preferences",
      headers: {
        cookie: sessionCookie,
        "x-requested-with": "webapp-v2",
      },
      payload: {
        defaultAppId: 9999,
      },
    });

    assert.equal(response.statusCode, 400);
    assert.deepEqual(response.json(), { message: "errors.invalidApp" });
  } finally {
    await server.close();
  }
});
