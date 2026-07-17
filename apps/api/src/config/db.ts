import { PrismaClient } from "@prisma/client";
import { env } from "./env";

/**
 * Prisma client singleton.
 * In dev, tsx watch restarts the module on every file save, which would
 * otherwise create a new PrismaClient (and a new DB connection pool) each time.
 * We stash the instance on globalThis to reuse it across reloads.
 */
declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined;
}

export const prisma =
  global.__prisma__ ??
  new PrismaClient({
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (env.NODE_ENV !== "production") {
  global.__prisma__ = prisma;
}
