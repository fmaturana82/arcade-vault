# SPEC 06 — Catálogo y leaderboards desde Supabase

**Estado:** Implementado
**Depende de:** SPEC 04 (`04-supabase-infraestructura.md`), SPEC 05 (`05-juego-meteoro-canvas.md`)
**Fecha:** 2026-11-24
**Objetivo:** Crear en Supabase las tablas `games` y `scores` con RLS de solo lectura y datos semilla, y hacer que el catálogo y todos los rankings de la app se lean de ahí en lugar de los mocks de `lib/data.ts`.

---

## Alcance

### Entra

- **Migraciones versionadas** en `supabase/migrations/`, aplicadas al proyecto remoto con MCP `apply_migration`:
  - `20261124120000_games_scores.sql`: tablas, índices, RLS y función `top_players_today`.
  - `20261124120100_seed_games_scores.sql`: los 9 juegos actuales de `GAMES` y 12 puntuaciones por juego.
- **RLS de solo lectura:** RLS activado en ambas tablas. Una política `select` para `anon` y `authenticated` en cada una. Sin políticas de `insert`, `update` ni `delete` (la escritura llega en SPEC 07). Es una política mínima; las políticas por usuario llegan en una spec futura. `games` es solo lectura desde la app.
- **Seed de `scores`:** 12 filas por juego con los nombres de la lista `PLAYERS` actual, sin repetir nombre dentro de un juego. La mejor fila de cada juego vale exactamente `games.best`; el resto desciende por debajo. `created_at = now() - random() * interval '30 days'`. `user_id` queda `null` en todas las filas.
- **Tipos regenerados** en `lib/supabase/database.types.ts` con MCP `generate_typescript_types`.
- **Cliente público sin cookies** `lib/supabase/public.ts` (`import "server-only"`): `createPublicClient()` con `createClient<Database>` de `@supabase/supabase-js`. Necesario porque `cookies()` no se puede usar dentro de `"use cache"`.
- **Catálogo en servidor** `lib/games.ts` (`server-only`): `getGames()` con `"use cache"`, `cacheLife("hours")` y `cacheTag("games")`. Ordena por `sort_order`, mapea a `Game` y lanza error si la consulta falla.
- **`app/page.tsx`** pasa a `async`: `const games = await getGames()` y `<ArcadeApp games={games} />`.
- **Contexto de catálogo** `components/arcade/GamesContext.tsx`: `GamesProvider` y `useGames()` → `{ games, getGame(id) }`. `ArcadeApp` envuelve la app con él.
- **Rutas:** `hashToRoute(hash, games)` en `lib/route.ts` recibe la lista en vez de importar `getGame`. Un id que no existe en Supabase redirige a Biblioteca, como hoy.
- **Pantallas que pasan a usar `useGames()`:** `Home` (6 primeros por `sort_order`), `Library`, `GameDetail`, `GamePlayer` y las pestañas de `HallOfFame`.
- **Consultas de rankings en cliente** `lib/scores.ts`, con el cliente de navegador de `lib/supabase/client.ts`:
  - `fetchLeaderboard(gameId, limit)`: `score desc, created_at asc`.
  - `fetchRecentScores(limit = 7)`: `created_at desc`, con `games(title, color)` embebido.
  - `fetchTopPlayersToday(limit = 5)`: RPC `top_players_today`.
  - `fetchPlayerBest(gameId, name)`: mejor fila con `name = user.name` y rango `1 + count(score > best)`. Devuelve `null` si no tiene.
- **Hooks** `components/arcade/useScores.ts`: `useLeaderboard`, `useRecentScores`, `useTopPlayersToday` y `usePlayerBest`. Cada uno devuelve `{ status: "loading" | "ready" | "error", data, retry }` y descarta respuestas obsoletas al cambiar de pestaña o de juego.
- **Salón de la Fama:** podio y tabla con el top 10 real del juego elegido. "TU MEJOR MARCA" con `usePlayerBest`; sin marca muestra "AÚN SIN MARCA". Si la pestaña tiene menos de 3 filas, el podio muestra huecos "—".
- **Detalle:** top 10 real. `Partidas` y `Mejor global` siguen leyendo `games.plays` y `games.best`.
- **Home:** el ticker "ÚLTIMAS PUNTUACIONES" usa las 7 últimas filas, con el color del juego y tiempo relativo ("hace 2 min", "hace 3 h", "hace 5 d"). "TOP JUGADORES · HOY" usa la RPC.
- **Estados de los rankings** (diseñados con `/frontend-design`, mismo lenguaje neón): cargando (filas skeleton), vacío ("SÉ EL PRIMERO EN ENTRAR"; en Top hoy "SIN PUNTUACIONES HOY") y error ("NO SE PUDO CARGAR EL RANKING" + botón REINTENTAR).
- **Catálogo caído:** `app/error.tsx` (`"use client"`) muestra "VAULT FUERA DE LÍNEA" y un botón REINTENTAR, con la API de reintento que documente `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md`.
- **Limpieza de `lib/data.ts`:** se eliminan `GAMES`, `getGame`, `seededScores`, `PLAYERS`, `RECENT_SCORES`, `TOP_PLAYERS` y los tipos `RecentScore` / `TopPlayer`. Se quedan `Game`, `Category`, `GameColor`, `ScoreRow`, `CATS` y `formatScore`. Se añaden `formatDate` (`DD/MM/AAAA`) y `formatAgo`.
- **README:** subsección "Base de datos" con las tablas, las migraciones y cómo regenerar tipos.

### No entra

- Guardar puntuaciones en Supabase (GUARDAR PUNTUACIÓN, Server Action, validación, política `insert`, `updateTag("games")`). Va en **SPEC 07**.
- Cambiar el guardado actual: `onSaveScore` sigue escribiendo en `localStorage` (`av_scores`), y esas puntuaciones no aparecen en los rankings.
- Actualización automática de `best` y `plays`: son campos estáticos de `games`.
- Supabase Auth. `scores.user_id` se guarda como `null` en todas las filas. El usuario sigue siendo el mock `av_user`.
- Políticas RLS por usuario (`user_id = auth.uid()`), que se configuran en una spec futura.
- Realtime (el ticker no se actualiza solo; se recarga al entrar en la Home).
- Paginación del leaderboard. Todos los rankings muestran el top 10.
- Panel de administración de juegos. `games` es solo lectura desde la app.
- Cambiar las estadísticas fijas de la Home (`STATS`).
- Tests automatizados (no hay test runner).

---

## Modelo de datos

### `public.games` (nueva)

```sql
create table public.games (
  id          text primary key,          -- "meteoro", "caida", …
  title       text not null,
  short       text not null,
  long        text not null,
  cat         text not null check (cat in ('ARCADE','PUZZLE','SHOOTER','VERSUS')),
  cover       text not null,             -- clase CSS "cover-meteoro"
  color       text not null check (color in ('cyan','magenta','yellow','green')),
  best        integer not null default 0,
  plays       text not null default '0',
  sort_order  integer not null unique,
  created_at  timestamptz not null default now()
);
```

### `public.scores` (nueva)

```sql
create table public.scores (
  id          bigint generated always as identity primary key,
  game_id     text not null references public.games(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 10),
  score       integer not null check (score >= 0),
  user_id     uuid null references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index scores_game_score_idx on public.scores (game_id, score desc, created_at);
create index scores_created_idx    on public.scores (created_at desc);
```

`name` admite hasta 10 caracteres, igual que el input de iniciales y `Auth.tsx`.
`user_id` es siempre `null` hasta la spec de Auth.

### RPC `public.top_players_today(p_limit int default 5)`

`stable`, `security invoker`. Devuelve `table(name text, score integer)`: el score máximo de cada jugador con `created_at >= date_trunc('day', now() at time zone 'utc')`, ordenado `score desc`, limitado a `p_limit`.

### `lib/data.ts` (modificado)

```ts
// Se mantiene Game (mismos campos, camelCase) y ScoreRow { rank, name, score, date }.
export function formatDate(iso: string): string; // "24/11/2026"
export function formatAgo(iso: string, now?: number): string; // "hace 2 min"
```

### `lib/scores.ts` (nuevo)

```ts
export interface RecentScoreRow {
  name: string;
  score: number;
  createdAt: string;
  gameTitle: string;
  color: GameColor;
}
export interface TopTodayRow {
  rank: number;
  name: string;
  score: number;
}
export interface PlayerBest {
  rank: number;
  score: number;
  date: string;
}
```

### `components/arcade/useScores.ts` (nuevo)

```ts
type Query<T> = {
  status: "loading" | "ready" | "error";
  data: T | null;
  retry: () => void;
};
```

---

## Plan de implementación

1. **Esquema.** Crear `supabase/migrations/20261124120000_games_scores.sql` (tablas, índices, RLS, políticas `select`, RPC). Aplicarla con MCP `apply_migration`. MCP `list_tables` muestra `games` y `scores`. MCP `get_advisors` (security) sin avisos de RLS.
2. **Seed.** Crear `supabase/migrations/20261124120100_seed_games_scores.sql` con los 9 juegos copiados de `GAMES` (`sort_order` 1..9, `meteoro` = 9) y 12 puntuaciones por juego con `user_id` null. Aplicarla. `select count(*)` da 9 y 108.
3. **Tipos y cliente público.** Regenerar `lib/supabase/database.types.ts` con MCP `generate_typescript_types`. Crear `lib/supabase/public.ts`. `npm run lint` pasa.
4. **Catálogo en servidor.** Leer antes la guía de caché (`docs/01-app/01-getting-started/08-caching.md`). Crear `lib/games.ts` y hacer `app/page.tsx` async pasando `games` a `ArcadeApp`. `ArcadeApp` acepta la prop pero aún no la usa. `npm run build` pasa.
5. **Contexto y rutas.** Crear `GamesContext.tsx`, envolver la app y cambiar `hashToRoute(hash, games)`. Migrar `Home`, `Library`, `GameDetail`, `GamePlayer` y las pestañas de `HallOfFame` a `useGames()`. Quitar `GAMES` y `getGame` de `lib/data.ts`. La app se ve igual que antes. `npm run build` pasa.
6. **Error de catálogo.** Leer `error.md` de la versión instalada. Crear `app/error.tsx` con "VAULT FUERA DE LÍNEA" + REINTENTAR (con `/frontend-design`).
7. **Consultas y hooks.** Crear `lib/scores.ts`, `useScores.ts`, y `formatDate` / `formatAgo` en `lib/data.ts`. `npm run lint` pasa.
8. **Salón de la Fama y Detalle.** Sustituir `seededScores` por `useLeaderboard` y `usePlayerBest`. Añadir estados cargando / vacío / error (con `/frontend-design`, CSS en `app/globals.css`).
9. **Home.** Sustituir `RECENT_SCORES` y `TOP_PLAYERS` por `useRecentScores` y `useTopPlayersToday`, con sus estados. Eliminar `seededScores`, `PLAYERS`, `RECENT_SCORES`, `TOP_PLAYERS`, `RecentScore` y `TopPlayer` de `lib/data.ts`.
10. **Documentación y verificación.** Subsección "Base de datos" en `README.md`. `npm run lint`, `npm run build` y prueba manual con Playwright (capturas en `.playwright-screenshots/`).

Archivos nuevos: `supabase/migrations/20261124120000_games_scores.sql`, `supabase/migrations/20261124120100_seed_games_scores.sql`, `lib/supabase/public.ts`, `lib/games.ts`, `lib/scores.ts`, `components/arcade/GamesContext.tsx`, `components/arcade/useScores.ts`, `app/error.tsx`.
Archivos modificados: `lib/supabase/database.types.ts`, `lib/data.ts`, `lib/route.ts`, `app/page.tsx`, `app/globals.css`, `components/arcade/ArcadeApp.tsx`, `Home.tsx`, `Library.tsx`, `GameDetail.tsx`, `GamePlayer.tsx`, `HallOfFame.tsx`, `README.md`.

---

## Criterios de aceptación

- [x] `npm run lint` y `npm run build` terminan sin errores.
- [x] MCP `list_tables` muestra `games` (9 filas) y `scores` (108 filas), ambas con RLS activado.
- [x] Con la publishable key, `select` en `games` y `scores` funciona, e `insert` / `update` / `delete` en `scores` son rechazados por RLS.
- [x] MCP `get_advisors` (security) no reporta tablas sin RLS ni la función `top_players_today` como riesgo.
- [x] `supabase/migrations/` contiene las dos migraciones aplicadas (MCP `list_migrations`).
- [x] `grep -rn "GAMES\|seededScores\|RECENT_SCORES\|TOP_PLAYERS\|PLAYERS" lib components app` no devuelve resultados (salvo `CATS`).
- [x] Biblioteca muestra los 9 juegos con los mismos títulos, portadas, filtros y orden que antes.
- [x] Cambiar el `title` de un juego en Supabase y lanzar `updateTag("games")` o un nuevo build hace que Biblioteca lo muestre.
- [x] `#/juegos/no-existe` redirige a `#/biblioteca`. `#/juegos/meteoro/jugar` sigue jugable.
- [x] En el Salón de la Fama, el podio y la tabla de cada pestaña coinciden con `select … order by score desc limit 10` en Supabase. La puntuación #01 de cada juego es igual a su `best`.
- [x] Ningún ranking muestra más de 10 filas.
- [x] `select count(*) from scores where user_id is not null` devuelve 0.
- [x] Con un `av_user` cuyo nombre tiene filas en ese juego, "TU MEJOR MARCA" muestra su mejor score y su rango real. Sin filas muestra "AÚN SIN MARCA".
- [x] El Detalle de cada juego muestra el top 10 real con fechas `DD/MM/AAAA`.
- [x] El ticker de la Home muestra las 7 filas con `created_at` más reciente, con el color de su juego y tiempo relativo en español.
- [x] "TOP JUGADORES · HOY" coincide con la RPC `top_players_today`. Sin filas de hoy muestra "SIN PUNTUACIONES HOY".
- [x] Con la red de Supabase bloqueada en el navegador (Playwright), los rankings muestran "NO SE PUDO CARGAR EL RANKING" y REINTENTAR vuelve a pedir los datos.
- [x] Mientras carga un ranking se ven filas skeleton, no datos mock.
- [x] Si `getGames()` lanza error, la página muestra "VAULT FUERA DE LÍNEA" con REINTENTAR.
- [x] Cambiar rápido de pestaña en el Salón nunca muestra filas de otro juego.
- [x] GUARDAR PUNTUACIÓN sigue escribiendo en `av_scores` y no inserta nada en `scores`.
- [x] La consola del navegador no muestra errores en `#/`, `#/biblioteca`, `#/salon`, `#/juegos/meteoro` y `#/acerca`.

---

## Decisiones tomadas y descartadas

| Decisión                                                     | Alternativa descartada                       | Motivo                                                                                    |
| ------------------------------------------------------------ | -------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Dividir en SPEC 06 (lectura) y SPEC 07 (escritura)           | Una sola spec                                | Lo decide el usuario: tocaba 4 dominios.                                                  |
| Tablas `games` + `scores`                                    | Solo `scores` / solo UI                      | Lo decide el usuario: el catálogo también vive en Supabase.                               |
| Catálogo como única fuente, sin fallback a `GAMES`           | Fallback local                               | Evita dos fuentes que diverjan. Lo decide el usuario.                                     |
| Catálogo en servidor con `"use cache"` + `cacheTag("games")` | Cargarlo en cliente                          | Entra en el shell prerenderado y SPEC 07 podrá invalidarlo con `updateTag`.               |
| Cliente público sin cookies para el catálogo                 | Cliente de servidor de SPEC 04               | `cookies()` no puede usarse dentro de `"use cache"`.                                      |
| Rankings en cliente con el cliente de navegador              | Server Actions de lectura / todo en servidor | La app es una SPA con rutas hash; los rankings son dinámicos y no deben quedar cacheados. |
| Catálogo vía contexto React                                  | Pasar `games` prop a prop                    | Lo usan 6 componentes y `lib/route.ts`.                                                   |
| RLS solo `select`; sin `insert`                              | Insert anónimo ya                            | La escritura y su validación son SPEC 07.                                                 |
| RPC `top_players_today`                                      | Agregar en el cliente                        | PostgREST no hace `distinct on`; la RPC no descarga todas las filas del día.              |
| Top hoy = mejor score individual desde 00:00 UTC             | Suma por juego / ventana 24 h                | Lo decide el usuario.                                                                     |
| Rango de "tu marca" = `1 + count(score > best)`              | Rango por jugador único                      | Coherente con la tabla, que lista filas, no jugadores únicos.                             |
| Seed con 12 filas por juego en los últimos 30 días           | Tabla vacía                                  | Lo decide el usuario. Las pantallas no salen vacías.                                      |
| #01 del seed = `games.best`                                  | Scores aleatorios                            | El "Mejor global" del detalle coincide con el ranking.                                    |
| `best` y `plays` como columnas estáticas                     | Calcularlas / quitarlas                      | Lo decide el usuario. Calcularlas va en otra spec.                                        |
| Migraciones en `supabase/migrations/` + MCP                  | Solo MCP / solo SQL Editor                   | Quedan versionadas en git y aplicadas sin Docker.                                         |
| "Tu marca" con consulta real por `user.name`                 | Ocultarla / dejar mock                       | Lo decide el usuario.                                                                     |
| `user_id uuid null` con FK a `auth.users`                    | Esperar a la spec de Auth                    | Lo decide el usuario. El esquema queda listo sin migrar datos.                            |
| RLS mínima `select` ahora; políticas por usuario después     | Sin RLS hasta la spec futura                 | Sin RLS, la publishable key permitiría escribir y borrar en ambas tablas.                 |
| Top 10 en todos los rankings, sin paginación                 | Top 12 en el Salón                           | Lo decide el usuario.                                                                     |
| Seed de 12 filas con 10 visibles                             | Seed de 10                                   | "TU MEJOR MARCA" puede tener un rango fuera del top.                                      |

---

## Riesgos identificados

| Riesgo                                                      | Mitigación                                                                             |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Supabase caído durante `npm run build` rompe el prerender   | El error es explícito. Documentado en el README: el build necesita Supabase accesible. |
| El catálogo cacheado queda obsoleto tras editar `games`     | `cacheLife("hours")` + `cacheTag("games")`. SPEC 07 añade `updateTag`.                 |
| `hashToRoute` corre antes de tener catálogo                 | El catálogo llega como prop desde el servidor; nunca está vacío en el cliente.         |
| Carreras al cambiar de pestaña muestran datos de otro juego | Los hooks ignoran respuestas de peticiones antiguas.                                   |
| `name` del mock `av_user` no coincide en mayúsculas         | `Auth.tsx` y el input ya pasan a mayúsculas; el seed también usa mayúsculas.           |
| Top hoy vacío días después del seed                         | Estado vacío "SIN PUNTUACIONES HOY" y criterio de aceptación propio.                   |
| RPC con `security definer` saltaría RLS                     | Se declara `security invoker`; lo revisa `get_advisors`.                               |
| Datos semilla confundidos con reales                        | Son mock; SPEC 07 decide si se borran al abrir la escritura.                           |

---

## Qué **no** entra en esta spec

- Guardar puntuaciones en Supabase (SPEC 07).
- Actualizar `best` y `plays` automáticamente.
- Supabase Auth (`user_id` siempre `null`).
- Políticas RLS por usuario.
- Realtime.
- Paginación (se muestra el top 10).
- Panel de administración de juegos (`games` es solo lectura).

Si alguna de estas llega a hacerse, irá en su propia spec.
