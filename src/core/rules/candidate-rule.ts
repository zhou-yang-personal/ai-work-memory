import type {
  Asset,
  RetentionMode,
  ScopeLevel,
  ScopeSpec,
  SourceEvent,
} from '../assets/types';
import type { PendingCapture } from '../capture/model';

export const MAX_RULE_NAME_LENGTH = 120;
export const MAX_RULE_CONTENT_LENGTH = 12_000;

export interface CandidateRuleDraft {
  name: string;
  content: string;
  scopeLevel: ScopeLevel;
  scopeLabel?: string;
  keepAiEvidence: boolean;
}

export interface NormalizedCandidateRule {
  name: string;
  content: string;
  scope: ScopeSpec;
  keepAiEvidence: boolean;
}

export type RuleSaveMode = 'create' | 'update';

function normalizeInlineText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function normalizeContent(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.replace(/\r\n/g, '\n').trim().slice(0, MAX_RULE_CONTENT_LENGTH);
}

const scopeLevels: ReadonlySet<ScopeLevel> = new Set([
  'global',
  'task',
  'project',
  'custom',
]);

export function slugify(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function normalizeCandidateRuleDraft(
  value: unknown,
): NormalizedCandidateRule | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }

  const candidate = value as Record<string, unknown>;
  const name = normalizeInlineText(candidate.name, MAX_RULE_NAME_LENGTH);
  const content = normalizeContent(candidate.content);
  const scopeLevel = candidate.scopeLevel;

  if (
    !name ||
    !content ||
    typeof scopeLevel !== 'string' ||
    !scopeLevels.has(scopeLevel as ScopeLevel) ||
    typeof candidate.keepAiEvidence !== 'boolean'
  ) {
    return undefined;
  }

  if (scopeLevel === 'global') {
    return {
      name,
      content,
      scope: { level: 'global' },
      keepAiEvidence: candidate.keepAiEvidence,
    };
  }

  const scopeLabel = normalizeInlineText(candidate.scopeLabel, 120);
  if (!scopeLabel) {
    return undefined;
  }

  return {
    name,
    content,
    scope: {
      level: scopeLevel as ScopeLevel,
      key: slugify(scopeLabel),
      label: scopeLabel,
    },
    keepAiEvidence: candidate.keepAiEvidence,
  };
}

export function buildCanonicalKey(rule: NormalizedCandidateRule): string {
  const scopeKey = rule.scope.key ?? 'all';
  return `${rule.scope.level}:${scopeKey}:${slugify(rule.name)}`;
}

export function deriveCandidateRule(capture: PendingCapture): CandidateRuleDraft {
  const compact = capture.selectedText.replace(/\s+/g, ' ').trim();
  const firstClause = compact.split(/[。！？.!?;；]/u)[0] ?? compact;
  const words = firstClause.split(' ').filter(Boolean);
  const hasSpaces = words.length > 1;
  const baseName = hasSpaces
    ? words.slice(0, 7).join(' ')
    : [...firstClause].slice(0, 28).join('');
  const name = `${baseName || 'Captured'} Rule`.slice(0, MAX_RULE_NAME_LENGTH);

  return {
    name,
    content: capture.selectedText,
    scopeLevel: 'global',
    keepAiEvidence: false,
  };
}

export function isExactRuleCandidate(
  asset: Asset,
  candidate: NormalizedCandidateRule,
): boolean {
  return asset.canonical_key === buildCanonicalKey(candidate);
}

export type CapturedSourceEvent = Omit<SourceEvent, 'id'>;

export function buildCapturedSourceEvent(
  capture: PendingCapture,
  keepAiEvidence: boolean,
): CapturedSourceEvent {
  const retentionMode: RetentionMode =
    keepAiEvidence && capture.aiText ? 'with_ai_evidence' : 'minimal';

  return {
    event_type: 'selected_text',
    platform: capture.platform,
    user_text: capture.selectedText,
    captured_at: capture.capturedAt,
    retention_mode: retentionMode,
    ...(retentionMode === 'with_ai_evidence' && capture.aiText
      ? { ai_text: capture.aiText }
      : {}),
  };
}

