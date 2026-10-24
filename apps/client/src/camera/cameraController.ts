import * as THREE from 'three';

export class CameraController {
  public camera: THREE.PerspectiveCamera;
  public target: THREE.Vector3;
  private zoomDistance: number = 38;
  private minZoom: number = 16;
  private maxZoom: number = 105;
  private mapWidth: number = 80;
  private mapHeight: number = 80;

  private keysDown: Set<string> = new Set();
  private mousePos: { x: number; y: number } = { x: 0, y: 0 };
  private edgePanEnabled: boolean = true;
  private panSpeed: number = 42; // units per second

  constructor(camera: THREE.PerspectiveCamera, mapWidth: number = 80, mapHeight: number = 80) {
    this.camera = camera;
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;
    this.target = new THREE.Vector3(mapWidth / 2, 0, mapHeight / 2);

    this.setupListeners();
    this.updateCameraTransform();
  }

  private setupListeners(): void {
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
      this.updateCameraTransform();
    }, { passive: false });
  }

  public clearKeys(): void {
    this.keysDown.clear();
  }

  public setMapBounds(width: number, height: number): void {
    this.mapWidth = width;
    this.mapHeight = height;
  }

  public jumpTo(x: number, z: number): void {
    this.target.x = Math.max(5, Math.min(this.mapWidth - 5, x));
    this.target.z = Math.max(5, Math.min(this.mapHeight - 5, z));
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

    // Mouse Edge Pan (within 15px of screen boundaries)
    if (this.edgePanEnabled) {
      const edgeThreshold = 18;
      if (this.mousePos.x <= edgeThreshold) moveX -= 1;
      if (this.mousePos.x >= window.innerWidth - edgeThreshold) moveX += 1;
      if (this.mousePos.y <= edgeThreshold) moveZ -= 1;
      if (this.mousePos.y >= window.innerHeight - edgeThreshold) moveZ += 1;
    }

    if (moveX !== 0 || moveZ !== 0) {
      const len = Math.hypot(moveX, moveZ);
      const step = (this.panSpeed * (this.zoomDistance / 35)) * dt;
      this.target.x += (moveX / len) * step;
      this.target.z += (moveZ / len) * step;

      // Clamp within map bounds
      this.target.x = Math.max(4, Math.min(this.mapWidth - 4, this.target.x));
      this.target.z = Math.max(4, Math.min(this.mapHeight - 4, this.target.z));

      this.updateCameraTransform();
    }
  }

  private updateCameraTransform(): void {
    // RTS classic isometric angle (~55 degrees pitch)
    const pitchRad = (55 * Math.PI) / 180;
    const offsetY = Math.sin(pitchRad) * this.zoomDistance;
    const offsetZ = Math.cos(pitchRad) * this.zoomDistance;

    this.camera.position.set(this.target.x, this.target.y + offsetY, this.target.z + offsetZ);
    this.camera.lookAt(this.target);
  }
}
