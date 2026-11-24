## Arcade Vault

Es una plataforma para jugar online y competir por la mayor cantidad de puntos.

## Usa Spec Driven Design

Basado en /spec y /spec-impl

Siguiendo las buenas practicas recomendadas aquí:
https://github.com/Klerith/fernando-skills

## Skills usadas

```bash
npx skills@latest add Klerith/fernando-skills
```

## Supabase

El proyecto está conectado a Supabase con `@supabase/ssr` (SPEC 04). Desde SPEC 06 el catálogo de juegos y todos los rankings se leen de Supabase. Todavía no hay autenticación.

### Variables de entorno

Copia `.env.example` a `.env.local` y rellena:

| Variable                               | Dónde se obtiene                                                     |
| -------------------------------------- | -------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Panel de Supabase → Project Settings → API (URL del proyecto)        |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Panel de Supabase → Project Settings → API Keys (`sb_publishable_…`) |

Ambas son públicas: la publishable key está pensada para el navegador. No añadas claves secretas (secret key o service role) hasta que una spec lo requiera.

### Clientes

- `lib/supabase/client.ts` → `createClient()` para componentes cliente (`"use client"`).
- `lib/supabase/server.ts` → `await createClient()` para Server Components, Server Actions y Route Handlers. Usa `server-only`: importarlo desde un componente cliente rompe el build.
- `lib/supabase/public.ts` → `createPublicClient()` sin cookies, para funciones `"use cache"` del servidor (por ejemplo `getGames()` en `lib/games.ts`).

### Scripts

```bash
npm run supabase:check  # comprueba URL y clave contra /auth/v1/health (necesita Node 22.18+)
npm run supabase:types  # regenera lib/supabase/database.types.ts (necesita `npx supabase login` antes)
```

### Base de datos

| Tabla    | Contenido                                                                                       | Acceso desde la app           |
| -------- | ----------------------------------------------------------------------------------------------- | ----------------------------- |
| `games`  | Catálogo: título, textos, categoría, portada, color, `best` y `plays` (estáticos), `sort_order` | Solo lectura                  |
| `scores` | Puntuaciones: `game_id`, `name` (1–10 caracteres), `score`, `user_id` (siempre `null` por ahora) | Solo lectura                  |

- RLS activado en ambas tablas, con una única política `select` para `anon` y `authenticated`. Las políticas por usuario y la escritura llegarán en specs futuras.
- RPC `top_players_today(p_limit)`: mejor puntuación de cada jugador desde las 00:00 UTC (`security invoker`).
- Migraciones versionadas en `supabase/migrations/` (esquema + seed con 9 juegos y 12 puntuaciones mock por juego). Se aplicaron al proyecto remoto con el MCP de Supabase; el nombre de cada archivo coincide con la versión registrada.
- El catálogo se lee en el servidor con `"use cache"` (`cacheLife("hours")`, `cacheTag("games")`) y se prerenderiza en el build: **`npm run build` necesita Supabase accesible**. Si falla en ejecución, `app/error.tsx` muestra "VAULT FUERA DE LÍNEA".
- Tras cambiar el esquema, regenera los tipos con `npm run supabase:types`.
