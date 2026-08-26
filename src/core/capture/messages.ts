import type { CaptureRequest, PendingCapture } from './model';

export const CAPTURE_CONTEXT_MENU_ID = 'aiwm-save-selection-as-rule';

export type ExtensionRequest =
  | { type: 'AIWM_HEALTH_CHECK' }
  | { type: 'AIWM_CAPTURE_SELECTION'; payload: CaptureRequest }
  | { type: 'AIWM_GET_PENDING_CAPTURE' }
  | { type: 'AIWM_CLEAR_PENDING_CAPTURE' };

export type ExtensionEvent = {
  type: 'AIWM_PENDING_CAPTURE_CHANGED';
  payload?: PendingCapture;
};

export function isExtensionRequest(value: unknown): value is ExtensionRequest {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    typeof value.type === 'string' &&
    [
      'AIWM_HEALTH_CHECK',
      'AIWM_CAPTURE_SELECTION',
      'AIWM_GET_PENDING_CAPTURE',
      'AIWM_CLEAR_PENDING_CAPTURE',
    ].includes(value.type)
  );
}

