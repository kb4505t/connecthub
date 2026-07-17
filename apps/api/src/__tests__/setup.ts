// Provides dummy-but-valid environment variables so `src/config/env.ts`'s
// Zod validation passes when the test suite imports modules that depend on it.
// Real secrets are never used here — these values only need to satisfy the schema.
process.env.NODE_ENV = "test";
process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/connecthub_test";
process.env.SUPABASE_URL ??= "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "test-service-role-key";
process.env.SUPABASE_ANON_KEY ??= "test-anon-key";
process.env.JWT_ACCESS_SECRET ??= "test-access-secret-that-is-at-least-32-chars";
process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret-that-is-at-least-32-chars";
process.env.CLIENT_URL ??= "http://localhost:3000";
