# UI LAYER KNOWLEDGE BASE (src/lib/ui/)

## OVERVIEW

Svelte 5 UI layer using forced runes mode, reactive stores in .svelte.ts files, and barrel-exported components.

## WHERE TO LOOK

| Task                     | Location                    | Notes                           |
| :----------------------- | :-------------------------- | :------------------------------ |
| Add or edit UI component | `components/`               | PascalCase Svelte files         |
| Export new component     | `components/index.ts`       | Required for project-wide use   |
| Modify QSO entry form    | `components/QSOForm.svelte` | Main data entry logic           |
| Define table columns     | `components/DataTable.ts`   | Type definitions for grid       |
| Update auth state        | `stores/auth.svelte.ts`     | Loading, session, user, profile |
| Change route protection  | `stores/guards.svelte.ts`   | Auth and Admin guard logic      |
| Add toast behavior       | `stores/toast.svelte.ts`    | Notification queue management   |
| Global data formatting   | `utils/format.ts`           | Dates, RST, frequency, grids    |
| Filter logic for lists   | `utils/filters.ts`          | Search and category filtering   |

## CONVENTIONS

- **Svelte 5 Runes Only**: Use `$state`, `$derived`, `$props()`, and `$effect`. The compiler rejects legacy `$:` syntax.
- **Store Extensions**: Reactive stores must use `.svelte.ts` extension.
- **Barrel Exports**: All components under `components/` must be exported from `index.ts`.
- **Pure Guards**: Functions in `guards.svelte.ts` must remain pure. They return status enums for the UI to handle, never performing side effects or redirects directly.
- **PascalCase**: All `.svelte` component filenames use PascalCase.

## ANTI-PATTERNS

- **No Legacy Stores**: Never import `writable` or `derived` from `svelte/store`. Use rune-based reactive state in `.svelte.ts` files instead.
- **No Old Reactivity**: Avoid `$:` labels. Use `$derived` for computed values and `$effect` for side effects.
- **Component Bloat**: `QSOForm.svelte` is already large (700+ lines). Extract new fields or complex logic into dedicated sub-components or stores.
- **No UI Side Effects in Logic**: Keep `src/lib/logic` imports restricted to types and data functions.

## NOTES

- **Auth Auto-Init**: `authStore` initializes automatically when the browser `window` object is available.
- **Toast Life**: Notifications in `toastStore` auto-dismiss after exactly 4 seconds.
- **Guard Enums**: Route guards return status strings (`'loading'`, `'admin'`, `'not-admin'`, `'not-authenticated'`, `'authenticated'`) rather than booleans.
- **DataTable Typing**: Always use the `Column` type from `DataTable.ts` when configuring tables to ensure type safety for cell renderers.
