import { useEffect, useRef, useState, type ChangeEvent } from 'react';

import type { DistillationAvailability } from '../../core/distillation';
import { APP_VERSION } from '../../core/version';
import { DistillationService } from '../../services/distillation-service';

interface SettingsPanelProps {
  serviceReady: boolean;
}

interface ExportResponse {
  exported: boolean;
  json: string;
  markdown: string;
  counts: {
    assets: number;
    revisions: number;
    sourceEvents: number;
    usageEvents: number;
  };
}

interface ImportResponse {
  imported: boolean;
  errors: string[];
  counts?: {
    assets: number;
    revisions: number;
    sourceEvents: number;
    usageEvents: number;
    skipped: number;
  };
}

const distillationService = new DistillationService();

const browserAiLabels: Record<
  DistillationAvailability | 'checking',
  string
> = {
  checking: 'Checking…',
  available: 'Available on device',
  downloadable: 'Available after local model download',
  downloading: 'Local model downloading',
  unavailable: 'Not available; manual fallback active',
};

function downloadText(filename: string, content: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function dateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

export function SettingsPanel({ serviceReady }: SettingsPanelProps) {
  const importInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string>();
  const [error, setError] = useState<string>();
  const [browserAi, setBrowserAi] = useState<
    DistillationAvailability | 'checking'
  >('checking');

  useEffect(() => {
    let active = true;
    void distillationService.getBrowserAvailability().then((status) => {
      if (active) setBrowserAi(status);
    });
    return () => {
      active = false;
    };
  }, []);

  const exportFile = async (format: 'json' | 'markdown') => {
    setBusy(true);
    setNotice(undefined);
    setError(undefined);
    try {
      const response = (await browser.runtime.sendMessage({
        type: 'AIWM_EXPORT_DATA',
      })) as ExportResponse;
      if (!response.exported) {
        setError('Unable to export local data.');
        return;
      }

      if (format === 'json') {
        downloadText(
          `ai-work-memory-${dateStamp()}.json`,
          response.json,
          'application/json',
        );
      } else {
        downloadText(
          `ai-work-memory-${dateStamp()}.md`,
          response.markdown,
          'text/markdown',
        );
      }
      setNotice(
        `Exported ${response.counts.assets} Rules and ${response.counts.revisions} revisions.`,
      );
    } catch {
      setError('Background service unavailable.');
    } finally {
      setBusy(false);
    }
  };

  const importJson = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    setBusy(true);
    setNotice(undefined);
    setError(undefined);
    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      const response = (await browser.runtime.sendMessage({
        type: 'AIWM_IMPORT_DATA',
        payload: parsed,
      })) as ImportResponse;
      if (!response.imported || !response.counts) {
        setError(response.errors.join(' ') || 'Import validation failed.');
        return;
      }

      setNotice(
        `Imported ${response.counts.assets} Rules and ${response.counts.revisions} revisions; skipped ${response.counts.skipped} existing records.`,
      );
    } catch (caught) {
      setError(
        caught instanceof SyntaxError
          ? 'The selected file is not valid JSON.'
          : 'Unable to import this file.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="settings-sections">
      <section>
        <h2>Data</h2>
        <p>Portable, versioned exports remain entirely under your control.</p>
        <div className="settings-actions">
          <button
            className="secondary-button"
            disabled={busy}
            onClick={() => void exportFile('json')}
            type="button"
          >
            Export JSON
          </button>
          <button
            className="secondary-button"
            disabled={busy}
            onClick={() => void exportFile('markdown')}
            type="button"
          >
            Export Markdown
          </button>
          <button
            className="secondary-button"
            disabled={busy}
            onClick={() => importInput.current?.click()}
            type="button"
          >
            Import JSON
          </button>
          <input
            accept="application/json,.json"
            className="hidden-file-input"
            onChange={(event) => void importJson(event)}
            ref={importInput}
            type="file"
          />
        </div>
        <small>Imports use safe merge and stop completely on conflicts.</small>
      </section>

      {notice && <p className="save-notice">{notice}</p>}
      {error && <p className="form-error">{error}</p>}

      <section>
        <h2>Privacy</h2>
        <dl className="settings-list">
          <div>
            <dt>Page URL</dt>
            <dd>Not stored</dd>
          </div>
          <div>
            <dt>Nearby AI response</dt>
            <dd>Explicit opt-in per Rule</dd>
          </div>
          <div>
            <dt>Cloud transfer</dt>
            <dd>None</dd>
          </div>
        </dl>
      </section>

      <section>
        <h2>AI Distillation</h2>
        <dl className="settings-list">
          <div>
            <dt>Manual fallback</dt>
            <dd>Available</dd>
          </div>
          <div>
            <dt>Browser AI</dt>
            <dd>{browserAiLabels[browserAi]}</dd>
          </div>
        </dl>
        <small>
          Browser AI runs on device and is optional. Rule capture and review always
          work with the manual fallback.
        </small>
      </section>

      <section>
        <h2>About</h2>
        <dl className="settings-list">
          <div>
            <dt>Background service</dt>
            <dd>{serviceReady ? 'Ready' : 'Unavailable'}</dd>
          </div>
          <div>
            <dt>Version</dt>
            <dd>{APP_VERSION}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
