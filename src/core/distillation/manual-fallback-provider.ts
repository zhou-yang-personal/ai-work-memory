import type {
  CorrectionInput,
  DistillationAvailability,
  DistillationProvider,
  DistilledRuleCandidate,
} from './types';

const MAX_RULE_NAME_LENGTH = 120;
const MAX_RULE_CONTENT_LENGTH = 12_000;

export function createManualRuleCandidate(
  input: CorrectionInput,
): DistilledRuleCandidate {
  const content = input.correction
    .replace(/\r\n/g, '\n')
    .trim()
    .slice(0, MAX_RULE_CONTENT_LENGTH);
  const compact = content.replace(/\s+/g, ' ');
  const firstClause = compact.split(/[。！？.!?;；]/u)[0] ?? compact;
  const words = firstClause.split(' ').filter(Boolean);
  const baseName =
    words.length > 1
      ? words.slice(0, 7).join(' ')
      : [...firstClause].slice(0, 28).join('');

  return {
    name: `${baseName || 'Untitled'} Rule`.slice(0, MAX_RULE_NAME_LENGTH),
    content,
    suggestedScope: 'global',
  };
}

export class ManualFallbackProvider implements DistillationProvider {
  readonly id = 'manual-fallback';

  async getAvailability(): Promise<DistillationAvailability> {
    return 'available';
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async distillCorrection(
    input: CorrectionInput,
  ): Promise<DistilledRuleCandidate> {
    return createManualRuleCandidate(input);
  }
}
