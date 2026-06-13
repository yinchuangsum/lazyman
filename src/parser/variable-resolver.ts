import type { ParsedRequest, ResolvedRequest } from "../types";
import { loadEnv } from "../utils/env-loader";

export function resolveRequest(req: ParsedRequest, selectedEnv: string): ResolvedRequest {
  const activeEnv = loadEnv(selectedEnv);
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
}

export function resolveVariables(
  input: string,
  inlineVars: Record<string, unknown>,
  activeEnv: Record<string, unknown>,
  baseEnv: Record<string, unknown>,
): string {
  return input.replace(/\{\{(.+?)\}\}/g, (match, path: string) => {
    const val = lookup(path.trim(), inlineVars) ?? lookup(path.trim(), activeEnv) ?? lookup(path.trim(), baseEnv) ?? lookup(path.trim(), process.env as Record<string, string>);
    return typeof val === "string" ? val : match;
  });
}

function lookup(path: string, map: Record<string, unknown>): unknown {
  const parts = path.split(".");
  let current: unknown = map;
  for (const part of parts) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}
