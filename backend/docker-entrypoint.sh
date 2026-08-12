#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "[entrypoint] ERREUR : DATABASE_URL manquante."
  echo "[entrypoint] Dokploy → Environment → ajoutez par ex. :"
  echo "  DATABASE_URL=mysql://user:motdepasse@nom-service-mysql:3306/saap_cflcma_prod"
  exit 1
fi

echo "[entrypoint] Prisma db push…"
npx prisma db push --skip-generate

UPLOAD_DIR="${UPLOAD_DIR:-/app/uploads}"
mkdir -p "$UPLOAD_DIR"
if ! touch "$UPLOAD_DIR/.write-test" 2>/dev/null; then
  echo "[entrypoint] ERREUR : $UPLOAD_DIR non inscriptible."
  echo "[entrypoint] Dokploy → montez un volume sur /app/uploads"
  exit 1
fi
rm -f "$UPLOAD_DIR/.write-test"
echo "[entrypoint] Dossier uploads : $UPLOAD_DIR ($(ls "$UPLOAD_DIR" 2>/dev/null | wc -l | tr -d ' ') fichier(s))"

echo "[entrypoint] Démarrage API…"
exec node src/server.js
