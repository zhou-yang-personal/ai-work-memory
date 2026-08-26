# Changelog

All notable changes to AI Work Memory are documented here.

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
