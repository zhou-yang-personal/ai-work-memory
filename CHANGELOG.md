# Changelog

All notable changes to AI Work Memory are documented here.

## [0.1.12] - 2026-08-31

### Added

- Permanent Rule deletion from Library detail with a second confirmation step.
- Transactional cascade cleanup for a deleted Rule's revisions, usage events, and source events that are no longer referenced by another Rule.
- Lightweight **Import Rules** flow for existing knowledge using a simple JSON array without internal IDs or revision metadata.
- Bulk Rule import supports Global, Task, Project, and Custom Scope plus optional tags, validates the complete file before writing, and skips existing same-name + same-Scope Rules.
- Unit coverage for Rule import normalization, atomic bulk creation, and permanent deletion cleanup.

### Changed

- The previous Settings **Import JSON** action is now labeled **Restore Backup** to distinguish full AI Work Memory backup recovery from everyday Rule import.
- Version advanced to `0.1.12` across the manifest source, package metadata, UI, README, and changelog.

## [0.1.11] - 2026-08-31

### Fixed

- The page-level Save as Rule action no longer remains stuck indefinitely when an unpacked extension is reloaded while ChatGPT, Claude, or Gemini stays open.
- Capture requests now time out after four seconds instead of leaving the action in a permanent in-progress state.
- Common stale extension-context failures now surface `Reload page`, making the required recovery action explicit.

### Changed

- Installation guidance now explicitly requires refreshing already-open supported AI tabs after reloading or replacing an unpacked extension so the latest content script is injected.
- Version advanced to `0.1.11` across the manifest source, package metadata, UI, README, and changelog.

## [0.1.10] - 2026-08-31

### Fixed

- Pending Candidate Review no longer blocks the Library or Settings navigation.
- The side-panel header now reflects the active first-level page instead of showing `Save as Rule` globally whenever a pending capture exists.
- Candidate Review remains mounted while visiting Library or Settings, preserving the in-progress Rule draft and local AI state until the user returns.
- Clearing a pending capture no longer forces the user away from the page they are currently viewing; only a newly received capture brings the side panel back to Build Context.
- The page-level Save as Rule action no longer reports `Saved` when a selection has only been accepted into Candidate Review. It now reports `Review ready`; persistence still requires an explicit Save Rule, Create New, or Update Existing action.

### Changed

- Capture action accessibility text and README documentation now distinguish pending review state from a persisted Rule.
- Version advanced to `0.1.10` across the manifest source, package metadata, UI, README, and changelog.

## [0.1.9] - 2026-08-26

### Fixed

- Context-menu capture now snapshots the selected text and bounded page context before Chrome opens the native menu, preventing selection loss from silently dropping Project and task context.
- Context enrichment validates the cached snapshot against the browser-provided selected text so an older selection cannot be attached to a new Rule.
- ChatGPT Project detection now uses multiple current-page signals and falls back to a stable URL-derived Project identity when the sidebar name is unavailable.
- Conversation-title detection now includes the current conversation link used by newer ChatGPT layouts.

### Added

- Unit coverage for cached-selection validation and ChatGPT Project URL identity extraction.

### Changed

- Version advanced to `0.1.9` across the manifest source, package metadata, UI, README, and changelog.

## [0.1.8] - 2026-08-26

### Added

- Bounded `CaptureContext` for current Project name, conversation title, and nearest prior user task.
- Platform-specific context extraction for ChatGPT, Claude, and Gemini with selection-only fallback.
- Context-aware Candidate Review that clearly separates Correction, temporary Context, and Reusable Rule.
- Automatic Project Scope prefilling when a current Project can be identified.
- Context-aware Chrome on-device Rule distillation that generalizes a correction instead of prompting from the selected sentence alone.
- Automatic distillation when the local model is already available, with protection against overwriting user edits.
- Unit coverage for context normalization, Project Scope suggestions, conversation-title cleanup, and context-aware model prompts.

### Fixed

- Context-menu and page-action capture now invoke the side panel before asynchronous persistence or context extraction, preserving the direct user-gesture requirement.

### Changed

- Version advanced to `0.1.8` across the manifest source, package metadata, UI, README, and changelog.

## [0.1.7] - 2026-08-26

### Added

- Unified `DistillationProvider` interface with availability and correction-distillation contracts.
- Always-available `ManualFallbackProvider` for editable local Rule candidates.
- Feature-detected `ChromeBuiltInProvider` using Chrome's on-device Prompt API and constrained JSON output.
- Optional Candidate Review action for Browser AI suggestions, local model download progress, and explicit review-before-save messaging.
- Settings status for available, downloadable, downloading, and unavailable Browser AI states.
- Unit tests for manual candidates, Chrome API absence and structured output, and service-level failure fallback.

### Changed

- Manual Candidate generation now runs through the fallback provider's shared pure function.
- Browser AI failures leave the current editable draft intact and never block capture or save.
- Version advanced to `0.1.7` across the manifest source, package metadata, UI, README, and changelog.

## [0.1.6] - 2026-08-26

### Added

- Versioned JSON export for Rules, revisions, Source Events, and Usage Events.
- Readable Markdown export containing each current Rule and its metadata.
- JSON import validation for schema compatibility, record shape, duplicate IDs, and cross-record references.
- Atomic safe-merge imports that skip identical records and abort completely on ID or canonical Rule-key conflicts.
- Settings controls for local export/import plus explicit privacy notes.
- Unit tests for export validation, Markdown rendering, successful merge, repeated import, and conflict rollback.

### Changed

- Version advanced to `0.1.6` across the manifest source, package metadata, UI, README, and changelog.

## [0.1.5] - 2026-08-26

### Added

- Build Context form for Task and Current Input.
- Recommended Rule list with explicit Include and Exclude controls.
- Visible retrieval scores, Scope labels, and matching reasons.
- Deterministic Markdown Context Composer with preview and clipboard copy.
- Local Usage Event recording for retrieved, included, excluded, and copied Rules.
- Reuse count and last-used timestamp updates when a Rule is copied.
- Unit tests for context composition, default selection, usage events, and reuse counts.

### Changed

- The default Build Context page is now functional instead of a disabled placeholder.
- Version advanced to `0.1.5` across the manifest source, package metadata, UI, README, and changelog.

## [0.1.4] - 2026-08-26

### Added

- Deterministic local Rule retrieval using Scope and keyword signals.
- Weighted ranking with explicit score, matched terms, and human-readable reasons.
- English word and Chinese bigram tokenization.
- Input normalization and bounded retrieval result limits.
- Duplicate Rule detection using name, content, and Scope similarity.
- Background retrieval message ready for the Phase 7 Build Context UI.
- Unit tests covering ranking, reasons, keyword-only matches, Chinese text, and duplicate detection.

### Changed

- Candidate review now uses similarity-based duplicate detection instead of exact canonical-key matching only.
- Version advanced to `0.1.4` across the manifest source, package metadata, UI, README, and changelog.

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
