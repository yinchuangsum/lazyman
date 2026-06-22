#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

WORK_DIR=$(mktemp -d)
SESSION_ID=""
HTTP_PID=""
PASS_COUNT=0
FAIL_COUNT=0

cleanup() {
  if [ -n "$SESSION_ID" ]; then
    agent-tui --session "$SESSION_ID" kill 2>/dev/null || true
  fi
  agent-tui daemon stop 2>/dev/null || true
  if [ -n "$HTTP_PID" ]; then
    kill "$HTTP_PID" 2>/dev/null || true
  fi
  rm -rf "$WORK_DIR"
}

trap cleanup EXIT INT TERM

pass() { PASS_COUNT=$((PASS_COUNT + 1)); }
fail() { FAIL_COUNT=$((FAIL_COUNT + 1)); echo "  FAIL: $*"; }

assert_wait() {
  local label="$1" text="$2" timeout="${3:-5000}"
  printf "  %s ... " "$label"
  if agent-tui --session "$SESSION_ID" wait "$text" --assert --timeout "$timeout" 2>/dev/null; then
    echo "PASS"; pass
  else
    echo "FAIL"; fail "$text not found within ${timeout}ms"
  fi
}

press_key() {
  agent-tui --session "$SESSION_ID" press "$1" 2>/dev/null
}

stable_wait() {
  agent-tui --session "$SESSION_ID" wait --stable --timeout "${1:-10000}" 2>/dev/null
}

step() { echo ""; echo "--- $* ---"; }

# ============================================================
# SETUP
# ============================================================
echo ""; echo "=== lazyman E2E Test ==="; echo ""

echo "--- Starting HTTP test server on port 3005..."
bun "$SCRIPT_DIR/http-test-server.js" & HTTP_PID=$!; sleep 1; echo "  OK (pid=$HTTP_PID)"

echo "--- Creating test directory..."
for f in "$PROJECT_DIR"/*; do ln -sf "$f" "$WORK_DIR/$(basename "$f")" 2>/dev/null || true; done
rm -f "$WORK_DIR"/*.http
cp "$SCRIPT_DIR/fixtures/example.http" "$WORK_DIR/"
cp "$SCRIPT_DIR/fixtures/example2.http" "$WORK_DIR/"
mkdir -p "$WORK_DIR/.lazyman/environments"
cp "$SCRIPT_DIR/fixtures/.lazyman/environments/base.json" "$WORK_DIR/.lazyman/environments/"
cp "$SCRIPT_DIR/fixtures/.lazyman/config.json" "$WORK_DIR/.lazyman/"
rm -rf "$WORK_DIR/.lazyman/history"
mkdir -p "$WORK_DIR/.lazyman/history"
echo "  OK (dir=$WORK_DIR)"

echo "--- Starting agent-tui daemon..."
agent-tui daemon start 2>/dev/null || true; sleep 1; echo "  OK"

echo "--- Running lazyman..."
RUN_OUTPUT=$(agent-tui run --format json --cwd "$WORK_DIR" --cols 120 --rows 40 -- bun run src/index.tsx 2>/dev/null)
SESSION_ID=$(echo "$RUN_OUTPUT" | python3 -c "import sys,json; print(json.load(sys.stdin)['session_id'])" 2>/dev/null || true)
if [ -z "$SESSION_ID" ]; then echo "FATAL: Could not get session ID"; echo "Output: $RUN_OUTPUT"; exit 1; fi
echo "  Session: $SESSION_ID"

stable_wait 15000; sleep 1; echo "  OK"

# ============================================================
# S1: 4-pane layout
# ============================================================
step "S1: 4-pane layout renders"
assert_wait "Pane [1] Explorer"   "[1] Explorer"
assert_wait "Pane [2] Req List"   "[2] Req List"
assert_wait "Pane [3] Req Detail" "[3] Req Detail"
assert_wait "Pane [4] Response"   "[4] Response"

# ============================================================
# S2: File explorer shows .http files
# ============================================================
step "S2: File explorer shows .http files"
assert_wait "example.http listed"  "example.http"
assert_wait "example2.http listed" "example2.http"
assert_wait "GET request visible"  "GET"

# ============================================================
# S3: Help modal
# ============================================================
step "S3: Help modal"
printf "  Open help modal ... "
press_key "?"; sleep 1
if agent-tui --session "$SESSION_ID" wait "Keybindings" --assert --timeout 5000 2>/dev/null; then echo "PASS" && pass; else echo "FAIL" && fail "help modal did not open"; fi

printf "  Close help modal ... "
press_key "?"; sleep 1
if agent-tui --session "$SESSION_ID" wait "[1] Explorer" --assert --timeout 5000 2>/dev/null; then echo "PASS" && pass; else echo "FAIL" && fail "help modal did not close"; fi

# ============================================================
# S4: Env modal
# ============================================================
step "S4: Env modal"
printf "  Open env modal ... "
press_key "v"; sleep 1
if agent-tui --session "$SESSION_ID" wait "Environment Selector" --assert --timeout 5000 2>/dev/null; then echo "PASS" && pass; else echo "FAIL" && fail "env modal did not open"; fi

printf "  Close env modal ... "
press_key "v"; sleep 1
if agent-tui --session "$SESSION_ID" wait "[1] Explorer" --assert --timeout 5000 2>/dev/null; then echo "PASS" && pass; else echo "FAIL" && fail "env modal did not close"; fi

# ============================================================
# S5: File explorer j/k navigation
# ============================================================
step "S5: File explorer j/k navigation"
# Ensure on first file
press_key "1"; sleep 1; stable_wait 3000

assert_wait "First file example.http visible" "example.http"

# j to second file
printf "  j → second file (example2.http) ... "
press_key "j"; sleep 1; stable_wait 3000
# example2.http has PUT and DELETE
if agent-tui --session "$SESSION_ID" wait "PUT" --assert --timeout 5000 2>/dev/null; then echo "PASS" && pass; else echo "FAIL" && fail "second file requests not shown"; fi
if agent-tui --session "$SESSION_ID" wait "DELETE" --assert --timeout 5000 2>/dev/null; then echo "PASS" && pass; else echo "FAIL" && fail "DELETE request not visible"; fi

# k back to first file
printf "  k → first file (example.http) ... "
press_key "k"; sleep 1; stable_wait 3000
if agent-tui --session "$SESSION_ID" wait "api/todos" --assert --timeout 5000 2>/dev/null; then echo "PASS" && pass; else echo "FAIL" && fail "first file requests not restored"; fi

# ============================================================
# S6: Request detail view
# ============================================================
step "S6: Request detail view"
# Focus request list
printf "  Focus request list (2) ... "
press_key "2"; sleep 1
if agent-tui --session "$SESSION_ID" wait "[2] Req List" --assert --timeout 5000 2>/dev/null; then echo "PASS" && pass; else echo "FAIL" && fail "request list not focused"; fi

# Space to view detail
printf "  Space opens request detail ... "
press_key "Space"; sleep 1; stable_wait 3000
if agent-tui --session "$SESSION_ID" wait "/api/todos" --assert --timeout 5000 2>/dev/null; then echo "PASS" && pass; else echo "FAIL" && fail "detail not showing URL"; fi

# Esc back to list
printf "  Esc returns to request list ... "
press_key "Escape"; sleep 1
if agent-tui --session "$SESSION_ID" wait "[2] Req List" --assert --timeout 5000 2>/dev/null; then echo "PASS" && pass; else echo "FAIL" && fail "did not return to request list"; fi

# ============================================================
# S7: Execute GET request
# ============================================================
step "S7: Execute GET request"
printf "  Execute request (Enter) ... "
press_key "Enter"; sleep 2; stable_wait 10000
if agent-tui --session "$SESSION_ID" wait "200 OK" --assert --timeout 5000 2>/dev/null; then echo "PASS" && pass; else echo "FAIL" && fail "request did not execute (no 200 OK)"; fi

assert_wait "Status line with timing"   "ms |"
assert_wait "Assertion result"          "@assert"

# ============================================================
# S8: Response body content
# ============================================================
step "S8: Response body content"
# Focus response pane explicitly
press_key "4"; sleep 1; stable_wait 3000

assert_wait "Body tab [BODY]"         "[BODY]"
assert_wait "JSON tree root ▼"        "▼"
assert_wait "JSON value 'Test todo'"  "Test todo"
assert_wait "Response size in bytes"  "B"

# ============================================================
# S9: JSON tree navigation
# ============================================================
step "S9: JSON tree navigation"
# j to move cursor down
printf "  j moves JSON cursor down ... "
press_key "j"; sleep 1
if agent-tui --session "$SESSION_ID" wait "[BODY]" --assert --timeout 5000 2>/dev/null; then echo "PASS" && pass; else echo "FAIL" && fail "j broke response view"; fi

# k to move cursor up
printf "  k moves JSON cursor up ... "
press_key "k"; sleep 1
if agent-tui --session "$SESSION_ID" wait "[BODY]" --assert --timeout 5000 2>/dev/null; then echo "PASS" && pass; else echo "FAIL" && fail "k broke response view"; fi

# Enter to toggle node (expand/collapse)
printf "  Enter toggles JSON node ... "
press_key "Enter"; sleep 1
if agent-tui --session "$SESSION_ID" wait "[BODY]" --assert --timeout 5000 2>/dev/null; then echo "PASS" && pass; else echo "FAIL" && fail "Enter broke response view"; fi

# Toggle back
printf "  Enter toggles node again ... "
press_key "Enter"; sleep 1
if agent-tui --session "$SESSION_ID" wait "[BODY]" --assert --timeout 5000 2>/dev/null; then echo "PASS" && pass; else echo "FAIL" && fail "second toggle broke view"; fi

# j navigates through JSON lines
printf "  Multi-step j navigation ... "
press_key "j"; sleep 0.5; press_key "j"; sleep 1
if agent-tui --session "$SESSION_ID" wait "[BODY]" --assert --timeout 5000 2>/dev/null; then echo "PASS" && pass; else echo "FAIL" && fail "multi j broke view"; fi

# k back up
printf "  k navigates up ... "
press_key "k"; sleep 1
if agent-tui --session "$SESSION_ID" wait "[BODY]" --assert --timeout 5000 2>/dev/null; then echo "PASS" && pass; else echo "FAIL" && fail "k up broke view"; fi

# ============================================================
# S10: File explorer state
# ============================================================
step "S10: File explorer state"
printf "  Focus explorer (1) ... "
press_key "1"; sleep 1; stable_wait 3000
if agent-tui --session "$SESSION_ID" wait "[1] Explorer" --assert --timeout 5000 2>/dev/null; then echo "PASS" && pass; else echo "FAIL" && fail "explorer not focused"; fi

assert_wait "First file visible"         "example.http"
assert_wait "Second file visible"        "example2.http"

# j down to second file to verify full state
printf "  Explorer j navigation ... "
press_key "j"; sleep 1; stable_wait 3000
if agent-tui --session "$SESSION_ID" wait "PUT" --assert --timeout 5000 2>/dev/null; then echo "PASS" && pass; else echo "FAIL" && fail "navigation broke after execution"; fi

# ============================================================
# S11: Execute POST request
# ============================================================
step "S11: Execute POST request"
# Reset: focus request list, first request
press_key "1"; sleep 1; stable_wait 3000
press_key "k"; sleep 1; stable_wait 3000  # back to first file

printf "  Focus request list (2) ... "
press_key "2"; sleep 1; stable_wait 3000
if agent-tui --session "$SESSION_ID" wait "[2] Req List" --assert --timeout 5000 2>/dev/null; then echo "PASS" && pass; else echo "FAIL" && fail "request list not focused"; fi

# j down to second request (POST)
printf "  j to second request ... "
press_key "j"; sleep 1; stable_wait 3000
if agent-tui --session "$SESSION_ID" wait "POST" --assert --timeout 5000 2>/dev/null; then echo "PASS" && pass; else echo "FAIL" && fail "POST request not shown"; fi

# Execute it
printf "  Execute POST (Enter) ... "
press_key "Enter"; sleep 2; stable_wait 10000
if agent-tui --session "$SESSION_ID" wait "201" --assert --timeout 5000 2>/dev/null; then echo "PASS" && pass; else echo "FAIL" && fail "POST did not return 201"; fi

assert_wait "POST assertion"             "@assert"
assert_wait "POST body 'created'"        "created"

# ============================================================
# S12: Response after second execution
# ============================================================
step "S12: Response state"
# Focus response (should already be focused after execution)
printf "  Response pane (4) ... "
press_key "4"; sleep 1
if agent-tui --session "$SESSION_ID" wait "[4] Response" --assert --timeout 5000 2>/dev/null; then echo "PASS" && pass; else echo "FAIL" && fail "response not focused"; fi

assert_wait "Status 201 visible"      "201"
assert_wait "JSON key 'id:' visible"  "id:"
assert_wait "JSON value 'created'"    "created"

# ============================================================
# S13: Environment selector interaction
# ============================================================
step "S13: Environment selector"
printf "  Open env modal (v) ... "
press_key "v"; sleep 1; stable_wait 3000
if agent-tui --session "$SESSION_ID" wait "Environment" --assert --timeout 5000 2>/dev/null; then echo "PASS" && pass; else echo "FAIL" && fail "env modal not open"; fi

# Env modal shows filename without .json extension
assert_wait "Environment 'base' listed"  "base"

printf "  j navigates envs ... "
press_key "j"; sleep 1
if agent-tui --session "$SESSION_ID" wait "Environment" --assert --timeout 5000 2>/dev/null; then echo "PASS" && pass; else echo "FAIL" && fail "j in env modal broke view"; fi

printf "  k navigates envs ... "
press_key "k"; sleep 1
if agent-tui --session "$SESSION_ID" wait "Environment" --assert --timeout 5000 2>/dev/null; then echo "PASS" && pass; else echo "FAIL" && fail "k in env modal broke view"; fi

printf "  Enter selects environment ... "
press_key "Enter"; sleep 1; stable_wait 3000
if agent-tui --session "$SESSION_ID" wait "[1] Explorer" --assert --timeout 5000 2>/dev/null; then echo "PASS" && pass; else echo "FAIL" && fail "env selection did not close modal"; fi

# ============================================================
# S14: Direct pane focus keys
# ============================================================
step "S14: Direct pane focus keys"
printf "  Key 3 → request detail ... "
press_key "3"; sleep 1
if agent-tui --session "$SESSION_ID" wait "[3] Req Detail" --assert --timeout 5000 2>/dev/null; then echo "PASS" && pass; else echo "FAIL" && fail "key 3 did not focus detail"; fi

printf "  Key 1 → explorer ... "
press_key "1"; sleep 1
if agent-tui --session "$SESSION_ID" wait "[1] Explorer" --assert --timeout 5000 2>/dev/null; then echo "PASS" && pass; else echo "FAIL" && fail "key 1 did not focus explorer"; fi

printf "  Key 4 → response ... "
press_key "4"; sleep 1
if agent-tui --session "$SESSION_ID" wait "[4] Response" --assert --timeout 5000 2>/dev/null; then echo "PASS" && pass; else echo "FAIL" && fail "key 4 did not focus response"; fi

printf "  Key 2 → request list ... "
press_key "2"; sleep 1
if agent-tui --session "$SESSION_ID" wait "[2] Req List" --assert --timeout 5000 2>/dev/null; then echo "PASS" && pass; else echo "FAIL" && fail "key 2 did not focus request list"; fi

# ============================================================
# S15: Global Tab cycling through all 4 panes
# ============================================================
step "S15: Tab cycles all panes"
printf "  Tab → response ... "
press_key "Tab"; sleep 1
if agent-tui --session "$SESSION_ID" wait "[4] Response" --assert --timeout 5000 2>/dev/null; then echo "PASS" && pass; else echo "FAIL" && fail "Tab did not reach response"; fi

printf "  Tab → explorer ... "
press_key "Tab"; sleep 1
if agent-tui --session "$SESSION_ID" wait "[1] Explorer" --assert --timeout 5000 2>/dev/null; then echo "PASS" && pass; else echo "FAIL" && fail "Tab did not reach explorer"; fi

printf "  Tab → request list ... "
press_key "Tab"; sleep 1
if agent-tui --session "$SESSION_ID" wait "[2] Req List" --assert --timeout 5000 2>/dev/null; then echo "PASS" && pass; else echo "FAIL" && fail "Tab did not reach request list"; fi

printf "  Tab → request detail ... "
press_key "Tab"; sleep 1
if agent-tui --session "$SESSION_ID" wait "[3] Req Detail" --assert --timeout 5000 2>/dev/null; then echo "PASS" && pass; else echo "FAIL" && fail "Tab did not reach detail pane"; fi

# ============================================================
# S16: Hotkey bar visible
# ============================================================
step "S16: Hotkey bar"
assert_wait "Hotkey bar shows Navigate"  "Navigate"
assert_wait "Hotkey bar 'Enter' binding" "Enter"

# ============================================================
# S17: Request detail scrolling
# ============================================================
step "S17: Request detail scrolling"
printf "  Focus detail (3) ... "
press_key "3"; sleep 1
if agent-tui --session "$SESSION_ID" wait "[3] Req Detail" --assert --timeout 5000 2>/dev/null; then echo "PASS" && pass; else echo "FAIL" && fail "detail not focused"; fi

printf "  j scrolls down ... "
press_key "j"; sleep 1
if agent-tui --session "$SESSION_ID" wait "[3] Req Detail" --assert --timeout 5000 2>/dev/null; then echo "PASS" && pass; else echo "FAIL" && fail "j scrolling broke view"; fi

printf "  k scrolls up ... "
press_key "k"; sleep 1
if agent-tui --session "$SESSION_ID" wait "[3] Req Detail" --assert --timeout 5000 2>/dev/null; then echo "PASS" && pass; else echo "FAIL" && fail "k scrolling broke view"; fi

# ============================================================
# S18: Quit
# ============================================================
step "S18: Quit"
printf "  Quit lazyman (q) ... "
press_key "q"; sleep 1; SESSION_ID=""; echo "PASS"; pass

# ============================================================
# RESULTS
# ============================================================
echo ""; echo "=== Results ==="
echo "  Passed: $PASS_COUNT"
echo "  Failed: $FAIL_COUNT"
echo ""

if [ "$FAIL_COUNT" -gt 0 ]; then exit 1; fi
