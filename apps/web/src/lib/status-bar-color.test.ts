import assert from "node:assert/strict";
import test from "node:test";
import { resolveStatusBarColor } from "./status-bar-color";

test("resolveStatusBarColor uses the current shell surface when available", () => {
  assert.equal(
    resolveStatusBarColor({
      themeMode: "dark",
      userShellSurfaceColor: null,
      shellSurfaceColor: "#241d19",
    }),
    "#241d19"
  );
});

test("resolveStatusBarColor prefers the current user shell color when it exists", () => {
  assert.equal(
    resolveStatusBarColor({
      themeMode: "dark",
      userShellSurfaceColor: "#101820",
      shellSurfaceColor: "#241d19",
    }),
    "#101820"
  );
});

test("resolveStatusBarColor falls back to the default light shell color when the surface is empty", () => {
  assert.equal(
    resolveStatusBarColor({
      themeMode: "light",
      userShellSurfaceColor: null,
      shellSurfaceColor: "",
    }),
    "#fff8ee"
  );
});

test("resolveStatusBarColor falls back to the default dark shell color when the surface is empty", () => {
  assert.equal(
    resolveStatusBarColor({
      themeMode: "dark",
      userShellSurfaceColor: null,
      shellSurfaceColor: "   ",
    }),
    "#211b17"
  );
});

test("resolveStatusBarColor ignores unresolved CSS variable tokens", () => {
  assert.equal(
    resolveStatusBarColor({
      themeMode: "light",
      userShellSurfaceColor: null,
      shellSurfaceColor: "var(--color-primary)",
    }),
    "#fff8ee"
  );
});
