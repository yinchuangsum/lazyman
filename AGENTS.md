# lazyman

TUI HTTP client — OpenTUI + SolidJS, run with Bun. Inspired by lazygit.

## Commands

```sh
bun install              # install dependencies
bun dev                  # run TUI with live reload
bun dev-console          # run TUI with console overlay visible (SHOW_CONSOLE=true)
bun dev-init             # run `lazyman init` subcommand (bootstrap .lazyman/)
bun test                 # run all tests (72 tests across 18 files)
bun test:watch           # run tests in watch mode
bun test:e2e             # run end-to-end tests (18 scenarios via agent-tui)
```

## Tech

- **Bun** is runtime and package manager. `tsconfig.json` has `noEmit: true` — Bun handles transpilation in-memory.
- **OpenTUI** (`@opentui/solid` + `@opentui/core`) — terminal UI framework. JSX import source is `@opentui/solid`.
- **SolidJS 1.9.12** — reactive UI library. Stores use `solid-js/store` (`createStore`).
- **`bunfig.toml`** preloads `@opentui/solid/preload` (for both `bun run` and `bun test`).
- Render config: 30 FPS, console overlay mode, console at bottom position.
- Keyboard input via `useKeyboard` from `@opentui/solid`. Each component checks `appStore.activePane` before responding.

## Architecture

```
src/
  index.tsx                   — entrypoint: `init` subcommand → CLI, else → TUI (4-pane layout + global keybindings + hotkey bar + search input)
  types.ts                    — shared data models (ParsedRequest, ResponseData, HistoryEntry, Assertion, ScriptRef, etc.)
  cli/init.ts                 — `lazyman init` bootstrap (.lazyman/ tree, example.http, .gitignore)
  parser/
    http-parser.ts            — RFC-2616 .http file parser (line-by-line, tracks sourceLine, handles file injection)
    variable-resolver.ts      — {{var}} cascading resolution (inline → env → base → OS, dot-path support)
  engine/
    executor.ts               — HTTP via Bun.fetch() + timing + error wrapper
    assertions.ts             — # @assert evaluator (status, headers, body paths)
    scripting.ts              — JS lifecycle hooks via new Function() + global script file loader
    history.ts                — save/load .lazyman/history/ + diff two responses
    pipeline.ts               — pipeline orchestration: resolve → global pre → local pre → HTTP → local post → global post → assert → save
  components/
    pane.tsx                  — bordered pane wrapper (border color, title, focus highlighting)
    file-explorer.tsx         — left pane: dual-tab (Files + History), keyboard navigation, $EDITOR open
    request-list.tsx          — top-right-left: request block list + execution trigger
    request-detail.tsx        — top-right-right: resolved request display (scrollable)
    response-viewer.tsx       — bottom-right: tabbed response (Body/Headers/Cookies) + JSON tree + DiffView sub-component
    env-modal.tsx             — environment selector (full-screen overlay)
    help-modal.tsx            — keybinding reference (full-screen overlay, toggled by `?`)
  hooks/
    useHotkeyBar.ts           — hook for publishing context-sensitive hotkey bar items
    useSearchFilter.ts        — hook for per-pane search/filter with input and filter modes
  stores/
    appStore.ts               — SolidJS createStore: activePane, parsedRequests, response, filters, etc.
  utils/
    env-loader.ts             — load JSON environment file from .lazyman/environments/
    panes.ts                  — Pane enum (FILE_EXPLORER, REQUEST_LIST, REQUEST_DETAIL, RESPONSE_VIEWER, ENV_MODAL, HELP)
    title.ts                  — joinTitle helper (unused)
  style.ts                   — color constants (border, method colors, JSON syntax, status codes)
  __tests__/
    tracer-bullet.test.ts    — full pipeline integration test (parse → resolve → assert)
    parser/
      http-parser.test.ts    — multi-block, body, file injection, inline vars
      variable-resolver.test.ts — dot-path, cascade, unresolved vars
    engine/
      assertions.test.ts     — operators, body path, edge cases
      executor.test.ts       — HTTP via local Bun.serve()
      scripting.test.ts      — pre-request, post-response, error handling
      history.test.ts        — save, load sorted, diff
      pipeline.test.ts       — full pipeline orchestration (scripts + HTTP + assert)
    components/
      pane.test.tsx          — rendering via testRender
      request-list.test.tsx  — request list rendering
      request-detail.test.tsx — request detail rendering
      help-modal.test.tsx    — help modal rendering
      file-explorer.test.tsx — file explorer with source file highlight
    stores/
      appStore.test.ts       — default state assertions
    utils/
      panes.test.ts          — Pane enum numeric values
      env-loader.test.ts     — environment JSON loader
    hooks/
      useHotkeyBar.test.ts   — hotkey bar store interaction
    integration/
      hotkey-bar.test.tsx    — hotkey bar rendering
```

## Key patterns

- **Pane (not Panel):** Each bordered region is a Pane. Four main panes + two modal overlays (Env Selector, Help).
- **Keyboard routing:** Components use `useKeyboard` and check `appStore.activePane` before acting.
- **Execution pipeline:** Resolve variables → global pre-request scripts → local pre-request scripts → HTTP → local post-response scripts → global post-response scripts → evaluate assertions → save history.
- **Hotkey bar:** A single-row bar at the bottom of the TUI. Each component publishes its keybindings via `useHotkeyBar(pane, () => HotkeyItem[])`. Only the active pane's bindings are shown.
- **Source file highlight:** The File Explorer dimly highlights the `.http` file whose requests are currently loaded in the Request List pane, even when Explorer is not focused.
- **consumeEnter flag:** Set by File Explorer when opening a file, consumed by Request List on Space to prevent double-navigation.
- **Per-pane search/filter:** Each pane has its own independent filter string in `activeFilters`, persisted across pane switches. Three modes: normal, input, filter.
- **No centralized lint/typecheck scripts** — just `bun test`.

## Code review checklist

Before committing any component change, run this check for `For` reactivity bugs:

```sh
# Find consts inside <For> that access appStore or idx() without being arrow functions
rg '<For each=' -A5 src/components/*.tsx | rg 'const.*=.*(?:appStore|idx)\b'
```

Every `const` inside a `<For>` callback that reads `appStore.*` or `idx()` must be an arrow function, not a plain value. See `CONTEXT.md` for the WRONG/CORRECT pattern with examples.

```tsx
// WRONG — snapshots once
const isSelected = idx() === appStore.selectedRequestIndex;

// CORRECT — re-reads on each render
const isSelected = () => idx() === appStore.selectedRequestIndex;
```

## Issue tracker

Local markdown issues live in `docs/issues/`. Create a new file per issue following the refactor-plan template in the skill.

## E2E tests (agent-tui)

Full-app end-to-end tests live in `e2e/`. They use [agent-tui](https://github.com/pproenca/agent-tui) to drive the TUI in a PTY — screenshot, press keys, wait for text.

```sh
bun run test:e2e           # run e2e tests (18 scenarios)
```

Architecture:
- `e2e/fixtures/` — `.http` files and `.lazyman/` environment config for a clean test workspace
- `e2e/http-test-server.js` — simple Bun.serve() for request execution assertions
- `e2e/test-lazyman.sh` — orchestration: daemon start → spawn lazyman → assert → cleanup
- `e2e/lazyman-acceptance.md` — schema-v1 acceptance spec (usable by tui-explorer)

Workflow per scenario: `wait --stable` → `screenshot` → `press` → `wait "text" --assert`.

Key commands:
```sh
agent-tui daemon start                           # start daemon
agent-tui run --format json --cwd <dir> -- <cmd> # launch app, captures session_id
agent-tui --session <id> wait "text" --assert    # assert text visible
agent-tui --session <id> wait --stable           # wait for render to settle
agent-tui --session <id> press <key>             # send keystroke
agent-tui --session <id> kill                    # terminate session
agent-tui daemon stop                            # stop daemon
```

## Agent skills

The `agent-tui` and `tui-explorer` skills are installed at `~/.agents/skills/`. Use `skill("agent-tui")` for TUI automation instructions and `skill("tui-explorer")` for discovery/replay workflows.

## Agent workflow

- **Evolve docs alongside code:** Every session should include a pass to update `CONTEXT.md` or `AGENTS.md` with any new patterns, domain terms, or decisions discovered during the session. These files are the permanent memory — without them, each agent starts from scratch.
