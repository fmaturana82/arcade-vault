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

El proyecto está conectado a Supabase con `@supabase/ssr` (SPEC 04). Por ahora no hay tablas ni autenticación, y ninguna pantalla usa el cliente.

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

### Scripts

```bash
npm run supabase:check  # comprueba URL y clave contra /auth/v1/health (necesita Node 22.18+)
npm run supabase:types  # regenera lib/supabase/database.types.ts (necesita `npx supabase login` antes)
```
