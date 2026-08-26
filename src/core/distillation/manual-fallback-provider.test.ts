import { describe, expect, it } from 'vitest';

import { ManualFallbackProvider } from './manual-fallback-provider';

describe('ManualFallbackProvider', () => {
  it('is always available and creates an editable local candidate', async () => {
    const provider = new ManualFallbackProvider();

    await expect(provider.getAvailability()).resolves.toBe('available');
    await expect(provider.isAvailable()).resolves.toBe(true);
    await expect(
      provider.distillCorrection({
        correction:
          'Only mark a project Completed when the source confirms it.',
      }),
    ).resolves.toEqual({
      name: 'Only mark a project Completed when the Rule',
      content: 'Only mark a project Completed when the source confirms it.',
      suggestedScope: 'global',
    });
  });

  it('uses captured Project identity as the conservative Scope suggestion', async () => {
    const provider = new ManualFallbackProvider();

    await expect(
      provider.distillCorrection({
        correction: 'Only use verified status.',
        context: { projectName: 'Claro Fiber Migration' },
      }),
    ).resolves.toMatchObject({
      suggestedScope: 'project',
      suggestedScopeLabel: 'Claro Fiber Migration',
    });
  });
});
