// End-to-end tests for the safety-critical paths: every script is run as a child
// process against a throwaway $CLAUDE_TUNEUP_HOME, exactly as the agent runs them.
// No mocks — real files, real moves, real restores.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SCRIPTS = path.dirname(fileURLToPath(import.meta.url));

// Fresh fake install per test: $HOME with .claude/, .claude.json, settings files.
function makeHome() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tuneup-int-'));
  const claude = path.join(home, '.claude');
  fs.mkdirSync(path.join(claude, 'hooks'), { recursive: true });
  fs.writeFileSync(path.join(home, '.claude.json'), JSON.stringify({ projects: {}, mcpServers: {} }));
  fs.writeFileSync(path.join(claude, 'settings.json'), JSON.stringify({}));
  fs.writeFileSync(path.join(claude, 'CLAUDE.md'), '# v1\n');
  return home;
}

function run(home, script, ...args) {
  return execFileSync(process.execPath, [path.join(SCRIPTS, script), ...args], {
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_TUNEUP_HOME: home, CLAUDE_TUNEUP_STATE: '' },
  });
}
const runJSON = (home, script, ...args) => JSON.parse(run(home, script, ...args));

test('scan --section hooks sees references in settings.local.json (not just settings.json)', () => {
  const home = makeHome();
  const claude = path.join(home, '.claude');
  fs.writeFileSync(path.join(claude, 'hooks', 'local-hook.sh'), '#!/bin/sh\n');
  fs.writeFileSync(path.join(claude, 'hooks', 'orphan.sh'), '#!/bin/sh\n');
  fs.writeFileSync(path.join(claude, 'settings.local.json'), JSON.stringify({
    hooks: { Stop: [{ hooks: [{ command: '~/.claude/hooks/local-hook.sh' }] }] },
  }));
  const { hooks } = runJSON(home, 'scan.mjs', '--section', 'hooks');
  assert.ok(hooks.referencedBySettings.includes('local-hook.sh'),
    'a hook wired only in settings.local.json must not be flagged as an orphan');
  assert.ok(hooks.onDiskNotReferenced.includes('orphan.sh'));
  assert.deepEqual(hooks.settingsChecked.sort(), ['settings.json', 'settings.local.json']);
  fs.rmSync(home, { recursive: true, force: true });
});

test('scan --section plugins refuses to trust an empty listing when content exists', () => {
  const home = makeHome();
  const plugins = path.join(home, '.claude', 'plugins');
  fs.mkdirSync(path.join(plugins, 'repos', 'some-plugin'), { recursive: true });
  fs.writeFileSync(path.join(plugins, 'repos', 'some-plugin', 'plugin.json'), '{}');
  // A manifest that parses but yields no plugins — e.g. a future format change.
  fs.writeFileSync(path.join(plugins, 'installed_plugins.json'), JSON.stringify({ version: 2 }));
  const { plugins: p } = runJSON(home, 'scan.mjs', '--section', 'plugins');
  assert.equal(p.installedCount, 0);
  assert.equal(p.listingReliable, false, 'empty listing + content on disk => unreliable');
  assert.ok(p.warning, 'must carry an explicit warning for the agent');
  fs.rmSync(home, { recursive: true, force: true });
});

test('scan --section plugins trusts a populated listing (flat-map format tolerated)', () => {
  const home = makeHome();
  const plugins = path.join(home, '.claude', 'plugins');
  fs.mkdirSync(path.join(plugins, 'repos', 'tool'), { recursive: true });
  fs.writeFileSync(path.join(plugins, 'repos', 'tool', 'x'), 'x');
  fs.writeFileSync(path.join(plugins, 'installed_plugins.json'),
    JSON.stringify({ 'tool@market': { version: '1.0.0' } })); // flat map, no "plugins" key
  const { plugins: p } = runJSON(home, 'scan.mjs', '--section', 'plugins');
  assert.equal(p.installedCount, 1);
  assert.equal(p.listingReliable, true);
  assert.deepEqual(p.installed, ['tool@market']);
  fs.rmSync(home, { recursive: true, force: true });
});

test('scan --section stateDirs: statsig is a regenerable hint, projects/ is dated by session files', () => {
  const home = makeHome();
  const claude = path.join(home, '.claude');
  fs.mkdirSync(path.join(claude, 'statsig'), { recursive: true });
  fs.writeFileSync(path.join(claude, 'statsig', 'flags.json'), '{}');
  const proj = path.join(claude, 'projects', 'proj-a');
  fs.mkdirSync(proj, { recursive: true });
  const oldSession = path.join(proj, 'old.jsonl');
  fs.writeFileSync(oldSession, '{}');
  fs.writeFileSync(path.join(proj, 'new.jsonl'), '{}');
  const old = new Date('2024-03-01T00:00:00Z');
  fs.utimesSync(oldSession, old, old);
  const { stateDirs } = runJSON(home, 'scan.mjs', '--section', 'stateDirs');
  const statsig = stateDirs.find(d => d.name === 'statsig');
  assert.equal(statsig.sessionHistory, false, 'statsig is telemetry cache, not history');
  assert.equal(statsig.hint, 'regenerable');
  const projects = stateDirs.find(d => d.name === 'projects');
  assert.equal(projects.sessionHistory, true);
  assert.equal(projects.span.count, 2, 'span counts session files, not project dirs');
  assert.equal(projects.span.oldest, '2024-03-01');
  fs.rmSync(home, { recursive: true, force: true });
});

test('backup -> stash -> restore roundtrip puts configs and removed items back', () => {
  const home = makeHome();
  const claude = path.join(home, '.claude');
  const victim = path.join(claude, 'old-skill');
  fs.mkdirSync(victim);
  fs.writeFileSync(path.join(victim, 'SKILL.md'), 'precious');

  const rp = run(home, 'backup.mjs', 'create').trim();
  assert.ok(fs.existsSync(path.join(rp, 'CLAUDE.md')), 'config snapshotted');
  assert.ok(rp.startsWith(path.join(home, '.claude-tuneup')), 'backups live under the (fake) home');

  run(home, 'backup.mjs', 'stash', rp, victim);
  assert.ok(!fs.existsSync(victim), 'stash moves the item away');

  // Mutate a config after the snapshot, then restore.
  fs.writeFileSync(path.join(claude, 'CLAUDE.md'), '# v2 (post-backup)\n');
  const res = runJSON(home, 'restore.mjs', 'apply', rp);
  assert.equal(res.scope, 'full');
  assert.equal(fs.readFileSync(path.join(claude, 'CLAUDE.md'), 'utf8'), '# v1\n', 'config rolled back');
  assert.equal(fs.readFileSync(path.join(victim, 'SKILL.md'), 'utf8'), 'precious', 'removed item is back');
  // The restore itself is reversible: current configs were saved aside first.
  assert.ok(res.preRestoreSnapshot && fs.existsSync(path.join(res.preRestoreSnapshot, 'CLAUDE.md')));
  assert.equal(fs.readFileSync(path.join(res.preRestoreSnapshot, 'CLAUDE.md'), 'utf8'), '# v2 (post-backup)\n');
  fs.rmSync(home, { recursive: true, force: true });
});

test('restore never clobbers a newer item that re-took a removed path (collision)', () => {
  const home = makeHome();
  const claude = path.join(home, '.claude');
  const victim = path.join(claude, 'thing.txt');
  fs.writeFileSync(victim, 'original');
  const rp = run(home, 'backup.mjs', 'create').trim();
  run(home, 'backup.mjs', 'stash', rp, victim);
  fs.writeFileSync(victim, 'newer content took the path'); // user recreated it after the run
  const res = runJSON(home, 'restore.mjs', 'apply', rp);
  assert.equal(res.collisions.length, 1);
  assert.equal(fs.readFileSync(victim, 'utf8'), 'newer content took the path', 'newer item untouched');
  assert.ok(res.collisions[0].restoredTo.includes('.restored-'));
  assert.equal(fs.readFileSync(res.collisions[0].restoredTo, 'utf8'), 'original', 'old item parked beside it');
  fs.rmSync(home, { recursive: true, force: true });
});

test('restore apply --configs-only leaves stashed items in the restore point', () => {
  const home = makeHome();
  const claude = path.join(home, '.claude');
  const victim = path.join(claude, 'keep-stashed.txt');
  fs.writeFileSync(victim, 'x');
  const rp = run(home, 'backup.mjs', 'create').trim();
  run(home, 'backup.mjs', 'stash', rp, victim);
  fs.writeFileSync(path.join(claude, 'CLAUDE.md'), '# changed\n');
  const res = runJSON(home, 'restore.mjs', 'apply', rp, '--configs-only');
  assert.equal(res.scope, 'configs-only');
  assert.equal(fs.readFileSync(path.join(claude, 'CLAUDE.md'), 'utf8'), '# v1\n', 'config restored');
  assert.ok(!fs.existsSync(victim), 'stashed item stays in the restore point');
  fs.rmSync(home, { recursive: true, force: true });
});

test('restore apply --items-only restores items but never touches configs', () => {
  const home = makeHome();
  const claude = path.join(home, '.claude');
  const victim = path.join(claude, 'bring-back.txt');
  fs.writeFileSync(victim, 'x');
  const rp = run(home, 'backup.mjs', 'create').trim();
  run(home, 'backup.mjs', 'stash', rp, victim);
  fs.writeFileSync(path.join(claude, 'CLAUDE.md'), '# kept as-is\n');
  const res = runJSON(home, 'restore.mjs', 'apply', rp, '--items-only');
  assert.equal(res.scope, 'items-only');
  assert.ok(fs.existsSync(victim), 'item restored');
  assert.equal(fs.readFileSync(path.join(claude, 'CLAUDE.md'), 'utf8'), '# kept as-is\n', 'configs untouched');
  assert.equal(res.preRestoreSnapshot, null, 'no config snapshot needed when configs are untouched');
  fs.rmSync(home, { recursive: true, force: true });
});

test('consolidate moves a skill to ~/.agents/skills and links back; --undo reverses it', (t) => {
  const home = makeHome();
  const src = path.join(home, '.claude', 'skills', 'my-skill');
  fs.mkdirSync(src, { recursive: true });
  fs.writeFileSync(path.join(src, 'SKILL.md'), 'content');
  let res;
  try {
    res = runJSON(home, 'consolidate.mjs', 'my-skill');
  } catch (e) {
    // Windows runners without Developer Mode may forbid even junctions in rare setups;
    // anywhere else this must work.
    if (process.platform === 'win32') return t.skip('symlink/junction not permitted on this runner');
    throw e;
  }
  assert.equal(res.ok, true);
  const dest = path.join(home, '.agents', 'skills', 'my-skill');
  assert.ok(fs.lstatSync(src).isSymbolicLink(), 'a link was left behind');
  assert.equal(fs.readFileSync(path.join(src, 'SKILL.md'), 'utf8'), 'content', 'link resolves');
  assert.ok(fs.existsSync(path.join(dest, 'SKILL.md')));
  const undo = runJSON(home, 'consolidate.mjs', 'my-skill', '--undo');
  assert.equal(undo.ok, true);
  assert.ok(fs.lstatSync(src).isDirectory() && !fs.lstatSync(src).isSymbolicLink(), 'real dir is back');
  fs.rmSync(home, { recursive: true, force: true });
});

test('validate-json passes good JSON and fails broken JSON with a useful error', () => {
  const home = makeHome();
  const good = path.join(home, 'good.json');
  const bad = path.join(home, 'bad.json');
  fs.writeFileSync(good, '{"a":1}');
  fs.writeFileSync(bad, '{"a":1,}');
  assert.equal(JSON.parse(run(home, 'validate-json.mjs', good)).ok, true);
  let failed = false;
  try { run(home, 'validate-json.mjs', bad); }
  catch (e) {
    failed = true;
    const lines = e.stdout.trim().split('\n').map(l => JSON.parse(l));
    assert.equal(lines[0].ok, false);
    assert.ok(lines[0].error.length > 0);
  }
  assert.ok(failed, 'broken JSON must exit non-zero');
  fs.rmSync(home, { recursive: true, force: true });
});
