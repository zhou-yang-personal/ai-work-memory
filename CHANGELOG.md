# Changelog

All notable changes to AI Work Memory are documented here.

## [0.1.3] - 2026-08-26

### Added

- Rule Library list sorted by most recent update.
- Search across Rule name, Scope label, tags, and current Rule content.
- Scope filters for Global, Task, Project, and Custom Rules.
- Rule detail view with complete immutable revision history.
- Rule editing that updates metadata and appends a new revision.
- Two-step Rule archive action that preserves stored history.
- Unit tests for Library filtering and metadata-aware revision updates.

### Changed

- Background messaging now exposes typed Library list, detail, update, and archive operations.
- Version advanced to `0.1.3` across the manifest source, package metadata, UI, README, and changelog.

## [0.1.2] - 2026-08-26

### Added

- Candidate Rule review form for Rule name, Scope, and editable content.
- Explicit opt-in for retaining bounded nearby AI evidence.
- Exact same-name and same-Scope Rule detection before saving.
- Create New and Update Existing actions with immutable revision history.
- Atomic persistence of the Source Event, Rule, and Revision.
- Unit tests for candidate validation, canonical keys, evidence retention, creation, and revision updates.

### Changed

- Captures now open directly in the reviewed Rule workflow instead of a preview-only card.
- Version advanced to `0.1.2` across the manifest source, package metadata, UI, README, and changelog.

## [0.1.1] - 2026-08-25

### Added

- Selection-aware Save as Rule floating action for ChatGPT, Claude, and Gemini.
- Browser selection context-menu fallback for any page without all-sites host access.
- Isolated platform adapters with a Generic Adapter fallback.
- Local pending-capture inbox and side-panel preview.
- Capture normalization, size bounds, platform detection, and unit tests.

### Changed

- Extension manifest now requests the `contextMenus` permission.
- Privacy documentation now describes selection-only capture and optional bounded AI evidence.

## [0.1.0] - 2026-08-23

### Added

- WXT, React, TypeScript, and Manifest V3 extension skeleton.
- Chrome and Edge build targets.
- Build Context-first side panel navigation.
- Background and supported-platform content-script health checks.
- Versioned IndexedDB schema and migration runner.
- Repository layer for assets, revisions, source events, and usage events.
- Unit tests for schema migration, repository behavior, and revision history.
