import type { DBSchema } from 'idb';

import type {
  Asset,
  AssetRevision,
  SourceEvent,
  UsageEvent,
} from '../../core/assets/types';

export interface DatabaseMeta {
  key: string;
  value: string | number | boolean;
  updated_at: string;
}

export interface AIWorkMemoryDatabase extends DBSchema {
  assets: {
    key: string;
    value: Asset;
    indexes: {
      'by-status': Asset['status'];
      'by-scope-level': Asset['scope']['level'];
      'by-canonical-key': string;
      'by-updated-at': string;
    };
  };
  asset_revisions: {
    key: string;
    value: AssetRevision;
    indexes: {
      'by-asset-id': string;
      'by-asset-version': [string, number];
      'by-created-at': string;
    };
  };
  source_events: {
    key: string;
    value: SourceEvent;
    indexes: {
      'by-event-type': SourceEvent['event_type'];
      'by-platform': SourceEvent['platform'];
      'by-captured-at': string;
    };
  };
  usage_events: {
    key: string;
    value: UsageEvent;
    indexes: {
      'by-asset-id': string;
      'by-context-id': string;
      'by-created-at': string;
    };
  };
  meta: {
    key: string;
    value: DatabaseMeta;
  };
}

