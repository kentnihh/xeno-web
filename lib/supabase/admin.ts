import { createClient } from "@supabase/supabase-js";

/**
 * Creates Supabase admin client for backend operations (e.g. auth.admin.createUser).
 * Uses SUPABASE_SERVICE_ROLE_KEY or fallback.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";

  // ponytail: falls back to anon key if service role missing; createUser requires service role in production
  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
