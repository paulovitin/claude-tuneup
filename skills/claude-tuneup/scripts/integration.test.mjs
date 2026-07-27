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

// --- AGENTS.md bridge (v0.4.0) ---

test('scan --section memory: drift detected, then cleared by the @AGENTS.md shim', () => {
  const home = makeHome();
  const claude = path.join(home, '.claude');
  const six = Array.from({ length: 6 }, (_, i) => `- rule ${i}`).join('\n');
  fs.writeFileSync(path.join(claude, 'CLAUDE.md'), six);
  fs.writeFileSync(path.join(claude, 'AGENTS.md'), six + '\n- diverged');
  let { memory } = runJSON(home, 'scan.mjs', '--section', 'memory');
  assert.equal(memory.drift, true, 'two substantive, unlinked files = drift');
  assert.equal(memory.linkStyle, 'none');

  // The recommended fix: CLAUDE.md becomes a shim importing the shared truth.
  fs.writeFileSync(path.join(claude, 'CLAUDE.md'), '@AGENTS.md\n@SOUL.md\n- claude-only: prefer bun\n');
  fs.writeFileSync(path.join(claude, 'SOUL.md'), '- tone: dry\n');
  ({ memory } = runJSON(home, 'scan.mjs', '--section', 'memory'));
  assert.equal(memory.drift, false);
  assert.equal(memory.linkStyle, 'import');
  assert.equal(memory.importsSoul, true);
  assert.ok(memory.combinedApproxTokens > memory.files['CLAUDE.md'].approxTokens,
    'combined counts the imported files too');

  // And the classifier protects it: AGENTS.md is config, not cleanup fodder.
  const { rootFiles } = runJSON(home, 'scan.mjs', '--section', 'rootFiles');
  assert.equal(rootFiles.find(f => f.name === 'AGENTS.md').class, 'config-keep');
  fs.rmSync(home, { recursive: true, force: true });
});

test('AGENTS.md is snapshotted and restored like the other configs', () => {
  const home = makeHome();
  const claude = path.join(home, '.claude');
  const agents = path.join(claude, 'AGENTS.md');
  fs.writeFileSync(agents, '# shared truth v1\n');
  const rp = run(home, 'backup.mjs', 'create').trim();
  assert.ok(fs.existsSync(path.join(rp, 'AGENTS.md')), 'snapshot includes AGENTS.md');
  fs.writeFileSync(agents, '# botched edit v2\n');
  runJSON(home, 'restore.mjs', 'apply', rp, '--configs-only');
  assert.equal(fs.readFileSync(agents, 'utf8'), '# shared truth v1\n');
  fs.rmSync(home, { recursive: true, force: true });
});

// --- v5.1: resident surfaces, settings semantics, cross-run ledger ---

test('a full install scan never routes the credential store into the ask-the-dev flow', () => {
  const home = makeHome();
  const claude = path.join(home, '.claude');
  fs.writeFileSync(path.join(claude, '.credentials.json'), JSON.stringify({ token: 'oauth-secret-value' }));
  fs.writeFileSync(path.join(claude, 'keybindings.json'), JSON.stringify({ bindings: [] }));

  // Every section at once, exactly as a `--dry-run` would gather it.
  const all = run(home, 'scan.mjs');
  assert.equal(all.includes('oauth-secret-value'), false, 'a credential value must never enter the scan output');

  const { rootFiles } = JSON.parse(all);
  const credentials = rootFiles.find((f) => f.name === '.credentials.json');
  assert.equal(credentials.class, 'secret-never-touch');
  assert.equal(rootFiles.find((f) => f.name === 'keybindings.json').class, 'config-keep');
  assert.equal(rootFiles.some((f) => f.class === 'unknown'), false,
    'nothing in a stock install should reach STEP 7 as unidentifiable');
  fs.rmSync(home, { recursive: true, force: true });
});

test('surfaces and settings agree about which output style is actually loaded', () => {
  const home = makeHome();
  const claude = path.join(home, '.claude');
  fs.mkdirSync(path.join(claude, 'output-styles'), { recursive: true });
  fs.writeFileSync(path.join(claude, 'output-styles', 'terse.md'),
    '---\nname: terse\ndescription: short\n---\nBe brief.\n');
  fs.mkdirSync(path.join(claude, 'commands', 'git'), { recursive: true });
  fs.writeFileSync(path.join(claude, 'commands', 'git', 'commit.md'),
    '---\ndescription: commit the staged diff\n---\nbody\n');
  fs.writeFileSync(path.join(claude, 'settings.json'), JSON.stringify({ outputStyle: 'terse' }));

  const surfaces = runJSON(home, 'audit-instructions.mjs', '--surfaces');
  const { settings } = runJSON(home, 'scan.mjs', '--section', 'settings');

  assert.equal(surfaces.activeOutputStyle, 'terse');
  assert.equal(settings.outputStyle.matchesCustom, true);
  assert.deepEqual(settings.outputStyle.customAvailable, ['terse']);
  assert.ok(surfaces.surfaces.some((s) => s.kind === 'command' && s.name === 'git:commit'));
  fs.rmSync(home, { recursive: true, force: true });
});

test('settings scan flags a statusLine pointing at a script that was deleted', () => {
  const home = makeHome();
  const claude = path.join(home, '.claude');
  const script = path.join(claude, 'statusline.sh');
  fs.writeFileSync(path.join(claude, 'settings.json'), JSON.stringify({
    statusLine: { type: 'command', command: script },
  }));

  fs.writeFileSync(script, '#!/bin/sh\n');
  let { settings } = runJSON(home, 'scan.mjs', '--section', 'settings');
  assert.deepEqual(settings.brokenPaths, [], 'a script that exists is not a finding');

  fs.rmSync(script);
  ({ settings } = runJSON(home, 'scan.mjs', '--section', 'settings'));
  assert.deepEqual(settings.brokenPaths, [
    { file: 'settings.json', where: 'statusLine.command', missing: script },
  ]);
  fs.rmSync(home, { recursive: true, force: true });
});

test('the ledger survives a restore, because undo must not erase what the dev decided', () => {
  const home = makeHome();
  const state = path.join(home, '.claude-tuneup');
  const ledgerRun = (...args) => JSON.parse(execFileSync(process.execPath,
    [path.join(SCRIPTS, 'ledger.mjs'), ...args],
    { encoding: 'utf8', env: { ...process.env, CLAUDE_TUNEUP_HOME: home, CLAUDE_TUNEUP_STATE: state } }));

  const { key } = ledgerRun('key', 'rule', path.join(home, '.claude', 'CLAUDE.md'), 'keep my absolute');
  ledgerRun('decide', key, 'keep', '--run', 'r1');

  // A real restore point, then a real restore over it.
  const rp = execFileSync(process.execPath, [path.join(SCRIPTS, 'backup.mjs'), 'create'],
    { encoding: 'utf8', env: { ...process.env, CLAUDE_TUNEUP_HOME: home, CLAUDE_TUNEUP_STATE: state } }).trim();
  fs.writeFileSync(path.join(home, '.claude', 'CLAUDE.md'), '# edited\n');
  execFileSync(process.execPath, [path.join(SCRIPTS, 'restore.mjs'), 'apply', rp],
    { encoding: 'utf8', env: { ...process.env, CLAUDE_TUNEUP_HOME: home, CLAUDE_TUNEUP_STATE: state } });

  assert.equal(fs.readFileSync(path.join(home, '.claude', 'CLAUDE.md'), 'utf8'), '# v1\n');
  assert.deepEqual(ledgerRun('check', key).declined, [key],
    'the ledger lives outside the backups and must outlive a restore');
  fs.rmSync(home, { recursive: true, force: true });
});

// --- v5.1: tracing a symptom back to the run that caused it ---

test('search traces a symptom to the run that removed it, ranked, without reading token files', () => {
  const home = makeHome();
  const claude = path.join(home, '.claude');
  const skill = path.join(claude, 'skills', 'deploy');
  fs.mkdirSync(skill, { recursive: true });
  fs.writeFileSync(path.join(skill, 'SKILL.md'), 'deploy steps');
  fs.writeFileSync(path.join(home, '.claude.json'),
    JSON.stringify({ projects: {}, mcpServers: {}, oauthAccount: 'token-shaped-secret' }));
  fs.writeFileSync(path.join(claude, 'CLAUDE.md'), '- always squash before merging\n');

  const rp = run(home, 'backup.mjs', 'create').trim();
  run(home, 'backup.mjs', 'stash', rp, skill);

  const found = runJSON(home, 'restore.mjs', 'search', 'deploy');
  assert.equal(found.points.length, 1);
  const hit = found.points[0];
  assert.equal(hit.path, rp);
  assert.equal(hit.items[0].original, skill);
  assert.equal(hit.items[0].recoverable, true, 'the stashed copy is still there to put back');

  // The snapshotted memory files are searchable, so "the rule about X is gone" is findable.
  const byRule = runJSON(home, 'restore.mjs', 'search', 'squash');
  assert.equal(byRule.points[0].memory[0].file, 'CLAUDE.md');
  assert.match(byRule.points[0].memory[0].text, /squash before merging/);

  // .claude.json is snapshotted but never searched — a hit would print its contents.
  const secrets = runJSON(home, 'restore.mjs', 'search', 'oauthAccount', 'token-shaped-secret');
  assert.deepEqual(secrets.points, []);
  fs.rmSync(home, { recursive: true, force: true });
});

test('search ranks by how many terms hit and reports when nothing matches', () => {
  const home = makeHome();
  const claude = path.join(home, '.claude');
  const strong = path.join(claude, 'skills', 'deploy-helper');
  const weak = path.join(claude, 'skills', 'notes');
  for (const dir of [strong, weak]) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'SKILL.md'), 'x');
  }
  const older = run(home, 'backup.mjs', 'create').trim();
  run(home, 'backup.mjs', 'stash', older, weak);
  const newer = run(home, 'backup.mjs', 'create').trim();
  run(home, 'backup.mjs', 'stash', newer, strong);

  const found = runJSON(home, 'restore.mjs', 'search', 'deploy', 'helper', 'notes');
  assert.equal(found.points[0].path, newer, 'two terms beat one');
  assert.equal(found.points[0].score, 2);
  assert.equal(found.points[1].score, 1);

  assert.deepEqual(runJSON(home, 'restore.mjs', 'search', 'nothingmatchesthis').points, [],
    'an empty result must be reportable, not an error');
  fs.rmSync(home, { recursive: true, force: true });
});

test('apply --only puts back one item and leaves the rest of the run applied', () => {
  const home = makeHome();
  const claude = path.join(home, '.claude');
  const wanted = path.join(claude, 'skills', 'deploy');
  const other = path.join(claude, 'skills', 'obsolete');
  for (const dir of [wanted, other]) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'SKILL.md'), 'x');
  }
  const rp = run(home, 'backup.mjs', 'create').trim();
  run(home, 'backup.mjs', 'stash', rp, wanted);
  run(home, 'backup.mjs', 'stash', rp, other);
  fs.writeFileSync(path.join(claude, 'CLAUDE.md'), '# edited by the run\n');

  const result = runJSON(home, 'restore.mjs', 'apply', rp, '--only', wanted);
  assert.equal(result.ok, true);
  assert.equal(result.scope, 'single-item');
  assert.ok(fs.existsSync(path.join(wanted, 'SKILL.md')), 'the one item the dev named comes back');
  assert.equal(fs.existsSync(other), false, 'the removal they were happy with stays removed');
  assert.equal(fs.readFileSync(path.join(claude, 'CLAUDE.md'), 'utf8'), '# edited by the run\n',
    'a surgical restore must not revert config edits');
  fs.rmSync(home, { recursive: true, force: true });
});

test('apply --only refuses an unknown path instead of restoring the wrong thing', () => {
  const home = makeHome();
  const rp = run(home, 'backup.mjs', 'create').trim();
  assert.throws(
    () => run(home, 'restore.mjs', 'apply', rp, '--only', path.join(home, '.claude', 'skills', 'never-removed')),
    /Command failed/,
    'no fuzzy matching — restoring the wrong path is worse than asking again',
  );
  fs.rmSync(home, { recursive: true, force: true });
});

test('apply --only with no path says what is missing instead of throwing a stack trace', () => {
  const home = makeHome();
  const rp = run(home, 'backup.mjs', 'create').trim();
  try {
    run(home, 'restore.mjs', 'apply', rp, '--only');
    assert.fail('expected a non-zero exit');
  } catch (err) {
    const stderr = String(err.stderr || '');
    assert.match(stderr, /--only needs a path/, 'the dev is told what to supply');
    assert.doesNotMatch(stderr, /ERR_INVALID_ARG_TYPE/,
      'a recovery flow must not answer with an internal stack trace');
  }
  fs.rmSync(home, { recursive: true, force: true });
});

test('apply --only parks a collision beside the path instead of clobbering a newer file', () => {
  const home = makeHome();
  const claude = path.join(home, '.claude');
  const skill = path.join(claude, 'skills', 'deploy');
  fs.mkdirSync(skill, { recursive: true });
  fs.writeFileSync(path.join(skill, 'SKILL.md'), 'original');
  const rp = run(home, 'backup.mjs', 'create').trim();
  run(home, 'backup.mjs', 'stash', rp, skill);

  // The dev rebuilt it by hand before asking for the restore.
  fs.mkdirSync(skill, { recursive: true });
  fs.writeFileSync(path.join(skill, 'SKILL.md'), 'rewritten by hand');

  const result = runJSON(home, 'restore.mjs', 'apply', rp, '--only', skill);
  assert.ok(result.collision, 'the newer file must survive');
  assert.equal(fs.readFileSync(path.join(skill, 'SKILL.md'), 'utf8'), 'rewritten by hand');
  assert.equal(fs.readFileSync(path.join(result.restored, 'SKILL.md'), 'utf8'), 'original');
  fs.rmSync(home, { recursive: true, force: true });
});

// --- v5.1: a run adds as well as subtracts, and undo has to reverse both ---

test('full restore undoes what the run ADDED, not just what it removed', () => {
  const home = makeHome();
  const claude = path.join(home, '.claude');
  const removed = path.join(claude, 'skills', 'obsolete');
  fs.mkdirSync(removed, { recursive: true });
  fs.writeFileSync(path.join(removed, 'SKILL.md'), 'old');

  const rp = run(home, 'backup.mjs', 'create').trim();
  run(home, 'backup.mjs', 'stash', rp, removed);

  // What STEP 17 does: writes a new skill, then records it.
  const added = path.join(claude, 'skills', 'deploy-dance');
  fs.mkdirSync(added, { recursive: true });
  fs.writeFileSync(path.join(added, 'SKILL.md'), 'new skill this run wrote');
  run(home, 'backup.mjs', 'created', rp, added);

  const result = runJSON(home, 'restore.mjs', 'apply', rp);
  assert.ok(fs.existsSync(path.join(removed, 'SKILL.md')), 'the removal is reversed');
  assert.equal(fs.existsSync(added), false, '"undo everything" must also undo the additions');
  assert.equal(result.undoneCreations.length, 1);
  assert.equal(result.undoneCreations[0].created, added);

  // Moved, never deleted: the dev may have edited the skill this tool wrote for them.
  assert.equal(fs.readFileSync(path.join(result.undoneCreations[0].movedTo, 'SKILL.md'), 'utf8'),
    'new skill this run wrote');
  fs.rmSync(home, { recursive: true, force: true });
});

test('search separates what a run added from what it removed', () => {
  const home = makeHome();
  const claude = path.join(home, '.claude');
  const added = path.join(claude, 'skills', 'deploy-dance');
  fs.mkdirSync(added, { recursive: true });
  fs.writeFileSync(path.join(added, 'SKILL.md'), 'x');

  const rp = run(home, 'backup.mjs', 'create').trim();
  run(home, 'backup.mjs', 'created', rp, added);

  const found = runJSON(home, 'restore.mjs', 'search', 'deploy');
  assert.deepEqual(found.points[0].items, [], 'nothing was removed');
  assert.equal(found.points[0].created[0].path, added);
  assert.equal(found.points[0].created[0].stillPresent, true);
  // The two need opposite fixes, so the direction can never be inferred from the path.
  assert.match(found.note, /undo takes them away/);
  fs.rmSync(home, { recursive: true, force: true });
});

test('apply --only takes away a created item instead of trying to restore it', () => {
  const home = makeHome();
  const claude = path.join(home, '.claude');
  const added = path.join(claude, 'skills', 'shadowing');
  fs.mkdirSync(added, { recursive: true });
  fs.writeFileSync(path.join(added, 'SKILL.md'), 'steals routing from an existing skill');

  const rp = run(home, 'backup.mjs', 'create').trim();
  run(home, 'backup.mjs', 'created', rp, added);
  fs.writeFileSync(path.join(claude, 'CLAUDE.md'), '# edited by the run\n');

  const result = runJSON(home, 'restore.mjs', 'apply', rp, '--only', added);
  assert.equal(result.scope, 'single-item-creation');
  assert.equal(fs.existsSync(added), false);
  assert.ok(fs.existsSync(path.join(result.movedTo, 'SKILL.md')), 'recoverable, not deleted');
  assert.equal(fs.readFileSync(path.join(claude, 'CLAUDE.md'), 'utf8'), '# edited by the run\n',
    'the rest of the run stays applied');
  fs.rmSync(home, { recursive: true, force: true });
});

test('restore list reports both directions so a dev can see what a run actually did', () => {
  const home = makeHome();
  const claude = path.join(home, '.claude');
  const gone = path.join(claude, 'skills', 'old');
  const born = path.join(claude, 'skills', 'new');
  for (const dir of [gone, born]) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'SKILL.md'), 'x');
  }
  const rp = run(home, 'backup.mjs', 'create').trim();
  run(home, 'backup.mjs', 'stash', rp, gone);
  run(home, 'backup.mjs', 'created', rp, born);

  const entry = runJSON(home, 'restore.mjs', 'list').find((p) => p.path === rp);
  assert.equal(entry.removedCount, 1);
  assert.equal(entry.createdCount, 1);
  fs.rmSync(home, { recursive: true, force: true });
});
