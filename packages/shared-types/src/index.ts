/**
 * Shared Zod schemas and TypeScript types used by BOTH apps/api and apps/web.
 * Each phase adds its own file here, e.g. auth.schema.ts, post.schema.ts,
 * and re-exports it below — keeping request validation and TS types
 * perfectly in sync between frontend forms and backend endpoints.
 *
 * Example (added in Phase 2):
 *   export * from "./auth.schema";
 */

export * from "./auth.schema";
export * from "./user.schema";
export * from "./post.schema";
export * from "./comment.schema";
export * from "./notification.schema";
export * from "./message.schema";
export * from "./story.schema";
export * from "./search.schema";
export * from "./admin.schema";
