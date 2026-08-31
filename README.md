# AI Work Memory

AI Work Memory is a local-first Chrome and Edge extension that turns everyday AI corrections into reusable working rules.

> Work normally. Assets accumulate naturally.

The V0.1 product hypothesis is deliberately narrow: will a user save a real correction as a reviewed Rule and reuse it in a later task?

## Current version

`v0.1.11`

This repository currently contains:

- Phase 1: WXT + React Manifest V3 skeleton with a side panel, background service worker, and platform content-script health check.
- Phase 2: versioned IndexedDB schema, repository layer, asset revisions, source events, usage events, and unit tests.
- Phase 3: selection capture, a quiet Save as Rule action on supported AI sites, a browser context-menu fallback, pending-capture inbox, and isolated ChatGPT/Claude/Gemini adapters.
- Phase 4: reviewed Candidate Rule form, Scope selection, optional local AI evidence, exact similar-Rule detection, Create New, Update Existing, and immutable revisions.
- Phase 5: quiet Rule Library with search, Scope filtering, detail view, editing, archiving, and immutable version history.
- Phase 6: deterministic local Rule retrieval with Scope matching, bilingual keyword matching, transparent ranking reasons, and duplicate detection.
- Phase 7: Build Context workflow for Task and Current Input, explicit Rule inclusion, preview, copy, and local reuse evidence.
- Phase 8: versioned JSON export/import with atomic safe merge, schema validation, conflict detection, and readable Markdown export.
- Phase 9: provider-based Rule distillation with an always-available manual fallback and optional Chrome on-device Prompt API enhancement.
- Capture refinement: immediate side-panel review plus bounded Project, conversation, and current-task context for stronger Rule candidates.

The complete V0.1 `Correction -> Rule -> Reuse` flow is implemented.

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

**Important after an update:** when an unpacked extension is reloaded or replaced, refresh any already-open ChatGPT, Claude, or Gemini tabs before using **Save as Rule**. Existing tabs can keep the old content-script instance until the page reloads. v0.1.11 also detects common stale-extension-context failures and shows **Reload page** instead of leaving the capture action stuck indefinitely.

## Capture a correction

- On ChatGPT, Claude, or Gemini, select text and choose **Save as Rule** beside the selection.
- On any page, select text and use the browser context menu **Save selection as Rule**.
- **Save as Rule starts Candidate Review; it does not persist a Rule by itself.** The floating action reports **Review ready** once the capture has reached the side panel.
- The capture request has a bounded timeout. If the extension was reloaded while the AI page stayed open, the action prompts **Reload page** rather than remaining stuck.
- The side panel opens immediately. On supported AI sites, the extension snapshots the selection and visible context before the browser context menu can clear the selection, then reads only the current Project identity, conversation title, nearest prior user task, and nearby AI response.
- ChatGPT Project identity uses the visible Project name when available and a stable URL-derived Project label when the sidebar is hidden or its DOM changes.
- Candidate Review separates the original Correction, temporary Captured Context, and the proposed Reusable Rule. Detected Project names prefill Project Scope.
- If Chrome's on-device Prompt API is already available, it automatically proposes a context-aware Rule without overwriting user edits. Otherwise the editable manual candidate remains available.
- Review the Rule name, Scope, and content before choosing **Save Rule**.
- A Rule becomes saved only after **Save Rule**, **Create New**, or **Update Existing** completes successfully and the IndexedDB write finishes.
- If the same Rule name and Scope already exist, choose **Update Existing** to append a revision or **Create New** to preserve both Rules.

## Manage saved Rules

- Open **Library** to search active Rules by name, Scope, or current content.
- Filter the list by Global, Task, Project, or Custom Scope.
- Open a Rule to inspect its current content and complete revision history.
- Editing appends a new immutable revision; archiving removes the Rule from the active Library without deleting its stored history.

## Retrieval model

- Retrieval stays fully local and deterministic; no embedding API, vector database, or model call is used.
- Ranking combines Scope relevance with keyword coverage across Rule name, Scope, tags, and current content.
- Each result includes visible matching reasons so Phase 7 can let the user decide which Rules to include.
- English words and Chinese character bigrams are both supported.

## Build Context

1. Enter the Task and paste the latest Current Input.
2. Choose **Retrieve Rules** and review every recommendation and matching reason.
3. Include or exclude Rules explicitly; the extension never injects them automatically.
4. Preview the deterministic Markdown context, then choose **Copy Context** for use in any AI tool.

Retrieved, included, excluded, and copied actions are stored only as local Usage Events. Copying an included Rule increments its local reuse count.

## Rule distillation

- Every capture immediately receives an editable manual candidate; no model or API key is required.
- When Chrome exposes its built-in Prompt API, Candidate Review offers an explicit **Improve with Browser AI** action.
- The on-device model is only prepared after that user action. A missing API, unsupported language or device, download failure, inference failure, or invalid result falls back safely without blocking Rule capture.
- Browser AI can suggest a Rule name, content, and Scope, but the UI applies only name and content and always requires review before save.

## Data and privacy

- Product data is stored locally in IndexedDB under `ai-work-memory`.
- UI preferences may use extension-local storage.
- No server, account, cloud sync, analytics upload, or model API is included.
- Optional Chrome built-in AI inference runs on device. The browser may download its local model after explicit user activation.
- The content script runs only on ChatGPT, Claude, and Gemini domains. It reads a selection only after a user selects text and activates Save as Rule.
- Bounded Project/conversation/task context is read only during that explicit capture action. The extension does not scan project history, Project Sources, full conversations, or unrelated pages.
- Captured conversation title and task context are temporary review inputs and are not persisted as a transcript. A detected Project name may be retained only through the user-confirmed Rule Scope.
- Platform adapters may offer a bounded, nearby AI response as optional local evidence. Evidence is discarded unless the user explicitly opts in during review.
- Captures do not store the page URL by default.
- No all-sites host permission is requested.

## Import and export

- Open **Settings** to export a complete, versioned JSON backup or a readable Markdown Rule document.
- JSON imports validate the schema and every relationship before writing.
- Existing identical records are skipped. Any ID or Rule-key conflict aborts the complete import, so partial imports are not left behind.
- Import and export remain local browser operations; no data is sent to a server.

## Storage model

- `assets`: stable identity and current revision pointer.
- `asset_revisions`: immutable rule versions.
- `source_events`: minimal provenance for correction, selection, or manual capture.
- `usage_events`: local retrieval and reuse events.
- `meta`: schema metadata.

Database schema version: `1`.
Export schema version: `1`.

## Repository structure

```text
src/
  adapters/              Platform detection and progressive enhancement
  core/                  Product constants and domain models
  entrypoints/           Background, content script, and side panel
  services/              Extension services such as the capture inbox
  storage/
    db/                  IndexedDB schema and migrations
    repositories/        Storage abstraction
  test/                  Test environment
```

## Product boundary

V0.1 does not include accounts, cloud sync, dashboards, vector databases, whole-conversation extraction, prompts marketplace, templates, workflows, skills, agents, or automation.
