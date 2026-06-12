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
