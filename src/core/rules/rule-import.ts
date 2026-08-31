import type { ScopeLevel } from '../assets/types';
import {
  buildCanonicalKey,
  normalizeCandidateRuleDraft,
  type NormalizedCandidateRule,
} from './candidate-rule';

export const MAX_BULK_RULE_IMPORT_COUNT = 500;

export interface NormalizedRuleImportItem {
  rule: NormalizedCandidateRule;
  canonicalKey: string;
  tags: string[];
}

export interface RuleImportValidation {
  valid: boolean;
  rules: NormalizedRuleImportItem[];
  errors: string[];
}

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const tags = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.replace(/\s+/g, ' ').trim().slice(0, 40))
    .filter(Boolean);
  return [...new Set(tags)].slice(0, 20);
}

function normalizeScopeLevel(value: unknown): ScopeLevel | undefined {
  if (
    value === 'global' ||
    value === 'task' ||
    value === 'project' ||
    value === 'custom'
  ) {
    return value;
  }
  return undefined;
}

export function normalizeRuleImport(value: unknown): RuleImportValidation {
  const input = Array.isArray(value)
    ? value
    : typeof value === 'object' && value !== null && 'rules' in value
      ? (value as { rules?: unknown }).rules
      : undefined;

  if (!Array.isArray(input)) {
    return {
      valid: false,
      rules: [],
      errors: ['Rule import must be a JSON array or an object with a rules array.'],
    };
  }

  if (input.length === 0) {
    return { valid: false, rules: [], errors: ['Rule import is empty.'] };
  }

  if (input.length > MAX_BULK_RULE_IMPORT_COUNT) {
    return {
      valid: false,
      rules: [],
      errors: [`Rule import is limited to ${MAX_BULK_RULE_IMPORT_COUNT} Rules at a time.`],
    };
  }

  const rules: NormalizedRuleImportItem[] = [];
  const errors: string[] = [];
  const canonicalKeys = new Set<string>();

  input.forEach((item, index) => {
    if (typeof item !== 'object' || item === null) {
      errors.push(`Rule ${index + 1} is not an object.`);
      return;
    }

    const source = item as Record<string, unknown>;
    const scopeLevel =
      normalizeScopeLevel(source.scopeLevel) ??
      normalizeScopeLevel(source.scope) ??
      'global';
    const scopeLabel = source.scopeLabel ?? source.scopeName;
    const rule = normalizeCandidateRuleDraft({
      name: source.name,
      content: source.content,
      scopeLevel,
      ...(scopeLabel === undefined ? {} : { scopeLabel }),
      keepAiEvidence: false,
    });

    if (!rule) {
      errors.push(
        `Rule ${index + 1} is invalid. Provide name, content, and a Scope Name for non-global Rules.`,
      );
      return;
    }

    const canonicalKey = buildCanonicalKey(rule);
    if (canonicalKeys.has(canonicalKey)) {
      errors.push(`Rule ${index + 1} duplicates another Rule in this import.`);
      return;
    }
    canonicalKeys.add(canonicalKey);
    rules.push({ rule, canonicalKey, tags: normalizeTags(source.tags) });
  });

  return { valid: errors.length === 0, rules, errors };
}
