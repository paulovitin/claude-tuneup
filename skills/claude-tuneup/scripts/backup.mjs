#!/usr/bin/env node
// Restore-point manager. Cross-OS, deterministic.
//   node backup.mjs create            -> make a restore point, print its path
//   node backup.mjs stash <RP> <path> -> move an item into the restore point (logged, restorable)
//   node backup.mjs log <RP> <msg>    -> append a line to actions.log (e.g. a re-add command)
import fs from 'node:fs';
import path from 'node:path';
import { CLAUDE_DIR, CLAUDE_JSON, backupsRoot, runId, exists, move, restrict } from './lib.mjs';

// Restore points live outside the skill dir (see lib.backupsRoot) so a skill
// reinstall/update/move can't take the undo history with it.
const BACKUPS = backupsRoot();

// Small, irreplaceable config files this skill may edit.
const CONFIGS = [
  CLAUDE_JSON,
  path.join(CLAUDE_DIR, 'settings.json'),
  path.join(CLAUDE_DIR, 'settings.local.json'),
  path.join(CLAUDE_DIR, 'CLAUDE.md'),
  path.join(CLAUDE_DIR, 'SOUL.md'),
];

function create() {
  const rp = path.join(BACKUPS, runId());
  fs.mkdirSync(path.join(rp, 'removed'), { recursive: true });
  // Snapshots can carry secrets (.claude.json may hold tokens/keys) — keep the
  // restore point owner-only. Best effort; no-op-ish on Windows.
  restrict(rp, 0o700);
  for (const f of CONFIGS) {
    if (!exists(f)) continue;
    const dest = path.join(rp, path.basename(f));
    fs.copyFileSync(f, dest);
    restrict(dest, 0o600);
  }
  fs.writeFileSync(path.join(rp, 'removed.json'), '{}');
  fs.appendFileSync(path.join(rp, 'actions.log'), `# restore point ${new Date().toISOString()}\n`);
  process.stdout.write(rp + '\n');
}

function stash(rp, target) {
  const abs = path.resolve(target);
  const map = JSON.parse(fs.readFileSync(path.join(rp, 'removed.json'), 'utf8'));
  const dest = path.join(rp, 'removed', path.basename(abs) + '.' + Object.keys(map).length);
  move(abs, dest);
  map[dest] = abs;
  fs.writeFileSync(path.join(rp, 'removed.json'), JSON.stringify(map, null, 2));
  fs.appendFileSync(path.join(rp, 'actions.log'), `removed: ${abs} -> ${dest}\n`);
  process.stdout.write(`stashed ${abs}\n`);
}

function log(rp, msg) {
  fs.appendFileSync(path.join(rp, 'actions.log'), msg + '\n');
}

const [cmd, ...rest] = process.argv.slice(2);
if (cmd === 'create') create();
else if (cmd === 'stash') stash(rest[0], rest[1]);
else if (cmd === 'log') log(rest[0], rest.slice(1).join(' '));
else { console.error('usage: backup.mjs create | stash <RP> <path> | log <RP> <msg>'); process.exit(1); }
