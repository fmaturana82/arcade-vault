// SPEC 04 — Comprueba la conexión con Supabase sin tocar la app.
// Uso: npm run supabase:check  (lee .env.local con --env-file)
import { createClient } from "@supabase/supabase-js";

function fail(reason: string): never {
  console.error(`✖ Supabase ERROR: ${reason}`);
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url) fail("Falta NEXT_PUBLIC_SUPABASE_URL");
if (!publishableKey) fail("Falta NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

try {
  // Valida que el SDK acepta la URL y la clave.
  createClient(url, publishableKey, { auth: { persistSession: false } });

  const res = await fetch(new URL("/auth/v1/health", url), {
    headers: { apikey: publishableKey },
  });
  if (!res.ok) fail(`HTTP ${res.status} en /auth/v1/health`);

  console.log(`✔ Supabase OK (${url})`);
} catch (err) {
  fail(err instanceof Error ? err.message : "error desconocido");
}
