import type { SourceEvent } from '../../core/assets/types';
import { getDatabase } from '../db/database';
import type { DatabaseProvider } from './shared';

export class SourceEventRepository {
  constructor(private readonly database: DatabaseProvider = getDatabase) {}

  async add(event: SourceEvent): Promise<void> {
    await (await this.database()).add('source_events', event);
  }

  async getById(id: string): Promise<SourceEvent | undefined> {
    return (await this.database()).get('source_events', id);
  }
}

