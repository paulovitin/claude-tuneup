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
import {
  readRemovedMap, writeRemovedMap, readCreatedList, writeCreatedList, appendActionsLog,
} from './restorepoint.mjs';

// Restore points live outside the skill dir (see lib.backupsRoot) so a skill
// reinstall/update/move can't take the undo history with it.
const BACKUPS = backupsRoot();

function create() {
  // The restore point's basename IS the run id (see restorepoint.mjs's runIdOf) —
  // minted here, once, so the two never drift apart.
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
  writeRemovedMap(rp, {});
  writeCreatedList(rp, []);
  appendActionsLog(rp, `# restore point ${new Date().toISOString()}`);
  process.stdout.write(rp + '\n');
}

function stash(rp, target) {
  const abs = path.resolve(target);
  const map = readRemovedMap(rp);
  const dest = path.join(rp, 'removed', path.basename(abs) + '.' + Object.keys(map).length);
  move(abs, dest);
  map[dest] = abs;
  writeRemovedMap(rp, map);
  appendActionsLog(rp, `removed: ${abs} -> ${dest}`);
  process.stdout.write(`stashed ${abs}\n`);
}

// A run doesn't only subtract. Steps 16 and 17 write new skills, and until this existed
// nothing recorded them — so "undo everything" quietly left them behind, and a later
// "X started misbehaving" could never be traced to something this run ADDED.
// Nothing is copied here: the file is the dev's to keep until they ask to undo it.
function created(rp, target) {
  const abs = path.resolve(target);
  const list = readCreatedList(rp);
  if (!list.includes(abs)) list.push(abs);
  writeCreatedList(rp, list);
  appendActionsLog(rp, `created: ${abs}`);
  process.stdout.write(`recorded creation ${abs}\n`);
}

function log(rp, msg) {
  appendActionsLog(rp, msg);
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
