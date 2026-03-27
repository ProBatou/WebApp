# WebApp V2

WebApp V2 est un portail personnel pour centraliser ses applications web dans une interface unique.
Le projet remplace l'ancienne version PHP/JavaScript par un monorepo TypeScript compose d'un frontend React/Vite et d'une API Fastify.

![Apercu WebApp V2](./docs/webapp-v2-preview.png)

## Fonctionnalites

- authentification par session HTTP-only
- ouverture des applications en iframe ou dans un onglet externe
- reorganisation par glisser-deposer
- import et export JSON
- stockage local avec SQLite
- deploiement simple en local, via Docker ou dans un environnement homelab

## Stack technique

- frontend : React 19 + Vite + TypeScript
- backend : Fastify 5 + TypeScript
- base de donnees : SQLite avec `better-sqlite3`
- validation : Zod
- authentification : cookies HTTP-only + sessions serveur
- monorepo : npm workspaces

## Structure du projet

```text
apps/
  api/   # API Fastify + SQLite
  web/   # Frontend React/Vite
package.json
package-lock.json
tsconfig.base.json
Dockerfile
docker-compose.yml
cosmos-service.json
start.sh
```

## Prerequis

- Node.js 20 ou plus recent
- npm

## Installation locale

```bash
git clone https://github.com/ProBatou/WebApp.git
cd WebApp
npm install
```

## Developpement

Pour lancer le frontend et l'API ensemble :

```bash
npm run dev
```

Services disponibles :

- frontend : `http://localhost:5173`
- API : `http://localhost:3001`
- healthcheck : `http://localhost:3001/api/health`

En developpement, Vite proxy automatiquement les requetes `/api` vers Fastify.

## Build de production

```bash
npm run build
```

Le build du frontend est genere dans `apps/web/dist`.
Si ce build est present, l'API Fastify sert directement l'application web via `@fastify/static`.

Pour lancer l'API en mode production apres compilation :

```bash
npm --workspace apps/api run start
```

Par defaut, le serveur ecoute sur `http://localhost:3001`.
Le port peut etre surcharge avec la variable `PORT`.

## Installation via Docker

L'image Docker embarque l'API Fastify et le frontend statique dans un seul conteneur.
Le point de persistance unique a conserver est `/app/data`, qui contient la base SQLite.

### Demarrage rapide

```bash
docker run -d \
  --name webapp \
  -p 3004:3004 \
  -v ./data:/app/data \
  ghcr.io/probatou/webapp:latest
```

Ensuite, ouvrir `http://localhost:3004`.

### Exemple `docker-compose.yml`

```yaml
services:
  webapp:
    image: ghcr.io/probatou/webapp:latest
    container_name: webapp
    ports:
      - "3004:3004"
    volumes:
      - ./data:/app/data
    restart: unless-stopped
    environment:
      - NODE_ENV=production
```

### Variables d'environnement utiles

- `NODE_ENV=production`
- `PORT=3004`
- `DATABASE_PATH=/app/data/webapp.db`

### Tags d'image

| Tag | Description |
|-----|-------------|
| `latest` | Derniere version stable issue de `main` |
| `v1.0.0` | Version precise |
| `1.0` | Dernier patch de la serie mineure |

### Publication GHCR

L'image est publiee via GitHub Actions sur `ghcr.io/probatou/webapp`.
Apres le premier push, il faut rendre le package public dans GitHub :

`GitHub -> Packages -> webapp -> Package settings -> Change visibility -> Public`

## Donnees et persistance

En local, la base SQLite est creee automatiquement dans `apps/api/data/webapp-v2.db`.

Dans le conteneur Docker, la base est stockee dans :

- `/app/data/webapp.db`

Les fichiers `*.db` sont ignores par Git.

## Verification rapide

- healthcheck API : `/api/health`
- port par defaut en local : `3001`
- port par defaut dans l'image Docker : `3004`

## Preview frontend

Si tu veux seulement verifier le build frontend :

```bash
npm run build --workspace apps/web
npm --workspace apps/web run preview
```

Le service de preview Vite est alors disponible sur `http://localhost:4173`.

## Deploiement Cosmos

Le fichier `cosmos-service.json` est fourni pour un deploiement direct dans Cosmos.

Chemins utilises :

- code : `/cosmos-storage/webapp-v2`
- base SQLite : `/app/data/webapp-v2.db`

## Demo

Une demo publique est disponible ici :

- URL : `https://webapp-34fd.onrender.com`
- utilisateur : `Administrator`
- mot de passe : `Administrator`

Pour tester rapidement le projet en local, la commande la plus simple reste :

```bash
npm install
npm run dev
```

## Version legacy PHP

L'ancienne version reste accessible dans :

- la branche `php-legacy`
- le tag `php-legacy`

## Licence

Ce projet conserve le fichier `LICENSE` du depot d'origine.
