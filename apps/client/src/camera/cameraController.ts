import * as THREE from 'three';

export class CameraController {
  public camera: THREE.PerspectiveCamera;
  public target: THREE.Vector3;
  private zoomDistance: number = 45;
  private minZoom: number = 16;
  private maxZoom: number = 95;
  private mapWidth: number = 240;
  private mapHeight: number = 240;

  private keysDown: Set<string> = new Set();
  private mousePos: { x: number; y: number } = { x: 0, y: 0 };
  private edgePanEnabled: boolean = true;
  private panSpeed: number = 55; // units per second

  constructor(camera: THREE.PerspectiveCamera, mapWidth: number = 240, mapHeight: number = 240) {
    this.camera = camera;
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;
    this.target = new THREE.Vector3(mapWidth / 2, 0, mapHeight / 2);

    this.setupListeners();
    this.clampCameraToMap();
  }

  private setupListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('keydown', (e) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') {
        this.keysDown.clear();
        return;
      }
      this.keysDown.add(e.code);
    });

    window.addEventListener('keyup', (e) => {
      this.keysDown.delete(e.code);
    });

    window.addEventListener('mousemove', (e) => {
      this.mousePos.x = e.clientX;
      this.mousePos.y = e.clientY;
    });

    window.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 1.15 : 0.87;
      this.zoomDistance = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoomDistance * zoomFactor));
      this.clampCameraToMap();
    }, { passive: false });
  }

  public clearKeys(): void {
    this.keysDown.clear();
  }

  public setMapBounds(width: number, height: number): void {
    this.mapWidth = width;
    this.mapHeight = height;
    this.clampCameraToMap();
  }

  public jumpTo(x: number, z: number): void {
    this.target.x = x;
    this.target.z = z;
    this.clampCameraToMap();
  }

  /**
   * Clamps the camera target and zoom so that:
   * 1. The player can freely navigate through 100% of the map area all the way up to map boundaries.
   * 2. The camera focus smoothly stops right at the map boundaries [0, mapWidth] and [0, mapHeight].
   */
  public clampCameraToMap(): void {
    if (this.mapWidth <= 0 || this.mapHeight <= 0) return;

    if (typeof window !== 'undefined' && window.innerWidth > 0 && window.innerHeight > 0) {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    }

    // Clamp zoom distance
    this.zoomDistance = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoomDistance));

    // Clamp target so the player can reach all the way to 0 and mapWidth / mapHeight
    this.target.x = Math.max(0, Math.min(this.mapWidth, this.target.x));
    this.target.y = 0;
    this.target.z = Math.max(0, Math.min(this.mapHeight, this.target.z));

    this.updateCameraTransform();
  }

  public update(dt: number): void {
    let moveX = 0;
    let moveZ = 0;

    // Keyboard Pan (WASD / Arrows)
    if (this.keysDown.has('KeyW') || this.keysDown.has('ArrowUp')) moveZ -= 1;
    if (this.keysDown.has('KeyS') || this.keysDown.has('ArrowDown')) moveZ += 1;
    if (this.keysDown.has('KeyA') || this.keysDown.has('ArrowLeft')) moveX -= 1;
    if (this.keysDown.has('KeyD') || this.keysDown.has('ArrowRight')) moveX += 1;

    // Mouse Edge Pan (within 18px of screen boundaries)
    if (this.edgePanEnabled && typeof window !== 'undefined') {
      const edgeThreshold = 18;
      if (this.mousePos.x <= edgeThreshold) moveX -= 1;
      if (this.mousePos.x >= window.innerWidth - edgeThreshold) moveX += 1;
      if (this.mousePos.y <= edgeThreshold) moveZ -= 1;
      if (this.mousePos.y >= window.innerHeight - edgeThreshold) moveZ += 1;
    }

    if (moveX !== 0 || moveZ !== 0) {
      const len = Math.hypot(moveX, moveZ);
      const step = (this.panSpeed * (this.zoomDistance / 35)) * dt;
      // Screen space movement mapped to 45-degree isometric world axes
      const invSqrt2 = 0.70710678;
      const worldDx = (moveX + moveZ) * invSqrt2 * (step / len);
      const worldDz = (-moveX + moveZ) * invSqrt2 * (step / len);

      this.target.x += worldDx;
      this.target.z += worldDz;

      this.clampCameraToMap();
    }
  }

  private updateCameraTransform(): void {
    // Age of Empires authentic 2:1 isometric projection (~42 degrees pitch, 45 degrees azimuth)
    const pitchRad = (42 * Math.PI) / 180;
    const azimuthRad = (45 * Math.PI) / 180;
    const dXZ = Math.cos(pitchRad) * this.zoomDistance;
    const offsetY = Math.sin(pitchRad) * this.zoomDistance;
    const offsetX = Math.sin(azimuthRad) * dXZ;
    const offsetZ = Math.cos(azimuthRad) * dXZ;

    this.camera.position.set(this.target.x + offsetX, this.target.y + offsetY, this.target.z + offsetZ);
    this.camera.lookAt(this.target);
  }
}
