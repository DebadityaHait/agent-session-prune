#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { audit, loadConfig, saveConfig } from "./inventory.js";
import { createArchive, restore } from "./archive.js";
import { execute } from "./prune.js";
import { json, terminal } from "./report.js";
import type { Manifest } from "./model.js";

const args = process.argv.slice(2);
const root = resolve(args.includes("--root") ? args[args.indexOf("--root") + 1] : process.cwd());
const stateRoot = args.includes("--state-root") ? resolve(args[args.indexOf("--state-root") + 1]) : undefined;
const parsedSafety = args.includes("--older-than") ? Number(args[args.indexOf("--older-than") + 1]?.replace(/d$/i, "")) : 2;
const safety = Number.isFinite(parsedSafety) && parsedSafety >= 0 ? parsedSafety : 2;
const config = await loadConfig(root);

function help(): void { console.log(`Agent Session Prune - inspect and reclaim file-based coding-agent state\n\nUsage:\n  agent-prune audit [--root path] [--state-root path] [--json]\n  agent-prune archive --older-than 30d [--root path] [--state-root path] [--dry-run|--yes]\n  agent-prune prune --older-than 30d [--root path] [--state-root path] --yes [--no-backup]\n  agent-prune restore <archive-id> [--root path] --yes\n  agent-prune pin <path-or-session-id> [--root path]\n\nAudit is read-only. Archive copies checksum-verified candidates and never deletes originals.\nA prune creates that archive before deleting, unless --no-backup --yes explicitly opts out.`); }

if (args.includes("--help") || args.includes("-h") || !args[0]) { help(); process.exit(0); }
const current = await audit(config, safety, ["claude", "codex"], { stateRoot });
if (args[0] === "audit") { process.stdout.write(args.includes("--json") ? json(current) : terminal(current)); process.exit(0); }
if (args[0] === "pin") { const pin = args[1]; if (!pin) { console.error("pin requires a path or session id"); process.exit(2); } await saveConfig(root, { ...config, pins: [...new Set([...config.pins, pin])] }); console.log(`Pinned ${pin}`); process.exit(0); }

const archiveRoot = join(root, ".agent-prune-archives");
if (args[0] === "archive") {
  const preview = args.includes("--dry-run") || !args.includes("--yes");
  const manifest = await createArchive(current, archiveRoot, preview);
  console.log(`${manifest.entries.length} candidate file(s), ${manifest.entries.reduce((n, e) => n + e.bytes, 0)} bytes${preview ? " would be archived" : " archived"}.`);
  if (!preview) console.log(`Archive: ${manifest.archiveId}`);
  process.exit(0);
}
if (args[0] === "restore") {
  const id = args[1]; if (!id || !args.includes("--yes") || !/^[A-Za-z0-9_.-]+$/.test(id)) { console.error("restore requires <archive-id> --yes"); process.exit(2); }
  let manifest: Manifest; try { manifest = JSON.parse(await readFile(join(archiveRoot, id, "manifest.json"), "utf8")) as Manifest; } catch { console.error(`Archive ${id} not found`); process.exit(2); }
  console.log(`Restored ${await restore(manifest, true)} file(s).`); process.exit(0);
}
if (args[0] === "prune") {
  if (!args.includes("--yes")) { console.error("Nothing deleted. Review audit, then repeat with --yes."); process.exit(2); }
  const noBackup = args.includes("--no-backup");
  if (!noBackup) { const manifest = await createArchive(current, archiveRoot, false); console.log(`Archive ${manifest.archiveId} created with ${manifest.entries.length} file(s).`); }
  const result = await execute(current.items, true, true);
  console.log(`Removed ${result.removed} candidate file(s), ${result.bytes} bytes.`); process.exit(0);
}
console.error(`Unknown command: ${args[0]}`); process.exit(2);
