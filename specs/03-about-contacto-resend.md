# SPEC 03 — Página Acerca de con formulario de contacto vía Resend

**Estado:** Aprobado
**Depende de:** SPEC 01 (`01-mvp-pantallas-visuales.md`), SPEC 02 (`02-home-page.md`)
**Fecha:** 2026-11-23
**Objetivo:** Añadir a la SPA la pantalla Acerca de en `#/acerca`, idéntica a `references/templates/home-about/about.jsx`, con un formulario de contacto que envía un correo real mediante una Server Action y Resend.

---

## Alcance

### Entra
- **Pantalla Acerca de** (`components/arcade/About.tsx`) con las mismas secciones, textos y estilos que `about.jsx`:
  - **Hero:** kicker "▸ ACERCA DE", título "ACERCA DE ARCADE VAULT", párrafo de misión y fila de 3 highlights con iconos pixel SVG (`HEART` magenta, `BROWSER` cian, `PLANT` verde) y sus textos exactos ("HECHO CON ❤️ PARA JUGADORES", "JUEGOS EN HTML — CORREN EN CUALQUIER NAVEGADOR", "PROYECTO EN CONSTANTE CRECIMIENTO").
  - **Divisor decorativo** (`.about-divider`, `aria-hidden`) con dos barras y 24 píxeles parpadeantes con retardo escalonado (`i * 80 ms`).
  - **Contacto:** kicker "▸ CONTACTO", título "CONTÁCTANOS", subtítulo, 3 tips con LED ("RESPUESTA EN 24-48H", "SUGERENCIAS BIENVENIDAS", "SIN SPAM, JAMÁS") y un formulario con NOMBRE (placeholder `px_kai`), CORREO ELECTRÓNICO (`jugador@vault.gg`), MENSAJE (textarea de 5 filas, "Cuéntanos qué tienes en mente…") y el botón "▶  ENVIAR MENSAJE".
  - **Terminal de éxito** "VAULT-OS // TERMINAL" con las mismas líneas de la plantilla, "MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS, {NOMBRE}." con el caret parpadeante y el botón "ENVIAR OTRO MENSAJE", que limpia el formulario.
- **Estados del formulario**, que amplían la plantilla:
  - `idle`: el formulario es editable.
  - **Campos vacíos (cliente):** shake de 400 ms sin llamar al servidor, igual que la plantilla.
  - `sending`: el botón queda deshabilitado con el texto "▶  ENVIANDO…" y los campos pasan a `readOnly`.
  - `success`: terminal de éxito.
  - `invalid`: el servidor rechaza los datos y el formulario hace shake. Se conservan los datos.
  - `error`: el envío falla y aparece el mismo bloque terminal en modo error, con líneas `[ERR]` en rojo y el botón "REINTENTAR", que vuelve al formulario con los datos intactos.
- **Server Action** `sendContactMessage` en `app/actions/contact.ts` (`"use server"`) que:
  - Valida en el servidor que los tres campos tengan texto tras `trim()`, que el email tenga un formato válido (regex simple) y los límites nombre ≤ 80, email ≤ 254 y mensaje ≤ 2000 caracteres.
  - Comprueba un campo honeypot oculto llamado `website`. Si llega con contenido, devuelve `{ ok: true }` sin enviar nada.
  - Envía el correo con el SDK `resend`. El remitente es `CONTACT_FROM_EMAIL`, el destinatario `CONTACT_TO_EMAIL`, el `replyTo` es el email del usuario y el asunto es `[Arcade Vault] Mensaje de {nombre}`. El cuerpo va en texto plano y en HTML simple con nombre, correo y mensaje, escapando el HTML.
  - Ante un fallo de Resend, una excepción o una variable de entorno ausente, registra el error con `console.error` en el servidor y devuelve `{ ok: false, reason: "send_failed" }`. Nunca expone la API key ni el detalle del error al cliente.
- **Variables de entorno:** `RESEND_API_KEY` y `CONTACT_TO_EMAIL` son obligatorias. `CONTACT_FROM_EMAIL` es opcional y por defecto vale `Arcade Vault <onboarding@resend.dev>`. Se documentan en un nuevo `.env.example`, y se añade `!.env.example` a `.gitignore`.
- **Dependencia nueva:** `resend`.
- **Rutas:** nueva ruta `about` en `#/acerca`.
- **Nav:** enlace "Acerca de" como último enlace de navegación, en escritorio y en el panel móvil (en el móvil va antes de "Iniciar Sesión" / "Cuenta"), igual que en `nav.jsx`. Solo se resalta en `#/acerca`.
- **Hook compartido `useReveal`:** se extrae de `Home.tsx` a `components/arcade/useReveal.ts`, y lo usan Home y About.
- **CSS:** portar a `app/globals.css` la sección `ABOUT PAGE` de `references/templates/home-about/styles.css`, incluidos los keyframes `pxblink` y `shake`, y solo las reglas que falten (por ejemplo, el estilo de `textarea` en `.contact-form`). Se añaden las reglas mínimas del modo error del terminal (`.terminal-error`, `.line.error`) y del botón deshabilitado, con los colores existentes (`--magenta` o rojo de la paleta).
- **Accesibilidad mínima:** los `label` asociados con `htmlFor` e `id`, el honeypot oculto con `aria-hidden`, `tabIndex={-1}` y `autoComplete="off"`, el terminal de éxito o error anunciado con `role="status"` / `aria-live="polite"` y los iconos y el divisor con `aria-hidden`.

### No entra
- Correo de confirmación al usuario.
- Rate limit por IP, CAPTCHA o cualquier otro anti-spam aparte del honeypot.
- Plantillas con React Email o estilos ricos en el correo.
- Guardar los mensajes en una base de datos o en `localStorage`.
- Verificar un dominio propio en Resend (es configuración externa y no se toca el código).
- CSS de la sección `GAMEPAD` de `home-about/styles.css`.
- Cambiar otras pantallas o destinos de navegación de SPEC 01 y 02.
- Rutas reales del App Router por pantalla.
- Rediseño estético: el diseño es el de la plantilla.
- Tests automatizados (no hay test runner configurado).

---

## Modelo de datos

### `lib/route.ts` (modificado)
```ts
export type Route =
  | { name: "home" }
  | { name: "biblioteca" }
  | { name: "detalle"; id: string }
  | { name: "player"; id: string }
  | { name: "auth" }
  | { name: "salon" }
  | { name: "about" };   // nuevo
```

| Route | Hash |
|---|---|
| about | `#/acerca` (nuevo) |
| resto | sin cambios respecto a SPEC 02 |

### `app/actions/contact.ts` (nuevo)
```ts
export interface ContactInput {
  name: string;
  email: string;
  msg: string;
  website: string; // honeypot, debe llegar vacío
}

export type ContactResult =
  | { ok: true }
  | { ok: false; reason: "invalid" | "send_failed" };

export async function sendContactMessage(input: ContactInput): Promise<ContactResult>;
```

### Estado del formulario en `About.tsx`
```ts
type FormState = { name: string; email: string; msg: string; website: string };
type Status = "idle" | "sending" | "success" | "error";
// shake: boolean, separado (lo activan la validación del cliente y reason "invalid")
// sentName: string (nombre mostrado en el terminal de éxito)
```

| `ContactResult` | UI |
|---|---|
| `{ ok: true }` | `status = "success"` → terminal de éxito |
| `{ ok: false, reason: "invalid" }` | `status = "idle"` + shake, datos intactos |
| `{ ok: false, reason: "send_failed" }` o excepción de red | `status = "error"` → terminal de error con "REINTENTAR" |

### Variables de entorno (`.env.example`)
```bash
RESEND_API_KEY=re_xxxxxxxx
CONTACT_TO_EMAIL=tu-correo@ejemplo.com
# Opcional. Sin dominio verificado, Resend solo entrega al correo de tu cuenta.
CONTACT_FROM_EMAIL="Arcade Vault <onboarding@resend.dev>"
```

No se añade nada a `localStorage`.

---

## Plan de implementación

1. **Rutas.** Añadir `about` a `Route`, `routeToHash` (`#/acerca`) y `hashToRoute`. En `ArcadeApp.tsx`, `about` renderiza la Home de forma provisional. `npm run lint` pasa.
2. **Hook compartido.** Mover `useReveal` de `Home.tsx` a `components/arcade/useReveal.ts` e importarlo en Home. La Home se ve igual. `npm run lint` pasa.
3. **CSS.** Portar la sección `ABOUT PAGE` a `app/globals.css` con los keyframes `pxblink` y `shake`, solo los selectores que falten. Añadir las reglas de `.terminal-error` / `.line.error` y del botón deshabilitado. Desactivar las animaciones `pxblink` y `shake` dentro del bloque `prefers-reduced-motion` existente. `npm run build` pasa.
4. **About visual.** Crear `components/arcade/About.tsx` (`"use client"`) con `HighlightIcon`, el hero, el divisor y la sección de contacto con el formulario y la validación del cliente (vacío → shake). El submit muestra el terminal de éxito localmente, como en la plantilla. `ArcadeApp` renderiza `About` en la ruta `about`.
5. **Nav.** Añadir "Acerca de" en escritorio y en el panel móvil, con resaltado solo en `about`.
6. **Resend y Server Action.** Ejecutar `npm install resend`. Crear `.env.example` y añadir `!.env.example` a `.gitignore`. Crear `app/actions/contact.ts` con la validación, el honeypot, el envío y el escapado de HTML según el modelo de datos. Antes de escribirlo, leer la guía de Server Actions en `node_modules/next/dist/docs/`. `npm run build` pasa.
7. **Conectar el formulario.** En `About.tsx`, añadir el honeypot oculto, el estado `sending` (botón "▶  ENVIANDO…" y campos `readOnly`), la llamada a `sendContactMessage` y el mapeo de `ContactResult` a la UI (tabla del modelo de datos), además del terminal de error con "REINTENTAR". "ENVIAR OTRO MENSAJE" vuelve a `idle` con el formulario vacío.
8. **Pulido.** Revisión visual y de accesibilidad con `/frontend-design` sin cambiar el aspecto. Ejecutar `npm run lint` y `npm run build`. Comparar en `npm run dev` a 1280 px y 375 px con `references/templates/home-about/arcade-vault-standalone.html`. Hacer un envío real con un `.env.local` válido.

Archivos nuevos: `components/arcade/About.tsx`, `components/arcade/useReveal.ts`, `app/actions/contact.ts`, `.env.example`.
Archivos modificados: `lib/route.ts`, `components/arcade/ArcadeApp.tsx`, `components/arcade/Nav.tsx`, `components/arcade/Home.tsx`, `app/globals.css`, `.gitignore`, `package.json`, `package-lock.json`.

---

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` terminan sin errores, y la consola del navegador no muestra warnings de hidratación.
- [ ] `#/acerca` muestra la pantalla Acerca de. Al recargar en `#/acerca`, se sigue viendo.
- [ ] La pantalla muestra, en este orden: hero con 3 highlights, divisor de 24 píxeles y sección de contacto con 3 tips y formulario.
- [ ] Los textos, placeholders y estilos coinciden con `about.jsx` al compararlos lado a lado con `arcade-vault-standalone.html`.
- [ ] El Nav muestra "Acerca de" como último enlace (escritorio y panel móvil), resaltado solo en `#/acerca`, y lleva a `#/acerca`.
- [ ] Enviar con algún campo vacío o solo con espacios provoca un shake y no hace ninguna petición al servidor (pestaña Network vacía).
- [ ] Durante el envío, el botón muestra "▶  ENVIANDO…", está deshabilitado y los campos no se pueden editar.
- [ ] Con un `.env.local` válido, enviar el formulario hace llegar un correo a `CONTACT_TO_EMAIL` con el asunto `[Arcade Vault] Mensaje de {nombre}`. Al pulsar "Responder", el destinatario es el email del usuario.
- [ ] Tras un envío correcto, se ve el terminal de éxito con "GRACIAS, {NOMBRE EN MAYÚSCULAS}." y "ENVIAR OTRO MENSAJE" deja el formulario vacío.
- [ ] Un mensaje con `<script>` llega al correo como texto visible, no como HTML ejecutado.
- [ ] Con un email de formato inválido que el navegador deje pasar (por ejemplo, llamando a la acción directamente) o con un mensaje de más de 2000 caracteres, la acción devuelve `reason: "invalid"` y el formulario hace shake con los datos intactos.
- [ ] Si `RESEND_API_KEY` falta o no es válida, se ve el terminal de error con líneas `[ERR]`. "REINTENTAR" vuelve al formulario con los mismos datos, y la respuesta al cliente no contiene la API key ni el detalle del error.
- [ ] Si el honeypot `website` llega relleno, la acción devuelve `{ ok: true }` y no se envía ningún correo.
- [ ] Las secciones con `.reveal` aparecen con animación al hacer scroll. Con "reducir movimiento" activado, se ven sin animación y el divisor no parpadea.
- [ ] La Home sigue funcionando igual tras extraer `useReveal`.
- [ ] A 375 px de ancho, Acerca de no tiene scroll horizontal, el formulario ocupa una sola columna y el panel móvil incluye "Acerca de".
- [ ] `.env.example` está versionado y no se ha commiteado ningún `.env.local`.
- [ ] `app/globals.css` no contiene clases `.gp-*`.

---

## Decisiones tomadas y descartadas

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Server Action (`app/actions/contact.ts`) | Route Handler `app/api/contact/route.ts` | Es lo idiomático en Next 16: no hay endpoint REST público y el tipado va de punta a punta con menos código. |
| Remitente, destinatario y API key en variables de entorno, con `onboarding@resend.dev` por defecto | Valores fijos en el código | Permite empezar sin dominio verificado y cambiar a uno propio sin tocar código. |
| `replyTo` con el email del usuario | Incluir el email solo en el cuerpo | Se puede responder directamente desde el cliente de correo. |
| Terminal en modo error con "REINTENTAR" | Shake con mensaje inline | Mantiene la estética VAULT-OS y conserva los datos. |
| Correo en texto plano + HTML simple escapado | React Email | Solo añade la dependencia `resend`. Un correo interno no necesita diseño. |
| Validación en el cliente (como la plantilla) y en el servidor (formato y límites) sin librerías | zod / solo campos no vacíos | El servidor no puede confiar en el cliente, y unas reglas tan simples no justifican una dependencia. |
| Honeypot `website` que responde OK en silencio | Rate limit en memoria / CAPTCHA / nada | Frena bots básicos sin cambiar el diseño. Un rate limit en memoria es frágil en serverless. |
| Estado "ENVIANDO…" en el botón | Terminal animado mientras espera | Es simple y deja claro que el éxito solo se muestra cuando el envío es real. |
| Sin correo de confirmación al usuario | Enviar confirmación | Con `onboarding@resend.dev`, Resend solo entrega a la cuenta propia y haría falta un dominio verificado. |
| Extraer `useReveal` a un archivo compartido | Duplicarlo en About | Evita copiar lógica entre dos pantallas. |
| Ruta `#/acerca` | `#/about` | Sigue la convención de hashes en español (`#/acceso`, `#/salon`). |
| Primer backend del proyecto (excepción a "sin backend" de SPEC 01) | Seguir sin backend con un formulario simulado | Lo pide el usuario: el correo debe enviarse de verdad. |

---

## Riesgos identificados

| Riesgo | Mitigación |
|---|---|
| Sin dominio verificado, Resend solo entrega al correo dueño de la cuenta | `CONTACT_TO_EMAIL` debe ser ese correo. Está documentado en `.env.example`. |
| Variables de entorno ausentes en el build o en producción | La acción las lee en tiempo de ejecución, no al importar. Si faltan, devuelve `send_failed` y lo registra en el log, sin romper el build. |
| Filtrar la API key o errores internos al cliente | La acción solo devuelve `ok` / `reason`, y el detalle va a `console.error` en el servidor. |
| Inyección de HTML en el correo | Se escapan `& < > " '` en el cuerpo HTML. El texto plano se envía tal cual. |
| Inyección de cabeceras a través del nombre en el asunto | Se eliminan los saltos de línea del nombre y se recorta a 80 caracteres antes de usarlo en el asunto. |
| La Server Action se puede invocar fuera del formulario | La validación del servidor y el honeypot se aplican siempre, sin importar el origen. |
| Conflictos de CSS (`.field`, `.btn`, `textarea`) | Portar solo los selectores que falten y comparar visualmente Acceso y Home tras el paso 3. |
| API de Server Actions distinta en Next 16 | Leer `node_modules/next/dist/docs/` antes del paso 6, como indica `AGENTS.md`. |

---

## Qué **no** entra en esta spec

- Correo de confirmación al usuario.
- Rate limit, CAPTCHA o anti-spam avanzado.
- React Email o correos con diseño.
- Persistencia de los mensajes.
- Verificación de dominio en Resend.
- CSS de la sección `GAMEPAD`.

Si alguna de estas llega a hacerse, irá en su propia spec.
