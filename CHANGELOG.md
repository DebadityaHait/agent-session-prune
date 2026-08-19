# Changelog

## 0.3.0 - 2026-08-20

- Added Gemini, OpenCode, OpenClaw, Hermes, and Pi storage adapters alongside Claude and Codex.
- Added provider, project, and storage-class filters plus duration parsing for minutes, hours, days, and weeks.
- Added archive listing and checksum verification commands.
- Updated the audit schema and CLI documentation to describe the product as an inventory/archive tool rather than a short demo.

## 0.2.1 - 2026-08-19

- Fixed the published `agent-prune` executable metadata so npm installs the CLI correctly.

## 0.2.0 - 2026-08-19

- Added fixtureable state-root inventory for Claude Code and Codex file storage.
- Correctly classifies Claude JSONL and Codex session files while protecting unknown, configuration, credential, and symlink entries.
- Added `keepLast` and `youngerThanDays` retention controls with explicit reasons in the audit schema.
- Added checksum-verified partial-file archives, verified restore, and archive-before-prune behavior.
- Added regression tests covering candidate selection, protected files, archive integrity, and byte-for-byte restore.

## 0.1.0 - 2026-08-19

- Initial public release.
- Read-only Claude/Codex inventory with safety classes and retention candidates.
- Checksum manifests, archive/restore, pinning, and guarded prune operations.
