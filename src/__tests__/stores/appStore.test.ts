import { describe, it, expect } from "bun:test";
import { Pane } from "../../utils/panes";
import { appStore, setAppStore } from "../../stores/appStore";

describe("appStore defaults", () => {
  it("starts with showHelpModal false", () => {
    expect(appStore.showHelpModal).toBe(false);
  });

  it("starts with sourceFileIndex -1", () => {
    expect(appStore.sourceFileIndex).toBe(-1);
  });

  it("starts with hotkeyBarItems empty", () => {
    expect(appStore.hotkeyBarItems).toEqual([]);
  });

  it("starts with activePane FILE_EXPLORER", () => {
    expect(appStore.activePane).toBe(Pane.FILE_EXPLORER);
  });

  it("starts with consumeEnter false", () => {
    expect(appStore.consumeEnter).toBe(false);
  });

  it("consumeEnter is settable to true", () => {
    setAppStore("consumeEnter", true);
    expect(appStore.consumeEnter).toBe(true);
    setAppStore("consumeEnter", false);
    expect(appStore.consumeEnter).toBe(false);
  });
});
