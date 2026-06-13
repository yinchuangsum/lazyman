import { createMemo, createSignal, createEffect, For } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import { appStore, setAppStore } from "../stores/appStore";
import { Pane } from "../utils/panes";
import { diffResponses } from "../engine/history";
import { HIGHLIGHT_BG, HIGHLIGHT_FG } from "../style";
import { useHotkeyBar } from "../hooks/useHotkeyBar";

type Tab = "body" | "headers" | "cookies";

interface TreeNode {
  key: string;
  value: unknown;
  depth: number;
  expanded: boolean;
  type: "object" | "array" | "string" | "number" | "boolean" | "null";
  path: string;
  children?: TreeNode[];
}

function buildTree(
  key: string,
  value: unknown,
  depth: number,
  path: string,
  expandedMap: Record<string, boolean>,
): TreeNode {
  const expanded = expandedMap[path] ?? depth < 2;
  const node: TreeNode = { key, value, depth, expanded, type: "null", path };

  if (value === null) {
    node.type = "null";
  } else if (Array.isArray(value)) {
    node.type = "array";
    node.children = value.map((v, i) =>
      buildTree(String(i), v, depth + 1, `${path}[${i}]`, expandedMap),
    );
  } else if (typeof value === "object" && value !== null) {
    node.type = "object";
    node.children = Object.entries(value as Record<string, unknown>).map(
      ([k, v]) => buildTree(k, v, depth + 1, `${path}.${k}`, expandedMap),
    );
  } else if (typeof value === "string") {
    node.type = "string";
  } else if (typeof value === "number") {
    node.type = "number";
  } else if (typeof value === "boolean") {
    node.type = "boolean";
  }

  return node;
}

function flattenTree(nodes: TreeNode[]): { line: string; node: TreeNode }[] {
  const result: { line: string; node: TreeNode }[] = [];
  for (const node of nodes) {
    const indent = "  ".repeat(node.depth);
    let line = indent;
    line += node.depth > 0 ? `${node.key}: ` : "";
    if (node.type === "object") {
      line += node.expanded ? "▼ {" : "▶ {";
      if (!node.expanded && node.children)
        line += ` ${node.children.length} keys`;
      line += "}";
    } else if (node.type === "array") {
      line += node.expanded ? "▼ [" : "▶ [";
      if (!node.expanded && node.children)
        line += ` ${node.children.length} items`;
      line += "]";
    } else if (node.type === "string") {
      line += `"${node.value as string}"`;
    } else {
      line += String(node.value);
    }
    result.push({ line, node });
    if (node.expanded && node.children) {
      result.push(...flattenTree(node.children));
    }
  }
  return result;
}

export default () => {
  useHotkeyBar(Pane.RESPONSE_VIEWER, () => [
    { key: "Tab", label: "Switch tab" },
    { key: "j/k", label: "Navigate" },
    { key: "Enter", label: "Toggle node" },
    { key: "/", label: "Filter" },
    { key: "y", label: "Copy value" },
  ]);

  const [activeTab, setActiveTab] = createSignal<Tab>("body");
  const [showFilter, setShowFilter] = createSignal(false);
  const [filterQuery, setFilterQuery] = createSignal("");

  useKeyboard((key) => {
    if (appStore.activePane !== Pane.RESPONSE_VIEWER) return;

    if (showFilter()) {
      return;
    }

    if (key.name === "slash" || key.name === "/") {
      setShowFilter(true);
      setFilterQuery("");
      return;
    }

    if (key.name === "tab") {
      if (appStore.diffTarget) {
        setAppStore("diffTarget", null);
        return;
      }
      const tabs: Tab[] = ["body", "headers", "cookies"];
      const current = tabs.indexOf(activeTab());
      setActiveTab(tabs[(current + 1) % tabs.length]);
    } else if (key.name === "j" || key.name === "down") {
      setAppStore("responseTreeCursor", (c) =>
        Math.min(c + 1, visibleLines().length - 1),
      );
    } else if (key.name === "k" || key.name === "up") {
      setAppStore("responseTreeCursor", (c) => Math.max(c - 1, 0));
    } else if (key.name === "return" || key.name === "space") {
      toggleCurrentNode();
    } else if (key.name === "y") {
      copyCurrentNode();
    }
  });

  const response = () => appStore.response;

  const parsedBody = createMemo(() => {
    if (!response()) return null;
    try {
      return JSON.parse(response()!.body);
    } catch {
      return null;
    }
  });

  const treeRoot = createMemo(() => {
    const body = parsedBody();
    if (!body) return null;
    const root = buildTree(
      "root",
      body,
      0,
      "root",
      appStore.responseTreeExpanded,
    );
    return root.children ?? [];
  });

  const visibleLines = createMemo(() => {
    const nodes = treeRoot();
    if (!nodes)
      return [
        {
          line: "(empty or non-JSON response)",
          node: null as unknown as TreeNode,
        },
      ];
    const flat = flattenTree(nodes);
    const q = filterQuery().toLowerCase();
    if (!q) return flat;
    return flat.filter((l) => l.line.toLowerCase().includes(q));
  });

  function toggleCurrentNode() {
    const lines = visibleLines();
    const cursor = appStore.responseTreeCursor;
    const item = lines[cursor];
    if (!item || !item.node) return;

    const path = item.node.path;
    const current = appStore.responseTreeExpanded;
    setAppStore("responseTreeExpanded", { ...current, [path]: !current[path] });
  }

  function copyCurrentNode() {
    const lines = visibleLines();
    const cursor = appStore.responseTreeCursor;
    const item = lines[cursor];
    if (!item || !item.node) return;
    const text =
      typeof item.node.value === "string"
        ? item.node.value
        : JSON.stringify(item.node.value, null, 2);
    Bun.spawnSync(["pbcopy"], { input: text });
  }

  const diffTarget = () => appStore.diffTarget;

  return (
    <box flexDirection="column">
      {diffTarget() ? (
        <DiffView
          historyResponse={diffTarget()!}
          currentResponse={response()!}
        />
      ) : response() ? (
        <>
          <text>
            {response()!.status} {response()!.statusText} | {response()!.timeMs}
            ms | {response()!.sizeBytes}B
          </text>
          <For each={appStore.assertionResults}>
            {(ar) => (
              <text>
                {ar.passed ? "✓" : "✗"} @assert {ar.assertion.target}{" "}
                {ar.assertion.operator} {ar.assertion.expected}
                {ar.passed ? "" : ` (actual: ${ar.actual})`}
              </text>
            )}
          </For>
          <text>── [{activeTab().toUpperCase()}] ──</text>

          {activeTab() === "body" && (
            <box flexDirection="column">
              {showFilter() ? (
                <input
                  placeholder="/filter..."
                  value={filterQuery()}
                  onSubmit={(val: string) => {
                    setFilterQuery(val);
                    setShowFilter(false);
                  }}
                  onChange={(val: string) => setFilterQuery(val)}
                />
              ) : null}
              <For each={visibleLines()}>
                {(item, idx) => {
                  const isSelected = () =>
                    idx() === appStore.responseTreeCursor;
                  const isActive = () =>
                    appStore.activePane === Pane.RESPONSE_VIEWER;
                  return (
                    <box
                      width="100%"
                      backgroundColor={
                        isSelected() && isActive() ? HIGHLIGHT_BG : undefined
                      }
                    >
                      <text
                        fg={
                          isSelected() && isActive() ? HIGHLIGHT_FG : undefined
                        }
                      >
                        {"  "}
                        {item.line}
                      </text>
                    </box>
                  );
                }}
              </For>
            </box>
          )}

          {activeTab() === "headers" && (
            <box flexDirection="column">
              <For each={Object.entries(response()!.headers)}>
                {([key, val]) => (
                  <text>
                    {key}: {val}
                  </text>
                )}
              </For>
            </box>
          )}

          {activeTab() === "cookies" && (
            <box flexDirection="column">
              {Object.entries(response()!.headers)
                .filter(([k]) => k.toLowerCase() === "set-cookie")
                .map(([, val]) => (
                  <text>{val}</text>
                ))}
            </box>
          )}
        </>
      ) : (
        <text>Execute a request to see the response here.</text>
      )}
    </box>
  );
};

function DiffView(props: {
  historyResponse: import("../types").ResponseData;
  currentResponse: import("../types").ResponseData;
}) {
  const diff = () =>
    diffResponses(props.historyResponse, props.currentResponse);

  return (
    <box flexDirection="column">
      <text>── Diff (History vs Live) ──</text>
      <text>
        Status: {diff().statusChanged ? "✗" : "✓"} {diff().statusBefore} →{" "}
        {diff().statusAfter}
      </text>
      <text>Body: {diff().bodyChanged ? "✗ changed" : "✓ identical"}</text>
      <For each={diff().headerDiffs}>
        {(hd) => (
          <text>
            {hd.key}: {hd.before} → {hd.after}
          </text>
        )}
      </For>
      <text>Press Tab to return to response view</text>
    </box>
  );
}
