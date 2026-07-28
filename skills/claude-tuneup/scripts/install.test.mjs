import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// CLAUDE_DIR is derived from HOME at module load, so the redirect has to happen BEFORE the
// import — hence the dynamic import. Nothing here may touch a real install.
const HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'tuneup-install-'));
const CLAUDE = path.join(HOME, '.claude');
fs.mkdirSync(CLAUDE, { recursive: true });
process.env.CLAUDE_TUNEUP_HOME = HOME;

const {
  CONFIG_FILES, MERGED_SETTINGS_KEYS, SETTINGS_FILENAMES,
  claudeFile, effectiveSetting, effectiveString, liveSettings, memoryFile,
  resolveConfiguredPath, settingsFiles,
} = await import('./install.mjs');

const write = (name, value) =>
  fs.writeFileSync(path.join(CLAUDE, name), typeof value === 'string' ? value : JSON.stringify(value));
const clear = () => {
  for (const name of SETTINGS_FILENAMES) fs.rmSync(path.join(CLAUDE, name), { force: true });
};

test.beforeEach(clear);
test.after(() => fs.rmSync(HOME, { recursive: true, force: true }));

// --- reading ----------------------------------------------------------------

test('settingsFiles reports each file in precedence order, base first', () => {
  write('settings.json', { model: 'opus' });
  const files = settingsFiles();
  assert.deepEqual(files.map((f) => f.name), ['settings.json', 'settings.local.json']);
  assert.deepEqual(files[0].data, { model: 'opus' });
  assert.equal(files[1].exists, false);
});

test('a file that exists but is not usable JSON is distinguished from a missing one', () => {
  write('settings.json', '{ definitely not json');
  write('settings.local.json', '[1, 2, 3]');
  const [base, local] = settingsFiles();
  assert.deepEqual({ exists: base.exists, parses: base.parses }, { exists: true, parses: false });
  assert.deepEqual({ exists: local.exists, parses: local.parses }, { exists: true, parses: false },
    'a top-level array is not a settings object');
  assert.deepEqual(liveSettings(), []);
});

// --- precedence: the bug this module exists to make impossible ---------------

test('the local file wins for a scalar key', () => {
  write('settings.json', { model: 'sonnet', outputStyle: 'terse' });
  write('settings.local.json', { model: 'opus' });
  assert.equal(effectiveSetting('model'), 'opus');
  assert.equal(effectiveSetting('outputStyle'), 'terse', 'a key only the base file sets still applies');
});

test('a key set nowhere is undefined, and false is a value like any other', () => {
  write('settings.json', { autoMemoryEnabled: true });
  write('settings.local.json', { autoMemoryEnabled: false });
  assert.equal(effectiveSetting('autoMemoryEnabled'), false,
    'false must not be mistaken for unset — this is the whole auto-memory bug');
  assert.equal(effectiveSetting('nothingSetsThis'), undefined);
});

test('merged keys are refused, not answered wrong', () => {
  write('settings.json', { permissions: { allow: ['Bash'] } });
  for (const key of MERGED_SETTINGS_KEYS) {
    assert.throws(() => effectiveSetting(key), /merges this key/,
      `${key} is combined across files — there is no single effective value`);
  }
});

test('effectiveString narrows to a non-empty trimmed string', () => {
  write('settings.json', { model: '  opus  ', outputStyle: '   ' });
  assert.equal(effectiveString('model'), 'opus');
  assert.equal(effectiveString('outputStyle'), null);
  write('settings.local.json', { model: 42 });
  assert.equal(effectiveString('model'), null, 'a non-string is not a configured string');
});

// --- paths ------------------------------------------------------------------

test('a configured path resolves ~ against the redirected HOME, and passes absolutes through', () => {
  assert.equal(resolveConfiguredPath('~/memories'), path.join(HOME, 'memories'));
  assert.equal(resolveConfiguredPath('~\\memories'), path.join(HOME, 'memories'),
    'a Windows-style ~\\ is the same rule — a POSIX-only test here is how this stays broken');
  assert.equal(resolveConfiguredPath(path.join(HOME, 'elsewhere')), path.join(HOME, 'elsewhere'));
  for (const junk of [null, undefined, '', '   ', 7]) {
    assert.equal(resolveConfiguredPath(junk), null);
  }
});

test('claudeFile and memoryFile answer from the redirected install', () => {
  assert.equal(claudeFile('SOUL.md'), path.join(CLAUDE, 'SOUL.md'));
  assert.deepEqual(memoryFile('SOUL.md'), { path: path.join(CLAUDE, 'SOUL.md'), exists: false });
  fs.writeFileSync(path.join(CLAUDE, 'SOUL.md'), 'be terse');
  assert.deepEqual(memoryFile('SOUL.md'),
    { path: path.join(CLAUDE, 'SOUL.md'), exists: true, text: 'be terse' });
  fs.rmSync(path.join(CLAUDE, 'SOUL.md'));
});

// backup.mjs snapshots this list; restore.mjs keys its destinations off the basenames.
test('every snapshotted config has a distinct basename', () => {
  const names = CONFIG_FILES.map((file) => path.basename(file));
  assert.equal(new Set(names).size, names.length,
    'two configs sharing a basename would overwrite each other inside a restore point');
  assert.ok(names.includes('.claude.json'));
  assert.ok(CONFIG_FILES.every((file) => path.isAbsolute(file)));
});
