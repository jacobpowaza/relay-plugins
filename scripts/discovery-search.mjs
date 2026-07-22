#!/usr/bin/env node
/** Search the persisted Discovery index without reopening the repository. */
import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import { loadDiscoveryFromWorkspace, searchDiscovery } from "../core/discovery.js";

const queryIndex = process.argv.indexOf("--query");
const query = queryIndex === -1 ? "" : (process.argv[queryIndex + 1] ?? "").trim();
const cwdIndex = process.argv.indexOf("--cwd");
const cwd = cwdIndex === -1 ? process.cwd() : (process.argv[cwdIndex + 1] ?? process.cwd());

if (query === "") {
  console.error("Usage: discovery-search.mjs --query <feature, symbol, or question> [--cwd <directory>]");
  process.exit(1);
}

let repoRoot = cwd;
try {
  repoRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    timeout: 1_500,
  }).trim();
} catch {}

const workspace = join(homedir(), "Library/Application Support/Relay/relay-data/workspace.json");
const discovery = loadDiscoveryFromWorkspace(workspace, repoRoot);
if (discovery === null) {
  console.error("No Relay Discovery index exists for this repository. Run Project Discovery first.");
  process.exit(1);
}

console.log(JSON.stringify({
  query,
  indexedFiles: discovery.discoveryCount,
  results: searchDiscovery(discovery.entries, query),
}, null, 2));
