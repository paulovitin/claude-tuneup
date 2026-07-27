import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { decisionKey } from './ledger.mjs';

const SCRIPTS = path.dirname(fileURLToPath(import.meta.url));
const LEDGER = path.join(SCRIPTS, 'ledger.mjs');

function makeHome() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tuneup-ledger-'));
  fs.mkdirSync(path.join(home, '.claude'), { recursive: true });
  return home;
}

// Every call is a child process with both HOME and the state base redirected, so a test
// can never read or write the real ledger.
function run(home, ...args) {
  const options = {
    encoding: 'utf8',
    env: {
      ...process.env,
      CLAUDE_TUNEUP_HOME: home,
      CLAUDE_TUNEUP_STATE: path.join(home, '.claude-tuneup'),
    },
  };
  let stdout;
  // A rejected command exits non-zero *and* prints its reason as JSON. Read both.
  try { stdout = execFileSync(process.execPath, [LEDGER, ...args], options); }
  catch (error) { stdout = (error.stdout || '').toString(); }
  return stdout.trim() ? JSON.parse(stdout) : null;
}

const ledgerPath = (home) => path.join(home, '.claude-tuneup', 'ledger.json');

test('a decision key follows the text, not the file — rewriting a rule reopens it', () => {
  const rule = 'never write comments';
  const a = decisionKey('rule', '/home/u/.claude/CLAUDE.md', rule);
  const b = decisionKey('rule', '/home/u/.claude/CLAUDE.md', rule);
  assert.equal(a, b, 'the same text must be stable across runs');

  // Reflowing whitespace is not a rewrite.
  assert.equal(decisionKey('rule', '/f.md', 'never  write\n  comments'), decisionKey('rule', '/f.md', 'never write comments'));

  // Actually changing the wording is: the dev never approved the new sentence.
  assert.notEqual(a, decisionKey('rule', '/home/u/.claude/CLAUDE.md', 'never write comments unless asked'));
  // And the same sentence in a different file is a different decision.
  assert.notEqual(a, decisionKey('rule', '/home/u/.claude/AGENTS.md', rule));
});

test('the ledger stores the hash and the verdict, never the instruction text', () => {
  const home = makeHome();
  const secretish = 'never deploy using the acme-prod-hostname runbook';
  const { key } = run(home, 'key', 'rule', '/x/CLAUDE.md', secretish);

  run(home, 'decide', key, 'keep', '--run', 'r1');
  const raw = fs.readFileSync(ledgerPath(home), 'utf8');
  assert.equal(raw.includes('acme-prod-hostname'), false, 'the dev\'s own words must not be persisted');
  assert.ok(raw.includes(key));
  fs.rmSync(home, { recursive: true, force: true });
});

test('check separates what the dev already declined from what has never been asked', () => {
  const home = makeHome();
  const kept = decisionKey('rule', '/x', 'a');
  const applied = decisionKey('rule', '/x', 'b');
  const fresh = decisionKey('rule', '/x', 'c');

  run(home, 'decide', kept, 'keep', '--run', 'r1');
  run(home, 'decide', applied, 'applied', '--run', 'r1');

  const result = run(home, 'check', kept, applied, fresh);
  assert.deepEqual(result.declined, [kept], 'only "keep" suppresses a re-ask');
  assert.deepEqual(result.unseen, [fresh]);
  assert.deepEqual(result.known.map((d) => d.verdict).sort(), ['applied', 'keep']);
  fs.rmSync(home, { recursive: true, force: true });
});

test('deciding the same key twice keeps one standing verdict, the latest', () => {
  const home = makeHome();
  const key = decisionKey('rule', '/x', 'a');
  run(home, 'decide', key, 'keep');
  run(home, 'decide', key, 'deleted');
  const result = run(home, 'check', key);
  assert.equal(result.known.length, 1);
  assert.equal(result.known[0].verdict, 'deleted');
  assert.deepEqual(result.declined, []);
  fs.rmSync(home, { recursive: true, force: true });
});

test('an unknown verdict is refused instead of silently recorded', () => {
  const home = makeHome();
  const result = run(home, 'decide', 'rule:/x:abc', 'maybe');
  assert.equal(result.ok, false);
  assert.match(result.reason, /unknown verdict/);
  assert.equal(fs.existsSync(ledgerPath(home)), false, 'a rejected verdict must not create a ledger');
  fs.rmSync(home, { recursive: true, force: true });
});

test('trend is silent on a first run and reports growth against the previous one', () => {
  const home = makeHome();
  const claudeMd = path.join(home, '.claude', 'CLAUDE.md');
  fs.writeFileSync(claudeMd, '- one rule\n');

  const first = run(home, 'trend');
  assert.equal(first.firstRun, true);
  assert.equal(first.message, null, 'nothing to compare against yet — STEP 0 stays quiet');

  const recorded = run(home, 'record-run', '--groups', 'instructions', '--changes', '3', '--id', 'r1');
  assert.equal(recorded.groups[0], 'instructions');
  assert.equal(recorded.changes, 3);
  assert.ok(recorded.residentTokens > 0);
  assert.equal(recorded.diskBytes, undefined, 'disk is opt-in — walking the install is expensive');

  // Same install, no growth: still nothing worth interrupting for.
  assert.equal(run(home, 'trend').message, null);

  // The file grows back, which is the whole reason this exists.
  fs.writeFileSync(claudeMd, '- one rule\n' + '- another rule that costs tokens\n'.repeat(40));
  const grown = run(home, 'trend');
  assert.ok(grown.delta > 0);
  assert.match(grown.message, /Resident context is up/);
  assert.equal(grown.previousRun.id, 'r1');
  fs.rmSync(home, { recursive: true, force: true });
});

test('record-run --disk measures the install only when asked', () => {
  const home = makeHome();
  fs.writeFileSync(path.join(home, '.claude', 'CLAUDE.md'), '- rule\n');
  const recorded = run(home, 'record-run', '--id', 'r1', '--disk');
  assert.equal(typeof recorded.diskBytes, 'number');
  assert.ok(recorded.diskBytes > 0);
  fs.rmSync(home, { recursive: true, force: true });
});

test('reverting an undone run drops its decisions but keeps every other run\'s', () => {
  const home = makeHome();
  const fromR1 = decisionKey('rule', '/x', 'a');
  const fromR2 = decisionKey('rule', '/x', 'b');
  run(home, 'decide', fromR1, 'keep', '--run', 'r1');
  run(home, 'decide', fromR2, 'keep', '--run', 'r2');
  run(home, 'record-run', '--id', 'r1');

  const reverted = run(home, 'revert-run', 'r1');
  assert.equal(reverted.dropped, 1);

  const result = run(home, 'check', fromR1, fromR2);
  assert.deepEqual(result.unseen, [fromR1], 'an undone run must stop suppressing its own questions');
  assert.deepEqual(result.declined, [fromR2]);
  fs.rmSync(home, { recursive: true, force: true });
});

test('a corrupt ledger costs a round of re-asking, never the run', () => {
  const home = makeHome();
  fs.mkdirSync(path.dirname(ledgerPath(home)), { recursive: true });
  fs.writeFileSync(ledgerPath(home), '{ this is not json');

  const result = run(home, 'check', 'rule:/x:abc');
  assert.deepEqual(result, { known: [], declined: [], unseen: ['rule:/x:abc'] });
  assert.equal(run(home, 'trend').firstRun, true);
  fs.rmSync(home, { recursive: true, force: true });
});

test('the ledger lives outside the backups so restoring a run cannot erase it', () => {
  const home = makeHome();
  run(home, 'decide', decisionKey('rule', '/x', 'a'), 'keep');
  const backups = path.join(home, '.claude-tuneup', 'backups');
  assert.equal(ledgerPath(home).startsWith(backups), false);
  assert.ok(fs.existsSync(ledgerPath(home)));
  fs.rmSync(home, { recursive: true, force: true });
});

// --- retry after an undo (v5.1) ---

test('a retry without a stated reason is refused — that is just the same run again', () => {
  const home = makeHome();
  assert.match(run(home, 'record-retry', '--of', 'r1').reason, /needs --reason/);
  assert.match(run(home, 'record-retry', '--of', 'r1', '--reason', '   ').reason, /needs --reason/);
  assert.match(run(home, 'record-retry', '--reason', 'it broke things').reason, /needs --of/);
  assert.equal(fs.existsSync(ledgerPath(home)), false, 'a refused retry must not create a ledger');
  fs.rmSync(home, { recursive: true, force: true });
});

test('the retry reason is kept verbatim and survives reverting the run it describes', () => {
  const home = makeHome();
  run(home, 'record-run', '--id', 'r1', '--groups', 'cleanup');
  const recorded = run(home, 'record-retry', '--of', 'r1',
    '--category', 'deleted-something-needed',
    '--reason', 'it deleted the deploy skill I still use');
  assert.equal(recorded.ok, true);
  assert.equal(recorded.retry.reason, 'it deleted the deploy skill I still use');
  assert.equal(recorded.retry.category, 'deleted-something-needed');

  // Undoing the run erases what it decided, never why it was thrown away.
  run(home, 'revert-run', 'r1');
  const after = run(home, 'retries', '--of', 'r1');
  assert.equal(after.retries.length, 1);
  assert.equal(after.retries[0].reason, 'it deleted the deploy skill I still use');
  fs.rmSync(home, { recursive: true, force: true });
});

test('chain depth counts real attempts, so the two-failure cap is a number and not a feeling', () => {
  const home = makeHome();
  const first = run(home, 'record-retry', '--of', 'r1', '--id', 'r2', '--reason', 'deleted my skill');
  assert.equal(first.depth, 1);

  const second = run(home, 'record-retry', '--of', 'r2', '--id', 'r3', '--reason', 'still too aggressive');
  assert.equal(second.depth, 2, 'at 2 the skill must stop offering another sweep');

  // A second attempt has to satisfy the FIRST complaint too, or it fixes the newest one
  // by reintroducing the oldest — so the whole lineage comes back, oldest first.
  const lineage = run(home, 'retries', '--of', 'r3');
  assert.deepEqual(lineage.retries.map((r) => r.reason), ['deleted my skill', 'still too aggressive']);
  fs.rmSync(home, { recursive: true, force: true });
});

test('a retry run is linked to the attempt it replaces', () => {
  const home = makeHome();
  fs.writeFileSync(path.join(home, '.claude', 'CLAUDE.md'), '- rule\n');
  const retryRun = run(home, 'record-run', '--id', 'r2', '--retry-of', 'r1', '--groups', 'cleanup');
  assert.equal(retryRun.retryOf, 'r1');

  // An ordinary run carries no lineage at all.
  assert.equal(run(home, 'record-run', '--id', 'r3').retryOf, undefined);
  fs.rmSync(home, { recursive: true, force: true });
});

test('retries recorded against an undone run are findable by that run id', () => {
  const home = makeHome();
  run(home, 'record-retry', '--of', 'r1', '--reason', 'broke my settings');
  // Right after an undo the skill only knows the id it just reverted.
  const found = run(home, 'retries', '--of', 'r1');
  assert.equal(found.retries.length, 1);
  assert.equal(found.retries[0].retryOf, 'r1');
  fs.rmSync(home, { recursive: true, force: true });
});
