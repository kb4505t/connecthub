import { prisma } from "../config/db";
import { logger } from "../config/logger";

const CHECK_INTERVAL_MS = 60 * 1000; // check once a minute — fine-grained enough for "scheduled posts", cheap enough to poll

/**
 * Publishes any post whose `scheduledFor` time has arrived by setting
 * `publishedAt`, which is what every feed/profile query filters on.
 *
 * This is a simple in-process poller — no new infrastructure required, and
 * good enough for a single API instance. It is NOT safe for multiple
 * concurrent instances (they'd race to publish the same posts) — if this
 * API is ever horizontally scaled, replace this with a real job queue
 * (e.g. BullMQ + Redis, or a Postgres-based queue) with a locking scheme,
 * or an external cron hitting a dedicated endpoint. Flagging this now
 * rather than let it silently become a production bug later.
 */
async function publishDuePosts() {
  const due = await prisma.post.findMany({
    where: { scheduledFor: { lte: new Date() }, publishedAt: null, deletedAt: null },
    select: { id: true },
  });

  if (due.length === 0) return;

  await prisma.post.updateMany({
    where: { id: { in: due.map((p) => p.id) } },
    data: { publishedAt: new Date() },
  });

  logger.info(`Published ${due.length} scheduled post(s)`);
}

export function startScheduledPostsJob() {
  const intervalId = setInterval(() => {
    publishDuePosts().catch((err) => logger.error("Scheduled posts job failed:", err));
  }, CHECK_INTERVAL_MS);

  // Run once immediately on boot too, rather than waiting a full interval for the first check.
  publishDuePosts().catch((err) => logger.error("Scheduled posts job failed:", err));

  return () => clearInterval(intervalId);
}
