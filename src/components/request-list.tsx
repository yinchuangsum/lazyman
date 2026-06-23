import { useKeyboard } from "@opentui/solid";
import { appStore, setAppStore } from "../stores/appStore";
import { Pane } from "../utils/panes";
import { HIGHLIGHT_BG, HIGHLIGHT_FG } from "../style";
import { useHotkeyBar } from "../hooks/useHotkeyBar";
import { useSearchFilter } from "../hooks/useSearchFilter";
import { executeRequestPipeline } from "../engine/pipeline";
import { For, Show } from "solid-js";
import type { ParsedRequest } from "../types";

export default () => {
  useHotkeyBar(Pane.REQUEST_LIST, () => [
    { key: "j/k", label: "Navigate" },
    { key: "Enter", label: "View detail" },
    { key: "Ctrl+Enter", label: "Execute" },
  ]);

  const { filtered } = useSearchFilter(
    Pane.REQUEST_LIST,
    () => appStore.parsedRequests,
    (item, query) => {
      const q = query.toLowerCase();
      const label = `${item.method} ${item.url} ${item.name ?? ""}`;
      return label.toLowerCase().includes(q);
    },
  );

  useKeyboard((key) => {
    if (appStore.activePane !== Pane.REQUEST_LIST) return;

    if (key.name === "j" || key.name === "down") {
      setAppStore("parsedRequestIndex", (i) =>
        Math.min(i + 1, filtered().length - 1),
      );
    } else if (key.name === "k" || key.name === "up") {
      setAppStore("parsedRequestIndex", (i) => Math.max(i - 1, 0));
    } else if (key.name === "space") {
      if (appStore.consumeEnter) {
        setAppStore("consumeEnter", false);
        return;
      }
      setAppStore("activePane", Pane.REQUEST_DETAIL);
    } else if (key.name === "return") {
      executeSelected(filtered());
    }
  });

  return (
    <Show when={filtered().length > 0}>
      <For each={filtered()}>
        {(reqItem, idx) => {
          const isSelected = () => idx() === appStore.parsedRequestIndex;
          const isActive = () => appStore.activePane === Pane.REQUEST_LIST;
          return (
            <box
              width="100%"
              backgroundColor={
                isSelected() && isActive() ? HIGHLIGHT_BG : undefined
              }
            >
              <text fg={isSelected() && isActive() ? HIGHLIGHT_FG : undefined}>
                {"  "}
                {reqItem.method} {reqItem.url}
              </text>
            </box>
          );
        }}
      </For>
    </Show>
  );
};

async function executeSelected(requests: ParsedRequest[]) {
  const idx = appStore.parsedRequestIndex;
  const req = requests[idx];
  if (!req) return;

  const result = await executeRequestPipeline(
    req,
    appStore.selectedEnv,
    process.cwd(),
  );

  console.log(result);

  if (result.error) {
    setAppStore("error", result.error);
  }

  setAppStore("response", result.response);
  setAppStore("assertionResults", result.assertionResults);
  setAppStore("activePane", Pane.RESPONSE_VIEWER);
}
