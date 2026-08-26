import type { UsageEvent } from '../../core/assets/types';
import { getDatabase } from '../db/database';
import type { DatabaseProvider } from './shared';

export class UsageEventRepository {
  constructor(private readonly database: DatabaseProvider = getDatabase) {}

  async add(event: UsageEvent): Promise<void> {
    await (await this.database()).add('usage_events', event);
  }

  async listForAsset(assetId: string): Promise<UsageEvent[]> {
    return (await this.database()).getAllFromIndex(
      'usage_events',
      'by-asset-id',
      assetId,
    );
  }
}

