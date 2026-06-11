#!/usr/bin/env node
// Consolidate a skill: move it from ~/.claude/skills/<name> to ~/.agents/skills/<name>
// and leave a directory link behind so Claude Code still finds it. Cross-OS: on Windows,
// where plain symlinks need Developer Mode/admin, it falls back to a junction.
//   node consolidate.mjs <name>          -> move + link back (prints JSON)
//   node consolidate.mjs <name> --undo   -> remove the link, move the skill back
import fs from 'node:fs';
import path from 'node:path';
import { CLAUDE_DIR, AGENTS_DIR, exists, move, linkDir, out } from './lib.mjs';

const [name, flag] = process.argv.slice(2);
if (!name) { console.error('usage: consolidate.mjs <skill-name> [--undo]'); process.exit(1); }

const src = path.join(CLAUDE_DIR, 'skills', name);
const dest = path.join(AGENTS_DIR, 'skills', name);

function fail(msg) { out({ ok: false, error: msg }); process.exit(1); }

if (flag === '--undo') {
  const st = (() => { try { return fs.lstatSync(src); } catch { return null; } })();
  if (!st?.isSymbolicLink()) fail(`${src} is not a link — nothing to undo`);
  if (!exists(dest)) fail(`${dest} does not exist — cannot move it back`);
  fs.rmSync(src);
  move(dest, src);
  out({ ok: true, undone: `${dest} -> ${src}` });
} else {
  const st = (() => { try { return fs.lstatSync(src); } catch { return null; } })();
  if (!st) fail(`${src} does not exist`);
  if (st.isSymbolicLink()) fail(`${src} is already a link — nothing to consolidate`);
  if (!st.isDirectory()) fail(`${src} is not a directory`);
  if (exists(dest)) fail(`${dest} already exists — resolve the duplicate first (see scan "alsoInOther")`);
  move(src, dest);
  const kind = linkDir(dest, src);
  out({ ok: true, moved: `${src} -> ${dest}`, linkBack: { path: src, kind } });
}
