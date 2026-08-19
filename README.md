# Agent Session Prune

[![npm version](https://img.shields.io/npm/v/agent-session-prune?logo=npm)](https://www.npmjs.com/package/agent-session-prune)
[![CI](https://github.com/DebadityaHait/agent-session-prune/actions/workflows/ci.yml/badge.svg)](https://github.com/DebadityaHait/agent-session-prune/actions/workflows/ci.yml)
[![Node.js](https://img.shields.io/node/v/agent-session-prune)](https://nodejs.org/)
[![License](https://img.shields.io/npm/l/agent-session-prune)](./LICENSE)

Inventory, filter, archive, verify, restore, and reclaim local coding-agent state. The tool treats transcripts as valuable records: every candidate has a reason, protected classes are excluded, archives are checksum-verified, and deletion requires explicit confirmation.

## Product boundary

[ccusage](https://github.com/ccusage/ccusage) focuses on token and cost analytics. [claude-sessions](https://github.com/hex/claude-sessions), [cc9s](https://github.com/kincoy/cc9s), and [Session Manager](https://github.com/CatheadOwl/session-manager) focus on browsing, searching, and interactive session management. [GitHub Copilot’s session commands](https://docs.github.com/en/copilot/concepts/agents/copilot-cli/chronicle) provide provider-native deletion and pruning. Agent Session Prune is the provider-neutral storage lifecycle layer: metadata inventory, retention policy, reversible archive, integrity verification, and safe cleanup.

## Supported storage

| Provider | Default roots |
| --- | --- |
| Claude Code | `~/.claude/projects`, `debug`, `file-history`, `todos` |
| Codex CLI | `~/.codex/sessions`, `logs`, `tmp` |
| Gemini CLI | `~/.gemini/tmp`, `sessions` |
| OpenCode | `~/.local/share/opencode/storage`, `~/.opencode/storage` |
| OpenClaw | `~/.openclaw/agents` |
| Hermes | `~/.config/hermes/sessions` |
| Pi | `~/.pi/agent/sessions` |

The scanner reads metadata and never parses or prints transcript content.

## Install

```bash
npm install --save-dev agent-session-prune
npx agent-prune --help
```

Node.js 20 or newer is required.

## Inspect and filter

```bash
npx agent-prune audit
npx agent-prune audit --agent claude,codex --project my-repo
npx agent-prune audit --class session --older-than 30d --json > session-inventory.json
```

Durations accept minutes (`90m`), hours (`12h`), days (`30d`), and weeks (`2w`). The JSON report includes roots, item paths, storage class, age, bytes, protection status, and a stable item ID.

## Archive lifecycle

```bash
# Preview candidates; no files are written
npx agent-prune archive --older-than 30d --dry-run

# Copy candidates into a manifest with SHA-256 checksums
npx agent-prune archive --older-than 30d --yes
npx agent-prune archive list
npx agent-prune archive verify <archive-id>

# Restore original bytes and paths after verification
npx agent-prune restore <archive-id> --yes
```

Archive never removes the original. A normal prune creates an archive first:

```bash
npx agent-prune prune --older-than 30d --yes
```

`--no-backup --yes` is an explicit opt-out for emergency disk pressure. Files changed after inventory are skipped rather than overwritten or deleted.

## Protection model

| Class | Examples | Default |
| --- | --- | --- |
| `session` | JSONL transcripts and provider sessions | candidate after retention window |
| `debug` | debug traces and logs | candidate after retention window |
| `file-history` | snapshots and file history | candidate after retention window |
| `temp` | temporary/output files | candidate after retention window |
| `configuration` / `credential` | settings, `.env`, token-shaped files | never a candidate |
| `unknown` | unrecognized data | never a candidate |
| symlink | symbolic links | never followed |

Configure retention in `.agent-prune.json`:

```json
{
  "pins": ["important-project", "session-id-to-keep"],
  "keepLast": 10,
  "youngerThanDays": 7
}
```

`keepLast` preserves the newest sessions per provider. `youngerThanDays` raises the minimum age. Use `--root` for the directory containing pins and archives, and `--state-root` for a redirected profile or test fixture.

## Commands

```text
agent-prune audit [--agent ids] [--project name] [--class class] [--root path] [--state-root path] [--json]
agent-prune archive [list|verify <id>] --older-than 30d [--root path] [--state-root path] [--dry-run|--yes]
agent-prune prune --older-than 30d [--root path] [--state-root path] --yes [--no-backup]
agent-prune restore <archive-id> [--root path] --yes
agent-prune pin <path-or-session-id> [--root path]
```

## Safety and limits

- audit is read-only;
- archive copies through a temporary file, verifies SHA-256, then renames atomically;
- restore verifies the archive before replacing a target;
- unknown, credential, configuration, recent, pinned, modified, and symlink entries are protected;
- provider formats can change, so adapter coverage is conservative and metadata-only.

## Development

```bash
npm install
npm run lint
npm test
npm run test:cli
npm pack --dry-run
```

Issues and pull requests are welcome in the [GitHub repository](https://github.com/DebadityaHait/agent-session-prune).

## License

MIT © Debaditya Hait
