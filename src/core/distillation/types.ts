import type { ScopeLevel } from '../assets/types';
import type { CaptureContext } from '../capture/model';

export type DistillationAvailability =
  | 'available'
  | 'downloadable'
  | 'downloading'
  | 'unavailable';

export interface CorrectionInput {
  correction: string;
  context?: CaptureContext;
}

export interface DistilledRuleCandidate {
  name: string;
  content: string;
  suggestedScope: ScopeLevel;
  suggestedScopeLabel?: string;
}

export interface DistillationOptions {
  onDownloadProgress?(progress: number): void;
}

export interface DistillationProvider {
  readonly id: string;
  getAvailability(): Promise<DistillationAvailability>;
  isAvailable(): Promise<boolean>;
  distillCorrection(
    input: CorrectionInput,
    options?: DistillationOptions,
  ): Promise<DistilledRuleCandidate>;
}
