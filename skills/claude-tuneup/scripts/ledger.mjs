#!/usr/bin/env node
// Cross-run memory. Without it, a second tune-up reproposes everything the dev already
// declined, and nothing can tell whether their resident context is growing back.
//
//   node ledger.mjs key <kind> <path> <text>     -> the stable decision key for one item
//   node ledger.mjs check <key...>               -> prior verdict per key, if any
//   node ledger.mjs decide <key> <verdict> [--run <id>] [--note <text>]
//   node ledger.mjs record-run [--groups a,b] [--changes N] [--id <id>] [--disk] [--retry-of <id>]
//   node ledger.mjs trend                        -> resident-token delta vs the last run
//   node ledger.mjs revert-run <id>              -> drop the decisions of an undone run
//   node ledger.mjs record-retry --of <id> --reason <text> [--category <slug>] [--id <id>]
//   node ledger.mjs retries [--of <id>]          -> why earlier attempts were undone
//
// PRIVACY: this file stores paths, hashes, verdicts, and the reasons the dev typed when
// asking for a retry. It never stores the content of their instruction files — `key`
// hashes the text and the text itself is discarded.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { CLAUDE_DIR, stateBase, dirSize, restrict, out, isMain } from './lib.mjs';
import { scanMemory } from './scan.mjs';
import { scanSurfaces } from './audit-instructions.mjs';

// Lives beside the backups, not inside them: undoing a run must not erase the record
// of what the dev decided across every other run.
export const LEDGER_FILE = path.join(stateBase(), 'ledger.json');

export const VERDICTS = ['keep', 'applied', 'deleted'];

const EMPTY = { version: 1, runs: [], decisions: [], retries: [] };

export function load() {
  try {
    const parsed = JSON.parse(fs.readFileSync(LEDGER_FILE, 'utf8'));
    if (!parsed || typeof parsed !== 'object') return { ...EMPTY, retries: [] };
    return {
      version: 1,
      runs: Array.isArray(parsed.runs) ? parsed.runs : [],
      decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
      retries: Array.isArray(parsed.retries) ? parsed.retries : [],
    };
  } catch {
    // A corrupt ledger must never abort a tune-up. Starting empty costs the dev a
    // round of re-answering; throwing here would cost them the whole run.
    return { ...EMPTY, retries: [] };
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

export function recordRun({
  id, groups = [], changes = 0, disk = false, retryOf = null, at = new Date().toISOString(),
} = {}) {
  const data = load();
  const tokens = residentTokens();
  const run = {
    id: id || `run-${data.runs.length + 1}-${at}`,
    at,
    groups,
    changes,
    residentTokens: tokens.total,
    residentBreakdown: { memory: tokens.memory, surfaces: tokens.surfaces },
    ...(retryOf ? { retryOf } : {}),
    ...(disk ? { diskBytes: dirSize(CLAUDE_DIR) } : {}),
  };
  data.runs.push(run);
  save(data);
  return run;
}

// How many attempts already sit behind this one, by following retryOf links back.
// Mechanical, so the retry cap is a number the skill reads rather than a feeling about
// how many times it has tried.
export function chainDepth(runId, retries) {
  const parentOf = new Map(retries.map((r) => [r.id, r.retryOf]));
  let depth = 0;
  let cursor = runId;
  const seen = new Set();
  while (parentOf.has(cursor) && !seen.has(cursor)) {
    seen.add(cursor);
    cursor = parentOf.get(cursor);
    depth++;
  }
  return depth;
}

// Why an attempt was thrown away. The dev's own words, required — a retry with no stated
// reason would just be the same run again, and the reason is the only new information
// the next attempt has to work with.
export function recordRetry({ of: undoneRunId, reason, category = null, id = null, at = new Date().toISOString() } = {}) {
  if (!undoneRunId) return { ok: false, reason: 'record-retry needs --of <run-id>: which attempt was undone' };
  const stated = typeof reason === 'string' ? reason.trim() : '';
  if (!stated) {
    return { ok: false, reason: 'record-retry needs --reason: a retry without a stated reason repeats the same run' };
  }
  const data = load();
  const entry = {
    id: id || `retry-${data.retries.length + 1}-${at}`,
    retryOf: undoneRunId,
    reason: stated,
    ...(category ? { category } : {}),
    at,
  };
  data.retries.push(entry);
  save(data);
  return { ok: true, retry: entry, depth: chainDepth(entry.id, data.retries) };
}

// Every reason in this lineage, oldest first. A second retry must see the first one's
// reason too, or it can fix the newest complaint by reintroducing the older one.
export function retriesFor(runId = null) {
  const data = load();
  if (!runId) return { retries: data.retries, depth: 0 };
  const lineage = [];
  const byId = new Map(data.retries.map((r) => [r.id, r]));
  const parents = new Set();
  let cursor = runId;
  while (cursor && !parents.has(cursor)) {
    parents.add(cursor);
    const entry = byId.get(cursor);
    if (!entry) break;
    lineage.unshift(entry);
    cursor = entry.retryOf;
  }
  // Also catch retries recorded *against* this run id (the common lookup right after
  // an undo, when the caller only knows the run they just reverted).
  for (const entry of data.retries) {
    if (entry.retryOf === runId && !lineage.includes(entry)) lineage.push(entry);
  }
  return { retries: lineage, depth: chainDepth(runId, data.retries) };
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
  // `retries` is deliberately untouched. Undoing a run erases what it decided, but not
  // the record of why it was thrown away — that reason is the only thing the next
  // attempt knows that this one didn't, and the chain depth behind the retry cap
  // depends on it surviving.
  save(data);
  return { ok: true, id, dropped: before - data.decisions.length, retriesKept: data.retries.length };
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
    '  record-run [--groups a,b] [--changes N] [--id <id>] [--disk] [--retry-of <id>]',
    '  trend                                           resident-token delta vs last run',
    '  revert-run <id>                                 drop an undone run\'s decisions',
    '  record-retry --of <id> --reason <text> [--category <slug>] [--id <id>]',
    '  retries [--of <id>]                             why earlier attempts were undone',
    '',
    `Ledger: ${LEDGER_FILE} (paths, hashes, verdicts and retry reasons —`,
    '        never the contents of your instruction files)',
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
        retryOf: flag(rest, '--retry-of'),
      }));
      return;
    }
    case 'record-retry': {
      const result = recordRetry({
        of: flag(rest, '--of'),
        reason: flag(rest, '--reason'),
        category: flag(rest, '--category'),
        id: flag(rest, '--id'),
      });
      if (!result.ok) process.exitCode = 1;
      out(result);
      return;
    }
    case 'retries':
      out(retriesFor(flag(rest, '--of')));
      return;
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

if (isMain(import.meta.url)) main();
