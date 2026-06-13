import { For } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import { appStore, setAppStore } from "../stores/appStore";
import { Pane } from "../utils/panes";
import { HIGHLIGHT_BG, HIGHLIGHT_FG } from "../style";
import { useHotkeyBar } from "../hooks/useHotkeyBar";
import { executeRequestPipeline } from "../engine/pipeline";

export default () => {
  useHotkeyBar(Pane.REQUEST_LIST, () => [
    { key: "j/k", label: "Navigate" },
    { key: "Enter", label: "View detail" },
    { key: "Ctrl+Enter", label: "Execute" },
  ]);

  useKeyboard((key) => {
    if (appStore.activePane !== Pane.REQUEST_LIST) return;

    if (key.name === "j" || key.name === "down") {
      setAppStore("parsedRequestIndex", (i) => Math.min(i + 1, appStore.parsedRequests.length - 1));
    } else if (key.name === "k" || key.name === "up") {
      setAppStore("parsedRequestIndex", (i) => Math.max(i - 1, 0));
    } else if (key.name === "enter" || key.name === "space") {
      if (appStore.consumeEnter) {
        setAppStore("consumeEnter", false);
        return;
      }
      setAppStore("activePane", Pane.REQUEST_DETAIL);
    } else if (key.ctrl && key.name === "enter") {
      executeSelected();
    }
  });

  return appStore.parsedRequests.length > 0 ? (
    <For each={appStore.parsedRequests}>
      {(reqItem, idx) => {
        const isSelected = () => idx() === appStore.parsedRequestIndex;
        const isActive = () => appStore.activePane === Pane.REQUEST_LIST;
        return (
          <box width="100%" backgroundColor={isSelected() && isActive() ? HIGHLIGHT_BG : undefined}>
            <text fg={isSelected() && isActive() ? HIGHLIGHT_FG : undefined}>
              {"  "}{reqItem.method} {reqItem.url}
            </text>
          </box>
        );
      }}
    </For>
  ) : (
    <text>{"  "}No request selected. Open a .http file in the explorer.</text>
  );
};

async function executeSelected() {
  const idx = appStore.parsedRequestIndex;
  const req = appStore.parsedRequests[idx];
  if (!req) return;

  const result = await executeRequestPipeline(req, appStore.selectedEnv, process.cwd());

  if (result.error) {
    setAppStore("error", result.error);
  }

  setAppStore("response", result.response);
  setAppStore("assertionResults", result.assertionResults);
  setAppStore("activePane", Pane.RESPONSE_VIEWER);
}
