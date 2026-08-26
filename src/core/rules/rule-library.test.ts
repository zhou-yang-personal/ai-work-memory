import { describe, expect, it } from 'vitest';

import type { RuleLibraryItem } from './rule-library';
import { filterRuleLibrary, normalizeLibraryQuery } from './rule-library';

const items: RuleLibraryItem[] = [
  {
    asset: {
      id: 'rule-1',
      kind: 'rule',
      name: 'Project Status Evidence',
      status: 'active',
      scope: { level: 'task', key: 'weekly-report', label: 'Weekly Report' },
      tags: [],
      canonical_key: 'task:weekly-report:project-status-evidence',
      current_revision_id: 'revision-1',
      created_at: '2026-08-25T00:00:00.000Z',
      updated_at: '2026-08-25T00:00:00.000Z',
      usage_count: 0,
    },
    currentRevision: {
      id: 'revision-1',
      asset_id: 'rule-1',
      version: 1,
      content: 'Only say Completed when the source confirms completion.',
      source_event_ids: [],
      created_at: '2026-08-25T00:00:00.000Z',
    },
  },
  {
    asset: {
      id: 'rule-2',
      kind: 'rule',
      name: 'Evidence First',
      status: 'active',
      scope: { level: 'global' },
      tags: [],
      canonical_key: 'global:all:evidence-first',
      current_revision_id: 'revision-2',
      created_at: '2026-08-26T00:00:00.000Z',
      updated_at: '2026-08-26T00:00:00.000Z',
      usage_count: 0,
    },
    currentRevision: {
      id: 'revision-2',
      asset_id: 'rule-2',
      version: 2,
      content: 'Do not infer unsupported facts.',
      source_event_ids: [],
      created_at: '2026-08-26T00:00:00.000Z',
    },
  },
];

describe('Rule Library filtering', () => {
  it('normalizes unsafe query input to stable defaults', () => {
    expect(normalizeLibraryQuery(null)).toEqual({ query: '', scopeLevel: 'all' });
    expect(
      normalizeLibraryQuery({ query: '  status   evidence ', scopeLevel: 'bad' }),
    ).toEqual({ query: 'status evidence', scopeLevel: 'all' });
  });

  it('searches name, scope, and current Rule content', () => {
    expect(
      filterRuleLibrary(items, { query: 'completed', scopeLevel: 'all' }).map(
        (item) => item.asset.id,
      ),
    ).toEqual(['rule-1']);
    expect(
      filterRuleLibrary(items, { query: 'weekly report', scopeLevel: 'all' }).map(
        (item) => item.asset.id,
      ),
    ).toEqual(['rule-1']);
  });

  it('filters by Scope and sorts most recently updated first', () => {
    expect(
      filterRuleLibrary(items, { query: '', scopeLevel: 'all' }).map(
        (item) => item.asset.id,
      ),
    ).toEqual(['rule-2', 'rule-1']);
    expect(
      filterRuleLibrary(items, { query: '', scopeLevel: 'global' }).map(
        (item) => item.asset.id,
      ),
    ).toEqual(['rule-2']);
  });
});
