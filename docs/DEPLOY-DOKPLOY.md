# Déploiement Dokploy (VPS Hostinger)

## Erreur « Nixpacks build failed » à la racine

Vous avez créé un service **Application** alors que le projet est un **monorepo**. Deux solutions :

---

## Option A — Application (simple, 1 conteneur)

Le repo contient `nixpacks.toml` et `Dockerfile` à la **racine** pour builder backend + frontend ensemble.

### Dans Dokploy

1. Type : **Application**
2. Repo : `JACKH07/SAAP-CFLCMA-CI` · branche `main`
3. **Build Type** : `Dockerfile` (recommandé) ou Nixpacks (lit `nixpacks.toml`)
4. **Dockerfile path** : `Dockerfile` (racine)
5. **Port** : `4000`
6. **Root Directory** : laisser vide (racine)

### Base MySQL (obligatoire)

Créez un service **MySQL** dans Dokploy, puis variables :

| Variable | Exemple |
|----------|---------|
| `DATABASE_URL` | `mysql://user:pass@host:3306/saap_cflcma_prod` |
| `JWT_SECRET` | clé longue et aléatoire |
| `CORS_ORIGIN` | `https://cfl.flambeauxcmaci.com` |
| `FRONTEND_URL` | `https://cfl.flambeauxcmaci.com` |
| `APP_ENV` | `production` |
| `NODE_ENV` | `production` |
| `SERVE_FRONTEND` | `true` |

### Domaine

- Host : `cfl.flambeauxcmaci.com`
- Port conteneur : **4000**
- HTTPS : activé

### Après le 1er déploiement

Terminal du conteneur → `npm run seed:production`

Vérifier : `https://cfl.flambeauxcmaci.com/api/health`

---

## Option B — Compose (recommandé, 3 services)

1. **Supprimez** l’application Application actuelle
2. **New Service** → type **Compose**
3. Fichier : `docker-compose.dokploy.yml`
4. Variables : voir `.env.dokploy.example`
5. Domaine sur le service **`web`** → port **80**

---

## Option C — 2 applications séparées

| App | Root Directory | Port |
|-----|----------------|------|
| Backend | `backend` | 4000 |
| Frontend | `frontend` | 80 |

+ MySQL séparé.

---

## Dépannage

| Symptôme | Cause | Action |
|----------|--------|--------|
| Nixpacks failed | pas de config racine | Dockerfile racine ou Compose |
| 502 | conteneur crash | `DATABASE_URL` manquant ou MySQL injoignable |
| Page blanche | build front raté | logs build, `SERVE_FRONTEND=true` |
| CORS | mauvaise URL | `CORS_ORIGIN` = URL exacte du site |
