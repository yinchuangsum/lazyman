import type { Assertion, AssertionResult, ResponseData } from "../types";

export function parseAssertion(line: string): Assertion | null {
  const trimmed = line.replace(/^(#|\/\/)\s*/, "");
  const match = trimmed.match(/^@assert\s+(.+?)\s+(==|!=|>|<|contains)\s+(.+)$/);
  if (!match) return null;
  return {
    target: match[1].trim(),
    operator: match[2] as Assertion["operator"],
    expected: match[3].trim(),
  };
}

export function evaluateAssertions(
  assertions: Assertion[],
  response: ResponseData,
): AssertionResult[] {
  return assertions.map((a) => evaluateOne(a, response));
}

function evaluateOne(assertion: Assertion, response: ResponseData): AssertionResult {
  try {
    const actual = resolveTarget(assertion.target, response);
    const passed = compare(actual, assertion.operator, assertion.expected);
    return { assertion, passed, actual };
  } catch (err) {
    return { assertion, passed: false, actual: "", error: String(err) };
  }
}

function resolveTarget(target: string, response: ResponseData): string {
  if (target === "status") return String(response.status);
  if (target.startsWith("headers.")) {
    const key = target.slice("headers.".length);
    return response.headers[key.toLowerCase()] ?? "";
  }
  if (target.startsWith("body.") || target.startsWith("body[")) {
    const path = target.startsWith("body.") ? target.slice(5) : target.slice(4);
    const val = resolveJsonPath(JSON.parse(response.body), path);
    return val === undefined ? "" : JSON.stringify(val);
  }
  throw new Error(`unknown assertion target: ${target}`);
}

function resolveJsonPath(obj: unknown, path: string): unknown {
  const parts = path.split(/(?<=.)\.(?=[^.])/);
  let current: unknown = obj;
  for (const part of parts) {
    const key = part.replace(/\[(\d+)\]/g, (_, idx) => `[${idx}]`);
    if (key.includes("[") && key.includes("]")) {
      const arrMatch = key.match(/^(.+?)\[(\d+)\]$/);
      if (arrMatch) {
        current = (current as Record<string, unknown>)?.[arrMatch[1]];
        current = (current as unknown[])?.[Number(arrMatch[2])];
      } else {
        const idxMatch = key.match(/^\[(\d+)\]$/);
        if (idxMatch) {
          current = (current as unknown[])?.[Number(idxMatch[1])];
        }
      }
    } else {
      current = (current as Record<string, unknown>)?.[key];
    }
    if (current === undefined) return undefined;
  }
  return current;
}

function compare(actual: string, operator: string, expected: string): boolean {
  const aNum = Number(actual);
  const eNum = Number(expected);
  const bothNumeric = !isNaN(aNum) && !isNaN(eNum);

  switch (operator) {
    case "==": return bothNumeric ? aNum === eNum : actual === expected;
    case "!=": return bothNumeric ? aNum !== eNum : actual !== expected;
    case ">": return bothNumeric ? aNum > eNum : actual > expected;
    case "<": return bothNumeric ? aNum < eNum : actual < expected;
    case "contains": return actual.includes(expected);
    default: return false;
  }
}
