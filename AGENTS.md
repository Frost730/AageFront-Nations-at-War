# AgeFront Nations at War - Engineering & Gameplay Rules

## 1. Production & Queuing System (AoE / RoN Fidelity)
- **FIFO Multi-Item Queues**: Each production building (Town Center, Barracks, Archery Range, Stable, Siege Workshop, Dragon Lair, Market, etc.) maintains a unified FIFO production queue capable of holding up to 15 items (units and research technologies).
- **Sequential Execution**: Only the head of the queue (index 0) consumes training/research time. Subsequent items wait in order.
- **Refund Invariant**: Cancelling any queued item at any index must refund 100% of its resource costs to the player immediately.
- **No Background Auto-Training/Auto-Research**: Never implement automatic background unit training or automatic tech research that consumes resources or occupies queue slots without explicit player command.
- **Scout Spawning**: Exactly one scout unit spawns at the start of a match. Do not auto-spawn or auto-queue additional scouts. Scouts must have an explicit "Auto-Explore" toggle button.

## 2. Terrain & Environmental Biomes (AoE / RoN Uniqueness)
- **Distinct Biome Identity**: Every map type (`green_frontier`, `highland_kingdom`, `riverlands`, `desert_oasis`, `black_forest`) must maintain its own unique terrain ground colors, procedural textures, water shaders, mountain geology, and native foliage tree species (e.g. Date Palms for Desert, Weeping Willows for Riverlands, Alpine Spruce for Highlands).
- **Open Base Clearance Guarantee**: Every starting spawn location on all maps must guarantee a flat, open perimeter free from mountains or water bodies, with balanced starting resource nodes (food, wood, stone, metal).

## 3. UI & Modal Layout Standards
- **Single Close Button**: Never render duplicate or overlapping close buttons on modal windows (e.g. Codex, Skirmish setup, Tribute dialogs).
- **Scroll Containment**: Scrollable panels must set `overflow-y: auto`, `max-height: calc(100vh - ...)`, and stop wheel/touch event propagation (`e.stopPropagation()`) to prevent scrolling events from propagating to the 3D canvas camera zoom/pan controls.

## 4. Simulation & Network Security
- **XSS Prevention**: Never interpolate unescaped player names, room codes, or chat strings into innerHTML strings. Always use `escapeHtml()` or `textContent`.
- **Command Validation**: All commands in `simulationEngine.processCommand` must validate:
  - `unitIds` is an Array and capped to <= 200 items.
  - Coordinate targets (`target.x`, `target.y`) are finite numbers clamped within map dimensions.
  - Resource trades (`TRADE_COMMODITY`) strictly verify that the player owns an operational Market building and that trade ratios are valid.
- **Rate-Limiting & Memory Safety**: Limit socket command frequency, prune empty/abandoned rooms, and cap player/AI counts per room to 8.
