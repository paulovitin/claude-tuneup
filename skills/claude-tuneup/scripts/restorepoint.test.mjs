import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  runIdOf, removedMapFile, createdListFile, actionsLogFile,
  readRemovedMap, writeRemovedMap, readCreatedList, writeCreatedList,
  appendActionsLog, readActionsLog, isRestorePoint,
} from './restorepoint.mjs';

function makeRp() {
  const rp = fs.mkdtempSync(path.join(os.tmpdir(), 'tuneup-rp-'));
  return rp;
}

test('runIdOf is the restore point basename — the run id, by construction', () => {
  const rp = path.join('home', 'x', '.claude-tuneup', 'backups', '20260101-120000-ab12cd');
  assert.equal(runIdOf(rp), '20260101-120000-ab12cd');
  // Restore point paths can show up in ledger data written on a different OS —
  // runIdOf must extract the run id regardless of which separator was used.
  assert.equal(runIdOf('C:\\Users\\x\\.claude-tuneup\\backups\\20260101-120000-ab12cd'), '20260101-120000-ab12cd');
});

test('a directory with no removed.json is not a restore point', () => {
  const rp = makeRp();
  assert.equal(isRestorePoint(rp), false);
  fs.rmSync(rp, { recursive: true, force: true });
});

test('writeRemovedMap then readRemovedMap round-trips, and an absent file reads as empty', () => {
  const rp = makeRp();
  assert.deepEqual(readRemovedMap(rp), {}, 'no removed.json yet — degrades to empty, never throws');
  writeRemovedMap(rp, { '/rp/removed/x.0': '/original/x' });
  assert.equal(isRestorePoint(rp), true, 'writing removed.json is what makes it a restore point');
  assert.deepEqual(readRemovedMap(rp), { '/rp/removed/x.0': '/original/x' });
  fs.rmSync(rp, { recursive: true, force: true });
});

test('writeCreatedList then readCreatedList round-trips, and an absent file reads as empty', () => {
  const rp = makeRp();
  assert.deepEqual(readCreatedList(rp), []);
  writeCreatedList(rp, ['/new/skill']);
  assert.deepEqual(readCreatedList(rp), ['/new/skill']);
  fs.rmSync(rp, { recursive: true, force: true });
});

test('appendActionsLog accumulates lines; readActionsLog degrades to empty when the file is absent', () => {
  const rp = makeRp();
  assert.equal(readActionsLog(rp), '');
  appendActionsLog(rp, 'removed: /a -> /rp/removed/a.0');
  appendActionsLog(rp, 'created: /b');
  assert.equal(readActionsLog(rp), 'removed: /a -> /rp/removed/a.0\ncreated: /b\n');
  fs.rmSync(rp, { recursive: true, force: true });
});

test('the three file-path helpers all point inside the restore point they were given', () => {
  const rp = '/some/rp';
  assert.equal(removedMapFile(rp), path.join(rp, 'removed.json'));
  assert.equal(createdListFile(rp), path.join(rp, 'created.json'));
  assert.equal(actionsLogFile(rp), path.join(rp, 'actions.log'));
});
