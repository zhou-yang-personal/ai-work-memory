import type {
  AIWorkMemoryExportV1,
  ExportDataInput,
} from '../../core/transfer/export-schema';
import { getDatabase } from '../db/database';
import type { DatabaseProvider } from './shared';

export interface ImportCounts {
  assets: number;
  revisions: number;
  sourceEvents: number;
  usageEvents: number;
  skipped: number;
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stableValue);
  }
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, stableValue(child)]),
    );
  }
  return value;
}

function sameRecord(left: unknown, right: unknown): boolean {
  return JSON.stringify(stableValue(left)) === JSON.stringify(stableValue(right));
}

export class DataTransferRepository {
  constructor(private readonly database: DatabaseProvider = getDatabase) {}

  async readAll(): Promise<ExportDataInput> {
    const database = await this.database();
    const [assets, revisions, sourceEvents, usageEvents] = await Promise.all([
      database.getAll('assets'),
      database.getAll('asset_revisions'),
      database.getAll('source_events'),
      database.getAll('usage_events'),
    ]);

    return { assets, revisions, sourceEvents, usageEvents };
  }

  async merge(bundle: AIWorkMemoryExportV1): Promise<ImportCounts> {
    const database = await this.database();
    const counts: ImportCounts = {
      assets: 0,
      revisions: 0,
      sourceEvents: 0,
      usageEvents: 0,
      skipped: 0,
    };

    const assertCompatible = (
      kind: string,
      id: string,
      existing: unknown,
      incoming: unknown,
    ) => {
      if (existing && !sameRecord(existing, incoming)) {
        throw new Error(`${kind} ID conflict: ${id}. Import was not applied.`);
      }
    };

    for (const asset of bundle.assets) {
      const existingById = await database.get('assets', asset.id);
      assertCompatible('Asset', asset.id, existingById, asset);
      const existingByKey = await database.getFromIndex(
        'assets',
        'by-canonical-key',
        asset.canonical_key,
      );
      if (existingByKey && existingByKey.id !== asset.id) {
        throw new Error(
          `Rule key conflict: ${asset.canonical_key}. Import was not applied.`,
        );
      }
    }

    for (const revision of bundle.revisions) {
      assertCompatible(
        'Revision',
        revision.id,
        await database.get('asset_revisions', revision.id),
        revision,
      );
    }
    for (const event of bundle.source_events) {
      assertCompatible(
        'Source Event',
        event.id,
        await database.get('source_events', event.id),
        event,
      );
    }
    for (const event of bundle.usage_events) {
      assertCompatible(
        'Usage Event',
        event.id,
        await database.get('usage_events', event.id),
        event,
      );
    }

    const transaction = database.transaction(
      ['assets', 'asset_revisions', 'source_events', 'usage_events'],
      'readwrite',
    );

    for (const event of bundle.source_events) {
      const existing = await transaction
        .objectStore('source_events')
        .get(event.id);
      if (existing) counts.skipped += 1;
      else {
        await transaction.objectStore('source_events').add(event);
        counts.sourceEvents += 1;
      }
    }
    for (const revision of bundle.revisions) {
      const existing = await transaction
        .objectStore('asset_revisions')
        .get(revision.id);
      if (existing) counts.skipped += 1;
      else {
        await transaction.objectStore('asset_revisions').add(revision);
        counts.revisions += 1;
      }
    }
    for (const asset of bundle.assets) {
      const existing = await transaction.objectStore('assets').get(asset.id);
      if (existing) counts.skipped += 1;
      else {
        await transaction.objectStore('assets').add(asset);
        counts.assets += 1;
      }
    }
    for (const event of bundle.usage_events) {
      const existing = await transaction
        .objectStore('usage_events')
        .get(event.id);
      if (existing) counts.skipped += 1;
      else {
        await transaction.objectStore('usage_events').add(event);
        counts.usageEvents += 1;
      }
    }

    await transaction.done;
    return counts;
  }
}
