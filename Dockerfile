# Déploiement Dokploy — mode Application (racine du monorepo)
# Build : frontend + API + fichiers statiques servis par Express

FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./

ARG VITE_API_URL=/api
ARG VITE_APP_URL=
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_APP_URL=$VITE_APP_URL

RUN npm run build:production

FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl

COPY backend/package.json backend/package-lock.json ./
RUN npm ci

COPY backend/prisma ./prisma
RUN npx prisma generate

COPY backend/src ./src
COPY backend/scripts ./scripts
COPY backend/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh

COPY --from=frontend-build /app/frontend/dist ./public

ENV APP_ENV=production
ENV NODE_ENV=production
ENV SERVE_FRONTEND=true
ENV PORT=4000
ENV UPLOAD_DIR=uploads

RUN mkdir -p uploads
VOLUME ["/app/uploads"]

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/api/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
