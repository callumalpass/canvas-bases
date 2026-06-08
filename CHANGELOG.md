# Changelog

## 0.1.0

- Initial Baseboard prototype.
- Added command support for materializing the active native or third-party Bases
  view, not only the dedicated Baseboard layout.
- Reworked the Baseboard layout into a canvas-like view with draggable group
  frames and note nodes whose coordinates persist in the Base view config.
- Added bottom-right resize handles for Baseboard note cards and group frames.
- Added inline Markdown editing to Baseboard note cards.
- Added selected Bases properties to Baseboard note cards and improved card
  spacing around paths, metadata, editors, and the board edge.
- Added zoom controls, fit/reset view actions, modifier-wheel zoom, and
  background-drag panning to the Baseboard board.
- Added live relationship edges to the Baseboard board using the same wikilink
  and link-property configuration as canvas materialization.
- Fixed TaskNotes property chip styling so it follows TaskNotes field mappings
  instead of hardcoded Bases property names.
- Fixed Baseboard view materialization so the generated Canvas uses the live
  board coordinates instead of mixing them with stale positions from an
  existing Canvas file.
- Added grouped layout smoke coverage for column and row materialization.
