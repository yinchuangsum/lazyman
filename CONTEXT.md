# Lazyman

A local-first TUI HTTP client inspired by lazygit. Operates on flat files in the working directory. No database.

## Language

**Pane**:
A fixed, bordered rectangular region in the TUI layout. Six exist: File Explorer, Request List, Request Detail, Response Viewer, plus the Env Modal and Help Modal (overlays).
*Avoid*: Panel

**Request Block**:
A single HTTP request definition within a `.http` file, delimited by `###`. Contains method, URL, headers, body, inline variables, and assertions.

**Environment**:
A flat JSON map of variable name to string value stored in `.lazyman/environments/`. The active environment is selectable at runtime.

**Variable Interpolation**:
Replacement of `{{var_name}}` tokens in URL/headers/body with values from the cascade: inline variables → active environment → base environment → OS environment.

**Assertion**:
An inline comment matching `# @assert <target> <op> <expected>` evaluated against the response after execution.

**Session Variable**:
An in-memory key-value map mutated by lifecycle scripts, persisted across requests within one TUI session. Never written to disk.

**History Entry**:
A timestamped JSON file in `.lazyman/history/` containing the resolved request and full response of a single execution.

**JSON Tree**:
An interactive expand/collapse view of a JSON response body, rendered as indented lines with a `→` cursor prefix.

**Diff View**:
Side-by-side scrollbox comparison of a history entry's response against the current live response, comparing status, headers, and body.

**Hook**:
A lifecycle script file (`scripts/pre-request.js` or `scripts/post-response.js`) evaluated per-request to mutate request data or inspect responses.

**Tracer Bullet**:
An end-to-end test that exercises the core pipeline (parse → resolve → assert) to validate that public interfaces connect before deepening individual modules.

**Source File**:
The `.http` file whose parsed requests are currently loaded in the Request List pane. Tracked by `sourceFileIndex` in the store. Shown with a dimmed highlight in the File Explorer even when that pane is not focused, so the user sees which file owns the visible requests.

**Hotkey Bar**:
A single-row status bar at the bottom of the TUI, rendered outside all panes. Displays context-sensitive keybinding hints for the currently active pane. Components publish their bindings via the `useHotkeyBar(pane, () => HotkeyItem[])` hook.
*Avoid*: Status bar

**Tab**:
A sub-section within a Pane, switched with `[` and `]`. The Explorer pane has two tabs: Files and History. The active tab is indicated by a `▶` prefix in the pane border title. Each tab tracks its own cursor independently.

**Search / Filter**:
Activated by pressing `/` in any pane. An `<input>` replaces the hotkey bar for typing. Enter saves the query as a per-pane filter (filter mode). Escape clears the filter. When a filter is active, the hotkey bar shows `Filter: matches for '' Esc: Exit filter mode`. Each pane has its own independent filter, persisted across pane switches.

**Filter Mode**:
The state after pressing Enter in the search input. The pane's content is filtered by the query, the input is closed, and the hotkey bar shows the active filter. Escape exits filter mode and clears the query for that pane.

**Help Modal**:
A full-screen overlay (like the Env Modal) toggled by `?` from anywhere. Lists every pane's keybindings grouped by section. Closing returns focus to FILE_EXPLORER.

## Patterns

**SolidJS `For` reactivity**:

Inside a `For` template callback, the function body runs once per item at creation time. Plain `const` assignments snapshot at that moment and are never re-evaluated, even if they reference reactive sources like `appStore` or `idx()`.

```tsx
// WRONG — snapshots, never updates
<For each={items()}>
  {(item, idx) => {
    const isSelected = idx() === store.cursor;  // frozen boolean
    return <text fg={isSelected ? "#fff" : undefined}>...</text>;
  }}
</For>

// CORRECT — derived signals re-read on each access
<For each={items()}>
  {(item, idx) => {
    const isSelected = () => idx() === store.cursor;  // reactive thunk
    return <text fg={isSelected() ? "#fff" : undefined}>...</text>;
  }}
</For>
```

Turn any `const` inside a `For` that depends on reactive sources (`appStore.*`, `idx()`, signals, memos) into an arrow function, and call it in JSX.

For a full-row highlight, wrap `<text>` in a `<box width="100%" backgroundColor={...}>` — `<text>` alone may not fill the row width.
