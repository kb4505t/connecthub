import "dotenv/config";
import { z } from "zod";

/**
 * All environment variables the API needs, validated once at startup.
 * If any required var is missing or malformed, the process exits immediately
 * with a clear error instead of failing later in a random request handler.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),

  // Database
  DATABASE_URL: z.string().url({ message: "DATABASE_URL must be a valid connection string" }),

  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_ANON_KEY: z.string().min(1),

  // Auth
  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET should be at least 32 characters"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET should be at least 32 characters"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("30d"),

  // CORS
  // Comma-separated list, e.g. "https://connecthub.vercel.app,https://connecthub-git-staging-x.vercel.app"
  // A single origin (the common case) works unchanged — it's just a list of one.
  CLIENT_URL: z
    .string()
    .default("http://localhost:3000")
    .refine(
      (val) => val.split(",").every((origin) => {
        try {
          new URL(origin.trim());
          return true;
        } catch {
          return false;
        }
      }),
      { message: "CLIENT_URL must be a comma-separated list of valid URLs" }
    ),

  // Email (transactional emails: verification, password reset)
  EMAIL_FROM: z.string().default("ConnectHub <noreply@connecthub.dev>"),
  RESEND_API_KEY: z.string().optional(), // if unset, emails are logged to console instead of sent

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
});

type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("❌ Invalid environment variables:");
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
  }

  return parsed.data;
}

export const env = loadEnv();

/** CLIENT_URL as a trimmed array — the form CORS/Socket.IO configs actually want. */
export const allowedOrigins: string[] = env.CLIENT_URL.split(",").map((origin) => origin.trim());
