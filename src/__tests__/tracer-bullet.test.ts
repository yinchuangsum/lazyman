import { describe, it, expect } from "bun:test";
import { parseHttpFile } from "../parser/http-parser";
import { resolveVariables } from "../parser/variable-resolver";
import { evaluateAssertions } from "../engine/assertions";

describe("full pipeline", () => {
  it("parses a .http file, resolves variables, and evaluates assertions", () => {
    const httpContent = [
      "### Get users",
      "GET {{base_url}}/users",
      "Authorization: Bearer {{token}}",
      "",
      "# @assert status == 200",
      "# @assert headers.content-type contains json",
    ].join("\n");

    const requests = parseHttpFile(httpContent, "api.http");
    expect(requests).toHaveLength(1);

    const req = requests[0];
    expect(req.method).toBe("GET");
    expect(req.url).toBe("{{base_url}}/users");
    expect(req.name).toBe("Get users");
    expect(req.assertions).toHaveLength(2);

    const activeEnv = { base_url: "https://api.example.com", token: "abc" };
    const resolvedUrl = resolveVariables(req.url, {}, activeEnv, {});
    expect(resolvedUrl).toBe("https://api.example.com/users");

    const resolvedHeaders: Record<string, string> = {};
    for (const [k, v] of Object.entries(req.headers)) {
      resolvedHeaders[k] = resolveVariables(v, {}, activeEnv, {});
    }
    expect(resolvedHeaders["Authorization"]).toBe("Bearer abc");

    const mockResponse = {
      status: 200,
      statusText: "OK",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: 1 }),
      timeMs: 42,
      sizeBytes: 10,
    };

    const results = evaluateAssertions(req.assertions, mockResponse);
    expect(results).toHaveLength(2);
    expect(results[0].passed).toBe(true);
    expect(results[1].passed).toBe(true);
  });
});
