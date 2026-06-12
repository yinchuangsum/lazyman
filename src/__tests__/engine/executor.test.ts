import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { executeRequest } from "../../engine/executor";
import type { ResolvedRequest } from "../../types";

let server: { url: string; stop: () => void };

beforeAll(() => {
  const s = Bun.serve({
    port: 0,
    fetch(req) {
      const url = new URL(req.url);
      if (url.pathname === "/api/users" && req.method === "GET") {
        return Response.json({ users: ["alice"] }, { status: 200 });
      }
      if (url.pathname === "/api/data" && req.method === "POST") {
        return new Response("created", { status: 201 });
      }
      if (url.pathname === "/api/error") {
        return new Response("Not Found", { status: 404 });
      }
      return new Response("OK", { status: 200 });
    },
  });
  server = { url: `http://localhost:${s.port}`, stop: () => s.stop() };
});

afterAll(() => server.stop());

describe("executor", () => {
  it("returns response data with status, headers, body, and timing", async () => {
    const request: ResolvedRequest = {
      method: "GET",
      url: `${server.url}/api/users`,
      httpVersion: "HTTP/1.1",
      headers: {},
      body: "",
    };

    const response = await executeRequest(request);
    expect(response.status).toBe(200);
    expect(response.statusText).toBe("OK");
    expect(response.body).toBe(JSON.stringify({ users: ["alice"] }));
    expect(response.timeMs).toBeGreaterThanOrEqual(0);
    expect(response.sizeBytes).toBeGreaterThan(0);
  });

  it("executes POST requests with body", async () => {
    const request: ResolvedRequest = {
      method: "POST",
      url: `${server.url}/api/data`,
      httpVersion: "HTTP/1.1",
      headers: { "Content-Type": "text/plain" },
      body: "hello",
    };

    const response = await executeRequest(request);
    expect(response.status).toBe(201);
  });

  it("captures 404 responses", async () => {
    const request: ResolvedRequest = {
      method: "GET",
      url: `${server.url}/api/error`,
      httpVersion: "HTTP/1.1",
      headers: {},
      body: "",
    };

    const response = await executeRequest(request);
    expect(response.status).toBe(404);
    expect(response.statusText).toBe("Not Found");
  });
});
