"use client";
import { useState } from "react";
import { formatScore, type ScoreRow } from "@/lib/data";
import { routeToHash } from "@/lib/route";
import type { User } from "./ArcadeApp";
import { useGames } from "./GamesContext";
import { RankEmpty, RankError, RankSkeleton } from "./RankStates";
import { useLeaderboard, usePlayerBest } from "./useScores";
const topClass = (i: number) =>
  i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : "";
const pad2 = (n: number) => String(n).padStart(2, "0");
function PodiumSlot({
  row,
  place,
}: {
  row: ScoreRow | undefined;
  place: "gold" | "silver" | "bronze";
}) {
  const gold = place === "gold";
  const rank = gold ? "01" : place === "silver" ? "02" : "03";
  return (
    <div className={`podium-slot ${place}` + (row ? "" : " empty")}>
      {gold && (
        <div
          className="pixel"
          style={{ fontSize: 9, color: "var(--gold)", letterSpacing: "0.18em" }}
        >
          CAMPEÓN
        </div>
      )}
      <div
        className="rank-num"
        style={gold ? { fontSize: 36, marginTop: 4 } : undefined}
      >
        {rank}
      </div>
      <div className="name">{row?.name ?? "—"}</div>
      <div className="score" style={gold ? { fontSize: 20 } : undefined}>
        {row ? formatScore(row.score) : "—"}
      </div>
      <div className="date">{row?.date ?? ""}</div>
    </div>
  );
}
export default function HallOfFame({ user }: { user: User | null }) {
  const { games, getGame } = useGames();
  const [tab, setTab] = useState(games[0].id);
  const game = getGame(tab) ?? games[0];
  const board = useLeaderboard(game.id, 10);
  const best = usePlayerBest(game.id, user?.name ?? null);
  const rows = board.data ?? [];
  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>
      <div className="hall-tabs" role="group" aria-label="Elegir juego">
        {games.map((g) => (
          <button
            key={g.id}
            type="button"
            className={"chip" + (tab === g.id ? " active" : "")}
            aria-pressed={tab === g.id}
            onClick={() => setTab(g.id)}
          >
            {g.title}
          </button>
        ))}
      </div>
      {board.status === "ready" && rows.length > 0 && (
        <div className="podium">
          <PodiumSlot row={rows[1]} place="silver" />
          <PodiumSlot row={rows[0]} place="gold" />
          <PodiumSlot row={rows[2]} place="bronze" />
        </div>
      )}
      <div className="hall-table" aria-busy={board.status === "loading"}>
        <div className="th">
          <div>RANGO</div>
          <div>JUGADOR</div>
          <div>PUNTUACIÓN</div>
          <div>FECHA</div>
        </div>
        {board.status === "loading" && <RankSkeleton rows={10} />}
        {board.status === "error" && <RankError onRetry={board.retry} />}
        {board.status === "ready" && rows.length === 0 && (
          <RankEmpty
            title="SÉ EL PRIMERO EN ENTRAR"
            text={`Todavía nadie tiene marca en ${game.title}.`}
          />
        )}
        {board.status === "ready" &&
          rows.map((r, i) => (
            <div
              key={game.id + r.rank}
              className={"tr" + topClass(i)}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="rk">#{pad2(r.rank)}</div>
              <div className="pl">{r.name}</div>
              <div className="sc">{formatScore(r.score)}</div>
              <div className="dt">{r.date}</div>
            </div>
          ))}
        {user && board.status === "ready" && best.status !== "error" && (
          <>
            <div className="tr you-label">▸ TU MEJOR MARCA EN {game.title}</div>
            {best.status === "loading" && <RankSkeleton rows={1} />}
            {best.status === "ready" && !best.data && (
              <div
                className="tr you"
                style={{ animationDelay: `${rows.length * 50 + 50}ms` }}
              >
                <div className="rk" style={{ color: "var(--ink-faint)" }}>
                  —
                </div>
                <div className="pl" style={{ color: "var(--yellow)" }}>
                  {user.name}
                </div>
                <div
                  className="sc"
                  style={{ color: "var(--ink-dim)", textShadow: "none" }}
                >
                  AÚN SIN MARCA
                </div>
                <div className="dt" />
              </div>
            )}
            {best.status === "ready" && best.data && (
              <div
                className="tr you"
                style={{ animationDelay: `${rows.length * 50 + 50}ms` }}
              >
                <div className="rk" style={{ color: "var(--yellow)" }}>
                  #{pad2(best.data.rank)}
                </div>
                <div className="pl" style={{ color: "var(--yellow)" }}>
                  {user.name}
                </div>
                <div
                  className="sc"
                  style={{
                    color: "var(--yellow)",
                    textShadow: "0 0 6px rgba(245,255,0,0.5)",
                  }}
                >
                  {formatScore(best.data.score)}
                </div>
                <div className="dt">{best.data.date}</div>
              </div>
            )}
          </>
        )}
      </div>
      <div style={{ textAlign: "center", marginTop: 32 }}>
        <a className="btn lg" href={routeToHash({ name: "biblioteca" })}>
          VOLVER A LA BIBLIOTECA
        </a>
      </div>
    </div>
  );
}
