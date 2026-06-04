#!/usr/bin/env node
// Run Claude Code's built-in /insights headlessly (no browser) and extract the useful
// sections of the generated HTML report. Read-only. Cross-OS.
// The report is the dev's own local data — printed for live use, never stored by this skill.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

function generate() {
  // `claude -p "/insights"` prints a line containing file://....html and opens no browser.
  let stdout = '';
  try {
    stdout = execFileSync('claude', ['-p', '/insights'], { encoding: 'utf8', timeout: 120000 });
  } catch (e) {
    stdout = (e.stdout || '').toString();
  }
  const m = stdout.match(/file:\/\/(\S+\.html)/);
  return m ? decodeURIComponent(m[1]) : null;
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

const report = generate();
if (!report || !fs.existsSync(report)) {
  process.stdout.write(JSON.stringify({ ok: false, reason: 'no report (needs session history, or claude -p unavailable)' }, null, 2) + '\n');
  process.exit(0);
}
const html = fs.readFileSync(report, 'utf8');
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
process.stdout.write(JSON.stringify({ ok: true, report, sections }, null, 2) + '\n');
