# Déploiement sur Dokploy (VPS Hostinger)

Le dépôt est un **monorepo** (`backend/` + `frontend/`). Nixpacks à la racine échoue car il n’y a pas de `package.json` à la racine.

## Recommandé : Docker Compose

### 1. Pousser le code

Committez et poussez sur GitHub (`JACKH07/SAAP-CFLCMA-CI`) les fichiers :

- `docker-compose.dokploy.yml`
- `backend/Dockerfile`
- `frontend/Dockerfile`

### 2. Créer le projet dans Dokploy

1. **New Project** → ajoutez votre domaine (ex. `cfl.flambeauxcmaci.com`)
2. **New Service** → type **Compose**
3. Source : GitHub `JACKH07/SAAP-CFLCMA-CI`
4. **Compose file** : `docker-compose.dokploy.yml`
5. Branche : `main` (ou votre branche de prod)

### 3. Variables d’environnement

Dans l’onglet **Environment** du service Compose, ajoutez (voir `.env.dokploy.example`) :

| Variable | Exemple |
|----------|---------|
| `MYSQL_ROOT_PASSWORD` | mot de passe root MySQL fort |
| `MYSQL_PASSWORD` | mot de passe user `saap_prod` |
| `JWT_SECRET` | clé JWT longue et unique |
| `FRONTEND_URL` | `https://cfl.flambeauxcmaci.com` |
| `CORS_ORIGIN` | même URL que `FRONTEND_URL` |
| `API_PUBLIC_URL` | `https://cfl.flambeauxcmaci.com/api` |
| `HTTP_PORT` | `3000` (ou le port configuré dans Dokploy) |

### 4. Domaine

Dans **Domains** du service `web` :

- Host : `cfl.flambeauxcmaci.com`
- Container port : **80**
- HTTPS : activé (Let’s Encrypt)

L’API est servie via le même domaine (`/api` et `/uploads` proxifiés par Nginx).

### 5. Premier déploiement

1. **Deploy**
2. Attendre que MySQL, `api` et `web` soient **Running**
3. Seed initial (une seule fois), terminal du conteneur `api` :

```bash
npm run seed:production
```

Compte admin par défaut (seed) : `admin@flccmaci.org` / voir `ADMIN_PASSWORD`.

### 6. Vérifications

- Site : `https://cfl.flambeauxcmaci.com`
- API : `https://cfl.flambeauxcmaci.com/api/health` → `{"success":true,...}`
- Admin : `https://cfl.flambeauxcmaci.com/admin_connecte`

---

## Alternative : 2 applications séparées

Si vous préférez **Backend** et **Frontend** séparés (sans Compose) :

### Backend

- Type : **Application**
- Build : **Dockerfile**
- **Root Directory** : `backend`
- Port : `4000`
- Variables : `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, etc.
- Base MySQL : service **Database** Dokploy ou MySQL externe

### Frontend

- Type : **Application**
- Build : **Dockerfile**
- **Root Directory** : `frontend`
- Build args : `VITE_API_URL=https://api.votredomaine.ci/api`
- Port : `80`

Ne laissez **pas** la racine du repo vide pour Nixpacks : indiquez toujours `backend` ou `frontend`, ou utilisez Compose.

---

## Dépannage

| Erreur | Cause | Solution |
|--------|--------|----------|
| Nixpacks build failed | Build à la racine du monorepo | Compose ou Root Directory `backend`/`frontend` |
| API ne démarre pas | MySQL pas prêt / `DATABASE_URL` | Vérifier logs `db` et `api` |
| CORS | mauvais `CORS_ORIGIN` | Doit correspondre exactement à l’URL du front |
| 502 sur `/api` | conteneur `api` down | Logs Dokploy → service `api` |
