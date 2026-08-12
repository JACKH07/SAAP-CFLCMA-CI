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

echo "[entrypoint] Démarrage API…"
exec node src/server.js
