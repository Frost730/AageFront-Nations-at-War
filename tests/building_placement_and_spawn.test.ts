import { describe, it, expect } from 'vitest';
import { SimulationEngine } from '../packages/shared/src/simulation/simulationEngine.js';
import { generateMap } from '../packages/shared/src/simulation/mapGenerator.js';
import { BUILDING_DEFINITIONS } from '../packages/shared/src/constants/buildings.js';

describe('Building Clearance Gap & Open-Terrain AI Bot Spawning', () => {
  it('guarantees all starting spawn bases are in open, flat terrain free from mountains or water', () => {
    const mapTypes = ['green_frontier', 'highland_kingdom', 'riverlands'] as const;

    for (const mapType of mapTypes) {
      const map = generateMap(mapType, 160, 42, 4);

      map.startPositions.forEach((pos) => {
        // Across the entire 12-tile radius starting base perimeter:
        // Must NEVER contain impassable mountain peaks, ridges, or water bodies
        for (let dy = -12; dy <= 12; dy++) {
          for (let dx = -12; dx <= 12; dx++) {
            if (dx * dx + dy * dy <= 144) {
              const tx = pos.x + dx;
              const ty = pos.y + dy;
              if (tx >= 0 && tx < map.width && ty >= 0 && ty < map.height) {
                const tile = map.tiles[ty * map.width + tx];
                expect(tile.terrain).not.toBe('mountain');
                expect(tile.terrain).not.toBe('water');
                expect(tile.elevation).toBe(0);
              }
            }
          }
        }

        // The Town Centre construction site and immediate surrounding avenue must be 100% flat walkable grassland
        for (let dy = -1; dy <= 5; dy++) {
          for (let dx = -1; dx <= 5; dx++) {
            const tx = pos.x + dx;
            const ty = pos.y + dy;
            const tile = map.tiles[ty * map.width + tx];
            expect(tile.terrain).toBe('grass');
            expect(tile.elevation).toBe(0);
            expect(tile.walkable).toBe(true);
          }
        }
      });
    }
  });

  it('enforces mandatory clearance gap between buildings so structures cannot touch or clump', () => {
    const sim = new SimulationEngine(
      {
        mapType: 'green_frontier',
        mapSize: 100,
        seed: 42,
        victoryCondition: 'conquest',
        startingResources: 'high',
        sharedTeamEconomy: false,
        aiDifficulty: 'medium'
      },
      [
        { id: 'p1', name: 'Player', team: 1, civ: 'Solari Dominion', color: '#eab308', isAi: false },
        { id: 'p2', name: 'Bot', team: 2, civ: 'Ironvale Kingdom', color: '#dc2626', isAi: true }
      ]
    );

    const tc = Array.from(sim.buildings.values()).find(b => b.ownerId === 'p1' && b.type === 'town_centre')!;
    expect(tc).toBeDefined();

    // Town Centre is at [tc.x .. tc.x + 3, tc.y .. tc.y + 3]
    // 1. Placing a house directly touching the TC boundary (gap = 0) must be REJECTED
    const touchingRight = sim.isValidBuildingPlacement('house', tc.x + tc.width, tc.y, 1);
    expect(touchingRight).toBe(false);

    const touchingLeft = sim.isValidBuildingPlacement('house', tc.x - 2, tc.y, 1);
    expect(touchingLeft).toBe(false);

    const touchingBottom = sim.isValidBuildingPlacement('house', tc.x, tc.y + tc.height, 1);
    expect(touchingBottom).toBe(false);

    const touchingTop = sim.isValidBuildingPlacement('house', tc.x, tc.y - 2, 1);
    expect(touchingTop).toBe(false);

    // 2. Placing a house with proper 1-tile gap must be ACCEPTED
    const validSeparation = sim.isValidBuildingPlacement('house', tc.x + tc.width + 1, tc.y, 1);
    expect(validSeparation).toBe(true);

    // Build the house at proper gap
    const built = sim.processCommand('p1', {
      type: 'BUILD',
      buildingType: 'house',
      position: { x: tc.x + tc.width + 1, y: tc.y },
      unitIds: []
    });
    expect(built).toBe(true);

    // 3. Attempting to place another house directly touching the new house must also be REJECTED
    const houseX = tc.x + tc.width + 1;
    const houseY = tc.y;
    const houseTouching = sim.isValidBuildingPlacement('house', houseX + 2, houseY, 1);
    expect(houseTouching).toBe(false);

    // 4. Placing another house with >= 1 tile gap is ACCEPTED
    const houseWithGap = sim.isValidBuildingPlacement('house', houseX + 3, houseY, 1);
    expect(houseWithGap).toBe(true);
  });

  it('allows defensive walls and gates to connect seamlessly (gap = 0)', () => {
    const sim = new SimulationEngine(
      {
        mapType: 'green_frontier',
        mapSize: 100,
        seed: 42,
        victoryCondition: 'conquest',
        startingResources: 'high',
        sharedTeamEconomy: false,
        aiDifficulty: 'medium'
      },
      [
        { id: 'p1', name: 'Player', team: 1, civ: 'Solari Dominion', color: '#eab308', isAi: false }
      ]
    );

    // Place first wall section at (20, 20)
    const builtWall1 = sim.processCommand('p1', {
      type: 'BUILD',
      buildingType: 'wall',
      position: { x: 20, y: 20 },
      unitIds: []
    });
    expect(builtWall1).toBe(true);

    // Directly adjacent wall at (21, 20) (gap = 0) is permitted so defensive walls can connect
    const wallTouching = sim.isValidBuildingPlacement('wall', 21, 20, 1);
    expect(wallTouching).toBe(true);

    const builtWall2 = sim.processCommand('p1', {
      type: 'BUILD',
      buildingType: 'wall',
      position: { x: 21, y: 20 },
      unitIds: []
    });
    expect(builtWall2).toBe(true);

    // But a regular building (e.g. house) directly touching the wall must be REJECTED
    const houseTouchingWall = sim.isValidBuildingPlacement('house', 22, 20, 1);
    expect(houseTouchingWall).toBe(false);
  });

  it('AI bot searches and places buildings with proper clearance gap in open terrain', () => {
    const sim = new SimulationEngine(
      {
        mapType: 'highland_kingdom',
        mapSize: 120,
        seed: 7777,
        victoryCondition: 'conquest',
        startingResources: 'high',
        sharedTeamEconomy: false,
        aiDifficulty: 'hard'
      },
      [
        { id: 'p_bot', name: 'AI Overlord', team: 1, civ: 'Ironvale Kingdom', color: '#ef4444', isAi: true }
      ]
    );

    const botTc = Array.from(sim.buildings.values()).find(b => b.ownerId === 'p_bot' && b.type === 'town_centre')!;
    expect(botTc).toBeDefined();

    // Verify Town Centre is in open, flat terrain
    for (let dx = 0; dx < botTc.width; dx++) {
      for (let dy = 0; dy < botTc.height; dy++) {
        const tile = sim.mapData.tiles[(botTc.y + dy) * sim.mapData.width + (botTc.x + dx)];
        expect(tile.terrain).not.toBe('mountain');
        expect(tile.terrain).not.toBe('water');
      }
    }

    // AI bot locates placement spot for a barracks
    const barracksSpot = (sim as any).findBuildingPlacementSpot('barracks', botTc.x, botTc.y);
    expect(barracksSpot).toBeDefined();

    // Verify the found spot has appropriate clearance gap from the Town Centre
    const tcRight = botTc.x + botTc.width;
    const tcBottom = botTc.y + botTc.height;
    const barracksWidth = BUILDING_DEFINITIONS.barracks.width;
    const barracksHeight = BUILDING_DEFINITIONS.barracks.height;

    const gapX = Math.max(0, botTc.x - (barracksSpot.x + barracksWidth), barracksSpot.x - tcRight);
    const gapY = Math.max(0, botTc.y - (barracksSpot.y + barracksHeight), barracksSpot.y - tcBottom);
    expect(gapX >= 1 || gapY >= 1).toBe(true);

    // Verify the found spot is in open ground (no mountain, no water, low elevation)
    for (let dx = -1; dx < barracksWidth + 1; dx++) {
      for (let dy = -1; dy < barracksHeight + 1; dy++) {
        const tx = barracksSpot.x + dx;
        const ty = barracksSpot.y + dy;
        const tile = sim.mapData.tiles[ty * sim.mapData.width + tx];
        expect(tile.terrain).not.toBe('mountain');
        expect(tile.terrain).not.toBe('water');
        expect(tile.elevation).toBeLessThanOrEqual(1);
      }
    }
  });
});
