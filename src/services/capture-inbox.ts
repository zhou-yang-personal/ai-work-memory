import type { PendingCapture } from '../core/capture/model';

const STORAGE_KEY = 'aiwm.pendingCapture';

export async function getPendingCapture(): Promise<PendingCapture | undefined> {
  const stored = await browser.storage.local.get(STORAGE_KEY);
  const value = stored[STORAGE_KEY];

  if (typeof value !== 'object' || value === null) {
    return undefined;
  }

  return value as PendingCapture;
}

export async function setPendingCapture(capture: PendingCapture): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEY]: capture });
}

export async function clearPendingCapture(): Promise<void> {
  await browser.storage.local.remove(STORAGE_KEY);
}

