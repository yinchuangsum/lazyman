import { describe, it, expect } from "bun:test";
import { loadEnv } from "../../utils/env-loader";

describe("loadEnv", () => {
  it("returns {} when environment file does not exist", () => {
    const result = loadEnv("nonexistent_env_name");
    expect(result).toEqual({});
  });

  it("returns {} when the named environment does not exist", () => {
    const result = loadEnv("__nonexistent_env_xyz__");
    expect(result).toEqual({});
  });
});
