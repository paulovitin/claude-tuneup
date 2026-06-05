import test from 'node:test';
import assert from 'node:assert/strict';
import { checkCmdPath, hookReferenced } from './scan.mjs';

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
