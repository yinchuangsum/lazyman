# Lazyman

A local-first TUI HTTP client inspired by lazygit. Operates on flat files in the working directory. No database.

## Language

**Pane**:
A fixed, bordered rectangular region in the TUI layout. Three exist: File Explorer, Request Viewer, Response Viewer, plus the Env Modal (overlay).
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
