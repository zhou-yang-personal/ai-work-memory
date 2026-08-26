import { describe, expect, it } from 'vitest';

import { cleanConversationTitle } from './platform-adapter';

describe('platform context helpers', () => {
  it.each([
    ['Villavicencio analysis | ChatGPT', 'ChatGPT', 'Villavicencio analysis'],
    ['Claro Fiber – Claude', 'Claude', 'Claro Fiber'],
    ['Migration planning - Gemini', 'Gemini', 'Migration planning'],
    ['ChatGPT', 'ChatGPT', undefined],
  ])('cleans a platform suffix from %s', (title, platform, expected) => {
    expect(cleanConversationTitle(title, platform)).toBe(expected);
  });
});
