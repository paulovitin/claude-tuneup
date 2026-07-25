import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { REPORT_ONLY, RECURSION_GUARD, buildArgv, generate, parseReport } from './doctor.mjs';

const fixturePath = fileURLToPath(new URL('./fixtures/doctor-report.md', import.meta.url));
const fixture = fs.readFileSync(fixturePath, 'utf8');

test('buildArgv keeps the verbatim report-only safety instruction inside /doctor argv', () => {
  const argv = buildArgv();
  assert.deepEqual(argv, ['-p', `/doctor ${REPORT_ONLY}`]);
  assert.equal(argv.length, 2, 'the instruction must not become a separate argv entry');
  assert.ok(argv[1].includes(REPORT_ONLY));
});

test('parseReport reads all non-contiguous checks and their sections', () => {
  const result = parseReport(fixture);
  assert.equal(result.ok, true);
  assert.deepEqual(result.checks.map((check) => check.n), [0, 1, 2, 3, 4, 7, 8, 9, 5, 6]);
  assert.equal(result.checks.length, 10);
  assert.equal(result.checks.some((check) => check.n >= 10), false);
  for (const check of result.checks) {
    const expected = check.n === 5 || check.n === 6 ? 'warnings' : 'proposed';
    assert.equal(check.section, expected);
  }
  assert.equal(result.checks.find((check) => check.n === 0).title, 'setup health: nothing wrong');
});

test('parseReport retains the seven detail fields and normalizes only known verdict prefixes', () => {
  const result = parseReport(fixture);
  assert.equal(result.detail.length, 16);
  for (const row of result.detail) {
    assert.equal(Object.keys(row).filter((key) => key !== 'verdict').length, 7);
  }
  assert.equal(result.detail[0].verdict, 'keep');
  assert.equal(result.detail.find((row) => row.component === '`example-connector-a`').verdict, 'remove');
  assert.equal(result.detail.find((row) => row.component.startsWith('3 skills')).verdict, 'not touching');

  const fabricated = parseReport(`## Detail\n| Component | Type | Scope | Uses (total since install) | Used in window? | Est. resident tokens | Verdict |\n|---|---|---|---|---|---|---|\n| odd | skill | user | 0 | no | 0 | maybe later |\n\n## Proposed actions\n### Check 0 — still valid`);
  assert.equal(fabricated.ok, true);
  assert.equal(fabricated.detail.length, 1);
  assert.equal(fabricated.detail[0].verdict, null);
  assert.equal(fabricated.detail[0].verdictRaw, 'maybe later');
});

test('fenced code in checks does not become headings or detail rows', () => {
  const result = parseReport(fixture);
  assert.match(result.checks.find((check) => check.n === 1).body, /```json/);
  assert.match(result.checks.find((check) => check.n === 3).body, /```/);

  const fencedHeading = parseReport('## Proposed actions\n### Check 1 — real\n```\n### Check 99 — fake\n```');
  assert.deepEqual(fencedHeading.checks.map((check) => check.n), [1]);
});

test('parseReport degrades instead of throwing for non-reports', () => {
  assert.equal(parseReport('').ok, false);
  assert.equal(parseReport('random text').ok, false);
});

// The whole point of this helper is that a tune-up never depends on it succeeding.
test('a missing claude binary degrades to ok:false instead of throwing', () => {
  const enoent = () => { const e = new Error('spawn claude ENOENT'); e.code = 'ENOENT'; throw e; };
  const result = generate({ noCache: true, exec: enoent });
  assert.equal(result.ok, false);
  assert.match(result.reason, /PATH/);
});

test('a timeout degrades to ok:false and reports the elapsed time', () => {
  const timedOut = () => {
    const e = new Error('killed'); e.code = 'ETIMEDOUT'; e.killed = true; e.signal = 'SIGTERM';
    throw e;
  };
  const result = generate({ noCache: true, exec: timedOut });
  assert.equal(result.ok, false);
  assert.match(result.reason, /timed out after [\d.]+s/);
});

test('unparseable stdout degrades to ok:false and is never cached', () => {
  const result = generate({ noCache: true, exec: () => 'not a doctor report at all' });
  assert.equal(result.ok, false);
});

test('recursion guard returns without spawning Claude', () => {
  const previous = process.env[RECURSION_GUARD];
  process.env[RECURSION_GUARD] = '1';
  try {
    const result = generate({ noCache: true, exec: () => { throw new Error('must not spawn'); } });
    assert.equal(result.ok, false);
    assert.match(result.reason, /recursion guard/);
  } finally {
    if (previous === undefined) delete process.env[RECURSION_GUARD];
    else process.env[RECURSION_GUARD] = previous;
  }
});
