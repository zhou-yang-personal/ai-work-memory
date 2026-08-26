import { describe, expect, it, vi } from 'vitest';

import {
  ChromeBuiltInProvider,
  type LanguageModelApi,
} from './chrome-built-in-provider';

describe('ChromeBuiltInProvider', () => {
  it('reports unavailable when the browser API is absent', async () => {
    const provider = new ChromeBuiltInProvider(undefined);

    await expect(provider.getAvailability()).resolves.toBe('unavailable');
    await expect(provider.isAvailable()).resolves.toBe(false);
    await expect(
      provider.distillCorrection({ correction: 'Keep claims sourced.' }),
    ).rejects.toThrow('unavailable');
  });

  it('creates and destroys a session for a structured candidate', async () => {
    const destroy = vi.fn();
    const prompt = vi.fn().mockResolvedValue(
      JSON.stringify({
        name: 'Evidence First',
        content: 'Only state claims supported by the source.',
        suggested_scope: 'global',
      }),
    );
    const api: LanguageModelApi = {
      availability: vi.fn().mockResolvedValue('available'),
      create: vi.fn().mockResolvedValue({ prompt, destroy }),
    };
    const provider = new ChromeBuiltInProvider(api);

    await expect(
      provider.distillCorrection({ correction: 'Keep claims sourced.' }),
    ).resolves.toEqual({
      name: 'Evidence First',
      content: 'Only state claims supported by the source.',
      suggestedScope: 'global',
    });
    expect(prompt).toHaveBeenCalledOnce();
    expect(destroy).toHaveBeenCalledOnce();
  });
});
