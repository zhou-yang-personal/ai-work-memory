import { describe, expect, it } from 'vitest';

import {
  extractChatGptProjectKey,
  formatProjectFallback,
} from './chatgpt-adapter';

describe('ChatGPT Project identity', () => {
  it.each([
    ['/g/g-p-abc123/project', 'g-p-abc123'],
    ['/g/g-p-abc123/c/conversation-id', 'g-p-abc123'],
    ['/c/conversation-id', undefined],
  ])('reads a Project key from %s', (pathname, expected) => {
    expect(extractChatGptProjectKey(pathname)).toBe(expected);
  });

  it('creates a stable visible fallback when the Project name is absent', () => {
    expect(formatProjectFallback('g-p-abcdefghijk')).toBe(
      'ChatGPT Project (abcdefgh)',
    );
  });
});
