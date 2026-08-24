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
    DATABASE_PATH=/app/data/achirah.sqlite \
    UPLOADS_DIR=/app/uploads \
    BACKUPS_DIR=/app/backups

WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/
COPY front/package.json ./front/

# better-sqlite3 est un module natif. Les outils ne restent pas dans l'image finale.
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && npm ci --omit=dev \
    && apt-get purge -y --auto-remove python3 make g++ \
    && rm -rf /var/lib/apt/lists/* /root/.npm

COPY --from=build /app/shared/dist ./shared/dist
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/server/src/db/migrations ./server/src/db/migrations
COPY --from=build /app/server/src/config ./server/src/config
COPY --from=build /app/front/dist ./front/dist

RUN mkdir -p /app/data /app/uploads /app/backups \
    && chown -R node:node /app

USER node
WORKDIR /app/server

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["sh", "-c", "node dist/db/migrate.js && exec node dist/index.js"]
