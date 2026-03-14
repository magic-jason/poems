import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldOpenSettingsGate } from './SettingsModal';

test('should open settings gate when gemini key is missing', () => {
  assert.equal(shouldOpenSettingsGate({ geminiApiKey: '' }), true);
});

test('should not open settings gate when gemini key exists', () => {
  assert.equal(shouldOpenSettingsGate({ geminiApiKey: 'g-key' }), false);
});
