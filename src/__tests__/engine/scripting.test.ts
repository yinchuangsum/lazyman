import { describe, it, expect } from "bun:test";
import { runScript } from "../../engine/scripting";

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
