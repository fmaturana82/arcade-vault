# SPEC 04 — Infraestructura de Supabase

**Estado:** Implementado
**Depende de:** SPEC 03 (`03-about-contacto-resend.md`)
**Fecha:** 2026-11-24
**Objetivo:** Dejar el proyecto conectado a Supabase con `@supabase/ssr`, clientes de navegador y servidor tipados, variables de entorno documentadas y un script que comprueba la conexión, sin usar todavía el cliente en ninguna pantalla.

---

## Alcance

### Entra
- **Dependencias nuevas:** `@supabase/supabase-js`, `@supabase/ssr` y `server-only`.
- **Cliente de navegador** `lib/supabase/client.ts`: `createClient()` con `createBrowserClient<Database>()` de `@supabase/ssr`.
- **Cliente de servidor** `lib/supabase/server.ts` (`import "server-only"`): `async createClient()` con `createServerClient<Database>()` y `await cookies()` de `next/headers`. Usa `getAll` / `setAll`, y `setAll` va en `try/catch` porque desde un Server Component no se pueden escribir cookies.
- **Lectura de variables** `lib/supabase/env.ts`: `getSupabaseEnv()` devuelve `{ url, publishableKey }`. Lanza un error claro que nombra la variable que falta. Se llama al crear el cliente, no al importar el módulo.
- **Variables de entorno:** `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_…`). Se documentan en `.env.example` y se rellenan en `.env.local` con los valores de MCP `get_project_url` y `get_publishable_keys`.
- **Tipos de la BD** `lib/supabase/database.types.ts`, generados con MCP `generate_typescript_types`. Hoy el esquema `public` está vacío, así que el archivo solo trae la estructura base. Los dos clientes se tipan con `Database`.
- **Script de regeneración de tipos:** `npm run supabase:types` ejecuta la CLI de Supabase (`supabase gen types typescript --project-id hnjzrtkclevqgznhyygh --schema public`) y escribe `lib/supabase/database.types.ts`. Requiere `supabase login` previo, documentado en el README.
- **Script de comprobación:** `scripts/check-supabase.ts` y `npm run supabase:check` (`node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --env-file-if-exists=.env.local scripts/check-supabase.ts`, Node 22 ejecuta TypeScript directamente; sin `.env.local` el script informa de la variable que falta):
  - Comprueba que las dos variables existen.
  - Crea un cliente con `createClient` de `@supabase/supabase-js`.
  - Hace una petición ligera a `GET {url}/auth/v1/health` con la cabecera `apikey`.
  - Imprime `✔ Supabase OK (<url>)` y sale con código 0, o `✖ Supabase ERROR: <motivo>` y sale con código 1. Nunca imprime la clave.
- **Documentación:** sección "Supabase" en `README.md` con las variables, `npm run supabase:check` y `npm run supabase:types`.

### No entra
- Crear tablas, migraciones, RLS o la carpeta `supabase/`.
- Autenticación (Supabase Auth, `/auth`, refresco de sesión en `proxy`).
- Cualquier uso real del cliente en componentes o páginas existentes. Los mocks de `lib/data.ts` y `localStorage` (`av_user`, `av_scores`) no cambian.
- Realtime.
- Edge Functions.
- Storage.
- `SUPABASE_SERVICE_ROLE_KEY` o cualquier clave secreta. Se añadirá cuando una spec lo requiera.
- Route Handlers o endpoints de salud dentro de la app.
- Supabase CLI con stack local (Docker).
- Tests automatizados (no hay test runner configurado).

---

## Modelo de datos

Esta spec no introduce tablas ni estructuras de datos de la app. Solo añade estos módulos:

### `lib/supabase/env.ts` (nuevo)
```ts
export interface SupabaseEnv { url: string; publishableKey: string }
export function getSupabaseEnv(): SupabaseEnv; // lanza Error("Falta NEXT_PUBLIC_SUPABASE_URL") si falta
```
Las variables se leen como `process.env.NEXT_PUBLIC_SUPABASE_URL` literal, para que Next las incruste en el bundle del navegador.

### `lib/supabase/client.ts` y `lib/supabase/server.ts` (nuevos)
```ts
// client.ts
export function createClient(): SupabaseClient<Database>;
// server.ts
export async function createClient(): Promise<SupabaseClient<Database>>;
```

### `lib/supabase/database.types.ts` (generado)
Exporta `Database`. Hoy `public.Tables` está vacío. No se edita a mano.

### Variables de entorno (`.env.example`, añadidas)
```bash
# SPEC 04 — Supabase (públicas: la publishable key puede ir al navegador)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxx
```

### `package.json` (scripts añadidos)
```json
"supabase:check": "node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --env-file-if-exists=.env.local scripts/check-supabase.ts",
"supabase:types": "supabase gen types typescript --project-id hnjzrtkclevqgznhyygh --schema public > lib/supabase/database.types.ts"
```
La CLI `supabase` se añade como `devDependency`.

---

## Plan de implementación

1. **Dependencias y variables.** Ejecutar `npm install @supabase/supabase-js @supabase/ssr server-only` y `npm install -D supabase`. Añadir las dos variables a `.env.example`. Rellenarlas en `.env.local` con MCP `get_project_url` y `get_publishable_keys`. `npm run build` pasa.
2. **Tipos.** Generar `lib/supabase/database.types.ts` con MCP `generate_typescript_types`. Añadir el script `supabase:types` a `package.json`.
3. **Variables y cliente de navegador.** Crear `lib/supabase/env.ts` y `lib/supabase/client.ts`. `npm run lint` pasa.
4. **Cliente de servidor.** Leer antes la guía de `cookies` en `node_modules/next/dist/docs/` (en Next 16 es asíncrona). Crear `lib/supabase/server.ts`. `npm run build` pasa.
5. **Script de comprobación.** Crear `scripts/check-supabase.ts` y el script `supabase:check`. `npm run supabase:check` imprime `✔ Supabase OK`.
6. **Documentación.** Añadir la sección "Supabase" a `README.md`. Ejecutar `npm run lint`, `npm run build` y `npm run supabase:check`.

Archivos nuevos: `lib/supabase/env.ts`, `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/database.types.ts`, `scripts/check-supabase.ts`.
Archivos modificados: `.env.example`, `.env.local` (no versionado), `package.json`, `package-lock.json`, `README.md`.

---

## Criterios de aceptación

- [x] `npm run lint` y `npm run build` terminan sin errores.
- [x] `package.json` incluye `@supabase/supabase-js`, `@supabase/ssr` y `server-only` en `dependencies`, y `supabase` en `devDependencies`.
- [x] `.env.example` documenta `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, y no contiene valores reales.
- [x] Ningún archivo versionado contiene `SUPABASE_SERVICE_ROLE_KEY`, `sb_secret_` ni la publishable key real.
- [x] Con `.env.local` válido, `npm run supabase:check` imprime `✔ Supabase OK` y sale con código 0.
- [x] Con `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` vacía, `npm run supabase:check` imprime un error que nombra la variable y sale con código 1.
- [x] Con una clave inválida, `npm run supabase:check` imprime `✖ Supabase ERROR` y sale con código 1. La salida no muestra la clave.
- [x] `lib/supabase/database.types.ts` exporta `Database`, y ambos clientes devuelven `SupabaseClient<Database>`.
- [x] Importar `lib/supabase/server.ts` desde un archivo `"use client"` hace fallar el build (lo garantiza `server-only`).
- [x] `grep -r "lib/supabase" app components` no devuelve resultados: ningún componente ni página usa todavía el cliente.
- [x] La app se ve y se comporta igual que antes en todas las rutas (`#/`, `#/biblioteca`, `#/salon`, `#/acceso`, `#/acerca`).
- [x] El proyecto Supabase sigue sin tablas en `public` (MCP `list_tables`).

---

## Decisiones tomadas y descartadas

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Spec solo de infraestructura | Base + puntuaciones / base + auth | Lo decide el usuario: tablas, auth, realtime, edge functions y storage van en specs futuras. |
| `@supabase/ssr` con clientes de navegador y servidor | Solo `supabase-js` / solo cliente servidor | Es el patrón oficial para el App Router y evita rehacer los clientes cuando llegue la auth. |
| Publishable key (`sb_publishable_…`) | Anon key JWT (legacy) | Es el formato de claves actual de Supabase. |
| Sin `SUPABASE_SERVICE_ROLE_KEY` | Añadirla ya | Ninguna funcionalidad la necesita. Se añadirá cuando una spec lo requiera. |
| Lectura de variables al crear el cliente | Leerlas al importar | Una variable ausente no rompe el build ni las páginas que no usan Supabase. |
| Script `npm run supabase:check` | Route Handler de salud / solo build | Verifica la conexión real sin añadir rutas públicas ni tocar la app. |
| `GET /auth/v1/health` en el script | Consulta a una tabla | No hay tablas. El endpoint valida URL y clave sin crear nada. |
| Tipos generados ahora con script de regeneración | Sin tipos hasta la primera tabla | Los clientes quedan tipados desde el inicio y regenerar es un comando. |
| Sin carpeta `supabase/` | Crearla vacía con `.gitkeep` | Llegará con la primera migración. |
| Proyecto remoto, sin stack local | Supabase CLI con Docker | Menos setup. Ya existe el MCP enlazado al proyecto. |

---

## Riesgos identificados

| Riesgo | Mitigación |
|---|---|
| Confundir la publishable key con una clave secreta | Solo se usa la publishable key (diseñada para el navegador). Sin tablas no hay datos expuestos. Cuando lleguen tablas, la spec correspondiente define RLS. |
| `cookies()` asíncrona y API distinta en Next 16 | Leer `node_modules/next/dist/docs/` antes del paso 4, como indica `AGENTS.md`. |
| `setAll` falla al llamarse desde un Server Component | `try/catch` documentado en el código. El refresco de sesión en `proxy` llegará con la spec de auth. |
| `supabase:types` necesita `supabase login` | Documentado en el README. Los tipos iniciales se generan por MCP sin login. |
| `/auth/v1/health` cambia o exige otra cabecera | El script trata cualquier respuesta no 2xx como error con el código HTTP. Si cambia, se ajusta solo el script. |
| Node sin soporte para ejecutar `.ts` | El proyecto usa Node 22.23, que lo ejecuta de forma nativa. Documentado en el README. |

---

## Qué **no** entra en esta spec

- Tablas, migraciones y RLS.
- Autenticación.
- Uso del cliente en componentes o páginas.
- Realtime, Edge Functions y Storage.
- `SUPABASE_SERVICE_ROLE_KEY`.

Si alguna de estas llega a hacerse, irá en su propia spec.
