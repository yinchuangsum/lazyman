import { createMemo, createSignal, For } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import { appStore, setAppStore } from "../stores/appStore";
import { Pane } from "../utils/panes";
import { useHotkeyBar } from "../hooks/useHotkeyBar";
import fs from "fs";
import path from "path";

export default () => {
  useHotkeyBar(Pane.ENV_MODAL, () => [
    { key: "j/k", label: "Navigate" },
    { key: "Enter", label: "Select" },
    { key: "Esc/v", label: "Close" },
  ]);

  const [envCursor, setEnvCursor] = createSignal(0);

  useKeyboard((key) => {
    if (!appStore.showEnvModal) return;

    if (key.name === "escape" || key.name === "v") {
      setAppStore("showEnvModal", false);
      setAppStore("activePane", Pane.FILE_EXPLORER);
    } else if (key.name === "j" || key.name === "down") {
      setEnvCursor((i) => Math.min(i + 1, envFiles().length - 1));
    } else if (key.name === "k" || key.name === "up") {
      setEnvCursor((i) => Math.max(i - 1, 0));
    } else if (key.name === "return") {
      const files = envFiles();
      const selected = files[envCursor()];
      if (selected) {
        const name = selected.replace(/\.json$/, "");
        setAppStore("selectedEnv", name);
        setAppStore("showEnvModal", false);
        setAppStore("activePane", Pane.FILE_EXPLORER);
      }
    }
  });

  const envFiles = () => {
    try {
      const envDir = path.join(process.cwd(), ".lazyman", "environments");
      if (!fs.existsSync(envDir)) return [];
      return fs.readdirSync(envDir).filter((f) => f.endsWith(".json"));
    } catch {
      return [];
    }
  };

  return (
    <box flexDirection="column" width="100%" height="100%">
      <text>── Environment Selector ──</text>
      <text>Select an environment:</text>
      <For each={envFiles()}>
        {(file, idx) => {
          const name = file.replace(/\.json$/, "");
          const isSelected = () => idx() === envCursor();
          const isActive = () => name === appStore.selectedEnv;
          return (
            <text>
              {isSelected() ? "→ " : "  "}
              {name}
              {isActive() ? " (active)" : ""}
            </text>
          );
        }}
      </For>
      <text> </text>
      <text>Press Enter to select, Esc to cancel</text>
    </box>
  );
};
