import type { Asset, AssetRevision, ScopeLevel } from '../assets/types';

export type RuleScopeFilter = ScopeLevel | 'all';

export interface RuleLibraryItem {
  asset: Asset;
  currentRevision: AssetRevision;
}

export interface RuleLibraryQuery {
  query: string;
  scopeLevel: RuleScopeFilter;
}

export interface RuleDetail extends RuleLibraryItem {
  revisions: AssetRevision[];
}

export function normalizeLibraryQuery(value: unknown): RuleLibraryQuery {
  if (typeof value !== 'object' || value === null) {
    return { query: '', scopeLevel: 'all' };
  }

  const candidate = value as Record<string, unknown>;
  const query =
    typeof candidate.query === 'string'
      ? candidate.query.replace(/\s+/g, ' ').trim().slice(0, 200)
      : '';
  const allowedScopes: ReadonlySet<RuleScopeFilter> = new Set([
    'all',
    'global',
    'task',
    'project',
    'custom',
  ]);
  const scopeLevel =
    typeof candidate.scopeLevel === 'string' &&
    allowedScopes.has(candidate.scopeLevel as RuleScopeFilter)
      ? (candidate.scopeLevel as RuleScopeFilter)
      : 'all';

  return { query, scopeLevel };
}

export function filterRuleLibrary(
  items: readonly RuleLibraryItem[],
  query: RuleLibraryQuery,
): RuleLibraryItem[] {
  const needle = query.query.toLocaleLowerCase();

  return items
    .filter(({ asset, currentRevision }) => {
      if (
        query.scopeLevel !== 'all' &&
        asset.scope.level !== query.scopeLevel
      ) {
        return false;
      }

      if (!needle) {
        return true;
      }

      const searchable = [
        asset.name,
        asset.scope.label ?? '',
        asset.tags.join(' '),
        currentRevision.content,
      ]
        .join(' ')
        .toLocaleLowerCase();
      return searchable.includes(needle);
    })
    .sort((left, right) =>
      right.asset.updated_at.localeCompare(left.asset.updated_at),
    );
}

