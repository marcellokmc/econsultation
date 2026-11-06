# Grenier Pro 1.1

Gestion, traçabilité et coopérative pour l'agroalimentaire — édition installée (Windows, sans internet) et édition hébergée.

| Dossier | Contenu |
|---|---|
| `app/server` | API Node.js 22 + SQLite intégrée (aucune dépendance à installer) |
| `app/public` | Interface Angular précompilée + pages `terrain/` (collecte hors ligne) et `controle/` |
| `app/tests` | 42 tests (`cd app && node --test tests/*.test.js`) |
| `windows/` | Lanceurs `.bat` de l'édition installée |
| `build/` | Fabrication de l'installateur Windows (`./build/construire-installeur.sh`) |
| `hebergement/` | Docker + HTTPS (Caddy) pour l'édition hébergée et le registre Grenier Trace |
| `outils-editeur/` | Émission des licences (**ne pas livrer aux clients**) |
| `docs/` | `MISE-EN-SERVICE.md` (à lire en premier), guide d'administration, offre commerciale |

Démarrer en développement : `node app/server/index.js --demo --open` (connexion `owner@grenier.test` / `password`).
