# SAAP CFLCMA-CI

Système d'Administration et de Paiement du mouvement **Flambeaux et Lumières, Coordination CMA CI**.

## Structure

```
backend/    API Express + Prisma (MariaDB/MySQL)
frontend/   Application React (Vite) mobile-first
```

## Prérequis

- Node.js 18+
- MariaDB ou MySQL 8+ (ou Docker)

## Démarrage rapide

```bash
# 1. Base de données MySQL + phpMyAdmin
docker compose up -d

# phpMyAdmin : http://localhost:8082
#   user root / saaproot   (ou saap / saap123)

# 2. Backend
cd backend
cp .env.example .env   # DATABASE_URL → 127.0.0.1:3310
npm install
npx prisma generate
npx prisma db push
npm run seed
npm run dev

# 3. Frontend (autre terminal)
cd frontend
npm install
npm run dev
```

- API : http://localhost:4000  
- UI : http://localhost:5173  
- phpMyAdmin : http://localhost:8082  

Compte **Coordinateur général (C.G.)** (seed) :
- Email : `admin@flccmaci.org`
- Mot de passe : `AdminFLCCMACI2026!`
- Connexion admin : http://localhost:5173/admin_connecte

Seul le rôle **Coordinateur général (C.G.)** a accès au tableau de bord et à l'administration.

### Hiérarchie des rôles

1. Coordinateur général (C.G.)
2. Coordinateurs de région (C.D.R.)
3. Coordinateurs de district (C.D.D.)
4. Coordinateurs de paroisse (C.D.P.)
5. Chefs de troupe (C.T.)
6. Chefs de troupe adjoints (C.T.A.)
7. Chefs de patrouille (C.P.)
8. Sous-chefs de patrouille (S.P.)
9. Membres actifs


## Environnements

Trois environnements séparés : **development** (local), **preprod**, **production**.

| Env | Backend | Frontend | Base de données |
|-----|---------|----------|-----------------|
| development | `.env` | `.env.development` | `docker compose` (port **3310**) |
| preprod | `.env.preprod` | `.env.preprod` | `docker compose -f docker-compose.preprod.yml` (port **3311**) |
| production | `.env.production` | `.env.production` | `docker compose -f docker-compose.prod.yml` |

### Préparer la preprod

```bash
# 1. Variables
cp backend/.env.preprod.example backend/.env.preprod
cp frontend/.env.preprod.example frontend/.env.preprod
# Éditer les fichiers : mots de passe, JWT_SECRET, CORS_ORIGIN, VITE_API_URL

# 2. Base de données
docker compose -f docker-compose.preprod.yml up -d

# 3. Backend
cd backend
# Pointer Prisma vers preprod (DATABASE_URL dans .env.preprod)
cp .env.preprod .env   # ou exporter DATABASE_URL
npx prisma db push
npm run seed:preprod
npm run start:preprod

# 4. Frontend
cd frontend
npm run build:preprod
# Servir le dossier dist/ derrière Nginx / un hébergeur
```

### Préparer la production

```bash
cp backend/.env.production.example backend/.env.production
cp frontend/.env.production.example frontend/.env.production
# Remplir OBLIGATOIREMENT JWT_SECRET, mots de passe DB, CORS, URLs API

docker compose -f docker-compose.prod.yml up -d

cd backend
cp .env.production .env
npx prisma db push
npm run seed:production
npm run start:production

cd frontend
npm run build:production
```

**Règles importantes**
- Ne jamais committer `.env.preprod` / `.env.production` (secrets)
- JWT_SECRET et mots de passe **différents** entre preprod et prod
- Bases de données séparées (`saap_cflcma_preprod` / `saap_cflcma_prod`)
- Remplacer `votredomaine.ci` par votre vrai domaine


## Fonctionnalités

- Inscription flambeaux avec ID membre auto (`NOMPREAAAAMMJJ`) + gestion collisions
- Autocomplétion paroisse / communauté (création à la volée)
- Auth JWT + RBAC (admin vs membre)
- Profil individuel & cotisations personnelles
- Saisie manuelle + initiation Mobile Money + webhooks
- Dashboard admin, export Excel/PDF, journal d'audit

## Tests

```bash
cd backend && npm test
```
# SAAP-CFLCMA-CI
