import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile, utimes } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { audit } from "../inventory.js";
import { createArchive, restore } from "../archive.js";

test("audit uses the supplied state root and protects recent and unknown files", async () => {
  const root = await mkdtemp(join(tmpdir(), "agent-prune-"));
  try {
    const sessions = join(root, ".codex", "sessions"); await mkdir(sessions, { recursive: true });
    const oldSession = join(sessions, "old.jsonl"); const recentSession = join(sessions, "recent.jsonl"); const unknown = join(sessions, "notes.bin");
    await writeFile(oldSession, "old session"); await writeFile(recentSession, "recent session"); await writeFile(unknown, "unknown");
    const old = new Date(Date.now() - 10 * 86_400_000); await utimes(oldSession, old, old);
    const result = await audit({ pins: [] }, 2, ["codex"], { stateRoot: root });
    assert.equal(result.items.find((item) => item.path === oldSession)?.class, "session");
    assert.equal(result.items.find((item) => item.path === oldSession)?.protection, "candidate");
    assert.equal(result.items.find((item) => item.path === recentSession)?.protection, "recent");
    assert.equal(result.items.find((item) => item.path === unknown)?.protection, "forbidden");
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("archive is checksum verified and restore round-trips bytes", async () => {
  const root = await mkdtemp(join(tmpdir(), "agent-prune-"));
  try {
    const sessions = join(root, ".claude", "projects", "demo"); await mkdir(sessions, { recursive: true }); const file = join(sessions, "old.jsonl"); await writeFile(file, "transcript"); const old = new Date(Date.now() - 10 * 86_400_000); await utimes(file, old, old);
    const inspected = await audit({ pins: [] }, 2, ["claude"], { stateRoot: root }); const archiveRoot = join(root, "archives"); const manifest = await createArchive(inspected, archiveRoot, false);
    assert.equal(manifest.entries.length, 1); await rm(file); assert.equal(await restore(manifest, true), 1);
    assert.equal(await (await import("node:fs/promises")).readFile(file, "utf8"), "transcript");
  } finally { await rm(root, { recursive: true, force: true }); }
});
