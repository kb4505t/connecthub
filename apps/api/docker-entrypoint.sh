#!/bin/sh
# Runs once per container boot, before the server starts accepting traffic.
#
# Why this exists instead of just `CMD ["node", "dist/server.js"]`: Render's
# Docker deploys don't have a distinct "release phase" the way Heroku does,
# so there's no built-in hook to run migrations between build and start. The
# alternatives are (a) run migrations manually against production every
# deploy, which people forget, or (b) run them here, automatically, every
# boot. `prisma migrate deploy` is deliberately safe for that: unlike
# `migrate dev`, it never prompts, never generates new migrations, and is a
# no-op if there's nothing pending — so this is safe to run on every restart,
# not just the deploys that actually changed the schema.
#
# Caveat carried over from the README's own Phase 5/11 notes: if this API is
# ever horizontally scaled (>1 instance), multiple containers could race to
# apply the same migration on simultaneous boot. Fine at single-instance
# scale (Render's free/starter tiers); would need a dedicated migration step
# decoupled from container start before scaling out.
set -e

echo "▶ Running database migrations..."
npx prisma migrate deploy

echo "▶ Starting server..."
exec node dist/server.js
