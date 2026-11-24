"use client";
// SPEC 06 — El catálogo de Supabase no respondió: pantalla de "sin señal" con reintento.
import { useEffect } from "react";
export default function Error({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="av-main">
      <section
        className="vault-offline"
        role="alert"
        aria-labelledby="vault-offline-title"
      >
        <div className="vo-screen" aria-hidden="true">
          <div className="vo-roll" />
          <div className="vo-nosignal pixel">SIN SEÑAL</div>
        </div>
        <h1 id="vault-offline-title" className="vo-title">
          VAULT FUERA DE LÍNEA
        </h1>
        <p className="vo-text">
          No pudimos conectar con el catálogo de juegos. Revisa tu conexión y
          vuelve a intentarlo.
        </p>
        <button
          type="button"
          className="btn lg magenta"
          onClick={() => retry()}
        >
          REINTENTAR
        </button>
      </section>
    </main>
  );
}
