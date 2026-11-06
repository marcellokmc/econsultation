#!/bin/sh
# Fabrique dist/Grenier-Pro-Setup-<version>.exe (Linux, macOS ou WSL ; nécessite makensis et curl).
#   ./build/construire-installeur.sh
# Variables facultatives :
#   NODE_EXE=/chemin/node.exe    utiliser un node.exe déjà téléchargé (sinon : téléchargé depuis nodejs.org et vérifié)
#   CERT_PFX, CERT_PASS          signer l'installateur (osslsigncode) ; TIMESTAMP_URL (défaut : http://timestamp.digicert.com)
set -eu
cd "$(dirname "$0")/.."
VERSION="$(node -p "require('./app/package.json').version")"
NODE_VERSION="22.23.3"
STAGE="dist/stage"
[ -f app/server/licence-cle-publique.pem ] || { echo "Clé publique de licence absente : lancez d'abord  node outils-editeur/licence.js cles <dossier-secret>"; exit 1; }
mkdir -p dist
[ -d "$STAGE" ] && rm -r -- "$STAGE"
mkdir -p "$STAGE/node"

if [ -n "${NODE_EXE:-}" ]; then
  cp "$NODE_EXE" "$STAGE/node/node.exe"
else
  CACHE="dist/node-v$NODE_VERSION-win-x64.zip"
  if [ ! -f "$CACHE" ]; then
    curl -fsSL -o "$CACHE" "https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-win-x64.zip"
  fi
  EXPECTED="$(curl -fsSL "https://nodejs.org/dist/v$NODE_VERSION/SHASUMS256.txt" | grep " node-v$NODE_VERSION-win-x64.zip\$" | cut -d' ' -f1)"
  ACTUAL="$( (sha256sum "$CACHE" 2>/dev/null || shasum -a 256 "$CACHE") | cut -d' ' -f1)"
  [ "$EXPECTED" = "$ACTUAL" ] || { echo "Empreinte SHA-256 de Node.js incorrecte : téléchargement refusé."; rm -- "$CACHE"; exit 1; }
  unzip -q -j -o "$CACHE" "node-v$NODE_VERSION-win-x64/node.exe" -d "$STAGE/node"
fi

# application (sans les tests) + documentation + lanceurs Windows (fins de ligne Windows)
mkdir -p "$STAGE/app"
cp -R app/server app/public app/vendor app/package.json "$STAGE/app/"
cp -R docs "$STAGE/docs"
for f in windows/*.bat LISEZ-MOI.txt; do sed 's/\r*$/\r/' "$f" > "$STAGE/$(basename "$f")"; done
printf '{\r\n  "port": 3000,\r\n  "reseau": true,\r\n  "dossier_donnees": "",\r\n  "adresse_publique": "",\r\n  "sms": { "fournisseur": "journal" }\r\n}\r\n' > "$STAGE/reglages.json"

OUT="dist/Grenier-Pro-Setup-$VERSION.exe"
makensis -V2 -DVERSION="$VERSION" -DSTAGE="$(pwd)/$STAGE" -DOUTFILE="$(pwd)/$OUT" build/grenier.nsi

if [ -n "${CERT_PFX:-}" ]; then
  osslsigncode sign -pkcs12 "$CERT_PFX" -pass "${CERT_PASS:-}" -n "Grenier Pro" -t "${TIMESTAMP_URL:-http://timestamp.digicert.com}" -in "$OUT" -out "$OUT.signe"
  mv "$OUT.signe" "$OUT"
fi
( sha256sum "$OUT" 2>/dev/null || shasum -a 256 "$OUT" ) | tee "$OUT.sha256"
echo "Installateur : $OUT"
