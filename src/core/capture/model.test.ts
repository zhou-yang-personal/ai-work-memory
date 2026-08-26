import { describe, expect, it } from 'vitest';

import {
  MAX_AI_EVIDENCE_LENGTH,
  MAX_CAPTURE_TEXT_LENGTH,
  MAX_CURRENT_TASK_LENGTH,
  normalizeCaptureRequest,
} from './model';

describe('normalizeCaptureRequest', () => {
  it('normalizes whitespace and preserves optional evidence', () => {
    expect(
      normalizeCaptureRequest({
        selectedText: '  Keep   headings short. ',
        platform: 'chatgpt',
        channel: 'floating-action',
        aiText: ' A   long heading ',
        context: {
          projectName: ' Claro   Fiber ',
          conversationTitle: ' Villavicencio   analysis ',
          currentTask: ' Identify   cable migration areas ',
        },
      }),
    ).toEqual({
      selectedText: 'Keep headings short.',
      platform: 'chatgpt',
      channel: 'floating-action',
      aiText: 'A long heading',
      context: {
        projectName: 'Claro Fiber',
        conversationTitle: 'Villavicencio analysis',
        currentTask: 'Identify cable migration areas',
      },
    });
  });

  it('rejects empty, malformed, or unknown capture requests', () => {
    expect(normalizeCaptureRequest(null)).toBeUndefined();
    expect(
      normalizeCaptureRequest({
        selectedText: '  ',
        platform: 'generic',
        channel: 'context-menu',
      }),
    ).toBeUndefined();
    expect(
      normalizeCaptureRequest({
        selectedText: 'Text',
        platform: 'unknown',
        channel: 'context-menu',
      }),
    ).toBeUndefined();
  });

  it('bounds content at the capture trust boundary', () => {
    const result = normalizeCaptureRequest({
      selectedText: 'x'.repeat(MAX_CAPTURE_TEXT_LENGTH + 20),
      platform: 'generic',
      channel: 'context-menu',
      aiText: 'y'.repeat(MAX_AI_EVIDENCE_LENGTH + 20),
      context: { currentTask: 'z'.repeat(MAX_CURRENT_TASK_LENGTH + 20) },
    });

    expect(result?.selectedText).toHaveLength(MAX_CAPTURE_TEXT_LENGTH);
    expect(result?.aiText).toHaveLength(MAX_AI_EVIDENCE_LENGTH);
    expect(result?.context?.currentTask).toHaveLength(MAX_CURRENT_TASK_LENGTH);
  });
});
