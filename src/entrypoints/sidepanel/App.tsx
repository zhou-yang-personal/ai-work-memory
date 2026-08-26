import { useEffect, useState } from 'react';

import type { PendingCapture } from '../../core/capture/model';
import { APP_VERSION } from '../../core/version';
import { CandidateRuleReview } from './CandidateRuleReview';

type Page = 'Build Context' | 'Library' | 'Settings';

const pages: Page[] = ['Build Context', 'Library', 'Settings'];

export function App() {
  const [page, setPage] = useState<Page>('Build Context');
  const [serviceReady, setServiceReady] = useState(false);
  const [pendingCapture, setPendingCapture] = useState<PendingCapture>();
  const [saveNotice, setSaveNotice] = useState<string>();

  useEffect(() => {
    browser.runtime
      .sendMessage({ type: 'AIWM_HEALTH_CHECK' })
      .then((response: unknown) => {
        setServiceReady(
          typeof response === 'object' &&
            response !== null &&
            'source' in response &&
            response.source === 'background',
        );
      })
      .catch(() => setServiceReady(false));

    browser.runtime
      .sendMessage({ type: 'AIWM_GET_PENDING_CAPTURE' })
      .then((capture: PendingCapture | undefined) => setPendingCapture(capture))
      .catch(() => setPendingCapture(undefined));

    const handleCaptureChanged = (message: unknown) => {
      if (
        typeof message === 'object' &&
        message !== null &&
        'type' in message &&
        message.type === 'AIWM_PENDING_CAPTURE_CHANGED'
      ) {
        setPage('Build Context');
        setPendingCapture(
          'payload' in message
            ? (message.payload as PendingCapture | undefined)
            : undefined,
        );
      }
    };

    browser.runtime.onMessage.addListener(handleCaptureChanged);
    return () => browser.runtime.onMessage.removeListener(handleCaptureChanged);
  }, []);

  const clearCapture = () => {
    browser.runtime.sendMessage({ type: 'AIWM_CLEAR_PENDING_CAPTURE' }).catch(() => {
      // Keep the preview visible if the background service cannot confirm the clear.
    });
  };

  const handleRuleSaved = (message: string) => {
    setPendingCapture(undefined);
    setSaveNotice(message);
  };

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">AI Work Memory</p>
          <h1>{pendingCapture ? 'Save as Rule' : page}</h1>
        </div>
        <span className="version">v{APP_VERSION}</span>
      </header>

      <nav aria-label="Primary navigation" className="primary-nav">
        {pages.map((item) => (
          <button
            className={item === page ? 'nav-item active' : 'nav-item'}
            key={item}
            onClick={() => setPage(item)}
            type="button"
          >
            {item}
          </button>
        ))}
      </nav>

      <section className="workspace">
        {saveNotice && !pendingCapture && (
          <p className="save-notice" aria-live="polite">
            {saveNotice}
          </p>
        )}

        {pendingCapture ? (
          <CandidateRuleReview
            capture={pendingCapture}
            key={pendingCapture.id}
            onCancel={clearCapture}
            onSaved={handleRuleSaved}
          />
        ) : (
          <>

        {page === 'Build Context' && (
          <>
            <label htmlFor="task">Task</label>
            <input id="task" placeholder="e.g. Weekly Report" disabled />

            <label htmlFor="current-input">Current Input</label>
            <textarea
              id="current-input"
              placeholder="Paste the latest task material..."
              rows={9}
              disabled
            />

            <p className="phase-note">
              Capture and reviewed Rule creation are ready. Library management
              arrives in Phase 5.
            </p>
          </>
        )}

        {page === 'Library' && (
          <p className="empty-state">Rule list, search, editing, and history arrive in Phase 5.</p>
        )}

        {page === 'Settings' && (
          <dl className="settings-list">
            <div>
              <dt>Storage</dt>
              <dd>Local IndexedDB</dd>
            </div>
            <div>
              <dt>Capture privacy</dt>
              <dd>Selection only; no page URL</dd>
            </div>
            <div>
              <dt>Background service</dt>
              <dd>{serviceReady ? 'Ready' : 'Unavailable'}</dd>
            </div>
            <div>
              <dt>Version</dt>
              <dd>{APP_VERSION}</dd>
            </div>
          </dl>
        )}
          </>
        )}
      </section>
    </main>
  );
}
