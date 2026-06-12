export interface ScriptInput {
  request: { url: string; method: string; headers: Record<string, string>; body: string };
  response?: { status: number; statusText: string; headers: Record<string, string>; body: string };
  env: Record<string, string>;
}

export interface ScriptOutput extends ScriptInput {
  error?: string;
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
