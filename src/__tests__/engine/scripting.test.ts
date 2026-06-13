import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { runScript, runScriptsSequentially, loadGlobalScriptFiles } from "../../engine/scripting";
import fs from "fs";
import path from "path";

describe("scripting", () => {
  it("mutates request headers in pre-request script", () => {
    const context = {
      request: { url: "/api/users", method: "GET", headers: {} as Record<string, string>, body: "" },
      env: { token: "abc123" },
    };

    const result = runScript(
      'request.headers["Authorization"] = "Bearer " + env.token;',
      context,
    );

    expect(result.request.headers["Authorization"]).toBe("Bearer abc123");
  });

  it("sets env variables from response in post-response script", () => {
    const context = {
      request: { url: "/api/login", method: "POST", headers: {} as Record<string, string>, body: "" },
      response: { status: 200, statusText: "OK", headers: {} as Record<string, string>, body: '{"token":"xyz"}' },
      env: {} as Record<string, string>,
    };

    const result = runScript(
      "const data = JSON.parse(response.body); env.token = data.token;",
      context,
    );

    expect(result.env.token).toBe("xyz");
  });

  it("runs multiple scripts sequentially, each passing context to the next", () => {
    const context = {
      request: { url: "/api/users", method: "GET", headers: {} as Record<string, string>, body: "" },
      env: {} as Record<string, string>,
    };

    const scripts = [
      'env.step1 = "done";',
      'env.step2 = env.step1 + "-confirmed";',
    ];

    const result = runScriptsSequentially(scripts, context);
    expect(result.env.step1).toBe("done");
    expect(result.env.step2).toBe("done-confirmed");
  });

  it("stops the chain on the first script error", () => {
    const context = {
      request: { url: "/api/users", method: "GET", headers: {} as Record<string, string>, body: "" },
      env: {} as Record<string, string>,
    };

    const scripts = [
      'env.before = "set";',
      'throw new Error("mid-fail");',
      'env.after = "never-reached";',
    ];

    const result = runScriptsSequentially(scripts, context);
    expect(result.env.before).toBe("set");
    expect(result.error).toContain("mid-fail");
    expect(result.env.after).toBeUndefined();
  });

  it("loads empty array when no global script directory exists", () => {
    const tmpDir = import.meta.dirname + "/__scripting_test__";
    fs.mkdirSync(tmpDir, { recursive: true });
    try {
      const result = loadGlobalScriptFiles("pre-request", tmpDir);
      expect(result).toEqual([]);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("loads global scripts sorted by filename", () => {
    const tmpDir = import.meta.dirname + "/__scripting_test__";
    const scriptDir = path.join(tmpDir, "scripts", "global", "pre-request");
    fs.mkdirSync(scriptDir, { recursive: true });
    try {
      fs.writeFileSync(path.join(scriptDir, "02-second.js"), "env.order = 'second';");
      fs.writeFileSync(path.join(scriptDir, "01-first.js"), "env.order = 'first';");

      const scripts = loadGlobalScriptFiles("pre-request", tmpDir);
      expect(scripts).toHaveLength(2);
      expect(scripts[0]).toContain("first");
      expect(scripts[1]).toContain("second");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("catches script errors without throwing", () => {
    const context = {
      request: { url: "/api/users", method: "GET", headers: {} as Record<string, string>, body: "" },
      env: {},
    };

    const result = runScript("throw new Error('script failed');", context);

    expect(result.error).toBeDefined();
    expect(result.error).toContain("script failed");
  });
});
