# Mise en service — Grenier Pro 1.1

Ce document explique comment mettre Grenier en service : chez un client (installation Windows), en ligne
(serveur hébergé), et comment activer les briques ajoutées en 1.1 (collecte terrain, contrôle, SMS,
QR vérifiables, licences).

## 1. Ce qui est livré

| Brique | Rôle | État |
|---|---|---|
| **Grenier Unité** | Stock par lot, production, ventes, coopérative (version 1.0) | En service, défauts corrigés (§ 9) |
| **Grenier Terrain** (`/terrain/`) | Saisie des livraisons sur téléphone, **sans connexion**, envoi automatique au retour du réseau | Fait, testé dans un navigateur mobile |
| **Grenier Contrôle** (`/controle/`) | Annulations motivées, avances aux membres, journal des actions, SMS, registre, licence | Fait, testé |
| **Reçus par SMS** | Le membre reçoit un SMS à chaque livraison, paiement, annulation | Fait ; passerelle « HTTP générique » testée ; Orange **non testé** avec un vrai compte |
| **Grenier Trace** (QR vérifiables) | Page publique « Lot authentique / Code non reconnu », compteur de vérifications | Fait, testé (hébergé et local → registre) |
| **Licences signées** | Essai de 60 jours, puis licence obligatoire (édition installée) | Fait, testé |
| **Hébergement** (`hebergement/`) | Docker + HTTPS automatique (Caddy) | Image construite et démarrée ; HTTPS non testé (il faut un vrai domaine) |
| **Installateur Windows** (`build/`) | `Grenier-Pro-Setup-1.1.0.exe` | Fabriqué ; **pas encore testé sur un vrai PC Windows** |

Tests automatiques : 42 (30 d'origine + 12 nouveaux), tous réussis — `cd app && node --test tests/*.test.js`.

## 2. Avant tout : vos clés de licence

Les licences sont signées avec une **clé privée** que vous seul détenez. L'installateur contient la clé publique
correspondante (`app/server/licence-cle-publique.pem`).

- Rangez `grenier-cle-privee.pem` **hors ligne** (clé USB chiffrée + une copie dans un coffre). Ne la mettez jamais
  dans le dépôt, un e-mail ou un installateur. Celui qui la possède peut émettre des licences.
- Si elle est perdue ou divulguée : `node outils-editeur/licence.js cles <dossier-secret>` crée une nouvelle paire
  (supprimez d'abord l'ancienne clé publique) ; reconstruisez l'installateur et réémettez les licences de vos clients.

Émettre une licence (une ligne de texte à envoyer au client) :

```bash
node outils-editeur/licence.js emettre /chemin/grenier-cle-privee.pem --client "Coopérative Wend-Panga" --offre cooperative --jusqua 2027-12-31
```

`--offre` : `starter`, `pro` ou `cooperative`. Sans `--jusqua`, la licence n'expire pas (licence perpétuelle +
maintenance annuelle). Le client la colle dans **Contrôle → Licence** (ou `Administration` → `admin.js licence fichier.txt`).

> Limite honnête : le code de Grenier est en JavaScript lisible. La licence arrête l'usage non autorisé ordinaire
> (copie chez un autre client, passage à une offre supérieure), pas un informaticien déterminé à modifier le code.
> Le contrat de licence reste votre protection principale.

## 3. Scénario A — installation chez un client (Windows)

1. **Fabriquer l'installateur** (Linux, macOS ou WSL, avec `makensis`, `curl`, `unzip`) :
   ```bash
   ./build/construire-installeur.sh
   ```
   Résultat : `dist/Grenier-Pro-Setup-1.1.0.exe` et son empreinte `.sha256` (à communiquer au client).
   Node.js est téléchargé depuis nodejs.org et son empreinte vérifiée. Pour signer : `CERT_PFX=… CERT_PASS=…`
   (voir `docs/AVERTISSEMENT-WINDOWS.md`).
2. **Installer** sur le poste principal (pas besoin de droits administrateur). Cocher « Démarrer Grenier avec Windows »
   si d'autres postes ou téléphones s'y connectent.
3. **Premier lancement** : créer l'entreprise (compte propriétaire), puis Paramètres (IFU, RCCM, TVA),
   articles, membres. L'essai de 60 jours démarre.
4. **Licence** : émettez-la (§ 2) et collez-la dans Contrôle → Licence.
5. **Équipe** : Paramètres → Équipe (gérant, magasinier, comptable, agent coopérative).
6. **Téléphones des agents** : même Wi-Fi que le poste, ouvrir `http://<adresse affichée>:3000/terrain/`,
   se connecter, « Ajouter à l'écran d'accueil ». Voir la limite du § 8 sur le réseau local.
7. **Sauvegarde externe** : montrer au client Paramètres → Sauvegarde → « Télécharger une sauvegarde » chaque semaine.

**Mise à jour d'un client 1.0** : lancer le nouvel installateur. La base est mise à niveau automatiquement au démarrage
(nouvelles colonnes et tables ajoutées, rien n'est supprimé). Si la 1.0 était installée dans un autre dossier,
la désinstaller d'abord (les données dans Documents ne sont pas touchées). Le client passe en **essai de 60 jours** :
envoyez-lui sa licence.

## 4. Scénario B — serveur hébergé (abonnements, registre Grenier Trace)

Un VPS Linux (2 Go de RAM suffisent pour commencer), un nom de domaine, Docker.

```bash
git clone <ce dépôt> && cd grenier-pro/hebergement
cp .env.exemple .env                     # DOMAINE=grenier.votre-domaine.bf, EMAIL_ADMIN=…
docker compose up -d --build             # HTTPS automatique (Let's Encrypt) dès que le DNS pointe vers le serveur
```

- Inscription libre, **essai de 30 jours**, puis lecture seule jusqu'à activation :
  ```bash
  docker compose exec grenier node server/admin.js statut <entreprise> active 2027-06-30
  docker compose exec grenier node server/admin.js offre <entreprise> cooperative
  ```
- Les QR des clients hébergés pointent directement vers `https://DOMAINE/v/…` (variable `GRENIER_PUBLIC_URL`, réglée par docker-compose).
- **Sauvegardes** : Grenier en fait une par jour dans son volume (30 jours). Copiez-les hors du serveur :
  configurez `rclone`, puis `crontab` → `30 2 * * * DEST=distant:grenier /chemin/hebergement/sauvegarde-externe.sh`.
- Mise à jour : `git pull && docker compose up -d --build` (la base se met à niveau toute seule).

## 5. QR vérifiables pour un client installé (registre Grenier Trace)

Le serveur hébergé du § 4 sert aussi de **registre** pour les installations locales.

1. Sur le serveur : `docker compose exec grenier node server/admin.js registre-creer coop-wend-panga "Coopérative Wend-Panga"`
   → affiche une clé `grt_…` (une seule fois).
2. Chez le client : **Contrôle → Traçabilité en ligne** : adresse `https://DOMAINE` + la clé → « Relier au registre ».
3. Les lots sont publiés automatiquement (toutes les 10 minutes quand internet est là). Seules partent les informations
   publiques : produit, lot, dates, villages d'origine, nombre de producteurs. **Jamais** de noms de producteurs, de clients ni de prix.
4. **Réimprimer** les étiquettes QR des lots en stock (Traçabilité → lot → étiquette) : elles pointent désormais vers
   `https://DOMAINE/v/coop-wend-panga/<lot>/<jeton>`.

Un client qui scanne voit « ✔ Lot authentique » (ou « ⚠ PÉRIMÉ »), ou « ✖ Code non reconnu » pour un faux code.
Un QR photocopié reste lisible (c'est le cas de tous les QR) : le compteur de vérifications signale les copies massives.

## 6. Reçus par SMS

1. Choisir une passerelle SMS (agrégateur local ou Orange SMS API) et ouvrir un compte : nom d'expéditeur, crédit SMS.
2. Configurer `reglages.json` (installation) ou `hebergement/config/reglages.json` (serveur) :
   ```json
   { "sms": { "fournisseur": "http", "url": "https://passerelle.exemple/api/send", "entetes": { "X-Api-Key": "…" }, "expediteur": "COOPWP" } }
   ```
   Le mode `http` envoie `POST {"to": "+226…", "message": "…", "sender": "…"}`. Si votre passerelle attend un autre
   format, l'adaptation tient en quelques lignes dans `app/server/notify.js` (fonction `sendHttp`).
   Pour Orange : `{ "fournisseur": "orange", "client_id": "…", "client_secret": "…", "numero_expediteur": "+226…", "nom_expediteur": "COOPWP" }`
   — **à valider avec un vrai compte avant de le proposer** (non testé).
3. Relancer Grenier, puis **Contrôle → SMS** : cocher « Envoyer un SMS au membre… ». Faire une livraison test vers votre numéro.

Sans passerelle (`"journal"`, par défaut), les messages sont préparés et visibles dans Contrôle → SMS, mais pas envoyés.
Une coupure d'internet ne bloque jamais la saisie : les SMS attendent et partent au retour de la connexion (5 essais).
Les numéros à 8 chiffres reçoivent l'indicatif +226 (modifiable : `"indicatif": "223"` pour le Mali, etc.).

## 7. Mobile money

En 1.1, un paiement Orange Money / Moov Money / Coris Money est **enregistré avec la référence de la transaction**
(obligatoire dans Terrain), et le membre reçoit un SMS avec cette référence. Le **versement automatique** depuis Grenier
nécessite un contrat avec un agrégateur de paiement (clés d'API, frais, conformité) : c'est la prochaine étape (§ 10),
l'architecture (file d'attente, références uniques, journal) est prête pour l'accueillir.

## 8. Limites connues

- **Terrain sur le réseau local** (`http://192.168…`) : sans HTTPS, le téléphone garde les saisies (stockage du navigateur)
  mais **ne peut pas rouvrir la page sans réseau**. Consigne aux agents : ne pas fermer l'onglet pendant la tournée.
  Avec la version hébergée (HTTPS), l'application se rouvre hors ligne (testé).
- **Paiements** : connexion obligatoire (pour ne jamais payer deux fois).
- **Annulation d'une livraison** : impossible si son lot a déjà servi (production, vente, perte) ; enregistrer une perte ou un ajustement.
- **Interface principale** : son code source Angular n'était pas dans l'installateur 1.0.02 ; les nouveautés sont donc dans
  deux pages séparées (Terrain, Contrôle) reliées au menu. Avec le code source (`source/frontend/`), on peut les intégrer
  directement (par exemple le bouton « Annuler » dans l'onglet Coopérative).
- **Installateur Windows** : fabriqué et vérifié (contenu, démarrage de l'application), mais pas encore installé sur un
  vrai PC Windows — à faire avant le premier client (§ 11).
- Une installation locale et le serveur hébergé ne partagent que les lots publiés (traçabilité). Il n'y a pas encore de
  synchronisation complète des données entre les deux.

## 9. Défauts de la 1.0 corrigés

| Défaut | Correction |
|---|---|
| Paiement d'un membre non plafonné, trop-payé invisible au tableau de bord | Plafonné au solde dû ; dépassement = **avance** explicite (propriétaire/gérant), visible (tableau de bord, alertes, Contrôle) |
| Livraisons et paiements impossibles à corriger, pas de journal | Annulation motivée (propriétaire/gérant), conservée ; **journal** de toutes les actions et des connexions refusées |
| Dates futures acceptées | Refusées sur toutes les opérations (1 jour de marge pour le fuseau horaire) |
| QR non vérifiables | Jeton par lot + page de vérification + registre |
| Licence modifiable par le client (`admin.js offre/statut`) | Licence signée (Ed25519) ; dans l'édition installée, c'est elle qui fixe l'offre |
| `Administration.bat` ne transmettait pas le dossier des données à `admin.js` (les commandes agissaient sur une base vide) | Corrigé ; `admin.js` lit les mêmes réglages que le serveur |
| Service worker : la mise en cache pouvait mélanger les pages | Pages autonomes exclues, caches séparés |

## 10. Prochaines étapes de la feuille de route

1. **Pilote** : 2 à 3 coopératives, un mois, suivi chaque semaine.
2. **Versement mobile money automatique** (agrégateur), **USSD** pour consulter son solde sans smartphone.
3. **Synchronisation complète** installation locale ↔ serveur (sauvegarde en ligne, consultation à distance).
4. **Grenier Qualité** : listes HACCP, résultats de laboratoire rattachés au lot.
5. **Grenier Crédit** : récépissés d'entrepôt pour le warrantage, dossier de crédit partagé avec l'accord du client.
6. **Marché et Observatoire**, interface en mooré, dioula et fulfulde, autres pays (devises, TVA).

## 11. Liste de contrôle avant le premier client payant

- [ ] Installer `Grenier-Pro-Setup-1.1.0.exe` sur un vrai PC Windows 10 et 11 : installation, raccourcis, démarrage,
      accès depuis un téléphone (pare-feu), mise à jour par-dessus la 1.0, désinstallation (données conservées).
- [ ] Clé privée de licence rangée hors ligne, avec une copie.
- [ ] Serveur hébergé : domaine, HTTPS, sauvegarde externe testée **avec une restauration**.
- [ ] Passerelle SMS testée avec un vrai numéro (et le coût par SMS connu).
- [ ] Contrat (licence, maintenance, données, réversibilité) relu par un juriste ; formalités de protection des données
      personnelles (CIL) ; vérifier auprès de la DGI l'obligation éventuelle de facture électronique certifiée.
- [ ] Prix confirmés auprès de 5 prospects (voir `OFFRE-COMMERCIALE.md`).
