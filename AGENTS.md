# AgeFront Nations at War - Engineering & Gameplay Rules

## 1. Production & Queuing System (AoE / RoN Fidelity)
- **FIFO Multi-Item Queues**: Each production building (Town Center, Barracks, Archery Range, Stable, Siege Workshop, Dragon Lair, Market, etc.) maintains a unified FIFO production queue capable of holding up to 15 items (units and research technologies).
- **Sequential Execution**: Only the head of the queue (index 0) consumes training/research time. Subsequent items wait in order.
- **Refund Invariant**: Cancelling any queued item at any index must refund 100% of its resource costs to the player immediately.
- **No Background Auto-Training/Auto-Research**: Never implement automatic background unit training or automatic tech research that consumes resources or occupies queue slots without explicit player command.
- **Scout Spawning**: Exactly one scout unit spawns at the start of a match. Do not auto-spawn or auto-queue additional scouts. Scouts must have an explicit "Auto-Explore" toggle button.

## 2. Terrain & Environmental Biomes (AoE / RoN Uniqueness)
- **Distinct Biome Identity**: Every map type (`green_frontier`, `highland_kingdom`, `riverlands`, `desert_oasis`, `black_forest`) must maintain its own unique terrain ground colors, procedural textures, water shaders, mountain geology, and native foliage tree species (e.g. Date Palms for Desert, Weeping Willows for Riverlands, Alpine Spruce for Highlands).
- **3D Mountain Geology & Shader Decoupling**: Ground terrain materials with `vertexColors: true` must decouple grass blade diffuse pigments from rock vertex colors using luminance modulation, preventing non-green biomes (red sandstone, basalt, terracotta) from being contaminated by green grass pigments. Elevation profiles and 3D rock meshes must instantiate biome-accurate geology (stepped mesas for Desert, sharp spires for Highlands, terraced bluffs for Riverlands, rounded domes for Black Forest).
- **Open Base Clearance Guarantee**: Every starting spawn location on all maps must guarantee a flat, open perimeter free from mountains or water bodies, with balanced starting resource nodes (food, wood, stone, metal).
- **Arterial Highway Guarantee**: Map generators must carve wide (8–10 tiles wide), unobstructed, walkable arterial highways connecting every player spawn to the map center, to neighbor bases, and across rivers via wide shallow sand fords.
- **Clustered Forest Groves**: Trees must spawn in compact organic clumps leaving generous open traversal corridors, never as scattered 1x1 obstacles that create diagonal corner-blocking traps.

## 3. Large Map Scalability & Performance
- **Scalable Resource Node Indexing**: Never pre-allocate tens of thousands of background aesthetic objects (like trees) into flat arrays that are linearly scanned or added as individual Three.js scene meshes.
- **On-Demand Wood Generation**: Global `map.resourceNodes` is reserved for harvestable resource clusters (~200–500 total). Harvesting any other tree anywhere on the map is handled on-demand by dynamic node instantiation.
- **Efficient Hub Computations**: Precomputations (desire lines, trampled earth) must filter to settlement hub nodes (~50–80 items) to prevent O(N²) or O(Vertices × N) loops from stalling the main thread on large map sizes (up to 400×400).

## 4. UI & Modal Layout Standards
- **Single Close Button**: Never render duplicate or overlapping close buttons on modal windows (e.g. Codex, Skirmish setup, Tribute dialogs).
- **Scroll Containment**: Scrollable panels must set `overflow-y: auto`, `max-height: calc(100vh - ...)`, and stop wheel/touch event propagation (`e.stopPropagation()`) to prevent scrolling events from propagating to the 3D canvas camera zoom/pan controls.

## 5. Simulation & Network Security
- **XSS Prevention**: Never interpolate unescaped player names, room codes, or chat strings into innerHTML strings. Always use `escapeHtml()` or `textContent`.
- **Command Validation**: All commands in `simulationEngine.processCommand` must validate:
  - `unitIds` is an Array and capped to <= 200 items.
  - Coordinate targets (`target.x`, `target.y`) are finite numbers clamped within map dimensions.
  - Resource trades (`TRADE_COMMODITY`) strictly verify that the player owns an operational Market building and that trade ratios are valid.
- **Rate-Limiting & Memory Safety**: Limit socket command frequency, prune empty/abandoned rooms, and cap player/AI counts per room to 8.
