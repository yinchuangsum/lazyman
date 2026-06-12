import type { ResolvedRequest, ResponseData } from "../types";

export async function executeRequest(request: ResolvedRequest): Promise<ResponseData> {
  const start = performance.now();
  try {
    const headers = new Headers(request.headers);
    const init: RequestInit = { method: request.method, headers };
    if (request.body && request.method !== "GET" && request.method !== "HEAD") {
      init.body = request.body;
    }

    const res = await fetch(request.url, init);
    const body = await res.text();
    const elapsed = performance.now() - start;

    const respHeaders: Record<string, string> = {};
    res.headers.forEach((val, key) => {
      respHeaders[key] = val;
    });

    return {
      status: res.status,
      statusText: res.statusText,
      headers: respHeaders,
      body,
      timeMs: Math.round(elapsed),
      sizeBytes: new TextEncoder().encode(body).length,
    };
  } catch (err) {
    const elapsed = performance.now() - start;
    return {
      status: 0,
      statusText: "Error",
      headers: {},
      body: "",
      timeMs: Math.round(elapsed),
      sizeBytes: 0,
      error: String(err),
    };
  }
}
