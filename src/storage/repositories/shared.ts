import type { IDBPDatabase } from 'idb';

import type { AIWorkMemoryDatabase } from '../db/schema';

export type DatabaseProvider = () => Promise<
  IDBPDatabase<AIWorkMemoryDatabase>
>;

export type Clock = () => string;
export type IdFactory = () => string;

export const systemClock: Clock = () => new Date().toISOString();
export const randomId: IdFactory = () => crypto.randomUUID();

