export type AssetKind =
  | 'rule'
  | 'example'
  | 'template'
  | 'knowledge'
  | 'skill'
  | 'workflow';

export type AssetStatus = 'active' | 'archived';

export type ScopeLevel = 'global' | 'task' | 'project' | 'custom';

export interface ScopeSpec {
  level: ScopeLevel;
  key?: string;
  label?: string;
  applies_when?: string;
}

export interface Asset {
  id: string;
  kind: AssetKind;
  name: string;
  status: AssetStatus;
  scope: ScopeSpec;
  tags: string[];
  canonical_key: string;
  current_revision_id: string;
  created_at: string;
  updated_at: string;
  usage_count: number;
  last_used_at?: string;
}

export interface AssetRevision {
  id: string;
  asset_id: string;
  version: number;
  content: string;
  source_event_ids: string[];
  change_reason?: string;
  supersedes_revision_id?: string;
  created_at: string;
}

export type SourceEventType = 'correction' | 'selected_text' | 'manual';
export type SourcePlatform = 'chatgpt' | 'claude' | 'gemini' | 'generic';
export type RetentionMode = 'minimal' | 'with_ai_evidence';

export interface SourceEvent {
  id: string;
  event_type: SourceEventType;
  platform: SourcePlatform;
  source_url?: string;
  ai_text?: string;
  user_text: string;
  captured_at: string;
  retention_mode: RetentionMode;
}

export type UsageAction = 'retrieved' | 'included' | 'excluded' | 'copied';

export interface UsageEvent {
  id: string;
  asset_id: string;
  action: UsageAction;
  task_text?: string;
  context_id: string;
  created_at: string;
}

