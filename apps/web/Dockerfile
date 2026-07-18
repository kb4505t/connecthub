# NOTE: build context for this Dockerfile is the monorepo ROOT, not
# apps/web — see docker-compose.yml (`context: .`, `dockerfile: apps/web/Dockerfile`).
# That's required so npm can see packages/shared-types and resolve
# @connecthub/shared-types as a local workspace package instead of trying
# (and failing) to fetch it from the public npm registry.

# --- Base ---
# Node 22, not 20: apps/web depends on @supabase/supabase-js too, which
# needs the native global WebSocket that only exists starting Node 22 (see
# apps/api/Dockerfile for the exact runtime error this avoids).
FROM node:22-alpine AS base
WORKDIR /app

# Root workspace manifests first — better layer caching, since these change
# less often than application code.
COPY package*.json ./

# Workspace member manifests needed to resolve @connecthub/shared-types as a
# local package during `npm install`.
COPY apps/web/package.json ./apps/web/package.json
COPY packages/shared-types/package.json ./packages/shared-types/package.json

# --- Dependencies ---
FROM base AS deps
RUN npm install

# --- Development ---
FROM deps AS development
COPY packages/shared-types ./packages/shared-types
COPY apps/web ./apps/web
# shared-types' package.json "main" points at dist/, so it needs a build
# even for dev. If you edit packages/shared-types while apps/web's dev
# container is running, re-run this build (or restart the container) to
# pick up the change — next dev watches apps/web, not shared-types/src.
RUN npm run build --workspace=packages/shared-types
WORKDIR /app/apps/web
EXPOSE 3000
CMD ["npm", "run", "dev"]

# --- Build ---
FROM deps AS build
COPY packages/shared-types ./packages/shared-types
COPY apps/web ./apps/web
RUN npm run build --workspace=packages/shared-types
RUN npm run build --workspace=apps/web

# --- Production ---
# Node 22 here too — see the base stage's comment above.
FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

# next.config.js sets outputFileTracingRoot to the monorepo root, so the
# "standalone" output below is nested under apps/web/ (mirroring the repo
# layout) and already contains only the node_modules actually needed at
# runtime — including @connecthub/shared-types — via Next's dependency
# tracing. Nothing from packages/shared-types needs to be copied separately.
COPY --from=build /app/apps/web/public ./apps/web/public
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static

WORKDIR /app/apps/web
EXPOSE 3000
CMD ["node", "server.js"]
