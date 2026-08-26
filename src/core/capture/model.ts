import type { SourcePlatform } from '../assets/types';

export const MAX_CAPTURE_TEXT_LENGTH = 12_000;
export const MAX_AI_EVIDENCE_LENGTH = 6_000;
export const MAX_PROJECT_NAME_LENGTH = 160;
export const MAX_CONVERSATION_TITLE_LENGTH = 240;
export const MAX_CURRENT_TASK_LENGTH = 3_000;

export type CaptureChannel = 'floating-action' | 'context-menu';

export interface CaptureContext {
  projectName?: string;
  conversationTitle?: string;
  currentTask?: string;
}

export interface CaptureRequest {
  selectedText: string;
  platform: SourcePlatform;
  channel: CaptureChannel;
  aiText?: string;
  context?: CaptureContext;
}

export function normalizeCaptureContext(
  value: unknown,
): CaptureContext | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }

  const candidate = value as Record<string, unknown>;
  const projectName = normalizeText(
    candidate.projectName,
    MAX_PROJECT_NAME_LENGTH,
  );
  const conversationTitle = normalizeText(
    candidate.conversationTitle,
    MAX_CONVERSATION_TITLE_LENGTH,
  );
  const currentTask = normalizeText(
    candidate.currentTask,
    MAX_CURRENT_TASK_LENGTH,
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

export interface PendingCapture extends CaptureRequest {
  id: string;
  capturedAt: string;
}

export function matchesCapturedSelection(
  capture: CaptureRequest | undefined,
  selectedText: unknown,
): capture is CaptureRequest {
  if (!capture) {
    return false;
  }

  return (
    normalizeText(selectedText, MAX_CAPTURE_TEXT_LENGTH) ===
    normalizeText(capture.selectedText, MAX_CAPTURE_TEXT_LENGTH)
  );
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
  const context = normalizeCaptureContext(candidate.context);
  if (context) {
    request.context = context;
  }

  return request;
}
