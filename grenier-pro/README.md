# Grenier Pro 2.0

Logiciel de gestion pour l'agroalimentaire et les coopératives d'Afrique de l'Ouest : stock par lot, production,
ventes et facturation, **traçabilité par QR code vérifiable**, coopérative (membres, livraisons, paiements, avances),
**qualité HACCP**, **paiements mobile money et USSD**, **warrantage et dossier de crédit**, **marché** et observatoire
des prix, **collecte terrain hors ligne**. Deux éditions : installée chez le client (Windows, sans internet) et hébergée
(abonnements, serveur central pour les services en ligne).

À lire en premier : **[docs/MISE-EN-SERVICE.md](docs/MISE-EN-SERVICE.md)**.

## Organisation du dépôt

| Dossier | Contenu |
|---|---|
| `app/server/` | Serveur Node.js 22 sans dépendance (HTTP, SQLite intégrée) — cœur métier, routes, sécurité |
| `app/server/modules/` | Modules 2.0 : `qualite`, `cloud` (Grenier en ligne), `paiements` (mobile money, USSD), `credit`, `marche` |
| `app/public/` | Interface **compilée** (générée par `web/`, ne pas modifier à la main) |
| `app/tests/` | 60 tests de l'API (`cd app && node --test tests/*.test.js`) |
| `web/` | **Code source de l'interface** : Preact + TypeScript + Vite |
| `tests-e2e/` | Parcours de bout en bout dans un vrai navigateur (Playwright, 28 étapes) |
| `windows/`, `build/` | Lanceurs et fabrication de l'installateur Windows (NSIS) |
| `hebergement/` | Docker + HTTPS automatique (Caddy) pour l'édition hébergée |
| `outils-editeur/` | Émission des licences — **ne jamais livrer aux clients** |
| `docs/` | Mise en service, architecture, administration, offre commerciale, traduction |

## Commandes

```bash
node app/server/index.js --demo --open          # démonstration (owner@grenier.test / password)
cd app && node --test tests/*.test.js           # tests de l'API
node tests-e2e/parcours.cjs                     # parcours navigateur (Playwright installé)
cd web && npm install && npm run build          # recompiler l'interface vers app/public
cd web && npm run dev                           # développement de l'interface (serveur sur :3000)
./build/construire-installeur.sh                # installateur Windows
cd hebergement && docker compose up -d --build  # édition hébergée
```

Architecture détaillée : [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
