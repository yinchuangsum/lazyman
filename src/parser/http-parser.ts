import type { ParsedRequest, ScriptRef } from "../types";
import { parseAssertion } from "../engine/assertions";
import path from "path";
import fs from "fs";

export function parseHttpFile(content: string, filePath: string): ParsedRequest[] {
  const lines = content.split("\n");
  const requests: ParsedRequest[] = [];
  const baseDir = path.dirname(filePath);

  let currentBlock: string[] = [];
  let currentName: string | undefined;
  let blockStartLine = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("###")) {
      if (currentBlock.length > 0) {
        const parsed = parseBlockLines(currentBlock, currentName, blockStartLine, baseDir);
        if (parsed) requests.push(parsed);
      }
      currentBlock = [];
      currentName = line.slice(3).trim() || undefined;
      blockStartLine = i + 1;
    } else {
      currentBlock.push(line);
    }
  }

  if (currentBlock.length > 0) {
    const parsed = parseBlockLines(currentBlock, currentName, blockStartLine, baseDir);
    if (parsed) requests.push(parsed);
  }

  return requests;
}

function parseBlockLines(lines: string[], name: string | undefined, startLine: number, baseDir: string): ParsedRequest | null {
  let lineIdx = 0;
  const assertions: ParsedRequest["assertions"] = [];
  const inlineVars: Record<string, string> = {};
  const scripts: ScriptRef[] = [];
  let currentScript: { hook: "pre-request" | "post-response"; lines: string[]; sourceLine: number } | null = null;

  function flushScript() {
    if (currentScript) {
      scripts.push({
        hook: currentScript.hook,
        content: currentScript.lines.join("\n"),
        sourceLine: currentScript.sourceLine,
      });
      currentScript = null;
    }
  }

  function handleCommentLine(line: string, lineNumber: number) {
    const directive = parseScriptDirective(line);
    if (directive) {
      flushScript();
      currentScript = { hook: directive, lines: [], sourceLine: lineNumber + 1 };
      return;
    }

    if (currentScript) {
      const bodyLine = line.replace(/^(?:#|\/\/)\s?/, "");
      currentScript.lines.push(bodyLine);
      return;
    }

    const assert = parseAssertion(line);
    if (assert) assertions.push(assert);
    const inlineVar = parseInlineVar(line);
    if (inlineVar) Object.assign(inlineVars, inlineVar);
  }

  while (lineIdx < lines.length) {
    const line = lines[lineIdx];
    const trimmed = line.trim();
    if (trimmed === "") {
      lineIdx++;
      continue;
    }
    if (line.startsWith("#") || line.startsWith("//")) {
      handleCommentLine(line, lineIdx);
      lineIdx++;
      continue;
    }
    break;
  }
  flushScript();
  if (lineIdx >= lines.length) return null;

  const requestLine = parseRequestLine(lines[lineIdx]);
  if (!requestLine) return null;
  lineIdx++;

  const { method, url, httpVersion } = requestLine;
  const headers: Record<string, string> = {};
  let inHeaders = true;
  let bodyLines: string[] = [];

  for (; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];

    if (line.startsWith("#") || line.startsWith("//")) {
      handleCommentLine(line, lineIdx);
      continue;
    }

    flushScript();

    if (inHeaders) {
      if (line.trim() === "") {
        inHeaders = false;
        continue;
      }
      const colonIdx = line.indexOf(":");
      if (colonIdx > 0) {
        const key = line.slice(0, colonIdx).trim();
        const val = line.slice(colonIdx + 1).trim();
        headers[key] = val;
      }
    } else {
      bodyLines.push(line);
    }
  }

  flushScript();

  let body = bodyLines.join("\n").trim();
  const fileInjectMatch = body.match(/^<\s+(.+)$/);
  if (fileInjectMatch) {
    const resolvedPath = path.resolve(baseDir, fileInjectMatch[1].trim());
    try {
      body = fs.readFileSync(resolvedPath, "utf-8");
    } catch {
      body = `<!-- Error reading file: ${fileInjectMatch[1]} -->`;
    }
  }

  return {
    method,
    url,
    httpVersion,
    headers,
    body,
    name,
    assertions,
    inlineVars,
    scripts,
    sourceLine: startLine,
  };
}

function parseScriptDirective(line: string): "pre-request" | "post-response" | null {
  const trimmed = line.replace(/^(?:#|\/\/)\s*/, "");
  const match = trimmed.match(/^@script\s+(pre-request|post-response)\s*$/);
  return match ? (match[1] as "pre-request" | "post-response") : null;
}

function parseInlineVar(line: string): Record<string, string> | null {
  const trimmed = line.replace(/^(#|\/\/)\s*/, "");
  const match = trimmed.match(/^@variable\s+(\w+)\s*=\s*(.+)$/);
  if (!match) return null;
  return { [match[1]]: match[2].trim() };
}

function parseRequestLine(line: string): { method: string; url: string; httpVersion: string } | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(/\s+/);
  if (parts.length < 2) return null;
  const method = parts[0];
  const url = parts[1];
  const httpVersion = parts.length >= 3 ? parts[2] : "HTTP/1.1";
  return { method, url, httpVersion };
}
