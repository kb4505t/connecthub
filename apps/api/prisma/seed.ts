import { PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";
import { hashPassword } from "../src/utils/password";

const prisma = new PrismaClient();

const USER_COUNT = 20;
const POSTS_PER_USER = 5;
const MAX_FOLLOWS_PER_USER = 8;
const MAX_COMMENTS_PER_POST = 4;

/** Deterministic-ish demo password so seeded accounts are easy to log into locally. */
const DEMO_PASSWORD = "Password123";

/**
 * Retries a DB call a few times on transient connection errors (Prisma
 * error code P1001, "can't reach database server") before giving up.
 * Serverless/pooled Postgres connections occasionally drop mid-request —
 * this makes the seed script resilient to that instead of failing the
 * entire run on one flaky request.
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 1000): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isConnectionError = err instanceof Error && err.message.includes("P1001");
      if (!isConnectionError || attempt === retries) throw err;
      console.log(`\n  ⚠️  Connection hiccup, retrying (${attempt}/${retries})...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw new Error("unreachable");
}

async function main() {
  console.log("🌱 Seeding database...");

  // Wipe existing data (in FK-safe order) so the script is repeatable.
  console.log("  Clearing existing data...");
  await prisma.$transaction([
    prisma.notification.deleteMany(),
    prisma.message.deleteMany(),
    prisma.conversationParticipant.deleteMany(),
    prisma.conversation.deleteMany(),
    prisma.storyView.deleteMany(),
    prisma.story.deleteMany(),
    prisma.pollVote.deleteMany(),
    prisma.pollOption.deleteMany(),
    prisma.poll.deleteMany(),
    prisma.postMention.deleteMany(),
    prisma.postHashtag.deleteMany(),
    prisma.hashtag.deleteMany(),
    prisma.bookmark.deleteMany(),
    prisma.commentLike.deleteMany(),
    prisma.comment.deleteMany(),
    prisma.like.deleteMany(),
    prisma.media.deleteMany(),
    prisma.post.deleteMany(),
    prisma.mute.deleteMany(),
    prisma.block.deleteMany(),
    prisma.follow.deleteMany(),
    prisma.report.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.emailVerificationToken.deleteMany(),
    prisma.passwordResetToken.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  // --- Users ---
  console.log(`  Creating ${USER_COUNT} users...`);
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  // Sequential, not Promise.all — creating 20 users concurrently opens 20
  // simultaneous connections through Supabase's pooler at once, which is a
  // bad pattern against pooled/serverless Postgres and fails outright on
  // anything less than a rock-solid connection. One at a time is slower
  // but reliable, and this only runs once.
  const users = [];
  for (let i = 0; i < USER_COUNT; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const username = faker.internet.username({ firstName, lastName }).toLowerCase().replace(/[^a-z0-9_.]/g, "");
    const user = await withRetry(() =>
      prisma.user.create({
        data: {
          email: i === 0 ? "demo@connecthub.dev" : faker.internet.email({ firstName, lastName }).toLowerCase(),
          username: i === 0 ? "demo" : username,
          passwordHash,
          fullName: `${firstName} ${lastName}`,
          bio: faker.person.bio(),
          avatarUrl: faker.image.avatarGitHub(),
          isEmailVerified: true,
          isVerified: faker.datatype.boolean({ probability: 0.15 }),
        },
      })
    );
    users.push(user);
    process.stdout.write(`\r  Creating users... ${i + 1}/${USER_COUNT}`);
  }
  console.log();

  // --- Follows ---
  console.log("  Creating follow relationships...");
  for (const user of users) {
    const others = users.filter((u) => u.id !== user.id);
    const followCount = faker.number.int({ min: 1, max: MAX_FOLLOWS_PER_USER });
    const toFollow = faker.helpers.arrayElements(others, followCount);
    for (const target of toFollow) {
      await prisma.follow.upsert({
        where: { followerId_followingId: { followerId: user.id, followingId: target.id } },
        update: {},
        create: { followerId: user.id, followingId: target.id },
      });
    }
  }

  // --- Posts + Media ---
  console.log("  Creating posts...");
  const posts = [];
  for (const author of users) {
    for (let i = 0; i < POSTS_PER_USER; i++) {
      const hasImage = faker.datatype.boolean({ probability: 0.4 });
      const post = await withRetry(() =>
        prisma.post.create({
          data: {
            authorId: author.id,
            content: faker.lorem.sentences({ min: 1, max: 3 }),
            publishedAt: faker.date.recent({ days: 30 }),
            media: hasImage
              ? {
                  create: {
                    type: "IMAGE",
                    url: faker.image.urlPicsumPhotos({ width: 800, height: 600 }),
                    width: 800,
                    height: 600,
                    order: 0,
                  },
                }
              : undefined,
          },
        })
      );
      posts.push(post);
    }
    process.stdout.write(`\r  Creating posts... ${posts.length}/${users.length * POSTS_PER_USER}`);
  }
  console.log();

  // --- Likes ---
  console.log("  Creating likes...");
  for (const post of posts) {
    const likers = faker.helpers.arrayElements(users, faker.number.int({ min: 0, max: 10 }));
    for (const user of likers) {
      await prisma.like.create({ data: { postId: post.id, userId: user.id } }).catch(() => null); // ignore unique constraint collisions
    }
  }

  // --- Comments ---
  console.log("  Creating comments...");
  for (const post of posts) {
    const commentCount = faker.number.int({ min: 0, max: MAX_COMMENTS_PER_POST });
    for (let i = 0; i < commentCount; i++) {
      const author = faker.helpers.arrayElement(users);
      await prisma.comment.create({
        data: { postId: post.id, authorId: author.id, content: faker.lorem.sentence() },
      });
    }
  }

  console.log(`✅ Seeded ${users.length} users, ${posts.length} posts.`);
  console.log(`   Demo login → email: demo@connecthub.dev | username: demo | password: ${DEMO_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
