"use client";
// SPEC 06 — Catálogo de juegos (leído en el servidor) disponible para toda la SPA.
import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Game } from "@/lib/data";
interface GamesValue {
  games: Game[];
  getGame: (id: string) => Game | undefined;
}
const GamesContext = createContext<GamesValue | null>(null);
export function GamesProvider({
  games,
  children,
}: {
  games: Game[];
  children: ReactNode;
}) {
  const value = useMemo<GamesValue>(() => {
    const byId = new Map(games.map((g) => [g.id, g]));
    return { games, getGame: (id) => byId.get(id) };
  }, [games]);
  return (
    <GamesContext.Provider value={value}>{children}</GamesContext.Provider>
  );
}
export function useGames(): GamesValue {
  const ctx = useContext(GamesContext);
  if (!ctx) throw new Error("useGames() debe usarse dentro de <GamesProvider>");
  return ctx;
}
