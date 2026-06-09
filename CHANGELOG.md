# Changelog

## 0.1.0

- Initial Canvas Bases prototype.
- Added command support for materializing the active native or third-party Bases
  view, not only the dedicated Canvas Bases layout.
- Added first-install starter files with a Start Here note, a demo Canvas Bases
  view, linked demo notes, and a command to recreate them later.
- Renamed the plugin, package, Bases layout type, config keys, docs, media, and
  starter files to Canvas Bases.
- Increased the default generated node size so new boards and canvases have
  more room on first render.
- Reworked the Canvas Bases layout into a canvas-like view with draggable group
  frames and note nodes whose coordinates persist in the Base view config.
- Added edge and corner resize handles for Canvas Bases note cards and group frames.
- Added color actions for Canvas Bases note and text cards, with saved colors
  carried into generated JSON Canvas nodes.
- Added marquee selection for Canvas Bases cards, including creating a manual group
  around the selected cards.
- Added a blank-board context menu for adding pinned notes or text cards at the
  clicked location.
- Added inline Markdown editing to Canvas Bases note cards.
- Added debounced autosave for inline Markdown edits in Canvas Bases note cards.
- Protected inline note editors from stale content when link or TaskNotes actions
  change the same note on disk.
- Added selected Bases properties to Canvas Bases note cards and improved card
  spacing around paths, metadata, editors, and the board edge.
- Added zoom controls, fit/reset view actions, modifier-wheel zoom, and
  background-drag panning to the Canvas Bases board.
- Lowered the Canvas Bases board zoom-out floor to 10% so larger boards can fit on
  screen.
- Fixed embedded Canvas Bases views so zooming out no longer shrinks the reserved
  board height below the board's 100% height.
- Added live relationship edges to the Canvas Bases board using the same wikilink
  and link-property configuration as canvas materialization.
- Added card-to-card link controls for creating TaskNotes dependency/project
  relationships and frontmatter property links from the Canvas Bases view.
- Improved card-to-card link drawing with edge-snapped previews, clearer target
  feedback, release hints, and a grouped link action menu.
- Added assignment zones that can be enabled from Bases group menus and update
  writable note or TaskNotes-backed properties when cards are dragged into them.
- Added custom assignment zones that can be drawn on the board, including the
  property, value, and color each zone applies.
- Added configurable zone drop actions for TaskNotes tasks, including complete,
  archive, time tracking, Pomodoro, and recurring occurrence actions.
- Added type-aware zone update rules so assignment zones can replace,
  append, append uniquely, remove, or clear values for scalar and list
  properties.
- Added zone property suggestions from the live Base, visible cards,
  vault property metadata, and writable TaskNotes fields while still allowing
  custom property names.
- Added Canvas-style manual group frames that can be created, renamed, moved,
  resized, removed, and used with pinned notes in the Canvas Bases view.
- Added an embedded Assignment zones starter view showing how to drag cards
  between status zones to update note frontmatter.
- Updated the Assignment zones starter view with a custom `Needs review` zone
  that writes a separate `review` property.
- Moved the starter `Needs review` zone lower and beside the assignment-zone
  instruction card.
- Reworked the Start Here starter note to introduce linked notes before the
  separate active-zones and grouping walkthrough.
- Spaced out the cards in the Getting Started starter view so the linked-note
  walkthrough opens with more room between cards.
- Removed the "What to try in this view" checklists from the Start Here starter
  note.
- Changed TaskNotes project relationship wording and edges to show tasks as
  subtasks of their parent task, with edges running from subtask to parent.
- Fixed dependency edge removal so it uses the exact TaskNotes dependency
  reference stored on the blocked task.
- Fixed manual group drawing so the selection rectangle aligns with the pointer
  and can create a group even when no cards are selected.
- Improved zone drag feedback by highlighting groups that will apply a
  property change when a card is dropped.
- Improved the assignment zone configuration modal with a live write preview,
  clearer rule grouping, friendlier property labels, and inline validation.
- Improved the zone configuration modal so the drop action is explicit and
  property write controls only appear for property update zones.
- Added an active time-tracking badge and card state for TaskNotes tasks with a
  running time entry.
- Changed assignment zones so enabling or configuring a zone no longer moves
  existing cards or updates cards already inside the zone.
- Changed generated Bases group frames so moved cards no longer cause the group
  frame to follow them automatically, and added a group action to fit the frame
  to its cards when needed.
- Changed ungrouped Canvas Bases views so the single implicit `All notes` result
  set lays cards directly on the board instead of drawing an automatic group
  frame.
- Fixed inline Markdown autosaves so body-only saves do not steal focus by
  re-rendering the board.
- Fixed note-card property and TaskNotes pills so they refresh after inline
  frontmatter edits without waiting for a full board rerender.
- Improved TaskNotes relationship edge refreshes by reading only the dependency
  and parent-task data Canvas Bases needs.
- Fixed Canvas Bases card actions so TaskNotes menus are requested only for
  recognized TaskNotes tasks and fall back cleanly when composed menu
  population is unavailable.
- Fixed TaskNotes property chip styling so it follows TaskNotes field mappings
  instead of hardcoded Bases property names.
- Fixed Canvas Bases view materialization so the generated Canvas uses the live
  board coordinates instead of mixing them with stale positions from an
  existing Canvas file.
- Added grouped layout smoke coverage for column and row materialization.
