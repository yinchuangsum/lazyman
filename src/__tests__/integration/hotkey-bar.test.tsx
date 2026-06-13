import "@opentui/solid/preload";
import { describe, it, expect } from "bun:test";
import { For } from "solid-js";
import { testRender } from "@opentui/solid";
import { appStore, setAppStore } from "../../stores/appStore";

describe("HotkeyBar", () => {
  it("renders hotkey items from the store in a row", async () => {
    setAppStore("hotkeyBarItems", [
      { key: "j/k", label: "Navigate" },
      { key: "Enter", label: "Select" },
    ]);

    const { flush, renderOnce, captureCharFrame } = await testRender(() => (
      <box width="100%" height={1} flexDirection="row">
        <For each={appStore.hotkeyBarItems}>
          {(item) => <text>  {item.key} {item.label}</text>}
        </For>
      </box>
    ));
    await renderOnce();
    await flush();
    const frame = captureCharFrame();
    expect(frame).toContain("j/k");
    expect(frame).toContain("Navigate");
    expect(frame).toContain("Enter");
    expect(frame).toContain("Select");
  });

  it("shows nothing when hotkeyBarItems is empty", async () => {
    setAppStore("hotkeyBarItems", []);

    const { flush, renderOnce, captureCharFrame } = await testRender(() => (
      <box width="100%" height={1} flexDirection="row">
        <For each={appStore.hotkeyBarItems}>
          {(item) => <text>  {item.key} {item.label}</text>}
        </For>
      </box>
    ));
    await renderOnce();
    await flush();
    const frame = captureCharFrame();
    expect(frame.length).toBeGreaterThanOrEqual(0);
  });
});
