# ---- build ----
FROM node:22-alpine AS build
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

# ---- run ----
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production \
    DATA_DIR=/data \
    MIGRATIONS_DIR=/app/drizzle \
    PORT=3000 \
    BODY_SIZE_LIMIT=25M
RUN mkdir -p /data && chown node:node /data
COPY --from=build --chown=node:node /app/build ./build
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/drizzle ./drizzle
COPY --from=build --chown=node:node /app/package.json ./
USER node
VOLUME ["/data"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s CMD wget -qO- http://127.0.0.1:3000/login >/dev/null || exit 1
CMD ["node", "build"]
