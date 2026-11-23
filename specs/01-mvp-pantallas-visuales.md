# SPEC 01 — MVP visual: pantallas de Arcade Vault

**Estado:** Aprobado
**Depende de:** — (ninguna)
**Fecha:** 2026-11-23
**Objetivo:** Replicar 1:1 en Next.js, como SPA cliente con datos mock, las cinco pantallas de `references/templates/` (Biblioteca, Detalle, Reproductor, Acceso y Salón de la Fama) sin implementar ningún juego.

---

## Alcance

### Entra
- **Shell de la app:** `Nav` (logo, enlaces Biblioteca / Salón de la Fama, contador "CRÉDITOS · 03", botón Iniciar Sesión o nombre del usuario, menú hamburguesa con panel móvil y backdrop) y footer "© 2026 ARCADE VAULT · HECHO CON PIXELES Y NEÓN · v2.6.0".
- **Biblioteca:** hero con `flicker`/`blink`, buscador por nombre, chips de categoría (`TODOS, ARCADE, PUZZLE, SHOOTER, VERSUS`), grilla de `GameCard` con efecto tilt al mover el ratón, estado vacío "NO HAY RESULTADOS".
- **Detalle:** portada, tags, título, descripción larga, stat-strip (partidas, mejor global, dificultad), botones "▶ JUGAR AHORA" y "VOLVER AL VAULT", leaderboard lateral de 10 filas (top1/2/3 resaltados).
- **Reproductor (simulado):** HUD (jugador, puntuación, vidas, nivel), botones PAUSA/REANUDAR, FIN, SALIR; pantalla CRT con arena decorativa (`grid-floor`, enemigos, nave); puntuación que sube sola cada 220 ms y nivel que sube cada ~2500 puntos; overlay "EN PAUSA"; modal "FIN DEL JUEGO" con puntuación final, input de iniciales (mayúsculas, máx. 10), "GUARDAR PUNTUACIÓN" → toast "▸ PUNTUACIÓN GUARDADA_", "JUGAR DE NUEVO" y "VOLVER AL VAULT".
- **Acceso (auth):** tabs INICIAR SESIÓN / CREAR CUENTA (campo email solo en crear cuenta, con `slide-in`), submit que hace login falso y vuelve a Biblioteca, "JUGAR COMO INVITADO", botones sociales GOOGLE/GITHUB sin acción, texto de términos.
- **Salón de la Fama:** cabecera, chips por juego, podio (plata/oro/bronce), tabla de 12 filas con animación escalonada, fila "▸ TU MEJOR MARCA EN …" si hay usuario, botón "VOLVER A LA BIBLIOTECA".
- **Navegación SPA por hash legible** que se restaura al recargar.
- **Sesión y puntuaciones mock en `localStorage`.**
- Mejoras de accesibilidad mínimas sin cambiar el aspecto: elementos clicables como `<button>` (no `<a onClick>`), `aria-label` en hamburguesa, `aria-hidden` en decorativos, foco visible.

### No entra
- Ningún juego jugable (ni canvas, ni lógica de juego, ni controles de teclado).
- Backend, base de datos, API routes, Server Actions.
- Autenticación real, validación de formularios, OAuth Google/GitHub.
- Leer `av_scores` para mostrarlo en Detalle o Salón (los rankings siguen siendo generados con `seededScores`).
- Rutas reales del App Router por pantalla (`/juegos/[id]`, etc.) — decisión diferida a una spec futura.
- Menú desplegable del usuario (el botón "{nombre} ▾" cierra sesión directamente, como en la plantilla).
- Tests automatizados (no hay test runner configurado).
- Rediseño estético: el diseño es el de las plantillas y `app/globals.css`.

---

## Modelo de datos

### `lib/data.ts` (estático, portado de `references/templates/data.jsx`)
```ts
export type Category = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type GameColor = "cyan" | "magenta" | "yellow" | "green";

export interface Game {
  id: string;          // "bloque-buster", "caida", …
  title: string;
  short: string;
  long: string;
  cat: Category;
  cover: string;       // clase CSS: "cover-bricks", "cover-tetro", …
  color: GameColor;
  best: number;
  plays: string;       // "12.4K"
}

export interface ScoreRow { rank: number; name: string; score: number; date: string } // date "DD/MM/2026"

export const GAMES: Game[];                          // los 8 juegos de la plantilla, mismos textos
export const CATS: readonly ["TODOS", ...Category[]];
export function seededScores(seed: number, count?: number): ScoreRow[]; // mismo algoritmo determinista
export function getGame(id: string): Game | undefined;
```

### Ruta (estado cliente) — `lib/route.ts`
```ts
export type Route =
  | { name: "biblioteca" }
  | { name: "detalle"; id: string }
  | { name: "player"; id: string }
  | { name: "auth" }
  | { name: "salon" };

export function routeToHash(r: Route): string;  // ver tabla
export function hashToRoute(hash: string): Route; // hash desconocido o id inexistente → { name: "biblioteca" }
```

| Route | Hash |
|---|---|
| biblioteca | `#/` |
| detalle | `#/juegos/{id}` |
| player | `#/juegos/{id}/jugar` |
| auth | `#/acceso` |
| salon | `#/salon` |

### `localStorage` (mock, mismas claves que la plantilla)
| Clave | Valor | Escrita por | Borrada por |
|---|---|---|---|
| `av_user` | `{ "name": string }` (mayúsculas, máx. 10, por defecto `"PLAYER1"`) | submit de Acceso | botón de usuario en Nav (cerrar sesión) |
| `av_scores` | `Array<{ game: string; score: number; name: string; at: number }>` | "GUARDAR PUNTUACIÓN" | — |

Todo acceso a `localStorage` va en `try/catch` y se lee **después del montaje** (en `useEffect`) para evitar desajustes de hidratación.

---

## Plan de implementación

1. **Datos y rutas.** Crear `lib/data.ts` y `lib/route.ts` según el modelo. `npm run lint` pasa.
2. **Shell SPA.** Crear `components/arcade/ArcadeApp.tsx` (`"use client"`): estado `route` sincronizado con `location.hash` (lectura inicial tras montaje + listener `hashchange`; al navegar se escribe el hash y `scrollTo(0)`), estado `user` desde `av_user`, handlers `login`, `signOut`, `saveScore`. Crear `Nav.tsx` (incluye panel móvil) y `Footer.tsx`. `app/page.tsx` pasa a montar solo `<ArcadeApp />`; `app/layout.tsx` sigue envolviendo con `<main className="av-main">` (el footer va fuera de `main` desde `ArcadeApp`, ajustando el layout para no duplicar `main`). Las pantallas aún no existentes muestran Biblioteca.
3. **Biblioteca.** `Library.tsx` + `GameCard.tsx` (tilt con `useRef`, filtro por texto y categoría con `useMemo`, estado vacío). Al pulsar carta o JUGAR → `detalle`.
4. **Detalle.** `GameDetail.tsx` con `seededScores(id.length * 17 + 3, 10)`. Id inexistente → redirige a Biblioteca.
5. **Reproductor.** `GamePlayer.tsx`: simulación con `setInterval`, pausa, fin, modal, guardar en `av_scores`, reiniciar. El nombre por defecto es `user.name` o `"INVITADO"`. Limpiar intervalos al desmontar.
6. **Acceso.** `Auth.tsx` con tabs, login falso, invitado (`onLogin(null)`), botones sociales sin acción.
7. **Salón de la Fama.** `HallOfFame.tsx` con `seededScores(tab.length * 23 + 7, 12)`, podio, tabla y fila del usuario (rango `8 + tab.length % 4`, puntuación `rows[5].score - 2400`, fecha `11/05/2026`, como la plantilla).
8. **Pulido y verificación.** Revisión de accesibilidad con `/frontend-design` sin cambiar el aspecto; `npm run lint` y `npm run build` sin errores; recorrido manual en `npm run dev` a 1280 px y 375 px comparando con `references/templates/Arcade Vault.html`.

Archivos nuevos: `lib/data.ts`, `lib/route.ts`, `components/arcade/{ArcadeApp,Nav,Footer,Library,GameCard,GameDetail,GamePlayer,Auth,HallOfFame}.tsx`.
Archivos modificados: `app/page.tsx`, `app/layout.tsx` (solo si hace falta para el `main`/footer). `app/globals.css` no debería cambiar salvo clases faltantes.

---

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` terminan sin errores ni warnings de hidratación en consola del navegador.
- [ ] Al abrir `/` se ve la Biblioteca con los 8 juegos y el hash es `#/`.
- [ ] Escribir "ca" en el buscador deja solo CAÍDA; chip SHOOTER deja solo INVASORES y ROCAS; una búsqueda sin coincidencias muestra "NO HAY RESULTADOS".
- [ ] Clic en una carta abre el Detalle con hash `#/juegos/{id}` y leaderboard de 10 filas.
- [ ] Recargar en `#/juegos/caida` vuelve a mostrar el Detalle de CAÍDA; `#/juegos/no-existe` y `#/loquesea` muestran la Biblioteca.
- [ ] "▶ JUGAR AHORA" abre el Reproductor (`#/juegos/{id}/jugar`); la puntuación sube sola; PAUSA la congela y muestra "EN PAUSA"; REANUDAR la reanuda.
- [ ] FIN abre el modal con la puntuación final; "GUARDAR PUNTUACIÓN" añade una entrada a `av_scores` y muestra el toast; "JUGAR DE NUEVO" reinicia a 0 / 3 vidas / nivel 01; SALIR vuelve al Detalle.
- [ ] En Acceso, el tab CREAR CUENTA muestra el campo de correo; enviar con usuario "neo" guarda `av_user = {"name":"NEO"}`, vuelve a Biblioteca y el Nav muestra "NEO ▾"; pulsarlo borra `av_user` y vuelve a "Iniciar Sesión".
- [ ] Tras recargar con sesión iniciada, el Nav sigue mostrando el usuario.
- [ ] Salón de la Fama muestra podio y 12 filas; cambiar de chip cambia los datos; con sesión aparece la fila "▸ TU MEJOR MARCA EN …".
- [ ] El enlace activo del Nav se resalta (Biblioteca también en Detalle y Reproductor).
- [ ] A 375 px de ancho: hamburguesa visible, el panel móvil abre/cierra (backdrop incluido) y no hay scroll horizontal.
- [ ] No existe ningún juego jugable ni código de juego en el repo.
- [ ] Comparación visual lado a lado con `references/templates/Arcade Vault.html`: mismas pantallas, textos y estilos.

---

## Decisiones tomadas y descartadas

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| SPA cliente con estado de ruta | Rutas reales del App Router | Elección del usuario: replica el flujo de la plantilla con menos superficie; las rutas reales quedan para otra spec. |
| Hash legible (`#/juegos/caida`) | Hash JSON de la plantilla / solo memoria | Recargar y compartir conservan la pantalla sin URLs ilegibles. |
| Mantener la simulación del Reproductor | Reproductor estático | Permite ver todos los estados visuales (jugando, pausa, fin, guardado). |
| Sesión y puntuaciones mock en `localStorage` | Puramente visual | Muestra los estados con/sin usuario igual que la plantilla, sin backend. |
| `lib/data.ts` tipado | JSON en `/data` | Conserva `seededScores` determinista y se sustituye fácil por API/BD. |
| `components/arcade/` por pantalla | `app/_components` | Separación clara; `app/page.tsx` solo monta la app. |
| Réplica 1:1; `/frontend-design` solo para accesibilidad | Reinterpretar estética | Las plantillas y `globals.css` ya son el diseño aprobado. |
| Leer `localStorage` tras el montaje | Leer en el inicializador de `useState` | Evita errores de hidratación con el prerender de Next.js. |

---

## Riesgos identificados

- **Hidratación / prerender (`cacheComponents`):** la página se prerenderiza; cualquier lectura de `location`/`localStorage` durante el render rompe la hidratación. Mitigación: leer solo en `useEffect`, renderizar Biblioteca por defecto en el primer pase.
- **Parpadeo inicial:** al recargar en `#/salon` se verá un instante la Biblioteca antes de cambiar. Aceptado en el MVP.
- **Intervalos del Reproductor:** si no se limpian al salir/pausar, la puntuación sigue sumando en segundo plano. Mitigación: limpieza en el `return` del `useEffect`.
- **`localStorage` no disponible** (modo privado/bloqueado): todo acceso en `try/catch`; la app funciona sin persistir.
- **Clases CSS faltantes** en `globals.css` respecto a `styles.css`: verificar durante el paso 8 y añadir solo lo que falte.
