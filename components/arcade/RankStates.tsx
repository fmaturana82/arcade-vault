// SPEC 06 — Estados compartidos de los rankings: cargando, vacío y error.
/** Filas de "LED apagado" mientras llega el ranking. */
export function RankSkeleton({ rows }: { rows: number }) {
  return (
    <div className="rank-skeleton" role="status" aria-label="Cargando ranking">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="rs-row" aria-hidden="true">
          <span className="rs-led">88</span>
          <span
            className="rs-bar"
            style={{ width: `${70 - ((i * 13) % 35)}%` }}
          />
          <span className="rs-led">888.888</span>
        </div>
      ))}
    </div>
  );
}
export function RankEmpty({ title, text }: { title: string; text?: string }) {
  return (
    <div className="rank-msg">
      <div className="rm-title pixel">{title}</div>
      {text && <p className="rm-text">{text}</p>}
    </div>
  );
}
export function RankError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rank-msg error" role="alert">
      <div className="rm-title pixel">NO SE PUDO CARGAR EL RANKING</div>
      <p className="rm-text">Revisa tu conexión y vuelve a intentarlo.</p>
      <button type="button" className="btn magenta" onClick={onRetry}>
        REINTENTAR
      </button>
    </div>
  );
}
