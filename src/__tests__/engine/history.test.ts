import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { saveHistoryEntry, loadHistoryEntries, diffResponses } from "../../engine/history";
import type { ResponseData, ResolvedRequest } from "../../types";
import fs from "fs";
import path from "path";

const testDir = import.meta.dirname + "/__history_test__";

beforeEach(() => {
  fs.mkdirSync(testDir, { recursive: true });
});

afterEach(() => {
  fs.rmSync(testDir, { recursive: true, force: true });
});

describe("history", () => {
  it("saves a history entry and loads it back", async () => {
    const request: ResolvedRequest = { method: "GET", url: "/api/users", httpVersion: "HTTP/1.1", headers: {}, body: "" };
    const response: ResponseData = { status: 200, statusText: "OK", headers: {}, body: "ok", timeMs: 10, sizeBytes: 2 };

    const timestamp = new Date().toISOString();
    const entryPath = await saveHistoryEntry(testDir, request, response, timestamp);

    expect(fs.existsSync(entryPath)).toBe(true);
    const entries = loadHistoryEntries(testDir);
    expect(entries).toHaveLength(1);
    expect(entries[0].method).toBe("GET");
    expect(entries[0].url).toBe("/api/users");
    expect(entries[0].response.status).toBe(200);
  });

  it("loads entries sorted newest first", async () => {
    const r: ResolvedRequest = { method: "GET", url: "/api/x", httpVersion: "HTTP/1.1", headers: {}, body: "" };
    const resp: ResponseData = { status: 200, statusText: "OK", headers: {}, body: "", timeMs: 1, sizeBytes: 1 };

    await saveHistoryEntry(testDir, r, resp, "2025-01-01T00:00:00.000Z");
    await saveHistoryEntry(testDir, r, resp, "2025-06-01T00:00:00.000Z");

    const entries = loadHistoryEntries(testDir);
    expect(entries).toHaveLength(2);
    expect(entries[0].timestamp).toBe("2025-06-01T00:00:00.000Z");
    expect(entries[1].timestamp).toBe("2025-01-01T00:00:00.000Z");
  });

  it("diffs two responses", () => {
    const a: ResponseData = { status: 200, statusText: "OK", headers: { "x-version": "1" }, body: "hello", timeMs: 1, sizeBytes: 5 };
    const b: ResponseData = { status: 404, statusText: "Not Found", headers: { "x-version": "2" }, body: "bye", timeMs: 1, sizeBytes: 3 };

    const diff = diffResponses(a, b);
    expect(diff.statusChanged).toBe(true);
    expect(diff.statusBefore).toBe("200 OK");
    expect(diff.statusAfter).toBe("404 Not Found");
    expect(diff.headerDiffs).toHaveLength(1);
    expect(diff.bodyChanged).toBe(true);
  });

  it("returns no diffs for identical responses", () => {
    const a: ResponseData = { status: 200, statusText: "OK", headers: { "x-ver": "1" }, body: "same", timeMs: 1, sizeBytes: 4 };
    const diff = diffResponses(a, a);
    expect(diff.statusChanged).toBe(false);
    expect(diff.headerDiffs).toHaveLength(0);
    expect(diff.bodyChanged).toBe(false);
  });
});
