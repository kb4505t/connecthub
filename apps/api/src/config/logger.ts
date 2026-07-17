import winston from "winston";
import { env } from "./env";

/**
 * Centralized logger. Using Winston instead of console.log so that:
 * - logs are structured and leveled (error/warn/info/debug)
 * - production logs can be shipped to a log aggregator later without code changes
 * - dev logs are colorized and readable
 */
export const logger = winston.createLogger({
  level: env.NODE_ENV === "production" ? "info" : "debug",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    env.NODE_ENV === "production" ? winston.format.json() : winston.format.combine(winston.format.colorize(), winston.format.simple())
  ),
  transports: [new winston.transports.Console()],
});
