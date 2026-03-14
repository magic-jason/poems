import test from 'node:test';
import assert from 'node:assert/strict';
import {
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

test('normalizeModelType defaults to wanxiang', () => {
  assert.equal(normalizeModelType(undefined), 'wanxiang');
  assert.equal(normalizeModelType('paid'), 'paid');
  assert.equal(normalizeModelType('unknown'), 'wanxiang');
});
