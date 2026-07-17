# NOTE: build context for this Dockerfile is the monorepo ROOT, not
# apps/api — see docker-compose.yml (`context: .`, `dockerfile: apps/api/Dockerfile`).
# That's required so npm can see packages/shared-types and resolve
# @connecthub/shared-types as a local workspace package instead of trying
# (and failing) to fetch it from the public npm registry.

# --- Base ---
FROM node:20-alpine AS base
WORKDIR /app
# Prisma's query/schema engine binaries are dynamically linked against
# OpenSSL, which alpine doesn't ship by default. Without this, prisma
# generate/migrate fail at runtime with a garbled, hard-to-diagnose
# "Could not parse schema engine response" error instead of a clear one.
RUN apk add --no-cache openssl

# Root workspace manifests first — better layer caching, since these change
# less often than application code.
COPY package*.json ./

# Workspace member manifests needed to resolve @connecthub/shared-types as a
# local package during `npm install`.
COPY apps/api/package.json ./apps/api/package.json
COPY packages/shared-types/package.json ./packages/shared-types/package.json

COPY apps/api/prisma ./apps/api/prisma

# --- Dependencies ---
FROM base AS deps
RUN npm install
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma

# --- Development ---
FROM deps AS development
COPY packages/shared-types ./packages/shared-types
COPY apps/api ./apps/api
# shared-types' package.json "main" points at dist/, so it needs a build
# even for dev. If you edit packages/shared-types while apps/api's dev
# container is running, re-run this build (or restart the container) to
# pick up the change — tsx watches apps/api/src, not shared-types/src.
RUN npm run build --workspace=packages/shared-types
WORKDIR /app/apps/api
EXPOSE 4000
CMD ["npm", "run", "dev"]

# --- Build ---
FROM deps AS build
COPY packages/shared-types ./packages/shared-types
COPY apps/api ./apps/api
RUN npm run build --workspace=packages/shared-types
RUN npm run build --workspace=apps/api

# --- Production ---
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
# wget is used by HEALTHCHECK below; alpine's base image doesn't include it
RUN apk add --no-cache wget
# see the base stage above for why openssl is needed
RUN apk add --no-cache openssl

COPY package*.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/shared-types/package.json ./packages/shared-types/package.json
COPY apps/api/prisma ./apps/api/prisma
# shared-types is consumed at runtime via its compiled dist/ (built in the
# build stage above) — package.json's "main" points there, not at src/.
COPY --from=build /app/packages/shared-types/dist ./packages/shared-types/dist

RUN npm install --omit=dev --workspace=apps/api
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma

COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY apps/api/docker-entrypoint.sh ./apps/api/docker-entrypoint.sh
RUN chmod +x ./apps/api/docker-entrypoint.sh

WORKDIR /app/apps/api
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1
ENTRYPOINT ["./docker-entrypoint.sh"]
