# Refactor: Modal keyboard guards, pipeline extraction, script chain, help hotkey bar

## Problem Statement

Four related pain points in the lazyman TUI:

1. **Modal keyboard leaks (index.tsx).** Tab and `1`–`4` cycle the four main panes even when the Help or Env modal is open. The `v` toggle does not reset `activePane` when closing the Env modal, unlike the `?` toggle. The user unknowingly corrupts app state behind the overlay.

2. **Pipeline logic trapped in a UI component (request-list.tsx).** The 75-line `executeSelected()` function orchestrates the entire HTTP pipeline — loading environments, resolving variables, running pre/post scripts, executing HTTP, evaluating assertions, saving history — all inside a SolidJS component. It uses 8 lazy `await import()` calls to work around coupling. The pipeline is untestable, unreusable, and blocks any CLI-mode or batch-runner feature.

3. **Script model is flat and unscalable.** Only two hardcoded global script files exist (`scripts/pre-request.js`, `scripts/post-response.js`). There is no support for multiple scripts in a chain, no per-request inline scripts, and no way to compose script hooks.

4. **Help modal hotkey bar is missing (help-modal.tsx).** The Help modal never calls `useHotkeyBar`, so the hotkey bar shows stale items from the previously focused pane while help is open — an ironic problem for a keybinding reference screen.

5. **Variable resolution is duplicated (request-list.tsx + request-detail.tsx).** Both components independently replicate the same 8 lines: load two environments, iterate headers, call `resolveVariables` for each field. Any bug fix or enhancement must be applied to both locations.

## Solution

1. Add a modal guard (`showEnvModal || showHelpModal`) at the top of the global keyboard handler to suppress Tab and `1`–`4` when a modal is active. Make `v` toggle symmetrical with `?` by resetting `activePane` to `FILE_EXPLORER` on close.

2. Extract the execution pipeline into `engines/pipeline.ts` as a single async function `executeRequestPipeline(req, selectedEnv, cwd)`. The component in `request-list.tsx` calls it and sets store fields from the result.

3. Replace the flat `scripts/pre-request.js` / `scripts/post-response.js` model with a chain architecture: global scripts in `scripts/global/pre-request/` and `scripts/global/post-response/` (sorted by filename, run sequentially), plus per-request inline scripts declared via `# @script pre-request` and `# @script post-response` directives in `.http` files. Each script receives the context mutated by the previous script. A middleware-style `runScriptsSequentially()` runs the chain and stops on error.

4. Add `useHotkeyBar(Pane.HELP, ...)` to the Help modal component, following the pattern already used by every other keyboard-handling component.

5. Extract variable resolution into a shared `resolveRequest(parsedReq, selectedEnv): ResolvedRequest` function in `variable-resolver.ts`. Both `request-list` and `request-detail` call it instead of inlining the logic.

## Commits

### 1. Add `ScriptRef` type and `scripts` field to `ParsedRequest`

- Add `ScriptRef { hook: "pre-request" | "post-response"; content: string; sourceLine: number }` to `types.ts`.
- Add `scripts: ScriptRef[]` to the `ParsedRequest` interface.
- **Working state:** Types compile. No behavioral change — no code reads the new field yet.

### 2. Parse `# @script` directives in `http-parser.ts`

- Add `parseScriptDirective(line: string): "pre-request" | "post-response" | null` helper.
- Modify `parseBlockLines()` to enter a script-collection state after `# @script <hook>` is encountered. Subsequent `#` or `//` lines that aren't `@assert`, `@variable`, or another `@script` directive are treated as script body content. Non-comment lines terminate the script block and are processed normally.
- **Working state:** `.http` files with `# @script pre-request` / `# @script post-response` are parsed correctly. The `scripts` array on `ParsedRequest` is populated. No downstream code reads it yet.

### 3. Add `resolveRequest()` to `variable-resolver.ts`

- New exported function: `resolveRequest(req: ParsedRequest, selectedEnv: string): ResolvedRequest`.
- Internally calls `loadEnv(selectedEnv)` and `loadEnv("base")`, resolves all fields (method, url, headers, body) through `resolveVariables`.
- **Working state:** New export exists. No callers yet. Existing `resolveVariables()` unchanged.

### 4. Add `runScriptsSequentially()` and `loadGlobalScriptFiles()` to `scripting.ts`

- `runScriptsSequentially(scripts: string[], input: ScriptInput): ScriptOutput` — iterates scripts in order, passes each script's output as the next script's input. If any script returns an error, stops the chain and returns the error.
- `loadGlobalScriptFiles(hook: "pre-request" | "post-response", cwd: string): string[]` — reads `scripts/global/<hook>/`, filters for `.js` files, sorts by filename, reads and returns their content as an array of strings.
- **Working state:** New exports exist. No callers yet. Existing `runScript()` unchanged.

### 5. Extract `executeRequestPipeline()` into `engines/pipeline.ts`

- New module exporting `async function executeRequestPipeline(req: ParsedRequest, selectedEnv: string, cwd: string): Promise<PipelineResult>`.
- Pipeline order: resolve variables → global pre-request scripts → local pre-request scripts → HTTP execution → local post-response scripts → global post-response scripts → evaluate assertions → save history → return.
- Defines `PipelineResult { resolvedRequest, response, assertionResults, error? }`.
- Session env flows through the entire pipeline as a single object.
- No script hook silently no-ops (no observable difference from current behavior when no scripts exist).
- **Working state:** New module exists. No callers yet.

### 6. Switch `request-list.tsx` to use `executeRequestPipeline()`

- Delete the 75-line `executeSelected()` function (and all 8 lazy `await import()` calls).
- Replace it with a call to `executeRequestPipeline(req, selectedEnv, cwd)`.
- The component sets store fields (`response`, `assertionResults`, `activePane`) from the pipeline result.
- **Working state:** `Ctrl+Enter` in the request list executes via the extracted pipeline. Behavior is identical to before.

### 7. Switch `request-detail.tsx` to use `resolveRequest()`

- Replace the inline environment loading + `resolveVariables` pattern with a single call to `resolveRequest(req, appStore.selectedEnv)`.
- **Working state:** Request detail pane renders identically. Remove `import { loadEnv }` and `import { resolveVariables }` from `request-detail.tsx` — they are no longer needed.

### 8. Add `useHotkeyBar` to `help-modal.tsx`

- Add `useHotkeyBar(Pane.HELP, () => [{ key: "Esc/?", label: "Close" }])` at the top of the default export, matching the `env-modal.tsx` pattern.
- **Working state:** Hotkey bar displays "Esc/? Close" when the Help modal is open.

### 9. Guard global keyboard handler against modal leaks and fix `v` toggle symmetry

- At the top of the `useKeyboard` callback in `index.tsx`, add: `const isModal = appStore.showEnvModal || appStore.showHelpModal; if (key.name === "tab" || key.name === "1" || key.name === "2" || key.name === "3" || key.name === "4") { if (isModal) return; }`
- In the `v` handler, add `setAppStore("activePane", PaneEnum.FILE_EXPLORER)` when `showEnvModal` transitions from true to false, matching the `?` handler pattern.
- **Working state:** Tab and `1`–`4` are ignored when a modal is active. Pressing `v` to close the env modal restores focus to the file explorer, matching the `?` behavior.

### 10. Update `cli/init.ts` to new script directory structure

- Replace `fs.writeFileSync(path.join(scriptsDir, "pre-request.js"), ...)` with `fs.writeFileSync(path.join(scriptsDir, "global", "pre-request", "01-auth.js"), ...)`.
- Replace `fs.writeFileSync(path.join(scriptsDir, "post-response.js"), ...)` with `fs.writeFileSync(path.join(scriptsDir, "global", "post-response", "01-log.js"), ...)`.
- Update the `.gitignore` lines if needed.
- **Working state:** `lazyman init` creates the new directory structure.

### 11. Update tests for the new code

- Update `http-parser.test.ts`: add tests for `# @script pre-request` and `# @script post-response` blocks, script body continuation, script termination by other directives.
- Update `variable-resolver.test.ts`: add tests for `resolveRequest()` — happy path, missing env fallback, header resolution.
- Add `engine/pipeline.test.ts`: integration test running the full pipeline with mock scripts, mock executor (via Bun.serve), and assertion evaluation. Test script chain order, error short-circuits, and no-op script absence.
- Update `scripting.test.ts`: add tests for `runScriptsSequentially()` — chain order, error stopping, multiple scripts. Add tests for `loadGlobalScriptFiles()` — empty directory, sorted files, non-.js files ignored.
- Update `request-list.test.tsx`: update imports if changed.
- Update `request-detail.test.tsx`: update imports if changed (remove `loadEnv` and `resolveVariables` direct imports).
- **Working state:** All tests pass. Coverage is expanded for the new pipeline, script chain, and parser features.

## Decision Document

- **Script chain ordering:** global pre-request → local (inline `# @script`) pre-request → HTTP → local post-response → global post-response. Within each group, scripts run in filename sort order (for global) or source-line order (for inline).
- **Error handling:** If a script at any point returns an error, the chain **stops** for that hook phase. The error is captured in the pipeline result. Execution proceeds to the next phase (HTTP or post-response) regardless — a failed pre-request script does not cancel the HTTP call.
- **Session env lifecycle:** A single `sessionEnv: Record<string, string>` is created at pipeline start and flows through all phases. Post-response scripts can read values set by pre-request scripts.
- **Silent no-op:** When no scripts exist (no `scripts/global/` directory, no inline `# @script`), the pipeline behaves identically to the current code.
- **Inline script syntax:** `# @script pre-request` and `# @script post-response` directives in `.http` files. Subsequent `#`-prefixed lines that aren't other directives become the script body. Blank lines and non-comment lines terminate the script block.
- **Existing `runScript()` kept:** `runScriptsSequentially()` is a higher-level wrapper. `runScript()` remains for direct testing and potential standalone use.
- **`resolveRequest()` location:** Lives in `parser/variable-resolver.ts` alongside `resolveVariables()`. Imports `loadEnv` from `utils/env-loader.ts`.
- **Pipeline location:** New file `engines/pipeline.ts`. Separate from `scripting.ts` and `executor.ts` to avoid circular imports and keep each module focused.
- **`PipelineResult`:** Contains `resolvedRequest` (for history), `response`, `assertionResults`, and optional `error`. No UI state — the component decides what to set and how to navigate.

## Testing Decisions

- **What makes a good test:** Test the external behavior of each module, not internal implementation details. For the pipeline, test the full execution path with real inputs and verify outputs. For scripts, test that the chain runs in the correct order and stops on errors. For parsing, test that `# @script` directives produce the correct `ScriptRef` objects.
- **Modules tested:**
  - `http-parser.test.ts` — new directive parsing
  - `variable-resolver.test.ts` — new `resolveRequest()` function
  - `scripting.test.ts` — new `runScriptsSequentially()` and `loadGlobalScriptFiles()`
  - `engine/pipeline.test.ts` — new full integration test
  - `request-list.test.tsx` — update for import changes
  - `request-detail.test.tsx` — update for import changes
- **Prior art:** `tracer-bullet.test.ts` demonstrates the integration test pattern (parse → resolve → assert). `variable-resolver.test.ts` and `scripting.test.ts` demonstrate unit test patterns with focused inputs/outputs. The existing assertion and history tests show good isolation with helpers.

## Out of Scope

- The store decomposition (#3, #11 from the original codebase review) is not addressed.
- `response-viewer.tsx` refactoring (god component, JSON tree extraction, `pbcopy` platform support) is not addressed.
- `env-modal.tsx` cursor-sharing bug is not addressed.
- `consumeEnter` race condition, history separator UX, Tab key overloading in response viewer, and other low-priority items are not addressed.
- The old `scripts/pre-request.js` and `scripts/post-response.js` files are not automatically migrated — users must manually move them to the new structure.
