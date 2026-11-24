// SPEC 04 — Lectura de las variables públicas de Supabase.
// Se lee cada variable con su nombre literal para que Next.js la incruste
// en el bundle del navegador. Se llama al crear un cliente, no al importar.

export interface SupabaseEnv {
  url: string;
  publishableKey: string;
}

export function getSupabaseEnv(): SupabaseEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url) throw new Error("Falta NEXT_PUBLIC_SUPABASE_URL");
  if (!publishableKey)
    throw new Error("Falta NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

  return { url, publishableKey };
}
