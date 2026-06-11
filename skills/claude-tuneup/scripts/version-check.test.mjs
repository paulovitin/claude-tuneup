import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseVersion, isNewer, buildResult, readLocalVersion } from './version-check.mjs';

test('parseVersion strips a leading v and ignores prerelease/build suffixes', () => {
  assert.deepEqual(parseVersion('1.2.3'), [1, 2, 3]);
  assert.deepEqual(parseVersion('v0.3.0'), [0, 3, 0]);
  assert.deepEqual(parseVersion('v1.4.0-rc.1'), [1, 4, 0]);
});

test('parseVersion returns null for garbage', () => {
  assert.equal(parseVersion('latest'), null);
  assert.equal(parseVersion(''), null);
  assert.equal(parseVersion(undefined), null);
});

test('isNewer compares semver numerically, not lexically', () => {
  assert.equal(isNewer('0.10.0', '0.9.0'), true);   // 10 > 9, lexical would say false
  assert.equal(isNewer('v0.4.0', '0.3.0'), true);
  assert.equal(isNewer('0.3.0', '0.3.0'), false);
  assert.equal(isNewer('0.2.9', '0.3.0'), false);
});

test('isNewer is false (never noisy) when either version is unparseable', () => {
  assert.equal(isNewer(null, '0.3.0'), false);
  assert.equal(isNewer('0.4.0', 'garbage'), false);
});

test('buildResult only carries a message when actually behind', () => {
  const behind = buildResult('0.3.0', '0.4.0');
  assert.equal(behind.update, true);
  assert.match(behind.message, /0\.4\.0/);
  assert.match(behind.message, /npx skills add/);

  const current = buildResult('0.4.0', '0.4.0');
  assert.equal(current.update, false);
  assert.equal(current.message, undefined);
});

test('buildResult degrades silently when a version is unknown', () => {
  assert.equal(buildResult(null, '0.4.0').ok, false);
  assert.equal(buildResult('0.3.0', null).ok, false);
  // never throws, never a spurious update prompt
  assert.notEqual(buildResult('0.3.0', null).update, true);
});

test('readLocalVersion returns the shipped VERSION', () => {
  const v = readLocalVersion();
  assert.match(v, /^\d+\.\d+\.\d+$/);
});

test('shipped VERSION stays in lockstep with package.json (release guard)', () => {
  // scripts -> claude-tuneup -> skills -> repo root
  const root = path.dirname(path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url)))));
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const shipped = fs.readFileSync(
    path.join(root, 'skills', 'claude-tuneup', 'VERSION'), 'utf8'
  ).trim();
  assert.equal(shipped, pkg.version, 'VERSION file must match package.json version — bump both in the release PR');
});
