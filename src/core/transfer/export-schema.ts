import type {
  Asset,
  AssetRevision,
  SourceEvent,
  UsageEvent,
} from '../assets/types';

export const EXPORT_SCHEMA_VERSION = 1 as const;

export interface AIWorkMemoryExportV1 {
  schema_version: typeof EXPORT_SCHEMA_VERSION;
  app_version: string;
  exported_at: string;
  assets: Asset[];
  revisions: AssetRevision[];
  source_events: SourceEvent[];
  usage_events: UsageEvent[];
}

export interface ExportDataInput {
  assets: Asset[];
  revisions: AssetRevision[];
  sourceEvents: SourceEvent[];
  usageEvents: UsageEvent[];
}

export interface ImportValidationResult {
  valid: boolean;
  errors: string[];
  bundle?: AIWorkMemoryExportV1;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasStrings(value: Record<string, unknown>, keys: string[]): boolean {
  return keys.every(
    (key) => typeof value[key] === 'string' && value[key].length > 0,
  );
}

function isAsset(value: unknown): value is Asset {
  return (
    isRecord(value) &&
    hasStrings(value, [
      'id',
      'kind',
      'name',
      'status',
      'canonical_key',
      'current_revision_id',
      'created_at',
      'updated_at',
    ]) &&
    isRecord(value.scope) &&
    typeof value.scope.level === 'string' &&
    Array.isArray(value.tags) &&
    value.tags.every((tag) => typeof tag === 'string') &&
    typeof value.usage_count === 'number'
  );
}

function isRevision(value: unknown): value is AssetRevision {
  return (
    isRecord(value) &&
    hasStrings(value, ['id', 'asset_id', 'content', 'created_at']) &&
    typeof value.version === 'number' &&
    Number.isInteger(value.version) &&
    value.version > 0 &&
    Array.isArray(value.source_event_ids) &&
    value.source_event_ids.every((id) => typeof id === 'string')
  );
}

function isSourceEvent(value: unknown): value is SourceEvent {
  return (
    isRecord(value) &&
    hasStrings(value, [
      'id',
      'event_type',
      'platform',
      'user_text',
      'captured_at',
      'retention_mode',
    ])
  );
}

function isUsageEvent(value: unknown): value is UsageEvent {
  return (
    isRecord(value) &&
    hasStrings(value, [
      'id',
      'asset_id',
      'action',
      'context_id',
      'created_at',
    ])
  );
}

function duplicateIds(records: Array<{ id: string }>): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const record of records) {
    if (seen.has(record.id)) {
      duplicates.add(record.id);
    }
    seen.add(record.id);
  }
  return [...duplicates];
}

export function createExportBundle(
  input: ExportDataInput,
  appVersion: string,
  exportedAt: string,
): AIWorkMemoryExportV1 {
  return {
    schema_version: EXPORT_SCHEMA_VERSION,
    app_version: appVersion,
    exported_at: exportedAt,
    assets: input.assets,
    revisions: input.revisions,
    source_events: input.sourceEvents,
    usage_events: input.usageEvents,
  };
}

export function validateImportBundle(value: unknown): ImportValidationResult {
  if (!isRecord(value)) {
    return { valid: false, errors: ['Import must be a JSON object.'] };
  }

  if (value.schema_version !== EXPORT_SCHEMA_VERSION) {
    return {
      valid: false,
      errors: [
        `Unsupported schema_version. Expected ${EXPORT_SCHEMA_VERSION}.`,
      ],
    };
  }

  const errors: string[] = [];
  if (typeof value.app_version !== 'string' || !value.app_version) {
    errors.push('app_version is required.');
  }
  if (
    typeof value.exported_at !== 'string' ||
    Number.isNaN(Date.parse(value.exported_at))
  ) {
    errors.push('exported_at must be a valid ISO date.');
  }

  const arrays = ['assets', 'revisions', 'source_events', 'usage_events'] as const;
  for (const key of arrays) {
    if (!Array.isArray(value[key])) {
      errors.push(`${key} must be an array.`);
    }
  }
  if (errors.length) {
    return { valid: false, errors };
  }

  const assets = (value.assets as unknown[]).filter(isAsset);
  const revisions = (value.revisions as unknown[]).filter(isRevision);
  const sourceEvents = (value.source_events as unknown[]).filter(isSourceEvent);
  const usageEvents = (value.usage_events as unknown[]).filter(isUsageEvent);
  if (assets.length !== (value.assets as unknown[]).length) {
    errors.push('One or more assets are invalid.');
  }
  if (revisions.length !== (value.revisions as unknown[]).length) {
    errors.push('One or more revisions are invalid.');
  }
  if (sourceEvents.length !== (value.source_events as unknown[]).length) {
    errors.push('One or more source_events are invalid.');
  }
  if (usageEvents.length !== (value.usage_events as unknown[]).length) {
    errors.push('One or more usage_events are invalid.');
  }

  for (const [name, records] of [
    ['assets', assets],
    ['revisions', revisions],
    ['source_events', sourceEvents],
    ['usage_events', usageEvents],
  ] as const) {
    const duplicates = duplicateIds(records);
    if (duplicates.length) {
      errors.push(`${name} contains duplicate IDs: ${duplicates.join(', ')}.`);
    }
  }

  const assetIds = new Set(assets.map((asset) => asset.id));
  const revisionById = new Map(
    revisions.map((revision) => [revision.id, revision]),
  );
  const sourceEventIds = new Set(sourceEvents.map((event) => event.id));
  for (const asset of assets) {
    const currentRevision = revisionById.get(asset.current_revision_id);
    if (!currentRevision || currentRevision.asset_id !== asset.id) {
      errors.push(`Asset ${asset.id} has an invalid current_revision_id.`);
    }
  }
  for (const revision of revisions) {
    if (!assetIds.has(revision.asset_id)) {
      errors.push(`Revision ${revision.id} references a missing Asset.`);
    }
    for (const sourceId of revision.source_event_ids) {
      if (!sourceEventIds.has(sourceId)) {
        errors.push(`Revision ${revision.id} references a missing Source Event.`);
      }
    }
  }
  for (const event of usageEvents) {
    if (!assetIds.has(event.asset_id)) {
      errors.push(`Usage Event ${event.id} references a missing Asset.`);
    }
  }

  if (errors.length) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    bundle: {
      schema_version: EXPORT_SCHEMA_VERSION,
      app_version: value.app_version as string,
      exported_at: value.exported_at as string,
      assets,
      revisions,
      source_events: sourceEvents,
      usage_events: usageEvents,
    },
  };
}

export function renderMarkdownExport(bundle: AIWorkMemoryExportV1): string {
  const revisionsById = new Map(
    bundle.revisions.map((revision) => [revision.id, revision]),
  );
  const rules = [...bundle.assets].sort((left, right) =>
    left.name.localeCompare(right.name),
  );
  const sections = rules.map((asset) => {
    const revision = revisionsById.get(asset.current_revision_id);
    const scope = asset.scope.label ?? 'Global';
    return [
      `## ${asset.name}`,
      `- Scope: ${scope}`,
      `- Status: ${asset.status}`,
      `- Current revision: v${revision?.version ?? 'unknown'}`,
      `- Usage count: ${asset.usage_count}`,
      '',
      revision?.content ?? '_Current revision unavailable._',
    ].join('\n');
  });

  return [
    '# AI Work Memory Export',
    '',
    `- Schema version: ${bundle.schema_version}`,
    `- App version: ${bundle.app_version}`,
    `- Exported at: ${bundle.exported_at}`,
    `- Rules: ${bundle.assets.length}`,
    '',
    ...sections.flatMap((section) => [section, '']),
  ]
    .join('\n')
    .trimEnd();
}
