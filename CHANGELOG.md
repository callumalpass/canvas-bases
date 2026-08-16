# Changelog

## Unreleased

## 0.1.4 - 2026-08-16

- (#17) Restored single-finger board panning on touch devices without triggering
  the marquee-selection menu. Thanks to @alwarez777 for reporting this.
- (#13) Made new Canvas Bases views inherit the configured global layout, edge,
  card, TaskNotes, and update-rule defaults. Thanks to @alwarez777 for reporting
  this.
- (#18) Added **Create note** to the board context menu. The Obsidian Bases note
  creation flow applies compatible properties from the current Base filters so
  the new note can appear in the view. Thanks to @bangbangbanggit for suggesting
  this.
- Raised the minimum supported Obsidian version to 1.10.2 for the official
  filter-aware Bases note creation API.

## 0.1.3 - 2026-08-07

- (#3, #6, #8) Kept the Canvas Bases toolbar in the view layout instead of opening
  it over the board. Narrow embedded views now use a compact, horizontally
  scrollable icon row so controls do not cover note cards, including when
  translated labels are longer. Thanks to @randomness42, @bepolymathe, and
  @UniqueClone for reporting this.
- Added the `canvas.card.create@1.0.0` action provider for granted compatible
  applications to add text or file cards to a Canvas.
- Published `canvas.drop@1.0.0` as a JSON-Schema-defined CloudEvent after notes
  are dropped into active groups. Canvas Bases now uses the interoperability
  bridge only for cross-application events and actions; its own TaskNotes zone
  behavior continues to use the TaskNotes API directly.
- (#5) Rendered image and PDF rows as read-only attachment cards instead of
  editable Markdown bodies, preventing binary files from being overwritten
  when a Canvas Bases card is saved. Thanks to @yumizyg and @microsloppy for
  reporting this.
- Updated the bundled interoperability dependency to include its current URI
  validation security fixes.
- Added black-box interoperability checks for the Canvas action provider and
  two-subscriber event delivery.

## 0.1.2 - 2026-06-09

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
