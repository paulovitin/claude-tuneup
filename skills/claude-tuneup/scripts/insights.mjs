#!/usr/bin/env node
// Run Claude Code's built-in /insights headlessly (no browser) and extract the useful
// sections of the generated HTML report. Read-only. Cross-OS.
// The report is the dev's own local data — printed for live use, never stored by this skill.
//
//   node insights.mjs              -> cached result if fresh, else generate
//   node insights.mjs --no-cache   -> force a fresh run (one model call)
//
// CACHE: Results are cached to avoid costly model calls on repeated runs.
// Cache lives at ~/.claude/.claude-tuneup-insights-cache.json and expires after 1 hour.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { CLAUDE_DIR, out } from './lib.mjs';

export const CACHE_FILE = path.join(CLAUDE_DIR, '.claude-tuneup-insights-cache.json');
export const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
export const RECURSION_GUARD = 'CLAUDE_TUNEUP_INSIGHTS_RUNNING';

export function buildArgv() {
  return ['-p', '/insights'];
}

function loadCache() {
  try {
    const cached = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data;
  } catch {}
  return null;
}

function saveCache(data) {
  try {
    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify({ ts: Date.now(), data }, null, 2));
  } catch {}
}

export function section(html, anchorRe) {
  const re = new RegExp(anchorRe + '(.*?)(<h2|<h3|$)', 's');
  const m = html.match(re);
  if (!m) return '';
  return m[1].replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ').trim();
}

const WANT = [
  ['suggestedClaudeMd', 'Suggested CLAUDE\\.md Additions'],
  ['whatYouWorkOn', 'What You Work On'],
  ['howYouUse', 'How You Use Claude Code'],
  ['friction', 'Where Things Go Wrong'],
];

export function parseSections(html) {
  const sections = {};
  for (const [key, anchor] of WANT) {
    const s = section(html, anchor);
    if (s) sections[key] = s.slice(0, 2000);
  }
  return sections;
}

// Spawn `claude -p "/insights"`, which prints a line containing file://….html and opens
// no browser. Returns the report path, or a reason.
// Exported for offline tests. The injectable exec function keeps tests from ever spawning Claude.
export function locateReport({ exec = execFileSync } = {}) {
  // Recursion guard: this spawns `claude` from inside a Claude skill. If we're already
  // inside such a spawn, refuse — never let insights call itself and fork model calls.
  if (process.env[RECURSION_GUARD]) {
    return { ok: false, reason: 'recursion guard: refusing to spawn `claude -p` from inside an insights run' };
  }

  let stdout = '';
  const start = Date.now();
  try {
    stdout = exec('claude', buildArgv(), {
      encoding: 'utf8',
      timeout: 120000,        // 2-minute max
      killSignal: 'SIGTERM',
      env: { ...process.env, [RECURSION_GUARD]: '1' },
    });
  } catch (e) {
    stdout = (e?.stdout || '').toString();
    const elapsed = Date.now() - start;
    if (e && e.code === 'ENOENT') {
      return { ok: false, reason: 'claude is not available on PATH' };
    }
    // If it timed out or crashed without producing output, return a clear reason
    if (!stdout) {
      return { ok: false, reason: `insights timed out after ${elapsed / 1000}s (no output). Try again later.` };
    }
  }
  const m = stdout.match(/file:\/\/(\S+\.html)/);
  const reportPath = m ? decodeURIComponent(m[1]) : null;
  if (!reportPath || !fs.existsSync(reportPath)) {
    return { ok: false, reason: 'no report (needs session history, or claude -p unavailable)' };
  }
  return { ok: true, report: reportPath };
}

export function generate({ noCache = false, exec = execFileSync } = {}) {
  // Cache is checked before the recursion guard on purpose: a fresh cached result is
  // still useful inside a nested run, and returning it spawns nothing.
  if (!noCache) {
    const cached = loadCache();
    if (cached) return cached;
  }

  const located = locateReport({ exec });
  if (!located.ok) return located;

  let html = '';
  try { html = fs.readFileSync(located.report, 'utf8'); }
  catch { return { ok: false, reason: `report at ${located.report} could not be read` }; }

  const sections = parseSections(html);
  const result = { ok: true, report: located.report, sections };
  // Empty sections usually mean the /insights HTML layout changed under us. Don't cache
  // the miss (a retry after a fix should re-parse), and point the agent at the raw file.
  if (Object.keys(sections).length === 0) {
    result.note = 'No known sections matched — the /insights HTML format may have changed. Read the report file directly and extract "Suggested CLAUDE.md Additions" by hand.';
  } else {
    saveCache(result);
  }
  return result;
}

function usage() {
  process.stdout.write('Usage: node insights.mjs [--no-cache] [--help]\n');
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  if (process.argv.includes('--help')) usage();
  else out(generate({ noCache: process.argv.includes('--no-cache') }));
}
