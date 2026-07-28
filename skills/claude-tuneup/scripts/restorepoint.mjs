// The restore-point format, shared by backup.mjs (writer) and restore.mjs (reader) so it
// is defined in exactly one place. No CLI of its own — see CLAUDE.md's module table.
//
// A restore point is a directory named with lib.runId() under backupsRoot(): its basename
// IS the run id ledger.mjs tracks (backup.mjs names it with runId() at creation, and
// SKILL.md's ~/.claude-tuneup/backups/<run-id>/ documents the same string both ways).
// runIdOf() makes that identity a function instead of a fact the agent has to remember.
import fs from 'node:fs';
import path from 'node:path';
import { exists, readJSON } from './lib.mjs';

// The restore point IS its run id, by construction — this just names that fact so a
// caller never has to reach for path.basename() themselves. Splits on [\\/] rather than
// delegating to path.basename(): a restore point path can arrive from ledger.mjs data
// written on a different OS than the one reading it now.
export function runIdOf(rp) {
  const segments = rp.split(/[\\/]/).filter(Boolean);
  return segments[segments.length - 1];
}

export function removedMapFile(rp) {
  return path.join(rp, 'removed.json');
}

export function createdListFile(rp) {
  return path.join(rp, 'created.json');
}

export function actionsLogFile(rp) {
  return path.join(rp, 'actions.log');
}

export function readRemovedMap(rp) {
  return readJSON(removedMapFile(rp)) || {};
}

export function writeRemovedMap(rp, map) {
  fs.writeFileSync(removedMapFile(rp), JSON.stringify(map, null, 2));
}

export function readCreatedList(rp) {
  const list = readJSON(createdListFile(rp));
  return Array.isArray(list) ? list : [];
}

export function writeCreatedList(rp, list) {
  fs.writeFileSync(createdListFile(rp), JSON.stringify(list, null, 2));
}

export function appendActionsLog(rp, line) {
  fs.appendFileSync(actionsLogFile(rp), line + '\n');
}

export function readActionsLog(rp) {
  try { return fs.readFileSync(actionsLogFile(rp), 'utf8'); } catch { return ''; }
}

// A restore point is a dir holding a removed.json — this also filters out the
// pre-restore-* safety snapshots restore.mjs writes beside (never inside) one.
export function isRestorePoint(rp) {
  return exists(removedMapFile(rp));
}
