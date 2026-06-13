import { For, createEffect, createMemo } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import { appStore, setAppStore } from "../stores/appStore";
import { Pane } from "../utils/panes";
import { parseHttpFile } from "../parser/http-parser";
import { loadHistoryEntries } from "../engine/history";
import { HIGHLIGHT_BG, HIGHLIGHT_FG } from "../style";
import { useHotkeyBar } from "../hooks/useHotkeyBar";
import fs from "fs";
import path from "path";

export default () => {
  useHotkeyBar(Pane.FILE_EXPLORER, () => [
    { key: "j/k", label: "Navigate" },
    { key: "Enter/Space", label: "Open" },
    { key: "e", label: "Edit" },
    { key: "d", label: "Diff" },
  ]);

  useKeyboard((key) => {
    if (appStore.activePane !== Pane.FILE_EXPLORER) return;
    const items = flatItems();
    const idx = appStore.selectedRequestIndex;

    if (key.name === "j" || key.name === "down") {
      const newIdx = Math.min(idx + 1, items.length - 1);
      setAppStore("selectedRequestIndex", newIdx);
      loadFileFromItem(items[newIdx], newIdx);
    } else if (key.name === "k" || key.name === "up") {
      const newIdx = Math.max(idx - 1, 0);
      setAppStore("selectedRequestIndex", newIdx);
      loadFileFromItem(items[newIdx], newIdx);
    } else if (key.name === "return" || key.name === "space") {
      const item = items[idx];
      if (!item) return;
      if (item.type === "file") {
        setAppStore("consumeEnter", true);
        setAppStore("activePane", Pane.REQUEST_LIST);
      } else if (item.type === "history") {
        setAppStore("activePane", Pane.RESPONSE_VIEWER);
        const entry = item._entry;
        if (entry) {
          setAppStore("response", entry.response);
        }
      }
    } else if (key.name === "e") {
      openInEditor(items[idx]);
    } else if (key.name === "d") {
      const item = items[idx];
      if (item?.type === "history" && item._entry && appStore.response) {
        setAppStore("diffTarget", item._entry.response);
        setAppStore("activePane", Pane.RESPONSE_VIEWER);
      }
    }
  });

  const historyEntries = createMemo(() => {
    try {
      return loadHistoryEntries(process.cwd());
    } catch {
      return [];
    }
  });

  const flatItems = createMemo(() => {
    type Item = {
      name: string;
      type: "file" | "history";
      _entry?: import("../types").HistoryEntry;
    };
    const result: Item[] = [];
    const cwd = process.cwd();

    try {
      const dir = fs.readdirSync(cwd);
      for (const f of dir) {
        if (f.endsWith(".http") || f.endsWith(".rest")) {
          result.push({ name: f, type: "file" });
        }
      }
    } catch {}

    const history = historyEntries();
    if (history.length > 0) {
      result.push({ name: "── history ──", type: "history" });
      for (const entry of history) {
        const label = `  ${entry.method} ${entry.url}`;
        result.push({ name: label, type: "history", _entry: entry });
      }
    }

    return result;
  });

  createEffect(() => {
    const items = flatItems();
    const idx = appStore.selectedRequestIndex;
    loadFileFromItem(items[idx], idx);
  }, []);

  return (
    <box flexDirection="column">
      <For each={flatItems()}>
        {(item, idx) => {
          const isSelected = () => idx() === appStore.selectedRequestIndex;
          const isActive = () => appStore.activePane === Pane.FILE_EXPLORER;
          const isSourceFile = () =>
            idx() === appStore.sourceFileIndex && !isActive();
          return (
            <box
              width={"100%"}
              backgroundColor={
                isSelected() && isActive()
                  ? HIGHLIGHT_BG
                  : isSourceFile()
                    ? HIGHLIGHT_BG
                    : undefined
              }
            >
              <text fg={isSelected() && isActive() ? HIGHLIGHT_FG : undefined}>
                {"  "}
                {item.type === "history" ? "⏱ " : ""}
                {item.name}
              </text>
            </box>
          );
        }}
      </For>
    </box>
  );
};

function openInEditor(item: { name: string; type: string } | undefined) {
  if (!item) return;
  const editor = process.env.EDITOR;
  if (!editor) {
    setAppStore("error", "No $EDITOR set");
    return;
  }

  const cwd = process.cwd();
  const filePath = path.join(
    cwd,
    item.name.endsWith(".http") || item.name.endsWith(".rest")
      ? item.name
      : "example.http",
  );
  if (!fs.existsSync(filePath)) {
    const found = fs
      .readdirSync(cwd)
      .find((f) => f.endsWith(".http") || f.endsWith(".rest"));
    if (!found) return;
    Bun.spawnSync([editor, path.join(cwd, found)], { env: process.env });
    return;
  }
  Bun.spawnSync([editor, filePath], { env: process.env });
}

function loadFileFromItem(
  item: { name: string; type: string } | undefined,
  index: number,
) {
  if (item?.type !== "file") return;
  try {
    const fullPath = path.join(process.cwd(), item.name);
    const content = fs.readFileSync(fullPath, "utf-8");
    setAppStore("sourceFileIndex", index);
    setAppStore("parsedRequests", parseHttpFile(content, fullPath));
    setAppStore("parsedRequestIndex", 0);
  } catch {
    setAppStore("error", `Failed to read ${item.name}`);
  }
}
