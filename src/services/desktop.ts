import type { PoemAnalysis } from './gemini';

export type ModelType = 'free' | 'paid' | 'wanxiang';
export type RequiredKey = 'gemini' | 'dashscope';

export interface AppSettings {
  geminiApiKey: string;
  dashscopeApiKey: string;
  lastModelType: string;
  lastUsedStyle: string;
}

interface RawSettings {
  geminiApiKey?: string | null;
  dashscopeApiKey?: string | null;
  lastModelType?: string | null;
  lastUsedStyle?: string | null;
}

export function normalizeSettings(input: RawSettings = {}): AppSettings {
  return {
    geminiApiKey: input.geminiApiKey ?? '',
    dashscopeApiKey: input.dashscopeApiKey ?? '',
    lastModelType: input.lastModelType ?? '',
    lastUsedStyle: input.lastUsedStyle ?? '',
  };
}

export function normalizeModelType(modelType?: string | null): ModelType {
  if (modelType === 'free' || modelType === 'wanxiang') {
    return modelType;
  }

  if (modelType === 'paid') {
    return 'free';
  }

  return 'wanxiang';
}

export function getRequiredKeyForModel(modelType: ModelType): RequiredKey {
  return modelType === 'wanxiang' ? 'dashscope' : 'gemini';
}

export function isSettingsSatisfiedForModel(
  settings: Pick<AppSettings, 'geminiApiKey' | 'dashscopeApiKey'>,
  modelType: ModelType,
): boolean {
  const requiredKey = getRequiredKeyForModel(modelType);
  if (requiredKey === 'dashscope') {
    return Boolean(settings.dashscopeApiKey.trim());
  }

  return Boolean(settings.geminiApiKey.trim());
}

export function isAppConfiguredForUse(
  desktopMode: boolean,
  settings: Pick<AppSettings, 'geminiApiKey' | 'dashscopeApiKey'>,
  hasExternalKey: boolean,
  modelType: ModelType,
): boolean {
  if (desktopMode) {
    return isSettingsSatisfiedForModel(settings, modelType);
  }

  return hasExternalKey;
}

export function isDesktopRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export function extractErrorMessage(error: unknown, fallback = '生成失败，请稍后重试。'): string {
  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === 'object' && error && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  return fallback;
}

async function invokeCommand<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(command, args);
}

export async function loadSettings(): Promise<AppSettings> {
  const raw = await invokeCommand<RawSettings>('load_settings');
  return normalizeSettings(raw ?? {});
}

export async function saveSettings(settings: Partial<AppSettings>): Promise<void> {
  const normalized = normalizeSettings(settings);
  await invokeCommand('save_settings', {
    settings: {
      geminiApiKey: normalized.geminiApiKey || null,
      dashscopeApiKey: normalized.dashscopeApiKey || null,
      lastModelType: normalized.lastModelType || null,
      lastUsedStyle: normalized.lastUsedStyle || null,
    },
  });
}

export async function analyzePoemDesktop(
  title: string,
  author: string,
  content: string,
  styleName: string,
  stylePrompt: string,
  modelType: ModelType,
): Promise<PoemAnalysis> {
  return invokeCommand<PoemAnalysis>('analyze_poem', {
    payload: { title, author, content, styleName, stylePrompt, modelType },
  });
}

export async function generateImageDesktop(prompt: string, modelType: ModelType): Promise<string> {
  return invokeCommand<string>('generate_image', {
    payload: { prompt, modelType },
  });
}
