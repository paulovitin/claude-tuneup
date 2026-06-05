#!/usr/bin/env node
// Print the CHANGELOG.md section for a given version. Used by the release workflow
// to turn a pushed vX.Y.Z tag into release notes. No deps.
//   node .github/scripts/changelog-section.mjs 1.2.3   -> prints the "## [1.2.3] ..." body
import fs from 'node:fs';

const version = (process.argv[2] || '').replace(/^v/, '');
if (!version) { console.error('usage: changelog-section.mjs <version>'); process.exit(1); }

const md = fs.readFileSync('CHANGELOG.md', 'utf8');
const lines = md.split('\n');

// A section starts at "## [<version>]" and ends at the next "## [" heading.
const startRe = new RegExp(`^## \\[${version.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\]`);
let start = lines.findIndex(l => startRe.test(l));
if (start === -1) {
  console.error(`no changelog section for ${version}`);
  process.exit(1);
}
let end = lines.findIndex((l, i) => i > start && /^## \[/.test(l));
if (end === -1) end = lines.length;

// Drop link-reference definitions ("[x]: https://...") and trim blank edges.
const body = lines.slice(start + 1, end)
  .filter(l => !/^\[[^\]]+\]:\s+https?:\/\//.test(l))
  .join('\n')
  .trim();

process.stdout.write(body + '\n');
