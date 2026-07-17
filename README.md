# ConnectHub

A premium, modern social media platform. Built as a monorepo with a Next.js frontend and an Express/Prisma backend.

## Status: Phase 14 complete — Deployment (all 14 phases done)

See [`docs/deployment.md`](docs/deployment.md) for the full Vercel + Render + Supabase deployment guide.

## Stack

| Layer      | Tech |
|------------|------|
| Frontend   | Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Framer Motion, TanStack Query, React Hook Form, Zod |
| Backend    | Node.js, Express, TypeScript, Prisma ORM, Socket.IO, JWT |
| Database   | PostgreSQL (Supabase) |
| Storage/Auth | Supabase Storage, Supabase Auth |
| Deployment | Docker, Vercel (frontend), Render (backend) |

## Monorepo structure

```
connecthub/
├── apps/
│   ├── web/           # Next.js frontend
│   └── api/            # Express backend + Prisma schema
├── packages/
│   └── shared-types/    # Zod schemas/types shared by web & api
├── docker-compose.yml   # Local Postgres + api + web
└── README.md
```

## Getting started (local development)

### Prerequisites
- Node.js >= 20
- Docker (for local Postgres, or use a Supabase project directly)
- A Supabase project (for Auth + Storage) — create one at supabase.com

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment variables
```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```
Fill in your Supabase project URL/keys and generate JWT secrets:
```bash
openssl rand -base64 48
```

In your Supabase project, create five **public** Storage buckets (Storage → New bucket → toggle "Public bucket"): `avatars`, `covers`, `post-media`, `message-media`, `story-media`. The app uploads processed images here and stores their public URLs on the relevant rows.

### 3. Start Postgres (or point DATABASE_URL at your Supabase DB directly)
```bash
docker compose up postgres -d
```

### 4. Run database migrations
```bash
npm run prisma:migrate
```

### 5. Start dev servers
```bash
npm run dev:api   # http://localhost:4000
npm run dev:web   # http://localhost:3000
```

Or run everything (Postgres + API + Web) via Docker:
```bash
npm run docker:up
```

## Development roadmap (phases)

- [x] **Phase 1** — Project setup & architecture
- [x] **Phase 2** — Authentication (register, login, email verification, password reset, JWT, sessions)
- [x] **Phase 3** — Database (schema drafted in Phase 1; migrations & seeding finalized here)
- [x] **Phase 4** — Profile system
- [x] **Phase 5** — Posts (text/image/video/polls, edit/delete/save/share/repost/pin/scheduling)
- [x] **Phase 6** — Comments (nested replies, reactions)
- [x] **Phase 7** — Likes
- [x] **Phase 8** — Follow system
- [x] **Phase 9** — Notifications
- [x] **Phase 10** — Messaging (DMs, group chat, read receipts, typing, voice messages)
- [x] **Phase 11** — Stories
- [x] **Phase 12** — Search
- [x] **Phase 13** — Admin dashboard (user management, moderation queue, analytics)
- [x] **Phase 14** — Deployment (Vercel + Render + Supabase, CI/CD, Docker)

Each phase is built completely (API + UI + tests) before moving to the next.

## Architecture notes

- **Backend** follows a layered architecture: `routes → controllers → services → Prisma`. Controllers never touch the database directly; services never touch `req`/`res`. This keeps business logic unit-testable in isolation.
- **All API errors** funnel through one global error handler (`src/middlewares/errorHandler.ts`), giving every endpoint a consistent JSON error shape.
- **All environment variables** are validated at boot via Zod (`src/config/env.ts`) — the app refuses to start with missing/invalid config instead of failing at request time.
- **Database schema** (`apps/api/prisma/schema.prisma`) is the single source of truth, covering users, posts, media, polls, comments, likes, follows, blocks/mutes, stories, messaging, notifications, and moderation/reports — with indexes on foreign keys and frequently-queried columns.

### Phase 14 — Deployment

- **Three platforms, deliberately**: Supabase (already the DB/Auth/Storage provider since Phase 3), Render for the API, Vercel for the Next.js frontend. Not one host for everything — Vercel's serverless model doesn't suit a stateful Socket.IO server, and a container host buys nothing over Vercel for Next.js. Full walkthrough in [`docs/deployment.md`](docs/deployment.md).
- **Two bugs this phase exists to catch, not create**: local dev never exercises a real cross-domain deployment, so two things silently worked in every previous phase's testing and would have silently broken in production. (1) The refresh-token cookie was `SameSite: "lax"` — fine when frontend and API share `localhost`, but `Lax` withholds cookies from cross-site `fetch()`, which is exactly what a `vercel.app` frontend calling an `onrender.com` API does. Now `"none"` in production (paired with the `secure: true` already set there). (2) No `trust proxy` — Render proxies HTTPS to the container over plain HTTP, so without it `express-rate-limit` reads every user as the same IP (the proxy's). Set to `1` (trust exactly one hop) in production only.
- **Migrations run on container boot, not as a separate step**: `docker-entrypoint.sh` runs `prisma migrate deploy` before starting the server. Render's Docker runtime has no Heroku-style release phase to hook into, and `migrate deploy` (unlike `migrate dev`) never prompts and is a safe no-op with nothing pending — so it's safe to run on every restart, not just schema-changing ones. Flagged in the script itself: this would need decoupling from container start before the API is ever horizontally scaled, same single-instance caveat the scheduled-jobs pollers (Phases 5/11) already carry.
- **`CLIENT_URL` became a list, not a string**: CORS and Socket.IO both need to allow the production Vercel domain and optionally its preview-deployment URLs, not just one origin. `CLIENT_URL` now accepts a comma-separated list (a single URL still works unchanged); `config/env.ts` exports a pre-split `allowedOrigins` array so `app.ts` and `server.ts` don't each re-parse it.
- **CI gates the deploy, not the other way around**: `.github/workflows/ci.yml` lints/tests/builds both workspaces on every push/PR, and only *then* hits Render's deploy hook — specifically so a broken commit reaching `main` can't trigger a live deploy on its own. Vercel needs no equivalent step; its GitHub App deploys independently.
- **Docker as a first-class alternative, not an afterthought**: `docker-compose.prod.yml` builds each Dockerfile's existing `production` stage (already multi-stage from earlier phases) with no dev bind-mounts, for anyone who'd rather self-host the whole stack on one server than manage three vendors. Genuinely optional — ConnectHub's own deployment uses Vercel/Render/Supabase.
- **What's still manual**: TLS/domain setup for the self-hosted Docker path (left to whichever reverse proxy you pick — Caddy, nginx, Traefik — since that part is host-specific and well-covered elsewhere), and there's no blue-green/canary deploy strategy — Render's default is replace-in-place with a health-check gate (`/health`), which is the right amount of rigor at this project's scale but a real gap before high-traffic production use.

### Phase 13 — Admin Dashboard

- **A second, stricter auth gate just for `/admin`**: `authenticate` (every other route) deliberately trusts the JWT signature alone and never hits the database, since access tokens are short-lived. `requireAdmin` breaks that rule on purpose — it re-fetches `isAdmin`/`isBanned` from the DB on every admin request. The gap being closed: without it, an admin who gets demoted or banned keeps admin access for up to their token's remaining 15-minute lifetime. Worth the extra query for this one router; not worth it everywhere else.
- **Reports carry their own audit trail**: `Report` gained `reviewerId`, `actionTaken`, and `reviewNote` (Phase 1's schema only had `status`/`resolvedAt`). Every resolution — dismiss, remove content, or ban — records who did it and why, not just that it happened.
- **Three report actions, one endpoint**: `POST /admin/reports/:id/resolve` takes `{ action: "DISMISS" | "REMOVE_CONTENT" | "BAN_USER" }` rather than three separate routes, since they share the same "load the report, validate it's still open, act, mark resolved" shape. `REMOVE_CONTENT` soft-deletes the reported post/comment (same `deletedAt` pattern as Phases 5/6 — reply threads and analytics history survive). `BAN_USER` resolves the *content's author* (or the reported account directly, for `USER`-type reports) — not the report's target id blindly, since for a POST/COMMENT report those aren't the same thing.
- **Banning revokes sessions, doesn't delete data**: `banUser` sets `isBanned`/`banReason`/`bannedAt` and revokes every outstanding `RefreshToken` in one transaction — signed out everywhere, immediately, on the next `/auth/refresh`. Posts/comments/follows are untouched; a ban is reversible (`unbanUser` clears all three fields) and a banned account's content just stops being reachable via the existing `isBanned` checks Phase 2/4 already had in `login`/`getProfileByUsername`. Admins can't be banned by other admins (forces a deliberate demotion first) and can't ban themselves.
- **Analytics are plain Prisma aggregates, not a raw-SQL reporting layer**: dashboard stats are `count()`/`findMany` calls bucketed into daily histograms in JS (`bucketByDay`), not `date_trunc` raw queries — consistent with the rest of the codebase's "plain Prisma over raw SQL" preference, and perfectly fine at the row counts a `findMany` over a 30-day window means here. Would need revisiting (materialized view or raw aggregate query) well before this became a real reporting product.
- **No new chart dependency**: `DailyBarChart`/`RankedBarList` are ~60 lines of hand-rolled SVG using the existing CSS-variable design tokens (`hsl(var(--primary))`, etc.), not a charting library — the dashboard only ever needed two chart shapes (day-bucketed bars, ranked lists), and pulling in Recharts/Chart.js for that felt like the wrong trade against this project's otherwise very deliberate, small dependency list.
- **User list search + filter reuses Phase 12's exact patterns**: same cursor-on-`id` pagination, same debounced (`useDebouncedValue`) search input, same "Load more" button (not infinite-scroll-on-intersection) as every other paginated list in the app.
- **Frontend guard is UX-only, same caveat as the `/login` middleware**: `admin/layout.tsx` redirects a non-admin away client-side by checking `user.isAdmin` — a nice-to-have that avoids a flash of the dashboard shell, not the security boundary. `requireAdmin` on the API is what actually stops a non-admin from calling any `/admin/*` endpoint, same "middleware is UX, API is the real gate" split Phase 2's route guard already established.

### Phase 12 — Search

- **Three independent search endpoints, not one**: `searchUsers` (username/full-name substring match), `searchPosts` (content substring match, reusing Phase 5's `buildVisibilityWhere`/`postInclude`/`toPostDTOs` so a private account's posts don't leak through search just because the text matched), and `searchHashtags` (ranked by usage). A fourth, `GET /search`, is a thin orchestrator that calls all three in parallel for a top-5-of-each typeahead preview — the "is it worth opening the full results page" check, not a fourth independent search implementation.
- **`contains`, not full-text search**: deliberately simple substring matching (Postgres `ILIKE` under the hood) rather than `tsvector`/`@@` full-text or a search extension. The user base and content length here don't justify that infrastructure, and `contains` degrades more gracefully than strict full-text matching would (no "zero results because of one typo" surprise). A real growth-stage deployment would revisit this with Postgres full-text search or an external index (Elasticsearch/Meilisearch/Algolia) once query volume or corpus size actually demands it.
- **Hashtag ranking reuses the trending feed's pagination trick**: ordering by `posts._count` (a computed aggregate) can't be expressed as a stable id-cursor — ties on post count aren't ordered by id — so `searchHashtags` reuses the same offset-as-cursor pattern the Phase 5 trending feed already established, rather than inventing a second convention.
- **A hashtag becomes a real destination, not just a search result**: `GET /posts/hashtag/:tag` (`postService.getPostsByHashtag`) and a `/hashtag/[tag]` page were added alongside hashtag search — clicking a `#tag` search result (or now, a `#tag` inside any post's text) lands on a page listing every post carrying it. Skipping this would've made hashtags searchable but not actually browsable, which defeats the point.
- **Small, closely-related gap this phase closed**: post/comment content had never rendered `#hashtags` or `@mentions` as links — Phase 5/6 stored and extracted them (`syncHashtagsAndMentions`), but the frontend just displayed them as plain text. Added `PostContent`, a small span-splitting renderer, and wired it into `post-card.tsx` in both places content renders (the main post and the nested quote-repost preview). Without this, a hashtag was only discoverable by typing it into search — never by clicking one you'd already seen.
- **`useSearchUsers`'s Follow buttons needed one more cache invalidation**: `useFollowUser`/`useUnfollowUser` (Phase 4) only invalidated the `["profile", username]` query, since that was the only place a Follow button had ever lived before. A Follow button embedded in a search-results list reads from a different cache key (`["search", ...]`) that follow/unfollow had no reason to know about until now — added invalidating `["search"]` alongside `["profile", username]` so toggling follow state from search results actually sticks instead of reverting after the mutation settles.
- **Optionally authenticated, like post visibility everywhere else**: `optionalAuthenticate`, not `authenticate` — search works for anonymous visitors (public posts/accounts only), and a logged-in viewer additionally gets `isFollowedByViewer` on user results and their followers-only/private-but-followed posts included, same visibility rules Phase 5 already enforces for the feed.
- **No search history, no trending searches, no @mention-in-search-bar autocomplete**: real, deliberate scope cuts. The brief's "Search" bullet asked for Users/Posts/Hashtags, which is what's built; a "recent searches" dropdown or a trending-queries panel would be a reasonable next iteration, not an oversight.
- **Frontend**: a debounced (`useDebouncedValue`, 300ms) typeahead dropdown in the navbar search bar backed by the combined preview endpoint, plus a full `/search?q=` page with People/Posts/Hashtags tabs (`Tabs` component from Phase 5's design system) each backed by its own fully-paginated endpoint and infinite scroll. The query lives in the URL (`?q=`) so results are shareable/bookmarkable, same reasoning as every other list page's cursor-in-query-string pattern.

### Phase 11 — Stories

- **Ephemerality is enforced twice, for different reasons**: every read query filters `expiresAt: { gt: now }` — that's what actually makes a story invisible after 24h, and it's correct even if the cleanup job below has never run. A new poller (`jobs/expireStories.ts`, every 15 minutes, same in-process-`setInterval` pattern and single-instance caveat as Phase 5's `publishScheduledPosts.ts`) then physically deletes expired rows and their storage objects. The query filter is the correctness guarantee; the job is just reclaiming Supabase Storage space and keeping `stories`/`story_views` from growing forever.
- **`Message.isRead`-style split, again**: `StoryView` (one row per viewer per story) is what actually powers both `hasViewed` (does *this* viewer's bubble get a ring) and the author-only viewer list — there's no separate denormalized counter. `_count.views` is computed from the same relation, so "5 people viewed this" and "here's who" can never drift apart.
- **Authors don't generate a self-view row**: opening your own story doesn't insert into `StoryView` (checked before the upsert in `recordView`) — otherwise every author would immediately show up in their own viewer list, which is meaningless. `hasUnseen` is hardcoded `false` for the viewer's own group in the tray for the same reason: there's no "unseen" state relative to yourself.
- **Story tray ordering**: own stories first (if any), then everyone followed with an unseen story before anyone fully seen, most-recently-posted within each bucket — the common pattern from Instagram/WhatsApp. This is computed in JS after one query rather than in SQL; the story tray is bounded by "people you follow with something active right now," which stays small, so grouping/sorting client-of-the-service-side isn't a real cost. Flagged in code as the thing to revisit if that assumption ever stops holding.
- **No captions, no story replies, no privacy-list overrides**: the `Story` model (from Phase 1) is just `authorId`/`mediaUrl`/`mediaType`/`expiresAt` — no text overlay, no "reply to a story" (which the brief's "Messaging" section technically implies but wasn't asked for explicitly under Stories), and no per-story visibility list (a story is visible to your followers, full stop — same as the rest of the app not yet having a "close friends" concept). All real, deliberately out-of-scope gaps, not silent ones.
- **Frontend progress bars are JS-driven, not pure CSS animation**: images auto-advance on a 50ms-tick interval updating a percentage in state (not a CSS `@keyframes` width animation) specifically so hold-to-pause can freeze at an exact, resumable position — a CSS animation's `animation-play-state: paused` would work too, but reading back *where* it paused to keep the bar visually in sync on resume is more fragile than just owning the number. Video stories skip the tick timer entirely and instead derive the same percentage from the `<video>` element's own `timeupdate` event (`currentTime / duration`), advancing on `ended` rather than a fixed duration — a 4-second clip and a 40-second clip both fill their segment at the correct real-time rate.

### Phase 10 — Messaging

- **DIRECT conversations are never duplicated**: `getOrCreateDirectConversation` looks for an existing `DIRECT` conversation between the two users before creating one, so starting a chat with someone you've already messaged reopens the same thread instead of forking a new one. There's no dedicated unique key for a user pair (would need a computed/sorted-pair column), so the lookup intersects each user's `DIRECT` conversations — fine at this scale, flagged in code as the thing to revisit if DM volume ever got heavy.
- **`Message.isRead` vs `ConversationParticipant.lastReadAt`**: the schema (from Phase 1) has both, and they do different jobs. `lastReadAt` is per-participant and drives the unread badge/count for every conversation type, including groups. `isRead` is a single flag on the message itself — unambiguous for a `DIRECT` chat (exactly one other possible reader) but meaningless for a group (whose "the" reader?). `markConversationRead` always updates `lastReadAt`; it only also flips `isRead` on the other side's messages when the conversation is `DIRECT`, which is what powers the sent/read blue-tick in the UI. Group chats intentionally don't get that tick.
- **Voice notes reuse the `IMAGE`/`VIDEO` `MediaType` enum** rather than adding a third value just for chat — a voice note is stored as `VIDEO` (an audio-only "video," i.e. no video track). The frontend tells a voice note apart from an actual attachment by rendering an `<audio>` player instead of an `<img>`, keyed off `mediaType` plus the message being in a conversation (posts never send audio). Recorded client-side with `MediaRecorder`, uploaded as-is — same "no transcoding pipeline" caveat Phase 5 already flagged for post videos.
- **No message search/typeahead for starting a DM**: Search is Phase 12, not built yet, so "New message" takes an exact `username` rather than a live search-as-you-type picker. This is a real, temporary limitation, not a hidden shortcut — revisit once Phase 12 ships a user-search endpoint.
- **Presence and typing indicators are Socket.IO rooms, not persisted state**: `registerSocketHandlers` now auto-joins every one of a user's conversation rooms on connect (a DB query at connect time), so `emitToConversation` reaches every participant without a per-message lookup, and `presence:update`/`typing:start`/`typing:stop` just broadcast to those same rooms. A user only flips to "online"/"offline" once, on their *first* socket connecting / *last* socket disconnecting — so having the app open in two tabs doesn't flicker their status. A conversation created *after* a participant already has a live connection (e.g. someone adds you to a group mid-session) wouldn't normally reach that socket until reconnect; `joinConversationRoom()` patches this by force-joining their currently-open sockets right after creation.
- **Chat notifications are skipped for online recipients**: `createAndBroadcastMessage` still always emits the realtime `message:new` event, but only calls `notificationService.create()` (Phase 9) when the recipient has no live socket connection — avoids a redundant bell notification for someone who's actively looking at the app. This mirrors the pattern of "the DB write/socket push are both best-effort and never block the send," just applied one level up.
- **Group chat membership is intentionally minimal**: you can create a group and leave it, but there's no add/remove-member or promote-admin flow yet — the schema (`ConversationParticipant`) supports it, the endpoints don't exist. `DIRECT` conversations can't be left (there's nothing meaningful to leave; block/mute — Phase 8's leftover scope — is the real tool for "I don't want to talk to this person").

### Phase 9 — Notifications

- **Centralized creation**: every trigger (like, comment, mention, follow, repost) used to call `prisma.notification.create(...)` inline, each with its own copy-pasted self-notification check and `.catch(() => null)`. That's now one function, `notificationService.create()`, that every other service calls into. Centralizing it wasn't just cleanup — it's what let realtime delivery (below) get added in one place instead of five.
- **Realtime delivery**: `notificationService.create()` does two things — writes the row, then pushes it over Socket.IO to `user:{recipientId}`, a private room each of a user's tabs/devices joins on connect. Both are best-effort; a socket push failure (or the user simply being offline) never fails the like/comment/follow action that triggered it, and the notification is still there next time they fetch. The DB write is the source of truth — the socket push is a convenience for instant delivery, not a second one.
- **Socket auth**: sockets didn't have any authentication before this phase — the Phase 1 stub accepted any connection. Added an `io.use()` handshake middleware that verifies the same short-lived access token used for REST requests (sent via `auth: { token }` on the client, not a query string, so it doesn't end up in server access logs). A connection with a missing or invalid token is rejected before `connection` ever fires.
- **Read state**: `PATCH /notifications/:id/read` and `PATCH /notifications/read-all`. Marking read is a separate action from viewing the list — the frontend calls it when a notification is actually opened (clicked), not just rendered, so scrolling past unread items in the dropdown doesn't silently clear them.
- **Unread count** is its own endpoint (`GET /notifications/unread-count`) rather than derived client-side from the list, since the badge needs to be accurate even before the (much heavier) paginated list has ever been fetched. The frontend also polls it every 60s as a fallback in case a socket event is ever missed — belt and suspenders, not a replacement for the realtime push.
- **Frontend socket client**: `lib/socket.ts` is a lazy singleton, not auto-connected — `useNotificationSocket()` (mounted once in the authenticated app shell) sets `socket.auth` to the current access token and connects once the user is logged in, and tears the connection down on logout. Known simplification, flagged in code: the token is only checked at handshake time, so a long-lived tab's socket doesn't get kicked if the access token expires mid-connection — real hardening would re-validate on an interval, not worth the complexity here.
- **Small cleanup while in the area**: `timeAgo()` was independently copy-pasted in `post-card.tsx` and `comment-item.tsx`. Notifications needed the same relative-time formatting a third time, so pulled it out to `lib/time.ts` instead of pasting a third copy.

### Phase 8 note

Phase 8 (Follow system) is checked off above but was actually implemented back in Phase 4 alongside the rest of the profile system (`Follow` model, follow/unfollow endpoints, followers/following lists) — see the Phase 4 notes below. The roadmap checkbox just hadn't been updated to reflect that until now. Block/mute/report (listed separately under "Social Features" in the brief) are not yet built and remain future work.

### Phase 7 — Likes

- **Schema consistency fix**: `Like` originally allowed a user to hold *multiple simultaneous* different-emoji reactions on the same post (`@@unique([postId, userId, emoji])`, from Phase 1). I changed this to `@@unique([postId, userId])` — one reaction per user, upsertable — to match `CommentLike`'s model from Phase 6. That original design was an inconsistency I introduced early on, not a deliberate feature; fixing it now while it's still free (no migration has run) rather than shipping two different reaction models in the same app.
- **`isLiked` is now derived from `viewerReaction !== null`**, and every post/comment carries the same shape: a `reactions: {emoji, count}[]` breakdown plus a single `viewerReaction`. Liking with a new emoji replaces your previous reaction rather than adding a second one — clicking the heart is shorthand for reacting with the default ❤️.
- **Reaction counts are computed from eagerly-loaded rows** (`post.likes`/`comment.likes`, same pattern for both), not a separate aggregation query. This is simple and correct at this project's scale, but a genuinely viral post with thousands of reactions would load thousands of rows per feed request — a real product would cache/pre-aggregate counts instead. Flagging the tradeoff rather than hiding it.
- Liking notifies the post author (skipped for self-likes), same pattern as comments/follows/mentions.
- Added a likers list page (`/posts/[id]/likes`) showing who reacted and with which emoji, cursor-paginated like every other list in the app.

### Phase 6 — Comments

- **Reactions vs. likes**: `CommentLike` gained an `emoji` field, but I kept the constraint as one reaction per user per comment (upsertable to a different emoji), not the multi-simultaneous-emoji model Post's `Like` uses. That's a deliberate divergence — Slack/Facebook-style single-reaction-per-user is the right pattern for comment reactions, and letting one user stack five emoji on the same comment isn't a more complete feature, just messier UX. "Like" and "custom emoji reaction" are the same underlying mechanism; a plain like is just reacting with the default ❤️.
- **Threading is flattened to two visual levels**: the schema supports infinite `parentId` nesting, but replying to a reply attaches to the *original top-level comment* (`rootId`), not the reply itself — matching how Instagram/Twitter actually render comment threads. Deeply nested reply chains are hard to read in a narrow feed card; this is a product decision, not a technical limitation.
- **Found and fixed a real bug from Phase 5** while building this: `Post._count.comments` wasn't filtering out soft-deleted comments, so a deleted comment would still inflate the visible count. Fixed by filtering the counted relation (`comments: { where: { deletedAt: null } }`) in both the post and its embedded `originalPost`.
- **Notifications** now carry an optional `commentId` (schema addition) so a comment/reaction notification can deep-link to the exact comment, not just the post.
- Comments are soft-deleted like posts, so a deleted comment's replies survive intact rather than being cascade-destroyed.

### Phase 5 — Posts

- **Feed types**: "Following" (posts from people you follow + your own, chronological) and "Latest" (global, chronological) are real cursor-paginated queries. "Trending" is a simplified engagement ranking (recent posts ordered by like count) over a 48h window with offset-based pagination — **not** a personalized recommendation algorithm; building one is a substantial project of its own, so I didn't fake it.
- **Visibility enforcement**: `buildVisibilityWhere()` in `post.service.ts` is the single place that decides what a viewer can see — it respects both the post's own visibility (`PUBLIC`/`FOLLOWERS`/`PRIVATE`) and the author's account-level `isPrivate` flag from Phase 4, which is now actually enforced server-side (Phase 4 could only note the intent since no posts existed yet).
- **Media pipeline**: images go through the same sharp→WebP compression as avatars (capped at 1920px, aspect ratio preserved this time instead of cropped). **Videos are stored as-is, uncompressed** — proper video transcoding needs an ffmpeg pipeline, which isn't part of this stack. This is a real gap, not a hidden shortcut; revisit if video posts need to be production-ready.
- **Scheduled posts** publish via an in-process `setInterval` poller (`src/jobs/publishScheduledPosts.ts`) checking every 60s. Fine for a single instance; **will double-publish if the API is ever horizontally scaled** — swap for a real job queue (BullMQ, or a Postgres-based queue) before that happens. Flagged in code comments too.
- **Repost model**: a repost is a `Post` row with `originalPostId` set. No caption = renders as a lightweight "X reposted" wrapper around the original; a caption = renders as a full post with the original embedded as a quote-preview. Reposting a repost is rejected (points at the original instead); reposting the same post twice is rejected.
- **Share** has no backend endpoint — there's no `shareCount` column, and adding one for what's functionally "copy a permalink to clipboard" felt like schema churn for no real behavior. It's a frontend-only action.
- **Likes/comments show as 0** — `_count` relations are wired up and the UI renders real counts, but the like-toggle and comment-creation endpoints are Phase 6/7's job, not built here.
- **Hashtags/mentions**: parsed from post content via regex (`src/utils/textParsing.ts`), synced to `Hashtag`/`PostHashtag`/`PostMention` join rows, and mentions trigger a notification. The mention regex uses a negative lookbehind so email addresses aren't misread as mentions.

### Phase 4 — Profile system

- **Image pipeline**: uploads go through `multer` (in-memory, type/size validated) → `sharp` (resized + re-encoded as WebP: 512×512 for avatars, 1500×500 for covers) → Supabase Storage. Nothing touches the API server's disk, and old images are deleted when replaced.
- **Follow system**: `Follow` join table with a compound unique constraint; blocked users can't follow each other in either direction; self-follow is rejected; following triggers a `Notification` row (best-effort — a notification failure doesn't fail the follow action).
- **Privacy**: `isPrivate` is a straightforward visibility flag on `User`, checked client-side for now (`canViewPosts` in the profile page) since there are no posts to actually gate yet — Phase 5 will enforce this server-side when post queries exist. This is intentionally **not** a full Instagram-style follow-request/approval flow (a separate model + accept/reject endpoints); flagging that as a deliberate scope decision rather than an oversight, since it's a meaningfully bigger feature than a visibility toggle.
- **Pagination**: added a shared cursor-based `paginate()` utility (`src/utils/pagination.ts`), used here for followers/following lists and designed for reuse by the feed, comments, and messages in later phases — cursor (row UUID) instead of page-number avoids the "items shift as new rows are inserted" bug on live lists.
- **Frontend**: profile page, followers/following lists (infinite scroll via `useInfiniteQuery`), and a settings area with tabbed Profile/Privacy pages — all using the design system and loading-skeleton pattern from Phase 1.

### Phase 3 — Database

- Full schema finalized: **26 models, 6 enums** covering every feature in the brief. See [`docs/database-schema.md`](docs/database-schema.md) for the ERD and the reasoning behind key decisions (UUID PKs, soft deletes on posts/comments, reaction modeling, repost self-relation, cascade rules).
- Added `directUrl` to the Prisma datasource for Supabase's connection-pooler pattern (pooled URL for the running app, direct URL for migrations).
- Added composite indexes for the actual access patterns the API needs: profile timelines, comment threads, chat pagination, notification feeds, active stories.
- Added `prisma/seed.ts` — generates 20 users, ~100 posts with media/likes/comments, and follows via `@faker-js/faker`. Run with `npm run prisma:seed`. Demo login: `demo@connecthub.dev` / password `Password123`.
- **Note:** this environment has no network/DB access, so the initial migration has not been executed here. Run `npm run prisma:migrate -- --name init` locally against your Postgres instance to generate and apply it — see [`docs/database-schema.md`](docs/database-schema.md#running-migrations) for the full workflow, including which constraints to hand-add to the generated SQL.

### Phase 2 — Authentication

- **Tokens**: short-lived access token (15m, returned in the JSON response, kept in memory client-side only) + long-lived refresh token (30d, httpOnly cookie scoped to `/api/v1/auth`, mirrored in the `refresh_tokens` table so individual sessions can be revoked server-side).
- **Refresh rotation**: every `/auth/refresh` call revokes the old refresh token and issues a new one, limiting the blast radius if a token is ever leaked.
- **Password reset invalidates all sessions**: `resetPassword` revokes every active refresh token for that user as a security best practice.
- **Account enumeration protection**: `login` returns the same error for "no such user" and "wrong password"; `forgotPassword` always returns success regardless of whether the email exists.
- **Email verification / password reset** use their own single-use, expiring DB-backed tokens (not embedded in a JWT), so a token can be invalidated the instant it's used.
- **Frontend**: access token lives only in a Zustand store (never `localStorage`) to limit XSS exposure. On app load, `AuthInitializer` silently calls `/auth/refresh` using the httpOnly cookie to restore the session. `apiClient` auto-retries once on a 401 by refreshing transparently.
- **Shared validation**: `packages/shared-types/src/auth.schema.ts` — the same Zod schemas validate the Next.js forms (via `zodResolver`) and the Express request bodies, so the two can never accept/reject different inputs.
- **Tests**: `apps/api/src/__tests__` covers password hashing, JWT sign/verify, `AppError` factories, and `authService` business logic against a mocked Prisma client (no live DB required to run `npm run test`).

## License

Private project — all rights reserved.
