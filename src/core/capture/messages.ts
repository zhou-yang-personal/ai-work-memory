import type { CaptureRequest, PendingCapture } from './model';
import type { CandidateRuleDraft, RuleSaveMode } from '../rules/candidate-rule';
import type { RuleLibraryQuery } from '../rules/rule-library';
import type { RetrievalInput } from '../rules/retrieval';

export const CAPTURE_CONTEXT_MENU_ID = 'aiwm-save-selection-as-rule';

export type ExtensionRequest =
  | { type: 'AIWM_HEALTH_CHECK' }
  | { type: 'AIWM_CAPTURE_SELECTION'; payload: CaptureRequest }
  | { type: 'AIWM_GET_PENDING_CAPTURE' }
  | { type: 'AIWM_CLEAR_PENDING_CAPTURE' }
  | { type: 'AIWM_FIND_SIMILAR_RULE'; payload: CandidateRuleDraft }
  | {
      type: 'AIWM_SAVE_CANDIDATE_RULE';
      payload: {
        draft: CandidateRuleDraft;
        mode: RuleSaveMode;
        existingAssetId?: string;
      };
    }
  | { type: 'AIWM_LIST_RULES'; payload: RuleLibraryQuery }
  | { type: 'AIWM_GET_RULE_DETAIL'; payload: { assetId: string } }
  | {
      type: 'AIWM_UPDATE_LIBRARY_RULE';
      payload: { assetId: string; draft: CandidateRuleDraft };
    }
  | { type: 'AIWM_ARCHIVE_RULE'; payload: { assetId: string } }
  | { type: 'AIWM_RETRIEVE_RULES'; payload: RetrievalInput };

export type ExtensionEvent =
  | {
      type: 'AIWM_PENDING_CAPTURE_CHANGED';
      payload?: PendingCapture;
    }
  | { type: 'AIWM_RULE_LIBRARY_CHANGED' };

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
      'AIWM_FIND_SIMILAR_RULE',
      'AIWM_SAVE_CANDIDATE_RULE',
      'AIWM_LIST_RULES',
      'AIWM_GET_RULE_DETAIL',
      'AIWM_UPDATE_LIBRARY_RULE',
      'AIWM_ARCHIVE_RULE',
      'AIWM_RETRIEVE_RULES',
    ].includes(value.type)
  );
}
