# Architecture de Grenier Pro 2.0

## Vue d'ensemble

```
 Téléphones / postes du bureau (navigateur, application installable)
            │  HTTP (réseau local) ou HTTPS (hébergé)
            ▼
 ┌──────────────────────────────────────────────┐        ┌───────────────────────────────────┐
 │ Grenier — installation locale (Windows)       │ HTTPS  │ Grenier — serveur hébergé (Docker) │
 │ Node.js 22 + SQLite (un seul fichier .db)     │ ─────▶ │ abonnements + « Grenier en ligne » │
 │ interface + API + tâches de fond              │  clé   │ registre QR, sauvegardes chiffrées,│
 └──────────────────────────────────────────────┘ grt_…  │ résumés, marché, USSD, rappels     │
                                                          └───────────────────────────────────┘
```

* **Aucune dépendance serveur** : Node.js 22 (SQLite intégré `node:sqlite`, `crypto`, `zlib`, `fetch`). Le seul code
  tiers côté serveur est le générateur de QR (`app/vendor/qrcode.cjs`).
* **Interface** : Preact + TypeScript compilée par Vite en ~37 Ko de JavaScript compressé (réseaux 2G/3G),
  polices embarquées, application installable (service worker) utilisable hors ligne.

## Serveur (`app/server`)

| Fichier | Rôle |
|---|---|
| `index.js` | Démarrage, HTTP, authentification, droits, lecture seule (licence/abonnement), journal, fichiers statiques, page de vérification `/v/…`, tâches de fond |
| `db.js` | Schéma, migrations additives (colonnes ajoutées si absentes), transactions **réentrantes** |
| `lib.js` | Validation des entrées (messages en français), mots de passe (scrypt), dates |
| `services.js` | Cœur métier : lots (FIFO/FEFO, jamais un lot périmé, bloqué ou gagé), production et coût de revient, factures, coopérative (soldes, avances, annulations), tableau de bord, traçabilité |
| `routes.js` | Routes du cœur ; appelle les modules |
| `modules/*.js` | Chaque module déclare `schema` (tables), `routes(...)`, `jobs(...)` (tâches de fond) |
| `licence.js` | Licences signées Ed25519 (édition installée) |
| `notify.js` | File de SMS (journal, passerelle HTTP, Orange) |
| `registry.js` | Registre de traçabilité (QR vérifiables) |
| `audit.js` | Libellés du journal des actions |
| `admin.js` | Outil en ligne de commande (mots de passe, licence, comptes du registre) |

### Règles métier garanties (testées)
* Stock par lot ; production FIFO ; ventes FEFO ; **jamais** un lot périmé, bloqué par la qualité ou gagé.
* Toute opération est atomique (transaction) ; factures et reçus numérotés sans trou.
* Paiement à un membre ≤ solde dû (sinon avance explicite) ; ordres mobile money réservés jusqu'à confirmation.
* Corrections par annulation motivée (jamais d'effacement) ; journal de toutes les modifications.
* Isolation stricte entre entreprises (édition hébergée).

### Sécurité
Mots de passe scrypt ; jetons de session aléatoires stockés hachés (30 jours) ; limitation des tentatives ;
droits vérifiés côté serveur ; rappels de paiement signés HMAC-SHA256 ; jetons de consultation à distance signés ;
sauvegardes en ligne chiffrées côté client (AES-256-GCM, clé dérivée par scrypt d'un code de récupération) ;
licences Ed25519 ; pages publiques sans données personnelles ni prix. Réseau local : HTTP (à réserver au réseau du
bureau) ; accès internet : uniquement derrière HTTPS (édition hébergée, Caddy).

## Interface (`web/src`)

| Dossier | Rôle |
|---|---|
| `lib/` | `api.ts` (session, requêtes), `router.ts`, `i18n.ts` (traduction, clé = texte français), `format.ts`, `lettres.ts` (montants en lettres), `offline.ts` (IndexedDB), `types.ts` |
| `ui/kit.tsx` | Composants : fenêtres, champs, onglets, icônes, graphiques, notifications |
| `pages/` | Un fichier par écran ; `extensions.tsx` et `settings-extensions.tsx` enregistrent les modules |
| `i18n/` | Dictionnaires mooré, dioula, fulfulde (remplis par `scripts/textes.mjs`) |

Pages publiques (sans connexion) : `/t/…` (traçabilité), `/v/…` (vérification servie par le serveur), `/r/…`
(récépissé), `/marche`, `/distant`. La collecte terrain (`/terrain`) fonctionne sans réseau (file d'attente
IndexedDB, référence unique par saisie : pas de doublon à la synchronisation).

## Tests
* `app/tests/*.test.js` — 60 tests de l'API (règles métier, droits, modules, chiffrement, restauration, rappels…).
* `tests-e2e/parcours.cjs` — 28 étapes dans Chromium (bureau + téléphone), y compris la saisie terrain hors ligne.
