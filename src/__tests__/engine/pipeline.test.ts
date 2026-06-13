import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { executeRequestPipeline } from "../../engine/pipeline";
import type { ParsedRequest } from "../../types";
import fs from "fs";
import path from "path";

const testDir = import.meta.dirname + "/__pipeline_test__";
const origCwd = process.cwd();

beforeEach(() => {
  fs.mkdirSync(testDir, { recursive: true });
  process.chdir(testDir);
});

afterEach(() => {
  process.chdir(origCwd);
  fs.rmSync(testDir, { recursive: true, force: true });
});

describe("pipeline", () => {
  it("executes a request end-to-end with resolved env vars", async () => {
    const envDir = path.join(testDir, ".lazyman", "environments");
    fs.mkdirSync(envDir, { recursive: true });
    fs.writeFileSync(path.join(envDir, "dev.json"), JSON.stringify({ base_url: "http://localhost" }));

    const server = Bun.serve({
      port: 0,
      fetch(req) {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      },
    });

    try {
      const req: ParsedRequest = {
        method: "GET",
        url: "{{base_url}}:{{port}}/api/test",
        httpVersion: "HTTP/1.1",
        headers: {},
        body: "",
        name: "Test",
        assertions: [
          { operator: "==", target: "status", expected: "200" },
          { operator: "contains", target: "headers.content-type", expected: "json" },
        ],
        inlineVars: { port: String(server.port) },
        scripts: [],
        sourceLine: 1,
      };

      const result = await executeRequestPipeline(req, "dev", testDir);

      expect(result.error).toBeUndefined();
      expect(result.response.status).toBe(200);
      expect(result.response.body).toBe(JSON.stringify({ ok: true }));
      expect(result.assertionResults).toHaveLength(2);
      expect(result.assertionResults[0].passed).toBe(true);
      expect(result.assertionResults[1].passed).toBe(true);
    } finally {
      server.stop();
    }
  });

  it("runs global pre-request scripts before execution", async () => {
    const envDir = path.join(testDir, ".lazyman", "environments");
    fs.mkdirSync(envDir, { recursive: true });
    fs.writeFileSync(path.join(envDir, "dev.json"), JSON.stringify({}));

    const scriptDir = path.join(testDir, "scripts", "global", "pre-request");
    fs.mkdirSync(scriptDir, { recursive: true });
    fs.writeFileSync(path.join(scriptDir, "01-set-header.js"), 'request.headers["X-Custom"] = "from-script";');

    const server = Bun.serve({
      port: 0,
      fetch(req) {
        const custom = req.headers.get("X-Custom");
        return new Response(JSON.stringify({ header: custom }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      },
    });

    try {
      const req: ParsedRequest = {
        method: "GET",
        url: `http://localhost:${server.port}/test`,
        httpVersion: "HTTP/1.1",
        headers: {},
        body: "",
        name: "Test",
        assertions: [],
        inlineVars: {},
        scripts: [],
        sourceLine: 1,
      };

      const result = await executeRequestPipeline(req, "dev", testDir);
      expect(result.error).toBeUndefined();
      expect(result.response.status).toBe(200);
      expect(result.response.body).toBe(JSON.stringify({ header: "from-script" }));
    } finally {
      server.stop();
    }
  });

  it("saves a history entry after execution", async () => {
    const envDir = path.join(testDir, ".lazyman", "environments");
    fs.mkdirSync(envDir, { recursive: true });
    fs.writeFileSync(path.join(envDir, "dev.json"), JSON.stringify({}));

    const server = Bun.serve({
      port: 0,
      fetch() {
        return new Response("ok", { status: 200 });
      },
    });

    try {
      const req: ParsedRequest = {
        method: "GET",
        url: `http://localhost:${server.port}/test`,
        httpVersion: "HTTP/1.1",
        headers: {},
        body: "",
        name: "Test",
        assertions: [],
        inlineVars: {},
        scripts: [],
        sourceLine: 1,
      };

      await executeRequestPipeline(req, "dev", testDir);

      const historyDir = path.join(testDir, ".lazyman", "history");
      expect(fs.existsSync(historyDir)).toBe(true);
      const files = fs.readdirSync(historyDir);
      expect(files.length).toBeGreaterThan(0);
    } finally {
      server.stop();
    }
  });
});
