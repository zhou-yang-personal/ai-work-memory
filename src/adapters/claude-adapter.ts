import type { CaptureRequest } from '../core/capture/model';
import type { PlatformAdapter } from './platform-adapter';
import {
  findPrecedingEvidence,
  readBoundedPageContext,
  readSelectionText,
} from './platform-adapter';

const assistantSelectors = [
  '[data-testid="assistant-message"]',
  '[data-is-streaming][data-testid*="message"]',
] as const;

const contextSelectors = {
  project: [
    '[data-testid="project-name"]',
    'a[aria-current="page"][href*="/project/"]',
  ],
  conversationTitle: [
    '[data-testid="conversation-title"]',
    'header h1',
  ],
  userMessage: [
    '[data-testid="user-message"]',
    '[data-message-author-role="user"]',
  ],
} as const;

export const claudeAdapter: PlatformAdapter = {
  platform: 'claude',
  matches: (url) => url.hostname === 'claude.ai',
  capture(selection): CaptureRequest | undefined {
    const selectedText = readSelectionText(selection);
    if (!selectedText) {
      return undefined;
    }

    const aiText = findPrecedingEvidence(selection, assistantSelectors);
    const context = readBoundedPageContext(
      selection,
      contextSelectors,
      'Claude',
    );
    return {
      selectedText,
      platform: 'claude',
      channel: 'floating-action',
      ...(aiText ? { aiText } : {}),
      ...(context ? { context } : {}),
    };
  },
};
