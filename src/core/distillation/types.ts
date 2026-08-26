import type { ScopeLevel } from '../assets/types';

export type DistillationAvailability =
  | 'available'
  | 'downloadable'
  | 'downloading'
  | 'unavailable';

export interface CorrectionInput {
  correction: string;
}

export interface DistilledRuleCandidate {
  name: string;
  content: string;
  suggestedScope: ScopeLevel;
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
