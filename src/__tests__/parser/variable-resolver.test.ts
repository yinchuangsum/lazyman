import { describe, it, expect } from "bun:test";
import { resolveVariables } from "../../parser/variable-resolver";

describe("variable-resolver", () => {
  it("resolves nested dot-path variables from env", () => {
    const result = resolveVariables(
      "{{users.admin.token}}",
      {},
      { users: { admin: { token: "abc" } } },
      {},
    );
    expect(result).toBe("abc");
  });

  it("resolves from inline vars with highest priority", () => {
    const result = resolveVariables(
      "{{key}}",
      { key: "inline" },
      { key: "env" },
      { key: "base" },
    );
    expect(result).toBe("inline");
  });

  it("resolves from active env when not in inline vars", () => {
    const result = resolveVariables(
      "{{key}}",
      {},
      { key: "active" },
      { key: "base" },
    );
    expect(result).toBe("active");
  });

  it("resolves from base env when not in inline or active", () => {
    const result = resolveVariables(
      "{{key}}",
      {},
      {},
      { key: "base" },
    );
    expect(result).toBe("base");
  });

  it("resolves from OS env when not found elsewhere", () => {
    const result = resolveVariables(
      "{{PATH}}",
      {},
      {},
      {},
    );
    expect(result).not.toBe("{{PATH}}");
    expect(result.length).toBeGreaterThan(0);
  });

  it("keeps unresolved variables as-is when not found in any layer", () => {
    const result = resolveVariables(
      "{{missing_var}}",
      {},
      {},
      {},
    );
    expect(result).toBe("{{missing_var}}");
  });

  it("resolves multiple variables in the same string", () => {
    const result = resolveVariables(
      "{{host}}/api/{{version}}/users",
      {},
      { host: "https://example.com", version: "v2" },
      {},
    );
    expect(result).toBe("https://example.com/api/v2/users");
  });
});
