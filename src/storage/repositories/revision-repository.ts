import type { AssetRevision } from '../../core/assets/types';
import { getDatabase } from '../db/database';
import type { DatabaseProvider } from './shared';

export class RevisionRepository {
  constructor(private readonly database: DatabaseProvider = getDatabase) {}

  async getById(id: string): Promise<AssetRevision | undefined> {
    return (await this.database()).get('asset_revisions', id);
  }

  async listForAsset(assetId: string): Promise<AssetRevision[]> {
    const revisions = await (await this.database()).getAllFromIndex(
      'asset_revisions',
      'by-asset-id',
      assetId,
    );
    return revisions.sort((left, right) => right.version - left.version);
  }
}

