# Security

Agent Session Prune is conservative by design. `audit` is read-only; configuration and credential paths are never deletion candidates. Archive and prune require explicit commands, and prune requires `--yes` plus a prior archive unless the noisy `--no-backup` escape hatch is supplied. Symlinks are skipped and archive manifests are checksum-verified.

Report security issues privately through GitHub security advisories. Do not attach session contents.
