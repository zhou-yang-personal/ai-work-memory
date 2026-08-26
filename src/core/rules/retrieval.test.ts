import { describe, expect, it } from 'vitest';

import type { NormalizedCandidateRule } from './candidate-rule';
import type { RuleLibraryItem } from './rule-library';
import {
  detectDuplicateRules,
  normalizeRetrievalInput,
  rankRules,
  tokenize,
} from './retrieval';

function rule(
  id: string,
  name: string,
  content: string,
  scope: RuleLibraryItem['asset']['scope'],
  updatedAt: string,
): RuleLibraryItem {
  return {
    asset: {
      id,
      kind: 'rule',
      name,
      status: 'active',
      scope,
      tags: [],
      canonical_key: `${scope.level}:${scope.key ?? 'all'}:${id}`,
      current_revision_id: `${id}-revision`,
      created_at: updatedAt,
      updated_at: updatedAt,
      usage_count: 0,
    },
    currentRevision: {
      id: `${id}-revision`,
      asset_id: id,
      version: 1,
      content,
      source_event_ids: [],
      created_at: updatedAt,
    },
  };
}

const rules = [
  rule(
    'weekly-status',
    'Project Status Evidence Rule',
    'Only use Completed when the source explicitly confirms completion.',
    { level: 'task', key: 'weekly-report', label: 'Weekly Report' },
    '2026-08-24T00:00:00.000Z',
  ),
  rule(
    'evidence-first',
    'Evidence First',
    'Do not infer facts unsupported by the source.',
    { level: 'global' },
    '2026-08-25T00:00:00.000Z',
  ),
  rule(
    'ppt-title',
    'PPT Title Rule',
    'Use a conclusion-led title.',
    { level: 'task', key: 'presentation', label: 'Presentation' },
    '2026-08-26T00:00:00.000Z',
  ),
];

describe('Rule retrieval', () => {
  it('normalizes input and bounds result limits', () => {
    expect(normalizeRetrievalInput(null)).toBeUndefined();
    expect(
      normalizeRetrievalInput({ task: ' Weekly Report ', currentInput: '', limit: 99 }),
    ).toEqual({ task: 'Weekly Report', currentInput: '', limit: 20 });
  });

  it('tokenizes Chinese text into searchable bigrams', () => {
    expect(tokenize('标题必须基于证据，不要推断')).toEqual(
      expect.arrayContaining(['标题', '证据', '推断']),
    );
  });

  it('ranks Scope and keyword matches with visible reasons', () => {
    const input = normalizeRetrievalInput({
      task: 'Weekly Report',
      currentInput: 'The project status is not explicitly Completed.',
      limit: 5,
    });
    expect(input).toBeDefined();

    const ranked = rankRules(rules, input!);

    expect(ranked.map((item) => item.asset.id)).toEqual([
      'weekly-status',
      'evidence-first',
    ]);
    expect(ranked[0]?.reasons).toEqual(
      expect.arrayContaining([
        'Scope matched: Weekly Report',
        expect.stringContaining('Matched:'),
      ]),
    );
    expect(ranked[0]?.score).toBeGreaterThan(ranked[1]?.score ?? 0);
  });

  it('includes a keyword-only scoped Rule but excludes unrelated scoped Rules', () => {
    const input = normalizeRetrievalInput({
      task: 'Customer update',
      currentInput: 'Need a conclusion-led PPT title.',
    });
    expect(input).toBeDefined();

    const ids = rankRules(rules, input!).map((item) => item.asset.id);
    expect(ids).toContain('ppt-title');
    expect(ids).not.toContain('weekly-status');
  });
});

describe('duplicate Rule detection', () => {
  it('detects same-name and similar-content Rules in the same Scope', () => {
    const candidate: NormalizedCandidateRule = {
      name: 'Project Status Evidence Rule',
      content: 'Only use Completed when the source confirms completion explicitly.',
      scope: { level: 'task', key: 'weekly-report', label: 'Weekly Report' },
      keepAiEvidence: false,
    };

    const duplicates = detectDuplicateRules(candidate, rules);

    expect(duplicates[0]).toMatchObject({
      asset: { id: 'weekly-status' },
      reasons: expect.arrayContaining(['Same Rule name', 'Same Scope']),
    });
    expect(duplicates[0]?.score).toBeGreaterThanOrEqual(0.8);
  });

  it('does not flag unrelated Rules', () => {
    const candidate: NormalizedCandidateRule = {
      name: 'Customer Pricing Rule',
      content: 'Always show monthly price and tax.',
      scope: { level: 'project', key: 'pricing', label: 'Pricing' },
      keepAiEvidence: false,
    };

    expect(detectDuplicateRules(candidate, rules)).toEqual([]);
  });
});
