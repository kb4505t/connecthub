import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import morgan from "morgan";

import { env, allowedOrigins } from "./config/env";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler";
import { globalRateLimiter } from "./middlewares/rateLimiter";
import { apiRouter } from "./routes";

export function createApp(): Application {
  const app = express();

  // Render (and most PaaS hosts) terminate TLS at a load balancer and proxy
  // to this container over plain HTTP. Without `trust proxy`, Express trusts
  // none of the `X-Forwarded-*` headers, which breaks two things in
  // production: `req.ip` becomes the proxy's IP (so express-rate-limit
  // buckets every real user together), and `req.secure` reads false (so a
  // cookie's `secure` flag can't be trusted to reflect the real connection).
  // `1` means "trust exactly one hop" — correct for a single load balancer
  // in front of the app, and deliberately not `true` (trust all hops),
  // which would let a client spoof its own IP via X-Forwarded-For.
  if (env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  // --- Security & parsing middleware ---
  app.use(helmet()); // sets security-related HTTP headers (XSS, sniffing, etc protection)
  app.use(
    cors({
      origin: allowedOrigins, // array of allowed origins (prod domain + any preview URLs)
      credentials: true, // allow cookies (refresh token) to be sent cross-origin
    })
  );
  app.use(compression()); // gzip responses
  app.use(express.json({ limit: "10mb" })); // 10mb to allow base64 image payloads if ever needed
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(morgan(env.NODE_ENV === "development" ? "dev" : "combined"));

  // --- Rate limiting (applied globally; stricter limits added per-route later, e.g. auth) ---
  app.use(globalRateLimiter);

  // --- Health check (used by Docker/Render for readiness probes) ---
  app.get("/health", (_req, res) => {
    res.status(200).json({ success: true, status: "ok", timestamp: new Date().toISOString() });
  });

  // --- API routes ---
  app.use("/api/v1", apiRouter);

  // --- 404 + global error handler (must be last) ---
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
