import type { CaptureRequest } from '../core/capture/model';
import type { PlatformAdapter } from './platform-adapter';
import { readSelectionText } from './platform-adapter';

export const genericAdapter: PlatformAdapter = {
  platform: 'generic',
  matches: () => true,
  capture(selection): CaptureRequest | undefined {
    const selectedText = readSelectionText(selection);
    if (!selectedText) {
      return undefined;
    }

    return {
      selectedText,
      platform: 'generic',
      channel: 'floating-action',
    };
  },
};

