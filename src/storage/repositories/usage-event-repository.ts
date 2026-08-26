import type { UsageEvent } from '../../core/assets/types';
import { getDatabase } from '../db/database';
import type { Clock, DatabaseProvider, IdFactory } from './shared';
import { randomId, systemClock } from './shared';

export interface UsageRecordInput {
  assetId: string;
  action: UsageEvent['action'];
}

export class UsageEventRepository {
  constructor(
    private readonly database: DatabaseProvider = getDatabase,
    private readonly clock: Clock = systemClock,
    private readonly createId: IdFactory = randomId,
  ) {}

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

  async record(contextId: string, inputs: readonly UsageRecordInput[]): Promise<void> {
    const database = await this.database();
    const transaction = database.transaction(
      ['usage_events', 'assets'],
      'readwrite',
    );
    const timestamp = this.clock();

    for (const input of inputs) {
      const event: UsageEvent = {
        id: this.createId(),
        asset_id: input.assetId,
        action: input.action,
        context_id: contextId,
        created_at: timestamp,
      };
      await transaction.objectStore('usage_events').add(event);

      if (input.action === 'copied') {
        const asset = await transaction.objectStore('assets').get(input.assetId);
        if (asset) {
          await transaction.objectStore('assets').put({
            ...asset,
            usage_count: asset.usage_count + 1,
            last_used_at: timestamp,
          });
        }
      }
    }

    await transaction.done;
  }
}
