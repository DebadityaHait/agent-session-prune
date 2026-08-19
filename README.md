# Agent Session Prune

[![npm version](https://img.shields.io/npm/v/agent-session-prune?logo=npm)](https://www.npmjs.com/package/agent-session-prune)
[![npm downloads](https://img.shields.io/npm/dm/agent-session-prune?logo=npm)](https://www.npmjs.com/package/agent-session-prune)
[![CI](https://github.com/DebadityaHait/agent-session-prune/actions/workflows/ci.yml/badge.svg)](https://github.com/DebadityaHait/agent-session-prune/actions/workflows/ci.yml)
[![Node.js](https://img.shields.io/node/v/agent-session-prune)](https://nodejs.org/)
[![License](https://img.shields.io/npm/l/agent-session-prune)](./LICENSE)

Find, archive, and safely reclaim coding-agent session storage. Agent Session Prune attributes known Claude Code and Codex state by provider and age, protects configuration and credentials, and never deletes anything on its first run.

## 10-second audit

```bash
npx agent-session-prune audit
npx agent-session-prune audit --json
```

The audit is read-only. It reports bytes by class, old-session candidates, protected files, and symlinks skipped. It does not parse or print transcript contents.

## Safe workflow

```bash
# Preview files older than 30 days
npx agent-session-prune archive --older-than 30d --dry-run

# Create a checksum-verified archive (no deletion)
npx agent-session-prune archive --older-than 30d --yes

# Only after reviewing the plan and archive
npx agent-session-prune prune --older-than 30d --yes

# Restore an archive by its manifest id
npx agent-session-prune restore <archive-id> --yes
```

`prune` refuses to act without `--yes` and a prior archive. `--no-backup` is intentionally noisy and still requires `--yes`. Files modified inside the safety window, active-looking files, symlinks, configuration, credentials, and unknown classes are protected.

## Retention and pins

`pin <path-or-session-id>` writes `.agent-prune.json` with protected entries. The file can also set `keepLast`, `youngerThan`, and `minFreeDisk`; pins always win over retention.

## Scope and limitations

The first release inventories file-based Claude Code and Codex roots. Cursor state is not treated as deletable session data. Provider session formats and resumability vary; an archive restores original bytes and paths, but a provider may require a restart before it sees them. This is a storage safety tool, not a generic disk cleaner.

## License

MIT © Debaditya Hait
