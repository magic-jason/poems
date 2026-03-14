import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractErrorMessage,
  getRequiredKeyForModel,
  normalizeModelType,
  isAppConfiguredForUse,
  isSettingsSatisfiedForModel,
  normalizeSettings,
} from './desktop';

test('normalizeSettings fills empty optional fields', () => {
  assert.deepEqual(normalizeSettings({}), {
    geminiApiKey: '',
    dashscopeApiKey: '',
    lastModelType: '',
    lastUsedStyle: '',
  });
});

test('desktop runtime trusts saved gemini key over stale hasKey flag', () => {
  assert.equal(
    isAppConfiguredForUse(true, { geminiApiKey: 'g-key', dashscopeApiKey: '' }, false, 'free'),
    true,
  );
});

test('desktop runtime still blocks entry when required key is blank', () => {
  assert.equal(
    isAppConfiguredForUse(true, { geminiApiKey: '   ', dashscopeApiKey: '' }, true, 'free'),
    false,
  );
});

test('web runtime keeps using external key state', () => {
  assert.equal(
    isAppConfiguredForUse(false, { geminiApiKey: '', dashscopeApiKey: '' }, true, 'wanxiang'),
    true,
  );
});

test('wanxiang mode only requires dashscope key', () => {
  assert.equal(getRequiredKeyForModel('wanxiang'), 'dashscope');
  assert.equal(
    isSettingsSatisfiedForModel({ geminiApiKey: '', dashscopeApiKey: 'dash-key' }, 'wanxiang'),
    true,
  );
  assert.equal(
    isSettingsSatisfiedForModel({ geminiApiKey: 'gem-key', dashscopeApiKey: '' }, 'wanxiang'),
    false,
  );
});

test('gemini modes only require gemini key', () => {
  assert.equal(getRequiredKeyForModel('free'), 'gemini');
  assert.equal(getRequiredKeyForModel('paid'), 'gemini');
  assert.equal(
    isSettingsSatisfiedForModel({ geminiApiKey: 'gem-key', dashscopeApiKey: '' }, 'paid'),
    true,
  );
  assert.equal(
    isSettingsSatisfiedForModel({ geminiApiKey: '', dashscopeApiKey: 'dash-key' }, 'free'),
    false,
  );
});

test('normalizeModelType hides paid model behind free', () => {
  assert.equal(normalizeModelType(undefined), 'wanxiang');
  assert.equal(normalizeModelType('paid'), 'free');
  assert.equal(normalizeModelType('unknown'), 'wanxiang');
});

test('extractErrorMessage preserves string and object messages', () => {
  assert.equal(extractErrorMessage('DashScope 解析失败：bad json'), 'DashScope 解析失败：bad json');
  assert.equal(extractErrorMessage(new Error('network timeout')), 'network timeout');
  assert.equal(extractErrorMessage({ message: 'tauri invoke failed' }), 'tauri invoke failed');
  assert.equal(extractErrorMessage({ reason: 'x' }, 'fallback'), 'fallback');
});
