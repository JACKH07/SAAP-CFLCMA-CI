#!/bin/sh
set -e

echo "[entrypoint] Prisma db push…"
npx prisma db push --skip-generate

echo "[entrypoint] Démarrage API…"
exec node src/server.js
