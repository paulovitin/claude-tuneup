#!/usr/bin/env node
// Restore-point manager. Cross-OS, deterministic.
//   node backup.mjs create              -> make a restore point, print its path
//   node backup.mjs stash <RP> <path>   -> move an item into the restore point (logged, restorable)
//   node backup.mjs created <RP> <path> -> record something this run ADDED, so undo can undo it
//   node backup.mjs log <RP> <msg>      -> append a line to actions.log (e.g. a re-add command)
import fs from 'node:fs';
import path from 'node:path';
import { backupsRoot, runId, exists, move, restrict } from './lib.mjs';
import { CONFIG_FILES } from './install.mjs';

// Restore points live outside the skill dir (see lib.backupsRoot) so a skill
// reinstall/update/move can't take the undo history with it.
const BACKUPS = backupsRoot();

function create() {
  const rp = path.join(BACKUPS, runId());
  fs.mkdirSync(path.join(rp, 'removed'), { recursive: true });
  // Snapshots can carry secrets (.claude.json may hold tokens/keys) — keep the
  // restore point owner-only. Best effort; no-op-ish on Windows.
  restrict(rp, 0o700);
  for (const f of CONFIG_FILES) {
    if (!exists(f)) continue;
    const dest = path.join(rp, path.basename(f));
    fs.copyFileSync(f, dest);
    restrict(dest, 0o600);
  }
  fs.writeFileSync(path.join(rp, 'removed.json'), '{}');
  fs.writeFileSync(path.join(rp, 'created.json'), '[]');
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

// A run doesn't only subtract. Steps 16 and 17 write new skills, and until this existed
// nothing recorded them — so "undo everything" quietly left them behind, and a later
// "X started misbehaving" could never be traced to something this run ADDED.
// Nothing is copied here: the file is the dev's to keep until they ask to undo it.
function created(rp, target) {
  const abs = path.resolve(target);
  const file = path.join(rp, 'created.json');
  let list = [];
  try { list = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}
  if (!Array.isArray(list)) list = [];
  if (!list.includes(abs)) list.push(abs);
  fs.writeFileSync(file, JSON.stringify(list, null, 2));
  fs.appendFileSync(path.join(rp, 'actions.log'), `created: ${abs}\n`);
  process.stdout.write(`recorded creation ${abs}\n`);
}

function log(rp, msg) {
  fs.appendFileSync(path.join(rp, 'actions.log'), msg + '\n');
}

const [cmd, ...rest] = process.argv.slice(2);
if (cmd === 'create') create();
else if (cmd === 'stash') stash(rest[0], rest[1]);
else if (cmd === 'created') created(rest[0], rest[1]);
else if (cmd === 'log') log(rest[0], rest.slice(1).join(' '));
else {
  console.error('Usage: node backup.mjs create | stash <RP> <path> | created <RP> <path> | log <RP> <msg>');
  process.exit(1);
}
