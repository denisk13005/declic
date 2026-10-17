#!/usr/bin/env bash
# Met en ligne le site burnstreak.com sur le VPS.
#
#   VPS=utilisateur@adresse-du-vps bash deploy/website/deploy.sh
#
# 1. Construit le site (dist-website/) à partir de docs/.
# 2. L'envoie sur le VPS dans /var/www/burnstreak/site-new, puis remplace l'ancien site d'un coup
#    (pas de site à moitié copié si l'envoi est coupé). L'ancienne version reste dans site-old.
set -euo pipefail

: "${VPS:?Indique le VPS, ex. VPS=denis@51.68.12.34 bash deploy/website/deploy.sh}"
REMOTE_DIR=/var/www/burnstreak

cd "$(dirname "$0")/../.."
node scripts/website/build.mjs

tar -C dist-website -czf - . | ssh "$VPS" "set -e
  mkdir -p $REMOTE_DIR/site-new
  rm -rf $REMOTE_DIR/site-new/*
  tar -xzf - -C $REMOTE_DIR/site-new
  rm -rf $REMOTE_DIR/site-old
  if [ -d $REMOTE_DIR/site ]; then mv $REMOTE_DIR/site $REMOTE_DIR/site-old; fi
  mv $REMOTE_DIR/site-new $REMOTE_DIR/site"

echo "Site en ligne : https://burnstreak.com"
