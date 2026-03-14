import test from 'node:test';
import assert from 'node:assert/strict';
import { isAppConfiguredForUse, normalizeSettings } from './desktop';

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
    isAppConfiguredForUse(true, { geminiApiKey: 'g-key' }, false),
    true,
  );
});

test('desktop runtime still blocks entry when gemini key is blank', () => {
  assert.equal(
    isAppConfiguredForUse(true, { geminiApiKey: '   ' }, true),
    false,
  );
});

test('web runtime keeps using external key state', () => {
  assert.equal(
    isAppConfiguredForUse(false, { geminiApiKey: '' }, true),
    true,
  );
});
