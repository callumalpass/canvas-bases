# Changelog

## 0.1.2

- Registered Canvas Bases with the selected `mdbase-obsidian` runtime and emit
  versioned `canvas.drop` events after notes are dropped into active groups.
  Assignment-zone actions now dispatch through policy-enforced runtime action
  contracts first, with the direct TaskNotes API retained only as a compatibility
  fallback when the action contract is unavailable.
- Render image and PDF rows as read-only attachment cards instead of editable
  markdown bodies, preventing binary files from being overwritten when a Canvas
  Bases card is saved. Thanks to @yumizyg for reporting this in issue #5.
- Hardened release-review linting so unsafe TypeScript boundary access is caught
  before publication.
- Refreshed the README demo media and recording copy to use the Canvas Bases
  naming consistently.

## 0.1.1

- Added the MIT license file for the published plugin.
- Refined the plugin-directory description to avoid redundant wording.

## 0.1.0

- Initial release of Canvas Bases for live canvas-style Bases layouts and JSON
  Canvas materialization.
- Added the Canvas Bases layout for `.base` views, with draggable and resizable
  cards, zooming, panning, group frames, card colors, editable note bodies,
  manual notes, text cards, and linked Canvas settings stored in the Base view
  config.
- Added commands to create and update JSON Canvas files from the active Bases
  view, preserving manual Canvas content while keeping Canvas Bases-owned nodes
  and edges stable across updates.
- Added frontmatter relationship links, visible relationship edges, assignment
  zones, and optional TaskNotes-aware actions for task relationships and task
  state updates.
- Added starter files, localized UI strings, README documentation, and demo
  media for the first-run workflow.
