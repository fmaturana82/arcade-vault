// SPEC 06 — Catálogo de juegos leído de Supabase en el servidor y cacheado.
import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { Category, Game, GameColor } from "./data";
import { createPublicClient } from "./supabase/public";
export async function getGames(): Promise<Game[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("games");
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("games")
    .select("id, title, short, long, cat, cover, color, best, plays")
    .order("sort_order", { ascending: true });
  if (error) throw new Error(`No se pudo cargar el catálogo: ${error.message}`);
  if (!data || data.length === 0)
    throw new Error("El catálogo de juegos está vacío");
  return data.map((g) => ({
    id: g.id,
    title: g.title,
    short: g.short,
    long: g.long,
    cat: g.cat as Category,
    cover: g.cover,
    color: g.color as GameColor,
    best: g.best,
    plays: g.plays,
  }));
}
