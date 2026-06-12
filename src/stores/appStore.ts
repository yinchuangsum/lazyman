import { createStore } from "solid-js/store";
import type { ParsedRequest, ResponseData, AssertionResult, HistoryEntry } from "../types";
import { Pane } from "../utils/panes";

export type AppState = {
  activePane: Pane;
  selectedEnv: string;
  showEnvModal: boolean;
  envFiles: string[];
  parsedRequests: ParsedRequest[];
  selectedRequestIndex: number;
  response: ResponseData | null;
  assertionResults: AssertionResult[];
  historyEntries: HistoryEntry[];
  responseTreeCursor: number;
  responseTreeExpanded: Record<string, boolean>;
  error: string | null;
  diffTarget: ResponseData | null;
};

export const [appStore, setAppStore] = createStore<AppState>({
  activePane: Pane.FILE_EXPLORER,
  selectedEnv: "dev",
  showEnvModal: false,
  envFiles: [],
  parsedRequests: [],
  selectedRequestIndex: 0,
  response: null,
  assertionResults: [],
  historyEntries: [],
  responseTreeCursor: 0,
  responseTreeExpanded: {},
  error: null,
  diffTarget: null,
});
