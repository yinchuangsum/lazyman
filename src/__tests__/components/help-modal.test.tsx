import "@opentui/solid/preload";
import { describe, it, expect } from "bun:test";
import { testRender } from "@opentui/solid";
import { appStore, setAppStore } from "../../stores/appStore";
import HelpModal from "../../components/help-modal";

describe("HelpModal", () => {
  it("renders title and close hint", async () => {
    setAppStore("showHelpModal", true);

    const { flush, renderOnce, captureCharFrame } = await testRender(() => (
      <HelpModal />
    ));
    await renderOnce();
    await flush();
    const frame = captureCharFrame();
    expect(frame).toContain("Keybindings");
    expect(frame).toContain("? or Esc");
  });
});
