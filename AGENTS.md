# Canvas Bases - Agent Development Guide

This is an Obsidian companion plugin for Bases and Canvas. The plugin ID is `canvas-bases`.

Canvas Bases materializes an active Obsidian Bases view as a JSON Canvas snapshot, and also registers a dedicated Bases layout named `Canvas Bases` for live canvas-style editing.

## Build & Test

```bash
# Build the plugin and copy files to the test vault plugin directories
npm run build:test

# After building, reload the plugin in the running Obsidian instance
obsidian vault=test plugin:reload id=canvas-bases
```

Always run both commands after making code or CSS changes. Obsidian must be running for the CLI reload to work.

`npm run build:test` copies `main.js`, `styles.css`, and `manifest.json` to the configured test vault plugin directories. Override destinations with `OBSIDIAN_PLUGIN_PATH` or `.copy-files.local` when needed.

If your change depends on sibling TaskNotes runtime API changes in `/home/calluma/projects/tasknotes`, build and reload TaskNotes first:

```bash
cd /home/calluma/projects/tasknotes
npm run build:test
obsidian vault=test plugin:reload id=tasknotes
```

## Useful Obsidian CLI Commands

```bash
# Check for JavaScript errors after reload
obsidian vault=test dev:errors

# View console output
obsidian vault=test dev:console

# Run JavaScript in the Obsidian context
obsidian vault=test eval code="app.plugins.getPlugin('canvas-bases')?.settings"

# Query a Base view when debugging materialization inputs
obsidian vault=test base:query path=TaskNotes/Views/tasks.base view=Tasks format=json

# Take a screenshot to verify UI changes
obsidian vault=test dev:screenshot path=screenshot.png

# Open developer tools
obsidian vault=test devtools
```

## Other Build Commands

```bash
npm test              # Run unit tests with Vitest
npm run lint          # Lint TypeScript and CSS
npm run lint:ts       # Lint TypeScript only
npm run lint:css      # Lint styles.css only
npm run typecheck     # TypeScript type checking only
npm run build         # Production build without copying to vault
npm run smoke:canvas  # Focused canvas builder smoke test
```

Ensure all code changes pass linting checks. Do not weaken linting rules to get changes to pass.

## Runtime Constraints

- Keep the runtime mobile-compatible. Do not use Node runtime APIs in plugin source loaded by Obsidian.
- Node APIs are fine in build, copy, demo, and development scripts.
- Use Obsidian APIs for vault reads, writes, events, commands, modals, menus, and UI.
- Use the Bases API and active Bases view data as the source of truth for rows, visible properties, grouping, sorting, and view config.
- JSON Canvas output should preserve manual non-Canvas Bases nodes when updating an existing canvas.
- Keep generated Canvas Bases-owned IDs stable so positions, dimensions, edges, and linked canvas updates remain durable.
- Do not directly edit TaskNotes task frontmatter for task behavior. Use the TaskNotes runtime API when reading task state or mutating dependencies/projects.
- TaskNotes integration must degrade cleanly when TaskNotes is absent, disabled, or missing a capability.
- Preserve user-authored `.base` view config where possible. Only write Canvas Bases-owned config keys when saving board layout, edge options, link properties, manual items, or linked canvas state.

## UI Expectations

Canvas Bases is an in-vault working surface, not a marketing page. Keep controls compact, theme-native, accessible, and usable with Obsidian themes.

For board changes, verify practical interaction paths: panning, zooming, fit/reset view, dragging, resizing, inline editing, relationship edge rendering, link dragging, and materializing to `.canvas` when the touched code affects them.

For Bases integration changes, test both the dedicated Canvas Bases layout and command-palette materialization from an active native or third-party Bases view when practical.

## Changelog

When you make user-facing changes, update `CHANGELOG.md`. Do not update `CHANGELOG.md` for tests only.

Use the current release section for ongoing work until an `Unreleased` section exists. Keep entries user-facing and clear. If changes are related to a GitHub issue or PR, include acknowledgement of the person who opened the issue or submitted the PR, and any relevant commenters. Do not thank `callumalpass`.

You may update `.ops/` files locally as you work on items, but do not commit `.ops/` files. `.ops/` is local-only working state.

## Investigating Issues

When investigating issues, try to reproduce them first. Use the Obsidian CLI to reload the plugin, inspect console/errors, query Bases, open generated canvas files, and take screenshots for UI changes.

If a feature request sounds like a query, filter, sort, grouping, or dashboard request, first consider whether it belongs in Obsidian Bases rather than in Canvas Bases. Canvas Bases should materialize and visualize the current Bases result set; Bases should remain the source of truth for selecting that result set.

If a bug involves TaskNotes cards, menus, dependencies, projects, or property chips, verify the TaskNotes API capabilities available at runtime before assuming Canvas Bases owns the data model.

## Prepare for a Release

When asked to prepare for a release:

1. Make sure all `npm test` tests are passing.
2. Make sure there are no linting errors.
3. Run `npm run typecheck`.
4. Run `npm run build`.
5. Check that `main.js`, `manifest.json`, and `styles.css` exist and are non-empty.
6. Make sure `CHANGELOG.md` entries are user-facing, clear, and appropriately acknowledge issue or PR contributors. Do not include marketing copy.
7. Update translations in `src/i18n/resources/` when user-facing strings changed, and make sure they are real target-language strings rather than English placeholders.
8. Move any ongoing changelog items into a new section for the release version, leaving an empty `Unreleased` section at the top if that convention has been introduced.
9. Update `manifest.json`, `package.json`, `package-lock.json`, and `versions.json`.
10. Commit changes as `release <VERSION NUMBER>`.
11. Tag the commit with the version number only. Do not use a `v` prefix.
