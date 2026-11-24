// SPEC 04 — Cliente de Supabase para Server Components, Server Actions y Route Handlers.
import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "./database.types";
import { getSupabaseEnv } from "./env";

export async function createClient(): Promise<SupabaseClient<Database>> {
  const { url, publishableKey } = getSupabaseEnv();
  // En Next 16 `cookies()` es asíncrona.
  const cookieStore = await cookies();

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Llamado desde un Server Component: ahí no se pueden escribir cookies.
          // Se ignora; el refresco de sesión en `proxy` llegará con la spec de auth.
        }
      },
    },
  });
}
