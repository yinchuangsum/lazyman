import type { ResolvedRequest, ResponseData, HistoryEntry, DiffResult } from "../types";
import fs from "fs";
import path from "path";

export async function saveHistoryEntry(
  baseDir: string,
  request: ResolvedRequest,
  response: ResponseData,
  timestamp?: string,
): Promise<string> {
  const ts = timestamp ?? new Date().toISOString();
  const safeMethod = request.method.toLowerCase();
  const safePath = request.url.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 40);
  const filename = `${ts.replace(/[:.]/g, "-")}_${safeMethod}_${safePath}.json`;

  const historyDir = path.join(baseDir, ".lazyman", "history");
  fs.mkdirSync(historyDir, { recursive: true });

  const entry: HistoryEntry = {
    timestamp: ts,
    method: request.method,
    url: request.url,
    request: {
      method: request.method,
      url: request.url,
      httpVersion: request.httpVersion,
      headers: request.headers,
      body: request.body,
    },
    response,
  };

  const filepath = path.join(historyDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(entry, null, 2));
  return filepath;
}

export function loadHistoryEntries(baseDir: string): HistoryEntry[] {
  const historyDir = path.join(baseDir, ".lazyman", "history");
  if (!fs.existsSync(historyDir)) return [];

  const entries: HistoryEntry[] = [];
  const files = fs.readdirSync(historyDir).filter((f) => f.endsWith(".json"));

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(historyDir, file), "utf-8");
      const entry = JSON.parse(content) as HistoryEntry;
      entries.push(entry);
    } catch {
      // skip malformed files
    }
  }

  entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return entries;
}

export function diffResponses(a: ResponseData, b: ResponseData): DiffResult {
  const headerKeys = new Set([...Object.keys(a.headers), ...Object.keys(b.headers)]);
  const headerDiffs: DiffResult["headerDiffs"] = [];

  for (const key of headerKeys) {
    const vA = a.headers[key] ?? "";
    const vB = b.headers[key] ?? "";
    if (vA !== vB) {
      headerDiffs.push({ key, before: vA, after: vB });
    }
  }

  return {
    statusChanged: a.status !== b.status || a.statusText !== b.statusText,
    statusBefore: `${a.status} ${a.statusText}`,
    statusAfter: `${b.status} ${b.statusText}`,
    headerDiffs,
    bodyChanged: a.body !== b.body,
  };
}
