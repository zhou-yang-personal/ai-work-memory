import { describe, expect, it, vi } from 'vitest';

import type { DistillationProvider } from '../core/distillation';
import { DistillationService } from './distillation-service';

function provider(
  id: string,
  available: boolean,
  name: string,
): DistillationProvider {
  return {
    id,
    getAvailability: vi.fn().mockResolvedValue(
      available ? 'available' : 'unavailable',
    ),
    isAvailable: vi.fn().mockResolvedValue(available),
    distillCorrection: vi.fn().mockResolvedValue({
      name,
      content: 'Keep claims sourced.',
      suggestedScope: 'global',
    }),
  };
}

describe('DistillationService', () => {
  it('uses the manual provider when browser AI is unavailable', async () => {
    const browserProvider = provider('browser', false, 'Browser Rule');
    const manualProvider = provider('manual', true, 'Manual Rule');
    const service = new DistillationService(browserProvider, manualProvider);

    await expect(
      service.distillCorrection({ correction: 'Keep claims sourced.' }),
    ).resolves.toMatchObject({
      providerId: 'manual',
      usedFallback: true,
      candidate: { name: 'Manual Rule' },
    });
    expect(browserProvider.distillCorrection).not.toHaveBeenCalled();
  });

  it('falls back if browser inference fails', async () => {
    const browserProvider = provider('browser', true, 'Browser Rule');
    vi.mocked(browserProvider.distillCorrection).mockRejectedValue(
      new Error('Model failed'),
    );
    const service = new DistillationService(
      browserProvider,
      provider('manual', true, 'Manual Rule'),
    );

    await expect(
      service.distillCorrection({ correction: 'Keep claims sourced.' }),
    ).resolves.toMatchObject({ providerId: 'manual', usedFallback: true });
  });
});
