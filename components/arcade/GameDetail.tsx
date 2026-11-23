"use client";

import { useEffect, useMemo } from "react";
import { formatScore, getGame, seededScores } from "@/lib/data";
import { routeToHash } from "@/lib/route";
import type { Navigate } from "./ArcadeApp";

const topClass = (i: number) => (i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : "");

export default function GameDetail({ id, navigate }: { id: string; navigate: Navigate }) {
  const game = useMemo(() => getGame(id), [id]);
  const scores = useMemo(() => seededScores(id.length * 17 + 3, 10), [id]);

  // Id inexistente → Biblioteca.
  useEffect(() => {
    if (!game) navigate({ name: "biblioteca" });
  }, [game, navigate]);

  if (!game) return null;

  return (
    <div className="av-detail fade-in">
      <div>
        <div className="detail-cover" aria-hidden="true">
          <div className={"cover-bg " + game.cover}></div>
        </div>
        <div style={{ marginTop: 20 }} className="detail-info">
          <div className="detail-tags">
            <span>{game.cat}</span>
            <span>1 JUGADOR</span>
            <span>TECLADO / TÁCTIL</span>
            <span>RETRO 1985</span>
          </div>
          <h2 className="neon-cyan">{game.title}</h2>
          <p>{game.long}</p>
          <div className="stat-strip">
            <div>
              <div className="l">Partidas</div>
              <div className="v">{game.plays}</div>
            </div>
            <div>
              <div className="l">Mejor global</div>
              <div className="v" style={{ color: "var(--magenta)", textShadow: "0 0 6px rgba(255,0,110,0.5)" }}>
                {formatScore(game.best)}
              </div>
            </div>
            <div>
              <div className="l">Dificultad</div>
              <div
                className="v"
                style={{ color: "var(--yellow)", textShadow: "0 0 6px rgba(245,255,0,0.5)" }}
                aria-label="Dificultad 3 de 5"
              >
                ★ ★ ★ ☆ ☆
              </div>
            </div>
          </div>
          <div className="detail-actions">
            <a className="btn xl pulse" href={routeToHash({ name: "player", id: game.id })}>
              ▶  JUGAR AHORA
            </a>
            <a className="btn ghost lg" href={routeToHash({ name: "biblioteca" })}>
              VOLVER AL VAULT
            </a>
          </div>
        </div>
      </div>

      <aside aria-label="Mejores puntuaciones">
        <div className="leaderboard">
          <h3>MEJORES PUNTUACIONES</h3>
          {scores.map((r, i) => (
            <div key={r.name} className={"lb-row" + topClass(i)}>
              <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
              <div className="pl">
                {r.name}
                <div style={{ fontSize: 10, color: "var(--ink-faint)", letterSpacing: "0.1em" }}>{r.date}</div>
              </div>
              <div className="sc">{formatScore(r.score)}</div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
