import "@opentui/solid/preload";
import { describe, it, expect } from "bun:test";
import { testRender } from "@opentui/solid";
import { appStore, setAppStore } from "../../stores/appStore";
import { Pane } from "../../utils/panes";
import RequestDetail from "../../components/request-detail";

describe("RequestDetail", () => {
  it("renders detail lines for the selected request", async () => {
    setAppStore("parsedRequests", [
      {
        method: "POST",
        url: "/api/items",
        httpVersion: "HTTP/1.1",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "test" }),
        assertions: [],
        inlineVars: {},
        scripts: [],
        sourceLine: 1,
      },
    ]);
    setAppStore("parsedRequestIndex", 0);
    setAppStore("activePane", Pane.REQUEST_DETAIL);

    const { flush, renderOnce, captureCharFrame } = await testRender(() => (
      <RequestDetail />
    ));
    await renderOnce();
    await flush();
    const frame = captureCharFrame();
    expect(frame).toContain("POST /api/items");
    expect(frame).toContain("Content-Type: application/json");
    expect(frame).toContain('"name"');
  });

  it("renders nothing when no request is selected", async () => {
    setAppStore("parsedRequests", []);
    setAppStore("activePane", Pane.REQUEST_DETAIL);

    const { flush, renderOnce, captureCharFrame } = await testRender(() => (
      <RequestDetail />
    ));
    await renderOnce();
    await flush();
    const frame = captureCharFrame();
    expect(frame.length).toBeGreaterThan(0);
  });
});
