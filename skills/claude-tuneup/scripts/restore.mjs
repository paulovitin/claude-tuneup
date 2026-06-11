#!/usr/bin/env node
// Undo a previous run from a restore point. Cross-OS, deterministic.
//   node restore.mjs list                              -> list restore points + a summary of each
//   node restore.mjs apply <RP> [--configs-only|--items-only]
//                                                      -> full restore, or just configs / just removed items
import fs from 'node:fs';
import path from 'node:path';
import { CLAUDE_DIR, CLAUDE_JSON, skillRoot, backupsRoot, exists, move, readJSON, restrict } from './lib.mjs';

// New restore points live in backupsRoot(); older ones may still sit in the legacy
// in-skill location. Scan both so a pre-fix backup stays restorable.
const ROOTS = [backupsRoot(), path.join(skillRoot(import.meta.url), '.backups')];

// Where each snapshotted config goes back to.
const CONFIG_DEST = {
  '.claude.json': CLAUDE_JSON,
  'settings.json': path.join(CLAUDE_DIR, 'settings.json'),
  'settings.local.json': path.join(CLAUDE_DIR, 'settings.local.json'),
  'CLAUDE.md': path.join(CLAUDE_DIR, 'CLAUDE.md'),
  'AGENTS.md': path.join(CLAUDE_DIR, 'AGENTS.md'),
  'SOUL.md': path.join(CLAUDE_DIR, 'SOUL.md'),
};

const ls = (p) => { try { return fs.readdirSync(p); } catch { return []; } };

// Collect real restore points across all roots. A restore point is a dir holding a
// removed.json — this also filters out the pre-restore-* safety snapshots.
function allPoints() {
  const out = [];
  for (const root of ROOTS) {
    for (const ts of ls(root)) {
      const rp = path.join(root, ts);
      if (!exists(path.join(rp, 'removed.json'))) continue;
      out.push({ ts, rp });
    }
  }
  return out.sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0));
}

function list() {
  const result = allPoints().map(({ ts, rp }) => {
    const removed = readJSON(path.join(rp, 'removed.json')) || {};
    let logLines = 0;
    try { logLines = fs.readFileSync(path.join(rp, 'actions.log'), 'utf8').trim().split('\n').length; } catch {}
    return { ts, path: rp, removedCount: Object.keys(removed).length, logLines };
  });
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}

function apply(rp, { configsOnly = false, itemsOnly = false } = {}) {
  if (!rp || !exists(rp)) { console.error('restore point not found: ' + rp); process.exit(1); }
  const restored = [], collisions = [];
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  let preDir = null;

  // 1. Configs back (skipped with --items-only).
  if (!itemsOnly) {
    // Pre-restore safety snapshot: copy the CURRENT configs aside before overwriting them.
    // Restoring a stale .claude.json would clobber projects/sessions added after the backup —
    // this makes the restore itself reversible. Stored next to the restore point, never inside it.
    preDir = path.join(path.dirname(rp), `pre-restore-${path.basename(rp)}-${ts}`);
    fs.mkdirSync(preDir, { recursive: true });
    restrict(preDir, 0o700);
    for (const [name, dest] of Object.entries(CONFIG_DEST)) {
      if (!exists(dest)) continue;
      const snap = path.join(preDir, name);
      fs.copyFileSync(dest, snap);
      restrict(snap, 0o600);
    }
    for (const [name, dest] of Object.entries(CONFIG_DEST)) {
      const snap = path.join(rp, name);
      if (exists(snap)) { fs.copyFileSync(snap, dest); restored.push(`config: ${dest}`); }
    }
  }

  // 2. Removed items back to original paths (skipped with --configs-only) —
  //    never clobber a newer item that took the path.
  if (!configsOnly) {
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
  }

  // 3. Surface re-add commands (marketplaces/plugins can't be auto-restored).
  let readd = [];
  try {
    readd = fs.readFileSync(path.join(rp, 'actions.log'), 'utf8')
      .split('\n').filter(l => /re-add:|marketplace removed/.test(l));
  } catch {}
  process.stdout.write(JSON.stringify({
    scope: configsOnly ? 'configs-only' : itemsOnly ? 'items-only' : 'full',
    restored, collisions, preRestoreSnapshot: preDir, manualReAdd: readd,
  }, null, 2) + '\n');
}

const [cmd, rp, flag] = process.argv.slice(2);
if (cmd === 'list') list();
else if (cmd === 'apply') apply(rp, { configsOnly: flag === '--configs-only', itemsOnly: flag === '--items-only' });
else { console.error('usage: restore.mjs list | apply <RP> [--configs-only|--items-only]'); process.exit(1); }
