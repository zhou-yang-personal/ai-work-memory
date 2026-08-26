import { describe, expect, it } from 'vitest';

import type { RankedRule } from '../rules/retrieval';
import { composeContext, defaultIncludedRuleIds } from './context-composer';

function rankedRule(id: string, content: string, score: number): RankedRule {
  return {
    asset: {
      id,
      kind: 'rule',
      name: id,
      status: 'active',
      scope: { level: 'global' },
      tags: [],
      canonical_key: `global:all:${id}`,
      current_revision_id: `${id}-revision`,
      created_at: '2026-08-26T00:00:00.000Z',
      updated_at: '2026-08-26T00:00:00.000Z',
      usage_count: 0,
    },
    currentRevision: {
      id: `${id}-revision`,
      asset_id: id,
      version: 1,
      content,
      source_event_ids: [],
      created_at: '2026-08-26T00:00:00.000Z',
    },
    score,
    reasons: ['Global scope'],
    matchedTerms: [],
  };
}

describe('Context Composer', () => {
  it('composes a deterministic, copy-ready context from selected Rules', () => {
    const context = composeContext({
      task: ' Write the weekly report. ',
      currentInput: 'Project A remains in Validation.',
      rules: [
        rankedRule(
          'status-rule',
          'Only use Completed when the source confirms completion.',
          0.9,
        ),
      ],
    });

    expect(context).toContain('# Task\n\nWrite the weekly report.');
    expect(context).toContain(
      '# Working Rules\n\n1. Only use Completed when the source confirms completion.',
    );
    expect(context).toContain('# Current Input\n\nProject A remains in Validation.');
    expect(context).toContain('Do not infer unsupported facts or status.');
  });

  it('selects strong recommendations and keeps a weak top fallback', () => {
    expect(
      [...defaultIncludedRuleIds([
        rankedRule('strong', 'Strong', 0.8),
        rankedRule('weak', 'Weak', 0.1),
      ])],
    ).toEqual(['strong']);
    expect(
      [...defaultIncludedRuleIds([rankedRule('weak', 'Weak', 0.1)])],
    ).toEqual(['weak']);
  });
});
