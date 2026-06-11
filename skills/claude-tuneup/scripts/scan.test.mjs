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

// --- AGENTS.md bridge (v0.4.0) ---
import { parseImports, analyzeMemory } from './scan.mjs';

test('parseImports finds inline and own-line imports, trims punctuation, ignores emails', () => {
  const text = [
    'See @README for project overview.',
    '@AGENTS.md',
    '- git workflow @docs/git-instructions.md, then commit',
    'mail me at foo@bar.com',
    '(@~/.claude/SOUL.md)',
  ].join('\n');
  assert.deepEqual(parseImports(text), ['README', 'AGENTS.md', 'docs/git-instructions.md', '~/.claude/SOUL.md']);
});

const LINES_6 = Array.from({ length: 6 }, (_, i) => `- rule ${i}`).join('\n');

test('analyzeMemory: @AGENTS.md import links the files — no drift, tokens combined', () => {
  const m = analyzeMemory({
    claude: { exists: true, text: '@AGENTS.md\n@SOUL.md\n- claude-only delta\n' },
    agents: { exists: true, text: LINES_6 },
    soul: { exists: true, text: '- blunt tone\n' },
  });
  assert.equal(m.linkStyle, 'import');
  assert.equal(m.drift, false);
  assert.equal(m.importsSoul, true);
  const f = m.files;
  assert.equal(m.combinedApproxTokens,
    f['CLAUDE.md'].approxTokens + f['AGENTS.md'].approxTokens + f['SOUL.md'].approxTokens,
    'imports load at launch, so the budget is the sum');
});

test('analyzeMemory: both files substantive and unlinked => drift', () => {
  const m = analyzeMemory({
    claude: { exists: true, text: LINES_6 },
    agents: { exists: true, text: LINES_6 + '\n- diverged' },
    soul: { exists: false },
  });
  assert.equal(m.linkStyle, 'none');
  assert.equal(m.drift, true, 'silent duplication must be flagged');
});

test('analyzeMemory: a tiny CLAUDE.md next to AGENTS.md is not drift', () => {
  const m = analyzeMemory({
    claude: { exists: true, text: '# see AGENTS\n' }, // < 5 content lines
    agents: { exists: true, text: LINES_6 },
    soul: { exists: false },
  });
  assert.equal(m.drift, false);
});

test('analyzeMemory: symlink counts as linked and is not double-counted', () => {
  const m = analyzeMemory({
    claude: { exists: true, text: LINES_6, symlinkToAgents: true },
    agents: { exists: true, text: LINES_6 },
    soul: { exists: false },
  });
  assert.equal(m.linkStyle, 'symlink');
  assert.equal(m.drift, false);
  assert.equal(m.combinedApproxTokens, m.files['CLAUDE.md'].approxTokens,
    'CLAUDE.md *is* AGENTS.md — counting both would double it');
});
