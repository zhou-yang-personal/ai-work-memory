import { useEffect, useState, type FormEvent } from 'react';

import type { Asset, AssetRevision, ScopeLevel } from '../../core/assets/types';
import type { PendingCapture } from '../../core/capture/model';
import {
  deriveCandidateRule,
  type CandidateRuleDraft,
  type RuleSaveMode,
} from '../../core/rules/candidate-rule';

interface CandidateRuleReviewProps {
  capture: PendingCapture;
  onCancel(): void;
  onSaved(message: string): void;
}

interface SimilarRule {
  asset: Asset;
  revision?: AssetRevision;
}

interface SimilarRuleResponse {
  valid: boolean;
  existing?: SimilarRule;
}

interface SaveRuleResponse {
  saved: boolean;
  mode?: RuleSaveMode;
  error?: string;
  result?: {
    asset: Asset;
    revision: AssetRevision;
  };
}

const scopeOptions: Array<{ value: ScopeLevel; label: string }> = [
  { value: 'global', label: 'Global' },
  { value: 'task', label: 'Task' },
  { value: 'project', label: 'Project' },
  { value: 'custom', label: 'Custom' },
];

export function CandidateRuleReview({
  capture,
  onCancel,
  onSaved,
}: CandidateRuleReviewProps) {
  const [draft, setDraft] = useState<CandidateRuleDraft>(() =>
    deriveCandidateRule(capture),
  );
  const [similarRule, setSimilarRule] = useState<SimilarRule>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const timer = setTimeout(() => {
      browser.runtime
        .sendMessage({ type: 'AIWM_FIND_SIMILAR_RULE', payload: draft })
        .then((response: SimilarRuleResponse) => {
          setSimilarRule(response.valid ? response.existing : undefined);
        })
        .catch(() => setSimilarRule(undefined));
    }, 250);

    return () => clearTimeout(timer);
  }, [draft.name, draft.content, draft.scopeLevel, draft.scopeLabel, draft.keepAiEvidence]);

  const updateDraft = <Key extends keyof CandidateRuleDraft>(
    key: Key,
    value: CandidateRuleDraft[Key],
  ) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setError(undefined);
  };

  const save = async (mode: RuleSaveMode) => {
    setSaving(true);
    setError(undefined);

    try {
      const response = (await browser.runtime.sendMessage({
        type: 'AIWM_SAVE_CANDIDATE_RULE',
        payload: {
          draft,
          mode,
          ...(mode === 'update' && similarRule
            ? { existingAssetId: similarRule.asset.id }
            : {}),
        },
      })) as SaveRuleResponse;

      if (!response.saved || !response.result) {
        setError(response.error ?? 'Unable to save this Rule.');
        return;
      }

      const action = response.mode === 'update' ? 'updated' : 'created';
      onSaved(`${response.result.asset.name} ${action} as revision ${response.result.revision.version}.`);
    } catch {
      setError('Background service unavailable. Your candidate is still here.');
    } finally {
      setSaving(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void save('create');
  };

  return (
    <form className="candidate-form" onSubmit={submit}>
      <section className="source-panel">
        <div className="section-heading">
          <div>
            <p className="capture-kicker">Source / Correction</p>
            <h2>Captured from {capture.platform}</h2>
          </div>
          <span className="capture-meta">
            {capture.channel === 'context-menu' ? 'Context menu' : 'Page action'}
          </span>
        </div>
        <blockquote>{capture.selectedText}</blockquote>
      </section>

      <div className="field-group">
        <label htmlFor="rule-name">Rule Name</label>
        <input
          autoFocus
          id="rule-name"
          maxLength={120}
          onChange={(event) => updateDraft('name', event.target.value)}
          required
          value={draft.name}
        />
      </div>

      <div className="scope-row">
        <div className="field-group">
          <label htmlFor="scope-level">Scope</label>
          <select
            id="scope-level"
            onChange={(event) =>
              updateDraft('scopeLevel', event.target.value as ScopeLevel)
            }
            value={draft.scopeLevel}
          >
            {scopeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {draft.scopeLevel !== 'global' && (
          <div className="field-group scope-label-field">
            <label htmlFor="scope-label">Scope Name</label>
            <input
              id="scope-label"
              maxLength={120}
              onChange={(event) => updateDraft('scopeLabel', event.target.value)}
              placeholder="e.g. Weekly Report"
              required
              value={draft.scopeLabel ?? ''}
            />
          </div>
        )}
      </div>

      <div className="field-group">
        <label htmlFor="rule-content">Rule Content</label>
        <textarea
          id="rule-content"
          maxLength={12_000}
          onChange={(event) => updateDraft('content', event.target.value)}
          required
          rows={7}
          value={draft.content}
        />
      </div>

      {capture.aiText && (
        <label className="evidence-option">
          <input
            checked={draft.keepAiEvidence}
            onChange={(event) =>
              updateDraft('keepAiEvidence', event.target.checked)
            }
            type="checkbox"
          />
          <span>
            Keep the nearby AI response as local evidence
            <small>Off by default. Full conversations are never saved.</small>
          </span>
        </label>
      )}

      {similarRule && (
        <section className="similar-rule" aria-live="polite">
          <p className="capture-kicker">Possible similar Rule</p>
          <h3>{similarRule.asset.name}</h3>
          <p>{similarRule.revision?.content ?? 'Current revision unavailable.'}</p>
          <span>
            {similarRule.asset.scope.label ?? 'Global'} · Revision{' '}
            {similarRule.revision?.version ?? '—'}
          </span>
        </section>
      )}

      {error && <p className="form-error">{error}</p>}

      <div className="form-actions">
        <button className="secondary-button" onClick={onCancel} type="button">
          Cancel
        </button>
        {similarRule && (
          <button
            className="secondary-button"
            disabled={saving}
            onClick={() => void save('update')}
            type="button"
          >
            Update Existing
          </button>
        )}
        <button className="primary-button" disabled={saving} type="submit">
          {saving ? 'Saving…' : similarRule ? 'Create New' : 'Save Rule'}
        </button>
      </div>
    </form>
  );
}

