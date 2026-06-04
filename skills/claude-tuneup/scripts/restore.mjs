#!/usr/bin/env node
// Undo a previous run from a restore point. Cross-OS, deterministic.
//   node restore.mjs list             -> list restore points + a summary of each
//   node restore.mjs apply <RP>       -> restore configs + move removed items back, print re-add cmds
import fs from 'node:fs';
import path from 'node:path';
import { HOME, CLAUDE_DIR, CLAUDE_JSON, skillRoot, exists, move, readJSON } from './lib.mjs';

const ROOT = skillRoot(import.meta.url);
const BACKUPS = path.join(ROOT, '.backups');

// Where each snapshotted config goes back to.
const CONFIG_DEST = {
  '.claude.json': CLAUDE_JSON,
  'settings.json': path.join(CLAUDE_DIR, 'settings.json'),
  'settings.local.json': path.join(CLAUDE_DIR, 'settings.local.json'),
  'CLAUDE.md': path.join(CLAUDE_DIR, 'CLAUDE.md'),
  'SOUL.md': path.join(CLAUDE_DIR, 'SOUL.md'),
};

const ls = (p) => { try { return fs.readdirSync(p); } catch { return []; } };

function list() {
  const points = ls(BACKUPS).sort().reverse();
  const result = points.map(ts => {
    const rp = path.join(BACKUPS, ts);
    const removed = readJSON(path.join(rp, 'removed.json')) || {};
    let logLines = 0;
    try { logLines = fs.readFileSync(path.join(rp, 'actions.log'), 'utf8').trim().split('\n').length; } catch {}
    return { ts, path: rp, removedCount: Object.keys(removed).length, logLines };
  });
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}

function apply(rp) {
  if (!rp || !exists(rp)) { console.error('restore point not found: ' + rp); process.exit(1); }
  const restored = [], collisions = [];

  // 0. Pre-restore safety snapshot: copy the CURRENT configs aside before overwriting them.
  // Restoring a stale .claude.json would clobber projects/sessions added after the backup —
  // this makes the restore itself reversible. Stored next to the restore point, never inside it.
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const preDir = path.join(path.dirname(rp), `pre-restore-${path.basename(rp)}-${ts}`);
  fs.mkdirSync(preDir, { recursive: true });
  for (const [name, dest] of Object.entries(CONFIG_DEST)) {
    if (exists(dest)) fs.copyFileSync(dest, path.join(preDir, name));
  }

  // 1. Configs back (current versions are already saved in preDir above).
  for (const [name, dest] of Object.entries(CONFIG_DEST)) {
    const snap = path.join(rp, name);
    if (exists(snap)) { fs.copyFileSync(snap, dest); restored.push(`config: ${dest}`); }
  }
  // 2. Removed items back to original paths — never clobber a newer item that took the path.
  const map = readJSON(path.join(rp, 'removed.json')) || {};
  for (const [stashed, original] of Object.entries(map)) {
    if (!exists(stashed)) continue;
    if (exists(original)) {
      const alt = `${original}.restored-${ts}`;
      move(stashed, alt);
      collisions.push({ original, restoredTo: alt });
    } else {
      move(stashed, original);
      restored.push(`item: ${original}`);
    }
  }
  // 3. Surface re-add commands (marketplaces/plugins can't be auto-restored).
  let readd = [];
  try {
    readd = fs.readFileSync(path.join(rp, 'actions.log'), 'utf8')
      .split('\n').filter(l => /re-add:|marketplace removed/.test(l));
  } catch {}
  process.stdout.write(JSON.stringify({ restored, collisions, preRestoreSnapshot: preDir, manualReAdd: readd }, null, 2) + '\n');
}

const [cmd, rp] = process.argv.slice(2);
if (cmd === 'list') list();
else if (cmd === 'apply') apply(rp);
else { console.error('usage: restore.mjs list | apply <RP>'); process.exit(1); }
