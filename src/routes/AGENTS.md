# ROUTES KNOWLEDGE BASE

## OVERVIEW
SvelteKit SPA routes, ssr=false, all data loading in onMount.

## WHERE TO LOOK

| Task | Route | Notes |
|------|-------|-------|
| Dashboard | `+page.svelte` | Recent QSOs summary |
| Login / Callback | `auth/` | Passkey and magic link flows |
| QSO List | `qso/+page.svelte` | Paginated and filtered view |
| New QSO | `qso/new/+page.svelte` | Entry form |
| Edit QSO | `qso/[id]/edit/+page.svelte` | Detail modification |
| QSL Cards | `qsl/` | Management and status |
| ADIF Tools | `adif/` | Import/export utilities |
| Gear Management | `equipment/` | Radios, antennas, tuners |

## CONVENTIONS
- No `load()` functions. Fetch data in `onMount`.
- Auth checks in `onMount`. Use `goto()` for redirects.
- Root layout provides auth context via `setContext('auth', authStore)`.
- Use `layout.css` OKLCH tokens for custom colors.
- Follow Tailwind v4 theme patterns.

## ANTI-PATTERNS
- Never add `+page.ts` load functions (root `+layout.ts` only sets `ssr = false`).
- Never add `+server.ts` endpoints.
- Avoid SSR logic. Components must be browser compatible.
- Don't bypass `authStore` for route guards.
