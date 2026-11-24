# SPEC 05 — Juego METEORO jugable en canvas

**Estado:** Implementado.
**Depende de:** SPEC 01 (`01-mvp-pantallas-visuales.md`)
**Fecha:** 2026-11-24
**Objetivo:** Añadir al catálogo el juego nuevo METEORO (`meteoro`), portado a TypeScript desde `references/started-games/02-asteroids/` y jugable en canvas en `#/juegos/meteoro/jugar`, integrado con el HUD, la pausa y el modal de fin de partida de la plataforma.

---

## Alcance

### Entra
- **Ficha nueva en `lib/data.ts`**, añadida al final de `GAMES`:
  - `id: "meteoro"`, `title: "METEORO"`, `cat: "SHOOTER"`, `color: "cyan"`, `cover: "cover-meteoro"`, `best: 36500`, `plays: "8.2K"`.
  - `short`: "Sobrevive a la lluvia de meteoros en el vacío."
  - `long`: "Pilotas una nave vectorial atrapada en un campo de meteoros que no deja de fragmentarse. Rota, acelera y dispara: cada impacto parte la roca en trozos más rápidos. Recoge el núcleo magenta para disparar en abanico."
  - Aparece en Biblioteca (filtro SHOOTER y TODOS), en Detalle (`#/juegos/meteoro`) y en las pestañas del Salón de la Fama. No aparece en la Home, que muestra los 6 primeros.
- **Portada CSS nueva** `.cover-meteoro` en `app/globals.css`, con la misma técnica que las demás portadas (fondo + `::before` / `::after`) y acento cian, distinta de `.cover-rocas`.
- **Motor del juego** en TypeScript puro (sin React) en `games/meteoro/engine.ts`, port fiel de `game.js`: clases `Bullet`, `Asteroid`, `PowerUp`, `Ship`, `Particle`, mundo toroidal 800×600, `dt` limitado a 50 ms.
- **Mecánicas idénticas al original:** 3 vidas, invencibilidad de 3 s con parpadeo al reaparecer, 2 s de espera tras morir, puntos 20/50/100 (grande/mediano/pequeño), división de rocas, nivel N con `3 + N` rocas grandes (4 en el nivel 1), zona segura de 130 px, power-up de disparo triple (15 % por destrucción, garantizado a las 5, uno por nivel, dura 5 s, caduca a los 12 s), cooldown de disparo 0,2 s.
- **API del motor:** `createMeteoroGame(canvas, callbacks)` devuelve `{ pause, resume, restart, destroy }`. Gestiona su propio `requestAnimationFrame` y sus listeners de teclado, y los elimina en `destroy()`.
- **Estética neón:** mismas formas vectoriales, con la paleta del vault: nave cian, rocas amarillas, balas blancas, power-up magenta, partículas que se desvanecen y glow suave con `shadowBlur`. El canvas no dibuja HUD ni texto de GAME OVER. Se diseña siguiendo el skill `/frontend-design` (CLAUDE.md).
- **Canvas nítido:** resolución lógica 800×600 escalada por `devicePixelRatio`. Por CSS ocupa el 100 % de `.crt-screen` (que ya es 4:3).
- **Wrapper React** `components/arcade/games/MeteoroGame.tsx` (`"use client"`), específico de este juego: crea el motor en `useEffect` con un `useRef` al canvas, lo destruye al desmontar y aplica pausa y reinicio según sus props.
- **Integración en `GamePlayer.tsx`:** si `id === "meteoro"`, se monta `MeteoroGame` dentro de `.crt-screen` en lugar de `.game-arena`, y el HUD se alimenta del motor. El resto de juegos, `rocas` incluido, siguen con la simulación actual sin cambios.
- **HUD de la plataforma:** Puntuación, Vidas (♥) y Nivel vienen del motor. Solo en METEORO se añade un `hud-stat` "DISPARO", que muestra `3x 4.2s` mientras el power-up está activo y `—` cuando no.
- **Controles de teclado:** `←` `→` rotar, `↑` propulsar, `Espacio` disparar, `P` / `Escape` pausar o reanudar. Mientras el juego está montado y el foco no está en un `input`, se hace `preventDefault` de flechas y Espacio para que la página no haga scroll.
- **Pausa:** el botón PAUSA/REANUDAR y la tecla P/Escape detienen el motor (el bucle no avanza) y muestran el overlay "EN PAUSA" existente.
- **Fin de partida:** al perder la última vida (tras ~1 s de explosión) o al pulsar FIN, se abre el modal "FIN DEL JUEGO" existente con la puntuación real. GUARDAR PUNTUACIÓN usa el `onSaveScore` actual (`localStorage`, `av_scores`). JUGAR DE NUEVO llama a `restart()`. Espacio ya no reinicia dentro del canvas.
- **Pista de controles** bajo el CRT, solo en METEORO: "←→ ROTAR · ↑ PROPULSAR · ESPACIO DISPARAR · P PAUSA".

### No entra
- Guardar puntuaciones en Supabase (tablas, RLS, auth).
- Llevar otros juegos a canvas (`03-tetris`, `04-arkanoid` u otras fichas), cada uno irá en su propia spec.
- Extraer un componente o motor genérico reutilizable entre juegos (`GameCanvas`, registro de juegos, interfaz común). `MeteoroGame` y su motor son específicos.
- Controles táctiles, botones en pantalla o adaptación jugable a móvil.
- Cambiar el juego `rocas`: su ficha, portada, detalle y simulación quedan intactos.
- WASD u otros mapeos de teclas.
- Mecánicas nuevas (OVNIs, hiperespacio, más power-ups) y sonido.
- Autopausa al cambiar de pestaña (el límite de `dt` evita saltos).
- Tests automatizados (no hay test runner).

---

## Modelo de datos

No hay persistencia nueva. Se reutilizan `Game`, `ScoreEntry` y `av_scores`.

### `lib/data.ts` (modificado)
Nueva entrada `Game` con `id: "meteoro"` al final de `GAMES` (valores en Alcance). Sin cambios de tipos.

### `games/meteoro/engine.ts` (nuevo)
```ts
export interface MeteoroStats {
  score: number;
  lives: number;
  level: number;
  /** Segundos restantes de disparo triple; 0 si no está activo. */
  tripleShot: number;
}

export interface MeteoroCallbacks {
  /** Solo se llama cuando cambia algún valor (tripleShot redondeado a 0,1 s). */
  onStats: (stats: MeteoroStats) => void;
  onGameOver: (finalScore: number) => void;
  /** Tecla P / Escape. */
  onTogglePause: () => void;
}

export interface MeteoroGame {
  pause(): void;
  resume(): void;
  restart(): void;
  destroy(): void;
}

export function createMeteoroGame(canvas: HTMLCanvasElement, callbacks: MeteoroCallbacks): MeteoroGame;
```
Estado interno: `"playing" | "dead" | "gameover"` como en el original, más `paused: boolean`.

### `components/arcade/games/MeteoroGame.tsx` (nuevo)
```ts
interface MeteoroGameProps {
  paused: boolean;
  /** Cambia para pedir un reinicio (JUGAR DE NUEVO). */
  runId: number;
  onStats: (s: MeteoroStats) => void;
  onGameOver: (score: number) => void;
  onTogglePause: () => void;
}
```

---

## Plan de implementación

1. **Ficha y portada.** Añadir la entrada `meteoro` a `GAMES` y la clase `.cover-meteoro` a `app/globals.css` (con `/frontend-design`). `#/juegos/meteoro` muestra el detalle y `#/juegos/meteoro/jugar` la simulación. `npm run build` pasa.
2. **Motor base.** Crear `games/meteoro/engine.ts` con utilidades, clases tipadas y bucle, portando `game.js`. `npm run lint` pasa.
3. **API y callbacks.** Añadir `createMeteoroGame`, `pause/resume/restart/destroy`, `onStats` (solo en cambios), `onGameOver` (~1 s tras la última vida) y `onTogglePause`. Quitar del canvas el HUD, el GAME OVER y el reinicio con Espacio. Listeners de teclado con limpieza y `preventDefault` de flechas/Espacio fuera de inputs.
4. **Wrapper React.** Crear `components/arcade/games/MeteoroGame.tsx` con canvas escalado por `devicePixelRatio` y montaje y desmontaje limpios (también con el doble montaje de Strict Mode).
5. **Integración en GamePlayer.** Rama `id === "meteoro"`: estado desde `onStats`; PAUSA y P/Escape controlan `paused`; FIN y `onGameOver` abren el modal con la puntuación real; JUGAR DE NUEVO incrementa `runId`. Añadir el stat "DISPARO" y la pista de controles. Los demás juegos no cambian. `npm run build` pasa.
6. **Estética neón.** Con `/frontend-design`: paleta cian/amarillo/magenta, glow, partículas. CSS mínimo en `app/globals.css` (canvas al 100 % del CRT, pista de controles).
7. **Verificación.** `npm run lint`, `npm run build` y prueba manual con Playwright (capturas en `.playwright-screenshots/`).

Archivos nuevos: `games/meteoro/engine.ts`, `components/arcade/games/MeteoroGame.tsx`.
Archivos modificados: `lib/data.ts`, `components/arcade/GamePlayer.tsx`, `app/globals.css`.

---

## Criterios de aceptación

- [x] `npm run lint` y `npm run build` terminan sin errores.
- [x] Biblioteca muestra la tarjeta METEORO (SHOOTER, cian) con la portada `.cover-meteoro`, distinta de la de ROCAS. Aparece con los filtros TODOS y SHOOTER.
- [x] `#/juegos/meteoro` muestra el detalle con el título, el texto, `36.500` como mejor global y `8.2K` partidas. El Salón de la Fama tiene la pestaña METEORO.
- [x] En `#/juegos/meteoro/jugar` se ve un `<canvas>` dentro de `.crt-screen` con la nave en el centro y 4 rocas grandes. No aparece `.game-arena`.
- [x] `←` `→` rotan la nave, `↑` la propulsa y `Espacio` dispara. Pulsar flechas o Espacio no hace scroll de la página.
- [x] Destruir una roca grande suma 20, una mediana 50 y una pequeña 100 en el HUD "Puntuación".
- [x] Al chocar, el HUD "Vidas" baja un ♥ y la nave reaparece parpadeando tras 2 s.
- [x] Al vaciar el campo, el HUD "Nivel" pasa a `02` y aparecen 5 rocas grandes.
- [x] Al recoger el power-up, el HUD "DISPARO" muestra `3x` con cuenta atrás y salen 3 balas por disparo durante 5 s.
- [x] PAUSA y la tecla `P` (o `Escape`) congelan el juego y muestran "EN PAUSA". REANUDAR o `P` lo continúan desde el mismo estado.
- [x] Al perder la tercera vida se abre "FIN DEL JUEGO" con la misma puntuación que el HUD. FIN abre el mismo modal en cualquier momento y el juego queda detenido.
- [x] GUARDAR PUNTUACIÓN añade `{ game: "meteoro", score, name, at }` a `av_scores` en `localStorage`.
- [x] JUGAR DE NUEVO reinicia a puntuación 0, 3 vidas y nivel 01.
- [x] Al salir con SALIR o cambiar de ruta no quedan bucles ni listeners activos: las flechas vuelven a hacer scroll y la consola no muestra errores.
- [x] Escribir en el input de iniciales del modal (incluido Espacio) no dispara ni mueve la nave.
- [x] El canvas se ve nítido con `devicePixelRatio` 2 y llena el CRT sin deformarse a 1280 px de ancho.
- [x] Los colores son neón (nave cian, rocas amarillas, power-up magenta) y el canvas no dibuja HUD propio.
- [x] `#/juegos/rocas/jugar` y el resto de juegos siguen mostrando la simulación actual, y la ficha `rocas` de `lib/data.ts` no cambia (`git diff` solo añade la entrada `meteoro`).
- [x] Ningún texto visible de la plataforma usa el nombre "Asteroids".
- [x] No hay componentes genéricos nuevos: solo `MeteoroGame.tsx` y `games/meteoro/engine.ts`.

---

## Decisiones tomadas y descartadas

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Juego nuevo `meteoro` con ficha propia | Reutilizar la ficha `rocas` | Lo decide el usuario: `rocas` no se toca (id y datos distintos). |
| Nombre METEORO | CINTURÓN / VACÍO / "Asteroids" | Corto, legible en pixel y sin usar la marca del original. |
| Portada CSS nueva `.cover-meteoro` | Reutilizar `.cover-rocas` | Las dos fichas se distinguen en Biblioteca. |
| SHOOTER · cian | Magenta / ARCADE | Género correcto. El cian la diferencia de ROCAS (amarillo) y coincide con la nave. |
| `best`/`plays` mock creíbles (36500 / 8.2K) | A cero | Coherente con el resto del catálogo mock. |
| Solo METEORO es real; el resto sigue simulado | Quitar la simulación a todos | Cambio mínimo. Cada juego llega en su spec. |
| HUD y modal de la plataforma | HUD en canvas / ambos | Una sola fuente visual. El guardado ya existe. |
| Paleta neón del vault | Blanco vectorial original | Encaja con la identidad del sitio. |
| Solo teclado + P/Escape | Táctil / móvil / WASD | Fuera de alcance por decisión del usuario. |
| `localStorage` (`av_scores`) | Supabase | Fuera de alcance por decisión del usuario. |
| Motor TS puro + wrapper React específicos | Componente o motor genérico / iframe con `game.js` | Extraer lo genérico queda fuera por decisión del usuario. Se tipa sin `postMessage`. |
| Port fiel de las mecánicas, con power-up | Sin power-up / mecánicas nuevas | El juego ya está equilibrado. |
| Fin de partida en el modal; Espacio no reinicia | GAME OVER en canvas + modal | Evita reiniciar por accidente al escribir iniciales. |
| `onStats` solo en cambios | Emitir cada frame | Evita 60 renders/s de React. |
| Resolución lógica fija 800×600 escalada | Mundo que se adapta al tamaño | Mantiene la jugabilidad original. El CRT ya es 4:3. |

---

## Riesgos identificados

| Riesgo | Mitigación |
|---|---|
| Doble montaje de Strict Mode crea dos bucles o listeners | `destroy()` cancela el rAF y quita listeners. El wrapper lo llama en el cleanup del efecto. |
| Listeners de teclado globales interfieren con el modal o la Nav | Ignorar eventos si el destino es `input`/`textarea` o si el juego está en pausa o terminado. Se quitan al desmontar. |
| `setState` frecuente desde el motor degrada el rendimiento | `onStats` solo emite en cambios y `tripleShot` se redondea a 0,1 s. |
| Canvas borroso en pantallas HiDPI | Backing store escalado por `devicePixelRatio` con `ctx.setTransform`. |
| `shadowBlur` caro con muchas partículas | Glow solo en nave, rocas y power-up. Las partículas van sin sombra. |
| En móvil el juego no es jugable (sin teclado) | Asumido: los controles táctiles quedan fuera de alcance. |
| Pestaña en segundo plano al volver | `dt` limitado a 50 ms, como el original. |
