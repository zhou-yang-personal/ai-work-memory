import type { ScopeLevel } from '../../core/assets/types';
import type {
  CorrectionInput,
  DistillationAvailability,
  DistillationOptions,
  DistillationProvider,
  DistilledRuleCandidate,
} from '../../core/distillation';

interface DownloadProgressEvent {
  loaded: number;
}

interface DownloadMonitor {
  addEventListener(
    type: 'downloadprogress',
    listener: (event: DownloadProgressEvent) => void,
  ): void;
}

interface LanguageModelSession {
  prompt(
    input: string,
    options?: {
      responseConstraint?: Record<string, unknown>;
      omitResponseConstraintInput?: boolean;
    },
  ): Promise<string>;
  destroy(): void;
}

export interface LanguageModelApi {
  availability(): Promise<unknown>;
  create(options?: {
    initialPrompts?: Array<{ role: 'system'; content: string }>;
    monitor?(monitor: DownloadMonitor): void;
  }): Promise<LanguageModelSession>;
}

const availabilityValues: ReadonlySet<DistillationAvailability> = new Set([
  'available',
  'downloadable',
  'downloading',
  'unavailable',
]);

const scopeLevels: ReadonlySet<ScopeLevel> = new Set([
  'global',
  'task',
  'project',
  'custom',
]);

const responseSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    content: { type: 'string' },
    suggested_scope: {
      type: 'string',
      enum: ['global', 'task', 'project', 'custom'],
    },
  },
  required: ['name', 'content', 'suggested_scope'],
  additionalProperties: false,
} as const;

function resolveLanguageModel(): LanguageModelApi | undefined {
  const value = (globalThis as { LanguageModel?: unknown }).LanguageModel;
  if (
    (typeof value !== 'object' && typeof value !== 'function') ||
    value === null ||
    typeof (value as Partial<LanguageModelApi>).availability !== 'function' ||
    typeof (value as Partial<LanguageModelApi>).create !== 'function'
  ) {
    return undefined;
  }

  return value as LanguageModelApi;
}

function parseCandidate(
  value: string,
  input: CorrectionInput,
): DistilledRuleCandidate {
  const parsed = JSON.parse(value) as unknown;
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Browser AI returned an invalid candidate.');
  }

  const candidate = parsed as Record<string, unknown>;
  const name = typeof candidate.name === 'string' ? candidate.name.trim() : '';
  const content =
    typeof candidate.content === 'string' ? candidate.content.trim() : '';
  const suggestedScope = candidate.suggested_scope;
  if (
    !name ||
    !content ||
    typeof suggestedScope !== 'string' ||
    !scopeLevels.has(suggestedScope as ScopeLevel)
  ) {
    throw new Error('Browser AI returned an incomplete candidate.');
  }

  const capturedProject = input.context?.projectName;
  return {
    name: name.slice(0, 120),
    content: content.slice(0, 12_000),
    suggestedScope: capturedProject
      ? 'project'
      : (suggestedScope as ScopeLevel),
    ...(capturedProject ? { suggestedScopeLabel: capturedProject } : {}),
  };
}

function createDistillationPrompt(input: CorrectionInput): string {
  const context = input.context;
  return [
    'Create a reusable Rule Name, Rule Content, and conservative Scope suggestion.',
    'Generalize the correction into a clear condition or constraint instead of copying it unchanged.',
    'Use global unless the correction clearly refers to one task or project.',
    context?.projectName ? `Project: ${context.projectName}` : undefined,
    context?.conversationTitle
      ? `Conversation: ${context.conversationTitle}`
      : undefined,
    context?.currentTask ? `Current task: ${context.currentTask}` : undefined,
    '',
    'Correction:',
    input.correction.trim().slice(0, 12_000),
  ]
    .filter((line): line is string => line !== undefined)
    .join('\n');
}

export class ChromeBuiltInProvider implements DistillationProvider {
  readonly id = 'chrome-built-in';

  constructor(
    private readonly languageModel: LanguageModelApi | undefined =
      resolveLanguageModel(),
  ) {}

  async getAvailability(): Promise<DistillationAvailability> {
    if (!this.languageModel) {
      return 'unavailable';
    }

    try {
      const status = await this.languageModel.availability();
      return typeof status === 'string' &&
        availabilityValues.has(status as DistillationAvailability)
        ? (status as DistillationAvailability)
        : 'unavailable';
    } catch {
      return 'unavailable';
    }
  }

  async isAvailable(): Promise<boolean> {
    return (await this.getAvailability()) !== 'unavailable';
  }

  async distillCorrection(
    input: CorrectionInput,
    options?: DistillationOptions,
  ): Promise<DistilledRuleCandidate> {
    if (!this.languageModel || (await this.getAvailability()) === 'unavailable') {
      throw new Error('Chrome built-in AI is unavailable.');
    }

    const session = await this.languageModel.create({
      initialPrompts: [
        {
          role: 'system',
          content:
            'Convert a user correction into one concise, reusable working rule. Preserve the correction meaning, do not add facts, and keep the output language consistent with the correction.',
        },
      ],
      ...(options?.onDownloadProgress
        ? {
            monitor: (monitor: DownloadMonitor) => {
              monitor.addEventListener('downloadprogress', (event) => {
                options.onDownloadProgress?.(
                  Math.min(1, Math.max(0, event.loaded)),
                );
              });
            },
          }
        : {}),
    });

    try {
      const response = await session.prompt(
        createDistillationPrompt(input),
        {
          responseConstraint: responseSchema,
          omitResponseConstraintInput: true,
        },
      );
      return parseCandidate(response, input);
    } finally {
      session.destroy();
    }
  }
}
