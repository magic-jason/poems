import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const scriptPath = join(process.cwd(), 'scripts', 'package-portable.ps1');
const script = readFileSync(scriptPath, 'utf8');

test('portable script prefers the main app exe instead of latest arbitrary exe', () => {
  assert.match(script, /app\.exe/, 'script should explicitly prefer app.exe');
  assert.doesNotMatch(script, /Sort-Object LastWriteTime -Descending/, 'script should not pick the newest exe blindly');
});

test('portable script excludes diagnostic probe binaries from app package', () => {
  assert.match(script, /probe/i, 'script should guard against packaging probe binaries');
});
