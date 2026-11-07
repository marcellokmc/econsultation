# Mise en service — Grenier Pro 2.0

Ce guide explique comment mettre Grenier en service et activer chaque module. Ordre conseillé :
**§ 2 clés de licence → § 3 serveur en ligne → § 4 installation chez un client → § 5 à 9 modules → § 11 liste de contrôle.**

## 1. Ce qui est livré, et ce qui est vérifié

| Brique | Rôle | Vérification |
|---|---|---|
| **Gestion** (stock par lot, production, ventes, traçabilité, coopérative) | Cœur du logiciel, nouvelle interface | Tests API + parcours navigateur |
| **Terrain** (`/terrain`) | Livraisons saisies sur téléphone sans réseau, envoi automatique au retour | Parcours navigateur (hors ligne, rechargement sans réseau, retour) |
| **Qualité** | Listes HACCP, contrôles, analyses de laboratoire, blocage automatique des lots | Tests + parcours |
| **Crédit** | Récépissés d'entrepôt (warrantage), dossier de crédit imprimable | Tests + parcours |
| **Marché** | Offres de vente, demandes d'achat, contacts, observatoire des prix | Tests + parcours |
| **Mobile money** | Paiement des membres, paie de campagne | Tests + parcours en **simulation** ; agrégateur réel : **à brancher et tester** (§ 7) |
| **USSD** | Solde des membres sans smartphone | Tests (format Africa's Talking) ; passerelle réelle : **à brancher** |
| **Grenier en ligne** | Sauvegarde chiffrée + restauration, consultation à distance, QR vérifiables | Tests (dont restauration complète sur un PC neuf) |
| **SMS** | Reçus aux membres | Passerelle HTTP générique testée ; Orange : **non testé** avec un vrai compte |
| **Licences** | Essai 60 jours, licences signées | Tests |
| **Installateur Windows** | `Grenier-Pro-Setup-2.0.0.exe` | Vérifié **sous Wine** (Windows simulé) avec le vrai `node.exe` : installation silencieuse, 6 raccourcis + Bureau, démarrage, démonstration, tous les écrans, sauvegarde, mise à jour 1.1 → 2.0 avec données conservées, désinstallation (données conservées). **À confirmer sur un vrai PC Windows 10/11** (pare-feu, SmartScreen) |
| **Hébergement** | Docker + HTTPS automatique | Image construite et démarrée ; HTTPS : **à faire avec votre domaine** |
| **Langues** | Mooré, dioula, fulfulde | Chaîne de traduction prête ; **traductions à faire par des locuteurs natifs** (`docs/traduction`) |

Tests : 60 tests de l'API (`cd app && node --test tests/*.test.js`) et un parcours de 28 étapes dans un vrai navigateur
(`node tests-e2e/parcours.cjs`), tous réussis.

## 2. Vos clés de licence

Les licences sont signées avec votre **clé privée** (`grenier-cle-privee.pem`). Rangez-la **hors ligne** avec une copie
de secours ; ne la mettez jamais dans le dépôt, un e-mail ou un installateur. Émettre une licence :

```bash
node outils-editeur/licence.js emettre /chemin/grenier-cle-privee.pem --client "Coopérative Wend-Panga" --offre cooperative --jusqua 2027-12-31
```

Le client la colle dans **Paramètres → Licence**. Sans licence : 60 jours d'essai, puis lecture seule.
Clé perdue ou divulguée : `node outils-editeur/licence.js cles <dossier-secret>` (nouvelle paire), reconstruire
l'installateur, réémettre les licences.

## 3. Le serveur en ligne (indispensable pour les services en ligne)

Un petit serveur Linux (VPS, 2 Go de RAM), un nom de domaine, Docker :

```bash
git clone <ce dépôt> && cd grenier-pro/hebergement
cp .env.exemple .env                     # DOMAINE=grenier.votre-domaine.bf, EMAIL_ADMIN=…
cp config/reglages.exemple.json config/reglages.json   # puis remplir (ou garder {} au départ)
docker compose up -d --build             # HTTPS automatique dès que le DNS pointe vers le serveur
```

Ce serveur sert à la fois :
* d'**édition hébergée** (inscription, 30 jours d'essai, `docker compose exec grenier node server/admin.js statut <entreprise> active 2027-06-30`) ;
* de **Grenier en ligne** pour les installations locales : QR vérifiables, sauvegardes chiffrées, consultation à
  distance, marché, USSD. Pour chaque client installé :
  ```bash
  docker compose exec grenier node server/admin.js registre-creer coop-wend-panga "Coopérative Wend-Panga"
  ```
  → affiche une **clé** `grt_…` (une seule fois) à transmettre au client.
* Sauvegardes du serveur : `hebergement/sauvegarde-externe.sh` chaque nuit (rclone) — **testez une restauration**.

## 4. Installation chez un client (Windows)

1. Fabriquer l'installateur : `./build/construire-installeur.sh` → `dist/Grenier-Pro-Setup-2.0.0.exe` + `.sha256`.
2. Installer sur le poste principal (sans droits administrateur) ; cocher « Démarrer avec Windows » si des téléphones s'y connectent.
3. Premier lancement : créer l'entreprise (ou **« Restaurer mes données depuis Grenier en ligne »** sur un PC de remplacement).
4. Paramètres : entreprise (IFU, RCCM, TVA), **Licence**, **Équipe**.
5. Paramètres → **Grenier en ligne** : adresse `https://grenier.votre-domaine.bf` + clé `grt_…` → « Relier au registre ».
   Puis **activer la sauvegarde en ligne** : un **code de récupération** s'affiche une seule fois → le faire noter
   sur papier par le propriétaire, et le ranger hors du bureau. Choisir le **code d'accès à distance**.
6. Stock → articles avec leur **filière** (karité, sésame…) ; Coopérative → membres avec leur **téléphone**.
7. Téléphones des agents : ouvrir `http://<adresse affichée au démarrage>:3000/terrain`, se connecter, « Ajouter à
   l'écran d'accueil ». Sur le réseau local (http), les saisies hors ligne sont gardées, mais **l'onglet ne doit pas
   être fermé** pendant la tournée ; avec l'édition hébergée (https), l'application se rouvre sans réseau.

Mise à jour d'un client 1.x : lancer le nouvel installateur ; la base est mise à niveau automatiquement au démarrage.

## 5. Qualité
Menu **Qualité**. Trois listes HACCP sont proposées (réception, production, hygiène quotidienne) et modifiables
(Listes de contrôle). Un **point critique** non conforme, ou une **analyse de laboratoire hors limite**, bloque le lot :
il n'est plus vendu ni utilisé, et la page publique du QR indique « retiré de la vente ». Seuls le propriétaire et le
gérant libèrent un lot, avec un motif (journalisé). Former l'équipe à faire le contrôle d'hygiène **chaque jour**.

## 6. SMS aux membres
`reglages.json` → `"sms"` (exemple dans `hebergement/config/reglages.exemple.json`). Le format HTTP générique envoie
`POST {to, message, sender}` ; pour une passerelle différente, adapter `sendHttp` dans `app/server/notify.js`.
Puis Paramètres → SMS → cocher l'envoi. Tester avec votre numéro avant d'activer pour les membres.

## 7. Mobile money
1. Signer avec un **agrégateur de paiement** (paiements sortants vers Orange Money, Moov Money…) : clés d'API, frais,
   compte marchand approvisionné.
2. `reglages.json` → `"paiement": { "fournisseur": "http", "url": …, "entetes": …, "secret_rappel": … }` et
   `adresse_publique` (édition hébergée : `GRENIER_PUBLIC_URL`). Grenier envoie
   `POST { reference, amount, currency: "XOF", phone, operator, callback_url }` et attend le rappel signé
   `POST /api/payments/callback { reference, status, transaction_id }` (en-tête `X-Grenier-Signature` = HMAC-SHA256 du
   corps). Chaque agrégateur ayant son format, prévoir **une petite adaptation** de `sendHttp` et de la lecture du rappel
   dans `app/server/modules/paiements.js`, puis **des essais avec de petits montants**.
3. Le rappel doit pouvoir joindre Grenier depuis internet : en pratique, **édition hébergée** (ou installation locale
   rendue accessible en HTTPS).
4. Pour former les équipes sans argent réel : `"paiement": { "fournisseur": "simulation" }`.

## 8. USSD
Auprès d'une passerelle USSD (opérateur ou agrégateur, format Africa's Talking), demander un **code USSD** et le faire
pointer vers `https://grenier.votre-domaine.bf/api/ussd?cle=<ussd.cle>`. Chaque coopérative active l'USSD dans
Paramètres → Grenier en ligne (les nom, numéro et solde des membres sont alors envoyés au serveur : **prévenir les
membres**). Menu : solde, dernières livraisons, derniers paiements, prix d'achat.

## 9. Crédit, Marché, langues
* **Crédit** : présenter le module aux caisses populaires / IMF de la zone ; le récépissé imprimé porte les signatures
  du magasinier, du déposant et du prêteur ; le dossier de crédit s'imprime en un clic.
* **Marché** : la page publique `https://grenier.votre-domaine.bf/marche` est à diffuser aux acheteurs
  (transformateurs, exportateurs, cantines). Le partage des prix pour l'observatoire est volontaire (Marché → Prix).
* **Langues** : faire traduire `docs/traduction/textes-a-traduire.csv` par des locuteurs natifs (notice dans
  `docs/traduction/LISEZ-MOI.md`), en commençant par le menu et l'écran Terrain.

## 10. Limites connues
* Terrain sur réseau local en http : ne pas fermer l'onglet pendant la tournée (voir § 4.7).
* Synchronisation : sauvegarde, consultation à distance, traçabilité, marché et USSD ; **pas** de saisie simultanée
  d'une même entreprise sur plusieurs installations.
* Facture électronique certifiée : à vérifier auprès de la DGI selon le client ; non incluse.
* Une seule devise (FCFA) et un taux de TVA par entreprise.
* La licence protège contre l'usage non autorisé ordinaire, pas contre un informaticien qui modifierait le code :
  le contrat reste la protection principale.

## 11. Liste de contrôle avant le premier client payant
- [ ] Installer `Grenier-Pro-Setup-2.0.0.exe` sur un vrai Windows 10 et 11 (déjà vérifié sous Wine) : avertissement
      SmartScreen, autorisation du pare-feu, accès depuis un téléphone du même Wi-Fi.
- [ ] Serveur en ligne : domaine, HTTPS, sauvegarde externe **avec une restauration testée**.
- [ ] Sur une installation de test : relier au serveur, activer la sauvegarde en ligne, **restaurer sur un autre PC**.
- [ ] SMS : test réel (coût par SMS connu). Mobile money : contrat + adaptation + essais de petits montants.
- [ ] Contrat (licence, maintenance, données, réversibilité) relu par un juriste ; déclaration à la CIL (données
      personnelles des membres) ; vérification DGI (facture électronique).
- [ ] Traduction de l'écran Terrain dans la langue des agents (au moins).
- [ ] 2 à 3 pilotes d'un mois avec un suivi chaque semaine.
