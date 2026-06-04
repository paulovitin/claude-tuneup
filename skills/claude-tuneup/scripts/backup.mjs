#!/usr/bin/env node
// Restore-point manager. Cross-OS, deterministic.
//   node backup.mjs create            -> make a restore point, print its path
//   node backup.mjs stash <RP> <path> -> move an item into the restore point (logged, restorable)
//   node backup.mjs log <RP> <msg>    -> append a line to actions.log (e.g. a re-add command)
import fs from 'node:fs';
import path from 'node:path';
import { HOME, CLAUDE_DIR, CLAUDE_JSON, skillRoot, exists, move } from './lib.mjs';

const ROOT = skillRoot(import.meta.url);
const BACKUPS = path.join(ROOT, '.backups');

// Small, irreplaceable config files this skill may edit.
const CONFIGS = [
  CLAUDE_JSON,
  path.join(CLAUDE_DIR, 'settings.json'),
  path.join(CLAUDE_DIR, 'settings.local.json'),
  path.join(CLAUDE_DIR, 'CLAUDE.md'),
  path.join(CLAUDE_DIR, 'SOUL.md'),
];

function ts() {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '-');
}

function create() {
  const rp = path.join(BACKUPS, ts());
  fs.mkdirSync(path.join(rp, 'removed'), { recursive: true });
  for (const f of CONFIGS) if (exists(f)) fs.copyFileSync(f, path.join(rp, path.basename(f)));
  fs.writeFileSync(path.join(rp, 'removed.json'), '{}');
  fs.appendFileSync(path.join(rp, 'actions.log'), `# restore point ${new Date().toISOString()}\n`);
  // Ensure backups never ship when the skill is shared.
  const gi = path.join(ROOT, '.gitignore');
  const cur = exists(gi) ? fs.readFileSync(gi, 'utf8') : '';
  if (!cur.split('\n').includes('.backups/')) fs.appendFileSync(gi, '.backups/\n');
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
