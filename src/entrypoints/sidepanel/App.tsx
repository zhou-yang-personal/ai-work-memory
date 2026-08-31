import { useEffect, useState } from 'react';

import type { PendingCapture } from '../../core/capture/model';
import { APP_VERSION } from '../../core/version';
import { CandidateRuleReview } from './CandidateRuleReview';
import { BuildContext } from './BuildContext';
import { RuleLibrary } from './RuleLibrary';
import { SettingsPanel } from './SettingsPanel';

type Page = 'Build Context' | 'Library' | 'Settings';

const pages: Page[] = ['Build Context', 'Library', 'Settings'];

export function App() {
  const [page, setPage] = useState<Page>('Build Context');
  const [serviceReady, setServiceReady] = useState(false);
  const [pendingCapture, setPendingCapture] = useState<PendingCapture>();
  const [saveNotice, setSaveNotice] = useState<string>();
  const isBuildContext = page === 'Build Context';
  const isReviewingCapture = isBuildContext && Boolean(pendingCapture);

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
        const nextCapture =
          'payload' in message
            ? (message.payload as PendingCapture | undefined)
            : undefined;

        setPendingCapture(nextCapture);
        if (nextCapture) {
          setPage('Build Context');
        }
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
          <h1>{isReviewingCapture ? 'Save as Rule' : page}</h1>
        </div>
        <span className="version">v{APP_VERSION}</span>
      </header>

      <nav aria-label="Primary navigation" className="primary-nav">
        {pages.map((item) => (
          <button
            className={item === page ? 'nav-item active' : 'nav-item'}
            key={item}
            onClick={() => {
              setSaveNotice(undefined);
              setPage(item);
            }}
            type="button"
          >
            {item}
          </button>
        ))}
      </nav>

      <section className="workspace">
        {saveNotice && !isReviewingCapture && (
          <p className="save-notice" aria-live="polite">
            {saveNotice}
          </p>
        )}

        <div hidden={!isBuildContext || !pendingCapture}>
          {pendingCapture && (
            <CandidateRuleReview
              capture={pendingCapture}
              key={pendingCapture.id}
              onCancel={clearCapture}
              onSaved={handleRuleSaved}
            />
          )}
        </div>

        {isBuildContext && !pendingCapture && <BuildContext />}

        {page === 'Library' && <RuleLibrary onNotice={setSaveNotice} />}

        {page === 'Settings' && (
          <SettingsPanel serviceReady={serviceReady} />
        )}
      </section>
    </main>
  );
}
