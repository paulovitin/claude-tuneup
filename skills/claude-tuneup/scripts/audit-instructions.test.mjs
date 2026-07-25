import { findInstructionCandidates } from './audit-instructions.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SCRIPTS = path.dirname(fileURLToPath(import.meta.url));

function makeHome() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tuneup-audit-'));
  fs.mkdirSync(path.join(home, '.claude'), { recursive: true });
  return home;
}

function runJSON(home, ...args) {
  return JSON.parse(execFileSync(process.execPath, [path.join(SCRIPTS, 'audit-instructions.mjs'), ...args], {
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_TUNEUP_HOME: home },
  }));
}

function write(home, relative, text) {
  const file = path.join(home, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
  return file;
}

test('default audit emits every signal, permits multiple signals, and skips non-instructions', () => {
  const home = makeHome();
  const claude = write(home, '.claude/CLAUDE.md', [
    '# Heading',
    '',
    '@AGENTS.md',
    'NEVER use foo, bar, or baz; respond in bullet points with at most 3 tokens.',
    'A nevertheless ordinary sentence.',
    'Delegate this at session start.',
    '```md',
    'never use hidden, fenced, examples',
    '~~~',
    'always read this too',
    '~~~',
  ].join('\r\n'));
  const agents = write(home, '.claude/AGENTS.md', 'must use an emoji\n');
  const result = runJSON(home);
  assert.deepEqual(result.files, [claude, agents]);
  const line4 = result.candidates.filter((candidate) => candidate.line === 4 && candidate.file === claude);
  assert.deepEqual(new Set(line4.map((candidate) => candidate.signal)), new Set([
    'absolute', 'numeric-threshold', 'format-mandate', 'enumerated-ban',
  ]));
  assert.ok(result.candidates.some((candidate) => candidate.signal === 'harness-vocabulary'));
  assert.ok(result.candidates.some((candidate) => candidate.file === agents && candidate.signal === 'absolute'));
  assert.equal(result.candidates.some((candidate) => candidate.text.includes('nevertheless')), false);
  assert.equal(result.candidates.some((candidate) => candidate.text.includes('hidden')), false);
  assert.equal(result.candidates.some((candidate) => candidate.line <= 3 && candidate.file === claude), false);
  fs.rmSync(home, { recursive: true, force: true });
});

test('AGENTS.md is ignored unless CLAUDE.md imports it', () => {
  const home = makeHome();
  write(home, '.claude/CLAUDE.md', 'A calm sentence.\n');
  const agents = write(home, '.claude/AGENTS.md', 'never use x or y\n');
  const result = runJSON(home);
  assert.equal(result.files.includes(agents), false);
  assert.equal(result.candidates.length, 0);
  fs.rmSync(home, { recursive: true, force: true });
});

test('surface audit parses descriptions conservatively and reports unsupported frontmatter', () => {
  const home = makeHome();
  const plain = write(home, '.claude/skills/plain/SKILL.md', [
    '---', 'name: plain', 'description: routes:carefully', '---', 'body',
  ].join('\n'));
  const quoted = write(home, '.agents/skills/quoted/SKILL.md', [
    '---', 'name: quoted', 'description: "Routes: safely"', '---', 'body text',
  ].join('\n'));
  const agent = write(home, '.claude/agents/helper.md', [
    '---', 'name: helper', 'description: use this when needed', '---', 'agent body',
  ].join('\n'));
  const block = write(home, '.claude/skills/block/SKILL.md', [
    '---', 'name: block', 'description: |', '  unsafe to parse', '---', 'body',
  ].join('\n'));
  const missing = write(home, '.claude/skills/missing/SKILL.md', 'no frontmatter\n');
  const result = runJSON(home, '--surfaces');
  assert.deepEqual(result.surfaces.map((surface) => surface.path), [plain, agent, quoted]);
  assert.equal(result.surfaces.find((surface) => surface.path === plain).description, 'routes:carefully');
  assert.equal(result.surfaces.find((surface) => surface.path === quoted).description, 'Routes: safely');
  assert.equal(result.surfaces.find((surface) => surface.path === agent).bodyChars, 'agent body'.length);
  assert.equal(result.totalDescriptionChars,
    result.surfaces.reduce((total, surface) => total + surface.description.length, 0));
  assert.ok(result.skipped.some((entry) => entry.path === block && /block scalar/.test(entry.reason)));
  assert.ok(result.skipped.some((entry) => entry.path === missing && /fence/.test(entry.reason)));
  fs.rmSync(home, { recursive: true, force: true });
});

test('empty install has valid empty audit JSON', () => {
  const home = makeHome();
  assert.deepEqual(runJSON(home), { files: [], totalLines: 0, candidates: [] });
  assert.deepEqual(runJSON(home, '--surfaces'), {
    surfaces: [], totalDescriptionChars: 0, approxResidentTokens: 0, skipped: [],
  });
  fs.rmSync(home, { recursive: true, force: true });
});

test('all-caps acronyms are not mistaken for shouted imperatives', () => {
  const { candidates } = findInstructionCandidates('/f.md', [
    'Validate the JSON returned by the MCP server over HTTP.',
    'NEVER commit secrets.',
  ].join('\n'));
  // Line 1 is technical vocabulary, not an instruction: acronyms must not flag it.
  assert.equal(candidates.some((c) => c.line === 1), false);
  assert.ok(candidates.some((c) => c.line === 2 && c.signal === 'absolute'));
});
