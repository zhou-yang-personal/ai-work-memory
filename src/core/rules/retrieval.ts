import type { NormalizedCandidateRule } from './candidate-rule';
import { slugify } from './candidate-rule';
import type { RuleLibraryItem } from './rule-library';

export interface RetrievalInput {
  task: string;
  currentInput: string;
  limit?: number;
}

export interface NormalizedRetrievalInput {
  task: string;
  currentInput: string;
  limit: number;
}

export interface RankedRule extends RuleLibraryItem {
  score: number;
  reasons: string[];
  matchedTerms: string[];
}

export interface DuplicateRuleMatch extends RuleLibraryItem {
  score: number;
  reasons: string[];
}

const stopWords = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'in',
  'is',
  'it',
  'of',
  'on',
  'or',
  'that',
  'the',
  'this',
  'to',
  'with',
]);

function boundedText(value: unknown, maxLength: number): string {
  return typeof value === 'string'
    ? value.replace(/\r\n/g, '\n').trim().slice(0, maxLength)
    : '';
}

export function normalizeRetrievalInput(
  value: unknown,
): NormalizedRetrievalInput | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }

  const candidate = value as Record<string, unknown>;
  const task = boundedText(candidate.task, 500);
  const currentInput = boundedText(candidate.currentInput, 12_000);
  if (!task && !currentInput) {
    return undefined;
  }

  const requestedLimit =
    typeof candidate.limit === 'number' && Number.isFinite(candidate.limit)
      ? Math.floor(candidate.limit)
      : 8;

  return {
    task,
    currentInput,
    limit: Math.max(1, Math.min(requestedLimit, 20)),
  };
}

export function tokenize(value: string): string[] {
  const chunks =
    value
      .normalize('NFKC')
      .toLocaleLowerCase()
      .match(/[\p{L}\p{N}]+/gu) ?? [];
  const tokens = new Set<string>();

  for (const chunk of chunks) {
    const hanCharacters = [...chunk].filter((character) =>
      /\p{Script=Han}/u.test(character),
    );
    if (hanCharacters.length > 0) {
      if (hanCharacters.length === 1) {
        tokens.add(hanCharacters[0] ?? chunk);
      } else {
        for (let index = 0; index < hanCharacters.length - 1; index += 1) {
          tokens.add(`${hanCharacters[index]}${hanCharacters[index + 1]}`);
        }
      }
      continue;
    }

    if (chunk.length > 1 && !stopWords.has(chunk)) {
      tokens.add(chunk);
    }
  }

  return [...tokens];
}

function intersection(left: ReadonlySet<string>, right: ReadonlySet<string>) {
  return [...left].filter((token) => right.has(token));
}

function jaccard(left: ReadonlySet<string>, right: ReadonlySet<string>): number {
  if (left.size === 0 && right.size === 0) {
    return 1;
  }

  const overlap = intersection(left, right).length;
  const union = new Set([...left, ...right]).size;
  return union ? overlap / union : 0;
}

function roundScore(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function scopeScore(item: RuleLibraryItem, taskTokens: ReadonlySet<string>) {
  const { scope } = item.asset;
  if (scope.level === 'global') {
    return { score: 0.4, reason: 'Global scope' };
  }

  const label = scope.label ?? scope.key ?? '';
  const scopeTokens = new Set(tokenize(label));
  if (!scopeTokens.size || !taskTokens.size) {
    return { score: 0 };
  }

  const overlap = intersection(scopeTokens, taskTokens).length / scopeTokens.size;
  if (overlap === 0) {
    return { score: 0 };
  }

  return {
    score: 0.55 + overlap * 0.45,
    reason: `Scope matched: ${label}`,
  };
}

export function rankRules(
  items: readonly RuleLibraryItem[],
  input: NormalizedRetrievalInput,
): RankedRule[] {
  const taskTokens = new Set(tokenize(input.task));
  const queryTokens = new Set(tokenize(`${input.task} ${input.currentInput}`));

  return items
    .map((item): RankedRule | undefined => {
      const nameTokens = new Set(tokenize(item.asset.name));
      const ruleTokens = new Set(
        tokenize(
          [
            item.asset.name,
            item.asset.scope.label ?? '',
            item.asset.tags.join(' '),
            item.currentRevision.content,
          ].join(' '),
        ),
      );
      const matchedTerms = intersection(queryTokens, ruleTokens);
      const coverage = queryTokens.size
        ? matchedTerms.length / queryTokens.size
        : 0;
      const nameMatches = intersection(queryTokens, nameTokens).length;
      const nameCoverage = queryTokens.size ? nameMatches / queryTokens.size : 0;
      const keywordScore = Math.min(1, coverage * 0.8 + nameCoverage * 0.2);
      const scope = scopeScore(item, taskTokens);
      const score = roundScore(scope.score * 0.45 + keywordScore * 0.55);

      if (score <= 0) {
        return undefined;
      }

      const reasons: string[] = [];
      if (scope.reason) {
        reasons.push(scope.reason);
      }
      if (matchedTerms.length) {
        reasons.push(`Matched: ${matchedTerms.slice(0, 4).join(', ')}`);
      }
      if (nameMatches) {
        reasons.push('Rule name matched');
      }

      return { ...item, score, reasons, matchedTerms };
    })
    .filter((item): item is RankedRule => item !== undefined)
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.asset.updated_at.localeCompare(left.asset.updated_at),
    )
    .slice(0, input.limit);
}

export function detectDuplicateRules(
  candidate: NormalizedCandidateRule,
  items: readonly RuleLibraryItem[],
  limit = 3,
): DuplicateRuleMatch[] {
  const candidateName = new Set(tokenize(candidate.name));
  const candidateContent = new Set(tokenize(candidate.content));
  const candidateNameSlug = slugify(candidate.name);

  return items
    .map((item): DuplicateRuleMatch | undefined => {
      const nameSlug = slugify(item.asset.name);
      const exactName = Boolean(candidateNameSlug && candidateNameSlug === nameSlug);
      const nameSimilarity = exactName
        ? 1
        : jaccard(candidateName, new Set(tokenize(item.asset.name)));
      const contentSimilarity = jaccard(
        candidateContent,
        new Set(tokenize(item.currentRevision.content)),
      );
      const sameScope =
        candidate.scope.level === item.asset.scope.level &&
        (candidate.scope.key ?? '') === (item.asset.scope.key ?? '');
      const score = roundScore(
        nameSimilarity * 0.45 +
          contentSimilarity * 0.4 +
          (sameScope ? 0.15 : 0),
      );

      if (score < 0.55) {
        return undefined;
      }

      const reasons: string[] = [];
      if (exactName) {
        reasons.push('Same Rule name');
      } else if (nameSimilarity >= 0.5) {
        reasons.push('Similar Rule name');
      }
      if (contentSimilarity >= 0.5) {
        reasons.push('Similar Rule content');
      }
      if (sameScope) {
        reasons.push('Same Scope');
      }

      return { ...item, score, reasons };
    })
    .filter((item): item is DuplicateRuleMatch => item !== undefined)
    .sort((left, right) => right.score - left.score)
    .slice(0, Math.max(1, Math.min(limit, 10)));
}

