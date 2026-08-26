import type { RankedRule } from '../rules/retrieval';

export interface ContextComposerInput {
  task: string;
  currentInput: string;
  rules: readonly RankedRule[];
}

export function composeContext(input: ContextComposerInput): string {
  const task = input.task.trim();
  const currentInput = input.currentInput.trim();
  const workingRules = input.rules.length
    ? input.rules
        .map(
          (rule, index) =>
            `${index + 1}. ${rule.currentRevision.content.trim()}`,
        )
        .join('\n\n')
    : 'No saved Rules selected.';

  return [
    '# Task',
    task,
    '# Working Rules',
    workingRules,
    '# Current Input',
    currentInput,
    '# Execution Requirements',
    'Use Working Rules as constraints.',
    'Treat Current Input as the latest task-specific information.',
    'Do not infer unsupported facts or status.',
  ].join('\n\n');
}

export function defaultIncludedRuleIds(
  rules: readonly RankedRule[],
): Set<string> {
  const selected = rules
    .filter((rule) => rule.score >= 0.2)
    .slice(0, 5)
    .map((rule) => rule.asset.id);

  if (!selected.length && rules[0]) {
    selected.push(rules[0].asset.id);
  }

  return new Set(selected);
}

