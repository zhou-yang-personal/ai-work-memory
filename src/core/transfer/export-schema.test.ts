import { describe, expect, it } from 'vitest';

import type { ExportDataInput } from './export-schema';
import {
  createExportBundle,
  renderMarkdownExport,
  validateImportBundle,
} from './export-schema';

const data: ExportDataInput = {
  assets: [
    {
      id: 'asset-1',
      kind: 'rule',
      name: 'Evidence First',
      status: 'active',
      scope: { level: 'global' },
      tags: [],
      canonical_key: 'global:all:evidence-first',
      current_revision_id: 'revision-1',
      created_at: '2026-08-26T00:00:00.000Z',
      updated_at: '2026-08-26T00:00:00.000Z',
      usage_count: 2,
    },
  ],
  revisions: [
    {
      id: 'revision-1',
      asset_id: 'asset-1',
      version: 1,
      content: 'Do not infer unsupported facts.',
      source_event_ids: ['source-1'],
      created_at: '2026-08-26T00:00:00.000Z',
    },
  ],
  sourceEvents: [
    {
      id: 'source-1',
      event_type: 'selected_text',
      platform: 'generic',
      user_text: 'Do not infer this.',
      captured_at: '2026-08-26T00:00:00.000Z',
      retention_mode: 'minimal',
    },
  ],
  usageEvents: [
    {
      id: 'usage-1',
      asset_id: 'asset-1',
      action: 'copied',
      context_id: 'context-1',
      created_at: '2026-08-26T01:00:00.000Z',
    },
  ],
};

describe('export schema', () => {
  it('creates and validates a complete versioned bundle', () => {
    const bundle = createExportBundle(
      data,
      '0.1.6',
      '2026-08-26T02:00:00.000Z',
    );

    expect(validateImportBundle(bundle)).toEqual({
      valid: true,
      errors: [],
      bundle,
    });
  });

  it('rejects unsupported schemas and broken references', () => {
    expect(
      validateImportBundle({
        ...createExportBundle(data, '0.1.6', '2026-08-26T02:00:00.000Z'),
        schema_version: 2,
      }),
    ).toMatchObject({ valid: false });

    const broken = createExportBundle(
      { ...data, revisions: [] },
      '0.1.6',
      '2026-08-26T02:00:00.000Z',
    );
    expect(validateImportBundle(broken)).toMatchObject({
      valid: false,
      errors: expect.arrayContaining([
        expect.stringContaining('invalid current_revision_id'),
      ]),
    });
  });

  it('renders a readable Markdown Rule export', () => {
    const markdown = renderMarkdownExport(
      createExportBundle(data, '0.1.6', '2026-08-26T02:00:00.000Z'),
    );

    expect(markdown).toContain('# AI Work Memory Export');
    expect(markdown).toContain('## Evidence First');
    expect(markdown).toContain('Do not infer unsupported facts.');
  });
});
