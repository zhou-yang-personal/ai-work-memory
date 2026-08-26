import type { Asset, AssetRevision, SourceEvent } from '../../core/assets/types';
import type {
  CapturedSourceEvent,
  NormalizedCandidateRule,
} from '../../core/rules/candidate-rule';
import { getDatabase } from '../db/database';
import type { Clock, DatabaseProvider, IdFactory } from './shared';
import { randomId, systemClock } from './shared';

export interface SavedCapturedRule {
  asset: Asset;
  revision: AssetRevision;
  sourceEvent: SourceEvent;
}

export class CaptureRuleRepository {
  constructor(
    private readonly database: DatabaseProvider = getDatabase,
    private readonly clock: Clock = systemClock,
    private readonly createId: IdFactory = randomId,
  ) {}

  async create(
    candidate: NormalizedCandidateRule,
    canonicalKey: string,
    source: CapturedSourceEvent,
  ): Promise<SavedCapturedRule> {
    const database = await this.database();
    const transaction = database.transaction(
      ['assets', 'asset_revisions', 'source_events'],
      'readwrite',
    );
    const timestamp = this.clock();
    const assetId = this.createId();
    const revisionId = this.createId();
    const sourceEventId = this.createId();
    const sourceEvent: SourceEvent = { id: sourceEventId, ...source };
    const asset: Asset = {
      id: assetId,
      kind: 'rule',
      name: candidate.name,
      status: 'active',
      scope: candidate.scope,
      tags: [],
      canonical_key: canonicalKey,
      current_revision_id: revisionId,
      created_at: timestamp,
      updated_at: timestamp,
      usage_count: 0,
    };
    const revision: AssetRevision = {
      id: revisionId,
      asset_id: assetId,
      version: 1,
      content: candidate.content,
      source_event_ids: [sourceEventId],
      change_reason: 'Created from reviewed capture.',
      created_at: timestamp,
    };

    await transaction.objectStore('source_events').add(sourceEvent);
    await transaction.objectStore('asset_revisions').add(revision);
    await transaction.objectStore('assets').add(asset);
    await transaction.done;
    return { asset, revision, sourceEvent };
  }

  async update(
    assetId: string,
    candidate: NormalizedCandidateRule,
    source: CapturedSourceEvent,
  ): Promise<SavedCapturedRule> {
    const database = await this.database();
    const transaction = database.transaction(
      ['assets', 'asset_revisions', 'source_events'],
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
    const sourceEventId = this.createId();
    const sourceEvent: SourceEvent = { id: sourceEventId, ...source };
    const revision: AssetRevision = {
      id: revisionId,
      asset_id: asset.id,
      version: currentRevision.version + 1,
      content: candidate.content,
      source_event_ids: [sourceEventId],
      supersedes_revision_id: currentRevision.id,
      change_reason: 'Updated from reviewed capture.',
      created_at: timestamp,
    };
    const updatedAsset: Asset = {
      ...asset,
      current_revision_id: revisionId,
      updated_at: timestamp,
    };

    await transaction.objectStore('source_events').add(sourceEvent);
    await transaction.objectStore('asset_revisions').add(revision);
    await transaction.objectStore('assets').put(updatedAsset);
    await transaction.done;
    return { asset: updatedAsset, revision, sourceEvent };
  }
}

