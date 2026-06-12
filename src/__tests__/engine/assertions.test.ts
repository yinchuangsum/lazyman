import { describe, it, expect } from "bun:test";
import { evaluateAssertions, parseAssertion } from "../../engine/assertions";
import type { ResponseData } from "../../types";

function mockResponse(overrides?: Partial<ResponseData>): ResponseData {
  return {
    status: 200,
    statusText: "OK",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ items: [{ id: 1, name: "alice" }], total: 42 }),
    timeMs: 42,
    sizeBytes: 100,
    ...overrides,
  };
}

describe("parseAssertion", () => {
  it("parses a valid assertion from a comment line", () => {
    const result = parseAssertion("# @assert status == 200");
    expect(result).toEqual({ target: "status", operator: "==", expected: "200" });
  });

  it("returns null for non-assertion comment", () => {
    expect(parseAssertion("# this is a comment")).toBeNull();
    expect(parseAssertion("// @notassert")).toBeNull();
    expect(parseAssertion("# @variable name = val")).toBeNull();
  });
});

describe("evaluateAssertions", () => {
  it("passes status == 200 on 200 response", () => {
    const results = evaluateAssertions(
      [{ target: "status", operator: "==", expected: "200" }],
      mockResponse(),
    );
    expect(results[0].passed).toBe(true);
  });

  it("fails status == 200 on 404 response", () => {
    const results = evaluateAssertions(
      [{ target: "status", operator: "==", expected: "200" }],
      mockResponse({ status: 404 }),
    );
    expect(results[0].passed).toBe(false);
  });

  it("evaluates status != 404", () => {
    const results = evaluateAssertions(
      [{ target: "status", operator: "!=", expected: "404" }],
      mockResponse(),
    );
    expect(results[0].passed).toBe(true);
  });

  it("evaluates status > 199 and status < 300", () => {
    const res = mockResponse();
    expect(evaluateAssertions([{ target: "status", operator: ">", expected: "199" }], res)[0].passed).toBe(true);
    expect(evaluateAssertions([{ target: "status", operator: "<", expected: "300" }], res)[0].passed).toBe(true);
    expect(evaluateAssertions([{ target: "status", operator: ">", expected: "300" }], res)[0].passed).toBe(false);
  });

  it("evaluates headers.content-type contains json", () => {
    const results = evaluateAssertions(
      [{ target: "headers.content-type", operator: "contains", expected: "json" }],
      mockResponse(),
    );
    expect(results[0].passed).toBe(true);
  });

  it("fails header assertion on missing header", () => {
    const results = evaluateAssertions(
      [{ target: "headers.x-missing", operator: "==", expected: "value" }],
      mockResponse(),
    );
    expect(results[0].passed).toBe(false);
  });

  it("evaluates body path with dot notation", () => {
    const results = evaluateAssertions(
      [{ target: "body.total", operator: "==", expected: "42" }],
      mockResponse(),
    );
    expect(results[0].passed).toBe(true);
  });

  it("evaluates body path with array index notation", () => {
    const results = evaluateAssertions(
      [{ target: "body.items[0].id", operator: "==", expected: "1" }],
      mockResponse(),
    );
    expect(results[0].passed).toBe(true);
  });

  it("fails body path assertion on non-existent path", () => {
    const results = evaluateAssertions(
      [{ target: "body.nonexistent.key", operator: "==", expected: "value" }],
      mockResponse(),
    );
    expect(results[0].passed).toBe(false);
  });

  it("returns error for malformed target", () => {
    const results = evaluateAssertions(
      [{ target: "invalid_target_format", operator: "==", expected: "x" }],
      mockResponse(),
    );
    expect(results[0].passed).toBe(false);
    expect(results[0].error).toBeDefined();
  });
});
