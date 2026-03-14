import type { PoemAnalysis } from './gemini';

export type ModelType = 'free' | 'paid' | 'wanxiang';

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

export function isDesktopRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
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
): Promise<PoemAnalysis> {
  return invokeCommand<PoemAnalysis>('analyze_poem', {
    payload: { title, author, content, styleName, stylePrompt },
  });
}

export async function generateImageDesktop(prompt: string, modelType: ModelType): Promise<string> {
  return invokeCommand<string>('generate_image', {
    payload: { prompt, modelType },
  });
}
