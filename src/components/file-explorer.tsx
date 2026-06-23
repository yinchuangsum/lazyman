import { For, createEffect, createMemo } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import { appStore, mode, setAppStore } from "../stores/appStore";
import { Pane } from "../utils/panes";
import { parseHttpFile } from "../parser/http-parser";
import { loadHistoryEntries } from "../engine/history";
import { HIGHLIGHT_BG, HIGHLIGHT_FG } from "../style";
import { useHotkeyBar } from "../hooks/useHotkeyBar";
import { useSearchFilter } from "../hooks/useSearchFilter";
import type { HistoryEntry } from "../types";
import fs from "fs";
import path from "path";

export default () => {
  useHotkeyBar(Pane.FILE_EXPLORER, () => {
    if (appStore.explorerTabIndex === 0) {
      return [
        { key: "j/k", label: "Navigate" },
        { key: "Enter/Space", label: "Open" },
        { key: "e", label: "Edit" },
        { key: "[/]", label: "Switch tab" },
      ];
    }
    return [
      { key: "j/k", label: "Navigate" },
      { key: "Enter/Space", label: "View" },
      { key: "d", label: "Diff" },
      { key: "[/]", label: "Switch tab" },
    ];
  });

  useKeyboard((key) => {
    if (appStore.activePane !== Pane.FILE_EXPLORER) return;

    if (key.name === "[") {
      setAppStore("explorerTabIndex", (t) => (t === 0 ? 1 : 0));
      return;
    }
    if (key.name === "]") {
      setAppStore("explorerTabIndex", (t) => (t === 0 ? 1 : 0));
      return;
    }

    if (mode() !== "normal") {
      return;
    }

    if (appStore.explorerTabIndex === 0) {
      const items = fileItems();
      const idx = appStore.filesCursor;
      if (key.name === "j" || key.name === "down") {
        const newIdx = Math.min(idx + 1, items.length - 1);
        setAppStore("filesCursor", newIdx);
        loadFileFromItem(items[newIdx], newIdx);
      } else if (key.name === "k" || key.name === "up") {
        const newIdx = Math.max(idx - 1, 0);
        setAppStore("filesCursor", newIdx);
        loadFileFromItem(items[newIdx], newIdx);
      } else if (key.name === "return" || key.name === "space") {
        const item = items[idx];
        if (!item) return;
        setAppStore("consumeEnter", true);
        setAppStore("activePane", Pane.REQUEST_LIST);
      } else if (key.name === "e") {
        openInEditor(items[idx]);
      }
    } else {
      const items = historyItems();
      const idx = appStore.historyCursor;
      if (key.name === "j" || key.name === "down") {
        setAppStore("historyCursor", (c) => Math.min(c + 1, items.length - 1));
      } else if (key.name === "k" || key.name === "up") {
        setAppStore("historyCursor", (c) => Math.max(c - 1, 0));
      } else if (key.name === "return" || key.name === "space") {
        const item = items[idx];
        if (!item) return;
        setAppStore("activePane", Pane.RESPONSE_VIEWER);
        setAppStore("response", item.response);
      } else if (key.name === "d") {
        const item = items[idx];
        if (item && appStore.response) {
          setAppStore("diffTarget", item.response);
          setAppStore("activePane", Pane.RESPONSE_VIEWER);
        }
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

  const fileItems = createMemo(() => {
    const result: string[] = [];
    const cwd = process.cwd();
    try {
      const dir = fs.readdirSync(cwd);
      for (const f of dir) {
        if (f.endsWith(".http") || f.endsWith(".rest")) {
          result.push(f);
        }
      }
    } catch {}
    return result;
  });

  const historyItems = createMemo(() => {
    return historyEntries();
  });

  createEffect(() => {
    const items = fileItems();
    const idx = appStore.filesCursor;
    loadFileFromItem(items[idx], idx);
  });

  const currentItems = createMemo(() => {
    if (appStore.explorerTabIndex === 0) {
      return fileItems() as (string | HistoryEntry)[];
    }
    return historyItems() as (string | HistoryEntry)[];
  });

  const { filtered } = useSearchFilter(
    Pane.FILE_EXPLORER,
    currentItems,
    (item, query) => {
      const q = query.toLowerCase();
      if (typeof item === "string") {
        return item.toLowerCase().includes(q);
      }
      return `${item.method} ${item.url}`.toLowerCase().includes(q);
    },
  );

  return (
    <box flexDirection="column">
      <For each={filtered()}>
        {(item, idx) => {
          const isSelected = () =>
            appStore.explorerTabIndex === 0
              ? idx() === appStore.filesCursor
              : idx() === appStore.historyCursor;
          const isActive = () => appStore.activePane === Pane.FILE_EXPLORER;
          const isSourceFile = () =>
            appStore.explorerTabIndex === 0 &&
            idx() === appStore.sourceFileIndex &&
            !isActive();
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
                {appStore.explorerTabIndex === 1 ? "⏱ " : ""}
                {appStore.explorerTabIndex === 1
                  ? `${(item as HistoryEntry).method} ${(item as HistoryEntry).url}`
                  : (item as string)}
              </text>
            </box>
          );
        }}
      </For>
    </box>
  );
};

function openInEditor(item: string | undefined) {
  if (!item) return;
  const editor = process.env.EDITOR;
  if (!editor) {
    setAppStore("error", "No $EDITOR set");
    return;
  }
  const cwd = process.cwd();
  const filePath = path.join(cwd, item);
  if (!fs.existsSync(filePath)) return;
  Bun.spawnSync([editor, filePath], { env: process.env });
}

function loadFileFromItem(item: string | undefined, index: number) {
  if (!item) return;
  try {
    const fullPath = path.join(process.cwd(), item);
    const content = fs.readFileSync(fullPath, "utf-8");
    setAppStore("sourceFileIndex", index);
    setAppStore("parsedRequests", parseHttpFile(content, fullPath));
    setAppStore("parsedRequestIndex", 0);
  } catch {
    setAppStore("error", `Failed to read ${item}`);
  }
}
