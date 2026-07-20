# relay-plugins

Claude Code and Codex plugin marketplace for [Relay](https://github.com/jacobpowaza/Relay),
a local-first desktop workboard for AI-assisted development.

Both plugins connect an agent session to a linked Relay board: resume status,
create boards, and checkpoint meaningful progress into the local Relay
desktop workspace. Neither plugin talks to a hosted service; all state is
read from and written to the user's local Relay app data directory.

## Claude Code

```bash
claude plugin marketplace add jacobpowaza/relay-plugins
claude plugin install relay@relay-plugins
```

Manifest: [`.claude-plugin/plugin.json`](.claude-plugin/plugin.json)
Catalog: [`.claude-plugin/marketplace.json`](.claude-plugin/marketplace.json)

## Codex

```bash
codex plugin marketplace add jacobpowaza/relay-plugins
codex plugin add relay@relay-plugins
```

Manifest: [`codex/.codex-plugin/plugin.json`](codex/.codex-plugin/plugin.json)
Catalog: [`.agents/plugins/marketplace.json`](.agents/plugins/marketplace.json)

## Usage

Once installed, Relay appears in your agent as:

| Agent | Indicator | Actions |
|---|---|---|
| Claude Code | `[RELAY]` in startup message or footer | `/relay-progress` commands, auto-checkpoint on session end |
| Codex | `@Relay` slash command | `/relay status`, `/relay resume`, `/relay checkpoint`, `/relay create-board` |

Both integrations are **disabled by default**. Enable them from Relay's
Settings > Integrations after installing.

### Status Line (Claude Code)

To keep the Relay indicator in Claude Code's footer on every turn:

```bash
node scripts/install-statusline.mjs
```

This registers a `statusLine` entry in `~/.claude/settings.json`. If another
status line is already configured (e.g. Caveman), it composes both without
overwriting. Run with `--force` to replace.

## What's included

- Session-start hook that loads Relay status for the linked project.
- Post-tool-use and pre-compact hooks that surface checkpoint reminders.
- Session-end hook that records a handoff checkpoint (uses vendored core API).
- A `progress` skill/slash command for status, resume, and checkpoint flows.
- A Codex MCP server (`relay_status`, `relay_resume` tools) with stdio JSON-RPC.
- A persistent status line script for Claude Code's footer.
- **Vendored integration core** (`core/`) — pre-built JavaScript from `@relay/integration-core` so plugins are self-contained with no build step.

## Troubleshooting

| Problem | Solution |
|---|---|
| Plugin not discovered by Claude Code | Restart the Claude Code session. Verify plugin files exist in `~/.claude/plugins/marketplaces/relay-local/` or the cache directory. |
| `[RELAY] Inactive` on startup | The repo isn't linked. Run `/relay-progress create-board "My Board"` from Claude Code. |
| `[RELAY] Error` | The linked board was removed. Re-link from Relay's board settings. |
| Status line not showing | Run `node scripts/install-statusline.mjs` and restart the session. |
| MCP not working (Codex) | Verify `~/.codex/plugins/cache/relay-local/relay/0.2.0/mcp/relay-mcp.mjs` exists and `codex/hooks.json` references the correct paths. |

## Relationship to the Relay app repository

This repository vendors the plugin implementation from
[`jacobpowaza/Relay`](https://github.com/jacobpowaza/Relay)'s
`integrations/` directory so that installing a plugin does not require
cloning the full Relay monorepo. The Relay app repository remains the source
of truth for the `relay-progress` data model and board schema.

To deploy the latest plugin code after pulling Relay updates:

```bash
node integrations/scripts/sync-plugins.mjs
```

This builds `@relay/integration-core`, vendors it into each plugin, then
performs a full replacement of installed plugin files.

## License

AGPL-3.0. See [LICENSE](LICENSE).
