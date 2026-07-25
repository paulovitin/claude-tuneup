#!/usr/bin/env node
// Read-only instruction audit. It emits candidate signals for an agent to judge;
// it never assigns a verdict, score, severity, or rewrite.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CLAUDE_DIR, AGENTS_DIR, exists, out } from './lib.mjs';
import { parseImports } from './scan.mjs';

const ls = (p) => { try { return fs.readdirSync(p); } catch { return []; } };
const lstat = (p) => { try { return fs.lstatSync(p); } catch { return null; } };
const read = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch { return null; } };

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
  const claudePath = path.join(CLAUDE_DIR, 'CLAUDE.md');
  const files = [];
  const claudeText = read(claudePath);
  if (claudeText !== null) files.push({ path: claudePath, text: claudeText });
  const imports = claudeText === null ? [] : parseImports(claudeText);
  const importsAgents = imports.some((entry) => entry.split(/[\\/]/).pop() === 'AGENTS.md');
  const agentsPath = path.join(CLAUDE_DIR, 'AGENTS.md');
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
export function parseFrontmatter(text) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  if (lines[0] !== '---') return { ok: false, reason: 'frontmatter fence is missing' };
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
  if (typeof values.name !== 'string' || typeof values.description !== 'string') {
    return { ok: false, reason: 'frontmatter is missing name or description' };
  }
  return { ok: true, name: values.name, description: values.description, body: lines.slice(end + 1).join('\n') };
}

function surfacePaths() {
  const skillFiles = (dir) => ls(dir).sort().map((name) => path.join(dir, name, 'SKILL.md'))
    .filter((file) => lstat(file)?.isFile())
    .map((file) => ({ kind: 'skill', path: file }));
  const agentDir = path.join(CLAUDE_DIR, 'agents');
  const agents = ls(agentDir).sort().filter((name) => name.endsWith('.md'))
    .map((name) => path.join(agentDir, name)).filter((file) => lstat(file)?.isFile())
    .map((file) => ({ kind: 'agent', path: file }));
  return [
    ...skillFiles(path.join(CLAUDE_DIR, 'skills')),
    ...agents,
    ...skillFiles(path.join(AGENTS_DIR, 'skills')),
  ];
}

export function scanSurfaces() {
  const surfaces = [];
  const skipped = [];
  for (const candidate of surfacePaths()) {
    const text = read(candidate.path);
    if (text === null) {
      skipped.push({ path: candidate.path, reason: 'file could not be read' });
      continue;
    }
    const parsed = parseFrontmatter(text);
    if (!parsed.ok) {
      skipped.push({ path: candidate.path, reason: parsed.reason });
      continue;
    }
    surfaces.push({
      kind: candidate.kind,
      path: candidate.path,
      name: parsed.name,
      description: parsed.description,
      descriptionChars: parsed.description.length,
      bodyChars: parsed.body.length,
    });
  }
  const totalDescriptionChars = surfaces.reduce((total, surface) => total + surface.descriptionChars, 0);
  return {
    surfaces,
    totalDescriptionChars,
    approxResidentTokens: Math.round(totalDescriptionChars / 4),
    skipped,
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

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
