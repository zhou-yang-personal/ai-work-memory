import { deleteDB, type IDBPDatabase } from 'idb';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createExportBundle } from '../../core/transfer/export-schema';
import { openAIWorkMemoryDatabase } from '../db/database';
import type { AIWorkMemoryDatabase } from '../db/schema';
import { DataTransferRepository } from './data-transfer-repository';

const databaseName = `ai-work-memory-transfer-test-${crypto.randomUUID()}`;
let database: IDBPDatabase<AIWorkMemoryDatabase>;

beforeEach(async () => {
  database = await openAIWorkMemoryDatabase(databaseName);
});

afterEach(async () => {
  database.close();
  await deleteDB(databaseName);
});

const databaseProvider = async () => database;

const bundle = createExportBundle(
  {
    assets: [
      {
        id: 'asset-1',
        kind: 'rule',
        name: 'Evidence First',
        status: 'active',
        scope: { level: 'global' },
        tags: [],
        canonical_key: 'global:all:evidence-first',
        current_revision_id: 'revision-1',
        created_at: '2026-08-26T00:00:00.000Z',
        updated_at: '2026-08-26T00:00:00.000Z',
        usage_count: 0,
      },
    ],
    revisions: [
      {
        id: 'revision-1',
        asset_id: 'asset-1',
        version: 1,
        content: 'Do not infer unsupported facts.',
        source_event_ids: [],
        created_at: '2026-08-26T00:00:00.000Z',
      },
    ],
    sourceEvents: [],
    usageEvents: [],
  },
  '0.1.6',
  '2026-08-26T02:00:00.000Z',
);

describe('DataTransferRepository', () => {
  it('merges a valid bundle and skips an identical repeated import', async () => {
    const repository = new DataTransferRepository(databaseProvider);

    await expect(repository.merge(bundle)).resolves.toMatchObject({
      assets: 1,
      revisions: 1,
      skipped: 0,
    });
    await expect(repository.readAll()).resolves.toMatchObject({
      assets: bundle.assets,
      revisions: bundle.revisions,
    });
    await expect(repository.merge(bundle)).resolves.toMatchObject({
      assets: 0,
      revisions: 0,
      skipped: 2,
    });
  });

  it('aborts the whole import when an existing ID has different content', async () => {
    const repository = new DataTransferRepository(databaseProvider);
    await repository.merge(bundle);
    const conflicting = {
      ...bundle,
      assets: [{ ...bundle.assets[0]!, name: 'Conflicting Name' }],
    };

    await expect(repository.merge(conflicting)).rejects.toThrow('Asset ID conflict');
    await expect(database.get('assets', 'asset-1')).resolves.toMatchObject({
      name: 'Evidence First',
    });
  });
});
