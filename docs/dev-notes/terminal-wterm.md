# Homepage terminal and wterm fork

This note records how the homepage terminal is wired, why `wterm` is vendored as
a fork, and what to preserve when changing terminal input behavior.

## Current architecture

The homepage uses `src/lib/ui/components/Terminal.svelte` as a thin Svelte
wrapper around `@wterm/dom`.

`@wterm/dom`, `@wterm/core`, and `@wterm/dom/css` are not resolved from npm.
Both `vite.config.ts` and `svelte.config.js` alias them to source files inside
the `vendors/wterm` git submodule:

- `vendors/wterm/packages/@wterm/dom/src/index.ts`
- `vendors/wterm/packages/@wterm/core/src/index.ts`
- `vendors/wterm/packages/@wterm/dom/src/terminal.css`

Vite also allows serving `./vendors` through `server.fs.allow`; without that,
dev server imports from the submodule fail with a Vite allow-list error.

The submodule tracks the fork branch:

```text
git@github.com:leostudiooo/wterm.git
branch: radio-input-proxy
```

Do not add a build-time patch step for wterm. Make library changes in the fork,
push the fork branch, then update and commit the submodule pointer in this repo.

## Terminal sizing

The terminal is intentionally fixed at a maximum terminal grid of 80 columns by
24 rows:

```ts
new WTerm(terminalHost, {
	cols: 80,
	rows: 24,
	autoResize: false,
	cursorBlink: true
});
```

The Svelte wrapper constrains the visual dimensions with CSS custom properties:

- `--terminal-cols: 80`
- `--terminal-rows: 24`
- `--terminal-cell-width: 0.5em`
- `--term-font-family: var(--font-mono)`
- `--term-font-size: var(--text-body)`
- `--term-row-height: calc(var(--text-body) * var(--line-height-tight))`

The 0.5em cell width is deliberate because the site mono font is half-em width.
If the terminal font changes, revisit this value and verify that 80 columns do
not overflow on desktop or mobile.

The homepage container prefers `100dvh` where supported, with `100vh` as the
fallback. This matters on mobile because software keyboards change the visual
viewport; a pure `100vh` layout can stay centered against the old layout
viewport and leave the terminal input covered by the keyboard.

## Input proxy model

The forked wterm follows the xterm.js / VS Code style input proxy model:

1. Keep terminal rendering as DOM rows and spans.
2. Keep a real focused `textarea` inside the terminal DOM.
3. Position that textarea at the current terminal cursor after render.
4. Keep the textarea visually transparent.
5. Show IME preedit text through a separate composition overlay at the same
   cursor position.

The important fork files are:

- `vendors/wterm/packages/@wterm/dom/src/input.ts`
- `vendors/wterm/packages/@wterm/dom/src/wterm.ts`

`wterm.ts` measures character width and row height, then calls
`input.syncToCursor(...)` after render. `input.ts` owns the actual textarea,
composition events, paste handling, keyboard sequence conversion, and mobile
viewport avoidance.

## IME behavior

IME support depends on letting the browser own composition until it commits:

- During composition, `keydown` handling returns early.
- `compositionstart` marks the session as composing and shows the overlay.
- `compositionupdate` writes the preedit string into the overlay.
- `compositionend` hides the overlay and emits the committed data.
- Normal non-composition input is emitted from the `input` event, then the
  textarea value is cleared.

Do not move the textarea permanently off-screen. That breaks IME preview
placement and makes mobile browsers treat the field less like a real input.

## Mobile keyboard avoidance

Mobile browsers are not reliable enough if we only call:

```ts
textarea.focus({ preventScroll: false });
```

The keyboard appears after focus and changes the visual viewport. The browser
does not always auto-scroll a transparent, absolutely positioned input proxy
above the keyboard.

The fork therefore schedules `ensureVisible()` after:

- textarea focus
- cursor sync
- `visualViewport.resize`
- `visualViewport.scroll`
- window resize fallback

`ensureVisible()` compares the textarea document rect to:

```text
visualViewport.offsetTop + visualViewport.height
```

If the cursor row would be covered, it scrolls the page just enough to keep the
input visible with a small margin.

Use `behavior: "auto"` for this scroll. Smooth scrolling can lag behind the
keyboard animation and make the input still feel stuck.

## Auth-dependent prompt identity

The terminal session receives the current callsign from:

```ts
() => authStore.callsign ?? 'guest';
```

Do not fall back to the station callsign or a personal hard-coded value when the
visitor is not logged in. Anonymous users should see `guest`.

## Clear behavior

The terminal intro text is terminal buffer content. Once interactive mode is
active, `clear` should clear the whole terminal buffer, including the intro line
such as `See you in the air.`, not only the current command output. Treat intro
printing as initial shell/session output, not as UI chrome outside the terminal.

## Verification checklist

Run these before committing terminal changes:

```bash
pnpm check
pnpm build
```

Known noise:

- `svelte-check` may print unresolved config/import noise from wterm examples.
- Existing Svelte warnings in app components are not introduced by terminal
  changes.

For browser smoke testing:

1. Open the homepage on the dev server.
2. Click the terminal.
3. Confirm the active element is the internal `textarea` labelled
   `Terminal input`.
4. Type `whoami` and press Enter.
5. Logged-out output should be `guest`.
6. Test a narrow/mobile viewport and confirm the page scrolls when the viewport
   height shrinks with the terminal focused.
7. On a real phone, tap the terminal and confirm the software keyboard appears,
   text input works, and the cursor row is not covered by the keyboard.

Real software keyboard behavior cannot be fully proven from a desktop browser
viewport resize. Always do at least one physical mobile check after changing the
input proxy or terminal page layout.

## Updating the fork

When changing wterm behavior:

```bash
cd vendors/wterm
git status
# edit files
git add packages/@wterm/dom/src/input.ts
git commit -m "..."
git push origin radio-input-proxy
cd ../..
git add vendors/wterm
git commit -m "..."
git push origin main
```

If changes touch wterm formatting, format from the wterm project style, not the
main app style. The main project uses tabs and single quotes; wterm currently
uses two-space indentation and double quotes.

## Related files

- `src/lib/ui/components/Terminal.svelte`
- `src/lib/ui/components/terminalSession.ts`
- `src/routes/+page.svelte`
- `vendors/README.md`
- `vendors/wterm/packages/@wterm/dom/src/input.ts`
- `vendors/wterm/packages/@wterm/dom/src/wterm.ts`
- `vite.config.ts`
- `svelte.config.js`
- `.gitmodules`
