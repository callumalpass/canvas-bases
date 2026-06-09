# Changelog

## 0.1.0

- Initial Baseboard prototype.
- Added command support for materializing the active native or third-party Bases
  view, not only the dedicated Baseboard layout.
- Added first-install starter files with a Start Here note, a demo Baseboard
  view, linked demo notes, and a command to recreate them later.
- Increased the default generated node size so new boards and canvases have
  more room on first render.
- Reworked the Baseboard layout into a canvas-like view with draggable group
  frames and note nodes whose coordinates persist in the Base view config.
- Added edge and corner resize handles for Baseboard note cards and group frames.
- Added marquee selection for Baseboard cards, including creating a manual group
  around the selected cards.
- Added a blank-board context menu for adding pinned notes or text cards at the
  clicked location.
- Added inline Markdown editing to Baseboard note cards.
- Added debounced autosave for inline Markdown edits in Baseboard note cards.
- Added selected Bases properties to Baseboard note cards and improved card
  spacing around paths, metadata, editors, and the board edge.
- Added zoom controls, fit/reset view actions, modifier-wheel zoom, and
  background-drag panning to the Baseboard board.
- Added live relationship edges to the Baseboard board using the same wikilink
  and link-property configuration as canvas materialization.
- Added card-to-card link controls for creating TaskNotes dependency/project
  relationships and frontmatter property links from the Baseboard view.
- Added Canvas-style manual group frames that can be created, renamed, moved,
  resized, removed, and used with pinned notes in the Baseboard view.
- Changed TaskNotes project relationship wording and edges to show tasks as
  subtasks of their parent task, with edges running from subtask to parent.
- Fixed dependency edge removal so it uses the exact TaskNotes dependency
  reference stored on the blocked task.
- Fixed inline Markdown autosaves so body-only saves do not steal focus by
  re-rendering the board.
- Improved TaskNotes relationship edge refreshes by reading only the dependency
  and parent-task data Baseboard needs.
- Fixed Baseboard card actions so TaskNotes menus are requested only for
  recognized TaskNotes tasks and fall back cleanly when composed menu
  population is unavailable.
- Fixed TaskNotes property chip styling so it follows TaskNotes field mappings
  instead of hardcoded Bases property names.
- Fixed Baseboard view materialization so the generated Canvas uses the live
  board coordinates instead of mixing them with stale positions from an
  existing Canvas file.
- Added grouped layout smoke coverage for column and row materialization.
