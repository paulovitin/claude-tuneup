// What a Claude Code install *says* — one interface over the layout and the precedence
// rules, so no caller has to know either.
//
// Before this module, six call sites across five scripts each rebuilt their own answer to
// "what is configured here?", and they disagreed: scanSettings knew settings.local.json
// overrides settings.json, activeOutputStyle knew it too, and scanMemory did not — it read
// settings.json alone and reported auto-memory as enabled for anyone who had turned it off
// in their local file.
//
// Node built-ins only; runs on every OS.
import path from 'node:path';
import { HOME, CLAUDE_DIR, CLAUDE_JSON, readJSON, exists, readText } from './lib.mjs';

// Base first, local last. Claude Code applies them in this order, so for a scalar key the
// LAST file that defines it wins.
export const SETTINGS_FILENAMES = ['settings.json', 'settings.local.json'];

// Keys Claude Code combines across settings files rather than overriding. Permission lists
// concatenate; hooks/env/mcpServers merge by entry. "The effective value" is not any single
// file's value for these, which is why effectiveSetting refuses them.
export const MERGED_SETTINGS_KEYS = new Set(['permissions', 'hooks', 'env', 'mcpServers']);

// The small, irreplaceable config files this skill may edit — the restore-point snapshot
// list. backup.mjs copies these; restore.mjs puts them back by basename.
export const CONFIG_FILES = [
  CLAUDE_JSON,
  path.join(CLAUDE_DIR, 'settings.json'),
  path.join(CLAUDE_DIR, 'settings.local.json'),
  path.join(CLAUDE_DIR, 'CLAUDE.md'),
  path.join(CLAUDE_DIR, 'AGENTS.md'),
  path.join(CLAUDE_DIR, 'SOUL.md'),
];

// A file directly under ~/.claude, wherever HOME has been redirected to.
export const claudeFile = (name) => path.join(CLAUDE_DIR, name);

// Every user-level settings file, in precedence order, each labelled with how far it got:
//
//   { name, path, exists: false }                  -> not there
//   { name, path, exists: true, parses: false }    -> there, but not usable JSON
//   { name, path, exists: true, parses: true, data }
//
// Deliberately NOT memoized: a run edits settings mid-flight, and a stale answer here would
// be a far worse bug than re-reading two small files.
export function settingsFiles() {
  return SETTINGS_FILENAMES.map((name) => {
    const file = claudeFile(name);
    if (!exists(file)) return { name, path: file, exists: false };
    const data = readJSON(file);
    if (data === null || typeof data !== 'object' || Array.isArray(data)) {
      return { name, path: file, exists: true, parses: false };
    }
    return { name, path: file, exists: true, parses: true, data };
  });
}

// Only the files that actually gave us settings to read.
export const liveSettings = (files = settingsFiles()) => files.filter((f) => f.parses);

// The value Claude Code actually uses for a scalar key, or undefined when nothing sets it.
//
// Merged keys are refused rather than silently answered wrong: for those the harness
// combines the files, so no single value is "the" value, and a caller that wanted one is
// asking the wrong question. Read them from settingsFiles() and merge as the harness does.
export function effectiveSetting(key, files = settingsFiles()) {
  if (MERGED_SETTINGS_KEYS.has(key)) {
    throw new Error(`effectiveSetting("${key}"): Claude Code merges this key across settings files rather than overriding — read it from settingsFiles() instead`);
  }
  let value;
  for (const file of liveSettings(files)) {
    if (Object.hasOwn(file.data, key)) value = file.data[key];
  }
  return value;
}

// Same, narrowed to a non-empty string — the shape most callers actually want from a
// scalar setting (model, outputStyle, autoMemoryDirectory). Anything else reads as unset.
export function effectiveString(key, files = settingsFiles()) {
  const value = effectiveSetting(key, files);
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

// A path a dev may have written as "~/x" or as an absolute path, resolved against the same
// HOME every other script uses. Returns null when nothing was configured.
export function resolveConfiguredPath(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const raw = value.trim();
  return path.resolve(/^~[\\/]/.test(raw) ? path.join(HOME, raw.slice(2)) : raw);
}

// A user-level memory file (CLAUDE.md / AGENTS.md / SOUL.md), read once, in the shape
// analyzeMemory expects.
export function memoryFile(name) {
  const file = claudeFile(name);
  const text = readText(file);
  return text === null ? { path: file, exists: false } : { path: file, exists: true, text };
}
