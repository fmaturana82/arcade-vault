// SPEC 06 — Consultas de rankings desde el navegador (RLS: solo lectura).
import { formatDate, type GameColor, type ScoreRow } from "./data";
import { createClient } from "./supabase/client";
export interface RecentScoreRow {
  name: string;
  score: number;
  createdAt: string;
  gameTitle: string;
  color: GameColor;
}
export interface TopTodayRow {
  rank: number;
  name: string;
  score: number;
}
export interface PlayerBest {
  rank: number;
  score: number;
  date: string;
}
/** Top N de un juego: score desc y, en empate, el más antiguo primero. */
export async function fetchLeaderboard(
  gameId: string,
  limit = 10,
): Promise<ScoreRow[]> {
  const { data, error } = await createClient()
    .from("scores")
    .select("name, score, created_at")
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data.map((r, i) => ({
    rank: i + 1,
    name: r.name,
    score: r.score,
    date: formatDate(r.created_at),
  }));
}
export async function fetchRecentScores(limit = 7): Promise<RecentScoreRow[]> {
  const { data, error } = await createClient()
    .from("scores")
    .select("name, score, created_at, games(title, color)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data.map((r) => ({
    name: r.name,
    score: r.score,
    createdAt: r.created_at,
    gameTitle: r.games?.title ?? "",
    color: (r.games?.color ?? "cyan") as GameColor,
  }));
}
export async function fetchTopPlayersToday(limit = 5): Promise<TopTodayRow[]> {
  const { data, error } = await createClient().rpc("top_players_today", {
    p_limit: limit,
  });
  if (error) throw error;
  return data.map((r, i) => ({ rank: i + 1, name: r.name, score: r.score }));
}
/** Mejor marca de un jugador en un juego y su rango (1 + filas con más puntos). */
export async function fetchPlayerBest(
  gameId: string,
  name: string,
): Promise<PlayerBest | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("scores")
    .select("score, created_at")
    .eq("game_id", gameId)
    .eq("name", name)
    .order("score", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { count, error: countError } = await supabase
    .from("scores")
    .select("id", { count: "exact", head: true })
    .eq("game_id", gameId)
    .gt("score", data.score);
  if (countError) throw countError;
  return {
    rank: (count ?? 0) + 1,
    score: data.score,
    date: formatDate(data.created_at),
  };
}
