# --- Base ---
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma

# --- Dependencies ---
FROM base AS deps
RUN npm install
RUN npx prisma generate

# --- Development ---
FROM deps AS development
COPY . .
EXPOSE 4000
CMD ["npm", "run", "dev"]

# --- Build ---
FROM deps AS build
COPY . .
RUN npm run build

# --- Production ---
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
# wget is used by HEALTHCHECK below; alpine's base image doesn't include it
RUN apk add --no-cache wget
COPY package*.json ./
COPY prisma ./prisma
RUN npm install --omit=dev
RUN npx prisma generate
COPY --from=build /app/dist ./dist
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1
ENTRYPOINT ["./docker-entrypoint.sh"]
