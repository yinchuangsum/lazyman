import fs from "fs";
import path from "path";

export interface ScriptInput {
  request: { url: string; method: string; headers: Record<string, string>; body: string };
  response?: { status: number; statusText: string; headers: Record<string, string>; body: string };
  env: Record<string, string>;
}

export interface ScriptOutput extends ScriptInput {
  error?: string;
}

export function runScriptsSequentially(scripts: string[], input: ScriptInput): ScriptOutput {
  let current: ScriptInput = input;
  for (const content of scripts) {
    const output = runScript(content, current);
    if (output.error) {
      return output;
    }
    current = output;
  }
  return current;
}

export function loadGlobalScriptFiles(hook: "pre-request" | "post-response", cwd: string): string[] {
  const dir = path.join(cwd, "scripts", "global", hook);
  try {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
      .filter((f) => f.endsWith(".js"))
      .sort()
      .map((f) => fs.readFileSync(path.join(dir, f), "utf-8"));
  } catch {
    return [];
  }
}

export function runScript(scriptContent: string, context: ScriptInput): ScriptOutput {
  const ctx = {
    request: { ...context.request, headers: { ...context.request.headers } },
    response: context.response ? { ...context.response, headers: { ...context.response.headers } } : undefined,
    env: { ...context.env },
  };

  try {
    const fn = new Function("request", "response", "env", scriptContent);
    fn(ctx.request, ctx.response ?? null, ctx.env);
    return {
      request: ctx.request,
      response: ctx.response,
      env: ctx.env,
    };
  } catch (err) {
    return {
      request: ctx.request,
      response: ctx.response,
      env: ctx.env,
      error: String(err),
    };
  }
}
