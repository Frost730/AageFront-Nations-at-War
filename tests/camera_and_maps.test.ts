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
