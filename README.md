<p align="center">
  <img width="536" src="https://user-images.githubusercontent.com/8456633/174470852-339b5011-5800-4bb9-a628-ff230aa8cd4e.png">
</p>

<p align="center">
  A terminal UI for HTTP requests, inspired by lazygit
  <br/>
  <a href="#features">Features</a> • <a href="#installation">Installation</a> • <a href="#usage">Usage</a> • <a href="#keybindings">Keybindings</a> • <a href="#configuration">Configuration</a>
</p>

## Elevator Pitch

You know what sucks? Switching between your editor and a browser (or worse, cURL) every time you need to test an API endpoint. You write a `.http` file in VS Code with the REST Client extension, but then you lose all your history when you close the file. You try Postman but it's a bloated Electron app that stores everything in some proprietary format. You just want to edit flat files in your editor and fire off requests from the terminal without leaving your keyboard.

Lazyman is a terminal UI for `.http` files. It's local-first, keyboard-driven, and works with plain files in your working directory. No database, no cloud, no nonsense.

## Features

### .http file parsing

Open any `.http` or `.rest` file in the project and lazyman parses it into individual request blocks (separated by `###`). Methods, URLs, headers, bodies — everything from the RFC 2616-style format.

### Variable interpolation with cascading resolution

Use `{{variable}}` in URLs, headers, and bodies. Variables resolve through four layers: inline declarations → active environment → base environment → OS environment. Dot-path notation works too: `{{user.addresses[0].city}}`.

### Environment selector

Press `v` to open the environment selector overlay. Switch between environment JSON files from `.lazyman/environments/` at runtime. Each env is just a flat JSON file — easy to version-control or generate.

### Inline assertions

Add `# @assert status == 200` or `# @assert headers.content-type contains json` to your `.http` files. Results show inline in the response viewer with ✓/✗ indicators and actual values on failure.

### Lifecycle scripting

Drop JavaScript files in `scripts/global/pre-request/` or `scripts/global/post-response/` to mutate requests or inspect responses before/after every execution. Or use `# @script pre-request` / `# @script post-response` inline in `.http` files for per-request hooks.

### JSON tree viewer

Response bodies are parsed into an interactive expand/collapse JSON tree. Navigate with `j`/`k`, expand/collapse with `Enter`, copy values to clipboard with `y`.

### Response diff

Press `d` on a history entry to diff it against the current live response. See status changes, header diffs, and body changes side by side.

### Request history

Every execution is saved to `.lazyman/history/` as a JSON file. Browse past requests in the History tab of the file explorer, re-view responses, or diff against live results.

### Multi-tab file explorer

Dual-tab left pane: Files tab lists `.http`/`.rest` files in the project; History tab lists past executions. Switch with `[` and `]`. Open files in `$EDITOR` with `e`.

### Search and filter

Press `/` in any pane to activate search. Filter file names, request methods/URLs, detail lines, or JSON tree nodes. Active filters persist per pane. Press `Esc` to clear.

### Context-sensitive hotkey bar

A single-row bar at the bottom of the TUI shows keybindings for the currently active pane. No memorization required — the keys are always visible.

## Installation

### Prerequisites

- **Bun** 1.x (runtime and package manager)

### From source

```sh
git clone https://github.com/yinchuangsum/lazyman.git
cd lazyman
bun install
```

## Usage

### Quick start

```sh
# Bootstrap .lazyman/ directory and example file
bun run src/index.tsx init

# Launch the TUI
bun dev
```

Once the TUI opens:

1. **Navigate** panes with `Tab` or jump with `1`-`4`
2. **Select a file** in the file explorer (left pane) with `Enter`
3. **Pick a request** in the request list (top-right-left) — press `Space` to view details
4. **Execute** a request with `Enter` — response appears in the bottom-right pane
5. **Switch environments** with `v` to toggle the environment selector
6. **Search** any pane with `/`
7. **Get help** with `?`

### Commands

```sh
bun dev              # Run TUI with live reload
bun dev-console      # Run TUI with visible console overlay
bun dev-init         # Run `lazyman init` (bootstrap .lazyman/)
bun test             # Run all tests (72 tests across 18 files)
bun test:e2e         # Run end-to-end tests (18 scenarios)
```

### .http file format

```http
### Get users
GET {{base_url}}/api/v1/users
Authorization: Bearer {{token}}

# @assert status == 200
# @assert headers.content-type contains json

### Create user
POST {{base_url}}/api/v1/users
Content-Type: application/json

{ "name": "Alice", "email": "alice@example.com" }

# @assert status == 201
# @variable user_id = 42
# @script pre-request
#   request.headers['X-Trace-Id'] = env.trace_id;
```

## Keybindings

### Global

| Key | Action |
|---|---|
| `Tab` | Cycle panes forward |
| `1`-`4` | Focus specific pane |
| `v` | Toggle environment selector |
| `?` | Toggle help modal |
| `/` | Search/filter current pane |
| `Esc` | Exit filter mode |
| `q` | Quit |

### File Explorer (left pane)

| Key | Action |
|---|---|
| `j` / `↓` | Move selection down |
| `k` / `↑` | Move selection up |
| `[` / `]` | Switch tab (Files / History) |
| `Enter` / `Space` | Open file / view history entry |
| `e` | Open file in `$EDITOR` |
| `d` | Diff history entry against live response |

### Request List (top-right-left)

| Key | Action |
|---|---|
| `j` / `↓` | Move selection down |
| `k` / `↑` | Move selection up |
| `Space` | View request detail |
| `Enter` | Execute request |

### Request Detail (top-right-right)

| Key | Action |
|---|---|
| `j` / `↓` | Scroll down |
| `k` / `↑` | Scroll up |
| `Esc` | Back to request list |

### Response Viewer (bottom-right)

| Key | Action |
|---|---|
| `Tab` | Switch tabs (Body / Headers / Cookies) or dismiss diff |
| `j` / `↓` | Navigate JSON tree down |
| `k` / `↑` | Navigate JSON tree up |
| `Enter` / `Space` | Expand/collapse tree node |
| `y` | Copy node value to clipboard |

### Environment Selector (modal)

| Key | Action |
|---|---|
| `j` / `↓` | Move selection down |
| `k` / `↑` | Move selection up |
| `Enter` | Select environment |
| `Esc` / `v` | Close |

## Configuration

### Environment files

Place JSON files in `.lazyman/environments/`:

```json
// .lazyman/environments/dev.json
{
  "base_url": "https://dev.api.example.com",
  "token": "eyJhbGci..."
}
```

The active environment is selectable at runtime with `v`.

### Lifecycle scripts

Place JavaScript files in `scripts/global/`:

```
scripts/
  global/
    pre-request/
      01-trace.js    # Runs before every request
    post-response/
      01-log.js      # Runs after every response
```

Scripts receive `request`, `response` (null for pre), and `env`. Mutations are captured.

### Assertions reference

```
# @assert status == 200
# @assert status != 404
# @assert status > 199
# @assert status < 300
# @assert headers.content-type contains json
# @assert body.id == 1
# @assert body.items[0].name == "Alice"
```

## Project structure

```
.lazyman/
  config.json              # Project config (scaffolded)
  environments/
    base.json              # Base environment variables
    dev.json               # Environment overrides
  history/                 # Request execution history
scripts/
  global/
    pre-request/           # Global pre-request scripts
    post-response/         # Global post-response scripts
example.http              # Example .http file
```

## Tech stack

- **Bun** — runtime and package manager
- **OpenTUI** (`@opentui/solid` + `@opentui/core`) — terminal UI framework
- **SolidJS** — reactive UI library
- **TypeScript** — all source code

## Development

```sh
bun install          # Install dependencies
bun dev              # Run with live reload
bun test             # Run tests (72 tests, 71 pass)
bun test:e2e         # Run end-to-end tests
```

## Contributing

Contributions are welcome! The codebase is organized by domain:

- `src/parser/` — `.http` file parsing and variable resolution
- `src/engine/` — HTTP execution, assertions, scripting, history
- `src/components/` — TUI components (panes, modals)
- `src/hooks/` — OpenTUI hooks (hotkey bar, search/filter)
- `src/stores/` — SolidJS store (app state)
- `src/utils/` — Environment loading, pane definitions, style

Check `CONTEXT.md` and `AGENTS.md` for domain vocabulary and architectural patterns.
