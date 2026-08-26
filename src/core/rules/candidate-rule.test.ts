import { describe, expect, it } from 'vitest';

import type { PendingCapture } from '../capture/model';
import {
  buildCanonicalKey,
  buildCapturedSourceEvent,
  deriveCandidateRule,
  normalizeCandidateRuleDraft,
} from './candidate-rule';

const capture: PendingCapture = {
  id: 'capture-1',
  selectedText: 'Only mark a project Completed when the source confirms it.',
  aiText: 'The project is completed.',
  platform: 'chatgpt',
  channel: 'floating-action',
  capturedAt: '2026-08-26T00:00:00.000Z',
};

describe('candidate Rule logic', () => {
  it('derives an editable draft without writing an asset', () => {
    expect(deriveCandidateRule(capture)).toEqual({
      name: 'Only mark a project Completed when the Rule',
      content: capture.selectedText,
      scopeLevel: 'global',
      keepAiEvidence: false,
    });
  });

  it('prefills Project Scope from bounded capture context', () => {
    expect(
      deriveCandidateRule({
        ...capture,
        context: { projectName: 'Claro Fiber Migration' },
      }),
    ).toMatchObject({
      scopeLevel: 'project',
      scopeLabel: 'Claro Fiber Migration',
    });
  });

  it('normalizes a scoped candidate and builds a stable canonical key', () => {
    const candidate = normalizeCandidateRuleDraft({
      name: ' Project Status Evidence Rule ',
      content: ' Preserve source status. ',
      scopeLevel: 'task',
      scopeLabel: 'Weekly Report',
      keepAiEvidence: true,
    });

    expect(candidate).toEqual({
      name: 'Project Status Evidence Rule',
      content: 'Preserve source status.',
      scope: {
        level: 'task',
        key: 'weekly-report',
        label: 'Weekly Report',
      },
      keepAiEvidence: true,
    });
    expect(candidate && buildCanonicalKey(candidate)).toBe(
      'task:weekly-report:project-status-evidence-rule',
    );
  });

  it('requires a label for non-global scopes', () => {
    expect(
      normalizeCandidateRuleDraft({
        name: 'Evidence Rule',
        content: 'Preserve source status.',
        scopeLevel: 'project',
        keepAiEvidence: false,
      }),
    ).toBeUndefined();
  });

  it('retains bounded AI evidence only after explicit opt-in', () => {
    expect(buildCapturedSourceEvent(capture, false)).not.toHaveProperty('ai_text');
    expect(buildCapturedSourceEvent(capture, true)).toMatchObject({
      ai_text: capture.aiText,
      retention_mode: 'with_ai_evidence',
    });
  });
});
