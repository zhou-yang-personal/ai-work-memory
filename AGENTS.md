# AI Work Memory repository instructions

Read this file before requirements, architecture, UI, code, review, or bug-fix work.

## Product boundary

- V0.1 validates only `Correction -> Rule -> Reuse`.
- Do not add accounts, cloud sync, dashboards, vector search, chat UIs, templates, examples, workflows, skills, or automation.
- Keep the product local-first. Do not upload user content or save whole conversations.
- Platform adapters are progressive enhancement. Generic selection must remain the fallback.

## Architecture rules

- Keep business logic in `src/core`; keep browser/DOM details in entrypoints or adapters.
- UI code must not access IndexedDB directly. Use repositories/services.
- Changes to an asset create a new `AssetRevision`; do not duplicate the asset.
- Storage schemas and exports must be versioned.
- Prefer small, strongly typed modules and pure functions.

## UI rules

- Default side-panel page: Build Context.
- First-level navigation: Build Context, Library, Settings.
- Keep the interface quiet and lightweight; no dashboard, gradients, gamification, or decorative icon stacks.

## Required checks

Run before delivery:

```bash
pnpm typecheck
pnpm test
pnpm build:chrome
pnpm build:edge
```

For storage, retrieval, context composition, migrations, or import/export changes, add or update unit tests.

## Versions and delivery

- Keep the version aligned in `package.json`, `wxt.config.ts`, the UI, README, and CHANGELOG.
- Every code delivery includes a ZIP containing only files changed in that delivery, preserving repository-relative paths.

