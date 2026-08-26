import { deleteDB, type IDBPDatabase } from 'idb';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { openAIWorkMemoryDatabase } from '../db/database';
import type { AIWorkMemoryDatabase } from '../db/schema';
import { SourceEventRepository } from './source-event-repository';
import { UsageEventRepository } from './usage-event-repository';

const databaseName = `ai-work-memory-event-test-${crypto.randomUUID()}`;
let database: IDBPDatabase<AIWorkMemoryDatabase>;

beforeEach(async () => {
  database = await openAIWorkMemoryDatabase(databaseName);
});

afterEach(async () => {
  database.close();
  await deleteDB(databaseName);
});

const databaseProvider = async () => database;

describe('event repositories', () => {
  it('stores minimal source evidence without requiring a whole conversation', async () => {
    const repository = new SourceEventRepository(databaseProvider);
    const event = {
      id: 'source-1',
      event_type: 'correction' as const,
      platform: 'chatgpt' as const,
      user_text: 'The project is still in Validation.',
      captured_at: '2026-08-23T00:00:00.000Z',
      retention_mode: 'minimal' as const,
    };

    await repository.add(event);

    await expect(repository.getById(event.id)).resolves.toEqual(event);
  });

  it('lists local usage events by asset', async () => {
    const repository = new UsageEventRepository(databaseProvider);
    await repository.add({
      id: 'usage-1',
      asset_id: 'asset-1',
      action: 'included',
      context_id: 'context-1',
      created_at: '2026-08-23T00:00:00.000Z',
    });
    await repository.add({
      id: 'usage-2',
      asset_id: 'asset-2',
      action: 'copied',
      context_id: 'context-1',
      created_at: '2026-08-23T00:00:01.000Z',
    });

    await expect(repository.listForAsset('asset-1')).resolves.toMatchObject([
      { id: 'usage-1', action: 'included' },
    ]);
  });
});

