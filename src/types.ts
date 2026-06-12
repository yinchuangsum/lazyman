export type HttpMethod = string;

export interface ParsedRequest {
  method: string;
  url: string;
  httpVersion: string;
  headers: Record<string, string>;
  body: string;
  name?: string;
  assertions: Assertion[];
  inlineVars: Record<string, string>;
  sourceLine: number;
}

export interface ParsedFile {
  filePath: string;
  requests: ParsedRequest[];
}

export interface Assertion {
  operator: "==" | "!=" | ">" | "<" | "contains";
  target: string;
  expected: string;
}

export interface AssertionResult {
  assertion: Assertion;
  passed: boolean;
  actual: string;
  error?: string;
}

export interface ResolvedRequest {
  method: string;
  url: string;
  httpVersion: string;
  headers: Record<string, string>;
  body: string;
}

export interface ResponseData {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  timeMs: number;
  sizeBytes: number;
  error?: string;
}

export interface HistoryEntry {
  timestamp: string;
  method: string;
  url: string;
  request: {
    method: string;
    url: string;
    httpVersion: string;
    headers: Record<string, string>;
    body: string;
  };
  response: ResponseData;
}

export interface ScriptContext {
  request: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body: string;
  };
  response?: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: string;
  };
  env: Record<string, string>;
}

export interface DiffResult {
  statusChanged: boolean;
  statusBefore: string;
  statusAfter: string;
  headerDiffs: { key: string; before: string; after: string }[];
  bodyChanged: boolean;
}

export type Pane = "FILE_EXPLORER" | "REQUEST_VIEWER" | "RESPONSE_VIEWER" | "ENV_MODAL";
