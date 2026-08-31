import { captureSelection } from '../adapters';
import { READ_ACTIVE_CAPTURE_TYPE } from '../core/capture/messages';
import {
  matchesCapturedSelection,
  type CaptureRequest,
} from '../core/capture/model';

const BUTTON_OFFSET = 10;
const CONTEXT_SNAPSHOT_TTL_MS = 30_000;

function createCaptureButton(onCapture: () => void): {
  element: HTMLDivElement;
  button: HTMLButtonElement;
} {
  const element = document.createElement('div');
  element.dataset.aiwmCapture = 'true';
  element.style.cssText = [
    'all: initial',
    'position: fixed',
    'z-index: 2147483647',
    'display: none',
  ].join(';');

  const shadow = element.attachShadow({ mode: 'closed' });
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'Save as Rule';
  button.setAttribute(
    'aria-label',
    'Open selected text for review before saving it as a reusable rule',
  );
  button.style.cssText = [
    'all: initial',
    'box-sizing: border-box',
    'display: block',
    'padding: 7px 10px',
    'border: 1px solid #c7d0da',
    'border-radius: 6px',
    'background: #ffffff',
    'box-shadow: 0 4px 14px rgba(23, 33, 43, 0.14)',
    'color: #17212b',
    'cursor: pointer',
    'font: 600 12px/1.2 Arial, sans-serif',
    'white-space: nowrap',
  ].join(';');

  button.addEventListener('pointerdown', (event) => event.preventDefault());
  button.addEventListener('click', onCapture);
  shadow.append(button);
  document.documentElement.append(element);
  return { element, button };
}

export default defineContentScript({
  matches: [
    'https://chatgpt.com/*',
    'https://claude.ai/*',
    'https://gemini.google.com/*',
  ],
  main() {
    let pendingCapture: CaptureRequest | undefined;
    let contextMenuSnapshot:
      | { capture: CaptureRequest; capturedAt: number }
      | undefined;
    let hideTimer: ReturnType<typeof setTimeout> | undefined;

    const readCurrentCapture = (): CaptureRequest | undefined => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.toString().trim()) {
        return undefined;
      }

      return captureSelection(new URL(window.location.href), selection);
    };

    const rememberContextMenuSnapshot = () => {
      const capture = readCurrentCapture();
      if (capture) {
        contextMenuSnapshot = { capture, capturedAt: Date.now() };
      }
    };

    const { element, button } = createCaptureButton(() => {
      if (!pendingCapture) {
        return;
      }

      const request = pendingCapture;

      button.disabled = true;
      button.textContent = 'Opening review…';
      browser.runtime
        .sendMessage({ type: 'AIWM_CAPTURE_SELECTION', payload: request })
        .then((response: unknown) => {
          const acceptedForReview =
            typeof response === 'object' &&
            response !== null &&
            'accepted' in response &&
            response.accepted === true;

          // accepted only means the capture reached Candidate Review. A Rule is
          // persisted later, after the user explicitly saves it in the side panel.
          button.textContent = acceptedForReview ? 'Review ready' : 'Try again';
        })
        .catch(() => {
          button.textContent = 'Try again';
        })
        .finally(() => {
          hideTimer = setTimeout(() => {
            element.style.display = 'none';
            button.disabled = false;
            button.textContent = 'Save as Rule';
          }, 900);
        });
    });

    const positionAction = () => {
      if (hideTimer) {
        clearTimeout(hideTimer);
      }

      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.toString().trim()) {
        pendingCapture = undefined;
        element.style.display = 'none';
        return;
      }

      const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : undefined;
      const rect = range?.getBoundingClientRect();
      if (!rect || (!rect.width && !rect.height)) {
        element.style.display = 'none';
        return;
      }

      pendingCapture = captureSelection(
        new URL(window.location.href),
        selection,
      );
      if (!pendingCapture) {
        element.style.display = 'none';
        return;
      }
      element.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - 130))}px`;
      element.style.top = `${Math.max(8, Math.min(rect.bottom + BUTTON_OFFSET, window.innerHeight - 42))}px`;
      element.style.display = 'block';
    };

    document.addEventListener('mouseup', () => setTimeout(positionAction));
    document.addEventListener('contextmenu', rememberContextMenuSnapshot, true);
    document.addEventListener('keyup', (event) => {
      if (event.key.startsWith('Arrow') || event.key === 'Shift') {
        setTimeout(positionAction);
      }
    });

    browser.runtime.onMessage.addListener((message: unknown) => {
      if (
        typeof message !== 'object' ||
        message === null ||
        !('type' in message) ||
        message.type !== READ_ACTIVE_CAPTURE_TYPE
      ) {
        return undefined;
      }

      const requestedSelection =
        'selectedText' in message ? message.selectedText : undefined;
      const currentCapture = readCurrentCapture();
      if (matchesCapturedSelection(currentCapture, requestedSelection)) {
        return Promise.resolve(currentCapture);
      }

      if (
        contextMenuSnapshot &&
        Date.now() - contextMenuSnapshot.capturedAt <= CONTEXT_SNAPSHOT_TTL_MS &&
        matchesCapturedSelection(
          contextMenuSnapshot.capture,
          requestedSelection,
        )
      ) {
        return Promise.resolve(contextMenuSnapshot.capture);
      }

      return Promise.resolve(undefined);
    });

    browser.runtime.sendMessage({ type: 'AIWM_HEALTH_CHECK' }).catch(() => {
      // Capture remains isolated from the host page if the service worker restarts.
    });
  },
});
