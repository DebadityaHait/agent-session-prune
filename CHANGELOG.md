# Changelog

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
