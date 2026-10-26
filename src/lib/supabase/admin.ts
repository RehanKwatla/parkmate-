import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";

/**
 * Privileged Supabase Admin Client
 * SERVER-SIDE ONLY: Never import or execute in browser code.
 * Used for administrative verification, transaction fallbacks, and backend tasks.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
