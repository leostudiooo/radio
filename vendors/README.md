# Vendored wterm

This directory contains the `wterm` submodule used by the homepage terminal.

The app still imports `@wterm/dom`, but Vite and SvelteKit aliases point that
package name at `vendors/wterm/packages/@wterm/dom/src`.

The submodule points at the `radio-input-proxy` branch of
`git@github.com:leostudiooo/wterm.git`. That fork carries the local terminal
input patch directly. The fork's `upstream` remote should remain
`https://github.com/vercel-labs/wterm.git`.

## Local patches

The important fork patch affects `packages/@wterm/dom/src/input.ts` and
`packages/@wterm/dom/src/wterm.ts`.

Upstream wterm keeps its input textarea off-screen. That breaks IME preview
placement and mobile viewport focus because the browser does not see a real
input at the terminal cursor. This vendor patch follows the xterm.js / VS Code
input proxy model:

- keep a real textarea focused inside the terminal
- position that textarea at the current terminal cursor after render
- add a composition overlay at the same cursor position for IME preedit text
- keep terminal rendering and ANSI parsing in wterm

The fork also commits `vendors/wterm/packages/@wterm/core/src/wasm-inline.ts`
so this project can alias directly to wterm source without running wterm's
package build first.
