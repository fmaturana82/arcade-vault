# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault is an online platform for playing games and competing for the highest score. The repo is currently a fresh `create-next-app` scaffold (only `app/layout.tsx`, `app/page.tsx`, `app/globals.css`); features have yet to be built.

Development follows **Spec Driven Design** using the `/spec` (write a spec) and `/spec-impl` (implement a spec) skills from [Klerith/fernando-skills](https://github.com/Klerith/fernando-skills). If they are not installed, install them with:

```bash
npx skills@latest add Klerith/fernando-skills
```

## Commands

```bash
npm run dev     # next dev (Turbopack)
npm run build   # next build
npm start       # serve the production build
npm run lint    # eslint (flat config: next core-web-vitals + typescript)
```

No test runner is configured yet. See `node_modules/next/dist/docs/01-app/02-guides/testing/` before adding one.

## Stack and configuration

- **Next.js 16.4 (App Router) + React 19.3 + TypeScript (strict)**. APIs differ from older Next.js; check the bundled docs in `node_modules/next/dist/docs/` before writing code (see AGENTS.md). For example, the root layout is typed with the global `LayoutProps<"/">` helper instead of hand-written props.
- **`cacheComponents: true`**: component and function-level caching with the `"use cache"` directive, `cacheLife()`, `cacheTag()` and `updateTag()`. Routes prerender a static shell; dynamic or uncached data must sit behind `<Suspense>`. Guide: `docs/01-app/01-getting-started/08-caching.md`.
- **`partialPrefetching: true`**: `<Link>` prefetches only a per-route App Shell by default, so URL-dependent data (`params`, `searchParams`) should be read inside `<Suspense>`. Use `<Link prefetch={true}>` to prefetch more. A route can opt out of instant-navigation validation with `export const instant = false`. Guide: `docs/01-app/02-guides/adopting-partial-prefetching.md`.
- **`experimental.agentFeedback: true`**: `next dev` rewrites the managed block in `AGENTS.md`. Commit that file with your work rather than reverting it.
- **Tailwind CSS v4**, loaded through a Turbopack loader rule for `*.css` (`@tailwindcss/turbopack`) in `next.config.ts`; there is no PostCSS config. Theme tokens are defined in `app/globals.css` via `@theme inline` (CSS variables for background, foreground and the Geist fonts).
- Path alias: `@/*` resolves to the repo root.
