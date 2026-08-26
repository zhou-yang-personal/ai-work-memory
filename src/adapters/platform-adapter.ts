import type { SourcePlatform } from '../core/assets/types';
import type { CaptureRequest } from '../core/capture/model';

export interface PlatformAdapter {
  readonly platform: SourcePlatform;
  matches(url: URL): boolean;
  capture(selection: Selection): CaptureRequest | undefined;
}

export function readSelectionText(selection: Selection): string | undefined {
  const text = selection.toString().replace(/\s+/g, ' ').trim();
  return text || undefined;
}

export function findPrecedingEvidence(
  selection: Selection,
  selectors: readonly string[],
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

    if (precedesSelection || containsSelection) {
      const text = candidate.innerText.replace(/\s+/g, ' ').trim();
      if (text) {
        evidence = text;
      }
    }
  }

  return evidence;
}

