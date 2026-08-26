import { useMemo, useState, type FormEvent } from 'react';

import {
  composeContext,
  defaultIncludedRuleIds,
} from '../../core/context/context-composer';
import type { UsageAction } from '../../core/assets/types';
import type { RankedRule } from '../../core/rules/retrieval';

interface RetrievalResponse {
  valid: boolean;
  rules: RankedRule[];
}

export function BuildContext() {
  const [task, setTask] = useState('');
  const [currentInput, setCurrentInput] = useState('');
  const [rules, setRules] = useState<RankedRule[]>([]);
  const [includedIds, setIncludedIds] = useState<Set<string>>(new Set());
  const [contextId, setContextId] = useState<string>();
  const [retrieving, setRetrieving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [copyStatus, setCopyStatus] = useState<string>();
  const [error, setError] = useState<string>();

  const includedRules = useMemo(
    () => rules.filter((rule) => includedIds.has(rule.asset.id)),
    [rules, includedIds],
  );
  const context = useMemo(
    () => composeContext({ task, currentInput, rules: includedRules }),
    [task, currentInput, includedRules],
  );

  const recordUsage = (
    id: string,
    events: Array<{ assetId: string; action: UsageAction }>,
  ) => {
    browser.runtime
      .sendMessage({
        type: 'AIWM_RECORD_USAGE',
        payload: { contextId: id, events },
      })
      .catch(() => {
        // Usage evidence must never block the user workflow.
      });
  };

  const retrieve = async (event: FormEvent) => {
    event.preventDefault();
    setRetrieving(true);
    setError(undefined);
    setCopyStatus(undefined);

    try {
      const response = (await browser.runtime.sendMessage({
        type: 'AIWM_RETRIEVE_RULES',
        payload: { task, currentInput, limit: 8 },
      })) as RetrievalResponse;
      if (!response.valid) {
        setError('Add a Task or Current Input before retrieving Rules.');
        return;
      }

      const nextContextId = crypto.randomUUID();
      const defaultIds = defaultIncludedRuleIds(response.rules);
      setContextId(nextContextId);
      setRules(response.rules);
      setIncludedIds(defaultIds);
      setShowPreview(false);
      if (response.rules.length) {
        recordUsage(
          nextContextId,
          [
            ...response.rules.map((rule) => ({
              assetId: rule.asset.id,
              action: 'retrieved' as const,
            })),
            ...response.rules
              .filter((rule) => defaultIds.has(rule.asset.id))
              .map((rule) => ({
                assetId: rule.asset.id,
                action: 'included' as const,
              })),
          ],
        );
      }
    } catch {
      setError('Unable to retrieve local Rules.');
    } finally {
      setRetrieving(false);
    }
  };

  const toggleRule = (assetId: string) => {
    setIncludedIds((current) => {
      const next = new Set(current);
      const willInclude = !next.has(assetId);
      if (willInclude) {
        next.add(assetId);
      } else {
        next.delete(assetId);
      }

      if (contextId) {
        recordUsage(contextId, [
          { assetId, action: willInclude ? 'included' : 'excluded' },
        ]);
      }
      return next;
    });
    setCopyStatus(undefined);
  };

  const copyContext = async () => {
    try {
      await navigator.clipboard.writeText(context);
      setCopyStatus('Context copied.');
      setError(undefined);
      if (contextId && includedRules.length) {
        recordUsage(
          contextId,
          includedRules.map((rule) => ({
            assetId: rule.asset.id,
            action: 'copied',
          })),
        );
      }
    } catch {
      setError('Clipboard access failed. Open Preview and copy the text manually.');
    }
  };

  return (
    <form className="build-context" onSubmit={retrieve}>
      <div className="field-group">
        <label htmlFor="task">Task</label>
        <input
          id="task"
          maxLength={500}
          onChange={(event) => setTask(event.target.value)}
          placeholder="e.g. Weekly Report"
          required
          value={task}
        />
      </div>

      <div className="field-group">
        <label htmlFor="current-input">Current Input</label>
        <textarea
          id="current-input"
          maxLength={12_000}
          onChange={(event) => setCurrentInput(event.target.value)}
          placeholder="Paste the latest task material..."
          required
          rows={7}
          value={currentInput}
        />
      </div>

      <div className="retrieve-row">
        <span>Rules stay local and are never injected automatically.</span>
        <button className="primary-button" disabled={retrieving} type="submit">
          {retrieving ? 'Retrieving…' : 'Retrieve Rules'}
        </button>
      </div>

      {error && <p className="form-error">{error}</p>}

      {rules.length > 0 && (
        <section className="recommended-rules">
          <div className="recommended-heading">
            <h2>Recommended Rules</h2>
            <span>{includedIds.size} included</span>
          </div>
          <ul>
            {rules.map((rule) => (
              <li key={rule.asset.id}>
                <label>
                  <input
                    checked={includedIds.has(rule.asset.id)}
                    onChange={() => toggleRule(rule.asset.id)}
                    type="checkbox"
                  />
                  <span>
                    <strong>{rule.asset.name}</strong>
                    <small>{rule.asset.scope.label ?? 'Global'}</small>
                    <em>{rule.reasons.join(' · ')}</em>
                  </span>
                  <b>{Math.round(rule.score * 100)}</b>
                </label>
              </li>
            ))}
          </ul>
        </section>
      )}

      {contextId && rules.length === 0 && (
        <p className="empty-state">
          No matching Rules found. Save more corrections or refine the Task.
        </p>
      )}

      {contextId && (
        <div className="context-actions">
          <button
            className="secondary-button"
            onClick={() => setShowPreview((value) => !value)}
            type="button"
          >
            {showPreview ? 'Hide Preview' : 'Preview Context'}
          </button>
          <button className="primary-button" onClick={() => void copyContext()} type="button">
            Copy Context
          </button>
        </div>
      )}

      {copyStatus && <p className="save-notice">{copyStatus}</p>}
      {showPreview && (
        <pre className="context-preview" tabIndex={0}>
          {context}
        </pre>
      )}
    </form>
  );
}
