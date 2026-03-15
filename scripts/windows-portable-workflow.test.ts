import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const workflowPath = join(process.cwd(), '.github', 'workflows', 'windows-portable.yml');
const workflow = readFileSync(workflowPath, 'utf8');

test('workflow can publish latest portable prerelease', () => {
  assert.match(workflow, /contents:\s*write/, 'workflow should request contents: write');
  assert.match(workflow, /tag_name:\s*latest-portable/, 'workflow should publish to fixed latest-portable tag');
  assert.match(workflow, /Latest Portable Build/, 'workflow should update a fixed prerelease name');
  assert.match(workflow, /softprops\/action-gh-release@v2/, 'workflow should upload zip to GitHub Releases');
});


test('workflow uses Node 24 compatible first-party actions', () => {
  assert.match(workflow, /actions\/checkout@v5/, 'workflow should use checkout v5');
  assert.match(workflow, /actions\/setup-node@v5/, 'workflow should use setup-node v5');
  assert.match(workflow, /actions\/upload-artifact@v6/, 'workflow should use upload-artifact v6');
});
