import type { SourcePlatform } from '../core/assets/types';
import type { CaptureRequest } from '../core/capture/model';
import { chatgptAdapter } from './chatgpt-adapter';
import { claudeAdapter } from './claude-adapter';
import { geminiAdapter } from './gemini-adapter';
import { genericAdapter } from './generic-adapter';
import type { PlatformAdapter } from './platform-adapter';

const enhancedAdapters: readonly PlatformAdapter[] = [
  chatgptAdapter,
  claudeAdapter,
  geminiAdapter,
];

export function resolvePlatformAdapter(url: URL): PlatformAdapter {
  return enhancedAdapters.find((adapter) => adapter.matches(url)) ?? genericAdapter;
}

export function captureSelection(url: URL, selection: Selection): CaptureRequest | undefined {
  const adapter = resolvePlatformAdapter(url);

  try {
    return adapter.capture(selection) ?? genericAdapter.capture(selection);
  } catch {
    return genericAdapter.capture(selection);
  }
}

export function resolvePlatformFromUrl(rawUrl: string | undefined): SourcePlatform {
  if (!rawUrl) {
    return 'generic';
  }

  try {
    return resolvePlatformAdapter(new URL(rawUrl)).platform;
  } catch {
    return 'generic';
  }
}
