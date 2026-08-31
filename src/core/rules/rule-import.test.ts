import { describe, expect, it } from 'vitest';

import { normalizeRuleImport } from './rule-import';

describe('normalizeRuleImport', () => {
  it('accepts simple Rules without internal IDs', () => {
    const result = normalizeRuleImport([
      {
        name: 'Evidence first',
        content: 'Do not infer unsupported facts.',
      },
      {
        name: 'Project layout',
        content: 'Use a 2x2 layout by default.',
        scope: 'project',
        scopeName: 'Client Deck',
        tags: ['ppt', ' client '],
      },
    ]);

    expect(result.valid).toBe(true);
    expect(result.rules).toHaveLength(2);
    expect(result.rules[0].rule.scope).toEqual({ level: 'global' });
    expect(result.rules[1]).toMatchObject({
      rule: {
        scope: { level: 'project', key: 'client-deck', label: 'Client Deck' },
      },
      tags: ['ppt', 'client'],
    });
  });

  it('rejects non-global Rules without a Scope Name', () => {
    const result = normalizeRuleImport([
      { name: 'Scoped', content: 'Scoped content', scope: 'project' },
    ]);

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('Scope Name');
  });

  it('rejects duplicate name and Scope combinations within one import', () => {
    const result = normalizeRuleImport([
      { name: 'Same Rule', content: 'First' },
      { name: 'Same Rule', content: 'Second' },
    ]);

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('duplicates');
  });
});
