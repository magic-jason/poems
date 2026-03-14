import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldOpenSettingsGate } from './SettingsModal';

test('wanxiang mode opens settings gate when dashscope key is missing', () => {
  assert.equal(shouldOpenSettingsGate({ geminiApiKey: '', dashscopeApiKey: '' }, 'wanxiang'), true);
  assert.equal(shouldOpenSettingsGate({ geminiApiKey: '', dashscopeApiKey: 'd-key' }, 'wanxiang'), false);
});

test('gemini mode opens settings gate when gemini key is missing', () => {
  assert.equal(shouldOpenSettingsGate({ geminiApiKey: '', dashscopeApiKey: 'd-key' }, 'free'), true);
  assert.equal(shouldOpenSettingsGate({ geminiApiKey: 'g-key', dashscopeApiKey: '' }, 'paid'), false);
});
