import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

/**
 * Server-only Supabase client using the service role key — bypasses Row
 * Level Security, so this must never be imported into frontend code or
 * exposed to the client. Used exclusively for Storage operations (avatar/
 * cover uploads); auth itself is handled by our own JWT system (Phase 2),
 * not Supabase Auth.
 */
export const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export const STORAGE_BUCKETS = {
  avatars: "avatars",
  covers: "covers",
  postMedia: "post-media",
} as const;
