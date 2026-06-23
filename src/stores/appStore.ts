import { createStore } from "solid-js/store";
import type { ParsedRequest, ResponseData, AssertionResult, HistoryEntry, HotkeyItem } from "../types";
import { Pane } from "../utils/panes";

export type AppState = {
  activePane: Pane;
  selectedEnv: string;
  showEnvModal: boolean;
  showHelpModal: boolean;
  envFiles: string[];
  parsedRequests: ParsedRequest[];
  selectedRequestIndex: number;
  parsedRequestIndex: number;
  sourceFileIndex: number;
  explorerTabIndex: number;
  filesCursor: number;
  historyCursor: number;
  response: ResponseData | null;
  assertionResults: AssertionResult[];
  historyEntries: HistoryEntry[];
  responseTreeCursor: number;
  responseTreeExpanded: Record<string, boolean>;
  error: string | null;
  diffTarget: ResponseData | null;
  hotkeyBarItems: HotkeyItem[];
  consumeEnter: boolean;
  searchQuery: string;
  showSearch: boolean;
  activeFilters: Partial<Record<Pane, string>>;
};

export const [appStore, setAppStore] = createStore<AppState>({
  activePane: Pane.FILE_EXPLORER,
  selectedEnv: "dev",
  showEnvModal: false,
  showHelpModal: false,
  envFiles: [],
  parsedRequests: [],
  selectedRequestIndex: 0,
  parsedRequestIndex: 0,
  sourceFileIndex: -1,
  explorerTabIndex: 0,
  filesCursor: 0,
  historyCursor: 0,
  response: null,
  assertionResults: [],
  historyEntries: [],
  responseTreeCursor: 0,
  responseTreeExpanded: {},
  error: null,
  diffTarget: null,
  hotkeyBarItems: [],
  consumeEnter: false,
  searchQuery: "",
  showSearch: false,
  activeFilters: {},
});
