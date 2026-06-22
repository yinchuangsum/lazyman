# E2E Test Infrastructure & Architectural Improvements

## 1. Keyboard Event Conflicts

### 1.1 Tab key conflicts between global and response viewer handlers

**Location:** `src/index.tsx:32-36` (global Tab handler) + `src/components/response-viewer.tsx:109-116`

**Problem:**
The global `useKeyboard` handler cycles panes with Tab. The response viewer also uses Tab to cycle between Body/Headers/Cookies tabs. Since OpenTUI doesn't provide `stopPropagation()` on `useKeyboard`, **both handlers fire** when the response pane is focused. This means:
- Tab cycles the active pane away from response viewer
- AND cycles the response tab internally (invisible to user)

**Fix options:**
- Reassign response tabs to `ArrowLeft`/`ArrowRight` (or `[` / `]`)
- Or add event consumption mechanism to `useKeyboard`
- Or guard global Tab handler to skip when response viewer is focused and not in modal

If we switch to `ArrowLeft`/`ArrowRight`, update:
- `src/components/response-viewer.tsx:109` — change key name check
- `src/index.tsx:23-67` — add ArrowLeft/ArrowRight to global handler (to prevent pane cycling on those too, if needed)

### 1.2 Enter key shared across file explorer, request list, and response viewer

Enter is used by:
- File explorer (open file / view history entry)
- Request list (execute request)
- Response viewer (toggle JSON node)

Currently these guard via `appStore.activePane` checks, which works. But the `consumeEnter` flag (file-explorer → request-list transition) is fragile — rapid key presses can race the state flip.

---

## 2. History Memo Not Reactive

**Location:** `src/components/file-explorer.tsx:57-63`

**Problem:**
```tsx
const historyEntries = createMemo(() => {
  return loadHistoryEntries(process.cwd());
});
```
This `createMemo` evaluates once at component mount and never re-evaluates because it has **no reactive dependencies** (no signals, no store reads). When the executor writes a new history file, the file explorer doesn't know about it — the "── history ──" section never appears until the app re-renders.

**Fix options:**
- Add a reactive counter in `appStore` (e.g., `historyVersion: number`) that the executor increments after writing history
- Use `createEffect` to poll for new history files on an interval
- Or re-read history each render (not memoized)

If we add `historyVersion`, update:
- `src/stores/appStore.ts` — add `historyVersion: 0`
- `src/engine/pipeline.ts` — after history write, increment `appStore.historyVersion`
- `src/components/file-explorer.tsx:57` — read `appStore.historyVersion` inside the memo

---

## 3. OpenTUI `useKeyboard` Event Model

`useKeyboard` in `@opentui/solid` registers raw key handlers that all fire independently. There is no:
- `stopPropagation()` — parent handlers fire regardless
- Priority ordering — registration order determines execution order (root component's handlers fire last?)
- Event prevention — a component can't say "I handled this, ignore it"

**This affects all shared keys:**
| Key | Handled By | Conflict |
|-----|-----------|----------|
| `Tab` | Global + Response viewer | Pane cycles vs tab cycles |
| `Enter` | File explorer + Request list + Response viewer | Guarded by activePane |
| `Space` | File explorer + Request list + Response viewer | Guarded by activePane |
| `v` | Global + Env modal | Modal check prevents double-fire |
| `?` | Global + Help modal | Modal check prevents double-fire |

---

## 4. E2E Test Architecture (current)

### Strengths
- 63 assertions across 18 scenarios covering all major features
- Clean temp directory isolation (symlinks + fixture overrides)
- HTTP test server for request execution assertions
- Self-contained: no external dependencies beyond agent-tui

### Weaknesses
- 18 `sleep 1` calls add ~18s to test runtime
- Tab-based pane cycle assertions are misleading (they assert pane titles always visible, not actual focus)
- Can't test response tab switching (Tab key conflict — see §1.1)
- Can't test history appearing in file explorer (memo cache — see §2)
- Fragile text matching — `wait "text" --assert` is case-sensitive substring match, can produce false positives
- No visual diffing — can only assert text, not layout or color

### Suggested improvements
1. Replace `sleep 1` with shorter waits or reactive `wait --stable`
2. Add focus verification by checking hotkey bar content changes
3. Add diff test scenario (execute two requests, navigate to history entry, press `d`)
4. Add error handling test (stop HTTP server, execute request, verify connection error displayed)

---

## 5. Plan: Fix Priority

| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| P0 | Fix Tab conflict for response tabs (use Arrow keys) | ~30 min | Usability bug, makes tabs unusable via keyboard |
| P1 | Make history memo reactive | ~20 min | History section invisible until re-render |
| P2 | Remove `sleep 1` from e2e tests (use wait --stable) | ~15 min | Faster test runs |
| P3 | Add diff view e2e scenario | ~15 min | Better coverage |
| P4 | Add error handling e2e scenario | ~15 min | Better coverage |
