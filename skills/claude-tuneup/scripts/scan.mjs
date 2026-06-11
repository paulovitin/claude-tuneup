#!/usr/bin/env node
// Read-only discovery of a Claude Code install. Emits JSON for the agent to reason over.
// Touches nothing. Runs on every OS (Node built-ins only).
//
//   node scan.mjs                      -> everything
//   node scan.mjs --section hooks      -> one section
//   node scan.mjs --section mcps,usage -> several sections (comma-separated)
//
// Sections: skills, plugins, hooks, mcps, projects, stateDirs, rootFiles, usage
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HOME, CLAUDE_DIR, AGENTS_DIR, CLAUDE_JSON, readJSON, exists, dirSize, isEmptyDir, human, MB, out } from './lib.mjs';

const ls = (p) => { try { return fs.readdirSync(p); } catch { return []; } };
const lstat = (p) => { try { return fs.lstatSync(p); } catch { return null; } };
const OS_CRUFT = new Set(['.DS_Store', 'Thumbs.db']);
// Irreplaceable conversation history / session state. Not covered by the restore
// point (only configs are snapshotted), so deleting any of these is permanent.
// NOTE: statsig is NOT here — it's a feature-flag/telemetry cache that regenerates.
const SESSION_HISTORY = new Set(['projects', 'todos', 'shell-snapshots', 'file-history', 'sessions']);
// Name-based *hint* only (the agent still inspects + asks): dirs that look like
// regenerable caches. Deleting them reclaims little — they rebuild on next use.
const REGENERABLE_HINT = /^(statsig|cache|caches|tmp|temp|logs?|downloads)$|[-._]cache$/i;

// File mtimes (not dir mtimes) up to `depth` levels down, so e.g. projects/<proj>/<session>.jsonl
// dates the *sessions* — a project dir touched yesterday can still hold year-old transcripts.
export function ageSpan(dir, depth = 2) {
  let count = 0, oldest = Infinity, newest = 0;
  const walk = (p, d) => {
    for (const n of ls(p)) {
      const fp = path.join(p, n);
      const st = lstat(fp);
      if (!st) continue;
      if (st.isDirectory()) { if (d < depth) walk(fp, d + 1); continue; }
      count++;
      const ms = st.mtimeMs;
      if (ms < oldest) oldest = ms;
      if (ms > newest) newest = ms;
    }
  };
  walk(dir, 0);
  const iso = (ms) => (ms && isFinite(ms)) ? new Date(ms).toISOString().slice(0, 10) : null;
  return { count, oldest: iso(oldest), newest: iso(newest) };
}

function scanSkills() {
  // Skills can live in ~/.claude/skills/ (older installs) or ~/.agents/skills/ (newer Claude Code).
  // Scan both and return them with their origin so the agent can consolidate.
  const dirs = [
    { origin: 'claude', dir: path.join(CLAUDE_DIR, 'skills') },
    { origin: 'agents', dir: path.join(AGENTS_DIR, 'skills') },
  ];
  const results = [];
  for (const { origin, dir } of dirs) {
    for (const name of ls(dir).filter(n => !OS_CRUFT.has(n))) {
      const p = path.join(dir, name);
      const st = lstat(p);
      const entry = { name, origin };
      if (st?.isSymbolicLink()) {
        entry.type = 'symlink';
        entry.target = fs.readlinkSync(p);
        entry.broken = !exists(path.resolve(dir, entry.target));
      } else if (st?.isDirectory()) {
        entry.type = 'dir';
        entry.size = human(dirSize(p));
      } else {
        entry.type = 'file';
      }
      // Check if the other dir also has this skill (duplicate)
      const otherDir = origin === 'claude' ? dirs[1].dir : dirs[0].dir;
      entry.alsoInOther = exists(path.join(otherDir, name));
      results.push(entry);
    }
  }
  return results;
}

function scanPlugins() {
  const dir = path.join(CLAUDE_DIR, 'plugins');
  if (!exists(dir)) return null;
  // installed_plugins.json normally looks like { plugins: { "name@marketplace": ... } }.
  // Tolerate a flat { "name@marketplace": ... } map too (format drift across versions).
  const raw = readJSON(path.join(dir, 'installed_plugins.json'));
  const installed =
    (raw && typeof raw.plugins === 'object' && raw.plugins && !Array.isArray(raw.plugins)) ? raw.plugins
    : (raw && typeof raw === 'object' && !Array.isArray(raw))
      ? Object.fromEntries(Object.entries(raw).filter(([k]) => k.includes('@')))
      : {};
  const installedCount = Object.keys(installed).length;
  const usedMarkets = new Set(Object.keys(installed).map(k => k.split('@')[1]).filter(Boolean));
  const mDir = path.join(dir, 'marketplaces');
  const marketplaces = ls(mDir).map(name => ({
    name, size: human(dirSize(path.join(mDir, name))), used: usedMarkets.has(name),
  }));
  // SAFETY: if the manifest parsed to *nothing* but plugin content exists on disk, the
  // file format likely changed — "not in the listing" must NOT be read as "not installed",
  // or a format drift would make the agent propose uninstalling everything.
  const contentDirs = ls(dir).filter(n => {
    const p = path.join(dir, n);
    return lstat(p)?.isDirectory() && !isEmptyDir(p);
  });
  const listingReliable = installedCount > 0 || contentDirs.length === 0;
  return {
    totalSize: human(dirSize(dir)),
    installedCount,
    installed: Object.keys(installed),
    listingReliable,
    ...(listingReliable ? {} : { warning: 'installed_plugins.json parsed empty but plugin content exists on disk — do NOT treat unlisted plugins as uninstalled.' }),
    marketplaces,
    unusedMarketplaces: marketplaces.filter(m => !m.used).map(m => `${m.name} (${m.size})`),
  };
}

// A hook file is "referenced" only when its name appears as a whole token in the
// settings JSON — bounded by a path separator, quote, or whitespace. Plain substring
// matching falsely tied "a.sh" to a reference to "aa.sh".
export function hookReferenced(cmds, filename) {
  const esc = filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[/"'\\s])${esc}($|["'\\s])`).test(cmds);
}

function scanHooks() {
  const dir = path.join(CLAUDE_DIR, 'hooks');
  const onDisk = ls(dir).filter(n => !OS_CRUFT.has(n));
  // Hooks can be wired in settings.json OR settings.local.json — check both, or a hook
  // referenced only in the local file gets falsely flagged as an orphan.
  const sources = {};
  for (const f of ['settings.json', 'settings.local.json']) {
    const s = readJSON(path.join(CLAUDE_DIR, f));
    if (s) sources[f] = JSON.stringify(s.hooks || {});
  }
  const refIn = (file) => Object.entries(sources)
    .filter(([, blob]) => hookReferenced(blob, file))
    .map(([src]) => src);
  const entries = onDisk.map(name => ({ name, referencedIn: refIn(name) }));
  return {
    settingsChecked: Object.keys(sources),
    onDisk: entries,
    referencedBySettings: entries.filter(e => e.referencedIn.length).map(e => e.name),
    onDiskNotReferenced: entries.filter(e => !e.referencedIn.length).map(e => e.name),
    note: 'Only user-level settings were checked; a file may still be referenced by a project-level .claude/settings.json. Confirm with the dev before treating it as an orphan.',
  };
}

export function checkCmdPath(spec) {
  // spec.command may be a binary path or an interpreter; pull out absolute paths and check them.
  // Strip URLs first (https://, npm:, file://...) — a "//host/path" inside a URL is not a
  // filesystem path and must not be reported as a missing local file.
  const blob = [spec?.command, ...(spec?.args || [])].join(' ').replace(/\b[a-z][a-z0-9+.-]*:\/\/\S+/gi, ' ');
  const paths = (blob.match(/\/[^\s"']+/g) || []).filter(p => p.includes('/'));
  const missing = paths.filter(p => !exists(p));
  return { missing };
}

// Trait-based MCP classification — no hardcoded vendor names. Remote servers
// (type http/sse, or a url field) are managed elsewhere (claude.ai connectors /
// `claude mcp`) and must not be touched as local files. secretHints lists env var
// NAMES that look like inline credentials — never the values.
export function classifyMcp(spec) {
  const remote = spec?.type === 'http' || spec?.type === 'sse' || typeof spec?.url === 'string';
  const secretHints = Object.entries(spec?.env || {})
    .filter(([k, v]) => /key|token|secret|passw|credential/i.test(k) && typeof v === 'string' && v.trim().length >= 8)
    .map(([k]) => k);
  return remote
    ? { transport: 'remote', url: spec?.url, secretHints }
    : { transport: 'local', secretHints, missingPaths: checkCmdPath(spec).missing };
}

function scanMCPs() {
  const fromFile = (obj) => Object.entries(obj || {}).map(([name, spec]) => ({ name, ...classifyMcp(spec) }));
  return {
    global: fromFile(readJSON(CLAUDE_JSON)?.mcpServers),
    settings: fromFile(readJSON(path.join(CLAUDE_DIR, 'settings.json'))?.mcpServers),
    settingsLocal: fromFile(readJSON(path.join(CLAUDE_DIR, 'settings.local.json'))?.mcpServers),
  };
}

function scanProjects() {
  const projects = readJSON(CLAUDE_JSON)?.projects || {};
  const all = Object.keys(projects);
  const gone = all.filter(p => !exists(p));
  return { total: all.length, alive: all.length - gone.length, gone };
}

function scanStateDirs(handled) {
  return ls(CLAUDE_DIR).filter(name => {
    const st = lstat(path.join(CLAUDE_DIR, name));
    return st?.isDirectory() && !handled.has(name);
  }).map(name => {
    const p = path.join(CLAUDE_DIR, name);
    const bytes = dirSize(p);
    const sensitive = SESSION_HISTORY.has(name);
    const regen = !sensitive && REGENERABLE_HINT.test(name);
    return {
      name, size: human(bytes), empty: isEmptyDir(p), big: bytes >= 50 * MB,
      sessionHistory: sensitive,
      ...(sensitive ? { span: ageSpan(p) } : {}),
      ...(regen ? { hint: 'regenerable' } : {}),
    };
  }).sort((a, b) => (b.empty === a.empty ? 0 : a.empty ? 1 : -1));
}

function scanRootFiles() {
  return ls(CLAUDE_DIR).filter(name => {
    const st = lstat(path.join(CLAUDE_DIR, name));
    return st && !st.isDirectory();
  }).map(name => {
    let cls = 'unknown';
    if (OS_CRUFT.has(name)) cls = 'os-cruft-skip';
    else if (/^history\.jsonl$/.test(name)) cls = 'session-history';
    else if (/\.(bak|old)$|\.backup/.test(name)) cls = 'stale-backup';
    else if (/-cache\.json$|result.*\.json$/.test(name)) cls = 'regenerable';
    else if (/^(CLAUDE|SOUL)\.md$|^settings.*\.json$/.test(name)) cls = 'config-keep';
    return { name, class: cls };
  });
}

// Top usage counters straight from ~/.claude.json — the cross-OS replacement for the
// old inline python3 fallback in the CLAUDE.md step.
function scanUsage() {
  const d = readJSON(CLAUDE_JSON) || {};
  const iso = (ts) => ts ? new Date(ts).toISOString().slice(0, 10) : null;
  const top = (x = {}, n = 12) => Object.entries(x)
    .map(([name, v]) => ({ name, count: v?.usageCount || 0, lastUsed: iso(v?.lastUsedAt) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
  return { skills: top(d.skillUsage), tools: top(d.toolUsage) };
}

function main() {
  const handled = new Set(['skills', 'plugins', 'hooks', '.backups']);
  const SECTIONS = {
    skills: scanSkills,
    plugins: scanPlugins,
    hooks: scanHooks,
    mcps: scanMCPs,
    projects: scanProjects,
    stateDirs: () => scanStateDirs(handled),
    rootFiles: scanRootFiles,
    usage: scanUsage,
  };
  const argv = process.argv.slice(2);
  const i = argv.indexOf('--section');
  const wanted = i >= 0 && argv[i + 1]
    ? argv[i + 1].split(',').map(s => s.trim()).filter(Boolean)
    : Object.keys(SECTIONS);
  const unknown = wanted.filter(k => !SECTIONS[k]);
  if (unknown.length) {
    console.error(`unknown section(s): ${unknown.join(', ')} — valid: ${Object.keys(SECTIONS).join(', ')}`);
    process.exit(1);
  }
  const res = { home: HOME };
  for (const k of wanted) res[k] = SECTIONS[k]();
  out(res);
}

// Run the scan only when invoked directly; stay importable (and side-effect-free) for tests.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
