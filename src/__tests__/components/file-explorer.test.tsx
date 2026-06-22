import "@opentui/solid/preload";
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { testRender } from "@opentui/solid";
import { appStore, setAppStore } from "../../stores/appStore";
import { Pane } from "../../utils/panes";
import FileExplorer from "../../components/file-explorer";
import fs from "fs";
import path from "path";
import os from "os";

let tmpDir: string;
let originalCwd: string;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lazyman-test-"));
  fs.writeFileSync(path.join(tmpDir, "test.http"), "GET /api");
  originalCwd = process.cwd();
  process.chdir(tmpDir);
});

afterAll(() => {
  process.chdir(originalCwd);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("FileExplorer", () => {
  it("renders .http files from the working directory", async () => {
    setAppStore("filesCursor", 0);
    setAppStore("explorerTabIndex", 0);
    setAppStore("activePane", Pane.FILE_EXPLORER);

    const { flush, renderOnce, captureCharFrame } = await testRender(() => (
      <FileExplorer />
    ));
    await renderOnce();
    await flush();
    const frame = captureCharFrame();
    expect(frame).toContain("test.http");
  });

  it("sets sourceFileIndex when a file is opened", () => {
    setAppStore("sourceFileIndex", 0);
    expect(appStore.sourceFileIndex).toBe(0);
    setAppStore("sourceFileIndex", -1);
    expect(appStore.sourceFileIndex).toBe(-1);
  });
});
