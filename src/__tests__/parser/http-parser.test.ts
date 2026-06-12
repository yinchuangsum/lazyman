import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { parseHttpFile } from "../../parser/http-parser";
import fs from "fs";

describe("http-parser", () => {
  it("parses multiple blocks separated by ###", () => {
    const content = [
      "### Get users",
      "GET /api/users",
      "Authorization: Bearer token1",
      "",
      "### Create user",
      "POST /api/users",
      "Content-Type: application/json",
      "",
      '{"name": "Alice"}',
    ].join("\n");

    const requests = parseHttpFile(content, "api.http");
    expect(requests).toHaveLength(2);

    expect(requests[0].method).toBe("GET");
    expect(requests[0].url).toBe("/api/users");
    expect(requests[0].name).toBe("Get users");
    expect(requests[0].headers["Authorization"]).toBe("Bearer token1");
    expect(requests[0].body).toBe("");

    expect(requests[1].method).toBe("POST");
    expect(requests[1].url).toBe("/api/users");
    expect(requests[1].name).toBe("Create user");
    expect(requests[1].headers["Content-Type"]).toBe("application/json");
    expect(requests[1].body).toBe('{"name": "Alice"}');
  });

  it("parses body content after blank line", () => {
    const content = [
      "POST /api/data",
      "Content-Type: application/json",
      "",
      '{"key": "value"}',
    ].join("\n");

    const requests = parseHttpFile(content, "api.http");
    expect(requests).toHaveLength(1);
    expect(requests[0].body).toBe('{"key": "value"}');
  });

  it("preserves multi-line body content", () => {
    const content = [
      "POST /api/data",
      "Content-Type: application/json",
      "",
      "{",
      '  "key": "value"',
      "}",
    ].join("\n");

    const requests = parseHttpFile(content, "api.http");
    expect(requests).toHaveLength(1);
    expect(requests[0].body).toBe('{\n  "key": "value"\n}');
  });

  it("parses inline variable declarations from # @variable comments", () => {
    const content = [
      "### Get user",
      "# @variable id = 123",
      "GET /api/users/{{id}}",
      "",
    ].join("\n");

    const requests = parseHttpFile(content, "api.http");
    expect(requests).toHaveLength(1);
    expect(requests[0].inlineVars).toEqual({ id: "123" });
  });

  it("injects body from file via < filepath syntax", () => {
    const testBodyPath = import.meta.dirname + "/test-body.txt";
    fs.writeFileSync(testBodyPath, "file content here", "utf-8");
    try {
      const content = [
        "POST /api/upload",
        "Content-Type: text/plain",
        "",
        "< ./test-body.txt",
      ].join("\n");

      const requests = parseHttpFile(content, import.meta.dirname + "/api.http");
      expect(requests).toHaveLength(1);
      expect(requests[0].body).toBe("file content here");
    } finally {
      fs.unlinkSync(testBodyPath);
    }
  });
});
