import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadCache, saveCache, spawnClaude, withCache } from './headless.mjs';

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'tuneup-headless-'));
const cacheFile = (name) => path.join(TMP, `${name}.json`);
const GUARD = 'CLAUDE_TUNEUP_HEADLESS_TEST_GUARD';

const throwing = (props) => () => { throw Object.assign(new Error('boom'), props); };

test.afterEach(() => { delete process.env[GUARD]; });
test.after(() => fs.rmSync(TMP, { recursive: true, force: true }));

// --- cache ------------------------------------------------------------------

test('a cache round-trips, and a corrupt or absent file reads as a miss', () => {
  const file = cacheFile('roundtrip');
  saveCache(file, { ok: true, value: 1 });
  assert.deepEqual(loadCache(file, 60_000), { ok: true, value: 1 });

  assert.equal(loadCache(path.join(TMP, 'never-written.json'), 60_000), null);
  fs.writeFileSync(file, 'not json at all');
  assert.equal(loadCache(file, 60_000), null, 'a corrupt cache must degrade to a miss, not throw');
});

test('an expired entry is a miss', () => {
  const file = cacheFile('stale');
  saveCache(file, { ok: true });
  const cached = JSON.parse(fs.readFileSync(file, 'utf8'));
  cached.ts = Date.now() - 61_000;
  fs.writeFileSync(file, JSON.stringify(cached));
  assert.equal(loadCache(file, 60_000), null);
});

test('saveCache never throws on an unwritable path', () => {
  // A cache that cannot be written must not take the whole tune-up down with it.
  assert.doesNotThrow(() => saveCache(path.join(TMP, 'roundtrip.json', 'nested', 'x.json'), { ok: true }));
});

test('withCache serves a warm cache without producing, and honours noCache', () => {
  const file = cacheFile('withcache');
  fs.rmSync(file, { force: true });
  let produced = 0;
  const produce = () => { produced++; return { ok: true, n: produced }; };

  assert.deepEqual(withCache({ file, ttlMs: 60_000 }, produce), { ok: true, n: 1 });
  assert.deepEqual(withCache({ file, ttlMs: 60_000 }, produce), { ok: true, n: 1 });
  assert.equal(produced, 1, 'the second call must be served from cache');

  assert.deepEqual(withCache({ file, ttlMs: 60_000, noCache: true }, produce), { ok: true, n: 2 });
});

test('withCache asks `cacheable` — a result it rejects is returned but never stored', () => {
  const file = cacheFile('cacheable');
  fs.rmSync(file, { force: true });
  const result = withCache(
    { file, ttlMs: 60_000, cacheable: (r) => r.ok && r.checks > 0 },
    () => ({ ok: true, checks: 0 }),
  );
  assert.deepEqual(result, { ok: true, checks: 0 });
  assert.equal(fs.existsSync(file), false,
    'caching a miss would freeze it for the whole TTL after the parser is fixed');
});

// The ordering doctor.mjs used to get wrong by having its own copy.
test('the cache is consulted before anything spawns, guard included', () => {
  const file = cacheFile('guard-order');
  fs.rmSync(file, { force: true });
  saveCache(file, { ok: true, from: 'cache' });
  process.env[GUARD] = '1';
  const result = withCache({ file, ttlMs: 60_000 }, () => {
    assert.fail('produce must not run while a fresh cache exists');
  });
  assert.deepEqual(result, { ok: true, from: 'cache' });
});

// --- spawn ------------------------------------------------------------------

test('the recursion guard fires before anything is spawned', () => {
  process.env[GUARD] = '1';
  const spawned = [];
  const result = spawnClaude({
    argv: ['-p', '/x'], guard: GUARD, label: 'demo',
    exec: (...args) => { spawned.push(args); return 'out'; },
  });
  assert.equal(result.ok, false);
  assert.match(result.reason, /recursion guard/);
  assert.match(result.reason, /demo run/);
  assert.deepEqual(spawned, []);
});

test('a clean run returns stdout, and the guard is set for the child', () => {
  let seen = null;
  const result = spawnClaude({
    argv: ['-p', '/x'], guard: GUARD, label: 'demo', timeoutMs: 1234,
    exec: (bin, argv, options) => { seen = { bin, argv, options }; return 'hello'; },
  });
  assert.deepEqual(result, { ok: true, stdout: 'hello' });
  assert.equal(seen.bin, 'claude');
  assert.deepEqual(seen.argv, ['-p', '/x']);
  assert.equal(seen.options.env[GUARD], '1', 'a nested run must be able to see the guard');
  assert.equal(seen.options.timeout, 1234);
  assert.equal(seen.options.killSignal, 'SIGTERM');
  assert.equal('maxBuffer' in seen.options, false, 'no maxBuffer unless one was asked for');
});

test('maxBuffer is passed through only when set', () => {
  let options = null;
  spawnClaude({
    argv: [], guard: GUARD, label: 'demo', maxBuffer: 42,
    exec: (bin, argv, o) => { options = o; return ''; },
  });
  assert.equal(options.maxBuffer, 42);
});

test('a missing binary is reported, never thrown', () => {
  const result = spawnClaude({ argv: [], guard: GUARD, label: 'demo', exec: throwing({ code: 'ENOENT' }) });
  assert.deepEqual(result, { ok: false, reason: 'claude is not available on PATH' });
});

test('a failed run that still printed something is worth parsing', () => {
  const result = spawnClaude({
    argv: [], guard: GUARD, label: 'demo',
    exec: throwing({ code: 1, stdout: 'partial output' }),
  });
  assert.deepEqual(result, { ok: true, stdout: 'partial output' });
});

test('a failed run with no output reports the caller-supplied reason', () => {
  const result = spawnClaude({
    argv: [], guard: GUARD, label: 'demo',
    exec: throwing({ code: 1 }),
    emptyStdoutReason: (ms) => `nothing after ${typeof ms === 'number' ? 'n' : '?'}ms`,
  });
  assert.deepEqual(result, { ok: false, reason: 'nothing after nms' });
});

// doctor and insights genuinely differ here, which is why it is a named knob rather than
// a divergence between two copies of the same function.
test('timeoutIsFatal decides whether partial output survives a timeout', () => {
  const timedOut = throwing({ code: 'ETIMEDOUT', killed: true, signal: 'SIGTERM', stdout: 'half a report' });

  const fatal = spawnClaude({ argv: [], guard: GUARD, label: 'doctor', timeoutIsFatal: true, exec: timedOut });
  assert.equal(fatal.ok, false);
  assert.match(fatal.reason, /doctor timed out after [\d.]+s\./);

  const tolerant = spawnClaude({ argv: [], guard: GUARD, label: 'insights', exec: timedOut });
  assert.deepEqual(tolerant, { ok: true, stdout: 'half a report' });
});

test('a fatal timeout with no output still reports the timeout, not the empty-stdout reason', () => {
  const result = spawnClaude({
    argv: [], guard: GUARD, label: 'doctor', timeoutIsFatal: true,
    exec: throwing({ code: 'ETIMEDOUT', killed: true }),
    emptyStdoutReason: () => 'wrong reason',
  });
  assert.match(result.reason, /timed out/);
});
