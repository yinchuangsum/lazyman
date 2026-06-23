import { For } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import { appStore, setAppStore } from "../stores/appStore";
import { Pane } from "../utils/panes";
import { useHotkeyBar } from "../hooks/useHotkeyBar";

interface HelpSection {
  title: string;
  bindings: { key: string; action: string }[];
}

const sections: HelpSection[] = [
  {
    title: "Global",
    bindings: [
      { key: "Tab", action: "Cycle panes forward" },
      { key: "1-4", action: "Focus specific pane" },
      { key: "v", action: "Toggle environment selector" },
      { key: "?", action: "Toggle help" },
      { key: "/", action: "Search/filter current pane" },
      { key: "Esc", action: "Exit filter mode" },
      { key: "q", action: "Quit" },
    ],
  },
  {
    title: "File Explorer",
    bindings: [
      { key: "j / ↓", action: "Move selection down" },
      { key: "k / ↑", action: "Move selection up" },
      { key: "[ / ]", action: "Switch tab (Files/History)" },
      { key: "Enter", action: "Open file / view history entry" },
      { key: "e", action: "Open file in $EDITOR" },
      { key: "d", action: "Diff history entry" },
    ],
  },
  {
    title: "Request List",
    bindings: [
      { key: "j / ↓", action: "Move selection down" },
      { key: "k / ↑", "action": "Move selection up" },
      { key: "Enter", action: "View request detail" },
      { key: "Ctrl+Enter", action: "Execute request" },
    ],
  },
  {
    title: "Request Detail",
    bindings: [
      { key: "j / ↓", action: "Scroll down" },
      { key: "k / ↑", action: "Scroll up" },
      { key: "Esc", action: "Back to list" },
    ],
  },
  {
    title: "Response",
    bindings: [
      { key: "Tab", action: "Switch tabs (Body/Headers/Cookies)" },
      { key: "j / ↓", action: "Navigate JSON tree down" },
      { key: "k / ↑", action: "Navigate JSON tree up" },
      { key: "Enter", action: "Expand/collapse tree node" },
      { key: "/", action: "Search/filter tree" },
      { key: "y", action: "Copy node value" },
    ],
  },
  {
    title: "Environment Selector",
    bindings: [
      { key: "j / ↓", action: "Move selection down" },
      { key: "k / ↑", action: "Move selection up" },
      { key: "Enter", action: "Select environment" },
      { key: "Esc / v", action: "Close" },
    ],
  },
];

export default () => {
  useHotkeyBar(Pane.HELP, () => [
    { key: "Esc/?", label: "Close" },
  ]);

  useKeyboard((key) => {
    if (!appStore.showHelpModal) return;

    if (key.name === "escape" || key.name === "?") {
      setAppStore("showHelpModal", false);
      setAppStore("activePane", Pane.FILE_EXPLORER);
    }
  });

  return (
    <box flexDirection="column" width="100%" height="100%">
      <text>── Keybindings ──</text>
      <text> </text>
      <For each={sections}>
        {(section) => (
          <box flexDirection="column">
            <text>{section.title}</text>
            <For each={section.bindings}>
              {(b) => (
                <text>  {b.key.padEnd(16)}{b.action}</text>
              )}
            </For>
            <text> </text>
          </box>
        )}
      </For>
      <text>Press ? or Esc to close</text>
    </box>
  );
};
