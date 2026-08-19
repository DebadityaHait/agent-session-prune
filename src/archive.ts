import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import type { Audit, Item, Manifest, ManifestEntry } from "./model.js";

async function checksum(path: string): Promise<string> { return createHash("sha256").update(await readFile(path)).digest("hex"); }
function inside(base: string, target: string): boolean { const rel = relative(resolve(base), resolve(target)); return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel)); }
function safeRelative(value: string): boolean { return value.length > 0 && !isAbsolute(value) && !value.split(/[\\/]/).includes("..") && !value.startsWith("~"); }

export async function createArchive(audit: Audit, archiveRoot: string, dryRun = false): Promise<Manifest> {
  const candidates = audit.items.filter((item) => item.protection === "candidate"); const archiveId = `${new Date().toISOString().replace(/[:.]/g, "-")}-${Math.random().toString(36).slice(2, 8)}`; const base = resolve(archiveRoot, archiveId); const entries: ManifestEntry[] = [];
  if (!dryRun) await mkdir(base, { recursive: true });
  for (const item of candidates) {
    if (!safeRelative(item.relative)) continue;
    const archived = resolve(base, item.agent, item.relative); if (!inside(base, archived)) continue;
    const entry: ManifestEntry = { id: item.id, original: item.path, archived, sha256: await checksum(item.path), bytes: item.bytes }; entries.push(entry);
    if (!dryRun) { await mkdir(dirname(archived), { recursive: true }); const temp = `${archived}.partial-${process.pid}`; await copyFile(item.path, temp); if (await checksum(temp) !== entry.sha256) { await rm(temp, { force: true }); throw new Error(`checksum mismatch while archiving ${item.path}`); } await rename(temp, archived); }
  }
  const manifest: Manifest = { schemaVersion: 2, archiveId, createdAt: new Date().toISOString(), entries }; if (!dryRun) await writeFile(resolve(base, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8"); return manifest;
}

export async function restore(manifest: Manifest, yes = false): Promise<number> { if (!yes) throw new Error("restore requires --yes"); let restored = 0; for (const entry of manifest.entries) { if (!safeRelative(entry.archived) && !isAbsolute(entry.archived)) throw new Error(`ASP007 unsafe archive path for ${entry.id}`); const source = resolve(entry.archived); const target = resolve(entry.original); if (await checksum(source) !== entry.sha256) throw new Error(`ASP008 checksum mismatch for ${entry.id}`); await mkdir(dirname(target), { recursive: true }); const temp = `${target}.restore-${process.pid}`; await copyFile(source, temp); if (await checksum(temp) !== entry.sha256) { await rm(temp, { force: true }); throw new Error(`ASP008 restore verification failed for ${entry.id}`); } await rename(temp, target); restored++; } return restored; }
export async function verify(manifest: Manifest): Promise<{ verified: number; failed: string[] }> { const failed: string[] = []; let verified = 0; for (const entry of manifest.entries) try { if (await checksum(entry.archived) !== entry.sha256) failed.push(entry.id); else verified++; } catch { failed.push(entry.id); } return { verified, failed }; }
export function plan(audit: Audit): Item[] { return audit.items.filter((item) => item.protection === "candidate"); }
