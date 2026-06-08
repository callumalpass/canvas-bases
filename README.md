# Baseboard

Baseboard materializes an Obsidian Bases view as a JSON Canvas board.

Use Bases for the query, filters, grouping, and sorting, then use Baseboard to
create or update a `.canvas` snapshot from that current result set. The command
palette actions work from the active Bases view, including native table/card
views, third-party custom views, and Baseboard's own dedicated layout.

The plugin also adds a **Baseboard** layout to Bases when you want canvas
actions visible directly inside the Base view.

## Features

- Rows become Canvas file nodes.
- Bases grouping becomes Canvas group nodes.
- Bases sort order is preserved inside each group.
- The Baseboard layout renders a canvas-like board with draggable, resizable
  group frames and note nodes.
- Note cards show the visible properties selected in the Bases properties menu,
  using the same order as the Base view.
- Note cards include inline Markdown editors that save changes back to the note.
- The board supports zoom controls, fit/reset view actions, mouse-wheel zoom
  with the modifier key, and background-drag panning.
- Edited node coordinates and dimensions are written back to the Base view
  config and reused when materializing the canvas.
- Optional edges can be generated from wikilinks within the view, selected
  frontmatter properties, or both.
- The Baseboard board renders the same configured relationships as live Canvas
  edges while you work in the Base view.
- Regeneration uses stable Baseboard-owned IDs so existing node positions can be
  preserved.
- Manual, non-Baseboard Canvas nodes are kept when updating an existing canvas.

## Usage

1. Create or open a `.base` file.
2. Open the Bases view you want to materialize.
3. Configure your Base filters, grouping, sorting, and visible properties as
   usual.
4. Run **Baseboard: Create canvas from current bases view** from the command
   palette.

For a persistent in-view workflow, add a view using the **Baseboard** layout and
use **Create canvas**, **Update canvas**, **Open canvas**, or **Reset layout**
from that view. Double-click a note node to open it. Drag note nodes or group
headers to record custom coordinates in the `.base` view. Drag the bottom-right
corner of a card or group frame to resize it. Edit note content directly in the
card; changes save when the editor loses focus. Configure **Edges** and **Link
properties** in the Base view options to show live relationships on the board and
materialize them into the linked canvas.

The generated canvas is a snapshot. The Base remains the source of truth.

## Development

```bash
npm install
npm run lint
npm test
npm run build:test
```

`npm run build:test` copies the plugin to the test vault plugin directory. Reload
it in the running Obsidian instance with:

```bash
obsidian vault=test plugin:reload id=baseboard
```
