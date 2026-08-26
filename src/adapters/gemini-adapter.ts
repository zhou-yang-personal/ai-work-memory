import type { CaptureRequest } from '../core/capture/model';
import type { PlatformAdapter } from './platform-adapter';
import { findPrecedingEvidence, readSelectionText } from './platform-adapter';

const assistantSelectors = [
  'model-response',
  '[data-message-author-role="model"]',
] as const;

export const geminiAdapter: PlatformAdapter = {
  platform: 'gemini',
  matches: (url) => url.hostname === 'gemini.google.com',
  capture(selection): CaptureRequest | undefined {
    const selectedText = readSelectionText(selection);
    if (!selectedText) {
      return undefined;
    }

    const aiText = findPrecedingEvidence(selection, assistantSelectors);
    return {
      selectedText,
      platform: 'gemini',
      channel: 'floating-action',
      ...(aiText ? { aiText } : {}),
    };
  },
};

