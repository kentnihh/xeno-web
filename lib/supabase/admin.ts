import { createClient } from "@supabase/supabase-js";

/**
 * Creates Supabase admin client for backend operations (e.g. auth.admin.createUser).
 * Requires SUPABASE_SERVICE_ROLE_KEY. Falls back to anon key in dev with warning.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey) {
    // ponytail: fall back to anon key in development only; production must set SUPABASE_SERVICE_ROLE_KEY
    const fallbackKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    if (process.env.NODE_ENV === "production") {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY is required in production for admin operations.");
    }
    console.warn("[admin] SUPABASE_SERVICE_ROLE_KEY missing — falling back to anon key. Admin operations may fail.");
    return createClient(url, fallbackKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
