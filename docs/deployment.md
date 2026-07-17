# Phase 14 — Deployment

ConnectHub deploys as three independent pieces:

| Piece | Where | Why there |
|---|---|---|
| Postgres | Supabase | Already the app's DB/Auth/Storage provider since Phase 3 — no new vendor |
| API (Express + Socket.IO) | Render | Long-running Node process with a persistent WebSocket connection; Render runs containers 24/7, not just request-response |
| Web (Next.js) | Vercel | Best-in-class Next.js build pipeline, edge network, preview deployments per PR |

This split is deliberate, not incidental: Vercel's serverless functions aren't a good fit for a stateful Socket.IO server, and Render (or any container host) doesn't buy you anything over Vercel for a Next.js frontend. Keeping them on separate platforms also means a bad frontend deploy can't take down the API and vice versa.

If you'd rather run everything on one server yourself instead of three vendors, skip to [Alternative: self-hosted Docker](#alternative-self-hosted-docker) at the bottom — the API and Postgres pieces still apply either way.

## 1. Supabase (already set up in Phase 3/4)

You should already have a Supabase project from earlier phases, with Storage buckets for avatars/covers/post media. Two connection strings from **Project Settings → Database** matter here:

- **Connection pooling** (port `6543`, pgbouncer) → `DATABASE_URL`. The running app uses this.
- **Direct connection** (port `5432`) → `DIRECT_URL`. Migrations use this, since `prisma migrate` can't run through a connection pooler — this is why `schema.prisma`'s datasource has both, going back to Phase 3.

## 2. Render — deploy the API

**Option A — Blueprint (recommended):** the repo root includes `render.yaml`, which describes the API service declaratively. In the Render dashboard: **New → Blueprint**, point it at this repo, and Render provisions the service from that file. You'll be prompted once for every `sync: false` variable (all the real secrets — nothing sensitive lives in `render.yaml` itself).

**Option B — manual:** New → Web Service → connect the repo → set:
- **Runtime:** Docker
- **Dockerfile path:** `apps/api/Dockerfile`
- **Docker context:** `apps/api`
- **Health check path:** `/health`

Then add the environment variables from the table below.

**What happens on deploy:** the production Docker stage builds, then `docker-entrypoint.sh` runs `prisma migrate deploy` (applies any pending migrations, non-interactively, no-op if none) before starting the server. This means your very first deploy is also what creates the schema in Supabase — you do **not** need to run migrations locally against production first.

### Required environment variables (Render)

| Variable | Notes |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Supabase pooled connection string (port 6543) |
| `DIRECT_URL` | Supabase direct connection string (port 5432) |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` | From Project Settings → API |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Two **different** strong secrets — `openssl rand -base64 48` |
| `CLIENT_URL` | Your Vercel domain(s), comma-separated if you have more than one (see below) |
| `RESEND_API_KEY` | Optional — omit to log emails to console instead of sending them |

`PORT`, `JWT_*_EXPIRES_IN`, and `RATE_LIMIT_*` all have sensible defaults (see `apps/api/.env.example`) and only need overriding if you want different values.

**About `CLIENT_URL`:** this is a comma-separated allow-list, not a single origin — e.g. `https://connecthub.vercel.app,https://connecthub-git-staging-yourteam.vercel.app`. If you only ever deploy from `main`, one URL is fine. If you want Vercel's per-branch preview deployments to also work against this API, list them too.

## 3. Vercel — deploy the web app

This is an npm-workspaces monorepo, so the one setting that matters is **Root Directory**: in the Vercel project's settings, set it to `apps/web`. Vercel's Next.js preset handles install/build/output automatically from there; `apps/web/vercel.json` (already in the repo) adds a handful of security response headers on top.

Import the repo in Vercel, set **Root Directory** to `apps/web`, and add:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://<your-render-service>.onrender.com/api/v1` |
| `NEXT_PUBLIC_SOCKET_URL` | `https://<your-render-service>.onrender.com` |
| `NEXT_PUBLIC_SUPABASE_URL` | Same Supabase project URL as the API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same Supabase anon key as the API |

Push to `main` — Vercel's GitHub App deploys automatically; no extra CI step is needed on this side.

**One circular dependency to expect:** Render needs `CLIENT_URL` to know your Vercel domain, and Vercel needs `NEXT_PUBLIC_API_URL` to know your Render domain. Both platforms assign you a working `*.onrender.com` / `*.vercel.app` subdomain the moment the service first deploys, before you've configured either variable — so the order is: deploy both once with placeholder/default values, copy each platform's real URL into the other's env vars, then redeploy both. After that, only redeploy-on-push is needed.

## 4. CI/CD

`.github/workflows/ci.yml` runs on every push/PR: lint + test + build for the API, lint + build for the web app (the API's unit tests run against a mocked Prisma client, per the Phase 2 notes — no live database needed in CI). A `deploy-api` job then hits Render's deploy hook, but only after both build jobs pass — this exists so a broken commit can't trigger a live deploy just because Render's own GitHub integration would otherwise fire independently of CI status.

To enable it: **Render dashboard → your service → Settings → Deploy Hook**, copy the URL, and add it as a repository secret named `RENDER_DEPLOY_HOOK_URL` (GitHub repo → Settings → Secrets and variables → Actions). Without that secret set, the job just logs that it's skipping and exits cleanly — CI itself doesn't require it.

Vercel needs no equivalent workflow: its GitHub App deploys directly from the repo, independent of this pipeline.

## 5. Two production-only behaviors worth knowing about

These were fixed as part of this phase, since they only show up once the app is actually deployed cross-domain — they can't surface in local dev, where everything runs on `localhost`:

- **Refresh-token cookie `SameSite`:** `Lax` in development, `None` in production. The frontend and API are different domains in production (`vercel.app` vs `onrender.com`), which makes every request cross-site from the browser's perspective — a `Lax` cookie would be silently withheld from `fetch()` calls, breaking silent session refresh. `None` requires `Secure`, which is already forced on in production.
- **`trust proxy`:** set in production only, since Render proxies HTTPS traffic to the container over plain HTTP. Without it, `express-rate-limit` would key off Render's proxy IP instead of each real client's IP, effectively rate-limiting all users as one.

## Alternative: self-hosted Docker

If you'd rather run everything yourself instead of Vercel + Render:

```bash
cp apps/api/.env.example apps/api/.env.production   # fill in real values
cp apps/web/.env.example apps/web/.env.production
docker compose -f docker-compose.prod.yml up --build -d
```

This builds the `production` stage of both Dockerfiles (no bind mounts, no dev `CMD`) and includes a bundled Postgres container. You can still point `DATABASE_URL`/`DIRECT_URL` at Supabase instead and drop the bundled `postgres` service if you want managed Postgres but a self-hosted app layer — see the comments in `docker-compose.prod.yml`.

You'll need your own reverse proxy (Caddy, nginx, Traefik) in front for TLS termination and a real domain — that part is intentionally left out here since it varies a lot by host, and is well-trodden ground with existing guides for whichever proxy you pick.
