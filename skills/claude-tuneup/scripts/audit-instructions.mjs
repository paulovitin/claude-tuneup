#!/usr/bin/env node
// Read-only instruction audit. It emits candidate signals for an agent to judge;
// it never assigns a verdict, score, severity, or rewrite.
import fs from 'node:fs';
import path from 'node:path';
import { CLAUDE_DIR, AGENTS_DIR, exists, ls, lstat, readText as read, out, isMain } from './lib.mjs';
import { claudeFile, effectiveString } from './install.mjs';
import { parseImports } from './scan.mjs';

const SIGNALS = [
  ['absolute', /\b(?:never|always|must|do not|don't|no exceptions|under no circumstances)\b/i],
  ['numeric-threshold', /(?:≤\s*\d+|<=\s*\d+|\bmax\s+\d+\b|\bat most\s+\d+\b|\bno more than\s+\d+\b|\b\d+\s+(?:lines|tokens)\b)/i],
  ['format-mandate', /\b(?:bullet points|respond in|format as|no comments|docstring|emoji)\b/i],
  ['enumerated-ban', /\b(?:never|do not|don't|must not|no)\b[^.!?;\n]*?(?:\b[^,.!?;\n]+?\s+or\s+\b[^,.!?;\n]+|,\s*[^,.!?;\n]+(?:,\s*(?:or\s+)?[^,.!?;\n]+)?)/i],
  ['harness-vocabulary', /(?:\bsubagent\b|\bdelegate\b|\bAgent tool\b|\bat session start\b|\balways read\b|\bnever ask\b|\balways ask\b|\bremember this in\b|\blessons\.md\b|\/tmp\b|\bhand off\b)/i],
];

// Shouted imperatives only. Matching every all-caps run would flag any line
// mentioning JSON, HTTP, or MCP, and drown the real findings in acronyms.
const CAPS_IMPERATIVE = /\b(?:NEVER|ALWAYS|MUST|DO NOT|DON'T|REQUIRED|MANDATORY|CRITICAL|IMPORTANT|NOTE)\b/;

function isFence(line) {
  const match = line.match(/^\s*(`{3,}|~{3,})/);
  return match ? { char: match[1][0], length: match[1].length } : null;
}

function isBareImport(line) {
  return /^\s*@[\w~][\w~./\\-]*\s*$/.test(line);
}

export function findInstructionCandidates(file, text) {
  const candidates = [];
  let fence = null;
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const marker = isFence(line);
    if (fence) {
      if (marker?.char === fence.char && marker.length >= fence.length) fence = null;
      continue;
    }
    if (marker) {
      fence = marker;
      continue;
    }
    const trimmed = line.trim();
    if (!trimmed || /^#{1,6}(?:\s|$)/.test(trimmed) || isBareImport(line)) continue;
    for (const [signal, pattern] of SIGNALS) {
      if (pattern.test(line) || (signal === 'absolute' && CAPS_IMPERATIVE.test(line))) {
        candidates.push({ file, line: index + 1, text: trimmed, signal });
      }
    }
  }
  return { totalLines: lines.length, candidates };
}

export function auditInstructions() {
  const claudePath = claudeFile('CLAUDE.md');
  const files = [];
  const claudeText = read(claudePath);
  if (claudeText !== null) files.push({ path: claudePath, text: claudeText });
  const imports = claudeText === null ? [] : parseImports(claudeText);
  const importsAgents = imports.some((entry) => entry.split(/[\\/]/).pop() === 'AGENTS.md');
  const agentsPath = claudeFile('AGENTS.md');
  if (importsAgents && exists(agentsPath)) {
    const agentsText = read(agentsPath);
    if (agentsText !== null) files.push({ path: agentsPath, text: agentsText });
  }
  const results = files.map(({ path: file, text }) => ({ file, ...findInstructionCandidates(file, text) }));
  return {
    files: results.map(({ file }) => file),
    totalLines: results.reduce((total, result) => total + result.totalLines, 0),
    candidates: results.flatMap((result) => result.candidates),
  };
}

function parseQuoted(value) {
  const quote = value[0];
  if (quote !== '\'' && quote !== '"') return null;
  let parsed = '';
  for (let i = 1; i < value.length; i++) {
    const char = value[i];
    if (char === quote) {
      if (quote === '\'' && value[i + 1] === '\'') { parsed += quote; i++; continue; }
      if (!value.slice(i + 1).trim()) return { value: parsed };
      return null;
    }
    if (quote === '"' && char === '\\') {
      const next = value[++i];
      if (next === undefined) return null;
      if (!['"', '\\', '/', 'b', 'f', 'n', 'r', 't'].includes(next)) return null;
      parsed += next === 'n' ? '\n' : next === 'r' ? '\r' : next === 't' ? '\t' : next;
      continue;
    }
    parsed += char;
  }
  return null;
}

// Conservative YAML subset: top-level key: scalar, optional indented continuations.
// Unsupported shapes fail closed so a bad parse can never invent a description.
//
// `require` names the fields a caller cannot proceed without. Skills and agents need
// both; a slash command takes its name from its filename, so only the description is
// meaningful there. A missing fence is flagged separately from a bad parse: for a
// command it is a legitimate state (the whole file is the prompt), not a broken file.
export function parseFrontmatter(text, { require = ['name', 'description'] } = {}) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  if (lines[0] !== '---') {
    return { ok: false, reason: 'frontmatter fence is missing', noFrontmatter: true, body: text };
  }
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === '---') { end = i; break; }
  }
  if (end < 0) return { ok: false, reason: 'frontmatter fence is not closed' };

  const values = {};
  for (let i = 1; i < end; i++) {
    const line = lines[i];
    if (!line.trim() || /^\s*#/.test(line)) continue;
    const entry = line.match(/^([A-Za-z][A-Za-z0-9_-]*):[ \t]*(.*)$/);
    if (!entry || Object.hasOwn(values, entry[1])) {
      return { ok: false, reason: 'frontmatter contains an unsupported or duplicate field' };
    }
    const [, key, raw] = entry;
    if (/^[|>]/.test(raw)) return { ok: false, reason: 'frontmatter uses an unsupported block scalar' };
    let value;
    if (raw.startsWith('\'') || raw.startsWith('"')) {
      const quoted = parseQuoted(raw);
      if (!quoted) return { ok: false, reason: 'frontmatter contains an unterminated or unsupported quoted value' };
      value = quoted.value;
    } else {
      if (!raw || /:\s/.test(raw) || /[\[\]{}&*!]/.test(raw)) {
        return { ok: false, reason: 'frontmatter contains an unsupported scalar value' };
      }
      value = raw;
    }
    const continued = [];
    while (i + 1 < end && /^\s+\S/.test(lines[i + 1])) continued.push(lines[++i].trim());
    if (continued.length) {
      if (raw.startsWith('\'') || raw.startsWith('"')) {
        return { ok: false, reason: 'frontmatter continues a quoted value' };
      }
      value = [value, ...continued].join(' ');
    }
    values[key] = value;
  }
  const absent = require.filter((field) => typeof values[field] !== 'string');
  if (absent.length) {
    return { ok: false, reason: `frontmatter is missing ${absent.join(' or ')}` };
  }
  return {
    ok: true,
    name: values.name,
    description: values.description,
    body: lines.slice(end + 1).join('\n'),
  };
}

// How each kind pays for itself, and how sure we are.
//
//   confirmed   — the description sits in the resident listing every session.
//   inferred    — believed resident, not verified against a running Claude Code. Report
//                 it as a *possible* cost and never argue a rewrite as confidently.
//   conditional — costs nothing until selected. An output style REPLACES the system
//                 prompt, so the active one's whole body is resident and the rest are
//                 free. Cost is the body, not the description.
//
// Same evidence discipline as references/harness-invariants.md: a claim about the
// harness that we did not verify gets labelled, not rounded up to certain.
const KIND_RESIDENCY = {
  skill: 'confirmed',
  agent: 'confirmed',
  command: 'inferred',
  'output-style': 'conditional',
  'plugin-skill': 'confirmed',
  'plugin-agent': 'confirmed',
  'plugin-command': 'inferred',
};

// Kinds whose name comes from the filesystem, not from frontmatter, and which are
// therefore allowed to carry no frontmatter at all.
const NAMED_BY_PATH = new Set(['command', 'output-style', 'plugin-command']);

const markdownFilesIn = (dir, depth = 5) => {
  const found = [];
  const walk = (current, remaining) => {
    for (const name of ls(current).sort()) {
      if (name.startsWith('.') || name === 'node_modules') continue;
      const full = path.join(current, name);
      const st = lstat(full);
      if (st?.isDirectory()) { if (remaining > 0) walk(full, remaining - 1); }
      else if (st?.isFile() && name.endsWith('.md')) found.push(full);
    }
  };
  walk(dir, depth);
  return found;
};

// A slash command's invocation name is its path below commands/, with directories as
// namespaces: commands/git/commit.md -> "git:commit".
const commandName = (root, file) =>
  path.relative(root, file).replace(/\.md$/, '').split(path.sep).join(':');

// Plugin-bundled components, found by STRUCTURE rather than by a hardcoded layout: any
// skills/agents/commands directory below plugins/ belongs to whatever directory contains
// it. The on-disk layout has already drifted once (see scanPlugins' listingReliable fuse),
// so this must not depend on knowing it.
function pluginSurfaces() {
  const pluginsDir = path.join(CLAUDE_DIR, 'plugins');
  if (!exists(pluginsDir)) return [];
  const found = [];
  const walk = (dir, depth) => {
    if (depth < 0) return;
    for (const name of ls(dir).sort()) {
      if (name.startsWith('.') || name === 'node_modules') continue;
      const full = path.join(dir, name);
      if (!lstat(full)?.isDirectory()) continue;
      const plugin = path.basename(dir);
      if (name === 'skills') {
        for (const entry of ls(full).sort()) {
          const file = path.join(full, entry, 'SKILL.md');
          if (lstat(file)?.isFile()) found.push({ kind: 'plugin-skill', path: file, plugin });
        }
      } else if (name === 'agents' || name === 'commands') {
        const kind = name === 'agents' ? 'plugin-agent' : 'plugin-command';
        for (const file of markdownFilesIn(full, 3)) {
          found.push({ kind, path: file, plugin, root: full });
        }
      } else {
        walk(full, depth - 1);
      }
    }
  };
  walk(pluginsDir, 4);
  return found;
}

function surfacePaths() {
  const skillFiles = (dir) => ls(dir).sort().map((name) => path.join(dir, name, 'SKILL.md'))
    .filter((file) => lstat(file)?.isFile())
    .map((file) => ({ kind: 'skill', path: file }));
  const agentDir = path.join(CLAUDE_DIR, 'agents');
  const agents = ls(agentDir).sort().filter((name) => name.endsWith('.md'))
    .map((name) => path.join(agentDir, name)).filter((file) => lstat(file)?.isFile())
    .map((file) => ({ kind: 'agent', path: file }));
  const commandRoot = path.join(CLAUDE_DIR, 'commands');
  const commands = markdownFilesIn(commandRoot).map((file) => ({ kind: 'command', path: file, root: commandRoot }));
  const styleDir = path.join(CLAUDE_DIR, 'output-styles');
  const styles = ls(styleDir).sort().filter((name) => name.endsWith('.md'))
    .map((name) => path.join(styleDir, name)).filter((file) => lstat(file)?.isFile())
    .map((file) => ({ kind: 'output-style', path: file, root: styleDir }));
  return [
    ...skillFiles(path.join(CLAUDE_DIR, 'skills')),
    ...agents,
    ...skillFiles(path.join(AGENTS_DIR, 'skills')),
    ...commands,
    ...styles,
    ...pluginSurfaces(),
  ];
}

// Which style is actually in force. The precedence (local wins) is the install module's
// to know, not this file's — three call sites used to answer it three different ways.
const activeOutputStyle = () => effectiveString('outputStyle');

export function scanSurfaces() {
  const surfaces = [];
  const skipped = [];
  const noFrontmatter = [];
  const activeStyle = activeOutputStyle();

  for (const candidate of surfacePaths()) {
    const { kind } = candidate;
    const text = read(candidate.path);
    if (text === null) {
      skipped.push({ path: candidate.path, reason: 'file could not be read' });
      continue;
    }
    const pathNamed = NAMED_BY_PATH.has(kind);
    const derivedName = kind === 'command' || kind === 'plugin-command'
      ? commandName(candidate.root, candidate.path)
      : path.basename(candidate.path).replace(/\.md$/, '');
    const parsed = parseFrontmatter(text, pathNamed ? { require: ['description'] } : {});

    if (!parsed.ok) {
      // A command or output style with no frontmatter is a real, working file with no
      // description — a routing finding for STEP 15, not a parse failure to hide in
      // `skipped`. Anything else still fails closed.
      if (parsed.noFrontmatter && pathNamed) {
        noFrontmatter.push({
          kind, path: candidate.path, name: derivedName, bodyChars: text.length,
          ...(candidate.plugin ? { plugin: candidate.plugin } : {}),
        });
      } else {
        skipped.push({ path: candidate.path, reason: parsed.reason });
      }
      continue;
    }

    const active = kind === 'output-style' ? derivedName === activeStyle : undefined;
    const residency = KIND_RESIDENCY[kind];
    const residentChars = kind === 'output-style'
      ? (active ? parsed.body.length : 0)
      : parsed.description.length;

    surfaces.push({
      kind,
      path: candidate.path,
      name: pathNamed ? derivedName : parsed.name,
      description: parsed.description,
      descriptionChars: parsed.description.length,
      bodyChars: parsed.body.length,
      residentChars,
      residency: kind === 'output-style' ? (active ? 'confirmed' : 'none') : residency,
      ...(active === undefined ? {} : { active }),
      ...(candidate.plugin ? { plugin: candidate.plugin, reportOnly: true } : {}),
    });
  }

  const sumWhere = (test) => surfaces.filter(test).reduce((total, s) => total + s.residentChars, 0);
  const totalDescriptionChars = surfaces.reduce((total, surface) => total + surface.descriptionChars, 0);
  return {
    surfaces,
    totalDescriptionChars,
    // Split by evidence on purpose: a total that blends verified and assumed cost reads
    // as one number the dev can act on, and half of it would be a guess.
    approxResidentTokens: Math.round(sumWhere((s) => s.residency === 'confirmed') / 4),
    approxResidentTokensInferred: Math.round(sumWhere((s) => s.residency === 'inferred') / 4),
    activeOutputStyle: activeStyle,
    noFrontmatter,
    skipped,
    note: 'Residency is labelled per surface: confirmed, inferred, or none. Report inferred cost as possible, never as measured. Surfaces carrying reportOnly belong to a plugin — never propose deleting one file; the action is uninstalling the plugin (STEP 2).',
  };
}

function usage() {
  process.stdout.write('Usage: node audit-instructions.mjs [--surfaces] [--help]\n');
}

export function main(argv = process.argv.slice(2)) {
  if (argv.includes('--help')) { usage(); return; }
  if (argv.length > 0 && !(argv.length === 1 && argv[0] === '--surfaces')) {
    process.stderr.write('Usage: node audit-instructions.mjs [--surfaces] [--help]\n');
    process.exitCode = 1;
    return;
  }
  out(argv.includes('--surfaces') ? scanSurfaces() : auditInstructions());
}

if (isMain(import.meta.url)) main();
