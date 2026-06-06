# I18N KNOWLEDGE BASE

**Location:** `src/lib/i18n/`

## OVERVIEW

Domain-split translations using `typesafe-i18n` with English (en) and Chinese (zh) support.

## WHERE TO LOOK

| Task                   | Location                            |
| ---------------------- | ----------------------------------- |
| Edit general UI text   | `src/lib/i18n/{en,zh}/common.ts`    |
| Add QSO field labels   | `src/lib/i18n/{en,zh}/qso.ts`       |
| Update auth strings    | `src/lib/i18n/{en,zh}/auth.ts`      |
| Modify menu items      | `src/lib/i18n/{en,zh}/nav.ts`       |
| ADIF import/export     | `src/lib/i18n/{en,zh}/adif.ts`      |
| Equipment settings     | `src/lib/i18n/{en,zh}/equipment.ts` |
| QSL card messages      | `src/lib/i18n/{en,zh}/qsl.ts`       |
| Locale detection logic | `src/lib/i18n/index.ts`             |

## CONVENTIONS

- Keep parity: add new keys to both `en/` and `zh/` folders simultaneously.
- Use domain files: group strings by feature. Don't dump everything into `common.ts`.
- Index merge: each locale's `index.ts` imports and combines its domain files.
- Type safety: `typesafe-i18n` generates TypeScript definitions from the `en` base locale.

## NOTES

- `i18n-types.ts` and `i18n-util.ts` are auto-generated. Don't edit them manually.
- Files regenerate during `pnpm dev`. If types aren't updating, restart the dev server.
- The `en` locale serves as the base for type generation.
- **Current Type Drift**: `src/lib/i18n/{en,zh}/equipment.ts` contains `activate` and `deactivate`, but `src/lib/i18n/i18n-types.ts` does not yet expose those keys. This is one of the current `pnpm check` failures. Regenerate or update types before using `t.equipment.activate` / `t.equipment.deactivate`.
