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
import { CLAUDE_DIR } from './lib.mjs';

const CACHE_FILE = path.join(CLAUDE_DIR, '.claude-tuneup-insights-cache.json');
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const NO_CACHE = process.argv.includes('--no-cache');

function loadCache() {
  try {
    const raw = fs.readFileSync(CACHE_FILE, 'utf8');
    const cached = JSON.parse(raw);
    if (Date.now() - cached.ts < CACHE_TTL_MS) {
      return cached.data;
    }
  } catch {}
  return null;
}

function saveCache(data) {
  try {
    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify({ ts: Date.now(), data }, null, 2));
  } catch {}
}

const RECURSION_GUARD = 'CLAUDE_TUNEUP_INSIGHTS_RUNNING';

function generate() {
  // Try cache first — insights costs a model call every time
  if (!NO_CACHE) {
    const cached = loadCache();
    if (cached) return cached;
  }

  // Recursion guard: this spawns `claude` from inside a Claude skill. If we're already
  // inside such a spawn, refuse — never let insights call itself and fork model calls.
  if (process.env[RECURSION_GUARD]) {
    return { ok: false, reason: 'recursion guard: refusing to spawn `claude -p` from inside an insights run' };
  }

  // `claude -p "/insights"` prints a line containing file://....html and opens no browser.
  let stdout = '';
  const start = Date.now();
  try {
    stdout = execFileSync('claude', ['-p', '/insights'], {
      encoding: 'utf8',
      timeout: 120000,        // 2-minute max
      killSignal: 'SIGTERM',
      env: { ...process.env, [RECURSION_GUARD]: '1' },
    });
  } catch (e) {
    stdout = (e.stdout || '').toString();
    const elapsed = Date.now() - start;
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

function section(html, anchorRe) {
  const re = new RegExp(anchorRe + '(.*?)(<h2|<h3|$)', 's');
  const m = html.match(re);
  if (!m) return '';
  return m[1].replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ').trim();
}

// Load or generate
const raw = generate();

// If it came from cache with sections already parsed, return it directly
if (raw.sections) {
  process.stdout.write(JSON.stringify(raw, null, 2) + '\n');
  process.exit(0);
}

if (!raw.ok) {
  process.stdout.write(JSON.stringify(raw, null, 2) + '\n');
  process.exit(0);
}

// Parse HTML sections
const html = fs.readFileSync(raw.report, 'utf8');
const want = [
  ['suggestedClaudeMd', 'Suggested CLAUDE\\.md Additions'],
  ['whatYouWorkOn', 'What You Work On'],
  ['howYouUse', 'How You Use Claude Code'],
  ['friction', 'Where Things Go Wrong'],
];
const sections = {};
for (const [key, anchor] of want) {
  const s = section(html, anchor);
  if (s) sections[key] = s.slice(0, 2000);
}

const result = { ok: true, report: raw.report, sections };
// Empty sections usually mean the /insights HTML layout changed under us. Don't cache
// the miss (a retry after a fix should re-parse), and point the agent at the raw file.
if (Object.keys(sections).length === 0) {
  result.note = 'No known sections matched — the /insights HTML format may have changed. Read the report file directly and extract "Suggested CLAUDE.md Additions" by hand.';
} else {
  saveCache(result);
}
process.stdout.write(JSON.stringify(result, null, 2) + '\n');
