#!/usr/bin/env node
// Token-cheap update nudge. Compares the shipped skill version against the latest
// GitHub release and, only when behind, prints ONE line the agent relays. Read-only,
// cross-OS, fails silently (offline / rate-limited / unknown version => no nudge).
//
//   node version-check.mjs              -> cached latest if fresh, else one network call
//   node version-check.mjs --no-cache   -> force a fresh fetch
//
// CACHE: the latest-release lookup is cached 24h under the state dir so most runs make
// no network call at all. The "are we behind?" comparison is recomputed every run (cheap),
// so an update that just happened stops nudging immediately without waiting for cache expiry.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { skillRoot, stateBase, readJSON, out } from './lib.mjs';

const REPO = 'paulovitin/claude-tuneup';
const CACHE_FILE = path.join(stateBase(), '.version-check-cache.json');
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

// "v1.2.3" / "1.2.3-rc.1" -> [1,2,3]; anything else -> null (callers treat null as "be quiet").
export function parseVersion(v) {
  if (typeof v !== 'string') return null;
  const m = v.trim().replace(/^v/, '').match(/^(\d+)\.(\d+)\.(\d+)/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

// Numeric (not lexical) semver compare: 0.10.0 IS newer than 0.9.0. Unparseable => false,
// so a malformed tag or missing version can never trigger a spurious update prompt.
export function isNewer(latest, current) {
  const a = parseVersion(latest), b = parseVersion(current);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i];
  return false;
}

export function buildResult(current, latest) {
  if (!current) return { ok: false, reason: 'local version unknown' };
  if (!latest) return { ok: false, current, reason: 'could not determine latest release' };
  const update = isNewer(latest, current);
  const r = { ok: true, current, latest, update };
  if (update) {
    r.message = `claude-tuneup v${latest} available (you have v${current}) — update: npx skills add ${REPO}`;
  }
  return r;
}

// Local version ships WITH the skill in a VERSION file (package.json is not installed
// alongside the skill). Repo package.json is the dev-time fallback so this works in-tree too.
export function readLocalVersion() {
  const root = skillRoot(import.meta.url);
  try {
    const v = fs.readFileSync(path.join(root, 'VERSION'), 'utf8').trim();
    if (v) return v;
  } catch {}
  for (const pj of [path.join(root, '..', '..', 'package.json'), path.join(root, 'package.json')]) {
    const j = readJSON(pj);
    if (j?.version) return j.version;
  }
  return null;
}

function loadCache() {
  try {
    const c = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    if (Date.now() - c.ts < CACHE_TTL_MS && typeof c.latest === 'string') return c.latest;
  } catch {}
  return null;
}

function saveCache(latest) {
  try {
    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify({ ts: Date.now(), latest }));
  } catch {}
}

// One short network call, hard-capped. Any failure (offline, 403 rate-limit, timeout,
// shape change) returns null — a version check must never break or stall a tune-up.
async function fetchLatest(timeoutMs = 4000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { accept: 'application/vnd.github+json', 'user-agent': 'claude-tuneup' },
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const j = await res.json();
    return typeof j?.tag_name === 'string' ? j.tag_name : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const noCache = process.argv.includes('--no-cache');
  const current = readLocalVersion();
  let latest = noCache ? null : loadCache();
  if (!latest) {
    latest = await fetchLatest();
    if (latest) saveCache(latest);
  }
  out(buildResult(current, latest));
}

// Run only when invoked directly; stay importable and side-effect-free for tests.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
