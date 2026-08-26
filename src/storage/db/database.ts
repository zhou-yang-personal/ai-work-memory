import { openDB, type IDBPDatabase } from 'idb';

import { DATABASE_SCHEMA_VERSION } from '../../core/version';
import { runMigrations } from './migrations';
import type { AIWorkMemoryDatabase } from './schema';

export const DATABASE_NAME = 'ai-work-memory';

let applicationDatabase: Promise<IDBPDatabase<AIWorkMemoryDatabase>> | undefined;

export function openAIWorkMemoryDatabase(
  name = DATABASE_NAME,
): Promise<IDBPDatabase<AIWorkMemoryDatabase>> {
  return openDB<AIWorkMemoryDatabase>(name, DATABASE_SCHEMA_VERSION, {
    upgrade(database, oldVersion, newVersion, transaction) {
      runMigrations(database, transaction, oldVersion, newVersion);
    },
  });
}

export function getDatabase(): Promise<IDBPDatabase<AIWorkMemoryDatabase>> {
  applicationDatabase ??= openAIWorkMemoryDatabase();
  return applicationDatabase;
}

export async function closeDatabase(): Promise<void> {
  if (applicationDatabase) {
    const database = await applicationDatabase;
    database.close();
    applicationDatabase = undefined;
  }
}

