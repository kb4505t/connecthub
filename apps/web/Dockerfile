# --- Base ---
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

# --- Dependencies ---
FROM base AS deps
RUN npm install

# --- Development ---
FROM deps AS development
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# --- Build ---
FROM deps AS build
COPY . .
RUN npm run build

# --- Production ---
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
