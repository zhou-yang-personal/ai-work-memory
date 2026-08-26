import { ChromeBuiltInProvider } from '../adapters/distillation';
import {
  ManualFallbackProvider,
  type CorrectionInput,
  type DistillationAvailability,
  type DistillationOptions,
  type DistillationProvider,
  type DistilledRuleCandidate,
} from '../core/distillation';

export interface DistillationRunResult {
  candidate: DistilledRuleCandidate;
  providerId: string;
  usedFallback: boolean;
}

export class DistillationService {
  constructor(
    private readonly browserProvider: DistillationProvider =
      new ChromeBuiltInProvider(),
    private readonly fallbackProvider: DistillationProvider =
      new ManualFallbackProvider(),
  ) {}

  getBrowserAvailability(): Promise<DistillationAvailability> {
    return this.browserProvider.getAvailability();
  }

  async distillCorrection(
    input: CorrectionInput,
    options?: DistillationOptions,
  ): Promise<DistillationRunResult> {
    if (await this.browserProvider.isAvailable()) {
      try {
        return {
          candidate: await this.browserProvider.distillCorrection(input, options),
          providerId: this.browserProvider.id,
          usedFallback: false,
        };
      } catch {
        // The editable local candidate below keeps capture usable on any failure.
      }
    }

    return {
      candidate: await this.fallbackProvider.distillCorrection(input),
      providerId: this.fallbackProvider.id,
      usedFallback: true,
    };
  }
}
