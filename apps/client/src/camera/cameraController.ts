import * as THREE from 'three';

export class CameraController {
  public camera: THREE.PerspectiveCamera;
  public target: THREE.Vector3;
  private zoomDistance: number = 45;
  private minZoom: number = 16;
  private maxZoom: number = 105;
  private mapWidth: number = 240;
  private mapHeight: number = 240;

  private keysDown: Set<string> = new Set();
  private mousePos: { x: number; y: number } = { x: 0, y: 0 };
  private edgePanEnabled: boolean = true;
  private panSpeed: number = 52; // units per second

  // Pre-allocated frustum calculation helpers to prevent GC allocations in render loop
  private groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private raycaster = new THREE.Raycaster();
  private ndcCorners = [
    new THREE.Vector2(-1, -1), // Bottom-Left
    new THREE.Vector2(1, -1),  // Bottom-Right
    new THREE.Vector2(-1, 1),  // Top-Left
    new THREE.Vector2(1, 1)    // Top-Right
  ];
  private tempHit = new THREE.Vector3();

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
   * Mathematically calculates the ground plane (y = 0) frustum footprint visible through the camera
   * and strictly constrains camera panning and zooming so that:
   * 1. Viewport left edge never scrolls past x = 0
   * 2. Viewport right edge never scrolls past x = mapWidth
   * 3. Viewport top edge never scrolls past z = 0
   * 4. Viewport bottom edge never scrolls past z = mapHeight
   * 5. The player NEVER sees the void outside of the map, only the game map!
   */
  public clampCameraToMap(): void {
    if (this.mapWidth <= 0 || this.mapHeight <= 0) return;

    if (typeof window !== 'undefined' && window.innerWidth > 0 && window.innerHeight > 0) {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    }

    const getGroundExtents = (zoom: number) => {
      const pitchRad = (55 * Math.PI) / 180;
      const offsetY = Math.sin(pitchRad) * zoom;
      const offsetZ = Math.cos(pitchRad) * zoom;

      this.camera.position.set(this.target.x, this.target.y + offsetY, this.target.z + offsetZ);
      this.camera.lookAt(this.target);
      this.camera.updateMatrixWorld();

      let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
      for (let i = 0; i < 4; i++) {
        this.raycaster.setFromCamera(this.ndcCorners[i], this.camera);
        if (this.raycaster.ray.intersectPlane(this.groundPlane, this.tempHit)) {
          if (this.tempHit.x < minX) minX = this.tempHit.x;
          if (this.tempHit.x > maxX) maxX = this.tempHit.x;
          if (this.tempHit.z < minZ) minZ = this.tempHit.z;
          if (this.tempHit.z > maxZ) maxZ = this.tempHit.z;
        }
      }
      return {
        width: maxX - minX,
        height: maxZ - minZ,
        halfSpanX: (maxX - minX) / 2,
        northSpanZ: Math.max(1, this.target.z - minZ),
        southSpanZ: Math.max(1, maxZ - this.target.z)
      };
    };

    // Prevent zoom distance from exceeding the map size
    let extents = getGroundExtents(this.zoomDistance);
    if (extents.width > this.mapWidth || extents.height > this.mapHeight) {
      const maxAllowedZoomW = this.zoomDistance * (this.mapWidth / Math.max(1, extents.width));
      const maxAllowedZoomH = this.zoomDistance * (this.mapHeight / Math.max(1, extents.height));
      const allowedMaxZoom = Math.min(maxAllowedZoomW, maxAllowedZoomH) * 0.995;
      this.zoomDistance = Math.max(this.minZoom, allowedMaxZoom);
      extents = getGroundExtents(this.zoomDistance);
    }

    // Clamp target coordinates so all 4 viewport corners remain strictly inside [0, mapWidth] and [0, mapHeight]
    const minTargetX = extents.halfSpanX;
    const maxTargetX = Math.max(minTargetX, this.mapWidth - extents.halfSpanX);

    const minTargetZ = extents.northSpanZ;
    const maxTargetZ = Math.max(minTargetZ, this.mapHeight - extents.southSpanZ);

    this.target.x = Math.max(minTargetX, Math.min(maxTargetX, this.target.x));
    this.target.y = 0;
    this.target.z = Math.max(minTargetZ, Math.min(maxTargetZ, this.target.z));

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
      this.target.x += (moveX / len) * step;
      this.target.z += (moveZ / len) * step;

      this.clampCameraToMap();
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
