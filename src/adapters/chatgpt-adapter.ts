import type { CaptureRequest } from '../core/capture/model';
import type { PlatformAdapter } from './platform-adapter';
import { findPrecedingEvidence, readSelectionText } from './platform-adapter';

const assistantSelectors = [
  '[data-message-author-role="assistant"]',
  'article[data-turn="assistant"]',
] as const;

export const chatgptAdapter: PlatformAdapter = {
  platform: 'chatgpt',
  matches: (url) => url.hostname === 'chatgpt.com',
  capture(selection): CaptureRequest | undefined {
    const selectedText = readSelectionText(selection);
    if (!selectedText) {
      return undefined;
    }

    const aiText = findPrecedingEvidence(selection, assistantSelectors);
    return {
      selectedText,
      platform: 'chatgpt',
      channel: 'floating-action',
      ...(aiText ? { aiText } : {}),
    };
  },
};

