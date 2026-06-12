# lazyman

TUI HTTP client — OpenTUI + SolidJS, run with Bun. Inspired by lazygit.

## Commands

```sh
bun install              # install dependencies
bun dev                  # run TUI with live reload
bun dev-console          # run TUI with console overlay visible (SHOW_CONSOLE=true)
bun dev-init             # run `lazyman init` subcommand (bootstrap .lazyman/)
bun test                 # run all tests (37 tests)
bun test:watch           # run tests in watch mode
```

## Tech

- **Bun** is runtime and package manager. `tsconfig.json` has `noEmit: true` — Bun handles transpilation in-memory.
- **OpenTUI** (`@opentui/solid` + `@opentui/core`) — terminal UI framework. JSX import source is `@opentui/solid`.
- **SolidJS 1.9.12** — reactive UI library. Stores use `solid-js/store` (`createStore`).
- **`bunfig.toml`** preloads `@opentui/solid/preload`. Test command uses `--preload=@opentui/solid/preload`.
- Render config: 30 FPS, console overlay mode, console at bottom position.
- Keyboard input via `useKeyboard` from `@opentui/solid`. Each component checks `appStore.activePane` before responding.

## Architecture

```
src/
  index.tsx                   — entrypoint: `init` subcommand → CLI, else → TUI (3-pane layout + global keybindings)
  types.ts                    — shared data models
  cli/init.ts                 — `lazyman init` bootstrap (.lazyman/ tree, example.http, .gitignore)
  parser/
    http-parser.ts            — RFC-2616 .http file parser (line-by-line, tracks sourceLine)
    variable-resolver.ts      — {{var}} cascading resolution (inline → env → base → OS)
  engine/
    executor.ts               — HTTP via Bun.fetch() + timing + error wrapper
    assertions.ts             — # @assert evaluator (status, headers, body paths)
    scripting.ts              — JS lifecycle hooks via new Function()
    history.ts                — save/load .lazyman/history/ + diff two responses
  components/
    pane.tsx                  — bordered pane wrapper (border color, title, focus highlighting)
    file-explorer.tsx         — left pane: .http file list + keyboard navigation
    request-viewer.tsx        — top-right: rendered request display + execution trigger
    response-viewer.tsx       — bottom-right: tabbed response (Body/Headers/Cookies) + JSON tree
    env-modal.tsx             — environment selector (full-screen overlay)
  stores/
    appStore.ts               — SolidJS createStore: activePane, parsedRequests, response, etc.
  utils/
    panes.ts                  — Pane enum (FILE_EXPLORER, REQUEST_VIEWER, RESPONSE_VIEWER, ENV_MODAL)
    title.ts                  — joinTitle helper
  style.ts                   — color constants (border, method colors, JSON syntax, status codes)
  __tests__/
    tracer-bullet.test.ts    — full pipeline integration test
    parser/
      http-parser.test.ts    — multi-block, body, file injection, inline vars
      variable-resolver.test.ts — dot-path, cascade, unresolved vars
    engine/
      assertions.test.ts     — operators, body path, edge cases
      executor.test.ts       — HTTP via local Bun.serve()
      scripting.test.ts      — pre-request, post-response, error handling
      history.test.ts        — save, load sorted, diff
    components/
      pane.test.tsx          — rendering via testRender
```

## Key patterns

- **Pane (not Panel):** Each bordered region is a Pane. Three main panes + one modal overlay.
- **Keyboard routing:** Components use `useKeyboard` and check `appStore.activePane` before acting.
- **Execution pipeline:** Resolve variables → pre-request script → HTTP → post-response script → assertions → save history.
- **No centralized test-lint-typecheck scripts** — just `bun test`.
