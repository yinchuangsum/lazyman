import fs from "fs";
import path from "path";

export function init() {
  const cwd = process.cwd();
  const lazymanDir = path.join(cwd, ".lazyman");

  if (fs.existsSync(lazymanDir)) {
    console.error(".lazyman/ already exists — aborting.");
    process.exit(1);
  }

  fs.mkdirSync(path.join(lazymanDir, "environments"), { recursive: true });
  fs.mkdirSync(path.join(lazymanDir, "history"), { recursive: true });

  fs.writeFileSync(
    path.join(lazymanDir, "config.json"),
    JSON.stringify({ defaultEnv: "dev", timeout: 30000, followRedirects: true, editor: null }, null, 2),
  );

  fs.writeFileSync(
    path.join(lazymanDir, "environments", "base.json"),
    JSON.stringify({ base_url: "https://api.example.com" }, null, 2),
  );

  fs.writeFileSync(
    path.join(lazymanDir, "environments", "dev.json"),
    JSON.stringify({ base_url: "https://dev.api.example.com" }, null, 2),
  );

  const scriptsDir = path.join(cwd, "scripts");
  fs.mkdirSync(scriptsDir, { recursive: true });
  fs.writeFileSync(path.join(scriptsDir, "pre-request.js"), "// request.headers['X-Trace-Id'] = env.trace_id;\n");
  fs.writeFileSync(path.join(scriptsDir, "post-response.js"), "// if (response.body) { /* inspect response */ }\n");

  const exampleHttp = [
    "### Get users",
    "GET {{base_url}}/api/v1/users",
    "Authorization: Bearer {{token}}",
    "",
    "# @assert status == 200",
    "# @assert headers.content-type contains json",
    "",
    "### Create user",
    "POST {{base_url}}/api/v1/users",
    "Content-Type: application/json",
    "",
    '{ "name": "Alice", "email": "alice@example.com" }',
    "",
    "# @assert status == 201",
    "",
  ].join("\n");

  fs.writeFileSync(path.join(cwd, "example.http"), exampleHttp);

  const gitignorePath = path.join(cwd, ".gitignore");
  const gitignoreLines = [".lazyman/history/", ".env"];
  if (fs.existsSync(gitignorePath)) {
    const existing = fs.readFileSync(gitignorePath, "utf-8");
    const newLines = gitignoreLines.filter((l) => !existing.includes(l));
    if (newLines.length > 0) {
      fs.writeFileSync(gitignorePath, existing.trimEnd() + "\n" + newLines.join("\n") + "\n");
    }
  } else {
    fs.writeFileSync(gitignorePath, gitignoreLines.join("\n") + "\n");
  }

  console.log("✅ Lazyman initialized in", cwd);
}
