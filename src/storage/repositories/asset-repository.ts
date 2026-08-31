import type { Asset, AssetRevision, ScopeSpec } from '../../core/assets/types';
import { getDatabase } from '../db/database';
import type { Clock, DatabaseProvider, IdFactory } from './shared';
import { randomId, systemClock } from './shared';

export interface CreateRuleInput {
  name: string;
  scope: ScopeSpec;
  content: string;
  canonical_key: string;
  tags?: string[];
  source_event_ids?: string[];
  change_reason?: string;
}

export interface UpdateRuleInput {
  name?: string;
  scope?: ScopeSpec;
  canonical_key?: string;
  tags?: string[];
  content: string;
  source_event_ids?: string[];
  change_reason?: string;
}

export interface PermanentDeleteResult {
  assetId: string;
  revisions: number;
  sourceEvents: number;
  usageEvents: number;
}

export class AssetRepository {
  constructor(
    private readonly database: DatabaseProvider = getDatabase,
    private readonly clock: Clock = systemClock,
    private readonly createId: IdFactory = randomId,
  ) {}

  async createRule(input: CreateRuleInput): Promise<Asset> {
    const [asset] = await this.createRules([input]);
    if (!asset) throw new Error('Unable to create Rule.');
    return asset;
  }

  async createRules(inputs: CreateRuleInput[]): Promise<Asset[]> {
    if (inputs.length === 0) return [];

    const database = await this.database();
    const transaction = database.transaction(
      ['assets', 'asset_revisions'],
      'readwrite',
    );
    const assets: Asset[] = [];

    for (const input of inputs) {
      const timestamp = this.clock();
      const assetId = this.createId();
      const revisionId = this.createId();
      const asset: Asset = {
        id: assetId,
        kind: 'rule',
        name: input.name,
        status: 'active',
        scope: input.scope,
        tags: input.tags ?? [],
        canonical_key: input.canonical_key,
        current_revision_id: revisionId,
        created_at: timestamp,
        updated_at: timestamp,
        usage_count: 0,
      };
      const revision: AssetRevision = {
        id: revisionId,
        asset_id: assetId,
        version: 1,
        content: input.content,
        source_event_ids: input.source_event_ids ?? [],
        created_at: timestamp,
        ...(input.change_reason === undefined
          ? {}
          : { change_reason: input.change_reason }),
      };

      await transaction.objectStore('assets').add(asset);
      await transaction.objectStore('asset_revisions').add(revision);
      assets.push(asset);
    }

    await transaction.done;
    return assets;
  }

  async getById(id: string): Promise<Asset | undefined> {
    return (await this.database()).get('assets', id);
  }

  async findByCanonicalKey(canonicalKey: string): Promise<Asset | undefined> {
    return (await this.database()).getFromIndex(
      'assets',
      'by-canonical-key',
      canonicalKey,
    );
  }

  async listActive(): Promise<Asset[]> {
    return (await this.database()).getAllFromIndex(
      'assets',
      'by-status',
      'active',
    );
  }

  async appendRevision(assetId: string, input: UpdateRuleInput): Promise<Asset> {
    const database = await this.database();
    const transaction = database.transaction(
      ['assets', 'asset_revisions'],
      'readwrite',
    );
    const asset = await transaction.objectStore('assets').get(assetId);

    if (!asset) {
      transaction.abort();
      throw new Error(`Asset not found: ${assetId}`);
    }

    const currentRevision = await transaction
      .objectStore('asset_revisions')
      .get(asset.current_revision_id);

    if (!currentRevision) {
      transaction.abort();
      throw new Error(`Current revision not found: ${asset.current_revision_id}`);
    }

    const timestamp = this.clock();
    const revisionId = this.createId();
    const revision: AssetRevision = {
      id: revisionId,
      asset_id: asset.id,
      version: currentRevision.version + 1,
      content: input.content,
      source_event_ids: input.source_event_ids ?? [],
      supersedes_revision_id: currentRevision.id,
      created_at: timestamp,
      ...(input.change_reason === undefined
        ? {}
        : { change_reason: input.change_reason }),
    };
    const updatedAsset: Asset = {
      ...asset,
      ...(input.name === undefined ? {} : { name: input.name }),
      ...(input.scope === undefined ? {} : { scope: input.scope }),
      ...(input.canonical_key === undefined
        ? {}
        : { canonical_key: input.canonical_key }),
      ...(input.tags === undefined ? {} : { tags: input.tags }),
      current_revision_id: revisionId,
      updated_at: timestamp,
    };

    await transaction.objectStore('asset_revisions').add(revision);
    await transaction.objectStore('assets').put(updatedAsset);
    await transaction.done;
    return updatedAsset;
  }

  async archive(id: string): Promise<Asset> {
    const database = await this.database();
    const transaction = database.transaction('assets', 'readwrite');
    const asset = await transaction.store.get(id);

    if (!asset) {
      transaction.abort();
      throw new Error(`Asset not found: ${id}`);
    }

    const archived: Asset = {
      ...asset,
      status: 'archived',
      updated_at: this.clock(),
    };
    await transaction.store.put(archived);
    await transaction.done;
    return archived;
  }

  async deletePermanently(id: string): Promise<PermanentDeleteResult> {
    const database = await this.database();
    const transaction = database.transaction(
      ['assets', 'asset_revisions', 'source_events', 'usage_events'],
      'readwrite',
    );
    const assetStore = transaction.objectStore('assets');
    const revisionStore = transaction.objectStore('asset_revisions');
    const sourceStore = transaction.objectStore('source_events');
    const usageStore = transaction.objectStore('usage_events');
    const asset = await assetStore.get(id);

    if (!asset) {
      transaction.abort();
      throw new Error(`Asset not found: ${id}`);
    }

    const revisions = await revisionStore.index('by-asset-id').getAll(id);
    const usageEvents = await usageStore.index('by-asset-id').getAll(id);
    const allRevisions = await revisionStore.getAll();
    const retainedSourceIds = new Set(
      allRevisions
        .filter((revision) => revision.asset_id !== id)
        .flatMap((revision) => revision.source_event_ids),
    );
    const sourceIds = new Set(
      revisions.flatMap((revision) => revision.source_event_ids),
    );
    let deletedSourceEvents = 0;

    for (const event of usageEvents) await usageStore.delete(event.id);
    for (const revision of revisions) await revisionStore.delete(revision.id);
    for (const sourceId of sourceIds) {
      if (!retainedSourceIds.has(sourceId)) {
        await sourceStore.delete(sourceId);
        deletedSourceEvents += 1;
      }
    }
    await assetStore.delete(id);
    await transaction.done;

    return {
      assetId: id,
      revisions: revisions.length,
      sourceEvents: deletedSourceEvents,
      usageEvents: usageEvents.length,
    };
  }
}
