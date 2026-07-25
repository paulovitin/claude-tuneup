#!/usr/bin/env node
// Run Claude Code's built-in /doctor headlessly and return its report as JSON.
// This is deliberately report-only: /doctor may otherwise propose and apply changes.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { out, stateBase } from './lib.mjs';

export const REPORT_ONLY = 'Report only. Do not apply, edit, or write anything — output the findings and proposals as text.';
export const RECURSION_GUARD = 'CLAUDE_TUNEUP_DOCTOR_RUNNING';
export const CACHE_TTL_MS = 60 * 60 * 1000;
export const CACHE_FILE = path.join(stateBase(), 'doctor-cache.json');

export function buildArgv() {
  return ['-p', `/doctor ${REPORT_ONLY}`];
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

function sectionKind(title) {
  const normalized = title.trim().toLowerCase();
  if (normalized === 'summary') return 'summary';
  if (normalized === 'detail') return 'detail';
  if (normalized.startsWith('proposed actions')) return 'proposed';
  if (normalized.startsWith('warnings')) return 'warnings';
  return null;
}

function isFence(line) {
  return /^\s*(`{3,}|~{3,})/.test(line);
}

function splitTableRow(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return null;
  return trimmed.slice(1, -1).split('|').map((cell) => cell.trim());
}

function isSeparatorRow(cells) {
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function normalizeVerdict(raw) {
  const leading = raw.trim().replace(/^\*\*/, '');
  const match = leading.match(/^(keep|remove|not touching|no action)\b/i);
  return match ? match[1].toLowerCase() : null;
}

function parseDetail(lines) {
  const detail = [];
  let inFence = false;
  let inTable = false;

  for (const line of lines) {
    if (isFence(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const cells = splitTableRow(line);
    if (!inTable) {
      if (cells && cells.length === 7 && cells[0].toLowerCase() === 'component') inTable = true;
      continue;
    }
    if (cells && isSeparatorRow(cells)) continue;
    if (cells && cells.length === 7) {
      const [component, type, scope, uses, usedInWindow, residentTokens, verdictRaw] = cells;
      detail.push({
        component,
        type,
        scope,
        uses,
        usedInWindow,
        residentTokens,
        verdict: normalizeVerdict(verdictRaw),
        verdictRaw,
      });
      continue;
    }
    if (line.trim()) break;
  }
  return detail;
}

function parseChecks(sections) {
  const checks = [];
  for (const section of sections) {
    if (section.kind !== 'proposed' && section.kind !== 'warnings') continue;
    let current = null;
    let inFence = false;
    for (const line of section.lines) {
      if (isFence(line)) {
        inFence = !inFence;
        if (current) current.body.push(line);
        continue;
      }
      if (!inFence) {
        const heading = line.match(/^### Check (\d+)\b(.*)$/);
        if (heading) {
          if (current) checks.push({
            n: current.n,
            title: current.title,
            section: current.section,
            body: current.body.join('\n').trim(),
          });
          const suffix = heading[2];
          const separator = suffix.indexOf(' — ');
          current = {
            n: Number(heading[1]),
            title: (separator === -1 ? suffix : suffix.slice(separator + 3)).trim(),
            section: section.kind,
            body: [],
          };
          continue;
        }
      }
      if (current) current.body.push(line);
    }
    if (current) checks.push({
      n: current.n,
      title: current.title,
      section: current.section,
      body: current.body.join('\n').trim(),
    });
  }
  return checks;
}

// Parse only the stable, useful pieces. Unknown top-level sections are deliberately ignored:
// /doctor ships inside Claude Code and can change independently of this skill.
export function parseReport(markdown) {
  if (typeof markdown !== 'string' || !markdown.trim()) {
    return { ok: false, reason: 'stdout did not contain a recognizable /doctor report' };
  }

  const sections = [];
  let current = null;
  let inFence = false;
  for (const line of markdown.replace(/\r\n?/g, '\n').split('\n')) {
    if (isFence(line)) {
      inFence = !inFence;
      if (current) current.lines.push(line);
      continue;
    }
    if (!inFence) {
      const heading = line.match(/^## (.+?)\s*$/);
      if (heading) {
        current = { kind: sectionKind(heading[1]), lines: [] };
        sections.push(current);
        continue;
      }
    }
    if (current) current.lines.push(line);
  }

  if (!sections.some((section) => section.kind)) {
    return { ok: false, reason: 'stdout did not contain a recognizable /doctor report' };
  }

  const summarySection = sections.find((section) => section.kind === 'summary');
  const summary = summarySection
    ? summarySection.lines.join('\n').replace(/^\s*---\s*$/gm, '').trim()
    : '';
  const detailSection = sections.find((section) => section.kind === 'detail');
  const result = {
    ok: true,
    summary,
    detail: detailSection ? parseDetail(detailSection.lines) : [],
    checks: parseChecks(sections),
  };
  if (result.checks.length === 0) {
    result.note = 'No checks matched — the /doctor markdown format may have changed.';
  }
  return result;
}

function timeoutReason(elapsed) {
  return `doctor timed out after ${(elapsed / 1000).toFixed(1)}s.`;
}

// Exported for offline tests. The injectable exec function keeps tests from ever spawning Claude.
export function generate({ noCache = false, exec = execFileSync } = {}) {
  if (process.env[RECURSION_GUARD]) {
    return { ok: false, reason: 'recursion guard: refusing to spawn `claude -p` from inside a doctor run' };
  }
  if (!noCache) {
    const cached = loadCache();
    if (cached) return cached;
  }

  const start = Date.now();
  let stdout = '';
  try {
    stdout = exec('claude', buildArgv(), {
      encoding: 'utf8',
      timeout: 600000,
      killSignal: 'SIGTERM',
      maxBuffer: 10 * 1024 * 1024,
      env: { ...process.env, [RECURSION_GUARD]: '1' },
    });
  } catch (error) {
    const elapsed = Date.now() - start;
    stdout = (error.stdout || '').toString();
    if (error && error.code === 'ENOENT') {
      return { ok: false, reason: 'claude is not available on PATH' };
    }
    if (error && (error.code === 'ETIMEDOUT' || error.signal === 'SIGTERM' || error.killed)) {
      return { ok: false, reason: timeoutReason(elapsed) };
    }
    if (!stdout) {
      return { ok: false, reason: 'doctor exited without usable stdout' };
    }
  }

  const result = parseReport(stdout);
  if (!result.ok) return result;
  if (result.checks.length > 0) saveCache(result);
  return result;
}

function usage() {
  process.stdout.write('Usage: node doctor.mjs [--no-cache] [--help]\n');
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  if (process.argv.includes('--help')) usage();
  else out(generate({ noCache: process.argv.includes('--no-cache') }));
}
