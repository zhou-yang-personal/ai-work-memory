import { describe, expect, it } from 'vitest';

import { captureSelection, resolvePlatformFromUrl } from './index';

describe('resolvePlatformFromUrl', () => {
  it.each([
    ['https://chatgpt.com/c/123', 'chatgpt'],
    ['https://claude.ai/chat/123', 'claude'],
    ['https://gemini.google.com/app/123', 'gemini'],
    ['https://example.com/notes', 'generic'],
    ['not a url', 'generic'],
    [undefined, 'generic'],
  ])('maps %s to %s', (url, expected) => {
    expect(resolvePlatformFromUrl(url)).toBe(expected);
  });

  it('falls back to Generic capture when platform enhancement fails', () => {
    const selection = {
      anchorNode: {} as Node,
      toString: () => 'Use a shorter title',
    } as Selection;

    expect(captureSelection(new URL('https://chatgpt.com/c/123'), selection)).toEqual({
      selectedText: 'Use a shorter title',
      platform: 'generic',
      channel: 'floating-action',
    });
  });
});
