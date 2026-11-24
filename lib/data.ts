// Tipos y formateadores compartidos. El catálogo y los rankings vienen de Supabase (SPEC 06).

export type Category = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type GameColor = "cyan" | "magenta" | "yellow" | "green";

export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: Category;
  /** Clase CSS de la portada: "cover-bricks", "cover-tetro", … */
  cover: string;
  color: GameColor;
  best: number;
  plays: string;
}

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  /** Formato "DD/MM/AAAA" */
  date: string;
}

export const CATS = [
  "TODOS",
  "ARCADE",
  "PUZZLE",
  "SHOOTER",
  "VERSUS",
] as const satisfies readonly ["TODOS", ...Category[]];
export type CategoryFilter = (typeof CATS)[number];

/** Formato numérico usado en toda la UI (separador de miles español). */
export function formatScore(n: number): string {
  return n.toLocaleString("es-ES");
}

/** Fecha de una puntuación en formato "DD/MM/AAAA" (hora local). */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

/** Tiempo relativo en español: "hace 2 min", "hace 3 h", "hace 5 d". */
export function formatAgo(iso: string, now: number = Date.now()): string {
  const min = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}
