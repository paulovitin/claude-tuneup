#!/usr/bin/env node
// Read-only discovery of a Claude Code install. Emits JSON for the agent to reason over.
// Touches nothing. Runs on every OS (Node built-ins only).
import fs from 'node:fs';
import path from 'node:path';
import { HOME, CLAUDE_DIR, AGENTS_DIR, CLAUDE_JSON, readJSON, exists, dirSize, isEmptyDir, human, MB, out } from './lib.mjs';

const ls = (p) => { try { return fs.readdirSync(p); } catch { return []; } };
const lstat = (p) => { try { return fs.lstatSync(p); } catch { return null; } };
const OS_CRUFT = new Set(['.DS_Store', 'Thumbs.db']);
// Irreplaceable conversation history / session state. Not covered by the restore
// point (only configs are snapshotted), so deleting any of these is permanent.
const SESSION_HISTORY = new Set(['projects', 'todos', 'shell-snapshots', 'file-history', 'sessions', 'statsig']);

function ageSpan(dir) {
  // Oldest/newest child mtime + count — lets the agent prune by clear age, never in bulk.
  const names = ls(dir);
  let oldest = Infinity, newest = 0;
  for (const n of names) {
    const st = lstat(path.join(dir, n));
    if (!st) continue;
    const ms = st.mtimeMs;
    if (ms < oldest) oldest = ms;
    if (ms > newest) newest = ms;
  }
  const iso = (ms) => (ms && isFinite(ms)) ? new Date(ms).toISOString().slice(0, 10) : null;
  return { count: names.length, oldest: iso(oldest), newest: iso(newest) };
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
  const installed = readJSON(path.join(dir, 'installed_plugins.json'))?.plugins || {};
  const usedMarkets = new Set(Object.keys(installed).map(k => k.split('@')[1]).filter(Boolean));
  const mDir = path.join(dir, 'marketplaces');
  const marketplaces = ls(mDir).map(name => ({
    name, size: human(dirSize(path.join(mDir, name))), used: usedMarkets.has(name),
  }));
  return {
    totalSize: human(dirSize(dir)),
    installedCount: Object.keys(installed).length,
    marketplaces,
    unusedMarketplaces: marketplaces.filter(m => !m.used).map(m => `${m.name} (${m.size})`),
  };
}

function scanHooks() {
  const dir = path.join(CLAUDE_DIR, 'hooks');
  const onDisk = ls(dir).filter(n => !OS_CRUFT.has(n));
  const settings = readJSON(path.join(CLAUDE_DIR, 'settings.json')) || {};
  const cmds = JSON.stringify(settings.hooks || {});
  const referenced = onDisk.filter(f => cmds.includes(f));
  return {
    onDisk,
    referencedBySettings: referenced,
    onDiskNotReferenced: onDisk.filter(f => !referenced.includes(f)),
  };
}

function checkCmdPath(spec) {
  // spec.command may be a binary path or an interpreter; pull out absolute paths and check them.
  const blob = [spec?.command, ...(spec?.args || [])].join(' ');
  const paths = (blob.match(/\/[^\s"']+/g) || []).filter(p => p.includes('/'));
  const missing = paths.filter(p => !exists(p));
  return { missing };
}

function scanMCPs() {
  const global = readJSON(CLAUDE_JSON)?.mcpServers || {};
  const proj = readJSON(path.join(CLAUDE_DIR, 'settings.json'))?.mcpServers || {};
  const map = (obj) => Object.entries(obj).map(([name, spec]) => ({
    name, missingPaths: checkCmdPath(spec).missing,
  }));
  return { global: map(global), settings: map(proj) };
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
    return {
      name, size: human(bytes), empty: isEmptyDir(p), big: bytes >= 50 * MB,
      sessionHistory: sensitive,
      ...(sensitive ? { span: ageSpan(p) } : {}),
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

const handled = new Set(['skills', 'plugins', 'hooks', '.backups']);
out({
  home: HOME,
  skills: scanSkills(),
  plugins: scanPlugins(),
  hooks: scanHooks(),
  mcps: scanMCPs(),
  projects: scanProjects(),
  stateDirs: scanStateDirs(handled),
  rootFiles: scanRootFiles(),
});
