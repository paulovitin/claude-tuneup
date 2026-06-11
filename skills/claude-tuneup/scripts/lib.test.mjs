import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { skillRoot, backupsRoot, runId, move, human, linkDir } from './lib.mjs';

test('skillRoot decodes percent-encoded paths (spaces / unicode), cross-OS', () => {
  // A real install path with a space — e.g. macOS "Application Support". pathToFileURL
  // percent-encodes the space; skillRoot must decode it back, not resolve to a %20 dir.
  const base = path.join(os.tmpdir(), 'Application Support', 'skills', 'claude-tuneup');
  const url = pathToFileURL(path.join(base, 'scripts', 'lib.mjs')).href;
  assert.ok(url.includes('%20'), 'precondition: the file URL encodes the space');
  assert.equal(skillRoot(url), base);
});

test('backupsRoot defaults outside the skill dir, under $HOME/.claude-tuneup', () => {
  delete process.env.CLAUDE_TUNEUP_STATE;
  const root = backupsRoot();
  // NOTE: lib reads $CLAUDE_TUNEUP_HOME at import time, so compare against its HOME.
  assert.ok(root.endsWith(path.join('.claude-tuneup', 'backups')));
  assert.ok(!root.includes(path.join('skills', 'claude-tuneup')), 'must not live inside the skill dir');
});

test('backupsRoot honors $CLAUDE_TUNEUP_STATE override', () => {
  process.env.CLAUDE_TUNEUP_STATE = '/var/tmp/tuneup-state';
  assert.equal(backupsRoot(), path.join('/var/tmp/tuneup-state', 'backups'));
  delete process.env.CLAUDE_TUNEUP_STATE;
});

test('runId is collision-proof and lexically sortable within the same second', () => {
  const at = new Date('2026-06-05T14:30:00.000Z');
  const a = runId(at);
  const b = runId(at);
  assert.notEqual(a, b, 'two ids in the same second must differ');
  assert.match(a, /^20260605-143000-[0-9a-f]{6}$/);
  // Same-second ids share the sortable prefix; a later second sorts after.
  assert.ok(runId(new Date('2026-06-05T14:30:01.000Z')) > a);
});

test('move verifies the cross-device copy landed before deleting the source', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tuneup-move-'));
  const src = path.join(dir, 'src.txt');
  const dest = path.join(dir, 'sub', 'dest.txt');
  fs.writeFileSync(src, 'payload');
  move(src, dest);
  assert.equal(fs.readFileSync(dest, 'utf8'), 'payload');
  assert.ok(!fs.existsSync(src), 'source removed after successful move');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('linkDir creates a working directory link (symlink, or junction on Windows)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tuneup-link-'));
  const target = path.join(dir, 'real');
  const link = path.join(dir, 'link');
  fs.mkdirSync(target);
  fs.writeFileSync(path.join(target, 'f.txt'), 'hi');
  const kind = linkDir(target, link);
  assert.ok(['symlink', 'junction'].includes(kind));
  assert.equal(fs.readFileSync(path.join(link, 'f.txt'), 'utf8'), 'hi', 'link resolves to the target');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('human formats bytes', () => {
  assert.equal(human(0), '0B');
  assert.equal(human(1024), '1.0K');
  assert.equal(human(1536), '1.5K');
  assert.equal(human(10 * 1024), '10K');
});
