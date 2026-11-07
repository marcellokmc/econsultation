# Vidéo promotionnelle de Grenier Pro

Montage animé à partir de **vraies captures du logiciel** (données de démonstration fictives).

1. Lancer la démonstration (port 3911, paiement en simulation) et un serveur hébergé (port 3912), puis
   `node seed-marche.mjs` (offres et prix du marché).
2. `node capture.cjs` → captures dans `img/` (copier aussi les polices de `web/node_modules/@fontsource` dans `fonts/`).
3. `node render.cjs horizontal fh 30 "Votre contact"` et `node render.cjs vertical fv 30 "Votre contact"` → images.
4. `ffmpeg -framerate 30 -i fh/%05d.jpg -c:v libx264 -crf 18 -pix_fmt yuv420p -movflags +faststart promo-16x9.mp4`

Le paramètre « contact » (numéro, site) s'affiche sur l'image finale.
