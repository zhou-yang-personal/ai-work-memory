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
    '[data-testid*="project-name"]',
    'a[aria-current="page"][href*="/g/g-p-"]',
    'a[aria-current="page"][href*="/project"]',
  ],
  conversationTitle: [
    '[data-testid="conversation-title"]',
    '[data-testid*="conversation-title"]',
    'a[aria-current="page"][href*="/c/"]',
    'header h1',
  ],
  userMessage: [
    '[data-message-author-role="user"]',
    'article[data-turn="user"]',
  ],
} as const;

export function extractChatGptProjectKey(pathname: string): string | undefined {
  return pathname
    .split('/')
    .find((segment) => /^g-p-[a-z0-9_-]+$/i.test(segment));
}

export function formatProjectFallback(projectKey: string): string {
  return `ChatGPT Project (${projectKey.slice(4, 12)})`;
}

function readCandidateText(element: Element | null): string | undefined {
  if (!element) return undefined;

  const htmlElement = element as HTMLElement;
  const text = (
    htmlElement.innerText ||
    element.getAttribute('aria-label') ||
    element.getAttribute('title') ||
    element.textContent ||
    ''
  )
    .replace(/\s+/g, ' ')
    .trim();
  return text || undefined;
}

function readCurrentProjectName(): string | undefined {
  const projectKey = extractChatGptProjectKey(window.location.pathname);
  if (!projectKey) return undefined;

  for (const anchor of document.querySelectorAll<HTMLAnchorElement>('a[href]')) {
    try {
      const path = new URL(anchor.href, window.location.origin).pathname;
      if (!path.includes(`/${projectKey}/`) || !/\/project\/?$/i.test(path)) {
        continue;
      }
      const text = readCandidateText(anchor);
      if (text) return text;
    } catch {
      // Ignore malformed host-page links and continue with selector fallbacks.
    }
  }

  const escapedProjectKey = CSS.escape(projectKey);
  const identitySelectors = [
    `[data-project-id="${escapedProjectKey}"]`,
    `[data-testid*="project"][data-testid*="name"]`,
    'header [aria-label*="project" i]',
    'header [title*="project" i]',
  ];
  for (const selector of identitySelectors) {
    for (const element of document.querySelectorAll(selector)) {
      const text = readCandidateText(element);
      if (text && !/^project$/i.test(text)) return text;
    }
  }

  // The URL remains a stable Project identity if ChatGPT hides the sidebar or
  // changes its DOM. Keep Project Scope visible instead of silently degrading.
  return formatProjectFallback(projectKey);
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
