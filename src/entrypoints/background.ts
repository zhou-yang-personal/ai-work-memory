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
  buildCanonicalKey,
  buildCapturedSourceEvent,
  normalizeCandidateRuleDraft,
} from '../core/rules/candidate-rule';
import {
  filterRuleLibrary,
  normalizeLibraryQuery,
  type RuleLibraryItem,
} from '../core/rules/rule-library';
import {
  detectDuplicateRules,
  normalizeRetrievalInput,
  rankRules,
} from '../core/rules/retrieval';
import {
  clearPendingCapture,
  getPendingCapture,
  setPendingCapture,
} from '../services/capture-inbox';
import {
  AssetRepository,
  CaptureRuleRepository,
  RevisionRepository,
} from '../storage/repositories';

const assets = new AssetRepository();
const revisions = new RevisionRepository();
const capturedRules = new CaptureRuleRepository();

async function notifyCaptureChanged(capture?: PendingCapture): Promise<void> {
  const event: ExtensionEvent = {
    type: 'AIWM_PENDING_CAPTURE_CHANGED',
    ...(capture ? { payload: capture } : {}),
  };

  await browser.runtime.sendMessage(event).catch(() => {
    // No side panel may be listening yet.
  });
}

async function notifyRuleLibraryChanged(): Promise<void> {
  const event: ExtensionEvent = { type: 'AIWM_RULE_LIBRARY_CHANGED' };
  await browser.runtime.sendMessage(event).catch(() => {
    // The Library page may not be open.
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

async function findSimilarRule(value: unknown) {
  const candidate = normalizeCandidateRuleDraft(value);
  if (!candidate) {
    return { valid: false } as const;
  }

  const duplicate = detectDuplicateRules(
    candidate,
    await loadActiveRuleItems(),
    1,
  )[0];
  if (!duplicate) {
    return { valid: true } as const;
  }

  return {
    valid: true,
    existing: {
      asset: duplicate.asset,
      revision: duplicate.currentRevision,
      score: duplicate.score,
      reasons: duplicate.reasons,
    },
  } as const;
}

async function saveCandidateRule(payload: unknown) {
  if (typeof payload !== 'object' || payload === null) {
    return { saved: false, error: 'Invalid save request.' } as const;
  }

  const request = payload as Record<string, unknown>;
  const candidate = normalizeCandidateRuleDraft(request.draft);
  const capture = await getPendingCapture();
  if (!candidate || !capture) {
    return { saved: false, error: 'The candidate or capture is no longer valid.' } as const;
  }

  const source = buildCapturedSourceEvent(capture, candidate.keepAiEvidence);
  if (request.mode === 'update') {
    if (typeof request.existingAssetId !== 'string') {
      return { saved: false, error: 'Choose an existing Rule to update.' } as const;
    }

    const existing = await assets.getById(request.existingAssetId);
    if (!existing || existing.status !== 'active' || existing.kind !== 'rule') {
      return { saved: false, error: 'The selected Rule is unavailable.' } as const;
    }

    const saved = await capturedRules.update(existing.id, candidate, source);
    await clearPendingCapture();
    await notifyCaptureChanged();
    await notifyRuleLibraryChanged();
    return { saved: true, mode: 'update', result: saved } as const;
  }

  if (request.mode !== 'create') {
    return { saved: false, error: 'Choose Create New or Update Existing.' } as const;
  }

  const baseCanonicalKey = buildCanonicalKey(candidate);
  const duplicate = await assets.findByCanonicalKey(baseCanonicalKey);
  const canonicalKey = duplicate
    ? `${baseCanonicalKey}:${capture.id.slice(0, 8)}`
    : baseCanonicalKey;
  const saved = await capturedRules.create(candidate, canonicalKey, source);
  await clearPendingCapture();
  await notifyCaptureChanged();
  await notifyRuleLibraryChanged();
  return { saved: true, mode: 'create', result: saved } as const;
}

async function loadActiveRuleItems(): Promise<RuleLibraryItem[]> {
  const activeRules = (await assets.listActive()).filter(
    (asset) => asset.kind === 'rule',
  );
  const items = await Promise.all(
    activeRules.map(async (asset) => {
      const currentRevision = await revisions.getById(asset.current_revision_id);
      return currentRevision ? { asset, currentRevision } : undefined;
    }),
  );

  return items.filter((item): item is RuleLibraryItem => item !== undefined);
}

async function listRules(value: unknown): Promise<RuleLibraryItem[]> {
  return filterRuleLibrary(
    await loadActiveRuleItems(),
    normalizeLibraryQuery(value),
  );
}

async function retrieveRules(value: unknown) {
  const input = normalizeRetrievalInput(value);
  if (!input) {
    return { valid: false, rules: [] } as const;
  }

  return {
    valid: true,
    rules: rankRules(await loadActiveRuleItems(), input),
  } as const;
}

async function getRuleDetail(value: unknown) {
  if (typeof value !== 'object' || value === null || !('assetId' in value)) {
    return undefined;
  }

  const assetId = value.assetId;
  if (typeof assetId !== 'string') {
    return undefined;
  }

  const asset = await assets.getById(assetId);
  if (!asset || asset.kind !== 'rule') {
    return undefined;
  }

  const history = await revisions.listForAsset(asset.id);
  const currentRevision = history.find(
    (revision) => revision.id === asset.current_revision_id,
  );
  if (!currentRevision) {
    return undefined;
  }

  return { asset, currentRevision, revisions: history };
}

async function updateLibraryRule(payload: unknown) {
  if (typeof payload !== 'object' || payload === null) {
    return { saved: false, error: 'Invalid Rule update.' } as const;
  }

  const request = payload as Record<string, unknown>;
  const candidate = normalizeCandidateRuleDraft(request.draft);
  if (typeof request.assetId !== 'string' || !candidate) {
    return { saved: false, error: 'Complete the Rule name, Scope, and content.' } as const;
  }

  const asset = await assets.getById(request.assetId);
  if (!asset || asset.status !== 'active' || asset.kind !== 'rule') {
    return { saved: false, error: 'This Rule is no longer available.' } as const;
  }

  const baseCanonicalKey = buildCanonicalKey(candidate);
  const duplicate = await assets.findByCanonicalKey(baseCanonicalKey);
  if (duplicate && duplicate.id !== asset.id && duplicate.status === 'active') {
    return {
      saved: false,
      error: 'Another active Rule already uses this name and Scope.',
    } as const;
  }

  const canonicalKey =
    duplicate && duplicate.id !== asset.id
      ? `${baseCanonicalKey}:${asset.id.slice(0, 8)}`
      : baseCanonicalKey;

  const updated = await assets.appendRevision(asset.id, {
    name: candidate.name,
    scope: candidate.scope,
    canonical_key: canonicalKey,
    content: candidate.content,
    change_reason: 'Edited in Rule Library.',
  });
  await notifyRuleLibraryChanged();
  return { saved: true, asset: updated } as const;
}

async function archiveRule(payload: unknown) {
  if (typeof payload !== 'object' || payload === null || !('assetId' in payload)) {
    return { archived: false, error: 'Invalid archive request.' } as const;
  }

  const assetId = payload.assetId;
  if (typeof assetId !== 'string') {
    return { archived: false, error: 'Invalid Rule identifier.' } as const;
  }

  const archived = await assets.archive(assetId);
  await notifyRuleLibraryChanged();
  return { archived: true, asset: archived } as const;
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
      case 'AIWM_FIND_SIMILAR_RULE':
        return findSimilarRule(message.payload);
      case 'AIWM_SAVE_CANDIDATE_RULE':
        return saveCandidateRule(message.payload).catch((error: unknown) => ({
          saved: false,
          error: error instanceof Error ? error.message : 'Unable to save the Rule.',
        }));
      case 'AIWM_LIST_RULES':
        return listRules(message.payload);
      case 'AIWM_GET_RULE_DETAIL':
        return getRuleDetail(message.payload);
      case 'AIWM_UPDATE_LIBRARY_RULE':
        return updateLibraryRule(message.payload).catch((error: unknown) => ({
          saved: false,
          error: error instanceof Error ? error.message : 'Unable to update the Rule.',
        }));
      case 'AIWM_ARCHIVE_RULE':
        return archiveRule(message.payload).catch((error: unknown) => ({
          archived: false,
          error: error instanceof Error ? error.message : 'Unable to archive the Rule.',
        }));
      case 'AIWM_RETRIEVE_RULES':
        return retrieveRules(message.payload);
    }
  });
});
