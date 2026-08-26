import { resolvePlatformFromUrl } from '../adapters';
import {
  CAPTURE_CONTEXT_MENU_ID,
  isExtensionRequest,
  type ExtensionEvent,
} from '../core/capture/messages';
import {
  normalizeCaptureRequest,
  type CaptureRequest,
  type PendingCapture,
} from '../core/capture/model';
import { APP_VERSION } from '../core/version';
import {
  clearPendingCapture,
  getPendingCapture,
  setPendingCapture,
} from '../services/capture-inbox';

async function notifyCaptureChanged(capture?: PendingCapture): Promise<void> {
  const event: ExtensionEvent = {
    type: 'AIWM_PENDING_CAPTURE_CHANGED',
    ...(capture ? { payload: capture } : {}),
  };

  await browser.runtime.sendMessage(event).catch(() => {
    // No side panel may be listening yet.
  });
}

async function acceptCapture(value: unknown): Promise<PendingCapture | undefined> {
  const request = normalizeCaptureRequest(value);
  if (!request) {
    return undefined;
  }

  const capture: PendingCapture = {
    ...request,
    id: crypto.randomUUID(),
    capturedAt: new Date().toISOString(),
  };

  await setPendingCapture(capture);
  await notifyCaptureChanged(capture);
  return capture;
}

async function openSidePanel(tabId: number | undefined): Promise<void> {
  if (tabId === undefined) {
    return;
  }

  await browser.sidePanel?.open({ tabId }).catch(() => {
    // A browser without sidePanel support can still retain the pending capture.
  });
}

export default defineBackground(() => {
  browser.sidePanel?.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {
    // The sidePanel API is Chrome/Edge-specific; feature detection keeps startup safe.
  });

  browser.runtime.onInstalled.addListener(() => {
    void browser.contextMenus
      .remove(CAPTURE_CONTEXT_MENU_ID)
      .catch(() => undefined)
      .then(() => {
        browser.contextMenus.create({
          id: CAPTURE_CONTEXT_MENU_ID,
          title: 'Save selection as Rule',
          contexts: ['selection'],
        });
      });
  });

  browser.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId !== CAPTURE_CONTEXT_MENU_ID || !info.selectionText) {
      return;
    }

    const request: CaptureRequest = {
      selectedText: info.selectionText,
      platform: resolvePlatformFromUrl(tab?.url),
      channel: 'context-menu',
    };

    void acceptCapture(request).then(() => openSidePanel(tab?.id));
  });

  browser.runtime.onMessage.addListener((message: unknown, sender) => {
    if (!isExtensionRequest(message)) {
      return undefined;
    }

    switch (message.type) {
      case 'AIWM_HEALTH_CHECK':
        return Promise.resolve({ source: 'background', version: APP_VERSION });
      case 'AIWM_CAPTURE_SELECTION':
        return acceptCapture(message.payload).then(async (capture) => {
          if (capture) {
            await openSidePanel(sender.tab?.id);
          }

          return { accepted: Boolean(capture), capture };
        });
      case 'AIWM_GET_PENDING_CAPTURE':
        return getPendingCapture();
      case 'AIWM_CLEAR_PENDING_CAPTURE':
        return clearPendingCapture().then(async () => {
          await notifyCaptureChanged();
          return { cleared: true };
        });
    }
  });
});
