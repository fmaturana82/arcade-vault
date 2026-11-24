"use client";

import { useEffect, useMemo, useReducer, useState } from "react";
import type { MeteoroStats } from "@/games/meteoro/engine";
import { formatScore } from "@/lib/data";
import { routeToHash } from "@/lib/route";
import type { Navigate, ScoreEntry, User } from "./ArcadeApp";
import { useGames } from "./GamesContext";
import MeteoroGame from "./games/MeteoroGame";

interface GamePlayerProps {
  id: string;
  user: User | null;
  navigate: Navigate;
  onSaveScore: (entry: ScoreEntry) => void;
}

// ---------- simulación de partida (no hay juego real) ----------
interface SimState {
  score: number;
  lives: number;
  level: number;
}
type SimAction = { type: "tick"; points: number } | { type: "reset" };

const INITIAL: SimState = { score: 0, lives: 3, level: 1 };
const METEORO_INITIAL: MeteoroStats = {
  score: 0,
  lives: 3,
  level: 1,
  tripleShot: 0,
};

function simReducer(state: SimState, action: SimAction): SimState {
  if (action.type === "reset") return INITIAL;
  const score = state.score + action.points;
  // Igual que la plantilla: sube de nivel al pasar cada ~2500 puntos.
  const level = score % 2500 < 100 ? state.level + 1 : state.level;
  return { ...state, score, level };
}

export default function GamePlayer({
  id,
  user,
  navigate,
  onSaveScore,
}: GamePlayerProps) {
  const { getGame } = useGames();
  const game = useMemo(() => getGame(id), [getGame, id]);
  const [sim, dispatch] = useReducer(simReducer, INITIAL);
  // METEORO es jugable: el HUD viene del motor. El resto de juegos sigue simulado.
  const isMeteoro = id === "meteoro";
  const [meteoro, setMeteoro] = useState<MeteoroStats>(METEORO_INITIAL);
  const [runId, setRunId] = useState(0);
  const { score, lives, level } = isMeteoro ? meteoro : sim;
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [saved, setSaved] = useState(false);
  // null = todavía no editado → se usa el nombre del usuario o INVITADO.
  const [nameInput, setNameInput] = useState<string | null>(null);
  const name = nameInput ?? user?.name ?? "INVITADO";

  useEffect(() => {
    if (!game) navigate({ name: "biblioteca" });
  }, [game, navigate]);

  useEffect(() => {
    if (over || paused || isMeteoro) return;
    const t = setInterval(
      () =>
        dispatch({ type: "tick", points: Math.floor(10 + Math.random() * 90) }),
      220,
    );
    return () => clearInterval(t);
  }, [over, paused, isMeteoro]);

  if (!game) return null;

  const restart = () => {
    dispatch({ type: "reset" });
    if (isMeteoro) setRunId((r) => r + 1);
    setPaused(false);
    setOver(false);
    setSaved(false);
  };

  const meteoroGameOver = (finalScore: number) => {
    setMeteoro((s) => ({ ...s, score: finalScore }));
    setOver(true);
  };
  const meteoroTogglePause = () => {
    if (!over) setPaused((p) => !p);
  };

  const save = () => {
    onSaveScore({ game: game.id, score, name });
    setSaved(true);
  };

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {name}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{formatScore(score)}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v" aria-label={`${lives} vidas`}>
              {"♥ ".repeat(lives).trim() || "—"}
            </div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, "0")}</div>
          </div>
          {isMeteoro && (
            <div
              className={
                "hud-stat shot" + (meteoro.tripleShot > 0 ? " on" : "")
              }
            >
              <div className="l">Disparo</div>
              <div className="v">
                {meteoro.tripleShot > 0
                  ? `3x ${meteoro.tripleShot.toFixed(1)}s`
                  : "—"}
              </div>
            </div>
          )}
        </div>
        <div className="hud-actions">
          <button
            type="button"
            className="btn yellow"
            onClick={() => setPaused((p) => !p)}
            disabled={over}
          >
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button
            type="button"
            className="btn magenta"
            onClick={() => setOver(true)}
            disabled={over}
          >
            FIN
          </button>
          <a
            className="btn ghost"
            href={routeToHash({ name: "detalle", id: game.id })}
          >
            SALIR
          </a>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          {isMeteoro ? (
            <MeteoroGame
              paused={paused || over}
              runId={runId}
              onStats={setMeteoro}
              onGameOver={meteoroGameOver}
              onTogglePause={meteoroTogglePause}
            />
          ) : (
            <div className="game-arena" aria-hidden="true">
              <div className="grid-floor"></div>
              <div className="enemy e1"></div>
              <div className="enemy e2"></div>
              <div className="enemy e3"></div>
              <div className="player-ship"></div>
            </div>
          )}
          {paused && (
            <div
              className="crt-content"
              style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}
              role="status"
            >
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  EN PAUSA
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    marginTop: 10,
                    letterSpacing: "0.16em",
                  }}
                >
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom" aria-hidden="true">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>
      {isMeteoro && (
        <p className="meteoro-controls">
          ←→ ROTAR · ↑ PROPULSAR · ESPACIO DISPARAR · P PAUSA
        </p>
      )}

      {over && (
        <div className="modal-bd">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="av-gameover-title"
          >
            <h2 id="av-gameover-title">FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{formatScore(score)}</div>
            {!saved ? (
              <div className="input-row">
                <input
                  value={name}
                  onChange={(e) =>
                    setNameInput(e.target.value.toUpperCase().slice(0, 10))
                  }
                  placeholder="TUS INICIALES"
                  aria-label="Tus iniciales"
                  maxLength={10}
                  autoFocus
                />
                <button type="button" className="btn yellow" onClick={save}>
                  GUARDAR PUNTUACIÓN
                </button>
              </div>
            ) : (
              <div className="toast-saved" role="status">
                ▸ PUNTUACIÓN GUARDADA_
              </div>
            )}
            <div className="actions">
              <button type="button" className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <a
                className="btn magenta"
                href={routeToHash({ name: "biblioteca" })}
              >
                VOLVER AL VAULT
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
