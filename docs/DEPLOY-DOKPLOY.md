# Déploiement production — Tout sur Dokploy

**Domaine unique :** `https://cfl.flambeauxcmaci.com`  
Frontend + API + fichiers statiques servis par le même conteneur (port 4000).

---

## Architecture

```
cfl.flambeauxcmaci.com  (DNS A → IP du VPS)
        ↓
   Traefik (80/443)
        ↓
   Conteneur SAAP (port 4000)
   ├── /api/*     → Express API
   ├── /uploads/* → fichiers
   └── /*         → React (dist/)
        ↓
   MySQL Hostinger (31.97.198.49) via DATABASE_URL
```

---

## Étape 1 — DNS Hostinger

hPanel → **Domains** → `flambeauxcmaci.com` → **DNS / Zone DNS**

| Type | Nom | Valeur |
|------|-----|--------|
| **A** | `cfl` | **IP de votre VPS Dokploy** |

> L’IP du VPS ≠ `31.97.198.49` (c’est la base MySQL).  
> Sur le VPS : `curl -4 ifconfig.me` pour obtenir l’IP publique.

**Supprimez** pour `cfl` :
- CNAME vers Hostinger
- A record vers l’hébergement web partagé

**Hostinger hPanel** : ne pas héberger de site web sur le sous-domaine `cfl` (sinon conflit avec Dokploy).

Attendre 5–30 min (propagation DNS).

Vérifier :
```bash
nslookup cfl.flambeauxcmaci.com
# → doit afficher l'IP du VPS
```

---

## Étape 2 — Dokploy : Application

| Paramètre | Valeur |
|-----------|--------|
| Type | Application |
| Repo | `JACKH07/SAAP-CFLCMA-CI` · branche `main` |
| Build Type | **Dockerfile** |
| Docker File | `Dockerfile` (racine) |
| Docker Context | `.` (vide) |
| Port | **4000** |

---

## Étape 3 — Dokploy : Environment

Onglet **Environment** → coller (adapter les secrets) :

```env
DATABASE_URL=mysql://u873042875_user:MOT_DE_PASSE@31.97.198.49:3306/u873042875_saap_flccmaci
APP_ENV=production
NODE_ENV=production
PORT=4000
SERVE_FRONTEND=true
JWT_SECRET=votre_cle_jwt_longue_et_aleatoire
CORS_ORIGIN=https://cfl.flambeauxcmaci.com
FRONTEND_URL=https://cfl.flambeauxcmaci.com
API_PUBLIC_URL=https://cfl.flambeauxcmaci.com/api
PAYMENT_MOCK_MODE=true
ADMIN_EMAIL=flambeaux@gmail.com
ADMIN_PASSWORD=flambeaux&lumière
ADMIN_NOM=Administrateur
ADMIN_PRENOM=Flambeaux
```

> `DATABASE_URL` : base MySQL Hostinger (Remote MySQL activé pour l’IP du VPS).  
> **Important :** le fichier `.env.production` local n’est **pas** lu dans Docker — seules les variables **Dokploy → Environment** comptent.

**Save** → **Deploy**.

---

## Étape 4 — Dokploy : Domains

Onglet **Domains** → **Add Domain** :

| Champ | Valeur |
|-------|--------|
| Host | `cfl.flambeauxcmaci.com` |
| Container Port | **4000** |
| HTTPS | Activé (Let's Encrypt) |
| Path | *(vide)* |

**Save** → **Redeploy** si nécessaire.

### Activer HTTPS (cadenas vert)

1. **Domains** → domaine `cfl.flambeauxcmaci.com`
2. **HTTPS** : activé
3. **Certificate Provider** : **Let's Encrypt** (obligatoire)
4. **Save** → attendre 1–2 min (génération du certificat)
5. Toujours ouvrir le site avec **`https://`** (pas `http://`)

Vérifier la redirection HTTP → HTTPS :

```bash
curl -I http://cfl.flambeauxcmaci.com/admin
# → Location: https://cfl.flambeauxcmaci.com/admin
```

Variables Environment (URLs en **https**) :

```env
FRONTEND_URL=https://cfl.flambeauxcmaci.com
CORS_ORIGIN=https://cfl.flambeauxcmaci.com
API_PUBLIC_URL=https://cfl.flambeauxcmaci.com/api
```

**Hostinger DNS** : enregistrement **A** `cfl` → IP du VPS (pas de proxy CDN HTTP devant Dokploy).

---

## Étape 5 — Seed (première fois ou changement admin)

SSH sur le VPS. Vérifier d’abord que le conteneur voit les variables :

```bash
docker exec $(docker ps -q -f ancestor=cflcmaci-saapcflcmaci-8naclc:latest) printenv ADMIN_EMAIL
```

Si vide → ajoutez `ADMIN_EMAIL` / `ADMIN_PASSWORD` dans **Dokploy → Environment** → **Redeploy**, puis :

```bash
docker exec $(docker ps -q -f ancestor=cflcmaci-saapcflcmaci-8naclc:latest) npm run seed:production
```

**Forcer email/mot de passe sans redeploy** (guillemets obligatoires pour `&`) :

```bash
docker exec \
  -e ADMIN_EMAIL='flambeaux@gmail.com' \
  -e ADMIN_PASSWORD='votre_mot_de_passe' \
  $(docker ps -q -f ancestor=cflcmaci-saapcflcmaci-8naclc:latest) \
  npm run admin:reset:production
```

*(ou `npm run seed:production` — plus long)*

Attendu : `✓ Super Admin mis à jour : votre@email.com (ADSY19900101)`

Compte admin : email ci-dessus ou ID `ADSY19900101`.

---

## Étape 6 — Vérifications

| Test | URL attendue |
|------|----------------|
| API | `https://cfl.flambeauxcmaci.com/api/health` → `{"success":true,...}` |
| Site | `https://cfl.flambeauxcmaci.com` |
| Admin | `https://cfl.flambeauxcmaci.com/admin_connecte` |

---

## Dépannage

| Symptôme | Cause | Action |
|----------|--------|--------|
| **Bad Gateway** | DNS pointe encore vers Hostinger | A record `cfl` → IP VPS |
| **Bad Gateway** | Mauvais port Domains | Port **4000** |
| **P1012 DATABASE_URL** | Variable absente | Environment → ajouter `DATABASE_URL` |
| **Non sécurisé** | HTTP au lieu de HTTPS | Domains → HTTPS activé, utiliser `https://` |
| **CORS** | mauvaise URL | `CORS_ORIGIN=https://cfl.flambeauxcmaci.com` |
| MySQL refused | IP VPS non autorisée | Hostinger → Remote MySQL → autoriser IP VPS |
| **Photos profil absentes** | URLs Render + fichiers non migrés | Voir section **Photos de profil** ci-dessous |

---

## Photos de profil (uploads)

Les photos sont des **fichiers sur disque** (`/app/uploads`), pas en base MySQL.  
Après migration depuis Render, les URLs en base pointent souvent vers `saap-cflcma-ci.onrender.com` alors que les fichiers ne sont plus là (disque éphémère Render).

### 1. Volume persistant Dokploy (obligatoire)

Dans **Dokploy → votre application → Advanced / Volumes** (ou Mounts) :

| Chemin conteneur | Volume |
|------------------|--------|
| `/app/uploads` | `saap-uploads` (nom libre) |

Sans ce volume, chaque redeploy **efface** les nouvelles photos.

### 2. Après déploiement du correctif

SSH sur le VPS :

```bash
CONTAINER=$(docker ps -q -f ancestor=cflcmaci-saapcflcmaci-8naclc:latest)

# Normaliser les URLs en base (nom de fichier uniquement)
docker exec "$CONTAINER" npm run photos:migrate

# Tenter de récupérer depuis Render (si fichiers encore présents)
docker exec "$CONTAINER" npm run photos:sync
```

Si `photos:sync` indique des fichiers **manquants**, copiez une sauvegarde locale dans le volume :

```bash
# Exemple : depuis votre PC (dossier backend/uploads de dev)
scp -r backend/uploads/* root@IP_VPS:/var/lib/docker/volumes/saap-uploads/_data/
```

*(Le chemin exact du volume dépend de Dokploy ; vérifiez avec `docker volume inspect`.)*

### 3. Variable optionnelle

```env
UPLOADS_LEGACY_BASE_URL=https://saap-cflcma-ci.onrender.com
```

Utilisée au premier accès d’une photo : téléchargement automatique depuis l’ancien serveur puis cache local.

---

## MySQL Hostinger (Remote)

hPanel → **Databases** → **Remote MySQL** :
- Ajouter l’**IP publique du VPS** comme hôte autorisé
- Utiliser host `31.97.198.49` (ou `srvXXXX.hstgr.io`) dans `DATABASE_URL`

---

## Commandes utiles (VPS)

```bash
# Logs conteneur
docker logs -f ID_CONTENEUR

# Health interne
docker exec ID_CONTENEUR wget -qO- http://127.0.0.1:4000/api/health

# Test Traefik
curl -I https://cfl.flambeauxcmaci.com/api/health
```
