# Plan de remédiation — WebApp v2

Date: 2026-03-30
Source: code review document provided locally

## Objectif

Corriger la review de façon progressive, vérifiable et sans casser l'existant.

## Constat initial

La review est utile, mais une partie est déjà corrigée dans le dépôt actuel. Avant chaque correction, il faut donc distinguer:

- les points encore ouverts
- les points déjà traités
- les points à requalifier car la review ne reflète plus l'état réel du code

## Points déjà corrigés ou partiellement corrigés

À la date de préparation de ce plan, les éléments suivants semblent déjà couverts dans le code:

- `S1` `hasColumn` utilise maintenant une liste blanche de tables connues dans `apps/api/src/lib/db.ts`
- `S2` une protection CSRF légère existe via le header `X-Requested-With` vérifié dans `apps/api/src/server.ts`
- `S3` un nettoyage périodique des sessions expirées existe dans `apps/api/src/server.ts`
- `S5` le rate limiting est activé globalement dans `apps/api/src/server.ts`
- `F3` le proxy d'icônes n'utilise plus `accessSync`, mais `fs/promises`
- `D2` `.dockerignore` existe
- `D4` `.github/workflows/ci.yml` et `.github/workflows/release.yml` existent
- `P3` `blockDemoWrites` est déjà factorisé dans `apps/api/src/lib/demo-guard.ts`

Ces points devront être revérifiés pendant l'exécution, mais ils ne sont plus prioritaires comme des corrections à implémenter.

## Backlog priorisé

### Lot 1 — Sécurité et robustesse immédiates

1. `S4` sécuriser davantage le proxy SVG
- vérifier le type MIME retourné par l'upstream
- renforcer la validation du contenu SVG si nécessaire
- ajouter des tests ciblés

2. `Q3` fermer les branches d'erreur silencieuses dans les routes
- auditer les retours de repositories
- ajouter un fallback explicite sur les unions d'erreurs
- couvrir les cas non gérés par des tests

3. `W2` ajouter un timeout côté `apiFetch`
- utiliser `AbortSignal.timeout(...)`
- conserver la compatibilité avec un `signal` déjà fourni
- améliorer le message d'erreur côté client
- statut: fait

4. `Q4` améliorer le diagnostic quand le parsing JSON échoue
- ne plus masquer complètement les réponses non JSON
- remonter une erreur exploitable pour le debug
- statut: fait

### Lot 2 — Cohérence architecture API

5. `P2` supprimer les accès directs à `db` dans les routes
- faire passer la logique restante par les repositories
- garder les routes minces et testables

6. `Q2` typer proprement les paramètres Fastify
- remplacer progressivement les casts `request.params as { id: string }`
- commencer par `apps.ts`, `groups.ts`, `auth.ts`, `preferences.ts`, `icons.ts`

7. `F2` optimiser la suppression/réindexation des apps
- remplacer la réindexation complète par une mise à jour ciblée
- vérifier l'impact sur le tri et les groupes

### Lot 3 — Tests manquants

8. `Q5` ajouter des tests d'intégration HTTP
- authentification
- routes apps
- routes groups
- protection CSRF

9. ajouter des tests pour le proxy d'icônes
- slug invalide
- SVG invalide
- contenu dangereux
- cache local

10. ajouter des tests sur les migrations critiques
- création base vide
- migrations incrémentales
- colonnes optionnelles déjà présentes

### Lot 4 — Frontend et maintenabilité

11. `P4` commencer le démantèlement de `App.tsx`
- extraire les handlers volumineux
- isoler la coordination des modales
- limiter le fichier principal à l'orchestration

12. `W1` commencer le découpage de `styles.css`
- découpage par zones fonctionnelles
- conserver le rendu existant
- éviter une refonte visuelle pendant la phase de remédiation

13. `W4` réduire la dispersion de l'état
- regrouper les interactions transverses
- décider ensuite si un store global est vraiment nécessaire

## Ordre d'exécution recommandé

1. sécuriser et fiabiliser les points de runtime
2. remettre l'API en cohérence architecturale
3. poser les tests qui verrouillent les corrections
4. refactorer le frontend sans régression

## Méthode de travail

Pour chaque point traité:

1. confirmer qu'il est toujours ouvert dans le code actuel
2. appliquer une correction minimale et ciblée
3. exécuter les tests concernés
4. mettre à jour ce plan avec le statut

## Premier sprint conseillé

Le meilleur point de départ est:

1. `W2` timeout et erreurs de `apiFetch`
2. `Q3` branches d'erreur silencieuses côté API
3. `S4` durcissement et tests du proxy SVG

Ce trio donne un bon ratio impact/effort et améliore tout de suite la fiabilité perçue.

## Statut

- [x] review relue
- [x] écart review/code actuel vérifié sur les points principaux
- [x] plan de remédiation créé
- [x] lot 1 démarré
- [ ] lot 2 démarré
- [ ] lot 3 démarré
- [ ] lot 4 démarré
