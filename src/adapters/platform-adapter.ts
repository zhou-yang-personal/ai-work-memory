import type { SourcePlatform } from '../core/assets/types';
import type { CaptureContext, CaptureRequest } from '../core/capture/model';

export interface PlatformAdapter {
  readonly platform: SourcePlatform;
  matches(url: URL): boolean;
  capture(selection: Selection): CaptureRequest | undefined;
}

export interface PageContextSelectors {
  project: readonly string[];
  conversationTitle: readonly string[];
  userMessage: readonly string[];
}

export function readSelectionText(selection: Selection): string | undefined {
  const text = selection.toString().replace(/\s+/g, ' ').trim();
  return text || undefined;
}

export function findPrecedingEvidence(
  selection: Selection,
  selectors: readonly string[],
  includeContaining = true,
): string | undefined {
  const anchor = selection.anchorNode;
  if (!anchor) {
    return undefined;
  }

  const candidates = document.querySelectorAll<HTMLElement>(selectors.join(','));
  let evidence: string | undefined;

  for (const candidate of candidates) {
    const relation = candidate.compareDocumentPosition(anchor);
    const precedesSelection = Boolean(relation & Node.DOCUMENT_POSITION_FOLLOWING);
    const containsSelection = Boolean(relation & Node.DOCUMENT_POSITION_CONTAINED_BY);

    if (precedesSelection || (includeContaining && containsSelection)) {
      const text = candidate.innerText.replace(/\s+/g, ' ').trim();
      if (text) {
        evidence = text;
      }
    }
  }

  return evidence;
}

function readElementText(element: HTMLElement): string | undefined {
  if (element.hidden || element.getAttribute('aria-hidden') === 'true') {
    return undefined;
  }

  const text = (element.innerText || element.textContent || '')
    .replace(/\s+/g, ' ')
    .trim();
  return text || undefined;
}

function findFirstPageText(selectors: readonly string[]): string | undefined {
  for (const selector of selectors) {
    for (const element of document.querySelectorAll<HTMLElement>(selector)) {
      const text = readElementText(element);
      if (text) return text;
    }
  }

  return undefined;
}

export function cleanConversationTitle(
  title: string,
  platformName: string,
): string | undefined {
  const escapedName = platformName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const cleaned = title
    .replace(new RegExp(`\\s*[|·\\-–—]\\s*${escapedName}\\s*$`, 'i'), '')
    .trim();

  if (!cleaned || cleaned.toLocaleLowerCase() === platformName.toLocaleLowerCase()) {
    return undefined;
  }

  return cleaned;
}

export function readBoundedPageContext(
  selection: Selection,
  selectors: PageContextSelectors,
  platformName: string,
): CaptureContext | undefined {
  const projectName = findFirstPageText(selectors.project);
  const visibleConversationTitle = findFirstPageText(
    selectors.conversationTitle,
  );
  const conversationTitle =
    visibleConversationTitle ?? cleanConversationTitle(document.title, platformName);
  const currentTask = findPrecedingEvidence(
    selection,
    selectors.userMessage,
    false,
  );

  if (!projectName && !conversationTitle && !currentTask) {
    return undefined;
  }

  return {
    ...(projectName ? { projectName } : {}),
    ...(conversationTitle ? { conversationTitle } : {}),
    ...(currentTask ? { currentTask } : {}),
  };
}
