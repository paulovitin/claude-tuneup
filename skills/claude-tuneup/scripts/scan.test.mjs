import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkCmdPath, hookReferenced, classifyMcp, ageSpan } from './scan.mjs';

test('checkCmdPath does not flag URL args as missing local paths', () => {
  const spec = { command: 'npx', args: ['-y', 'mcp-remote', 'https://example.com/sse'] };
  assert.deepEqual(checkCmdPath(spec).missing, []);
});

test('checkCmdPath still flags a genuinely missing absolute path', () => {
  const spec = { command: '/definitely/not/here/server', args: [] };
  assert.deepEqual(checkCmdPath(spec).missing, ['/definitely/not/here/server']);
});

test('checkCmdPath ignores file:// scheme but checks bare paths', () => {
  const spec = { command: 'node', args: ['file:///opt/x', '/also/missing'] };
  assert.deepEqual(checkCmdPath(spec).missing, ['/also/missing']);
});

test('hookReferenced matches a whole filename token, not a substring', () => {
  const cmds = JSON.stringify({ PreToolUse: [{ hooks: [{ command: '$DIR/hooks/aa.sh' }] }] });
  assert.equal(hookReferenced(cmds, 'aa.sh'), true);
  assert.equal(hookReferenced(cmds, 'a.sh'), false, 'a.sh must not match inside aa.sh');
});

test('hookReferenced matches a bare quoted filename', () => {
  const cmds = JSON.stringify({ Stop: [{ hooks: [{ command: 'format.sh' }] }] });
  assert.equal(hookReferenced(cmds, 'format.sh'), true);
});

test('classifyMcp marks http/sse/url servers as remote (managed elsewhere)', () => {
  assert.equal(classifyMcp({ type: 'sse', url: 'https://mcp.example.com/sse' }).transport, 'remote');
  assert.equal(classifyMcp({ type: 'http', url: 'https://mcp.example.com' }).transport, 'remote');
  assert.equal(classifyMcp({ url: 'https://mcp.example.com' }).transport, 'remote');
  // Remote servers must not be path-checked as local files.
  assert.equal('missingPaths' in classifyMcp({ type: 'sse', url: 'https://x/y' }), false);
});

test('classifyMcp marks command servers as local and path-checks them', () => {
  const r = classifyMcp({ command: '/definitely/not/here/server' });
  assert.equal(r.transport, 'local');
  assert.deepEqual(r.missingPaths, ['/definitely/not/here/server']);
});

test('classifyMcp reports credential env var NAMES, never values', () => {
  const r = classifyMcp({ command: 'node', env: { MY_API_KEY: 'sk-1234567890', DEBUG: '1', EMPTY_TOKEN: '' } });
  assert.deepEqual(r.secretHints, ['MY_API_KEY']);
  assert.equal(JSON.stringify(r).includes('sk-1234567890'), false, 'secret value must never appear in output');
});

test('ageSpan dates files below project dirs, not the dirs themselves', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tuneup-span-'));
  const proj = path.join(root, 'proj-a');
  fs.mkdirSync(proj, { recursive: true });
  const oldFile = path.join(proj, 'old.jsonl');
  const newFile = path.join(proj, 'new.jsonl');
  fs.writeFileSync(oldFile, 'x');
  fs.writeFileSync(newFile, 'y');
  const old = new Date('2024-02-01T00:00:00Z');
  fs.utimesSync(oldFile, old, old);
  // Touch the project dir itself to "today" — must not mask the old session inside.
  const span = ageSpan(root);
  assert.equal(span.count, 2, 'counts session files, not project dirs');
  assert.equal(span.oldest, '2024-02-01', 'oldest reflects the old session file');
  fs.rmSync(root, { recursive: true, force: true });
});
