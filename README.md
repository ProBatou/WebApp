# WebApp

**One dashboard. Every service.**

[![Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://webapp-latest-mk9k.onrender.com)
[![Docker Pulls](https://img.shields.io/badge/docker-ghcr.io-blue)](https://ghcr.io)
[![Release](https://img.shields.io/badge/release-latest-blue)](#)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue)](./LICENSE)

---

You've got Plex, Nextcloud, Grafana, Home Assistant, Portainer... and you're either maintaining a wall of bookmarks or just memorizing ports. WebApp solves that. It's a self-hosted dashboard that puts every service you run behind a single URL — clean, fast, yours.

> **Try it now:** [webapp-latest-mk9k.onrender.com](https://webapp-latest-mk9k.onrender.com) — login `demo` / `demo`
> *(The demo is read-only. The server may take ~30s to wake up from idle.)*

---

## What you get

**Organization**
- Group services into collapsible categories
- Drag and drop to reorder everything
- Compact sidebar mode to reclaim screen space

**Flexibility**
- Embed any service in an inline iframe, or pop it out in a new tab
- Refresh a single app without reloading the page
- Export your full configuration as JSON — import it anywhere

**Personalization**
- Light and dark themes with custom accent colors
- Interface available in English, French, German and Spanish

**Multi-user**
- Invite users via expiring tokens
- Two roles: `admin` (full access) and `viewer` (read-only)
- Session-based auth with HTTP-only cookies — no JWT floating in localStorage

---

## Get started

### Docker

```bash
docker run -d \
  --name webapp \
  -p 3004:3004 \
  -v ./data:/app/data \
  ghcr.io/example-org/webapp:latest
```

Open `http://localhost:3004`, create your account, and start adding services.

### Docker Compose

```yaml
services:
  webapp:
    image: ghcr.io/example-org/webapp:latest
    container_name: webapp
    ports:
      - "3004:3004"
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

### Cosmos

A `cosmos-service.json` is included for one-click deployment. Data is stored in a named Docker volume (`webapp-data`).

---

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3004` | Listening port |
| `DATABASE_PATH` | `/app/data/webapp.db` | SQLite file location |
| `NODE_ENV` | `production` | Node environment |

---

## Develop locally

```bash
git clone https://github.com/example-org/webapp.git
cd WebApp
npm install
npm run dev
```

| | URL |
|--|-----|
| Frontend | `http://localhost:5173` |
| API | `http://localhost:3001` |

---

## Tech

| | |
|--|--|
| Frontend | React 19, Vite 6, TypeScript |
| Backend | Fastify 5, TypeScript |
| Database | SQLite (better-sqlite3) |
| Auth | Server sessions, HTTP-only cookies |
| Validation | Zod |
| Drag & drop | dnd-kit |
| Deployment | Docker, GitHub Actions, GHCR |

Multi-platform images: `linux/amd64` and `linux/arm64` (Raspberry Pi, NAS, Apple Silicon).

---

## Contributing

Issues and PRs are welcome.

## License

[Apache 2.0](./LICENSE)
