import { MapType, MapTile, ResourceNodeData, Vector2D } from '../types/game.js';

// Deterministic Pseudo-Random Generator (Mulberry32)
export class PRNG {
  private s: number;

  constructor(seed: number) {
    this.s = Math.floor(seed) || 123456789;
  }

  next(): number {
    let t = (this.s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  rangeInt(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }
}

export interface GeneratedMap {
  width: number;
  height: number;
  tiles: MapTile[];
  startPositions: Vector2D[];
  resourceNodes: ResourceNodeData[];
  mapType?: MapType;
}

export function generateMap(mapType: MapType, size: number = 240, seed: number = 42, numPlayers: number = 2): GeneratedMap {
  const prng = new PRNG(seed);
  const tiles: MapTile[] = [];

  // Initialize base terrain according to biome
  const defaultTerrain = mapType === 'desert_oasis' ? 'sand' : 'grass';
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      tiles.push({
        terrain: defaultTerrain,
        elevation: 0,
        walkable: true
      });
    }
  }

  const getTile = (x: number, y: number): MapTile | null => {
    if (x < 0 || x >= size || y < 0 || y >= size) return null;
    return tiles[y * size + x];
  };

  // Generate starting positions evenly on a circle/oval around center
  const startPositions: Vector2D[] = [];
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.35;

  for (let i = 0; i < numPlayers; i++) {
    const angle = (i * 2 * Math.PI) / numPlayers + (Math.PI / 4);
    const px = Math.floor(centerX + Math.cos(angle) * radius);
    const py = Math.floor(centerY + Math.sin(angle) * radius);
    startPositions.push({ x: px, y: py });
  }

  // Clear area around start positions so base building is never blocked
  const isNearStart = (x: number, y: number, dist: number = 14): boolean => {
    return startPositions.some(p => {
      const dx = p.x - x;
      const dy = p.y - y;
      return Math.sqrt(dx * dx + dy * dy) < dist;
    });
  };

  // Map type specific feature placement
  if (mapType === 'green_frontier') {
    // Rolling hills, scattered forests, gentle ponds, and majestic perimeter mountain ridges
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (isNearStart(x, y, 14)) continue;

        const noise1 = Math.sin(x * 0.1) + Math.cos(y * 0.1);
        const noise2 = Math.sin(x * 0.25 + 1.2) * Math.cos(y * 0.25 - 0.5);
        const combined = noise1 + noise2;

        const tile = getTile(x, y)!;
        if (combined > 1.75) {
          tile.terrain = 'mountain';
          tile.elevation = 2;
          tile.walkable = false;
        } else if (combined > 1.25) {
          tile.terrain = 'forest';
          tile.walkable = false;
        } else if (combined < -1.7) {
          tile.terrain = 'water';
          tile.walkable = false;
        } else if (combined > 0.75) {
          tile.elevation = 1;
        }
      }
    }
  } else if (mapType === 'highland_kingdom') {
    // High mountain massifs, towering snowy peaks, narrow strategic valleys
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (isNearStart(x, y, 14)) continue;

        const noiseRidge = Math.abs(Math.sin(x * 0.08 + y * 0.05) + Math.cos(x * 0.05 - y * 0.08));
        const tile = getTile(x, y)!;

        if (noiseRidge > 1.65) {
          tile.terrain = 'mountain';
          tile.elevation = 3;
          tile.walkable = false;
        } else if (noiseRidge > 1.35) {
          tile.terrain = 'mountain';
          tile.elevation = 2;
          tile.walkable = false;
        } else if (noiseRidge > 1.05) {
          tile.elevation = 1;
          if (prng.next() < 0.22) {
            tile.terrain = 'forest';
            tile.walkable = false;
          }
        }
      }
    }
  } else if (mapType === 'riverlands') {
    // River cutting across the center with bridges/shallows and overlooking cliff bluffs
    const riverWidth = 3;
    const riverY = (x: number) => Math.floor(centerY + Math.sin(x * 0.1) * 8);

    // Crossing fords
    const fordLocations = [Math.floor(size * 0.25), Math.floor(size * 0.5), Math.floor(size * 0.75)];

    for (let x = 0; x < size; x++) {
      const ry = riverY(x);
      const isFord = fordLocations.some(fx => Math.abs(fx - x) <= 2);

      for (let dy = -riverWidth; dy <= riverWidth; dy++) {
        const y = ry + dy;
        if (isNearStart(x, y, 14)) continue;
        const tile = getTile(x, y);
        if (!tile) continue;

        if (isFord) {
          tile.terrain = 'sand';
          tile.walkable = true; // walkable shallow ford
        } else {
          tile.terrain = 'water';
          tile.walkable = false;
        }
      }
    }

    // Mountain bluffs along valley edges and dense forests
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (isNearStart(x, y, 14)) continue;
        const tile = getTile(x, y)!;
        if (tile.terrain === 'water' || tile.terrain === 'sand') continue;

        const distFromCenter = Math.abs(y - centerY);
        if (distFromCenter > size * 0.38) {
          const bluffNoise = Math.sin(x * 0.16) + Math.cos(y * 0.18);
          if (bluffNoise > 0.65) {
            tile.terrain = 'mountain';
            tile.elevation = 2;
            tile.walkable = false;
            continue;
          }
        }

        if (prng.next() < 0.14) {
          tile.terrain = 'forest';
          tile.walkable = false;
        }
      }
    }
  } else if (mapType === 'desert_oasis') {
    // Arid golden dunes, sandstone canyon mesas, and a lush fertile central oasis
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (isNearStart(x, y, 14)) continue;

        const tile = getTile(x, y)!;
        const dx = x - centerX;
        const dy = y - centerY;
        const distFromCenter = Math.sqrt(dx * dx + dy * dy);

        // Central Oasis
        if (distFromCenter < size * 0.13) {
          if (distFromCenter < size * 0.05) {
            tile.terrain = 'water';
            tile.walkable = false;
          } else if (distFromCenter < size * 0.085) {
            tile.terrain = 'grass';
            tile.walkable = true;
          } else {
            tile.terrain = 'forest'; // Lush date palm ring around oasis
            tile.walkable = false;
          }
          continue;
        }

        // Sandstone Canyon Mesas and Dunes
        const duneNoise = Math.sin(x * 0.08 + y * 0.04) * Math.cos(x * 0.04 - y * 0.08);
        const mesaNoise = Math.abs(Math.sin(x * 0.11 + 0.5) * Math.sin(y * 0.11 - 0.5));

        if (mesaNoise > 0.72) {
          // Towering Sandstone Canyon Mesa / Butte
          tile.terrain = 'mountain';
          tile.elevation = 2;
          tile.walkable = false;
        } else if (mesaNoise > 0.58) {
          tile.terrain = 'mountain';
          tile.elevation = 1;
          tile.walkable = false;
        } else if (duneNoise > 0.42) {
          // Rolling golden sand dunes
          tile.terrain = 'sand';
          tile.elevation = 1;
        } else if (duneNoise < -0.58 && prng.next() < 0.22) {
          // Secondary desert watering holes
          tile.terrain = 'water';
          tile.walkable = false;
        } else if (prng.next() < 0.11) {
          // Isolated desert acacia clusters
          tile.terrain = 'forest';
          tile.walkable = false;
        } else {
          // Default arid steppe sand
          tile.terrain = 'sand';
          tile.elevation = 0;
        }
      }
    }
  } else if (mapType === 'black_forest') {
    // Dense primordial woodland with labyrinthine corridors and narrow chokepoints (AoE II style)
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (isNearStart(x, y, 14)) continue;

        const tile = getTile(x, y)!;

        // Heavy multi-octave cellular forest noise
        const n1 = Math.sin(x * 0.14) * Math.cos(y * 0.14);
        const n2 = Math.sin(x * 0.28 + 1.4) * Math.cos(y * 0.28 - 0.8) * 0.5;
        const corridorNoise = n1 + n2;

        // Ancient granite crags embedded in forest
        const cragNoise = Math.sin(x * 0.09 + 2.1) + Math.cos(y * 0.09 - 1.7);

        if (cragNoise > 1.6) {
          tile.terrain = 'mountain';
          tile.elevation = 2;
          tile.walkable = false;
        } else if (corridorNoise > -0.18) {
          // Heavy dense conifer forest
          tile.terrain = 'forest';
          tile.walkable = false;
        } else if (corridorNoise < -0.85 && prng.next() < 0.28) {
          // Dark forest pond
          tile.terrain = 'water';
          tile.walkable = false;
        } else {
          // Cleared winding forest pathway / glade
          tile.terrain = 'grass';
          tile.walkable = true;
          if (prng.next() < 0.08) {
            tile.elevation = 1;
          }
        }
      }
    }
  }

  // Explicit Open Plains Guarantee: Ensure generous flat open ground (no mountain, no water, 0 elevation) around every player/AI spawn
  startPositions.forEach(pos => {
    for (let dy = -14; dy <= 14; dy++) {
      for (let dx = -14; dx <= 14; dx++) {
        if (dx * dx + dy * dy <= 196) {
          const tile = getTile(pos.x + dx, pos.y + dy);
          if (tile) {
            tile.terrain = mapType === 'desert_oasis' ? 'sand' : 'grass';
            tile.elevation = 0;
            tile.walkable = true;
          }
        }
      }
    }
  });

  // Populate Resource Nodes:
  // 1. Guaranteed balanced starting resources around each player
  // 2. Map-wide distributed resource deposits
  const resourceNodes: ResourceNodeData[] = [];
  let nodeIdCounter = 1;

  const createNode = (type: 'food' | 'wood' | 'stone' | 'metal', x: number, y: number, amount: number) => {
    // Ensure tile is walkable so workers can reach it
    const tile = getTile(x, y);
    if (tile) {
      if (type === 'wood') {
        tile.terrain = 'forest';
        tile.walkable = false; // trees can be harvested from adjacent tile
      } else {
        tile.walkable = true;
      }
    }
    resourceNodes.push({
      id: `res_${nodeIdCounter++}`,
      type,
      x,
      y,
      amount,
      maxAmount: amount
    });
  };

  // Starting resources for each player
  startPositions.forEach(pos => {
    // Food bushes / fields nearby
    createNode('food', pos.x + 4, pos.y + 1, 1200);
    createNode('food', pos.x + 4, pos.y - 1, 1200);

    // Rich local timber grove (6 trees)
    createNode('wood', pos.x - 4, pos.y + 3, 1500);
    createNode('wood', pos.x - 5, pos.y + 3, 1500);
    createNode('wood', pos.x - 4, pos.y + 4, 1500);
    createNode('wood', pos.x - 5, pos.y + 4, 1500);
    createNode('wood', pos.x - 3, pos.y + 3, 1500);
    createNode('wood', pos.x - 3, pos.y + 4, 1500);

    // Stone quarries nearby (2 rich deposits)
    createNode('stone', pos.x + 2, pos.y - 5, 2500);
    createNode('stone', pos.x + 3, pos.y - 5, 2500);

    // Metal deposits nearby (2 rich veins)
    createNode('metal', pos.x - 3, pos.y - 5, 2500);
    createNode('metal', pos.x - 4, pos.y - 5, 2500);
  });

  // Distributed neutral resources across the map
  const numNeutralClusters = Math.floor(size * 0.5);
  for (let c = 0; c < numNeutralClusters; c++) {
    const rx = prng.rangeInt(6, size - 7);
    const ry = prng.rangeInt(6, size - 7);

    // Avoid player start clusters
    if (isNearStart(rx, ry, 10)) continue;
    const tile = getTile(rx, ry);
    if (!tile || tile.terrain === 'water') continue;

    const resType = prng.next();
    if (resType < 0.4) {
      // Stone deposit cluster
      createNode('stone', rx, ry, 2500);
      createNode('stone', rx + 1, ry, 2500);
      if (prng.next() < 0.5) createNode('stone', rx, ry + 1, 2500);
    } else if (resType < 0.8) {
      // Metal vein cluster
      createNode('metal', rx, ry, 2500);
      createNode('metal', rx, ry + 1, 2500);
      if (prng.next() < 0.5) createNode('metal', rx + 1, ry, 2500);
    } else {
      // Wild fertile fruit / oasis groves
      createNode('food', rx, ry, 1500);
      createNode('food', rx + 1, ry, 1500);
    }
  }

  // Ensure EVERY procedural forest tile on the map is a harvestable wood resource node!
  const nodeOccupied = new Set<string>();
  resourceNodes.forEach(n => nodeOccupied.add(`${n.x},${n.y}`));

  tiles.forEach((t, idx) => {
    if (t.terrain === 'forest') {
      const tx = idx % size;
      const ty = Math.floor(idx / size);
      const key = `${tx},${ty}`;
      if (!nodeOccupied.has(key)) {
        nodeOccupied.add(key);
        resourceNodes.push({
          id: `res_wood_${tx}_${ty}`,
          type: 'wood',
          x: tx,
          y: ty,
          amount: 1500,
          maxAmount: 1500
        });
      }
    }
  });

  return {
    width: size,
    height: size,
    tiles,
    startPositions,
    resourceNodes,
    mapType
  };
}
