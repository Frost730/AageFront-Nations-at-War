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

function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.hypot(px - projX, py - projY);
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

  // Pre-calculate arterial travel corridors connecting every player spawn to center and neighbors
  const highwaySegments: { x1: number; y1: number; x2: number; y2: number }[] = [];
  startPositions.forEach((pos, i) => {
    // 1. Spoke road from base to map center
    highwaySegments.push({ x1: pos.x, y1: pos.y, x2: centerX, y2: centerY });
    // 2. Ring road connecting to next neighbor
    const nextPos = startPositions[(i + 1) % startPositions.length];
    highwaySegments.push({ x1: pos.x, y1: pos.y, x2: nextPos.x, y2: nextPos.y });
  });

  if (startPositions.length === 2) {
    highwaySegments.push({
      x1: startPositions[0].x,
      y1: startPositions[0].y,
      x2: startPositions[1].x,
      y2: startPositions[1].y
    });
  }

  const isOnArterialHighway = (x: number, y: number, corridorWidth: number = 4.5): boolean => {
    for (let s = 0; s < highwaySegments.length; s++) {
      const seg = highwaySegments[s];
      if (
        x < Math.min(seg.x1, seg.x2) - corridorWidth ||
        x > Math.max(seg.x1, seg.x2) + corridorWidth ||
        y < Math.min(seg.y1, seg.y2) - corridorWidth ||
        y > Math.max(seg.y1, seg.y2) + corridorWidth
      ) {
        continue;
      }
      if (distToSegment(x, y, seg.x1, seg.y1, seg.x2, seg.y2) < corridorWidth) {
        return true;
      }
    }
    return false;
  };

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
        } else if (combined < -1.75) {
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

        const n1 = Math.sin(x * 0.08 + 0.6) * Math.cos(y * 0.08 - 0.6);
        const n2 = Math.sin(x * 0.16 + y * 0.12) * 0.5;
        const alpineVal = n1 + n2;
        const tile = getTile(x, y)!;

        if (alpineVal > 0.85) {
          tile.terrain = 'mountain';
          tile.elevation = 3;
          tile.walkable = false;
        } else if (alpineVal > 0.56) {
          tile.terrain = 'mountain';
          tile.elevation = 2;
          tile.walkable = false;
        } else if (alpineVal > 0.25) {
          tile.elevation = 1;
        }
      }
    }
  } else if (mapType === 'riverlands') {
    // Grand Riverlands Waterway: Broad, majestic meandering river with sandbars, shallows, and lush riverbank groves
    const riverWidth = 7; // Grand 15-tile wide river corridor
    const riverY = (x: number) => Math.floor(centerY + Math.sin(x * 0.045) * 12 + Math.cos(x * 0.09) * 4);

    // Dedicated crossing fords evenly spaced across the entire river length
    const fordLocations = [
      Math.floor(size * 0.12),
      Math.floor(size * 0.28),
      Math.floor(size * 0.44),
      Math.floor(size * 0.58),
      Math.floor(size * 0.72),
      Math.floor(size * 0.88)
    ];

    for (let x = 0; x < size; x++) {
      const ry = riverY(x);
      const isFord = fordLocations.some(fx => Math.abs(fx - x) <= 4);

      for (let dy = -riverWidth; dy <= riverWidth; dy++) {
        const y = ry + dy;
        if (isNearStart(x, y, 14)) continue;
        const tile = getTile(x, y);
        if (!tile) continue;

        if (isFord || isOnArterialHighway(x, y, 5.0)) {
          tile.terrain = 'sand';
          tile.walkable = true; // walkable shallow ford
          tile.elevation = 0;
        } else if (Math.abs(dy) === riverWidth) {
          // Natural walkable sand shoreline along outer riverbanks
          tile.terrain = 'sand';
          tile.walkable = true;
          tile.elevation = 0;
        } else {
          tile.terrain = 'water';
          tile.walkable = false;
        }
      }
    }

    // Lush riverbank willow and cypress groves along northern and southern shores
    for (let x = 6; x < size - 6; x += 4) {
      const ry = riverY(x);
      const sides = [-1, 1];
      for (const side of sides) {
        if (prng.next() < 0.62) {
          const bankY = ry + side * (riverWidth + prng.rangeInt(1, 3));
          if (isNearStart(x, bankY, 14) || isOnArterialHighway(x, bankY, 5.0)) continue;
          const groveR = prng.rangeInt(2, 3);
          for (let gy = -groveR; gy <= groveR; gy++) {
            for (let gx = -groveR; gx <= groveR; gx++) {
              if (gx * gx + gy * gy <= groveR * groveR + 0.6) {
                const tx = x + gx;
                const ty = bankY + gy;
                if (isNearStart(tx, ty, 14) || isOnArterialHighway(tx, ty, 4.5)) continue;
                const t = getTile(tx, ty);
                if (t && t.terrain !== 'water' && t.terrain !== 'mountain') {
                  t.terrain = 'forest';
                  t.walkable = false;
                }
              }
            }
          }
        }
      }
    }

    // Mountain bluffs along outer valley edges (never blocking center river crossings)
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (isNearStart(x, y, 14)) continue;
        const tile = getTile(x, y)!;
        if (tile.terrain === 'water' || tile.terrain === 'sand') continue;

        const distFromCenter = Math.abs(y - centerY);
        if (distFromCenter > size * 0.38) {
          const bluffNoise = Math.sin(x * 0.16) + Math.cos(y * 0.18);
          if (bluffNoise > 0.72) {
            tile.terrain = 'mountain';
            tile.elevation = 2;
            tile.walkable = false;
          }
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

        // Central Oasis with 4 wide cardinal access avenues so entry is never blocked
        if (distFromCenter < size * 0.13) {
          const isCardinalAvenue = Math.abs(dx) < 6 || Math.abs(dy) < 6;
          if (isCardinalAvenue) {
            tile.terrain = 'sand';
            tile.elevation = 0;
            tile.walkable = true;
          } else if (distFromCenter < size * 0.05) {
            tile.terrain = 'water';
            tile.walkable = false;
          } else if (distFromCenter < size * 0.09) {
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
        const mesaNoise = Math.sin(x * 0.09) * Math.sin(y * 0.09) + Math.cos(x * 0.18 + 0.8) * Math.sin(y * 0.18 - 0.8) * 0.45;

        if (mesaNoise > 0.82) {
          // Towering Sandstone Canyon Mesa / Butte
          tile.terrain = 'mountain';
          tile.elevation = 2;
          tile.walkable = false;
        } else if (mesaNoise > 0.62) {
          tile.terrain = 'mountain';
          tile.elevation = 1;
          tile.walkable = false;
        } else if (duneNoise > 0.45) {
          // Rolling golden sand dunes
          tile.terrain = 'sand';
          tile.elevation = 1;
        } else if (duneNoise < -0.65 && prng.next() < 0.15) {
          // Secondary desert watering holes
          tile.terrain = 'water';
          tile.walkable = false;
        } else {
          // Default arid steppe sand
          tile.terrain = 'sand';
          tile.elevation = 0;
        }
      }
    }
  } else if (mapType === 'black_forest') {
    // Dense primordial woodland with grand central glade & arterial thoroughfares (AoE II style)
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (isNearStart(x, y, 16)) continue;

        const tile = getTile(x, y)!;
        const distFromCenter = Math.hypot(x - centerX, y - centerY);

        // Open grand central glade
        if (distFromCenter < size * 0.13) {
          tile.terrain = 'grass';
          tile.elevation = 0;
          tile.walkable = true;
          continue;
        }

        // Heavy multi-octave cellular forest noise
        const n1 = Math.sin(x * 0.13) * Math.cos(y * 0.13);
        const n2 = Math.sin(x * 0.26 + 1.2) * Math.cos(y * 0.26 - 0.7) * 0.45;
        const corridorNoise = n1 + n2;

        // Ancient granite crags embedded in forest
        const cragNoise = Math.sin(x * 0.09 + 2.1) + Math.cos(y * 0.09 - 1.7);

        if (cragNoise > 1.65) {
          tile.terrain = 'mountain';
          tile.elevation = 2;
          tile.walkable = false;
        } else if (corridorNoise > -0.05) {
          // Dense conifer forest wall
          tile.terrain = 'forest';
          tile.walkable = false;
        } else if (corridorNoise < -0.9 && prng.next() < 0.2) {
          // Dark forest pond
          tile.terrain = 'water';
          tile.walkable = false;
        } else {
          // Natural forest glade
          tile.terrain = 'grass';
          tile.walkable = true;
          if (prng.next() < 0.08) {
            tile.elevation = 1;
          }
        }
      }
    }
  }

  // Guaranteed Walkable Arterial Highways (RTS Highway Invariant)
  // Carves wide, unobstructed travel corridors between all player spawns and the map center
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (isOnArterialHighway(x, y, 4.5)) {
        const tile = getTile(x, y)!;
        if (tile.terrain === 'mountain') {
          tile.terrain = defaultTerrain;
          tile.elevation = 0;
          tile.walkable = true;
        } else if (tile.terrain === 'water') {
          tile.terrain = 'sand';
          tile.elevation = 0;
          tile.walkable = true;
        } else if (tile.terrain === 'forest') {
          tile.terrain = defaultTerrain;
          tile.walkable = true;
        }
      }
    }
  }

  // Clustered Forest Grove Placement (No scattered 1x1 tree deadlocks)
  // For non-Black Forest maps, place compact, natural tree groves leaving wide open plains
  if (mapType !== 'black_forest') {
    const numGroves = mapType === 'riverlands' ? Math.floor(size * 0.58) : Math.floor(size * 0.38);
    for (let g = 0; g < numGroves; g++) {
      const gx = prng.rangeInt(8, size - 9);
      const gy = prng.rangeInt(8, size - 9);
      if (isNearStart(gx, gy, 15) || isOnArterialHighway(gx, gy, 5.5)) continue;
      const gTile = getTile(gx, gy);
      if (!gTile || gTile.terrain === 'water' || gTile.terrain === 'mountain') continue;

      const groveRadius = prng.rangeInt(2, 4);
      for (let dy = -groveRadius; dy <= groveRadius; dy++) {
        for (let dx = -groveRadius; dx <= groveRadius; dx++) {
          const distSq = dx * dx + dy * dy;
          if (distSq <= groveRadius * groveRadius + prng.next() * 1.2) {
            const tx = gx + dx;
            const ty = gy + dy;
            if (isNearStart(tx, ty, 14) || isOnArterialHighway(tx, ty, 4.5)) continue;
            const t = getTile(tx, ty);
            if (t && t.terrain !== 'water' && t.terrain !== 'mountain') {
              t.terrain = 'forest';
              t.walkable = false;
            }
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

  // Populate rich harvestable timber stands in natural forest groves (scalable, high-performance distribution)
  const nodeOccupied = new Set<string>();
  resourceNodes.forEach(n => nodeOccupied.add(`${n.x},${n.y}`));

  const maxWildWoodNodes = Math.min(250, Math.floor(size * 0.8));
  let wildWoodCount = 0;
  const step = Math.max(3, Math.floor(size / 30));

  for (let y = 5; y < size - 5; y += step) {
    for (let x = 5; x < size - 5; x += step) {
      if (wildWoodCount >= maxWildWoodNodes) break;
      const tile = getTile(x, y);
      if (tile && tile.terrain === 'forest') {
        const key = `${x},${y}`;
        if (!nodeOccupied.has(key)) {
          nodeOccupied.add(key);
          resourceNodes.push({
            id: `res_wood_${x}_${y}`,
            type: 'wood',
            x: x,
            y: y,
            amount: 1500,
            maxAmount: 1500
          });
          wildWoodCount++;
        }
      }
    }
  }

  return {
    width: size,
    height: size,
    tiles,
    startPositions,
    resourceNodes,
    mapType
  };
}
