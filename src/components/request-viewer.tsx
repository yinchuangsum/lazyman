import { createMemo, For } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import { appStore, setAppStore } from "../stores/appStore";
import { Pane } from "../utils/panes";
import { resolveVariables } from "../parser/variable-resolver";
import { METHOD_COLORS } from "../style";
import type { ParsedRequest } from "../types";
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
  useKeyboard((key) => {
    if (appStore.activePane !== Pane.REQUEST_VIEWER) return;

    if (key.name === "space" || key.name === "enter") {
      executeSelected();
    } else if (key.name === "j" || key.name === "down") {
      setAppStore("selectedRequestIndex", (i) => Math.min(i + 1, appStore.parsedRequests.length - 1));
    } else if (key.name === "k" || key.name === "up") {
      setAppStore("selectedRequestIndex", (i) => Math.max(i - 1, 0));
    }
  });

  const currentRequest = createMemo(() => {
    const idx = appStore.selectedRequestIndex;
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

  const req = () => currentRequest();
  const resolved = () => resolvedRequest();

  return (
    <box flexDirection="column">
      {req() ? (
        <>
          <text>
            {req()!.method} {resolved()?.url ?? req()!.url}
          </text>
          <For each={Object.entries(req()!.headers)}>
            {([key, val]) => (
              <text>
                {key}: {val}
              </text>
            )}
          </For>
          {req()!.body ? (
            <>
              <text> </text>
              <text>{resolved()?.body ?? req()!.body}</text>
            </>
          ) : null}
        </>
      ) : (
        <text>No request selected. Open a .http file in the explorer.</text>
      )}
    </box>
  );
};

async function executeSelected() {
  const store = (await import("../stores/appStore")).appStore;
  const idx = store.selectedRequestIndex;
  const req = store.parsedRequests[idx];
  if (!req) return;

  const { executeRequest } = await import("../engine/executor");
  const { evaluateAssertions } = await import("../engine/assertions");
  const { runScript } = await import("../engine/scripting");
  const { saveHistoryEntry } = await import("../engine/history");
  const fs = await import("fs");
  const path = await import("path");

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

  const scriptDir = path.default.join(process.cwd(), "scripts");
  const sessionEnv: Record<string, string> = {};

  const preScriptPath = path.default.join(scriptDir, "pre-request.js");
  if (fs.default.existsSync(preScriptPath)) {
    const scriptContent = fs.default.readFileSync(preScriptPath, "utf-8");
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

  const postScriptPath = path.default.join(scriptDir, "post-response.js");
  if (fs.default.existsSync(postScriptPath)) {
    const scriptContent = fs.default.readFileSync(postScriptPath, "utf-8");
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
