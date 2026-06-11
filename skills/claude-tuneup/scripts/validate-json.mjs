#!/usr/bin/env node
// Validate that a file parses as JSON. The cross-OS replacement for
// `python3 -m json.tool` (python3 is not guaranteed; this node is).
//   node validate-json.mjs <file> [more files...]
// Prints one {ok, file, error?} per file; exits non-zero if any failed.
import fs from 'node:fs';

const files = process.argv.slice(2);
if (!files.length) { console.error('usage: validate-json.mjs <file> [...]'); process.exit(1); }
let failed = false;
for (const f of files) {
  try {
    JSON.parse(fs.readFileSync(f, 'utf8'));
    process.stdout.write(JSON.stringify({ ok: true, file: f }) + '\n');
  } catch (e) {
    failed = true;
    process.stdout.write(JSON.stringify({ ok: false, file: f, error: e.message }) + '\n');
  }
}
process.exit(failed ? 1 : 0);
