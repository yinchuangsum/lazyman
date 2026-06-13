import { describe, it, expect } from "bun:test";
import { Pane } from "../../utils/panes";

describe("Pane", () => {
  it("has FILE_EXPLORER at value 0", () => {
    expect(Pane.FILE_EXPLORER).toBe(0);
  });

  it("has REQUEST_LIST at value 1 (renamed from REQUEST_VIEWER)", () => {
    expect(Pane.REQUEST_LIST).toBe(1);
  });

  it("has REQUEST_DETAIL at value 2", () => {
    expect(Pane.REQUEST_DETAIL).toBe(2);
  });

  it("has RESPONSE_VIEWER at value 3", () => {
    expect(Pane.RESPONSE_VIEWER).toBe(3);
  });

  it("has ENV_MODAL at value 4", () => {
    expect(Pane.ENV_MODAL).toBe(4);
  });

  it("has HELP at value 5", () => {
    expect(Pane.HELP).toBe(5);
  });
});
