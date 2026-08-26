# AI Work Memory

AI Work Memory is a local-first Chrome and Edge extension that turns everyday AI corrections into reusable working rules.

> Work normally. Assets accumulate naturally.

The V0.1 product hypothesis is deliberately narrow: will a user save a real correction as a reviewed Rule and reuse it in a later task?

## Current version

`v0.1.1`

This repository currently contains:

- Phase 1: WXT + React Manifest V3 skeleton with a side panel, background service worker, and platform content-script health check.
- Phase 2: versioned IndexedDB schema, repository layer, asset revisions, source events, usage events, and unit tests.
- Phase 3: selection capture, a quiet Save as Rule action on supported AI sites, a browser context-menu fallback, pending-capture inbox, and isolated ChatGPT/Claude/Gemini adapters.

Candidate review, retrieval, context composition, and import/export UI are intentionally not implemented yet.

## Technology

- WXT
- TypeScript
- React
- Manifest V3
- IndexedDB via `idb`
- Vitest + `fake-indexeddb`

## Development

Requirements: Node.js 20+ and pnpm.

```bash
pnpm install
pnpm dev
```

Build and validate:

```bash
pnpm typecheck
pnpm test
pnpm build:chrome
pnpm build:edge
```

Build output is written beneath `.output/`.

## Install the unpacked extension

Chrome:

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Choose **Load unpacked**.
4. Select `.output/chrome-mv3`.

Edge:

1. Open `edge://extensions`.
2. Enable Developer mode.
3. Choose **Load unpacked**.
4. Select `.output/edge-mv3`.

Click the toolbar action to open the side panel.

## Capture a correction

- On ChatGPT, Claude, or Gemini, select text and choose **Save as Rule** beside the selection.
- On any page, select text and use the browser context menu **Save selection as Rule**.
- The side panel opens with a local preview. Phase 4 will turn that preview into an editable Candidate Rule.

## Data and privacy

- Product data is stored locally in IndexedDB under `ai-work-memory`.
- UI preferences may use extension-local storage.
- No server, account, cloud sync, analytics upload, or model API is included.
- The content script runs only on ChatGPT, Claude, and Gemini domains. It reads a selection only after a user selects text and activates Save as Rule.
- Platform adapters may retain a bounded, nearby AI response as optional local evidence; they do not extract a full conversation.
- Captures do not store the page URL by default.
- No all-sites host permission is requested.

## Storage model

- `assets`: stable identity and current revision pointer.
- `asset_revisions`: immutable rule versions.
- `source_events`: minimal provenance for correction, selection, or manual capture.
- `usage_events`: local retrieval and reuse events.
- `meta`: schema metadata.

Database schema version: `1`.

## Repository structure

```text
src/
  adapters/              Platform detection and progressive enhancement
  core/                 Product constants and domain models
  entrypoints/           Background, content script, and side panel
  services/              Extension services such as the capture inbox
  storage/
    db/                  IndexedDB schema and migrations
    repositories/        Storage abstraction
  test/                  Test environment
```

## Product boundary

V0.1 does not include accounts, cloud sync, dashboards, vector databases, whole-conversation extraction, prompts marketplace, templates, workflows, skills, agents, or automation.
