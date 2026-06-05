import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const script = fileURLToPath(new URL('./changelog-section.mjs', import.meta.url));
// CHANGELOG.md lives at the repo root, one level up from tools/.
const repoRoot = path.resolve(path.dirname(script), '..');
const run = (arg) => execFileSync('node', [script, arg], { cwd: repoRoot, encoding: 'utf8' });

test('extracts the section body for a known version', () => {
  const out = run('0.1.0');
  assert.match(out, /Initial tagged baseline/);
});

test('tolerates a leading v in the version arg', () => {
  assert.equal(run('v0.1.0'), run('0.1.0'));
});

test('strips link-reference definitions from the body', () => {
  assert.doesNotMatch(run('0.1.0'), /^\[[^\]]+\]:\s+https?:\/\//m);
});

test('exits non-zero for an unknown version', () => {
  assert.throws(() => run('9.9.9'));
});
