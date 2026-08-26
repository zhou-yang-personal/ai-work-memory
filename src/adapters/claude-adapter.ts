import type { CaptureRequest } from '../core/capture/model';
import type { PlatformAdapter } from './platform-adapter';
import { findPrecedingEvidence, readSelectionText } from './platform-adapter';

const assistantSelectors = [
  '[data-testid="assistant-message"]',
  '[data-is-streaming][data-testid*="message"]',
] as const;

export const claudeAdapter: PlatformAdapter = {
  platform: 'claude',
  matches: (url) => url.hostname === 'claude.ai',
  capture(selection): CaptureRequest | undefined {
    const selectedText = readSelectionText(selection);
    if (!selectedText) {
      return undefined;
    }

    const aiText = findPrecedingEvidence(selection, assistantSelectors);
    return {
      selectedText,
      platform: 'claude',
      channel: 'floating-action',
      ...(aiText ? { aiText } : {}),
    };
  },
};

