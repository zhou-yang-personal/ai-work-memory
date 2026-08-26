import type { CaptureRequest } from '../core/capture/model';
import type { PlatformAdapter } from './platform-adapter';
import {
  findPrecedingEvidence,
  readBoundedPageContext,
  readSelectionText,
} from './platform-adapter';

const assistantSelectors = [
  '[data-message-author-role="assistant"]',
  'article[data-turn="assistant"]',
] as const;

const contextSelectors = {
  project: [
    '[data-testid="project-name"]',
    'a[aria-current="page"][href*="/g/g-p-"]',
    'a[aria-current="page"][href*="/project"]',
  ],
  conversationTitle: [
    '[data-testid="conversation-title"]',
    'header h1',
  ],
  userMessage: [
    '[data-message-author-role="user"]',
    'article[data-turn="user"]',
  ],
} as const;

function readCurrentProjectName(): string | undefined {
  const projectKey = window.location.pathname
    .split('/')
    .find((segment) => segment.startsWith('g-p-'));
  if (!projectKey) return undefined;

  for (const anchor of document.querySelectorAll<HTMLAnchorElement>('a[href]')) {
    try {
      const path = new URL(anchor.href, window.location.origin).pathname;
      if (!path.includes(`/${projectKey}/`) || !path.endsWith('/project')) {
        continue;
      }
      const text = (anchor.innerText || anchor.textContent || '')
        .replace(/\s+/g, ' ')
        .trim();
      if (text) return text;
    } catch {
      // Ignore malformed host-page links and continue with selector fallbacks.
    }
  }

  return undefined;
}

export const chatgptAdapter: PlatformAdapter = {
  platform: 'chatgpt',
  matches: (url) => url.hostname === 'chatgpt.com',
  capture(selection): CaptureRequest | undefined {
    const selectedText = readSelectionText(selection);
    if (!selectedText) {
      return undefined;
    }

    const aiText = findPrecedingEvidence(selection, assistantSelectors);
    const detectedContext = readBoundedPageContext(
      selection,
      contextSelectors,
      'ChatGPT',
    );
    const projectName = readCurrentProjectName();
    const context =
      projectName || detectedContext
        ? {
            ...detectedContext,
            ...(projectName ? { projectName } : {}),
          }
        : undefined;
    return {
      selectedText,
      platform: 'chatgpt',
      channel: 'floating-action',
      ...(aiText ? { aiText } : {}),
      ...(context ? { context } : {}),
    };
  },
};
