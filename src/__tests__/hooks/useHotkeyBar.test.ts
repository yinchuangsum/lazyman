import { describe, it, expect } from "bun:test";
import { appStore, setAppStore } from "../../stores/appStore";
import { Pane } from "../../utils/panes";

describe("useHotkeyBar", () => {
  it("sets hotkeyBarItems when called with items for the active pane", () => {
    setAppStore("activePane", Pane.REQUEST_LIST);
    setAppStore("hotkeyBarItems", [
      { key: "j/k", label: "Navigate" },
      { key: "Enter", label: "Select" },
    ]);

    expect(appStore.hotkeyBarItems).toHaveLength(2);
    expect(appStore.hotkeyBarItems[0].key).toBe("j/k");
    expect(appStore.hotkeyBarItems[1].label).toBe("Select");
  });

  it("clears hotkeyBarItems when set to empty array", () => {
    setAppStore("hotkeyBarItems", []);
    expect(appStore.hotkeyBarItems).toEqual([]);
  });
});
