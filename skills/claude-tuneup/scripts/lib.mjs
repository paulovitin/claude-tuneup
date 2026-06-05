// Shared helpers for claude-tuneup scripts. Node built-ins only; runs on every OS.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const HOME = os.homedir();
export const CLAUDE_DIR = path.join(HOME, '.claude');
export const AGENTS_DIR = path.join(HOME, '.agents');
export const CLAUDE_JSON = path.join(HOME, '.claude.json');

// Skill root = parent of this script's dir (.../claude-tuneup/scripts/lib.mjs -> .../claude-tuneup).
// fileURLToPath (not new URL().pathname) so install paths with spaces/unicode — e.g.
// "~/Library/Application Support" — decode correctly instead of resolving to a %20-mangled dir.
export function skillRoot(metaUrl) {
  const here = path.dirname(fileURLToPath(metaUrl));
  return path.dirname(here);
}

// Where restore points live. OUTSIDE the skill dir on purpose: a skill update,
// reinstall, or a move between ~/.claude/skills and ~/.agents/skills must not wipe
// the user's only undo. Override with $CLAUDE_TUNEUP_STATE.
export function backupsRoot() {
  const override = process.env.CLAUDE_TUNEUP_STATE;
  const base = override ? override : path.join(HOME, '.claude-tuneup');
  return path.join(base, 'backups');
}

// Collision-proof, lexically sortable run id: second-precision stamp + random suffix.
// Two runs in the same second no longer resolve to the same backup dir.
export function runId(date = new Date()) {
  const stamp = date.toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '-');
  return `${stamp}-${crypto.randomBytes(3).toString('hex')}`;
}

export function readJSON(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

export function exists(p) {
  try { fs.lstatSync(p); return true; } catch { return false; }
}

// Recursive size in bytes. Does not follow symlinks (counts the link as 0, like a real dir walk).
export function dirSize(p) {
  let total = 0;
  let st;
  try { st = fs.lstatSync(p); } catch { return 0; }
  if (st.isSymbolicLink()) return 0;
  if (st.isFile()) return st.size;
  if (!st.isDirectory()) return 0;
  let entries = [];
  try { entries = fs.readdirSync(p); } catch { return total; }
  for (const e of entries) total += dirSize(path.join(p, e));
  return total;
}

export function isEmptyDir(p) {
  try { return fs.readdirSync(p).length === 0; } catch { return false; }
}

export function human(bytes) {
  const u = ['B', 'K', 'M', 'G', 'T'];
  let i = 0, n = bytes;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return `${n >= 10 || i === 0 ? Math.round(n) : n.toFixed(1)}${u[i]}`;
}

export const MB = 1024 * 1024;

// Cross-OS move: try rename, fall back to copy+remove across devices.
// On the cross-device path, verify the copy landed before removing the source —
// never delete the original on the strength of an unchecked cpSync.
export function move(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  try { fs.renameSync(src, dest); }
  catch {
    fs.cpSync(src, dest, { recursive: true });
    if (!exists(dest)) throw new Error(`move: copy to ${dest} failed; left ${src} intact`);
    fs.rmSync(src, { recursive: true, force: true });
  }
}

export function out(obj) {
  process.stdout.write(JSON.stringify(obj, null, 2) + '\n');
}
