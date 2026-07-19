# relay-plugins

Claude Code and Codex plugin marketplace for [Relay](https://github.com/jacobpowaza/Relay),
a local-first desktop planning system for software work.

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

## What's included

- Session-start hook that loads Relay status for the linked project.
- Post-tool-use and pre-compact hooks that surface checkpoint reminders.
- Session-end hook that records a handoff checkpoint.
- A `progress` skill/slash command for status, resume, and checkpoint flows.
- A Codex MCP server exposing the same `relay-progress` operations.

## Relationship to the Relay app repository

This repository vendors the plugin implementation from
[`jacobpowaza/Relay`](https://github.com/jacobpowaza/Relay)'s
`integrations/claude-code` and `integrations/codex` directories so that
installing a plugin does not require cloning the full Relay monorepo. The
Claude Code and Codex script implementations here are maintained
independently per platform and may drift slightly between releases; the
Relay app repository remains the source of truth for the underlying
`relay-progress` data model and board schema.

## License

AGPL-3.0. See [LICENSE](LICENSE).
