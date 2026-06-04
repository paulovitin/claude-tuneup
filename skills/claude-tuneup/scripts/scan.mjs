#!/usr/bin/env node
// Read-only discovery of a Claude Code install. Emits JSON for the agent to reason over.
// Touches nothing. Runs on every OS (Node built-ins only).
import fs from 'node:fs';
import path from 'node:path';
import { HOME, CLAUDE_DIR, CLAUDE_JSON, readJSON, exists, dirSize, isEmptyDir, human, MB, out } from './lib.mjs';

const ls = (p) => { try { return fs.readdirSync(p); } catch { return []; } };
const lstat = (p) => { try { return fs.lstatSync(p); } catch { return null; } };
const OS_CRUFT = new Set(['.DS_Store', 'Thumbs.db']);

function scanSkills() {
  const dir = path.join(CLAUDE_DIR, 'skills');
  return ls(dir).filter(n => !OS_CRUFT.has(n)).map(name => {
    const p = path.join(dir, name);
    const st = lstat(p);
    if (st?.isSymbolicLink()) {
      const target = fs.readlinkSync(p);
      return { name, type: 'symlink', target, broken: !exists(path.resolve(dir, target)) };
    }
    if (st?.isDirectory()) return { name, type: 'dir', size: human(dirSize(p)) };
    return { name, type: 'file' };
  });
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
    return {
      name, size: human(bytes), empty: isEmptyDir(p), big: bytes >= 50 * MB,
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
    else if (/\.(bak|old)$|\.backup/.test(name)) cls = 'stale-backup';
    else if (/-cache\.json$|result.*\.json$/.test(name)) cls = 'regenerable';
    else if (/^(CLAUDE|SOUL)\.md$|^settings.*\.json$/.test(name)) cls = 'config-keep';
    return { name, class: cls };
  });
}

const handled = new Set(['skills', 'plugins', 'hooks']);
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
