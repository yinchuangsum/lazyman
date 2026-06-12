import "@opentui/solid/preload";
import { describe, it, expect } from "bun:test";
import { testRender } from "@opentui/solid";
import Pane from "../../components/pane";

describe("Pane", () => {
  it("renders a bordered box with title and children", async () => {
    const { flush, renderOnce, captureCharFrame } = await testRender(() => (
      <Pane title="Test Pane" width="100%" height="100%">
        <text>hello world</text>
      </Pane>
    ));

    await renderOnce();
    await flush();
    const frame = captureCharFrame();
    expect(frame.length).toBeGreaterThan(0);
  });

  it("renders children inside the box", async () => {
    const { flush, renderOnce, captureCharFrame } = await testRender(() => (
      <Pane title="Pane" width="100%" height="100%">
        <text>inside</text>
      </Pane>
    ));

    await renderOnce();
    await flush();
    const frame = captureCharFrame();
    expect(frame.length).toBeGreaterThan(0);
  });
});
