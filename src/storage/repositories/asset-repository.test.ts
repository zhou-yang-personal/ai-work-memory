import { deleteDB, type IDBPDatabase } from 'idb';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { AIWorkMemoryDatabase } from '../db/schema';
import { openAIWorkMemoryDatabase } from '../db/database';
import { AssetRepository } from './asset-repository';
import { RevisionRepository } from './revision-repository';

const databaseName = `ai-work-memory-repository-test-${crypto.randomUUID()}`;
let database: IDBPDatabase<AIWorkMemoryDatabase>;
let nextId = 0;
let tick = 0;

beforeEach(async () => {
  database = await openAIWorkMemoryDatabase(databaseName);
  nextId = 0;
  tick = 0;
});

afterEach(async () => {
  database.close();
  await deleteDB(databaseName);
});

const databaseProvider = async () => database;
const idFactory = () => `id-${++nextId}`;
const clock = () => `2026-08-23T00:00:0${tick++}.000Z`;

describe('AssetRepository', () => {
  it('creates one stable asset with its first revision atomically', async () => {
    const assets = new AssetRepository(databaseProvider, clock, idFactory);
    const revisions = new RevisionRepository(databaseProvider);

    const asset = await assets.createRule({
      name: 'Project Status Evidence Rule',
      scope: { level: 'task', key: 'weekly-report', label: 'Weekly Report' },
      canonical_key: 'task:weekly-report:project-status-evidence',
      content: 'Only describe a project as Completed when explicitly confirmed.',
    });

    expect(asset.kind).toBe('rule');
    expect(asset.status).toBe('active');
    expect(asset.usage_count).toBe(0);
    await expect(assets.findByCanonicalKey(asset.canonical_key)).resolves.toEqual(
      asset,
    );
    await expect(revisions.listForAsset(asset.id)).resolves.toMatchObject([
      {
        id: asset.current_revision_id,
        version: 1,
        asset_id: asset.id,
      },
    ]);
  });

  it('updates a rule by appending a revision while preserving the asset id', async () => {
    const assets = new AssetRepository(databaseProvider, clock, idFactory);
    const revisions = new RevisionRepository(databaseProvider);
    const original = await assets.createRule({
      name: 'Project Status Evidence Rule',
      scope: { level: 'global' },
      canonical_key: 'global:project-status-evidence',
      content: 'Preserve the source status.',
    });

    const updated = await assets.appendRevision(original.id, {
      content:
        'Only use Completed when the source confirms completion; otherwise preserve its status.',
      change_reason: 'Clarify the evidence threshold.',
    });
    const history = await revisions.listForAsset(original.id);

    expect(updated.id).toBe(original.id);
    expect(updated.current_revision_id).not.toBe(original.current_revision_id);
    expect(history.map((revision) => revision.version)).toEqual([2, 1]);
    expect(history[0]).toMatchObject({
      supersedes_revision_id: original.current_revision_id,
      change_reason: 'Clarify the evidence threshold.',
    });
  });

  it('archives a rule so it no longer appears in active results', async () => {
    const assets = new AssetRepository(databaseProvider, clock, idFactory);
    const asset = await assets.createRule({
      name: 'Evidence First',
      scope: { level: 'global' },
      canonical_key: 'global:evidence-first',
      content: 'Do not infer unsupported facts.',
    });

    const archived = await assets.archive(asset.id);

    expect(archived.status).toBe('archived');
    await expect(assets.listActive()).resolves.toEqual([]);
  });
});

