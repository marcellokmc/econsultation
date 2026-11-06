# « Windows a protégé votre ordinateur » — comprendre et réduire l'avertissement

## Ce que c'est
C'est **Microsoft Defender SmartScreen**, une vérification de **réputation** faite par Windows. Elle s'affiche pour un programme
récent ou peu téléchargé, **même s'il est sain**. Ce n'est pas un logiciel de Grenier et **aucun logiciel ne peut la désactiver
chez l'utilisateur** : seul Windows (ou l'utilisateur) en décide. Toute astuce qui prétendrait la contourner serait une faille de
sécurité, pas une solution.

## Ce que disent les sources de Microsoft (2026)
- Un installateur **signé** et récent peut encore déclencher l'avertissement tant que le fichier et son certificat n'ont pas acquis assez de réputation.
- Les certificats **EV** ne donnent plus de passe-droit immédiat : ils sont traités comme les certificats **OV** (la réputation se construit par fichier, avec le temps). Inutile de payer plus cher pour un EV.
- Un fichier **non signé** déclenche un avertissement plus sévère, et **Smart App Control** (Windows 11) peut le **bloquer** s'il n'a pas de réputation positive.
- Une application distribuée par le **Microsoft Store** n'affiche **jamais** cet avertissement.

## Les solutions, de la plus efficace à la plus simple

| Solution | Avertissement ? | Effort / coût |
|---|---|---|
| **1. Version hébergée + installation depuis le navigateur** (Chrome/Edge/Android) | **Aucun** : rien à télécharger ni exécuter | Un petit serveur (voir `hebergement/`). Le client ouvre l'adresse puis « Installer Grenier Pro » |
| **2. Vous installez chez le client** (clé USB ou fichier copié sur place) | En général **aucun** : la vérification vise surtout les fichiers *téléchargés d'internet* | Déplacement ou assistance à distance (inclus dans la mise en service) |
| **3. Signer l'installateur + construire la réputation** | Diminue avec le temps et les téléchargements | Certificat OV ou service de signature (voir plus bas), à renouveler |
| **4. Microsoft Store** | **Aucun** | Compte développeur et paquet MSIX (non préparé ici ; à vérifier selon votre pays) |
| **5. Expliquer l'avertissement au client** | Oui, mais compris | Gratuit (déjà dans le guide) |

Recommandation : **1 pour les clients bien connectés, 2 pour les coopératives et unités rurales** (c'est aussi votre argument commercial :
« je viens l'installer et former votre équipe »), puis **3** dès que vous avez plusieurs clients.

## Signer l'installateur (solution 3)
1. Obtenez un certificat de signature de code **OV** (autorité reconnue) ou, si votre pays et votre structure y sont admis, le service Microsoft de signature (« Artifact Signing », ex-Trusted Signing). Vérifiez leurs conditions d'éligibilité.
2. Fabriquez et signez en une commande (testé avec un certificat d'essai) :
   ```bash
   CERT_PFX=/chemin/certificat.pfx CERT_PASS=motdepasse TIMESTAMP_URL=http://timestamp.digicert.com ./build/construire-installeur.sh
   ```
   (Les services de signature en ligne imposent leur propre outil ; adaptez l'étape de signature du script.)
3. **Signez chaque version** avec le **même** certificat et gardez un **nom de fichier stable** : la réputation s'accumule par fichier et par éditeur.
4. Hébergez le fichier toujours à la **même adresse** (HTTPS) et publiez son **empreinte SHA-256** (fichier `SHA256.txt`) : vos clients peuvent vérifier qu'il est authentique (`certutil -hashfile Grenier-Pro-Setup-1.0.0.exe SHA256`).
5. Si l'avertissement persiste malgré une signature valide, soumettez le fichier à l'analyse de Microsoft (portail « Microsoft Security Intelligence », cocher SmartScreen) et conservez le numéro de dossier. Aucun délai n'est garanti.

## Pour vos clients : que dire ?
« Windows affiche cet écran pour tout programme récent. Cliquez sur **Informations complémentaires**, puis **Exécuter quand même**.
Vous pouvez vérifier que le fichier est bien le nôtre avec cette empreinte : … »
