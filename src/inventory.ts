import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { lstat, readdir, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, relative } from "node:path";
import type { AgentId, Audit, Config, InventoryOptions, Item, Protection, StorageClass } from "./model.js";

type RootEntry = { agent: AgentId; root: string; relative: string; path: string; stat: Awaited<ReturnType<typeof lstat>> };

const rootsFor = (agent: AgentId, stateRoot: string): string[] => ({
  claude: [join(stateRoot, ".claude", "projects"), join(stateRoot, ".claude", "debug"), join(stateRoot, ".claude", "file-history"), join(stateRoot, ".claude", "todos")],
  codex: [join(stateRoot, ".codex", "sessions"), join(stateRoot, ".codex", "logs"), join(stateRoot, ".codex", "tmp")],
  gemini: [join(stateRoot, ".gemini", "tmp"), join(stateRoot, ".gemini", "sessions")],
  opencode: [join(stateRoot, ".local", "share", "opencode", "storage"), join(stateRoot, ".opencode", "storage")],
  openclaw: [join(stateRoot, ".openclaw", "agents")],
  hermes: [join(stateRoot, ".config", "hermes", "sessions")],
  pi: [join(stateRoot, ".pi", "agent", "sessions")],
}[agent]);

const classFor = (agent: AgentId, root: string, file: string): StorageClass => {
  const value = file.replaceAll("\\", "/").toLowerCase();
  const name = file.split(/[\\/]/).pop() ?? file;
  if (/credential|auth|secret|token|\.npmrc|(^|[/])\.env([.]|$)/.test(value)) return "credential";
  if (/settings|config/.test(name) && /[.]claude[/]|[.]codex[/]/.test(value)) return "configuration";
  if (/[/](debug|logs?)([/]|$)/.test(value)) return "debug";
  if (/file-history|snapshot/.test(value)) return "file-history";
  if (/[/](tmp|temp|output)([/]|$)/.test(value)) return "temp";
  if (agent === "claude" && (/[.]jsonl$/i.test(name) || /[/](projects|todos)([/]|$)/.test(value))) return "session";
  if (agent !== "claude" && (/session|transcript|conversation|chat|storage/i.test(value) || /[.]jsonl$/i.test(name))) return "session";
  return "unknown";
};

async function walk(root: string, dir = root, out: RootEntry[] = [], agent: AgentId = root.includes(`${process.platform === "win32" ? "\\" : "/"}.codex`) ? "codex" : "claude"): Promise<RootEntry[]> {
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return out; }
  for (const entry of entries) {
    if ([".git", "node_modules"].includes(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isSymbolicLink()) { try { out.push({ agent, root, path: full, relative: relative(root, full), stat: await lstat(full) }); } catch { /* vanished */ } continue; }
    if (entry.isDirectory()) await walk(root, full, out, agent);
    else { try { out.push({ agent, root, path: full, relative: relative(root, full), stat: await lstat(full) }); } catch { /* vanished */ } }
  }
  return out;
}

function protection(itemClass: StorageClass, ageDays: number, config: Config, path: string, safetyDays: number, keep: boolean): Protection {
  if (["configuration", "credential", "unknown"].includes(itemClass)) return "forbidden";
  if (config.pins.some((pin) => path === pin || path.includes(pin))) return "pinned";
  if (keep) return "recent";
  if (ageDays < Math.max(safetyDays, config.youngerThanDays ?? 0)) return "recent";
  return "candidate";
}

export async function audit(config: Config = { pins: [] }, safetyDays = 2, agents: AgentId[] = ["claude", "codex", "gemini", "opencode", "openclaw", "hermes", "pi"], options: InventoryOptions = {}): Promise<Audit> {
  const stateRoot = options.stateRoot ?? homedir();
  const entries: RootEntry[] = [];
  for (const agent of agents) for (const root of rootsFor(agent, stateRoot)) entries.push(...await walk(root, root, [], agent));
  const sessionByAgent = new Map<AgentId, RootEntry[]>();
  for (const entry of entries) if (classFor(entry.agent, entry.root, entry.relative) === "session" && !entry.stat.isSymbolicLink()) sessionByAgent.set(entry.agent, [...(sessionByAgent.get(entry.agent) ?? []), entry]);
  const keepLast = Math.max(0, Math.floor(config.keepLast ?? 0));
  const keepIds = new Set([...sessionByAgent.values()].flatMap((group) => group.sort((a, b) => Number(b.stat.mtimeMs) - Number(a.stat.mtimeMs)).slice(0, keepLast).map((entry) => entry.path)));
  const items: Item[] = entries.map((entry) => {
    const bytes = Number(entry.stat.size); const mtimeMs = Number(entry.stat.mtimeMs); const ageDays = Math.max(0, (Date.now() - mtimeMs) / 86_400_000); const cls = classFor(entry.agent, entry.root, entry.relative); const symlink = entry.stat.isSymbolicLink(); const protect = symlink ? "symlink" : protection(cls, ageDays, config, entry.path, safetyDays, keepIds.has(entry.path));
    const reason = protect === "candidate" ? `older than ${Math.max(safetyDays, config.youngerThanDays ?? 0)} days` : protect === "forbidden" ? "configuration, credential, or unknown storage" : protect === "symlink" ? "symlink is never followed" : protect === "pinned" ? "explicitly pinned" : "retention protection";
    return { id: createHash("sha256").update(`${entry.path}\0${bytes}\0${mtimeMs}`).digest("hex").slice(0, 16), agent: entry.agent, path: entry.path, relative: entry.relative.replaceAll("\\", "/"), class: cls, bytes, mtime: entry.stat.mtime.toISOString(), ageDays, protection: protect, reason };
  });
  return { schemaVersion: 3, generatedAt: new Date().toISOString(), roots: [...new Set(entries.map((entry) => entry.root))], items, bytes: items.reduce((sum, item) => sum + item.bytes, 0), candidates: items.filter((item) => item.protection === "candidate").reduce((sum, item) => sum + item.bytes, 0), protectedBytes: items.filter((item) => item.protection !== "candidate").reduce((sum, item) => sum + item.bytes, 0) };
}

export async function loadConfig(root: string): Promise<Config> { try { const parsed = JSON.parse(await readFile(join(root, ".agent-prune.json"), "utf8")) as Partial<Config>; return { pins: Array.isArray(parsed.pins) ? parsed.pins.filter((pin): pin is string => typeof pin === "string") : [], keepLast: parsed.keepLast, youngerThanDays: parsed.youngerThanDays, minFreeDisk: parsed.minFreeDisk }; } catch { return { pins: [] }; } }
export async function saveConfig(root: string, config: Config): Promise<void> { const { mkdir, writeFile } = await import("node:fs/promises"); await mkdir(root, { recursive: true }); await writeFile(join(root, ".agent-prune.json"), `${JSON.stringify(config, null, 2)}\n`, "utf8"); }
export function stateRootExists(stateRoot: string): boolean { return existsSync(join(stateRoot, ".claude")) || existsSync(join(stateRoot, ".codex")); }
