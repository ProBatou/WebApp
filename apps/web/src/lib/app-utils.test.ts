import test from "node:test";
import assert from "node:assert/strict";
import {
  findBestDashboardIconMatch,
  getFallbackIconLabel,
  parseImportedApps,
} from "./app-utils";

test("parseImportedApps parses a plain array payload", () => {
  const result = parseImportedApps(
    JSON.stringify([
      {
        name: "Plex",
        description: "Media",
        url: "https://plex.example.com",
        icon: "plex",
        iconVariantMode: "base",
        iconVariantInverted: true,
        accent: "#123456",
        openMode: "external",
      },
    ])
  );

  assert.deepEqual(result, [
    {
      name: "Plex",
      description: "Media",
      url: "https://plex.example.com",
      icon: "plex",
      iconVariantMode: "base",
      iconVariantInverted: true,
      accent: "#123456",
      openMode: "external",
    },
  ]);
});

test("parseImportedApps supports object payloads with items and defaults invalid optional fields", () => {
  const result = parseImportedApps(
    JSON.stringify({
      items: [
        {
          name: "Grafana",
          url: "https://grafana.example.com",
          accent: "not-a-color",
          iconVariantMode: "invalid",
          iconVariantInverted: "nope",
          openMode: "invalid",
        },
      ],
    })
  );

  assert.deepEqual(result, [
    {
      name: "Grafana",
      description: "",
      url: "https://grafana.example.com",
      icon: "G",
      iconVariantMode: "auto",
      iconVariantInverted: false,
      accent: "#cf5c36",
      openMode: "iframe",
    },
  ]);
});

test("parseImportedApps rejects non-http protocols", () => {
  assert.throws(
    () =>
      parseImportedApps(
        JSON.stringify([
          {
            name: "Unsafe",
            url: "javascript:alert('xss')",
          },
        ])
      ),
    /Entree 1: URL invalide\./
  );
});

test("parseImportedApps rejects invalid icons", () => {
  assert.throws(
    () =>
      parseImportedApps(
        JSON.stringify([
          {
            name: "Valid Name",
            url: "https://example.com",
            icon: "bad/icon",
          },
        ])
      ),
    /Entree 1: icone invalide\./
  );
});

test("findBestDashboardIconMatch prefers exact then prefix then compact matches", () => {
  const icons = ["proxmox", "home-assistant", "next-cloud", "nextcloud"];

  assert.equal(findBestDashboardIconMatch("proxmox", icons), "proxmox");
  assert.equal(findBestDashboardIconMatch("home", icons), "home-assistant");
  assert.equal(findBestDashboardIconMatch("Next Cloud", icons), "next-cloud");
});

test("findBestDashboardIconMatch falls back to contains match", () => {
  const icons = ["paperless-ngx", "homepage", "code-server"];

  assert.equal(findBestDashboardIconMatch("Paper Ngx", icons), "paperless-ngx");
  assert.equal(findBestDashboardIconMatch("Unknown", icons), "");
});

test("getFallbackIconLabel uses explicit custom icons before app initials", () => {
  assert.equal(getFallbackIconLabel("Home Assistant", "ha!"), "HA!");
  assert.equal(getFallbackIconLabel("Home Assistant"), "HA");
  assert.equal(getFallbackIconLabel("  "), "WA");
});
