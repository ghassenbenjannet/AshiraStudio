FROM node:20-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY shared/package.json shared/tsconfig.json ./shared/
COPY server/package.json server/tsconfig.json ./server/
COPY front/package.json front/tsconfig.json ./front/
RUN npm ci

COPY shared ./shared
COPY server ./server
COPY front ./front
RUN npm run build

FROM node:20-bookworm-slim AS production

ENV NODE_ENV=production \
    PORT=3000 \
    UPLOADS_DIR=/app/uploads \
    BACKUPS_DIR=/app/backups

WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/
COPY front/package.json ./front/

# CDC v4, Lot 3.1 — plus de module natif depuis la bascule PostgreSQL (`postgres`, pur JS) :
# `pg_dump`/`pg_restore` restent nécessaires pour les sauvegardes réelles (lib/sauvegardes.ts).
RUN apt-get update \
    && apt-get install -y --no-install-recommends postgresql-client \
    && npm ci --omit=dev \
    && rm -rf /var/lib/apt/lists/* /root/.npm

COPY --from=build /app/shared/dist ./shared/dist
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/server/src/db/migrations ./server/src/db/migrations
COPY --from=build /app/server/src/db/rls.sql ./server/dist/db/rls.sql
COPY --from=build /app/server/src/config ./server/src/config
COPY --from=build /app/front/dist ./front/dist

RUN mkdir -p /app/data /app/uploads /app/backups \
    && chown -R node:node /app

USER node
WORKDIR /app/server

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

# CDC v4, Lot 3.3 — provisionne le rôle applicatif RLS (idempotent) avant les migrations (DDL), puis
# les politiques RLS (idempotent aussi) avant de démarrer le serveur, qui lui se connecte déjà sous
# le rôle restreint `achirah_app`.
CMD ["sh", "-c", "node dist/db/provision-role.js && node dist/db/migrate.js && node dist/db/apply-rls.js && exec node dist/index.js"]
