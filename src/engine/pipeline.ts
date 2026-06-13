import type { ParsedRequest, ResolvedRequest, ResponseData, AssertionResult } from "../types";
import { resolveRequest } from "../parser/variable-resolver";
import { executeRequest } from "./executor";
import { evaluateAssertions } from "./assertions";
import { runScriptsSequentially, loadGlobalScriptFiles } from "./scripting";
import { saveHistoryEntry } from "./history";

export interface PipelineResult {
  resolvedRequest: ResolvedRequest;
  response: ResponseData;
  assertionResults: AssertionResult[];
  error?: string;
}

export async function executeRequestPipeline(
  req: ParsedRequest,
  selectedEnv: string,
  cwd: string,
): Promise<PipelineResult> {
  const resolved = resolveRequest(req, selectedEnv);
  const sessionEnv: Record<string, string> = {};

  const globalPreScripts = loadGlobalScriptFiles("pre-request", cwd);
  if (globalPreScripts.length > 0) {
    const result = runScriptsSequentially(globalPreScripts, {
      request: { url: resolved.url, method: resolved.method, headers: { ...resolved.headers }, body: resolved.body },
      env: sessionEnv,
    });
    if (result.error) {
      return {
        resolvedRequest: resolved,
        response: { status: 0, statusText: "Error", headers: {}, body: "", timeMs: 0, sizeBytes: 0, error: result.error },
        assertionResults: [],
        error: `Pre-request script error: ${result.error}`,
      };
    }
    resolved.method = result.request.method;
    resolved.url = result.request.url;
    resolved.headers = result.request.headers;
    resolved.body = result.request.body;
    Object.assign(sessionEnv, result.env);
  }

  const localPreScripts = req.scripts.filter((s) => s.hook === "pre-request").map((s) => s.content);
  if (localPreScripts.length > 0) {
    const result = runScriptsSequentially(localPreScripts, {
      request: { url: resolved.url, method: resolved.method, headers: { ...resolved.headers }, body: resolved.body },
      env: sessionEnv,
    });
    if (result.error) {
      return {
        resolvedRequest: resolved,
        response: { status: 0, statusText: "Error", headers: {}, body: "", timeMs: 0, sizeBytes: 0, error: result.error },
        assertionResults: [],
        error: `Pre-request script error: ${result.error}`,
      };
    }
    resolved.method = result.request.method;
    resolved.url = result.request.url;
    resolved.headers = result.request.headers;
    resolved.body = result.request.body;
    Object.assign(sessionEnv, result.env);
  }

  const response = await executeRequest(resolved);
  if (response.error) {
    return { resolvedRequest: resolved, response, assertionResults: [], error: response.error };
  }

  const localPostScripts = req.scripts.filter((s) => s.hook === "post-response").map((s) => s.content);
  if (localPostScripts.length > 0) {
    const result = runScriptsSequentially(localPostScripts, {
      request: { url: resolved.url, method: resolved.method, headers: resolved.headers, body: resolved.body },
      response: { status: response.status, statusText: response.statusText, headers: response.headers, body: response.body },
      env: sessionEnv,
    });
    if (result.error) {
      return {
        resolvedRequest: resolved,
        response,
        assertionResults: [],
        error: `Post-response script error: ${result.error}`,
      };
    }
    Object.assign(sessionEnv, result.env);
  }

  const globalPostScripts = loadGlobalScriptFiles("post-response", cwd);
  if (globalPostScripts.length > 0) {
    const result = runScriptsSequentially(globalPostScripts, {
      request: { url: resolved.url, method: resolved.method, headers: resolved.headers, body: resolved.body },
      response: { status: response.status, statusText: response.statusText, headers: response.headers, body: response.body },
      env: sessionEnv,
    });
    if (result.error) {
      return {
        resolvedRequest: resolved,
        response,
        assertionResults: [],
        error: `Post-response script error: ${result.error}`,
      };
    }
    Object.assign(sessionEnv, result.env);
  }

  const assertionResults = evaluateAssertions(req.assertions, response);

  try {
    await saveHistoryEntry(cwd, resolved, response);
  } catch {
    /* silent — history save is non-critical */
  }

  return { resolvedRequest: resolved, response, assertionResults };
}
