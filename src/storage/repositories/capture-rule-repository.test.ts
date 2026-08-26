import { deleteDB, type IDBPDatabase } from 'idb';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  buildCapturedSourceEvent,
  type NormalizedCandidateRule,
} from '../../core/rules/candidate-rule';
import type { PendingCapture } from '../../core/capture/model';
import { openAIWorkMemoryDatabase } from '../db/database';
import type { AIWorkMemoryDatabase } from '../db/schema';
import { CaptureRuleRepository } from './capture-rule-repository';

const databaseName = `ai-work-memory-capture-rule-test-${crypto.randomUUID()}`;
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
const idFactory = () => `capture-id-${++nextId}`;
const clock = () => `2026-08-26T00:00:0${tick++}.000Z`;
const candidate: NormalizedCandidateRule = {
  name: 'Project Status Evidence Rule',
  content: 'Only mark work Completed when the source confirms it.',
  scope: { level: 'task', key: 'weekly-report', label: 'Weekly Report' },
  keepAiEvidence: false,
};
const capture: PendingCapture = {
  id: 'pending-1',
  selectedText: 'Do not mark this Completed yet.',
  platform: 'chatgpt',
  channel: 'floating-action',
  capturedAt: '2026-08-26T00:00:00.000Z',
};

describe('CaptureRuleRepository', () => {
  it('atomically creates a Rule, Revision, and Source Event', async () => {
    const repository = new CaptureRuleRepository(
      databaseProvider,
      clock,
      idFactory,
    );

    const saved = await repository.create(
      candidate,
      'task:weekly-report:project-status-evidence-rule',
      buildCapturedSourceEvent(capture, false),
    );

    await expect(database.get('assets', saved.asset.id)).resolves.toEqual(
      saved.asset,
    );
    await expect(
      database.get('asset_revisions', saved.revision.id),
    ).resolves.toEqual(saved.revision);
    await expect(
      database.get('source_events', saved.sourceEvent.id),
    ).resolves.toEqual(saved.sourceEvent);
    expect(saved.revision.source_event_ids).toEqual([saved.sourceEvent.id]);
  });

  it('updates an existing Rule by appending a linked Revision', async () => {
    const repository = new CaptureRuleRepository(
      databaseProvider,
      clock,
      idFactory,
    );
    const created = await repository.create(
      candidate,
      'task:weekly-report:project-status-evidence-rule',
      buildCapturedSourceEvent(capture, false),
    );

    const updated = await repository.update(
      created.asset.id,
      { ...candidate, content: 'Preserve the status unless completion is explicit.' },
      buildCapturedSourceEvent(capture, false),
    );

    expect(updated.asset.id).toBe(created.asset.id);
    expect(updated.revision.version).toBe(2);
    expect(updated.revision.supersedes_revision_id).toBe(created.revision.id);
    await expect(
      database.getAllFromIndex('asset_revisions', 'by-asset-id', created.asset.id),
    ).resolves.toHaveLength(2);
  });
});
