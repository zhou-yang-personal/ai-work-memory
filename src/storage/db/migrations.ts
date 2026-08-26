import type { IDBPDatabase, IDBPTransaction } from 'idb';

import { DATABASE_SCHEMA_VERSION } from '../../core/version';
import type { AIWorkMemoryDatabase } from './schema';

type DatabaseStoreName =
  | 'assets'
  | 'asset_revisions'
  | 'source_events'
  | 'usage_events'
  | 'meta';
type UpgradeTransaction = IDBPTransaction<
  AIWorkMemoryDatabase,
  DatabaseStoreName[],
  'versionchange'
>;

interface Migration {
  version: number;
  run: (
    database: IDBPDatabase<AIWorkMemoryDatabase>,
    transaction: UpgradeTransaction,
  ) => void;
}

const migrationV1: Migration = {
  version: 1,
  run(database) {
    const assets = database.createObjectStore('assets', { keyPath: 'id' });
    assets.createIndex('by-status', 'status');
    assets.createIndex('by-scope-level', 'scope.level');
    assets.createIndex('by-canonical-key', 'canonical_key', { unique: true });
    assets.createIndex('by-updated-at', 'updated_at');

    const revisions = database.createObjectStore('asset_revisions', {
      keyPath: 'id',
    });
    revisions.createIndex('by-asset-id', 'asset_id');
    revisions.createIndex('by-asset-version', ['asset_id', 'version'], {
      unique: true,
    });
    revisions.createIndex('by-created-at', 'created_at');

    const sourceEvents = database.createObjectStore('source_events', {
      keyPath: 'id',
    });
    sourceEvents.createIndex('by-event-type', 'event_type');
    sourceEvents.createIndex('by-platform', 'platform');
    sourceEvents.createIndex('by-captured-at', 'captured_at');

    const usageEvents = database.createObjectStore('usage_events', {
      keyPath: 'id',
    });
    usageEvents.createIndex('by-asset-id', 'asset_id');
    usageEvents.createIndex('by-context-id', 'context_id');
    usageEvents.createIndex('by-created-at', 'created_at');

    database.createObjectStore('meta', { keyPath: 'key' });
  },
};

export const DATABASE_MIGRATIONS: readonly Migration[] = [migrationV1];

export function runMigrations(
  database: IDBPDatabase<AIWorkMemoryDatabase>,
  transaction: UpgradeTransaction,
  oldVersion: number,
  newVersion: number | null,
): void {
  const targetVersion = newVersion ?? DATABASE_SCHEMA_VERSION;

  for (const migration of DATABASE_MIGRATIONS) {
    if (migration.version > oldVersion && migration.version <= targetVersion) {
      migration.run(database, transaction);
    }
  }

  transaction.objectStore('meta').put({
    key: 'schema_version',
    value: targetVersion,
    updated_at: new Date().toISOString(),
  });
}
