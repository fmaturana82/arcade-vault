"use client";
import { useEffect, useRef } from "react";
import {
  createMeteoroGame,
  H,
  W,
  type MeteoroGame as MeteoroEngine,
  type MeteoroStats,
} from "@/games/meteoro/engine";
interface MeteoroGameProps {
  paused: boolean;
  /** Cambia para pedir un reinicio (JUGAR DE NUEVO). */
  runId: number;
  onStats: (s: MeteoroStats) => void;
  onGameOver: (score: number) => void;
  onTogglePause: () => void;
}
/** Canvas de METEORO: monta el motor, lo destruye al desmontar y aplica pausa/reinicio. */
export default function MeteoroGame({
  paused,
  runId,
  onStats,
  onGameOver,
  onTogglePause,
}: MeteoroGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<MeteoroEngine | null>(null);
  // Callbacks siempre frescos sin recrear el motor.
  const callbacksRef = useRef({ onStats, onGameOver, onTogglePause });
  useEffect(() => {
    callbacksRef.current = { onStats, onGameOver, onTogglePause };
  });
  // Estado inicial de pausa leído al montar (el efecto de abajo sincroniza los cambios).
  const pausedRef = useRef(paused);
  useEffect(() => {
    pausedRef.current = paused;
  });
  // Montaje: backing store escalado por devicePixelRatio y motor. Seguro con el doble
  // montaje de Strict Mode: el cleanup destruye el motor (rAF + listeners).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const engine = createMeteoroGame(canvas, {
      onStats: (s) => callbacksRef.current.onStats(s),
      onGameOver: (score) => callbacksRef.current.onGameOver(score),
      onTogglePause: () => callbacksRef.current.onTogglePause(),
    });
    if (pausedRef.current) engine.pause();
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (paused) engine.pause();
    else engine.resume();
  }, [paused]);
  // Reinicio cuando cambia runId (se ignora el valor inicial).
  const lastRunId = useRef(runId);
  useEffect(() => {
    if (lastRunId.current === runId) return;
    lastRunId.current = runId;
    engineRef.current?.restart();
  }, [runId]);
  return (
    <canvas
      ref={canvasRef}
      className="meteoro-canvas"
      width={W}
      height={H}
      role="img"
      aria-label="METEORO: nave en un campo de meteoros"
    />
  );
}
