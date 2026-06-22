---
schema_version: "v1"
command: bun run src/index.tsx
cols: 120
rows: 40
default_timeout_ms: 10000
generated_at: "2026-06-22"
generator: agent-tui e2e test
---

# lazyman E2E Acceptance Spec

## Scenario: 4-pane layout renders
- expect: "[1] Explorer"
- expect: "[2] Req List"
- expect: "[3] Req Detail"
- expect: "[4] Response"

## Scenario: File explorer lists .http files
- expect: "example.http"
- expect: "GET"

## Scenario: Help modal opens and closes
- press: "?"
- expect: "Keybindings"
- press: "?"
- expect: "[1] Explorer"

## Scenario: Env modal opens and closes
- press: "v"
- expect: "Environment"
- press: "v"
- expect: "[1] Explorer"

## Scenario: Keyboard navigation with 1-4 and Tab
- press: "2"
- press: "4"
- press: "1"
- press: "Tab"
- expect: "example.http"

## Scenario: Execute a GET request
- press: "2"
- press: "Enter"
- wait_stable: true
- expect: "200 OK"
- expect: "@assert"

## Scenario: Quit
- press: "q"
