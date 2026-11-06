# Grenier Pro — guide d'administration

## Architecture
Un seul processus Node.js (aucune dépendance à installer) : serveur HTTP + API JSON + interface web Angular précompilée
(`app/public`) + base **SQLite** (`data/grenier.db`, intégrée à Node). Aucun service externe, aucune connexion internet requise.

```
Grenier-Pro/
├── node/            Node.js pour Windows (node.exe)
├── app/
│   ├── server/      API, règles métier, base de données, outil d'administration
│   ├── public/      interface web (compilée)
│   ├── vendor/      générateur de QR code
│   └── tests/       30 tests automatiques de l'API
├── reglages.json    port, accès réseau, dossier des données (modifiable au Bloc-notes)
├── build/           fabrication (et signature) de l'installateur Windows
├── hebergement/     Docker + HTTPS pour héberger Grenier (sans installation chez le client)
├── data/            vos données (créé au premier lancement) + data/sauvegardes/
├── source/frontend/ code source de l'interface (Angular 18) pour la personnaliser
└── docs/
```

## Modes de fonctionnement
| Variable | Valeur | Effet |
|---|---|---|
| `GRENIER_MODE` | `local` (défaut) | Installation chez un client : l'inscription n'est possible qu'une fois (création de l'entreprise), l'abonnement est « actif » sans limite de temps. |
| | `saas` | Service hébergé par vous : inscription libre, **essai de 30 jours** puis lecture seule tant que vous n'activez pas l'abonnement. |
| `PORT` | 3000 | Port d'écoute. |
| `HOST` | 0.0.0.0 | Mettre `127.0.0.1` pour n'autoriser que l'ordinateur local. |
| `GRENIER_DATA` | `./data` | Dossier des données. |

## Réglages (`reglages.json`) et priorités
```json
{ "port": 3000, "reseau": true, "dossier_donnees": "" }
```
Ordre de priorité : options du programme > variables d'environnement (`PORT`, `HOST`, `GRENIER_DATA`, `GRENIER_MODE`) > `reglages.json` > valeurs par défaut.
`"reseau": false` limite l'accès à l'ordinateur local. Un fichier invalide est signalé et les valeurs par défaut s'appliquent.
Si le port est déjà pris, Grenier l'indique (il est probablement déjà ouvert) et ouvre le navigateur sur l'instance existante.

## Application installable (PWA)
L'interface est installable depuis Chrome/Edge/Android/iPhone (manifeste + service worker + icônes). **Seule la coque** de l'application est mise en cache :
les données viennent toujours du serveur (pas de mode hors ligne des données, voir la feuille de route). Combinée à l'hébergement
(`hebergement/`), elle permet un usage **sans aucun fichier à télécharger** — donc sans avertissement Windows.

## Avertissement « Windows a protégé votre ordinateur »
Voir `docs/AVERTISSEMENT-WINDOWS.md` : ce qui le provoque, ce que Microsoft dit de la signature, et les solutions (hébergement, installation sur place, signature, Store).
Fabriquer/signer l'installateur : `./build/construire-installeur.sh` (variables `CERT_PFX`, `CERT_PASS`, `TIMESTAMP_URL`).

## Outil d'administration (`app/server/admin.js`)
À lancer avec `node\node.exe app\server\admin.js <commande>` (Linux/Mac : `node app/server/admin.js …`), de préférence **Grenier arrêté** :
```
liste                                        entreprises, offres, utilisateurs
mot-de-passe <email> <nouveau>               réinitialiser un mot de passe (8 caractères minimum)
offre <entreprise> <starter|pro|cooperative> changer d'offre (l'entreprise = identifiant ou « slug »)
statut <entreprise> <active|trial|suspended> [AAAA-MM-JJ]   activer jusqu'à une date, ou suspendre
```
Offres : **Starter** (3 utilisateurs, sans module coopérative), **Pro** (10), **Coopérative** (25).

## Rôles
Propriétaire (tout) · Gérant (tout sauf paramètres et équipe) · Magasinier (stock, production, livraisons) ·
Comptable (clients, factures, encaissements, paiements aux membres) · Agent coopérative (membres, livraisons, paiements).
Le serveur applique ces droits, pas seulement l'interface.

## Codes d'article et numéros de lot
Le **code de l'article** (Stock > Nouvel article) est le début du numéro de lot : `CODE-AAMMJJ-NNN`. Il peut faire **jusqu'à 30 caractères**
(lettres, chiffres, tirets), par exemple `BEURRE-KARITE-250G` → lot `BEURRE-KARITE-250G-261011-001`. Les accents et espaces sont convertis
automatiquement ; laissé vide, un code court de 3 lettres est généré à partir du nom. Modifier le code d'un article ne change pas les lots
déjà créés (ils gardent leur numéro) ; les nouveaux lots prennent le nouveau code. Sur l'étiquette, les longs codes se réduisent et passent à la ligne.

## Règles métier garanties (testées)
- Stock tenu par **lot** ; production en **FIFO** (lots les plus anciens d'abord) ; ventes en **FEFO** (date limite la plus proche), **jamais un lot périmé**.
- Stock insuffisant : refus et **aucune** écriture partielle (transactions).
- Factures numérotées sans trou (`FAC-AAAA-NNNN`), reçus `REC-NNNN`, paiement ≤ reste dû, annulation qui remet le stock en place.
- Page publique du QR : produit, lot, dates, villages d'origine — **jamais** de noms de producteurs ou de clients, ni de prix.
- Isolation stricte entre entreprises (mode `saas`).

## Sécurité
- Mots de passe hachés (scrypt), jetons de session aléatoires stockés hachés et **expirant après 30 jours**, limitation des tentatives de connexion (derrière un proxy, définir `TRUST_PROXY=1`).
- **Réseau local** : suffisant pour un bureau. **Accès depuis internet** : ne l'exposez pas tel quel ; placez-le derrière un serveur HTTPS (Caddy, nginx) et un pare-feu.
- Les données ne sont pas chiffrées sur le disque : protégez l'ordinateur (mot de passe Windows, antivirus, chiffrement du disque si besoin).
- Sauvegardes : automatiques chaque jour (30 gardées) + téléchargement manuel ; testez une restauration de temps en temps.

## Limites connues
- Une seule machine fait tourner la base : adapté à une PME ou une coopérative (milliers de factures). Au-delà, prévoir une base serveur.
- Pas encore : mode hors ligne sur téléphone, paiement mobile money automatique, envoi de SMS, facturation électronique certifiée (à vérifier auprès de l'administration fiscale selon le client), journal d'audit détaillé.
- Un seul fuseau et une seule devise (FCFA).

## Tests et développement
```bash
cd app && node --test tests/api.test.js          # 30 tests (Node 22.13+)
cd source/frontend && npm install && npm run build   # reconstruire l'interface ; copier dist/web/browser/* dans app/public/
```
Le proxy de développement (`npm start`) redirige `/api` vers `localhost:3000`.

## Ce qui a été vérifié, et ce qui ne l'a pas été
- Vérifié : les 30 tests de l'API ; l'installation comme application dans un vrai navigateur (service worker, manifeste, démarrage sans serveur) ; la chaîne de signature (avec un certificat d'essai) ; un parcours complet dans un vrai navigateur (connexion, production, étiquette QR, facture, livraison, paiement, sauvegarde, page publique, déconnexion) sans aucune erreur ; le premier lancement sur installation vierge ; l'outil d'administration.
- **Non vérifié sur un vrai Windows** : l'installateur, les fichiers `.bat` et `node.exe` (le code est identique à celui testé sous Linux, mais je n'ai pas pu lancer Windows). Faites un essai sur un PC Windows avant de livrer un client.
