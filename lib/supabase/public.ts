// SPEC 06 — Cliente público de Supabase para el servidor, sin cookies.
// Se usa dentro de funciones "use cache" (allí no se puede llamar a cookies()).
import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { getSupabaseEnv } from "./env";
export function createPublicClient(): SupabaseClient<Database> {
  const { url, publishableKey } = getSupabaseEnv();
  return createClient<Database>(url, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
