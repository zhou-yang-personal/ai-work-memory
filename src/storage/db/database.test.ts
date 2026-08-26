import { deleteDB } from 'idb';
import { afterEach, describe, expect, it } from 'vitest';

import { DATABASE_SCHEMA_VERSION } from '../../core/version';
import { openAIWorkMemoryDatabase } from './database';

const databaseNames: string[] = [];

function nextDatabaseName(): string {
  const name = `ai-work-memory-test-${crypto.randomUUID()}`;
  databaseNames.push(name);
  return name;
}

afterEach(async () => {
  await Promise.all(databaseNames.splice(0).map((name) => deleteDB(name)));
});

describe('database migrations', () => {
  it('creates every V0.1 object store and records the schema version', async () => {
    const database = await openAIWorkMemoryDatabase(nextDatabaseName());

    expect([...database.objectStoreNames]).toEqual([
      'asset_revisions',
      'assets',
      'meta',
      'source_events',
      'usage_events',
    ]);
    expect(await database.get('meta', 'schema_version')).toMatchObject({
      value: DATABASE_SCHEMA_VERSION,
    });

    database.close();
  });

  it('creates the uniqueness indexes needed for stable assets and revisions', async () => {
    const database = await openAIWorkMemoryDatabase(nextDatabaseName());
    const transaction = database.transaction(
      ['assets', 'asset_revisions'],
      'readonly',
    );

    expect(transaction.objectStore('assets').index('by-canonical-key').unique).toBe(
      true,
    );
    expect(
      transaction.objectStore('asset_revisions').index('by-asset-version').unique,
    ).toBe(true);

    await transaction.done;
    database.close();
  });
});

