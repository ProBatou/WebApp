#!/bin/sh
set -eu

APP_DIR="/app"

if [ ! -d "$APP_DIR" ]; then
  APP_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
fi

cd "$APP_DIR"

mkdir -p "$APP_DIR/data"

STATE_DIR="$APP_DIR/data/.runtime-state"
mkdir -p "$STATE_DIR"

LOCK_HASH_FILE="$STATE_DIR/package-lock.sha256"
CURRENT_LOCK_HASH="$(sha256sum package-lock.json | awk '{print $1}')"
SAVED_LOCK_HASH="$(cat "$LOCK_HASH_FILE" 2>/dev/null || true)"
HAS_BUILD_TOOLS="true"
HAS_ROLLUP_NATIVE="true"

ROLLUP_NATIVE_PACKAGE="$(node -e 'const { execSync } = require("node:child_process"); let abi = "gnu"; try { const out = execSync("ldd --version 2>&1", { encoding: "utf8" }).toLowerCase(); if (out.includes("musl")) abi = "musl"; } catch {} process.stdout.write(`@rollup/rollup-${process.platform}-${process.arch}-${abi}`);')"

if [ ! -x "$APP_DIR/node_modules/.bin/tsc" ] || [ ! -x "$APP_DIR/node_modules/.bin/vite" ]; then
  HAS_BUILD_TOOLS="false"
fi

if [ ! -d "$APP_DIR/node_modules/$ROLLUP_NATIVE_PACKAGE" ]; then
  HAS_ROLLUP_NATIVE="false"
fi

if [ ! -d "$APP_DIR/node_modules" ] || [ "$CURRENT_LOCK_HASH" != "$SAVED_LOCK_HASH" ] || [ "$HAS_BUILD_TOOLS" != "true" ] || [ "$HAS_ROLLUP_NATIVE" != "true" ]; then
  echo "[webapp-v2] Reinstallation des dependances..."
  rm -rf "$APP_DIR/node_modules" "$APP_DIR/apps/api/node_modules" "$APP_DIR/apps/web/node_modules"
  npm ci --include=dev
  printf '%s' "$CURRENT_LOCK_HASH" > "$LOCK_HASH_FILE"
else
  echo "[webapp-v2] Dependances reusees depuis le cache."
fi

echo "[webapp-v2] Build frontend..."
npm run build --workspace apps/web
echo "[webapp-v2] Build API..."
npm run build --workspace apps/api

echo "[webapp-v2] Demarrage serveur..."
exec npm run start --workspace apps/api