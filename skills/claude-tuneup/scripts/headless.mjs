// Shared core for the two helpers that shell out to `claude -p` (doctor.mjs, insights.mjs).
// Both need the same three things — a recursion guard, one hard-capped spawn, and a TTL
// cache — and before this module existed they each carried their own copy. The copies had
// already drifted: different cache locations, and a different guard/cache ordering.
//
// Node built-ins only; runs on every OS.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

// Read a cached payload, or null when it is absent, corrupt, or past its TTL.
// A cache miss is never an error: these helpers must degrade, never break a tune-up.
export function loadCache(file, ttlMs) {
  try {
    const cached = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (cached && Date.now() - cached.ts < ttlMs) return cached.data;
  } catch {}
  return null;
}

export function saveCache(file, data) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify({ ts: Date.now(), data }, null, 2));
  } catch {}
}

// Cache-then-produce, with the caller deciding what deserves to be cached.
//
// The cache is checked BEFORE anything spawns — including before the recursion guard runs
// inside `produce`. That ordering is deliberate and now shared: a fresh cached result is
// still a correct answer inside a nested run, and serving it costs no model call. doctor.mjs
// used to check its guard first and so refused to answer from a warm cache; that was an
// accident of having two copies, not a decision.
export function withCache({ file, ttlMs, noCache = false, cacheable = (result) => result?.ok }, produce) {
  if (!noCache) {
    const cached = loadCache(file, ttlMs);
    if (cached) return cached;
  }
  const result = produce();
  if (cacheable(result)) saveCache(file, result);
  return result;
}

// One `claude -p` run, hard-capped, with the recursion guard set for anything it spawns.
//
//   { ok: true, stdout }    -> there is output worth parsing (a clean exit, or a failed run
//                              that still printed something usable)
//   { ok: false, reason }   -> guarded, missing binary, fatal timeout, or nothing on stdout
//
// `exec` is injectable so tests never spawn Claude.
//
// Policy knobs, because the two callers genuinely differ:
//   timeoutIsFatal   doctor refuses to parse a half-written 6-minute report; insights only
//                    needs the trailing `file://` line, so partial output is worth a look.
//   timeoutReason    message when a fatal timeout is what stopped the run.
//   emptyStdoutReason(elapsedMs)  message when the run failed and printed nothing at all.
export function spawnClaude({
  argv,
  guard,
  label,
  timeoutMs,
  maxBuffer = null,
  timeoutIsFatal = false,
  timeoutReason = (elapsedMs) => `${label} timed out after ${(elapsedMs / 1000).toFixed(1)}s.`,
  emptyStdoutReason = () => `${label} exited without usable stdout`,
  exec = execFileSync,
} = {}) {
  if (process.env[guard]) {
    return { ok: false, reason: `recursion guard: refusing to spawn \`claude -p\` from inside a ${label} run` };
  }

  const options = {
    encoding: 'utf8',
    timeout: timeoutMs,
    killSignal: 'SIGTERM',
    env: { ...process.env, [guard]: '1' },
  };
  if (maxBuffer) options.maxBuffer = maxBuffer;

  const start = Date.now();
  try {
    return { ok: true, stdout: exec('claude', argv, options) };
  } catch (error) {
    const elapsedMs = Date.now() - start;
    const stdout = (error?.stdout || '').toString();
    if (error && error.code === 'ENOENT') {
      return { ok: false, reason: 'claude is not available on PATH' };
    }
    const timedOut = !!(error && (error.code === 'ETIMEDOUT' || error.signal === 'SIGTERM' || error.killed));
    if (timeoutIsFatal && timedOut) return { ok: false, reason: timeoutReason(elapsedMs) };
    if (!stdout) return { ok: false, reason: emptyStdoutReason(elapsedMs) };
    return { ok: true, stdout };
  }
}
