#!/usr/bin/env node
// Undo a previous run from a restore point. Cross-OS, deterministic.
//   node restore.mjs list                              -> list restore points + a summary of each
//   node restore.mjs apply <RP> [--configs-only|--items-only]
//                                                      -> full restore, or just configs / just removed items
//   node restore.mjs apply <RP> --only <path>          -> put back ONE item, nothing else
//   node restore.mjs search <term...>                  -> which run touched the thing that broke
import fs from 'node:fs';
import path from 'node:path';
import { skillRoot, backupsRoot, exists, ls, move, readJSON, restrict } from './lib.mjs';
import { CONFIG_FILES } from './install.mjs';

// New restore points live in backupsRoot(); older ones may still sit in the legacy
// in-skill location. Scan both so a pre-fix backup stays restorable.
const ROOTS = [backupsRoot(), path.join(skillRoot(import.meta.url), '.backups')];

// Where each snapshotted config goes back to. Derived from the same list backup.mjs
// snapshots, so the two halves of the round-trip cannot drift apart.
const CONFIG_DEST = Object.fromEntries(CONFIG_FILES.map((file) => [path.basename(file), file]));

const createdIn = (rp) => {
  const list = readJSON(path.join(rp, 'created.json'));
  return Array.isArray(list) ? list : [];
};

// Undoing a creation means taking a file away, so it goes through the same move-never-rm
// rule as everything else: the item lands in undone-creations/ inside the restore point.
// The dev may have edited a skill this run wrote for them, and a plain delete would take
// that with it.
function undoCreation(rp, target) {
  const abs = path.resolve(target);
  if (!exists(abs)) return null;
  const parked = path.join(rp, 'undone-creations', path.basename(abs));
  const dest = exists(parked) ? `${parked}.${Date.now()}` : parked;
  move(abs, dest);
  return { created: abs, movedTo: dest };
}

// Collect real restore points across all roots. A restore point is a dir holding a
// removed.json — this also filters out the pre-restore-* safety snapshots.
function allPoints() {
  const out = [];
  for (const root of ROOTS) {
    for (const ts of ls(root)) {
      const rp = path.join(root, ts);
      if (!exists(path.join(rp, 'removed.json'))) continue;
      out.push({ ts, rp });
    }
  }
  return out.sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0));
}

function list() {
  const result = allPoints().map(({ ts, rp }) => {
    const removed = readJSON(path.join(rp, 'removed.json')) || {};
    let logLines = 0;
    try { logLines = fs.readFileSync(path.join(rp, 'actions.log'), 'utf8').trim().split('\n').length; } catch {}
    return {
      ts, path: rp,
      removedCount: Object.keys(removed).length,
      createdCount: createdIn(rp).length,
      logLines,
    };
  });
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}

// Snapshotted files that are safe to read back to the dev. `.claude.json` and
// settings*.json are deliberately absent: they can carry tokens, and a search result is
// text we print. Memory files are the dev's own prose, shown only to them, locally.
const SEARCHABLE_CONFIGS = ['CLAUDE.md', 'AGENTS.md', 'SOUL.md'];
const MAX_HITS = 20;

const matched = (haystack, terms) => terms.filter((t) => haystack.toLowerCase().includes(t));

// Symptom -> which run did it. The dev says "my deploy skill stopped firing" days later,
// in a new session, with no idea which run is responsible; the evidence has been sitting
// in every restore point's actions.log all along with nothing to read it.
// Terms are picked by the agent from what the dev said — this only matches and ranks.
function search(rawTerms) {
  const terms = [...new Set(rawTerms.map((t) => t.toLowerCase().trim()).filter((t) => t.length >= 2))];
  if (!terms.length) {
    console.error('search needs at least one term of 2+ characters');
    process.exit(1);
  }
  const points = [];
  for (const { ts, rp } of allPoints()) {
    const hit = new Set();
    const items = [];
    for (const [stashed, original] of Object.entries(readJSON(path.join(rp, 'removed.json')) || {})) {
      const hits = matched(original, terms);
      if (!hits.length) continue;
      hits.forEach((h) => hit.add(h));
      items.push({ original, stashed, recoverable: exists(stashed), terms: hits });
    }

    // Additions get their own bucket: the recovery action is the opposite one, so the
    // agent must never have to guess the direction from a path alone.
    const created = [];
    for (const target of createdIn(rp)) {
      const hits = matched(target, terms);
      if (!hits.length) continue;
      hits.forEach((h) => hit.add(h));
      created.push({ path: target, stillPresent: exists(target), terms: hits });
    }

    const log = [];
    try {
      for (const line of fs.readFileSync(path.join(rp, 'actions.log'), 'utf8').split('\n')) {
        const hits = matched(line, terms);
        if (!line.trim() || !hits.length) continue;
        hits.forEach((h) => hit.add(h));
        log.push({ line: line.trim(), terms: hits });
      }
    } catch {}

    const memory = [];
    for (const name of SEARCHABLE_CONFIGS) {
      let text;
      try { text = fs.readFileSync(path.join(rp, name), 'utf8'); } catch { continue; }
      text.split('\n').forEach((line, index) => {
        const hits = matched(line, terms);
        if (!line.trim() || !hits.length) return;
        hits.forEach((h) => hit.add(h));
        memory.push({ file: name, line: index + 1, text: line.trim(), terms: hits });
      });
    }

    if (!hit.size) continue;
    points.push({
      ts,
      path: rp,
      score: hit.size,
      matchedTerms: [...hit],
      items: items.slice(0, MAX_HITS),
      created: created.slice(0, MAX_HITS),
      log: log.slice(0, MAX_HITS),
      memory: memory.slice(0, MAX_HITS),
      truncated: items.length > MAX_HITS || created.length > MAX_HITS
        || log.length > MAX_HITS || memory.length > MAX_HITS,
    });
  }
  // Most terms matched first, then most recent. A single strong hit usually beats an
  // older run that mentions the word in passing.
  points.sort((a, b) => (b.score - a.score) || (a.ts < b.ts ? 1 : -1));
  process.stdout.write(JSON.stringify({
    terms,
    points,
    searched: allPoints().length,
    note: 'Ranked candidates, not a verdict — confirm with the dev before changing anything. `items` were REMOVED (undo puts them back); `created` were ADDED (undo takes them away, into undone-creations/). .claude.json and settings*.json are never searched: they can carry tokens.',
  }, null, 2) + '\n');
}

// Put back exactly one item. The surgical answer to "this one thing broke", where a full
// restore would also revert everything the dev was happy with.
function applyOnly(rp, target) {
  if (!rp || !exists(rp)) { console.error('restore point not found: ' + rp); process.exit(1); }
  // `--only` with nothing after it: say so, rather than letting path.resolve throw a raw
  // stack trace at the dev in the middle of a recovery.
  if (!target) { console.error('apply --only needs a path: node restore.mjs apply <RP> --only <path>'); process.exit(1); }
  const map = readJSON(path.join(rp, 'removed.json')) || {};
  const wanted = path.resolve(target);

  // A regression can come from either direction, so undoing one item can mean putting it
  // back OR taking it away. Check the creations first: those are unambiguous.
  if (createdIn(rp).some((c) => path.resolve(c) === wanted)) {
    const undone = undoCreation(rp, wanted);
    if (!undone) {
      console.error(JSON.stringify({ ok: false, reason: `nothing at ${wanted} to undo — already gone?` }, null, 2));
      process.exit(1);
    }
    process.stdout.write(JSON.stringify({ ok: true, scope: 'single-item-creation', ...undone }, null, 2) + '\n');
    return;
  }

  const entry = Object.entries(map).find(([, original]) => path.resolve(original) === wanted);
  if (!entry) {
    // No fuzzy matching: restoring the wrong path is worse than making the agent look it
    // up again. `search` prints exact originals, so an exact match is always available.
    console.error(JSON.stringify({
      ok: false,
      reason: `no removed or created item at ${wanted} in this restore point`,
      availableRemoved: Object.values(map),
      availableCreated: createdIn(rp),
    }, null, 2));
    process.exit(1);
  }
  const [stashed, original] = entry;
  if (!exists(stashed)) {
    console.error(JSON.stringify({ ok: false, reason: `the stashed copy is gone: ${stashed}` }, null, 2));
    process.exit(1);
  }
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  let restoredTo = original;
  let collision = null;
  if (exists(original)) {
    restoredTo = `${original}.restored-${ts}`;
    collision = { original, restoredTo };
  }
  move(stashed, restoredTo);
  process.stdout.write(JSON.stringify({
    ok: true, scope: 'single-item', restored: restoredTo, ...(collision ? { collision } : {}),
  }, null, 2) + '\n');
}

function apply(rp, { configsOnly = false, itemsOnly = false } = {}) {
  if (!rp || !exists(rp)) { console.error('restore point not found: ' + rp); process.exit(1); }
  const restored = [], collisions = [];
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  let preDir = null;

  // 1. Configs back (skipped with --items-only).
  if (!itemsOnly) {
    // Pre-restore safety snapshot: copy the CURRENT configs aside before overwriting them.
    // Restoring a stale .claude.json would clobber projects/sessions added after the backup —
    // this makes the restore itself reversible. Stored next to the restore point, never inside it.
    preDir = path.join(path.dirname(rp), `pre-restore-${path.basename(rp)}-${ts}`);
    fs.mkdirSync(preDir, { recursive: true });
    restrict(preDir, 0o700);
    for (const [name, dest] of Object.entries(CONFIG_DEST)) {
      if (!exists(dest)) continue;
      const snap = path.join(preDir, name);
      fs.copyFileSync(dest, snap);
      restrict(snap, 0o600);
    }
    for (const [name, dest] of Object.entries(CONFIG_DEST)) {
      const snap = path.join(rp, name);
      if (exists(snap)) { fs.copyFileSync(snap, dest); restored.push(`config: ${dest}`); }
    }
  }

  // 2. Removed items back to original paths (skipped with --configs-only) —
  //    never clobber a newer item that took the path.
  if (!configsOnly) {
    const map = readJSON(path.join(rp, 'removed.json')) || {};
    for (const [stashed, original] of Object.entries(map)) {
      if (!exists(stashed)) continue;
      if (exists(original)) {
        const alt = `${original}.restored-${ts}`;
        move(stashed, alt);
        collisions.push({ original, restoredTo: alt });
      } else {
        move(stashed, original);
        restored.push(`item: ${original}`);
      }
    }
  }

  // 3. Undo what the run ADDED (skipped with --configs-only). A run subtracts and adds —
  //    steps 16 and 17 write new skills — so putting removed items back is only half of
  //    "undo everything". Without this, a full restore silently left the additions in place.
  const undoneCreations = [];
  if (!configsOnly) {
    for (const target of createdIn(rp)) {
      const undone = undoCreation(rp, target);
      if (undone) undoneCreations.push(undone);
    }
  }

  // 4. Surface re-add commands (marketplaces/plugins can't be auto-restored).
  let readd = [];
  try {
    readd = fs.readFileSync(path.join(rp, 'actions.log'), 'utf8')
      .split('\n').filter(l => /re-add:|marketplace removed/.test(l));
  } catch {}
  process.stdout.write(JSON.stringify({
    scope: configsOnly ? 'configs-only' : itemsOnly ? 'items-only' : 'full',
    restored, collisions, undoneCreations, preRestoreSnapshot: preDir, manualReAdd: readd,
  }, null, 2) + '\n');
}

const USAGE = [
  'Usage: node restore.mjs list',
  '       node restore.mjs apply <RP> [--configs-only|--items-only]',
  '       node restore.mjs apply <RP> --only <path>',
  '       node restore.mjs search <term...>',
].join('\n');

const argv = process.argv.slice(2);
const [cmd, ...rest] = argv;
if (cmd === '--help' || cmd === 'help') process.stdout.write(USAGE + '\n');
else if (cmd === 'list') list();
else if (cmd === 'search') search(rest);
else if (cmd === 'apply') {
  const onlyAt = rest.indexOf('--only');
  if (onlyAt >= 0) applyOnly(rest[0], rest[onlyAt + 1]);
  else apply(rest[0], { configsOnly: rest.includes('--configs-only'), itemsOnly: rest.includes('--items-only') });
} else { console.error(USAGE); process.exit(1); }
