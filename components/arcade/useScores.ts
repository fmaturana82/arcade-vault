"use client";
// SPEC 06 — Hooks de rankings. Cada petición lleva una clave; las respuestas
// de claves antiguas (otra pestaña u otro juego) se descartan.
import { useCallback, useEffect, useState } from "react";
import type { ScoreRow } from "@/lib/data";
import {
  fetchLeaderboard,
  fetchPlayerBest,
  fetchRecentScores,
  fetchTopPlayersToday,
  type PlayerBest,
  type RecentScoreRow,
  type TopTodayRow,
} from "@/lib/scores";
export type Query<T> = {
  status: "loading" | "ready" | "error";
  data: T | null;
  retry: () => void;
};
type Result<T> = { key: string; status: "ready" | "error"; data: T | null };
function useQuery<T>(key: string | null, fetcher: () => Promise<T>): Query<T> {
  const [attempt, setAttempt] = useState(0);
  const fullKey = key === null ? null : `${key}#${attempt}`;
  const [result, setResult] = useState<Result<T> | null>(null);
  useEffect(() => {
    if (fullKey === null) return;
    let alive = true;
    fetcher().then(
      (data) => alive && setResult({ key: fullKey, status: "ready", data }),
      (err: unknown) => {
        console.error(err);
        if (alive) setResult({ key: fullKey, status: "error", data: null });
      },
    );
    return () => {
      alive = false;
    };
    // `fetcher` cambia en cada render; la clave identifica la petición.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullKey]);
  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  if (fullKey === null) return { status: "ready", data: null, retry };
  if (!result || result.key !== fullKey)
    return { status: "loading", data: null, retry };
  return { status: result.status, data: result.data, retry };
}
export function useLeaderboard(gameId: string, limit = 10): Query<ScoreRow[]> {
  return useQuery(`lb:${gameId}:${limit}`, () =>
    fetchLeaderboard(gameId, limit),
  );
}
export function useRecentScores(limit = 7): Query<RecentScoreRow[]> {
  return useQuery(`recent:${limit}`, () => fetchRecentScores(limit));
}
export function useTopPlayersToday(limit = 5): Query<TopTodayRow[]> {
  return useQuery(`today:${limit}`, () => fetchTopPlayersToday(limit));
}
/** Sin usuario no se consulta nada (data = null). */
export function usePlayerBest(
  gameId: string,
  name: string | null,
): Query<PlayerBest | null> {
  return useQuery(name ? `best:${gameId}:${name}` : null, () =>
    fetchPlayerBest(gameId, name as string),
  );
}
