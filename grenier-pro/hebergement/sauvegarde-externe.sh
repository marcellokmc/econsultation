#!/bin/sh
# Copie la sauvegarde du jour HORS du serveur (à lancer chaque nuit par cron, après avoir configuré rclone).
#   crontab -e  →  30 2 * * * /chemin/grenier-pro/hebergement/sauvegarde-externe.sh
# Grenier fait déjà une sauvegarde quotidienne dans son volume (30 jours conservés) ; ce script l'envoie ailleurs
# (stockage objet, Google Drive…) pour survivre à la perte du serveur. Destination : variable DEST (ex. « distant:grenier »).
set -eu
DEST="${DEST:-distant:grenier-sauvegardes}"
cd "$(dirname "$0")"
TMP="$(mktemp -d)"
trap 'rm -r -- "$TMP"' EXIT
docker compose cp grenier:/data/sauvegardes/. "$TMP/"
rclone copy "$TMP" "$DEST" --max-age 48h
echo "Sauvegardes copiées vers $DEST"
