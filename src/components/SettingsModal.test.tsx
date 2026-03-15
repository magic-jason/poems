import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { shouldOpenSettingsGate } from './SettingsModal';

test('wanxiang mode opens settings gate when dashscope key is missing', () => {
  assert.equal(shouldOpenSettingsGate({ geminiApiKey: '', dashscopeApiKey: '' }, 'wanxiang'), true);
  assert.equal(shouldOpenSettingsGate({ geminiApiKey: '', dashscopeApiKey: 'd-key' }, 'wanxiang'), false);
});

test('gemini mode opens settings gate when gemini key is missing', () => {
  assert.equal(shouldOpenSettingsGate({ geminiApiKey: '', dashscopeApiKey: 'd-key' }, 'free'), true);
  assert.equal(shouldOpenSettingsGate({ geminiApiKey: 'g-key', dashscopeApiKey: '' }, 'paid'), false);
});

test('settings modal source shows 国际版 and 国内版 model labels', () => {
  const source = readFileSync(new URL('./SettingsModal.tsx', import.meta.url), 'utf8');

  assert.match(source, /国际版/);
  assert.match(source, /国内版/);
  assert.doesNotMatch(source, /标准画卷/);
  assert.doesNotMatch(source, /万象画卷/);
});
