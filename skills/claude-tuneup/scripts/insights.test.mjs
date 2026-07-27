import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// CACHE_FILE is derived from CLAUDE_DIR at module load, so HOME has to be redirected
// BEFORE the import — hence the dynamic import. Nothing here may touch a real install.
const HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'tuneup-insights-'));
fs.mkdirSync(path.join(HOME, '.claude'), { recursive: true });
process.env.CLAUDE_TUNEUP_HOME = HOME;
delete process.env.CLAUDE_TUNEUP_INSIGHTS_RUNNING;

const {
  CACHE_FILE, CACHE_TTL_MS, RECURSION_GUARD, buildArgv, generate, locateReport, parseSections,
} = await import('./insights.mjs');

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const fixtureHtml = fs.readFileSync(path.join(FIXTURES, 'insights-report.html'), 'utf8');

// A fake `claude` that prints the file:// line the real one prints, and never spawns.
const execPrinting = (reportPath) => () => `Report written to file://${reportPath}\n`;

function writeReport(html) {
  const file = path.join(HOME, `report-${Math.abs(html.length)}-${fs.readdirSync(HOME).length}.html`);
  fs.writeFileSync(file, html);
  return file;
}

function clearCache() {
  try { fs.rmSync(CACHE_FILE, { force: true }); } catch {}
}

test('CACHE_FILE resolves under the redirected home — a test must never touch the real cache', () => {
  assert.ok(CACHE_FILE.startsWith(HOME), `${CACHE_FILE} escaped the throwaway home`);
  assert.equal(CACHE_TTL_MS, 60 * 60 * 1000);
  assert.deepEqual(buildArgv(), ['-p', '/insights']);
});

test('parseSections extracts the four known sections and ignores the rest', () => {
  const sections = parseSections(fixtureHtml);
  assert.deepEqual(Object.keys(sections).sort(),
    ['friction', 'howYouUse', 'suggestedClaudeMd', 'whatYouWorkOn']);
  assert.match(sections.suggestedClaudeMd, /Document the release steps/);
  assert.match(sections.whatYouWorkOn, /Node CLI tooling & release automation/, 'entities are decoded');
  assert.equal(sections.friction.includes('<'), true, '&lt; decodes back to a literal <');
  assert.equal(JSON.stringify(sections).includes('Sections We Do Not Parse'), false);
});

test('parseSections returns nothing when the layout no longer matches', () => {
  assert.deepEqual(parseSections('<html><body><h2>Totally New Layout</h2></body></html>'), {});
});

test('the recursion guard refuses to spawn claude from inside an insights run', () => {
  process.env[RECURSION_GUARD] = '1';
  try {
    const spawned = [];
    const result = locateReport({ exec: (...args) => { spawned.push(args); return ''; } });
    assert.equal(result.ok, false);
    assert.match(result.reason, /recursion guard/);
    assert.deepEqual(spawned, [], 'the guard must fire before anything is spawned');
  } finally {
    delete process.env[RECURSION_GUARD];
  }
});

test('a missing claude binary reports a reason instead of throwing', () => {
  clearCache();
  const enoent = () => { const e = new Error('spawn claude ENOENT'); e.code = 'ENOENT'; throw e; };
  assert.deepEqual(generate({ noCache: true, exec: enoent }),
    { ok: false, reason: 'claude is not available on PATH' });
});

test('a timeout with no output reports a reason instead of throwing', () => {
  clearCache();
  const timedOut = () => {
    const e = new Error('timeout');
    e.code = 'ETIMEDOUT';
    e.stdout = '';
    throw e;
  };
  const result = generate({ noCache: true, exec: timedOut });
  assert.equal(result.ok, false);
  assert.match(result.reason, /timed out/);
});

test('a successful parse is cached, and the cache is served on the next call without spawning', () => {
  clearCache();
  const report = writeReport(fixtureHtml);
  const first = generate({ noCache: true, exec: execPrinting(report) });
  assert.equal(first.ok, true);
  assert.equal(first.report, report);
  assert.ok(fs.existsSync(CACHE_FILE), 'a good parse must be cached');

  let spawns = 0;
  const second = generate({ exec: () => { spawns++; return ''; } });
  assert.equal(spawns, 0, 'a fresh cache must short-circuit the model call');
  assert.deepEqual(second, first);
});

test('an empty parse is never cached, so a later run re-tries', () => {
  clearCache();
  const report = writeReport('<html><body><h2>Brand New Layout</h2><p>x</p></body></html>');
  const result = generate({ noCache: true, exec: execPrinting(report) });
  assert.equal(result.ok, true);
  assert.deepEqual(result.sections, {});
  assert.match(result.note, /format may have changed/);
  assert.equal(fs.existsSync(CACHE_FILE), false,
    'caching an empty parse would freeze the miss for an hour after the parser is fixed');
});

test('a stale cache entry is ignored rather than served', () => {
  clearCache();
  const report = writeReport(fixtureHtml);
  generate({ noCache: true, exec: execPrinting(report) });

  const cached = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  cached.ts = Date.now() - (CACHE_TTL_MS + 1000);
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cached));

  let spawns = 0;
  generate({ exec: (...args) => { spawns++; return execPrinting(report)(...args); } });
  assert.equal(spawns, 1, 'an expired cache must fall through to a fresh run');
});

test('a report path that vanished between the run and the read reports a reason', () => {
  clearCache();
  const result = generate({ noCache: true, exec: () => 'file:///definitely/not/here.html\n' });
  assert.deepEqual(result, { ok: false, reason: 'no report (needs session history, or claude -p unavailable)' });
});

test.after(() => fs.rmSync(HOME, { recursive: true, force: true }));
