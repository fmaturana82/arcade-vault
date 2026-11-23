# SPEC 02 — Home page (landing) de Arcade Vault

**Estado:** Implementado
**Depende de:** SPEC 01 (`01-mvp-pantallas-visuales.md`)
**Fecha:** 2026-11-23
**Objetivo:** Añadir a la SPA una pantalla Home en `#/` que replique la landing de `references/templates/home-about/home.jsx`, moviendo la Biblioteca a `#/biblioteca`.

---

## Alcance

### Entra
- **Pantalla Home** (`components/arcade/Home.tsx`) con las mismas secciones, textos y estilos que `home.jsx`, salvo los ajustes de texto indicados abajo:
  - **Hero:** siluetas pixel flotantes decorativas (8 SVG, `aria-hidden`), eyebrow "▸ INSERTA UNA MONEDA_" con `blink`, título de tres líneas "EL ARCADE / CLÁSICO ESTÁ / DE VUELTA", subtítulo, botones "▶ EXPLORAR JUEGOS" (→ Biblioteca) y "✦ CREAR CUENTA" (→ Acceso), indicador "DESLIZA ▼".
  - **// 01 ¿POR QUÉ ARCADE VAULT?:** 4 tarjetas de características con iconos pixel SVG (GAMEPAD, FREE, TROPHY, ROCKET).
  - **// 02 JUEGOS DISPONIBLES AHORA:** rail con los 6 primeros juegos de `GAMES` (mini-cards → Detalle del juego) y botón "VER TODOS LOS JUEGOS →" (→ Biblioteca).
  - **Franja de estadísticas:** 3 bloques ("8+ JUEGOS", "MILES DE PARTIDAS", "GLOBAL RANKING").
  - **// 03 ACTIVIDAD EN VIVO:** tarjeta "▸ ÚLTIMAS PUNTUACIONES" (7 filas) y tarjeta "▸ TOP JUGADORES · HOY" (5 filas con barra, top1/2/3 resaltados) con botón "VER SALÓN →" (→ Salón de la Fama).
  - **// 04 PRECIOS:** tarjeta "JUGADOR VAULT $0 / SIEMPRE" con lista, botón "EMPEZAR GRATIS →" (→ Acceso), sello "FREE PLAY" y 3 preguntas frecuentes.
  - **CTA final:** "¿LISTO PARA JUGAR?" y botón "INSERTAR MONEDA →" (→ Biblioteca).
- **Animación de aparición al hacer scroll** (`.reveal` → `.reveal.in` con `IntersectionObserver`, umbral 0.12). Con `prefers-reduced-motion: reduce` las secciones se muestran directamente, sin animación.
- **Ajustes de texto frente a la plantilla:**
  - La tarjeta "JUEGOS CLÁSICOS" dice "Bloque Buster, Caída, Serpentina y muchos más. Los mejores arcades de todos los tiempos en un solo lugar." en lugar de nombrar marcas de terceros.
  - La primera estadística dice "8+" en lugar de "12+".
- **Rutas:** nueva ruta `home` en `#/`. La Biblioteca se mueve a `#/biblioteca`. Un hash desconocido o un id inexistente llevan a la Home.
- **Nav:** nuevo enlace "Inicio" (escritorio y panel móvil) como primer enlace. El logo lleva a la Home. "Inicio" se resalta solo en la Home.
- **CSS:** portar a `app/globals.css` solo las secciones `HOME PAGE`, `ACTIVITY (leaderboard + ticker)` y `PRICING` de `references/templates/home-about/styles.css`, más las reglas que necesiten y falten (por ejemplo `.btn.xl`, `.pulse` o keyframes, si no están ya).
- Accesibilidad mínima, igual que en SPEC 01: las mini-cards son `<button>` (no `<div onClick>`), y las siluetas e iconos son `aria-hidden`.

### No entra
- Página **Acerca de** (`about.jsx`), su enlace en el Nav y su formulario de contacto. Va en una spec aparte.
- CSS de las secciones `ABOUT PAGE` y `GAMEPAD` de `home-about/styles.css`.
- Datos reales en "Actividad en vivo": no se lee `av_scores` y no hay actualización en tiempo real.
- Cambiar los destinos de navegación existentes de SPEC 01: login, invitado, "VOLVER AL VAULT" y "VOLVER A LA BIBLIOTECA" siguen yendo a la Biblioteca.
- Rutas reales del App Router por pantalla.
- Rediseño estético: el diseño es el de la plantilla.
- Tests automatizados (no hay test runner configurado).

---

## Modelo de datos

### `lib/route.ts` (modificado)
```ts
export type Route =
  | { name: "home" }          // nuevo
  | { name: "biblioteca" }
  | { name: "detalle"; id: string }
  | { name: "player"; id: string }
  | { name: "auth" }
  | { name: "salon" };
```

| Route | Hash (antes) | Hash (ahora) |
|---|---|---|
| home | — | `#/` |
| biblioteca | `#/` | `#/biblioteca` |
| detalle | `#/juegos/{id}` | sin cambios |
| player | `#/juegos/{id}/jugar` | sin cambios |
| auth | `#/acceso` | sin cambios |
| salon | `#/salon` | sin cambios |

`hashToRoute` devuelve `{ name: "home" }` para `#/`, para un hash vacío, para un hash desconocido y para un id de juego inexistente.

### `lib/data.ts` (añadido, datos estáticos copiados de `home.jsx`)
```ts
export interface RecentScore { player: string; game: string; score: number; ago: string; color: GameColor }
export interface TopPlayer { rank: number; player: string; score: number }

export const RECENT_SCORES: RecentScore[]; // 7 filas: NEONFOX/Caída/184220/"hace 2 min"/magenta … CYBER_LU/Ranaria/18900/"hace 31 min"/yellow
export const TOP_PLAYERS: TopPlayer[];     // 5 filas: NEONFOX 312840 … GLITCHA 138900
```

Los textos de las características, estadísticas, precios y FAQ son constantes locales de `Home.tsx`, porque solo son copy de la landing.

No se añade nada a `localStorage`.

---

## Plan de implementación

1. **Rutas.** Añadir `home` a `Route`, `routeToHash` y `hashToRoute` según la tabla. En `ArcadeApp.tsx`, la ruta inicial y la de respaldo pasan a ser `home`, y `home` renderiza la Biblioteca de forma provisional. `npm run lint` pasa y `#/biblioteca` muestra la Biblioteca.
2. **Datos.** Añadir `RecentScore`, `TopPlayer`, `RECENT_SCORES` y `TOP_PLAYERS` a `lib/data.ts`. `npm run lint` pasa.
3. **CSS.** Portar a `app/globals.css` las secciones `HOME PAGE`, `ACTIVITY` y `PRICING`, más las reglas que falten. Añadir `.reveal` dentro del bloque `prefers-reduced-motion` existente (`opacity: 1; transform: none; transition: none`). `npm run build` pasa.
4. **Home: hero y // 01.** Crear `components/arcade/Home.tsx` (`"use client"`) con un hook `useReveal`, el componente `FloatingSilhouettes`, el hero, `FeatureIcon` y la sección de características. `ArcadeApp` renderiza `Home` en la ruta `home`.
5. **Home: // 02 y estadísticas.** Añadir `MiniCard` (`<button>`), el rail con `GAMES.slice(0, 6)`, el botón "VER TODOS LOS JUEGOS →" y la franja de estadísticas.
6. **Home: // 03, // 04 y CTA final.** Añadir "Actividad en vivo" (con los datos de `lib/data.ts` y números formateados con `toLocaleString("es-ES")`), "Precios" con la FAQ y el CTA final. Conectar todos los botones a `navigate`.
7. **Nav.** Añadir el enlace "Inicio" en escritorio y en el panel móvil, y hacer que el logo navegue a `home`. Comprobar que ningún otro destino de SPEC 01 cambia.
8. **Pulido.** Revisión visual y de accesibilidad con `/frontend-design` sin cambiar el aspecto. Ejecutar `npm run lint` y `npm run build`. Comparar en `npm run dev` a 1280 px y 375 px con `references/templates/home-about/arcade-vault-standalone.html`.

Archivos nuevos: `components/arcade/Home.tsx`.
Archivos modificados: `lib/route.ts`, `lib/data.ts`, `components/arcade/ArcadeApp.tsx`, `components/arcade/Nav.tsx`, `app/globals.css`.

---

## Criterios de aceptación

- [x] `npm run lint` y `npm run build` terminan sin errores, y la consola del navegador no muestra warnings de hidratación.
- [x] Al abrir `/`, se ve la Home con el hash `#/`.
- [x] `#/biblioteca` muestra la Biblioteca. `#/loquesea` y `#/juegos/no-existe` muestran la Home.
- [x] La Home muestra, en este orden: hero, // 01 (4 tarjetas), // 02 (6 mini-cards), estadísticas (3 bloques), // 03 (7 filas + 5 filas), // 04 (tarjeta de precio + 3 FAQ) y CTA final.
- [x] La tarjeta "JUEGOS CLÁSICOS" nombra Bloque Buster, Caída y Serpentina. La primera estadística dice "8+". No aparecen "Arkanoid", "Tetris", "Snake" ni "12+".
- [x] "▶ EXPLORAR JUEGOS", "VER TODOS LOS JUEGOS →" e "INSERTAR MONEDA →" llevan a `#/biblioteca`.
- [x] "✦ CREAR CUENTA" y "EMPEZAR GRATIS →" llevan a `#/acceso`.
- [x] "VER SALÓN →" lleva a `#/salon`.
- [x] Hacer clic en una mini-card lleva a `#/juegos/{id}` de ese juego.
- [x] Las secciones con `.reveal` aparecen con animación al entrar en pantalla. Con "reducir movimiento" activado en el sistema, se ven sin animación.
- [x] El Nav muestra "Inicio" como primer enlace (escritorio y panel móvil). Está resaltado solo en la Home. El logo lleva a `#/`.
- [x] El Nav no muestra el enlace "Acerca de".
- [x] Después de hacer login o de entrar como invitado, se sigue llegando a `#/biblioteca`.
- [x] A 375 px de ancho, la Home no tiene scroll horizontal y el panel móvil incluye "Inicio".
- [x] `app/globals.css` no contiene clases `.about*`, `.contact-*` ni `.gp-*`.
- [x] Comparada lado a lado con `references/templates/home-about/arcade-vault-standalone.html`, la Home tiene las mismas secciones y estilos, salvo los dos ajustes de texto.

---

## Decisiones tomadas y descartadas

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Home en `#/`, Biblioteca en `#/biblioteca` | Home en `#/inicio` | Es lo que hace la plantilla: el logo y la portada son la landing. |
| Hash desconocido → Home | Hash desconocido → Biblioteca | Ahora la Home es la raíz natural de la app. |
| Solo el enlace "Inicio" en el Nav | Añadir "Acerca de" con página o sin ella | Acerca de es otra pantalla y va en su propia spec. Así no hay enlaces que no llevan a nada. |
| Datos de actividad fijos en `lib/data.ts` | Mezclar con `av_scores` | Sigue la línea mock de SPEC 01 y evita lógica extra y riesgos de hidratación. |
| Copy de características y precios local en `Home.tsx` | Moverlo a `lib/data.ts` | Es texto de marketing de una sola pantalla y no lo reutiliza nadie. |
| Portar solo el CSS de HOME, ACTIVITY y PRICING | Sincronizar todo `styles.css` | No se añaden clases muertas. ABOUT y GAMEPAD llegarán con sus specs. |
| Nombrar juegos propios y poner "8+" | Copiar "Arkanoid, Tetris, Snake" y "12+" | Evita marcas de terceros y no promete juegos que no existen. |
| Respetar `prefers-reduced-motion` en `.reveal` | Animar siempre | Mejora de accesibilidad que no cambia el aspecto por defecto. |
| Login e invitado siguen yendo a Biblioteca | Redirigir a la Home | No se reabre el comportamiento ya cerrado en SPEC 01. |

---

## Riesgos identificados

- **Hidratación:** `IntersectionObserver` y `document` solo existen en el cliente. Mitigación: `useReveal` corre en `useEffect`, y el primer render es idéntico en servidor y cliente.
- **Contenido invisible sin JS o si falla el observer:** `.reveal` empieza con `opacity: 0`. Mitigación: aceptado (la app ya es una SPA cliente); con reduced-motion el contenido se muestra siempre.
- **Enlaces o marcadores antiguos a `#/`:** ahora abren la Home en lugar de la Biblioteca. Aceptado, porque el proyecto aún no tiene usuarios.
- **Conflictos de CSS:** las reglas portadas podrían pisar clases existentes (`.btn`, `.kicker`, `.section-*`). Mitigación: en el paso 3, portar solo los selectores que no existen y comparar visualmente las pantallas de SPEC 01.
- **`.reveal` y la lista de nodos:** `useReveal` consulta `.reveal` al montarse. Si Home se vuelve a montar, el efecto vuelve a ejecutarse y se desconecta al desmontar.
