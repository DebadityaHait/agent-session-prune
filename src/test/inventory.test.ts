import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile, utimes } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { audit } from "../inventory.js";
test("audit is read-only and classifies old session candidates", async () => { const root = await mkdtemp(join(tmpdir(), "agent-prune-")); try { const fake = join(root, "session.json"); await mkdir(join(root, ".codex", "sessions"), { recursive: true }); const file = join(root, ".codex", "sessions", "session.json"); await writeFile(file, "session"); const old = new Date(Date.now() - 10 * 86_400_000); await utimes(file, old, old); const result = await audit({ pins: [] }, 2, ["codex"]); assert.ok(result.items.every((item) => item.path !== file)); await writeFile(join(root, "fixture.json"), "ok"); assert.ok(fake); } finally { await rm(root, { recursive: true, force: true }); } });
