import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";

import { createApp } from "./app";
import { env, allowedOrigins } from "./config/env";
import { logger } from "./config/logger";
import { prisma } from "./config/db";
import { registerSocketHandlers } from "./realtime/socket";
import { startScheduledPostsJob } from "./jobs/publishScheduledPosts";
import { startExpireStoriesJob } from "./jobs/expireStories";

async function bootstrap() {
  const app = createApp();
  const httpServer = createServer(app);

  // Socket.IO shares the same HTTP server so both REST and WS traffic
  // go through one process/port — simpler to deploy on Render than two services.
  const io = new SocketIOServer(httpServer, {
    cors: { origin: allowedOrigins, credentials: true },
  });
  registerSocketHandlers(io);

  // Verify DB connectivity before accepting traffic.
  try {
    await prisma.$connect();
    logger.info("✅ Database connected");
  } catch (err) {
    logger.error("❌ Failed to connect to database", err);
    process.exit(1);
  }

  httpServer.listen(env.PORT, () => {
    logger.info(`🚀 ConnectHub API running on port ${env.PORT} [${env.NODE_ENV}]`);
  });

  const stopScheduledPostsJob = startScheduledPostsJob();
  const stopExpireStoriesJob = startExpireStoriesJob();

  // Graceful shutdown — important for Docker/Render restarts and rolling deploys.
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received. Shutting down gracefully...`);
    stopScheduledPostsJob();
    stopExpireStoriesJob();
    httpServer.close(async () => {
      await prisma.$disconnect();
      logger.info("Server closed. Goodbye.");
      process.exit(0);
    });
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

bootstrap().catch((err) => {
  logger.error("Fatal error during bootstrap:", err);
  process.exit(1);
});
