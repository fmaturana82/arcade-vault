"use client";

import { useRef, type MouseEvent } from "react";
import { formatScore, type Game } from "@/lib/data";
import { routeToHash } from "@/lib/route";

interface GameCardProps {
  game: Game;
  onSelect: (game: Game) => void;
}

const BTN_COLOR: Record<Game["color"], string> = {
  cyan: "",
  green: "",
  magenta: " magenta",
  yellow: " yellow",
};

export default function GameCard({ game, onSelect }: GameCardProps) {
  const tiltRef = useRef<HTMLDivElement>(null);

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = tiltRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `translateY(-6px) rotateX(${-py * 6}deg) rotateY(${px * 8}deg)`;
  };
  const onLeave = () => {
    if (tiltRef.current) tiltRef.current.style.transform = "";
  };

  return (
    // Clic en toda la carta para ratón; el enlace JUGAR es el acceso por teclado.
    <div ref={tiltRef} className="card" onMouseMove={onMove} onMouseLeave={onLeave} onClick={() => onSelect(game)}>
      <div className="cover" aria-hidden="true">
        <div className={"cover-bg " + game.cover}></div>
        <div className="label">{game.cat}</div>
      </div>
      <div className="meta">
        <div className="title">{game.title}</div>
        <div className="desc">{game.short}</div>
        <div className="row">
          <div className="score-badge">
            <span>MEJOR PUNTUACIÓN</span>
            <b>{formatScore(game.best)}</b>
          </div>
          <a
            className={"btn" + BTN_COLOR[game.color]}
            href={routeToHash({ name: "detalle", id: game.id })}
            aria-label={`Jugar ${game.title}`}
            onClick={(e) => e.stopPropagation()}
          >
            JUGAR
          </a>
        </div>
      </div>
    </div>
  );
}
