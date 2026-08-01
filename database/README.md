# Base de données SAAP CFLCMA-CI

## Fichiers

| Fichier | Usage |
|---------|--------|
| `init.sql` | **Schéma complet** (CREATE DATABASE + 10 tables) — à importer dans phpMyAdmin |
| `schema.sql` | Dump structure seul (référence) |
| `README.md` | Accès phpMyAdmin / MySQL |

## Tables créées

1. `regions`
2. `districts`
3. `paroisses`
4. `communautes`
5. `roles`
6. `membres`
7. `activites`
8. `cotisations`
9. `historique_mandats`
10. `audit_logs`

## Import via phpMyAdmin

1. Ouvrir http://localhost:8082 (`root` / `saaproot`)
2. Onglet **Importer** → choisir `database/init.sql`
3. Exécuter

Ou via Docker / terminal :

```bash
docker exec -i saap-flccmaci-db mysql -uroot -psaaproot < database/init.sql
cd backend && npx prisma db push && npm run seed
```

> Les tables sont aussi créées automatiquement par Prisma (`npx prisma db push`) à partir de `backend/prisma/schema.prisma`.
