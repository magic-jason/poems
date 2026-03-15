import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDashscopeAnalysisRequest,
  shouldFallbackDashscopeAnalysis,
} from './gemini';

test('buildDashscopeAnalysisRequest defaults to qwen-plus schema output', () => {
  const body = buildDashscopeAnalysisRequest(
    '静夜思',
    '李白',
    '床前明月光，疑是地上霜。',
    '水墨淡彩',
    '淡雅留白',
  );
  const text = JSON.stringify(body);

  assert.match(text, /qwen-plus/);
  assert.match(text, /json_schema/);
  assert.match(text, /authorIntro/);
  assert.match(text, /imagePrompt/);
});

test('buildDashscopeAnalysisRequest supports qwen3-max fallback model', () => {
  const body = buildDashscopeAnalysisRequest(
    '春晓',
    '孟浩然',
    '春眠不觉晓',
    '水墨',
    '淡雅',
    'qwen3-max',
  );
  const text = JSON.stringify(body);

  assert.match(text, /qwen3-max/);
  assert.match(text, /春晓/);
});

test('shouldFallbackDashscopeAnalysis only retries quota or availability failures', () => {
  assert.equal(shouldFallbackDashscopeAnalysis(429, 'insufficient quota'), true);
  assert.equal(shouldFallbackDashscopeAnalysis(503, 'service unavailable'), true);
  assert.equal(shouldFallbackDashscopeAnalysis(400, 'model not available'), true);
  assert.equal(shouldFallbackDashscopeAnalysis(401, 'InvalidApiKey'), false);
  assert.equal(shouldFallbackDashscopeAnalysis(400, 'invalid schema'), false);
});
