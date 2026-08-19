import { stat, unlink } from "node:fs/promises";
import type { Item } from "./model.js";

export async function execute(items: Item[], yes: boolean, noBackup: boolean): Promise<{ removed: number; bytes: number }> {
  if (!yes) throw new Error("prune is destructive; repeat with --yes");
  if (!noBackup) throw new Error("prune requires an archive; use --no-backup --yes only when you accept the risk");
  let removed = 0; let bytes = 0;
  for (const item of items.filter((candidate) => candidate.protection === "candidate")) try { const current = await stat(item.path); if (current.size !== item.bytes || Math.abs(current.mtimeMs - Date.parse(item.mtime)) > 1000) continue; await unlink(item.path); removed++; bytes += item.bytes; } catch { /* changed or vanished files are skipped */ }
  return { removed, bytes };
}
