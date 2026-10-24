import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { generateMap } from '../packages/shared/src/simulation/mapGenerator.js';
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

describe('Camera Movement & Viewport Clamping (Map Bounding & Void Elimination)', () => {
  const mapWidth = 240;
  const mapHeight = 240;

  function createTestCamera(): { camera: THREE.PerspectiveCamera; controller: CameraController } {
    const camera = new THREE.PerspectiveCamera(45, 1920 / 1080, 0.5, 500);
    const controller = new CameraController(camera, mapWidth, mapHeight);
    return { camera, controller };
  }

  function getGroundViewport(camera: THREE.PerspectiveCamera): { minX: number; maxX: number; minZ: number; maxZ: number } {
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const raycaster = new THREE.Raycaster();
    const corners = [
      new THREE.Vector2(-1, -1),
      new THREE.Vector2(1, -1),
      new THREE.Vector2(-1, 1),
      new THREE.Vector2(1, 1)
    ];

    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const c of corners) {
      raycaster.setFromCamera(c, camera);
      const hit = new THREE.Vector3();
      raycaster.ray.intersectPlane(groundPlane, hit);
      if (hit.x < minX) minX = hit.x;
      if (hit.x > maxX) maxX = hit.x;
      if (hit.z < minZ) minZ = hit.z;
      if (hit.z > maxZ) maxZ = hit.z;
    }
    return { minX, maxX, minZ, maxZ };
  }

  it('ensures camera initial placement is strictly inside map boundaries', () => {
    const { camera, controller } = createTestCamera();
    const vp = getGroundViewport(camera);

    expect(vp.minX).toBeGreaterThanOrEqual(-0.01);
    expect(vp.maxX).toBeLessThanOrEqual(mapWidth + 0.01);
    expect(vp.minZ).toBeGreaterThanOrEqual(-0.01);
    expect(vp.maxZ).toBeLessThanOrEqual(mapHeight + 0.01);
  });

  it('strictly prevents panning past the top-left boundary (minX >= 0, minZ >= 0)', () => {
    const { camera, controller } = createTestCamera();
    controller.jumpTo(-500, -500); // Try jumping far outside into negative space
    const vp = getGroundViewport(camera);

    expect(vp.minX).toBeGreaterThanOrEqual(-0.01);
    expect(vp.minZ).toBeGreaterThanOrEqual(-0.01);
    expect(vp.maxX).toBeLessThanOrEqual(mapWidth + 0.01);
    expect(vp.maxZ).toBeLessThanOrEqual(mapHeight + 0.01);
  });

  it('strictly prevents panning past the bottom-right boundary (maxX <= mapWidth, maxZ <= mapHeight)', () => {
    const { camera, controller } = createTestCamera();
    controller.jumpTo(9999, 9999); // Try jumping far past the map edge
    const vp = getGroundViewport(camera);

    expect(vp.minX).toBeGreaterThanOrEqual(-0.01);
    expect(vp.minZ).toBeGreaterThanOrEqual(-0.01);
    expect(vp.maxX).toBeLessThanOrEqual(mapWidth + 0.01);
    expect(vp.maxZ).toBeLessThanOrEqual(mapHeight + 0.01);
  });

  it('clamps zoom distance so player can never zoom out beyond the map boundaries', () => {
    const { camera, controller } = createTestCamera();

    // Try setting zoom to extreme values
    (controller as any).zoomDistance = 500;
    controller.clampCameraToMap();

    const vp = getGroundViewport(camera);
    expect(vp.minX).toBeGreaterThanOrEqual(-0.01);
    expect(vp.maxX).toBeLessThanOrEqual(mapWidth + 0.01);
    expect(vp.minZ).toBeGreaterThanOrEqual(-0.01);
    expect(vp.maxZ).toBeLessThanOrEqual(mapHeight + 0.01);
  });
});
