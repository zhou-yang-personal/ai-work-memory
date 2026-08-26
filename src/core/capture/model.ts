import type { SourcePlatform } from '../assets/types';

export const MAX_CAPTURE_TEXT_LENGTH = 12_000;
export const MAX_AI_EVIDENCE_LENGTH = 6_000;

export type CaptureChannel = 'floating-action' | 'context-menu';

export interface CaptureRequest {
  selectedText: string;
  platform: SourcePlatform;
  channel: CaptureChannel;
  aiText?: string;
}

export interface PendingCapture extends CaptureRequest {
  id: string;
  capturedAt: string;
}

function normalizeText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

const platforms: ReadonlySet<SourcePlatform> = new Set([
  'chatgpt',
  'claude',
  'gemini',
  'generic',
]);

export function normalizeCaptureRequest(
  value: unknown,
): CaptureRequest | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }

  const candidate = value as Record<string, unknown>;
  const selectedText = normalizeText(
    candidate.selectedText,
    MAX_CAPTURE_TEXT_LENGTH,
  );
  const platform = candidate.platform;
  const channel = candidate.channel;

  if (
    !selectedText ||
    typeof platform !== 'string' ||
    !platforms.has(platform as SourcePlatform) ||
    (channel !== 'floating-action' && channel !== 'context-menu')
  ) {
    return undefined;
  }

  const aiText = normalizeText(candidate.aiText, MAX_AI_EVIDENCE_LENGTH);
  const request: CaptureRequest = {
    selectedText,
    platform: platform as SourcePlatform,
    channel,
  };

  if (aiText) {
    request.aiText = aiText;
  }

  return request;
}

