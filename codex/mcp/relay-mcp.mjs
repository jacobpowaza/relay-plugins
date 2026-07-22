#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadDiscoveryFromWorkspace, searchDiscovery } from "../core/discovery.js";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const progressScript = join(root, "scripts", "relay-progress.mjs");

let buffer = "";

process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  readMessages();
});

function readMessages() {
  while (buffer.length > 0) {
    const headerEnd = buffer.indexOf("\r\n\r\n");
    if (headerEnd !== -1) {
      const header = buffer.slice(0, headerEnd);
      const match = /^Content-Length:\s*(\d+)/im.exec(header);
      if (match === null) {
        buffer = "";
        return;
      }
      const length = Number(match[1]);
      const start = headerEnd + 4;
      if (buffer.length < start + length) return;
      const body = buffer.slice(start, start + length);
      buffer = buffer.slice(start + length);
      handleBody(body);
      continue;
    }

    const newline = buffer.indexOf("\n");
    if (newline === -1) return;
    const line = buffer.slice(0, newline).trim();
    buffer = buffer.slice(newline + 1);
    if (line !== "") handleBody(line);
  }
}

function handleBody(body) {
  let message;
  try {
    message = JSON.parse(body);
  } catch {
    return;
  }
  if (message.id === undefined) return;

  try {
    if (message.method === "initialize") {
      respond(message.id, {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "relay-codex", version: "0.1.0" },
      });
      return;
    }

    if (message.method === "tools/list") {
      respond(message.id, {
        tools: [
          {
            name: "relay_status",
            description: "Return Relay plugin status, repository identity, linked board summary, and the visible [RELAY] state.",
            inputSchema: {
              type: "object",
              properties: { cwd: { type: "string", description: "Working directory to inspect." } },
            },
          },
          {
            name: "relay_resume",
            description: "Return a bounded resume packet for the linked Relay board in the current repository.",
            inputSchema: {
              type: "object",
              properties: { cwd: { type: "string", description: "Working directory to resume." } },
            },
          },
          {
            name: "relay_create_board",
            description: "Create or resume a Relay board for the current user task, including an initial phase plan and cards. Use when Relay is invoked for a concrete implementation task.",
            inputSchema: {
              type: "object",
              properties: {
                cwd: { type: "string", description: "Repository working directory." },
                title: { type: "string", description: "Short board title." },
                request: { type: "string", description: "The complete user request used to create the plan and initial cards." },
              },
              required: ["title", "request"],
            },
          },
          {
            name: "relay_discovery_search",
            description: "Search Relay's persistent codebase index for files, responsibilities, exports, dependencies, and related files. Use before broad file exploration when Discovery is available.",
            inputSchema: {
              type: "object",
              properties: {
                cwd: { type: "string", description: "Repository working directory." },
                query: { type: "string", description: "Feature, symbol, file, or implementation question to look up." },
                limit: { type: "number", description: "Maximum results (default 8, maximum 20)." },
              },
              required: ["query"],
            },
          },
        ],
      });
      return;
    }

    if (message.method === "tools/call") {
      const name = message.params?.name;
      const args = message.params?.arguments ?? {};
      const cwd = typeof args.cwd === "string" ? args.cwd : process.cwd();
      if (name === "relay_discovery_search") {
        const query = typeof args.query === "string" ? args.query.trim() : "";
        if (query === "") throw new Error("A Discovery search query is required.");
        const discovery = loadDiscoveryFromWorkspace(join(homedir(), "Library/Application Support/Relay/relay-data/workspace.json"), repositoryRoot(cwd));
        if (discovery === null) throw new Error("No Relay Discovery index exists for this repository. Run Project Discovery first.");
        const limit = typeof args.limit === "number" ? Math.max(1, Math.min(20, Math.floor(args.limit))) : 8;
        const entries = searchDiscovery(discovery.entries, query, limit);
        const output = JSON.stringify({ query, indexedFiles: discovery.discoveryCount, results: entries }, null, 2);
        respond(message.id, { content: [{ type: "text", text: output }] });
        return;
      }
      const command = name === "relay_resume" ? "resume" : name === "relay_status" ? "status" : name === "relay_create_board" ? "create-board" : undefined;
      if (command === undefined) throw new Error(`Unknown Relay tool: ${String(name)}`);
      const progressArgs = name === "relay_create_board"
        ? ["--title", String(args.title ?? "Relay task")]
        : [];
      const input = name === "relay_create_board" ? String(args.request ?? "") : undefined;
      const output = runProgress(command, cwd, progressArgs, input);
      respond(message.id, { content: [{ type: "text", text: output }] });
      return;
    }

    respond(message.id, {});
  } catch (error) {
    respond(message.id, {
      content: [{ type: "text", text: error instanceof Error ? error.message : "Relay MCP command failed." }],
      isError: true,
    });
  }
}

function runProgress(command, cwd, args = [], input) {
  return execFileSync(process.execPath, [progressScript, command, "--cwd", cwd, ...args], {
    cwd,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
    input,
    timeout: 5_000,
  }).trim();
}

function repositoryRoot(cwd) {
  try {
    return execFileSync("git", ["rev-parse", "--show-toplevel"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 1_500,
    }).trim();
  } catch {
    return cwd;
  }
}

function respond(id, result) {
  const body = JSON.stringify({ jsonrpc: "2.0", id, result });
  process.stdout.write(`Content-Length: ${Buffer.byteLength(body, "utf8")}\r\n\r\n${body}`);
}
