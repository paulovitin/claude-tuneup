#!/usr/bin/env node
// Cross-run memory. Without it, a second tune-up reproposes everything the dev already
// declined, and nothing can tell whether their resident context is growing back.
//
//   node ledger.mjs key <kind> <path> <text>     -> the stable decision key for one item
//   node ledger.mjs check <key...>               -> prior verdict per key, if any
//   node ledger.mjs decide <key> <verdict> [--run <id>] [--note <text>]
//   node ledger.mjs record-run [--groups a,b] [--changes N] [--id <id>] [--disk]
//   node ledger.mjs trend                        -> resident-token delta vs the last run
//   node ledger.mjs revert-run <id>              -> drop the decisions of an undone run
//
// PRIVACY: this file stores paths, hashes and verdicts. It never stores the dev's
// instruction text — `key` hashes the text and the text is discarded.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { CLAUDE_DIR, stateBase, dirSize, restrict, out } from './lib.mjs';
import { scanMemory } from './scan.mjs';
import { scanSurfaces } from './audit-instructions.mjs';

// Lives beside the backups, not inside them: undoing a run must not erase the record
// of what the dev decided across every other run.
export const LEDGER_FILE = path.join(stateBase(), 'ledger.json');

export const VERDICTS = ['keep', 'applied', 'deleted'];

const EMPTY = { version: 1, runs: [], decisions: [] };

export function load() {
  try {
    const parsed = JSON.parse(fs.readFileSync(LEDGER_FILE, 'utf8'));
    if (!parsed || typeof parsed !== 'object') return { ...EMPTY };
    return {
      version: 1,
      runs: Array.isArray(parsed.runs) ? parsed.runs : [],
      decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
    };
  } catch {
    // A corrupt ledger must never abort a tune-up. Starting empty costs the dev a
    // round of re-answering; throwing here would cost them the whole run.
    return { ...EMPTY };
  }
}

export function save(data) {
  fs.mkdirSync(path.dirname(LEDGER_FILE), { recursive: true });
  fs.writeFileSync(LEDGER_FILE, JSON.stringify(data, null, 2));
  restrict(LEDGER_FILE, 0o600);
}

// Content-addressed, not path-addressed. "Keep this" has to mean *this sentence*, so a
// rewritten line yields a different key and is proposed again — which is correct: the
// dev never approved the new wording. Whitespace is normalized so reflowing a paragraph
// doesn't spuriously reopen it.
export function decisionKey(kind, target, text = '') {
  const normalized = String(text).replace(/\s+/g, ' ').trim();
  const digest = crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 12);
  return `${kind}:${target}:${digest}`;
}

export function residentTokens() {
  const memory = scanMemory();
  const surfaces = scanSurfaces();
  return {
    memory: memory.combinedApproxTokens || 0,
    // Confirmed only. Folding inferred cost into the number the dev watches over time
    // would make a change in our own evidence labels look like a change in their install.
    surfaces: surfaces.approxResidentTokens || 0,
    total: (memory.combinedApproxTokens || 0) + (surfaces.approxResidentTokens || 0),
  };
}

export function recordRun({ id, groups = [], changes = 0, disk = false, at = new Date().toISOString() } = {}) {
  const data = load();
  const tokens = residentTokens();
  const run = {
    id: id || `run-${data.runs.length + 1}-${at}`,
    at,
    groups,
    changes,
    residentTokens: tokens.total,
    residentBreakdown: { memory: tokens.memory, surfaces: tokens.surfaces },
    ...(disk ? { diskBytes: dirSize(CLAUDE_DIR) } : {}),
  };
  data.runs.push(run);
  save(data);
  return run;
}

export function decide(key, verdict, { runId = null, note = null, at = new Date().toISOString() } = {}) {
  if (!VERDICTS.includes(verdict)) {
    return { ok: false, reason: `unknown verdict "${verdict}" — expected one of ${VERDICTS.join(', ')}` };
  }
  const data = load();
  // One row per key: the latest decision is the standing one.
  data.decisions = data.decisions.filter((d) => d.key !== key);
  const entry = { key, verdict, at, ...(runId ? { runId } : {}), ...(note ? { note } : {}) };
  data.decisions.push(entry);
  save(data);
  return { ok: true, decision: entry };
}

export function check(keys) {
  const data = load();
  const byKey = new Map(data.decisions.map((d) => [d.key, d]));
  const known = keys.map((key) => byKey.get(key)).filter(Boolean);
  return {
    known,
    // The list a step filters by: previously declined, so collapse to one summary line
    // instead of asking again.
    declined: known.filter((d) => d.verdict === 'keep').map((d) => d.key),
    unseen: keys.filter((key) => !byKey.has(key)),
  };
}

export function trend() {
  const data = load();
  const runs = data.runs;
  if (runs.length === 0) return { ok: true, firstRun: true, message: null };
  const previous = runs[runs.length - 1];
  const now = residentTokens();
  const delta = now.total - (previous.residentTokens || 0);
  return {
    ok: true,
    firstRun: false,
    previousRun: { id: previous.id, at: previous.at, residentTokens: previous.residentTokens },
    currentResidentTokens: now.total,
    delta,
    // Only a grown budget is worth interrupting the dev for; STEP 0 stays silent otherwise.
    message: delta > 0
      ? `Resident context is up ~${delta} tokens since the last tune-up (${previous.at.slice(0, 10)}).`
      : null,
  };
}

export function revertRun(id) {
  const data = load();
  const before = data.decisions.length;
  data.decisions = data.decisions.filter((d) => d.runId !== id);
  data.runs = data.runs.filter((r) => r.id !== id);
  save(data);
  return { ok: true, id, dropped: before - data.decisions.length };
}

function flag(argv, name) {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : null;
}

function usage() {
  process.stdout.write([
    'Usage: node ledger.mjs <command>',
    '  key <kind> <path> <text>                        stable decision key for one item',
    '  check <key...>                                  prior verdicts, if any',
    `  decide <key> <${VERDICTS.join('|')}> [--run <id>] [--note <text>]`,
    '  record-run [--groups a,b] [--changes N] [--id <id>] [--disk]',
    '  trend                                           resident-token delta vs last run',
    '  revert-run <id>                                 drop an undone run\'s decisions',
    '',
    `Ledger: ${LEDGER_FILE} (paths and hashes only — never your instruction text)`,
    '',
  ].join('\n'));
}

export function main(argv = process.argv.slice(2)) {
  const [cmd, ...rest] = argv;
  if (!cmd || cmd === '--help' || cmd === 'help') { usage(); return; }

  switch (cmd) {
    case 'key': {
      const [kind, target, ...text] = rest;
      if (!kind || !target) { usage(); process.exitCode = 1; return; }
      out({ key: decisionKey(kind, target, text.join(' ')) });
      return;
    }
    case 'check':
      out(check(rest.filter((a) => !a.startsWith('--'))));
      return;
    case 'decide': {
      const [key, verdict] = rest;
      if (!key || !verdict) { usage(); process.exitCode = 1; return; }
      const result = decide(key, verdict, { runId: flag(rest, '--run'), note: flag(rest, '--note') });
      if (!result.ok) process.exitCode = 1;
      out(result);
      return;
    }
    case 'record-run': {
      const groups = (flag(rest, '--groups') || '').split(',').map((s) => s.trim()).filter(Boolean);
      out(recordRun({
        id: flag(rest, '--id'),
        groups,
        changes: Number(flag(rest, '--changes') || 0),
        disk: rest.includes('--disk'),
      }));
      return;
    }
    case 'trend':
      out(trend());
      return;
    case 'revert-run': {
      if (!rest[0]) { usage(); process.exitCode = 1; return; }
      out(revertRun(rest[0]));
      return;
    }
    default:
      process.stderr.write(`unknown command: ${cmd}\n`);
      usage();
      process.exitCode = 1;
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
