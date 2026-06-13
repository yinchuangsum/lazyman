import { createMemo, createSignal, For } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import { appStore, setAppStore } from "../stores/appStore";
import { Pane } from "../utils/panes";
import { resolveRequest } from "../parser/variable-resolver";
import { useHotkeyBar } from "../hooks/useHotkeyBar";

export default () => {
  useHotkeyBar(Pane.REQUEST_DETAIL, () => [
    { key: "j/k", label: "Scroll" },
    { key: "Esc", label: "Back to list" },
  ]);

  const [detailScroll, setDetailScroll] = createSignal(0);

  useKeyboard((key) => {
    if (appStore.activePane !== Pane.REQUEST_DETAIL) return;

    if (key.name === "escape") {
      setAppStore("activePane", Pane.REQUEST_LIST);
    } else if (key.name === "j" || key.name === "down") {
      setDetailScroll((s) => Math.min(s + 1, maxScroll()));
    } else if (key.name === "k" || key.name === "up") {
      setDetailScroll((s) => Math.max(s - 1, 0));
    }
  });

  const currentRequest = createMemo(() => {
    const idx = appStore.parsedRequestIndex;
    return appStore.parsedRequests[idx] ?? null;
  });

  const resolvedRequest = createMemo(() => {
    const req = currentRequest();
    if (!req) return null;
    return resolveRequest(req, appStore.selectedEnv);
  });

  const detailLines = createMemo(() => {
    const req = currentRequest();
    const resolved = resolvedRequest();
    if (!req) return [];

    const lines: string[] = [];
    const method = req.method;
    const url = resolved?.url ?? req.url;
    lines.push(`${method} ${url}`);
    lines.push("");

    for (const [k, v] of Object.entries(req.headers)) {
      const resolvedVal = resolved?.headers[k] ?? v;
      lines.push(`${k}: ${resolvedVal}`);
    }

    if (req.body) {
      lines.push("");
      const b = resolved?.body ?? req.body;
      lines.push(b);
    }

    return lines;
  });

  const maxScroll = createMemo(() => Math.max(0, detailLines().length - 1));

  const req = () => currentRequest();

  return req() ? (
    <For each={detailLines().slice(detailScroll())}>
      {(line) => <text>{line}</text>}
    </For>
  ) : null;
};
