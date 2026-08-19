#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { audit, loadConfig, saveConfig } from "./inventory.js";
import { createArchive, restore } from "./archive.js";
import { json, terminal } from "./report.js";
import type { Manifest } from "./model.js";
const args = process.argv.slice(2); const root = args.includes("--root") ? args[args.indexOf("--root") + 1] : process.cwd(); const safety = args.includes("--older-than") ? Number(args[args.indexOf("--older-than") + 1]?.replace(/d$/i, "")) : 2; const config = await loadConfig(root);
function help(): void { console.log(`Agent Session Prune — safe, restorable coding-agent storage cleanup\n\nUsage:\n  agent-prune audit [--json]\n  agent-prune archive --older-than 30d [--dry-run] [--yes]\n  agent-prune prune --older-than 30d --yes [--no-backup]\n  agent-prune restore <archive-id> --yes\n  agent-prune pin <path-or-session-id>\n`); }
if (args.includes("--help") || args.includes("-h") || !args[0]) { help(); process.exit(0); }
const current = await audit(config, Math.max(0, Number.isFinite(safety) ? safety : 2));
if (args[0] === "audit") { process.stdout.write(args.includes("--json") ? json(current) : terminal(current)); process.exit(0); }
if (args[0] === "pin") { const pin = args[1]; if (!pin) { console.error("pin requires a path or session id"); process.exit(2); } await saveConfig(root, { ...config, pins: [...new Set([...config.pins, pin])] }); console.log(`Pinned ${pin}`); process.exit(0); }
const archiveRoot = join(root, ".agent-prune-archives"); if (args[0] === "archive") { const manifest = await createArchive(current, archiveRoot, args.includes("--dry-run") || !args.includes("--yes")); console.log(`${manifest.entries.length} candidate file(s), ${manifest.entries.reduce((n, e) => n + e.bytes, 0)} bytes${args.includes("--dry-run") || !args.includes("--yes") ? " would be archived" : " archived"}.`); process.exit(0); }
if (args[0] === "restore") { const id = args[1]; if (!id || !args.includes("--yes")) { console.error("restore requires <archive-id> --yes"); process.exit(2); } let manifest: Manifest; try { manifest = JSON.parse(await readFile(join(archiveRoot, id, "manifest.json"), "utf8")) as Manifest; } catch { console.error(`Archive ${id} not found`); process.exit(2); } console.log(`Restored ${await restore(manifest, true)} file(s).`); process.exit(0); }
if (args[0] === "prune") { if (!args.includes("--yes")) { console.error("Nothing deleted. Review audit, archive first, then repeat with --yes."); process.exit(2); } if (!args.includes("--no-backup")) { console.error("Refusing to prune without an archive. Run archive first or explicitly use --no-backup --yes."); process.exit(2); } const candidates = current.items.filter((item) => item.protection === "candidate"); let removed = 0; for (const item of candidates) { try { const { stat, unlink } = await import("node:fs/promises"); const now = await stat(item.path); if (now.size !== item.bytes || Math.abs(now.mtimeMs - Date.parse(item.mtime)) > 1000) continue; await unlink(item.path); removed++; } catch { /* skip changed files */ } } console.log(`Removed ${removed} protected-plan candidate(s).`); process.exit(0); }
console.error(`Unknown command: ${args[0]}`); process.exit(2);
