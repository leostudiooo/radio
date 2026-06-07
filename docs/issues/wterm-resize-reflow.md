# wterm resize reflow limitation

## Status

Open. Documented on 2026-06-08 after testing the homepage terminal on narrow
viewports.

## Summary

The homepage terminal currently uses `wterm` with a fixed 80x24 grid and
`autoResize: false`. Enabling `autoResize` is directionally correct for a
responsive terminal, but it exposes a core limitation in wterm: resize is
implemented as grid clipping/extension, not modern terminal reflow.

This means wterm can change its column count, but it does not preserve enough
line metadata to rewrap previous output when the terminal width changes.

## Reproduction

1. Start with a wide terminal.
2. Write a long line that is wider than the eventual narrow viewport.
3. Resize the terminal/container narrower.
4. Observe that content beyond the new column width is clipped or lost during
   the resize.
5. Type more text. New text can wrap to the next physical row.
6. Resize the terminal/container wider again.
7. Observe that the wrapped text does not reflow back into the original logical
   line.

Expected modern terminal behavior:

- Existing output rewraps when the terminal becomes narrower.
- Soft-wrapped output joins back together when the terminal becomes wider.
- Hard line breaks remain hard line boundaries.

Observed wterm behavior:

- Old cells beyond the new column width are cleared.
- Later soft-wrapped physical rows are not marked as continuations.
- When the terminal becomes wider again, wterm has no metadata telling it which
  physical rows belong to the same logical line.

## Affected files

Application integration:

- `src/lib/ui/components/Terminal.svelte`
- `src/lib/ui/components/terminalSession.ts`
- `src/routes/+page.svelte`

wterm fork:

- `vendors/wterm/src/terminal.zig`
- `vendors/wterm/src/grid.zig`
- `vendors/wterm/src/scrollback.zig`
- `vendors/wterm/src/wasm_api.zig`
- `vendors/wterm/packages/@wterm/dom/src/wterm.ts`
- `vendors/wterm/packages/@wterm/dom/src/renderer.ts`

## Root cause

`@wterm/dom` only measures the container and calls:

```ts
this.resize(newCols, newRows);
```

The actual behavior is controlled by the Zig core. Current `Terminal.resize()`
in `vendors/wterm/src/terminal.zig`:

- clamps the requested cols/rows
- clears cells beyond the new column width when shrinking
- pushes excess bottom rows into scrollback when shrinking vertically
- clears newly exposed rows/columns when growing
- clamps the cursor position
- marks rows dirty

It does not:

- preserve cells clipped by horizontal shrink
- distinguish hard line breaks from soft wraps
- track whether a row is a continuation of the previous row
- reconstruct logical lines during resize
- rewrap scrollback plus viewport into the new column width

`wrap_pending` only controls future printing at the right edge. It is not a
history/reflow mechanism.

## Why this is a wterm limitation, not a Svelte layout bug

The Svelte wrapper can choose fixed sizing, overflow behavior, or
`autoResize`. It cannot recover content that the terminal core has already
discarded during resize.

The DOM renderer also cannot reliably infer logical lines from rendered rows,
because two adjacent physical rows may be separated by a hard newline, a soft
wrap, cursor movement, line editing, or screen application output. That
information belongs in the terminal buffer model.

## Short-term options

Keep the homepage terminal fixed at 80x24:

- Leave `autoResize: false`.
- Avoid exposing half-responsive resize behavior.
- Accept clipping/visual overflow constraints as a deliberate homepage design
  tradeoff.

Add horizontal scrolling:

- Preserves content visibility on narrow screens.
- Does not produce modern terminal behavior.
- May feel awkward on mobile.

Use a separate transcript renderer for homepage output:

- Can make static intro/output text responsive.
- Splits terminal display behavior from interactive terminal behavior.
- Not ideal if the homepage terminal should behave like a real terminal.

## Preferred wterm fix

Add reflow support to the wterm core for the normal screen buffer.

Minimal shape:

1. Add per-row soft-wrap metadata to `Grid`, for example
   `wrapped_from_prev: [MAX_ROWS]u8`.
2. Add the same metadata to `ScrollbackLine`.
3. Update automatic wrap printing so a row created by auto-wrap is marked as a
   continuation of the previous row.
4. Ensure hard line feeds, carriage returns, clears, inserted/deleted lines,
   and new blank rows reset continuation metadata where appropriate.
5. Update grid scrolling and scrollback push/pop paths to move continuation
   metadata with row cells.
6. Replace the normal-screen resize path with a reflow algorithm:
   - collect scrollback and viewport rows in chronological order
   - merge rows into logical lines using `wrapped_from_prev`
   - rewrap logical lines to `new_cols`
   - rebuild scrollback and viewport rows
   - restore cursor position as reasonably as possible
   - mark all affected rows dirty
7. Keep a conservative grid-only resize fallback for alternate screen and
   non-default scroll regions.

After that, the app can enable `autoResize: true` in
`src/lib/ui/components/Terminal.svelte`.

## Test cases to add

Zig core tests:

- A long line shrinks to multiple rows and grows back into one logical row.
- Hard newlines remain hard boundaries after shrink and grow.
- Soft-wrapped rows that scroll into scrollback still reflow.
- Horizontal shrink does not discard clipped cells.
- Cursor position remains near the same logical character after reflow.
- Alternate screen keeps conservative resize behavior.

Browser smoke tests:

- Homepage terminal at desktop width.
- Homepage terminal at narrow/mobile width.
- Write long output, resize narrow, type more, resize wide, and inspect that the
  logical line reflows back instead of staying permanently split.

## Notes

xterm.js already has a mature buffer/reflow implementation, but switching to it
would mean giving up wterm's simpler DOM rendering model or re-porting the
input/IME proxy work already done in the fork. For this project, improving the
wterm fork is likely the better long-term path if the homepage terminal should
remain DOM-friendly and IME-aware.
