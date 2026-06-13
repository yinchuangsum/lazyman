import { For } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import { appStore, setAppStore } from "../stores/appStore";
import { Pane } from "../utils/panes";
import { HIGHLIGHT_BG, HIGHLIGHT_FG } from "../style";
import { useHotkeyBar } from "../hooks/useHotkeyBar";
import fs from "fs";
import path from "path";

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
  const store = (await import("../stores/appStore")).appStore;
  const idx = store.parsedRequestIndex;
  const req = store.parsedRequests[idx];
  if (!req) return;

  const { executeRequest } = await import("../engine/executor");
  const { evaluateAssertions } = await import("../engine/assertions");
  const { runScript } = await import("../engine/scripting");
  const { saveHistoryEntry } = await import("../engine/history");
  const { loadEnv } = await import("../utils/env-loader");
  const { resolveVariables } = await import("../parser/variable-resolver");
  const { setAppStore: set } = await import("../stores/appStore");

  const activeEnv = loadEnv(store.selectedEnv);
  const baseEnv = loadEnv("base");

  let resolvedReq = {
    method: req.method,
    url: resolveVariables(req.url, req.inlineVars, activeEnv, baseEnv),
    httpVersion: req.httpVersion,
    headers: Object.fromEntries(
      Object.entries(req.headers).map(([k, v]) => [k, resolveVariables(v, req.inlineVars, activeEnv, baseEnv)]),
    ),
    body: resolveVariables(req.body, req.inlineVars, activeEnv, baseEnv),
  };

  const scriptDir = path.join(process.cwd(), "scripts");
  const sessionEnv: Record<string, string> = {};

  const preScriptPath = path.join(scriptDir, "pre-request.js");
  if (fs.existsSync(preScriptPath)) {
    const scriptContent = fs.readFileSync(preScriptPath, "utf-8");
    const scriptCtx = runScript(scriptContent, {
      request: { url: resolvedReq.url, method: resolvedReq.method, headers: { ...resolvedReq.headers }, body: resolvedReq.body },
      env: sessionEnv,
    });
    if (scriptCtx.error) {
      set("error", `Pre-request script error: ${scriptCtx.error}`);
    }
    resolvedReq = {
      method: scriptCtx.request.method,
      url: scriptCtx.request.url,
      httpVersion: req.httpVersion,
      headers: scriptCtx.request.headers,
      body: scriptCtx.request.body,
    };
    Object.assign(sessionEnv, scriptCtx.env);
  }

  const response = await executeRequest(resolvedReq);
  const assertionResults = evaluateAssertions(req.assertions, response);

  const postScriptPath = path.join(scriptDir, "post-response.js");
  if (fs.existsSync(postScriptPath)) {
    const scriptContent = fs.readFileSync(postScriptPath, "utf-8");
    const scriptCtx = runScript(scriptContent, {
      request: { url: resolvedReq.url, method: resolvedReq.method, headers: resolvedReq.headers, body: resolvedReq.body },
      response: { status: response.status, statusText: response.statusText, headers: response.headers, body: response.body },
      env: sessionEnv,
    });
    if (scriptCtx.error) {
      set("error", `Post-response script error: ${scriptCtx.error}`);
    }
    Object.assign(sessionEnv, scriptCtx.env);
  }

  set("response", response);
  set("assertionResults", assertionResults);
  set("activePane", Pane.RESPONSE_VIEWER);

  try {
    const baseDir = process.cwd();
    await saveHistoryEntry(baseDir, resolvedReq, response);
  } catch {}
}
