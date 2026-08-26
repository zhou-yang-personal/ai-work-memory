import type { CaptureRequest } from '../core/capture/model';
import type { PlatformAdapter } from './platform-adapter';
import {
  findPrecedingEvidence,
  readBoundedPageContext,
  readSelectionText,
} from './platform-adapter';

const assistantSelectors = [
  'model-response',
  '[data-message-author-role="model"]',
] as const;

const contextSelectors = {
  project: [
    '[data-test-id="gem-name"]',
    '[data-testid="gem-name"]',
    'a[aria-current="page"][href*="/gem/"]',
  ],
  conversationTitle: [
    '[data-test-id="conversation-title"]',
    '[data-testid="conversation-title"]',
    'header h1',
  ],
  userMessage: ['user-query', '[data-message-author-role="user"]'],
} as const;

export const geminiAdapter: PlatformAdapter = {
  platform: 'gemini',
  matches: (url) => url.hostname === 'gemini.google.com',
  capture(selection): CaptureRequest | undefined {
    const selectedText = readSelectionText(selection);
    if (!selectedText) {
      return undefined;
    }

    const aiText = findPrecedingEvidence(selection, assistantSelectors);
    const context = readBoundedPageContext(
      selection,
      contextSelectors,
      'Gemini',
    );
    return {
      selectedText,
      platform: 'gemini',
      channel: 'floating-action',
      ...(aiText ? { aiText } : {}),
      ...(context ? { context } : {}),
    };
  },
};
