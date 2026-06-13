import "@opentui/solid/preload";
import { describe, it, expect } from "bun:test";
import { testRender } from "@opentui/solid";
import { appStore, setAppStore } from "../../stores/appStore";
import { Pane } from "../../utils/panes";
import RequestList from "../../components/request-list";

describe("RequestList", () => {
  it("shows placeholder when parsedRequests is empty", async () => {
    setAppStore("parsedRequests", []);
    setAppStore("activePane", Pane.REQUEST_LIST);

    const { flush, renderOnce, captureCharFrame } = await testRender(() => (
      <RequestList />
    ));
    await renderOnce();
    await flush();
    const frame = captureCharFrame();
    expect(frame).toContain("No request selected");
  });

  it("renders parsed requests from the store", async () => {
    setAppStore("parsedRequests", [
      { method: "GET", url: "/api/users", httpVersion: "HTTP/1.1", headers: {}, body: "", assertions: [], inlineVars: {}, scripts: [], sourceLine: 1 },
    ]);
    setAppStore("parsedRequestIndex", 0);
    setAppStore("activePane", Pane.REQUEST_LIST);

    const { flush, renderOnce, captureCharFrame } = await testRender(() => (
      <RequestList />
    ));
    await renderOnce();
    await flush();
    const frame = captureCharFrame();
    expect(frame).toContain("GET /api/users");
  });
});
