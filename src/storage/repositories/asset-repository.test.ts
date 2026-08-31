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

  it('creates multiple imported Rules in one transaction', async () => {
    const assets = new AssetRepository(databaseProvider, clock, idFactory);

    const created = await assets.createRules([
      {
        name: 'First Rule',
        scope: { level: 'global' },
        canonical_key: 'global:all:first-rule',
        content: 'First content',
        change_reason: 'Imported from Rule file.',
      },
      {
        name: 'Second Rule',
        scope: { level: 'project', key: 'deck', label: 'Deck' },
        canonical_key: 'project:deck:second-rule',
        content: 'Second content',
        tags: ['ppt'],
        change_reason: 'Imported from Rule file.',
      },
    ]);

    expect(created).toHaveLength(2);
    await expect(assets.listActive()).resolves.toHaveLength(2);
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

  it('edits Rule metadata and content while appending a revision', async () => {
    const assets = new AssetRepository(databaseProvider, clock, idFactory);
    const revisions = new RevisionRepository(databaseProvider);
    const original = await assets.createRule({
      name: 'Evidence Rule',
      scope: { level: 'global' },
      canonical_key: 'global:all:evidence-rule',
      content: 'Preserve the source status.',
    });

    const updated = await assets.appendRevision(original.id, {
      name: 'Weekly Status Evidence Rule',
      scope: { level: 'task', key: 'weekly-report', label: 'Weekly Report' },
      canonical_key: 'task:weekly-report:weekly-status-evidence-rule',
      content: 'Use Completed only when the weekly source confirms it.',
      change_reason: 'Edited in Rule Library.',
    });

    expect(updated).toMatchObject({
      id: original.id,
      name: 'Weekly Status Evidence Rule',
      scope: { level: 'task', key: 'weekly-report', label: 'Weekly Report' },
      canonical_key: 'task:weekly-report:weekly-status-evidence-rule',
    });
    await expect(revisions.listForAsset(original.id)).resolves.toMatchObject([
      { version: 2, content: 'Use Completed only when the weekly source confirms it.' },
      { version: 1, content: 'Preserve the source status.' },
    ]);
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

  it('permanently deletes the Rule and all dependent local records', async () => {
    const assets = new AssetRepository(databaseProvider, clock, idFactory);
    const asset = await assets.createRule({
      name: 'Disposable Rule',
      scope: { level: 'global' },
      canonical_key: 'global:all:disposable-rule',
      content: 'Temporary content',
      source_event_ids: ['source-1'],
    });
    await database.put('source_events', {
      id: 'source-1',
      event_type: 'manual',
      platform: 'generic',
      user_text: 'Imported evidence',
      captured_at: '2026-08-23T00:00:00.000Z',
      retention_mode: 'minimal',
    });
    await database.put('usage_events', {
      id: 'usage-1',
      asset_id: asset.id,
      action: 'copied',
      context_id: 'context-1',
      created_at: '2026-08-23T00:00:01.000Z',
    });

    const result = await assets.deletePermanently(asset.id);

    expect(result).toMatchObject({ revisions: 1, sourceEvents: 1, usageEvents: 1 });
    await expect(database.get('assets', asset.id)).resolves.toBeUndefined();
    await expect(database.get('asset_revisions', asset.current_revision_id)).resolves.toBeUndefined();
    await expect(database.get('source_events', 'source-1')).resolves.toBeUndefined();
    await expect(database.get('usage_events', 'usage-1')).resolves.toBeUndefined();
  });
});
