import { createHash, randomBytes } from "node:crypto";
import type { FastifyRequest } from "fastify";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import {
  createOidcLoginRequest,
  consumeOidcLoginRequest,
  findUserByOidcIdentity,
  hasUsers,
  hashPassword,
  syncOidcUser,
} from "./auth.js";
import type { SessionUser } from "./types.js";

type OidcDiscoveryDocument = {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
};

type OidcTokenResponse = {
  access_token?: string;
  id_token?: string;
  token_type?: string;
};

type OidcRuntimeConfig = {
  issuer: string;
  discoveryUrl: string;
  clientId: string;
  clientSecret: string | null;
  scopes: string;
  providerName: string;
  passwordAuthEnabled: boolean;
  redirectUri: string | null;
  postLoginRedirectUri: string | null;
  usernameClaim: string;
  groupsClaim: string;
  adminGroups: string[];
};

export type OidcBootstrapConfig = {
  enabled: boolean;
  providerName: string;
  loginUrl: string | null;
  passwordAuthEnabled: boolean;
};

function splitHeaderValue(value: string | string[] | undefined) {
  const normalized = Array.isArray(value) ? value[0] : value;
  return normalized?.split(",")[0]?.trim() ?? null;
}

function buildRequestOrigin(request: FastifyRequest) {
  const forwardedHost = splitHeaderValue(request.headers["x-forwarded-host"]);
  const forwardedProto = splitHeaderValue(request.headers["x-forwarded-proto"]);
  const host = forwardedHost ?? request.headers.host ?? "localhost:3001";
  const protocol = forwardedProto ?? request.protocol ?? "http";
  return `${protocol}://${host}`;
}

function readUrl(value: string | undefined | null) {
  if (!value?.trim()) {
    return null;
  }

  return new URL(value).toString();
}

function parseEnvList(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getOidcRuntimeConfig(): OidcRuntimeConfig | null {
  const clientId = process.env.OIDC_CLIENT_ID?.trim();
  const issuer = process.env.OIDC_ISSUER_URL?.trim();
  const discoveryUrl = process.env.OIDC_DISCOVERY_URL?.trim() ?? (issuer ? `${issuer.replace(/\/$/, "")}/.well-known/openid-configuration` : "");

  if (!clientId || !discoveryUrl) {
    return null;
  }

  return {
    issuer: issuer?.replace(/\/$/, "") ?? "",
    discoveryUrl,
    clientId,
    clientSecret: process.env.OIDC_CLIENT_SECRET?.trim() || null,
    scopes: process.env.OIDC_SCOPES?.trim() || "openid profile email groups",
    providerName: process.env.OIDC_PROVIDER_NAME?.trim() || "Pocket ID",
    passwordAuthEnabled: process.env.OIDC_DISABLE_PASSWORD_LOGIN !== "true",
    redirectUri: readUrl(process.env.OIDC_REDIRECT_URI),
    postLoginRedirectUri: readUrl(process.env.OIDC_POST_LOGIN_REDIRECT_URI ?? process.env.WEB_ORIGIN),
    usernameClaim: process.env.OIDC_USERNAME_CLAIM?.trim() || "preferred_username",
    groupsClaim: process.env.OIDC_GROUPS_CLAIM?.trim() || "groups",
    adminGroups: parseEnvList(process.env.OIDC_ADMIN_GROUPS),
  };
}

async function fetchJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`OIDC request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function getOidcDiscovery(config: OidcRuntimeConfig) {
  const discovery = await fetchJson<OidcDiscoveryDocument>(config.discoveryUrl);
  if (!discovery.issuer || !discovery.authorization_endpoint || !discovery.token_endpoint || !discovery.jwks_uri) {
    throw new Error("Incomplete OIDC discovery document.");
  }

  return discovery;
}

function sha256Base64Url(value: string) {
  return createHash("sha256").update(value).digest("base64url");
}

function getPostLoginRedirectUri(request: FastifyRequest, config: OidcRuntimeConfig) {
  if (config.postLoginRedirectUri) {
    return config.postLoginRedirectUri;
  }

  const referer = request.headers.referer;
  if (referer) {
    try {
      return new URL("/", referer).toString();
    } catch {}
  }

  const [firstCorsOrigin] = parseEnvList(process.env.CORS_ORIGIN);
  if (firstCorsOrigin) {
    return new URL("/", firstCorsOrigin).toString();
  }

  return new URL("/", buildRequestOrigin(request)).toString();
}

function getRedirectUri(request: FastifyRequest, config: OidcRuntimeConfig) {
  return config.redirectUri ?? new URL("/api/oidc/callback", buildRequestOrigin(request)).toString();
}

function appendAuthError(redirectTo: string, errorKey: string) {
  const redirectUrl = new URL(redirectTo);
  redirectUrl.searchParams.set("authError", errorKey);
  return redirectUrl.toString();
}

function readStringClaim(payload: JWTPayload, claimName: string) {
  const value = payload[claimName];
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  return null;
}

function readClaimArray(payload: JWTPayload, claimName: string) {
  const value = payload[claimName];
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim());
  }

  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }

  return [];
}

function getUsernameFromClaims(payload: JWTPayload, config: OidcRuntimeConfig) {
  const candidates = [
    readStringClaim(payload, config.usernameClaim),
    readStringClaim(payload, "preferred_username"),
    readStringClaim(payload, "nickname"),
    readStringClaim(payload, "email")?.split("@")[0] ?? null,
    readStringClaim(payload, "name"),
    readStringClaim(payload, "sub") ? `oidc-${readStringClaim(payload, "sub")}` : null,
  ];

  for (const candidate of candidates) {
    const normalized = candidate?.trim().replace(/\s+/g, " ").slice(0, 32) ?? "";
    if (normalized.length >= 3) {
      return normalized;
    }
  }

  return `oidc-${randomBytes(4).toString("hex")}`;
}

function getRoleFromClaims(payload: JWTPayload, config: OidcRuntimeConfig): SessionUser["role"] {
  if (!hasUsers()) {
    return "admin";
  }

  if (config.adminGroups.length === 0) {
    return "viewer";
  }

  const groups = readClaimArray(payload, config.groupsClaim);
  return groups.some((group) => config.adminGroups.includes(group)) ? "admin" : "viewer";
}

export function getOidcBootstrapConfig(): OidcBootstrapConfig {
  const config = getOidcRuntimeConfig();

  return {
    enabled: config !== null,
    providerName: config?.providerName ?? process.env.OIDC_PROVIDER_NAME?.trim() ?? "Pocket ID",
    loginUrl: config ? "/api/oidc/login" : null,
    passwordAuthEnabled: config ? config.passwordAuthEnabled : true,
  };
}

export function getOidcErrorRedirectUri(request: FastifyRequest, errorKey: string) {
  const config = getOidcRuntimeConfig();
  const redirectTo = config ? getPostLoginRedirectUri(request, config) : new URL("/", buildRequestOrigin(request)).toString();
  return appendAuthError(redirectTo, errorKey);
}

export async function createOidcAuthorizationUrl(request: FastifyRequest) {
  const config = getOidcRuntimeConfig();
  if (!config) {
    throw new Error("OIDC is not configured.");
  }

  const discovery = await getOidcDiscovery(config);
  const state = randomBytes(24).toString("base64url");
  const nonce = randomBytes(24).toString("base64url");
  const codeVerifier = randomBytes(48).toString("base64url");

  createOidcLoginRequest(state, codeVerifier, nonce, getPostLoginRedirectUri(request, config));

  const authorizationUrl = new URL(discovery.authorization_endpoint);
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("client_id", config.clientId);
  authorizationUrl.searchParams.set("redirect_uri", getRedirectUri(request, config));
  authorizationUrl.searchParams.set("scope", config.scopes);
  authorizationUrl.searchParams.set("state", state);
  authorizationUrl.searchParams.set("nonce", nonce);
  authorizationUrl.searchParams.set("code_challenge", sha256Base64Url(codeVerifier));
  authorizationUrl.searchParams.set("code_challenge_method", "S256");

  return authorizationUrl.toString();
}

export async function completeOidcLogin(request: FastifyRequest, params: { code: string; state: string }) {
  const config = getOidcRuntimeConfig();
  if (!config) {
    throw new Error("OIDC is not configured.");
  }

  const loginRequest = consumeOidcLoginRequest(params.state);
  if (!loginRequest) {
    throw new Error("Invalid or expired OIDC login state.");
  }

  const discovery = await getOidcDiscovery(config);
  const tokenBody = new URLSearchParams({
    grant_type: "authorization_code",
    code: params.code,
    redirect_uri: getRedirectUri(request, config),
    client_id: config.clientId,
    code_verifier: loginRequest.code_verifier,
  });
  const tokenHeaders = new Headers({
    "content-type": "application/x-www-form-urlencoded",
  });

  if (config.clientSecret) {
    const encodedCredentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");
    tokenHeaders.set("authorization", `Basic ${encodedCredentials}`);
  }

  const tokenResponse = await fetchJson<OidcTokenResponse>(discovery.token_endpoint, {
    method: "POST",
    headers: tokenHeaders,
    body: tokenBody.toString(),
  });

  if (!tokenResponse.id_token) {
    throw new Error("The OIDC provider did not return an id_token.");
  }

  const remoteJwks = createRemoteJWKSet(new URL(discovery.jwks_uri));
  const { payload } = await jwtVerify(tokenResponse.id_token, remoteJwks, {
    issuer: config.issuer || discovery.issuer,
    audience: config.clientId,
  });

  if (payload.nonce !== loginRequest.nonce) {
    throw new Error("OIDC nonce mismatch.");
  }

  const subject = readStringClaim(payload, "sub");
  if (!subject) {
    throw new Error("The OIDC provider did not return a subject.");
  }

  const oidcIssuer = config.issuer || discovery.issuer;
  const existingUser = findUserByOidcIdentity(oidcIssuer, subject);
  const nextRole = getRoleFromClaims(payload, config);
  const user = syncOidcUser({
    oidcIssuer,
    oidcSubject: subject,
    username: getUsernameFromClaims(payload, config),
    role: nextRole,
    syncRole: config.adminGroups.length > 0,
    passwordHash: existingUser ? undefined : await hashPassword(randomBytes(32).toString("hex")),
  });

  return {
    redirectTo: loginRequest.redirect_to,
    user,
  };
}
