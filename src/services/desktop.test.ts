import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSettings } from './desktop';

test('normalizeSettings fills empty optional fields', () => {
  assert.deepEqual(normalizeSettings({}), {
    geminiApiKey: '',
    dashscopeApiKey: '',
    lastModelType: '',
    lastUsedStyle: '',
  });
});
