import { createMemo, createSignal, For } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import { appStore, setAppStore } from "../stores/appStore";
import { Pane } from "../utils/panes";
import { resolveVariables } from "../parser/variable-resolver";
import { HIGHLIGHT_BG, HIGHLIGHT_FG } from "../style";
import fs from "fs";
import path from "path";

function loadEnv(name: string): Record<string, unknown> {
  try {
    const envPath = path.join(process.cwd(), ".lazyman", "environments", `${name}.json`);
    const content = fs.readFileSync(envPath, "utf-8");
    return JSON.parse(content);
  } catch {
    return {};
  }
}

export default () => {
  const [detailFocused, setDetailFocused] = createSignal(false);
  const [detailScroll, setDetailScroll] = createSignal(0);

  useKeyboard((key) => {
    if (appStore.activePane !== Pane.REQUEST_VIEWER) return;

    if (detailFocused()) {
      if (key.name === "escape") {
        setDetailFocused(false);
      } else if (key.name === "j" || key.name === "down") {
        setDetailScroll((s) => Math.min(s + 1, maxScroll()));
      } else if (key.name === "k" || key.name === "up") {
        setDetailScroll((s) => Math.max(s - 1, 0));
      }
    } else {
      if (key.name === "j" || key.name === "down") {
        setAppStore("parsedRequestIndex", (i) => Math.min(i + 1, appStore.parsedRequests.length - 1));
      } else if (key.name === "k" || key.name === "up") {
        setAppStore("parsedRequestIndex", (i) => Math.max(i - 1, 0));
      } else if (key.name === "enter" || key.name === "space") {
        setDetailScroll(0);
        setDetailFocused(true);
      } else if (key.ctrl && key.name === "enter") {
        executeSelected();
      }
    }
  });

  const currentRequest = createMemo(() => {
    const idx = appStore.parsedRequestIndex;
    return appStore.parsedRequests[idx] ?? null;
  });

  const resolvedRequest = createMemo(() => {
    const req = currentRequest();
    if (!req) return null;

    const activeEnv = loadEnv(appStore.selectedEnv);
    const baseEnv = loadEnv("base");

    return {
      method: req.method,
      url: resolveVariables(req.url, req.inlineVars, activeEnv, baseEnv),
      httpVersion: req.httpVersion,
      headers: Object.fromEntries(
        Object.entries(req.headers).map(([k, v]) => [k, resolveVariables(v, req.inlineVars, activeEnv, baseEnv)]),
      ),
      body: resolveVariables(req.body, req.inlineVars, activeEnv, baseEnv),
    };
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
  const resolved = () => resolvedRequest();

  return (
    <box flexDirection="row" width="100%" height="100%">
      <box flexDirection="column" width="35%" height="100%">
        {req() ? (
          <For each={appStore.parsedRequests}>
            {(reqItem, idx) => {
              const isSelected = () => idx() === appStore.parsedRequestIndex;
              const isActive = () => appStore.activePane === Pane.REQUEST_VIEWER;
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
        )}
      </box>

      <box flexDirection="column" width="65%" height="100%">
        {req() ? (
          <For each={detailLines().slice(detailScroll())}>
            {(line) => <text>{line}</text>}
          </For>
        ) : null}
      </box>
    </box>
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
      setAppStore("error", `Pre-request script error: ${scriptCtx.error}`);
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
      setAppStore("error", `Post-response script error: ${scriptCtx.error}`);
    }
    Object.assign(sessionEnv, scriptCtx.env);
  }

  setAppStore("response", response);
  setAppStore("assertionResults", assertionResults);
  setAppStore("activePane", Pane.RESPONSE_VIEWER);

  try {
    const baseDir = process.cwd();
    await saveHistoryEntry(baseDir, resolvedReq, response);
  } catch {}
}
