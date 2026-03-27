# WebApp V2

WebApp est un agregateur d'applications web. Cette branche `v2` remplace l'ancienne implementation PHP/JavaScript par un monorepo TypeScript avec un frontend React/Vite et une API Fastify.

## Stack

- Frontend: React + Vite + TypeScript
- Backend: Fastify + TypeScript
- Base de donnees: SQLite
- Organisation: npm workspaces

## Prerequis

- Node.js >= 20
- npm

## Installation

```bash
git clone <url-du-repo>
cd WebApp
npm install
npm run build
```

## Developpement

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- API: `http://localhost:3001`

## Structure

```text
apps/
  api/
  web/
package.json
package-lock.json
tsconfig.base.json
docker-compose.yml
start.sh
cosmos-service.json
```

## Docker

Le projet peut etre demarre avec le `docker-compose.yml` fourni, prevu pour monter l'application dans `/app` et exposer le service sur le port `3004`.

```bash
docker compose up -d
```

Le conteneur lance `start.sh`, installe les dependances si necessaire, build le frontend, build l'API puis demarre le serveur Fastify en servant aussi les fichiers statiques du frontend.

## Version legacy PHP

L'ancienne version PHP reste accessible via la branche `php-legacy`, creee avant l'integration de la reecriture TypeScript.

## Remarques

- Le build frontend genere `apps/web/dist/`.
- La base SQLite locale est creee automatiquement dans `apps/api/data/`.
- Cette version est destinee a remplacer l'ancienne base PHP tout en conservant l'historique Git dans le depot d'origine.
