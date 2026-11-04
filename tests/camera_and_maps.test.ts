import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { generateMap } from '../packages/shared/src/simulation/mapGenerator.js';
import { GridPathfinder } from '../packages/shared/src/simulation/pathfinding.js';
import { CameraController } from '../apps/client/src/camera/cameraController.js';

describe('Rise of Nations Map Sizes & Generation', () => {
  const ronMapSizes = [
    { name: 'Arena', size: 200, players: 2 },
    { name: 'Small', size: 240, players: 3 },
    { name: 'Standard', size: 280, players: 4 },
    { name: 'Large', size: 320, players: 6 },
    { name: 'Huge', size: 360, players: 8 },
    { name: 'Big Huge', size: 400, players: 8 }
  ];

  ronMapSizes.forEach(({ name, size, players }) => {
    it(`generates ${name} map with exact Rise of Nations dimensions (${size}×${size} tiles)`, () => {
      const map = generateMap('green_frontier', size, 12345, players);
      expect(map.width).toBe(size);
      expect(map.height).toBe(size);
      expect(map.tiles.length).toBe(size * size);
      expect(map.startPositions.length).toBe(players);
      expect(map.resourceNodes.length).toBeGreaterThan(0);

      // Verify all player start positions are strictly within the playable map boundaries
      map.startPositions.forEach(pos => {
        expect(pos.x).toBeGreaterThan(15);
        expect(pos.x).toBeLessThan(size - 15);
        expect(pos.y).toBeGreaterThan(15);
        expect(pos.y).toBeLessThan(size - 15);
      });
    });
  });
});

describe('Camera Movement & Full Map Boundary Navigation', () => {
  const mapWidth = 240;
  const mapHeight = 240;

  function createTestCamera(): { camera: THREE.PerspectiveCamera; controller: CameraController } {
    const camera = new THREE.PerspectiveCamera(45, 1920 / 1080, 0.5, 500);
    const controller = new CameraController(camera, mapWidth, mapHeight);
    return { camera, controller };
  }

  it('centers initially on the center of the map', () => {
    const { controller } = createTestCamera();
    expect(controller.target.x).toBe(mapWidth / 2);
    expect(controller.target.z).toBe(mapHeight / 2);
  });

  it('allows camera to navigate all the way to (0, 0) top-left map boundary without going negative', () => {
    const { controller } = createTestCamera();
    controller.jumpTo(-500, -500); // Try navigating past top-left boundary

    expect(controller.target.x).toBe(0);
    expect(controller.target.z).toBe(0);
  });

  it('allows camera to navigate all the way to (mapWidth, mapHeight) bottom-right boundary without exceeding map size', () => {
    const { controller } = createTestCamera();
    controller.jumpTo(9999, 9999); // Try navigating past bottom-right boundary

    expect(controller.target.x).toBe(mapWidth);
    expect(controller.target.z).toBe(mapHeight);
  });

  it('allows camera to jump to any internal map coordinate (e.g. edge settlements and resources)', () => {
    const { controller } = createTestCamera();

    controller.jumpTo(5, 5);
    expect(controller.target.x).toBe(5);
    expect(controller.target.z).toBe(5);

    controller.jumpTo(235, 235);
    expect(controller.target.x).toBe(235);
    expect(controller.target.z).toBe(235);

    controller.jumpTo(120, 10);
    expect(controller.target.x).toBe(120);
    expect(controller.target.z).toBe(10);
  });

  it('clamps zoom distance within allowable RTS zoom range', () => {
    const { controller } = createTestCamera();

    // Try setting zoom to extreme values
    (controller as any).zoomDistance = 500;
    controller.clampCameraToMap();
    expect((controller as any).zoomDistance).toBeLessThanOrEqual(95);

    (controller as any).zoomDistance = 2;
    controller.clampCameraToMap();
    expect((controller as any).zoomDistance).toBeGreaterThanOrEqual(16);
  });

  it('preserves camera zoom and allows native scroll when wheel events occur over UI elements', () => {
    let wheelHandler: ((e: any) => void) | null = null;
    const fakeWindow = {
      addEventListener: (evt: string, handler: any) => {
        if (evt === 'wheel') wheelHandler = handler;
      },
      removeEventListener: () => {},
      getComputedStyle: () => ({ overflowY: 'visible' })
    };
    (globalThis as any).window = fakeWindow;
    (globalThis as any).Element = class Element {};
    (globalThis as any).HTMLElement = class HTMLElement extends (globalThis as any).Element {};

    const camera = new THREE.PerspectiveCamera(45, 1920 / 1080, 0.5, 500);
    const controller = new CameraController(camera, 240, 240);
    const initialZoom = (controller as any).zoomDistance;

    expect(wheelHandler).not.toBeNull();

    // 1. Wheel event over a UI modal backdrop / scroll pane
    let prevented = false;
    class MockUiElement extends (globalThis as any).HTMLElement {
      closest(sel: string) {
        return sel.includes('.aoe-scroll-pane') ? this : null;
      }
    }
    const mockTarget = new MockUiElement();
    wheelHandler!({
      target: mockTarget,
      deltaY: 100,
      preventDefault: () => { prevented = true; },
      composedPath: () => [mockTarget]
    });

    expect(prevented).toBe(false);
    expect((controller as any).zoomDistance).toBe(initialZoom);

    // 2. Wheel event over game canvas (not UI) should zoom camera
    const mockCanvas = new (globalThis as any).HTMLElement();
    mockCanvas.closest = () => null;
    wheelHandler!({
      target: mockCanvas,
      deltaY: 100,
      preventDefault: () => { prevented = true; },
      composedPath: () => [mockCanvas]
    });

    expect(prevented).toBe(true);
    expect((controller as any).zoomDistance).not.toBe(initialZoom);
  });
});

describe('Age of Empires & Rise of Nations Unique Biomes', () => {
  const allMapTypes: ('green_frontier' | 'highland_kingdom' | 'riverlands' | 'desert_oasis' | 'black_forest')[] = [
    'green_frontier',
    'highland_kingdom',
    'riverlands',
    'desert_oasis',
    'black_forest'
  ];

  it('generates completely distinct tile signatures across each of the 5 map types', () => {
    const size = 200;
    const maps = allMapTypes.map(m => ({
      type: m,
      data: generateMap(m, size, 42, 2)
    }));

    // 1. Desert Oasis must be overwhelmingly sand-dominant with oasis water & palm forest
    const desert = maps.find(m => m.type === 'desert_oasis')!.data;
    const desertSandCount = desert.tiles.filter(t => t.terrain === 'sand').length;
    const desertWaterCount = desert.tiles.filter(t => t.terrain === 'water').length;
    const desertMountainCount = desert.tiles.filter(t => t.terrain === 'mountain').length;
    expect(desertSandCount).toBeGreaterThan(size * size * 0.5); // > 50% sand dunes & steppe
    expect(desertWaterCount).toBeGreaterThan(0); // central oasis
    expect(desertMountainCount).toBeGreaterThan(0); // canyon mesas

    // 2. Black Forest must have extremely dense labyrinthine woodlands
    const blackForest = maps.find(m => m.type === 'black_forest')!.data;
    const bfForestCount = blackForest.tiles.filter(t => t.terrain === 'forest').length;
    expect(bfForestCount).toBeGreaterThan(size * size * 0.35); // > 35% heavy woodland coverage

    // 3. Highland Kingdom must have prominent alpine summits & high elevation ridges
    const highland = maps.find(m => m.type === 'highland_kingdom')!.data;
    const alpineSummits = highland.tiles.filter(t => t.terrain === 'mountain' && t.elevation >= 2).length;
    expect(alpineSummits).toBeGreaterThan(50);

    // 4. Riverlands must feature a navigable central river system and sandbar crossing fords
    const riverlands = maps.find(m => m.type === 'riverlands')!.data;
    const riverWater = riverlands.tiles.filter(t => t.terrain === 'water').length;
    const riverFords = riverlands.tiles.filter(t => t.terrain === 'sand' && t.walkable).length;
    expect(riverWater).toBeGreaterThan(size);
    expect(riverFords).toBeGreaterThan(0);

    // 5. Green Frontier provides classic temperate rolling meadows
    const greenFrontier = maps.find(m => m.type === 'green_frontier')!.data;
    const grassCount = greenFrontier.tiles.filter(t => t.terrain === 'grass').length;
    expect(grassCount).toBeGreaterThan(size * size * 0.5);
  });

  it('guarantees open base clearance and starting resources for all players across all 5 map types', () => {
    const size = 200;
    allMapTypes.forEach(mapType => {
      const map = generateMap(mapType, size, 999, 4);
      expect(map.startPositions.length).toBe(4);

      map.startPositions.forEach(pos => {
        // Base tile must be walkable and 0 elevation
        const baseTile = map.tiles[pos.y * size + pos.x];
        expect(baseTile.walkable).toBe(true);
        expect(baseTile.elevation).toBe(0);

        // Immediate perimeter must be free of mountains or water
        for (let dy = -3; dy <= 3; dy++) {
          for (let dx = -3; dx <= 3; dx++) {
            const t = map.tiles[(pos.y + dy) * size + (pos.x + dx)];
            expect(t.terrain).not.toBe('mountain');
            expect(t.terrain).not.toBe('water');
          }
        }

        // Must have local starting food, wood, stone, and metal deposits nearby
        const nearbyNodes = map.resourceNodes.filter(n => Math.hypot(n.x - pos.x, n.y - pos.y) <= 8);
        const types = new Set(nearbyNodes.map(n => n.type));
        expect(types.has('food')).toBe(true);
        expect(types.has('wood')).toBe(true);
        expect(types.has('stone')).toBe(true);
        expect(types.has('metal')).toBe(true);
      });
    });
  });

  it('guarantees 100% path connectivity between all player spawns and to map center across all 5 biomes', () => {
    const size = 200;
    allMapTypes.forEach(mapType => {
      const map = generateMap(mapType, size, 42, 4);
      const walkableGrid = map.tiles.map(t => t.walkable);
      const pathfinder = new GridPathfinder(size, size, walkableGrid);

      const centerX = Math.floor(size / 2);
      const centerY = Math.floor(size / 2);

      map.startPositions.forEach((pos, idx) => {
        const pathToCenter = pathfinder.findPath(pos.x, pos.y, centerX, centerY);
        expect(pathToCenter.length, `${mapType} player ${idx} cannot reach map center`).toBeGreaterThan(0);

        const nextPos = map.startPositions[(idx + 1) % map.startPositions.length];
        const pathToNeighbor = pathfinder.findPath(pos.x, pos.y, nextPos.x, nextPos.y);
        expect(pathToNeighbor.length, `${mapType} player ${idx} cannot reach neighbor base`).toBeGreaterThan(0);
      });
    });
  });
});
