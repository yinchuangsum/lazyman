import fs from "fs";
import path from "path";

export function loadEnv(name: string): Record<string, unknown> {
  try {
    const envPath = path.join(process.cwd(), ".lazyman", "environments", `${name}.json`);
    const content = fs.readFileSync(envPath, "utf-8");
    return JSON.parse(content);
  } catch {
    return {};
  }
}
