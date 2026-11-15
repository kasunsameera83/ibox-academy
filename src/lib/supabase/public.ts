import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Cookie-free client for public, published data (site settings, published
 * pages). It acts as a signed-out visitor, so RLS shows only what anyone
 * may see, and pages using it don't need the visitor's session.
 */
export function createPublicClient() {
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
