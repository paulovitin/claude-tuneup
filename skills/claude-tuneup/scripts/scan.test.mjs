import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  checkCmdPath, hookReferenced, classifyMcp, ageSpan,
  parsePermissionRule, permissionPathPrefix, auditSettings,
} from './scan.mjs';

const SCRIPTS = path.dirname(fileURLToPath(import.meta.url));

function makeMemoryHome() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tuneup-memory-'));
  fs.mkdirSync(path.join(home, '.claude'), { recursive: true });
  fs.writeFileSync(path.join(home, '.claude', 'settings.json'), '{}');
  return home;
}

function runSection(home, section, extraEnv = {}) {
  const env = { ...process.env, ...extraEnv, CLAUDE_TUNEUP_HOME: home };
  delete env.CLAUDE_CODE_DISABLE_AUTO_MEMORY;
  if (Object.hasOwn(extraEnv, 'CLAUDE_CODE_DISABLE_AUTO_MEMORY')) {
    env.CLAUDE_CODE_DISABLE_AUTO_MEMORY = extraEnv.CLAUDE_CODE_DISABLE_AUTO_MEMORY;
  }
  return JSON.parse(execFileSync(process.execPath, [path.join(SCRIPTS, 'scan.mjs'), '--section', section], {
    encoding: 'utf8', env,
  }))[section];
}

function scanMemory(home, extraEnv = {}) {
  return runSection(home, 'memory', extraEnv);
}

// A loaded-settings-file fixture in the shape gatherSettingsSnapshot produces, so
// auditSettings can be exercised with plain objects and no filesystem at all.
function settingsFile(file, data, { unknownKeys = [] } = {}) {
  return { file, exists: true, parses: true, data, keys: Object.keys(data), unknownKeys };
}

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

// Drive-letter paths are asserted on every OS, not just Windows: this was blind there for
// as long as it existed precisely because nothing but Windows ever fed it one.
test('checkCmdPath reads a Windows drive path, not just a POSIX one', () => {
  assert.deepEqual(
    checkCmdPath({ command: 'C:\\nope\\statusline.ps1' }).missing,
    ['C:\\nope\\statusline.ps1'],
  );
  assert.deepEqual(
    checkCmdPath({ command: 'C:/nope/statusline.ps1' }).missing,
    ['C:/nope/statusline.ps1'],
    'a drive path written with forward slashes is one path, not a "/nope/..." fragment',
  );
});

// The false positive this guards against is a Windows one — "C:\Program Files\..." is the
// normal place for an interpreter — but a space in a path is not platform-specific, so the
// test builds one anywhere.
test('checkCmdPath does not call an existing script missing because its path has a space', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tuneup cmd-'));
  const script = path.join(dir, 'hook.sh');
  fs.writeFileSync(script, '#!/bin/sh\n');
  assert.deepEqual(checkCmdPath({ command: `${script} --flag` }).missing, [],
    'stopping at the first space would report a script that is right there');
  fs.rmSync(dir, { recursive: true, force: true });
  // Once it really is gone it must be reported. Where exactly a spaced path ends is
  // unknowable, so this asserts that the directory is named, not the exact split.
  const gone = checkCmdPath({ command: `${script} --flag` }).missing;
  assert.ok(gone.length > 0, 'a deleted script is still a finding');
  assert.ok(gone.some((p) => script.startsWith(p)), 'the finding points at the missing script');
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

test('scan memory reports auto-memory enablement and does not guess a per-project directory', () => {
  const home = makeMemoryHome();
  let memory = scanMemory(home);
  assert.equal(memory.autoMemoryEnabled, true);
  assert.equal(memory.memoryScope, 'per-project');
  assert.equal(memory.memoryDir, null);

  memory = scanMemory(home, { CLAUDE_CODE_DISABLE_AUTO_MEMORY: '1' });
  assert.equal(memory.autoMemoryEnabled, false);

  fs.writeFileSync(path.join(home, '.claude', 'settings.json'), JSON.stringify({ autoMemoryEnabled: false }));
  memory = scanMemory(home);
  assert.equal(memory.autoMemoryEnabled, false);
  fs.rmSync(home, { recursive: true, force: true });
});

test('scan memory resolves global memory, observes team mount presence, and reports each SOUL status', () => {
  const home = makeMemoryHome();
  const claude = path.join(home, '.claude');
  const memoryPath = path.join(home, 'personal-memory');
  fs.mkdirSync(path.join(memoryPath, 'team'), { recursive: true });
  fs.writeFileSync(path.join(memoryPath, 'MEMORY.md'), 'index');
  fs.writeFileSync(path.join(memoryPath, 'preference.md'), 'brief');
  fs.writeFileSync(path.join(claude, 'settings.json'), JSON.stringify({ autoMemoryDirectory: '~/personal-memory' }));

  let memory = scanMemory(home);
  assert.equal(memory.autoMemoryDirectory, memoryPath);
  assert.equal(memory.memoryScope, 'global');
  assert.deepEqual(memory.memoryDir, { path: memoryPath, exists: true, fileCount: 2 });
  assert.equal(memory.teamMounts, true);
  assert.equal(memory.soulStatus, 'absent');

  fs.writeFileSync(path.join(claude, 'SOUL.md'), 'profile');
  memory = scanMemory(home);
  assert.equal(memory.soulStatus, 'present-unwired');

  fs.writeFileSync(path.join(claude, 'CLAUDE.md'), '@SOUL.md\n');
  memory = scanMemory(home);
  assert.equal(memory.soulStatus, 'present-wired');
  fs.rmSync(home, { recursive: true, force: true });
});

// The project dir name is an undocumented transform. We may derive a candidate, but we
// must never write to a path we only guessed — an unmatched cwd has to yield null.
test('memoryDir is null when no projects/ entry matches the cwd', () => {
  const home = makeMemoryHome();
  fs.mkdirSync(path.join(home, '.claude', 'projects', '-some-other-project', 'memory'), { recursive: true });
  const m = scanMemory(home);
  assert.equal(m.memoryDir, null);
  assert.equal(m.memoryScope, 'per-project');
  assert.equal(m.teamMounts, false);
  fs.rmSync(home, { recursive: true, force: true });
});

// --- rootFiles classification (v5.1) ---

test('rootFiles never routes the credential store or keybindings through the unknown flow', () => {
  const home = makeMemoryHome();
  const claude = path.join(home, '.claude');
  for (const name of ['.credentials.json', 'keybindings.json', 'settings.local.json', 'mystery.dat']) {
    fs.writeFileSync(path.join(claude, name), '{}');
  }
  const byName = Object.fromEntries(runSection(home, 'rootFiles').map(f => [f.name, f.class]));

  // The bug this fixes: both fell through to 'unknown', and the STEP 7 playbook
  // inspects + asks about anything unknown — so every run prompted the dev about
  // their own OAuth tokens.
  assert.equal(byName['.credentials.json'], 'secret-never-touch');
  assert.equal(byName['keybindings.json'], 'config-keep');
  assert.equal(byName['settings.local.json'], 'config-keep');
  assert.equal(byName['mystery.dat'], 'unknown', 'genuinely unknown files still route to inspect-and-ask');
  fs.rmSync(home, { recursive: true, force: true });
});

// --- settings.json semantics (v5.1) ---

test('parsePermissionRule reads Tool(spec) and bare Tool, and refuses to guess anything else', () => {
  assert.deepEqual(parsePermissionRule('Bash(npm run test:*)'),
    { rule: 'Bash(npm run test:*)', parsed: true, tool: 'Bash', spec: 'npm run test:*' });
  assert.deepEqual(parsePermissionRule('WebSearch'),
    { rule: 'WebSearch', parsed: true, tool: 'WebSearch', spec: '' });
  assert.equal(parsePermissionRule('mcp__server__tool(x').parsed, false);
});

test('permissionPathPrefix only fires on path-shaped specs and stops at the first glob', () => {
  assert.equal(permissionPathPrefix('npm run build'), null, 'a Bash spec is not a path');
  assert.equal(permissionPathPrefix('domain:example.com'), null, 'a WebFetch spec is not a path');
  assert.equal(permissionPathPrefix(''), null);
  assert.equal(permissionPathPrefix('//srv/data/**/*.md'), '/srv/data');
  assert.equal(permissionPathPrefix('/srv/data/notes.md'), '/srv/data/notes.md');
  assert.equal(permissionPathPrefix('/**'), null, 'a root-level glob names no checkable directory');
  // Windows shapes, asserted on every OS — this is pure string work, so there is no
  // reason for the coverage to depend on which runner happens to execute it.
  assert.equal(permissionPathPrefix('C:\\srv\\data\\**\\*.md'), 'C:\\srv\\data');
  assert.equal(permissionPathPrefix('C:/srv/data/**'), 'C:/srv/data',
    'the separator the rule used is the separator reported back');
  assert.equal(permissionPathPrefix('C:\\**'), null, 'a bare drive root is not checkable');
  assert.equal(permissionPathPrefix('domain:example.com'), null,
    'a multi-letter scheme is not a drive letter');
});

test('auditSettings finds dead paths, duplicate and contradictory rules, and which file wins', () => {
  const gone = '/deleted-project';
  const alive = '/live-project';
  // No filesystem at all: existsFn is a stub, not a real path check.
  const existsFn = (p) => p === alive;

  const base = settingsFile('settings.json', {
    model: 'some-pinned-model',
    permissions: {
      allow: ['Bash(npm run test:*)', 'Bash(npm run test:*)', `Read(${gone}/**)`, `Edit(${alive}/**)`],
      deny: ['Bash(npm run test:*)'],
    },
    statusLine: { type: 'command', command: '/no-such-statusline.sh' },
    hooks: { Stop: [{ hooks: [{ type: 'command', command: '/no-such-hook.sh' }] }] },
    env: { MY_API_KEY: 'sk-abcdefghijkl', DEBUG: '1' },
    cleanupPeriodDays: 30,
    someKeyFromANewerRelease: true,
  }, { unknownKeys: ['someKeyFromANewerRelease'] });
  const local = settingsFile('settings.local.json', {
    cleanupPeriodDays: 90,
    permissions: { allow: ['Bash(npm run test:*)'] },
  });

  const s = auditSettings(
    { loaded: [base, local], customStyles: [], configuredStyle: null, model: 'some-pinned-model' },
    { existsFn },
  );

  assert.deepEqual(s.permissions.duplicatedInSameList, ['settings.json|allow|Bash(npm run test:*)']);
  assert.deepEqual(s.permissions.duplicatedAcrossFiles, ['allow|Bash(npm run test:*)']);
  assert.deepEqual(s.permissions.allowDenyConflicts, ['Bash(npm run test:*)']);

  // Only the rule naming a directory that is really gone gets flagged.
  assert.deepEqual(s.permissions.pathMissing.map(r => r.pathPrefix), [gone]);

  assert.deepEqual(s.brokenPaths.map(b => b.where).sort(), ['hooks.Stop', 'statusLine.command']);
  // Only scalar keys override. `permissions` differs between the two files here and must
  // NOT be called a conflict — Claude Code concatenates the lists, so both still apply.
  assert.deepEqual(s.conflicts, [{ key: 'cleanupPeriodDays', effective: 'settings.local.json' }]);
  assert.equal(s.model, 'some-pinned-model');

  // Secret hygiene: the env var NAME is reported, the value never leaves the file.
  assert.deepEqual(s.envSecretHints, [{ file: 'settings.json', key: 'MY_API_KEY' }]);
  assert.equal(JSON.stringify(s).includes('sk-abcdefghijkl'), false);

  // An unrecognized key is surfaced but never proposed for removal.
  const baseOut = s.files.find(f => f.file === 'settings.json');
  assert.deepEqual(baseOut.unknownKeys, ['someKeyFromANewerRelease']);
});

test('auditSettings reports a malformed file instead of treating it as empty', () => {
  const malformed = { file: 'settings.json', exists: true, parses: false };
  const s = auditSettings({ loaded: [malformed], customStyles: [], configuredStyle: null, model: null });
  const base = s.files.find(f => f.file === 'settings.json');
  assert.deepEqual(base, malformed);
  assert.deepEqual(s.permissions.rules, [], 'an unparseable file contributes no rules');
});

test('auditSettings separates a custom output style from a built-in name', () => {
  const snapshot = { loaded: [], customStyles: ['terse'], configuredStyle: 'terse', model: null };
  let s = auditSettings(snapshot);
  assert.equal(s.outputStyle.matchesCustom, true);
  assert.deepEqual(s.outputStyle.customAvailable, ['terse']);

  s = auditSettings({ ...snapshot, configuredStyle: 'Explanatory' });
  assert.equal(s.outputStyle.matchesCustom, false, 'a built-in is not on disk — reported, not condemned');
});
