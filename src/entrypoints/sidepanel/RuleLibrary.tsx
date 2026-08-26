import { useEffect, useState, type FormEvent } from 'react';

import type { ScopeLevel } from '../../core/assets/types';
import type { CandidateRuleDraft } from '../../core/rules/candidate-rule';
import type {
  RuleDetail,
  RuleLibraryItem,
  RuleScopeFilter,
} from '../../core/rules/rule-library';

interface RuleLibraryProps {
  onNotice(message: string): void;
}

interface UpdateResponse {
  saved: boolean;
  error?: string;
}

interface ArchiveResponse {
  archived: boolean;
  error?: string;
}

const scopeOptions: Array<{ value: RuleScopeFilter; label: string }> = [
  { value: 'all', label: 'All scopes' },
  { value: 'global', label: 'Global' },
  { value: 'task', label: 'Task' },
  { value: 'project', label: 'Project' },
  { value: 'custom', label: 'Custom' },
];

function draftFromDetail(detail: RuleDetail): CandidateRuleDraft {
  return {
    name: detail.asset.name,
    content: detail.currentRevision.content,
    scopeLevel: detail.asset.scope.level,
    ...(detail.asset.scope.label
      ? { scopeLabel: detail.asset.scope.label }
      : {}),
    keepAiEvidence: false,
  };
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function RuleLibrary({ onNotice }: RuleLibraryProps) {
  const [query, setQuery] = useState('');
  const [scopeLevel, setScopeLevel] = useState<RuleScopeFilter>('all');
  const [items, setItems] = useState<RuleLibraryItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [detail, setDetail] = useState<RuleDetail>();
  const [draft, setDraft] = useState<CandidateRuleDraft>();
  const [editing, setEditing] = useState(false);
  const [archiveConfirm, setArchiveConfirm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      browser.runtime
        .sendMessage({
          type: 'AIWM_LIST_RULES',
          payload: { query, scopeLevel },
        })
        .then((response: RuleLibraryItem[]) => setItems(response))
        .catch(() => setError('Unable to load the local Rule Library.'))
        .finally(() => setLoading(false));
    }, 180);

    return () => clearTimeout(timer);
  }, [query, scopeLevel, refreshToken]);

  useEffect(() => {
    const handleLibraryChanged = (message: unknown) => {
      if (
        typeof message === 'object' &&
        message !== null &&
        'type' in message &&
        message.type === 'AIWM_RULE_LIBRARY_CHANGED'
      ) {
        setRefreshToken((value) => value + 1);
      }
    };

    browser.runtime.onMessage.addListener(handleLibraryChanged);
    return () => browser.runtime.onMessage.removeListener(handleLibraryChanged);
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setDetail(undefined);
      setDraft(undefined);
      return;
    }

    browser.runtime
      .sendMessage({
        type: 'AIWM_GET_RULE_DETAIL',
        payload: { assetId: selectedId },
      })
      .then((response: RuleDetail | undefined) => {
        setDetail(response);
        setDraft(response ? draftFromDetail(response) : undefined);
      })
      .catch(() => setError('Unable to load this Rule.'));
  }, [selectedId, refreshToken]);

  const updateDraft = <Key extends keyof CandidateRuleDraft>(
    key: Key,
    value: CandidateRuleDraft[Key],
  ) => {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
    setError(undefined);
  };

  const saveEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!detail || !draft) {
      return;
    }

    setSaving(true);
    setError(undefined);
    try {
      const response = (await browser.runtime.sendMessage({
        type: 'AIWM_UPDATE_LIBRARY_RULE',
        payload: { assetId: detail.asset.id, draft },
      })) as UpdateResponse;
      if (!response.saved) {
        setError(response.error ?? 'Unable to update this Rule.');
        return;
      }

      setEditing(false);
      setRefreshToken((value) => value + 1);
      onNotice('Rule updated with a new revision.');
    } catch {
      setError('Background service unavailable. Your edits are still here.');
    } finally {
      setSaving(false);
    }
  };

  const archive = async () => {
    if (!detail) {
      return;
    }

    setSaving(true);
    setError(undefined);
    try {
      const response = (await browser.runtime.sendMessage({
        type: 'AIWM_ARCHIVE_RULE',
        payload: { assetId: detail.asset.id },
      })) as ArchiveResponse;
      if (!response.archived) {
        setError(response.error ?? 'Unable to archive this Rule.');
        return;
      }

      setSelectedId(undefined);
      setArchiveConfirm(false);
      setRefreshToken((value) => value + 1);
      onNotice('Rule archived.');
    } catch {
      setError('Background service unavailable. The Rule was not archived.');
    } finally {
      setSaving(false);
    }
  };

  if (selectedId && detail && draft) {
    return (
      <section className="library-detail">
        <button
          className="back-button"
          onClick={() => {
            setSelectedId(undefined);
            setEditing(false);
            setArchiveConfirm(false);
            setError(undefined);
          }}
          type="button"
        >
          ← Back to Rules
        </button>

        {editing ? (
          <form className="candidate-form" onSubmit={saveEdit}>
            <div className="field-group">
              <label htmlFor="library-rule-name">Rule Name</label>
              <input
                id="library-rule-name"
                maxLength={120}
                onChange={(event) => updateDraft('name', event.target.value)}
                required
                value={draft.name}
              />
            </div>

            <div className="scope-row">
              <div className="field-group">
                <label htmlFor="library-scope-level">Scope</label>
                <select
                  id="library-scope-level"
                  onChange={(event) =>
                    updateDraft('scopeLevel', event.target.value as ScopeLevel)
                  }
                  value={draft.scopeLevel}
                >
                  {scopeOptions.slice(1).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              {draft.scopeLevel !== 'global' && (
                <div className="field-group scope-label-field">
                  <label htmlFor="library-scope-label">Scope Name</label>
                  <input
                    id="library-scope-label"
                    maxLength={120}
                    onChange={(event) =>
                      updateDraft('scopeLabel', event.target.value)
                    }
                    required
                    value={draft.scopeLabel ?? ''}
                  />
                </div>
              )}
            </div>

            <div className="field-group">
              <label htmlFor="library-rule-content">Rule Content</label>
              <textarea
                id="library-rule-content"
                maxLength={12_000}
                onChange={(event) => updateDraft('content', event.target.value)}
                required
                rows={8}
                value={draft.content}
              />
            </div>

            {error && <p className="form-error">{error}</p>}
            <div className="form-actions">
              <button
                className="secondary-button"
                onClick={() => {
                  setDraft(draftFromDetail(detail));
                  setEditing(false);
                  setError(undefined);
                }}
                type="button"
              >
                Cancel
              </button>
              <button className="primary-button" disabled={saving} type="submit">
                {saving ? 'Saving…' : 'Save New Revision'}
              </button>
            </div>
          </form>
        ) : (
          <>
            <header className="rule-detail-header">
              <div>
                <span className="scope-badge">
                  {detail.asset.scope.label ?? 'Global'}
                </span>
                <h2>{detail.asset.name}</h2>
              </div>
              <span className="revision-badge">
                v{detail.currentRevision.version}
              </span>
            </header>

            <div className="rule-full-content">{detail.currentRevision.content}</div>

            <div className="detail-actions">
              <button
                className="secondary-button"
                onClick={() => setEditing(true)}
                type="button"
              >
                Edit Rule
              </button>
              {!archiveConfirm ? (
                <button
                  className="archive-button"
                  onClick={() => setArchiveConfirm(true)}
                  type="button"
                >
                  Archive
                </button>
              ) : (
                <div className="archive-confirm">
                  <span>Archive this Rule?</span>
                  <button onClick={() => setArchiveConfirm(false)} type="button">
                    Keep
                  </button>
                  <button disabled={saving} onClick={() => void archive()} type="button">
                    Archive
                  </button>
                </div>
              )}
            </div>

            {error && <p className="form-error">{error}</p>}

            <section className="history-section">
              <h3>Version History</h3>
              <ol>
                {detail.revisions.map((revision) => (
                  <li key={revision.id}>
                    <div>
                      <strong>Revision {revision.version}</strong>
                      <span>{formatDate(revision.created_at)}</span>
                    </div>
                    <p>{revision.content}</p>
                    {revision.change_reason && <small>{revision.change_reason}</small>}
                  </li>
                ))}
              </ol>
            </section>
          </>
        )}
      </section>
    );
  }

  return (
    <section className="rule-library">
      <div className="library-controls">
        <input
          aria-label="Search Rules"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search Rules"
          type="search"
          value={query}
        />
        <select
          aria-label="Filter by Scope"
          onChange={(event) =>
            setScopeLevel(event.target.value as RuleScopeFilter)
          }
          value={scopeLevel}
        >
          {scopeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="form-error">{error}</p>}
      {loading ? (
        <p className="empty-state">Loading Rules…</p>
      ) : items.length === 0 ? (
        <p className="empty-state">
          {query || scopeLevel !== 'all'
            ? 'No Rules match this search.'
            : 'No Rules saved yet. Capture a correction to create the first one.'}
        </p>
      ) : (
        <ul className="rule-list">
          {items.map((item) => (
            <li key={item.asset.id}>
              <button onClick={() => setSelectedId(item.asset.id)} type="button">
                <div className="rule-list-heading">
                  <strong>{item.asset.name}</strong>
                  <span>v{item.currentRevision.version}</span>
                </div>
                <p>{item.currentRevision.content}</p>
                <small>
                  {item.asset.scope.label ?? 'Global'} · Updated{' '}
                  {formatDate(item.asset.updated_at)}
                </small>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

