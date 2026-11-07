# Traduire Grenier en mooré, dioula ou fulfulde

Le fichier `textes-a-traduire.csv` contient **tous les textes de l'interface** (environ 800), un par ligne :
colonne `francais`, puis une colonne par langue (`moore`, `dioula`, `fulfulde`).

1. Ouvrez le fichier dans Excel ou LibreOffice Calc (séparateur : point-virgule, encodage UTF-8).
2. Remplissez la colonne de votre langue. Laissez vide ce que vous ne traduisez pas : le français s'affichera.
3. **Gardez tels quels** les éléments entre accolades — `{n}`, `{m}`, `{d}`, `{name}`… — ils sont remplacés par des
   nombres, montants, dates ou noms. Une ligne dont les accolades diffèrent du français est refusée à l'import.
4. Commencez par ce que les agents et les membres voient le plus : le menu (Accueil, Stock, Coopérative, Terrain…),
   l'écran **Terrain** (livraison, membre, quantité, qualité, en attente…) et les reçus.
5. Enregistrez au format CSV et renvoyez le fichier.

Import (développeur) :
```bash
cd web && node scripts/textes.mjs importer chemin/vers/le-fichier.csv && npm run build
```
La langue apparaît dans le menu (bas de la barre latérale) dès qu'elle contient au moins une traduction.
Pour regénérer le tableau après une évolution de l'interface : `node scripts/textes.mjs exporter`
(les traductions existantes sont conservées).

Conseil : faites relire chaque langue par une deuxième personne et testez l'écran Terrain sur un téléphone
avec un agent de collecte avant de diffuser.
