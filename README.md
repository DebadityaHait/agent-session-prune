# Agent Session Prune

[![npm version](https://img.shields.io/npm/v/agent-session-prune?logo=npm)](https://www.npmjs.com/package/agent-session-prune)
[![CI](https://github.com/DebadityaHait/agent-session-prune/actions/workflows/ci.yml/badge.svg)](https://github.com/DebadityaHait/agent-session-prune/actions/workflows/ci.yml)
[![Node.js](https://img.shields.io/node/v/agent-session-prune)](https://nodejs.org/)
[![License](https://img.shields.io/npm/l/agent-session-prune)](./LICENSE)

Inspect, archive, and reclaim file-based coding-agent state without treating transcripts like disposable cache. Agent Session Prune inventories known Claude Code and Codex storage, explains why each file is protected or eligible, creates a checksum-verified archive, and only deletes after an explicit confirmation.

## Why this exists

Session storage grows quietly, while provider CLIs do not expose one consistent cleanup workflow. The [Claude Code cleanup request](https://github.com/anthropics/claude-code/issues/35036) specifically calls for list, archive, and delete operations. [ccusage](https://github.com/ccusage/ccusage) is excellent for token and cost reporting, and [claude-sessions](https://github.com/hex/claude-sessions) is a full session manager. This package has a narrower responsibility: storage inventory and reversible housekeeping, with no transcript analytics and no provider process supervision.

## Install

```bash
npm install --save-dev agent-session-prune
```

Or run it without adding a dependency:

```bash
npx agent-session-prune audit
```

Node.js 20 or newer is required.

## Review, archive, then prune

Start with a read-only inventory:

```bash
npx agent-session-prune audit
npx agent-session-prune audit --json > agent-session-inventory.json
```

Preview and create an archive for files older than a chosen threshold:

```bash
npx agent-session-prune archive --older-than 30d --dry-run
npx agent-session-prune archive --older-than 30d --yes
```

The archive contains a manifest, original paths, sizes, and SHA-256 checksums. Originals remain untouched. A normal prune creates that archive before deleting candidates:

```bash
npx agent-session-prune prune --older-than 30d --yes
```

If storage pressure leaves no room for an archive, an explicit `--no-backup --yes` is required. Restore by archive ID:

```bash
npx agent-session-prune restore <archive-id> --yes
```

Example audit output:

```text
Agent Session Prune

Files inspected: 184
Storage inspected: 1.7 GB

claude       1.2 GB
codex        512.0 MB

Archive candidates: 640.0 MB
Protected:          1.1 GB

Audit is read-only; no files were deleted.
```

## What is protected

| Storage | Classification | Default action |
| --- | --- | --- |
| Claude project `.jsonl`, Claude todos, Codex sessions | `session` | candidate only after the safety window |
| Claude debug and Codex logs | `debug` | candidate only after the safety window |
| Claude file history and snapshots | `file-history` | candidate only after the safety window |
| temporary/output folders | `temp` | candidate only after the safety window |
| settings, credentials, `.env`, token-like files | `configuration` / `credential` | never a candidate |
| unrecognized files | `unknown` | never a candidate |
| symbolic links | — | never followed or deleted |

“Candidate” is not a command to delete. A candidate must also be unchanged since the audit; size or modification-time drift causes it to be skipped.

## Retention and pins

Create a project-local `.agent-prune.json`:

```json
{
  "pins": ["important-project", "session-id-to-keep"],
  "keepLast": 10,
  "youngerThanDays": 7
}
```

`keepLast` preserves the newest session files per provider. `youngerThanDays` raises the minimum age. Pin a path or identifier from the command line:

```bash
npx agent-session-prune pin important-project
```

Use `--root` for the project containing configuration, archives, and pins. Use `--state-root` to inspect a fixture, redirected profile, or copied provider state:

```bash
npx agent-session-prune audit --state-root ./test-fixture --json
```

## Commands

```text
agent-prune audit [--root path] [--state-root path] [--json]
agent-prune archive --older-than 30d [--root path] [--state-root path] [--dry-run|--yes]
agent-prune prune --older-than 30d [--root path] [--state-root path] --yes [--no-backup]
agent-prune restore <archive-id> [--root path] --yes
agent-prune pin <path-or-session-id> [--root path]
```

## Scope and limitations

- The inventory covers documented, file-based Claude Code and Codex roots; it does not claim to understand every provider cache or future format.
- The tool reads metadata and copies bytes. It does not parse transcript content, calculate token cost, start an agent, or supervise a running session.
- A restored file is byte-for-byte verified, but a provider may need to restart before it notices restored state.
- Disk free-space thresholds are retained in the config schema for future policy integrations; they do not trigger deletion automatically.

## Contributing

```bash
npm install
npm run lint
npm test
npm run test:cli
```

Issues and pull requests are welcome in the [GitHub repository](https://github.com/DebadityaHait/agent-session-prune).

## License

MIT © Debaditya Hait
