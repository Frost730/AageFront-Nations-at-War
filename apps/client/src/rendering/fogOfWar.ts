import * as THREE from 'three';
import { UnitData, BuildingData } from '@agefront/shared';
import { UNIT_DEFINITIONS } from '@agefront/shared';
import { BUILDING_DEFINITIONS } from '@agefront/shared';

export class FogOfWar {
  public width: number;
  public height: number;
  public fogGrid: Uint8Array; // 0 = Unexplored, 1 = Explored, 2 = Visible
  public isRevealedAll: boolean = false;
  private myTeam: number;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private imgData: ImageData;
  private lastUpdateTime: number = 0;
  public texture: THREE.CanvasTexture;
  public mesh: THREE.Mesh;

  constructor(width: number, height: number, myTeam: number) {
    this.width = width;
    this.height = height;
    this.myTeam = myTeam;
    this.fogGrid = new Uint8Array(width * height); // initialized to 0 (Unexplored)

    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext('2d')!;
    this.imgData = this.ctx.createImageData(width, height);

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.minFilter = THREE.LinearFilter;

    // Overlay plane right above terrain
    const geom = new THREE.PlaneGeometry(width, height);
    geom.rotateX(-Math.PI / 2);
    geom.translate(width / 2, 0.25, height / 2);

    const mat = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      depthWrite: false
    });

    this.mesh = new THREE.Mesh(geom, mat);
  }

  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  public revealAll(): void {
    this.isRevealedAll = true;
    this.fogGrid.fill(2);
    const data = this.imgData.data;
    for (let i = 0; i < this.fogGrid.length; i++) {
      data[i * 4 + 3] = 0;
    }
    this.ctx.putImageData(this.imgData, 0, 0);
    this.texture.needsUpdate = true;
  }

  public updateVisibility(
    units: UnitData[],
    buildings: BuildingData[],
    myPlayerId: string,
    myTeam: number,
    hasCartography: boolean = false
  ): void {
    if (this.isRevealedAll) return;
    const now = performance.now();
    // Throttle fog re-computation and GPU texture upload to 12 FPS (every 80ms)
    // Saves massive CPU cycles and GPU texture bandwidth without any perceptible visual difference
    if (now - this.lastUpdateTime < 80) {
      return;
    }
    this.lastUpdateTime = now;

    this.myTeam = myTeam;

    // 1. Demote any previously Visible (2) to Explored (1)
    for (let i = 0; i < this.fogGrid.length; i++) {
      if (this.fogGrid[i] === 2) {
        this.fogGrid[i] = 1;
      }
    }

    const visionBonus = hasCartography ? 2 : 0;

    // 2. Mark visible around friendly units
    for (const u of units) {
      if (u.team === this.myTeam && u.state !== 'dead') {
        const udef = UNIT_DEFINITIONS[u.type];
        const range = (udef ? udef.visionRange : 7) + visionBonus;
        this.revealCircle(u.x, u.y, range);
      }
    }

    // 3. Mark visible around friendly buildings
    for (const b of buildings) {
      if (b.team === this.myTeam) {
        const bdef = BUILDING_DEFINITIONS[b.type];
        const range = (bdef ? bdef.visionRange : 8) + visionBonus;
        this.revealCircle(b.x + b.width / 2, b.y + b.height / 2, range);
      }
    }

    // 4. Update Fog Texture (reusing pre-allocated ImageData to eliminate GC churn)
    const data = this.imgData.data;

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const idx = y * this.width + x;
        const pixelIdx = idx * 4;
        const state = this.fogGrid[idx];

        if (state === 2) {
          // Visible: completely transparent
          data[pixelIdx + 3] = 0;
        } else if (state === 1) {
          // Explored: shaded semi-transparent shroud
          data[pixelIdx] = 10;
          data[pixelIdx + 1] = 15;
          data[pixelIdx + 2] = 25;
          data[pixelIdx + 3] = 175; // dimmed
        } else {
          // Unexplored: pitch black
          data[pixelIdx] = 5;
          data[pixelIdx + 1] = 8;
          data[pixelIdx + 2] = 17;
          data[pixelIdx + 3] = 255; // solid black
        }
      }
    }

    this.ctx.putImageData(this.imgData, 0, 0);
    this.texture.needsUpdate = true;
  }

  private revealCircle(cx: number, cy: number, radius: number): void {
    const minX = Math.max(0, Math.floor(cx - radius));
    const maxX = Math.min(this.width - 1, Math.ceil(cx + radius));
    const minY = Math.max(0, Math.floor(cy - radius));
    const maxY = Math.min(this.height - 1, Math.ceil(cy + radius));

    const r2 = radius * radius;
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy <= r2) {
          this.fogGrid[y * this.width + x] = 2; // Visible
        }
      }
    }
  }

  public isTileVisible(x: number, y: number): boolean {
    const tx = Math.floor(x);
    const ty = Math.floor(y);
    if (tx < 0 || tx >= this.width || ty < 0 || ty >= this.height) return false;
    return this.fogGrid[ty * this.width + tx] === 2;
  }

  public isTileExplored(x: number, y: number): boolean {
    const tx = Math.floor(x);
    const ty = Math.floor(y);
    if (tx < 0 || tx >= this.width || ty < 0 || ty >= this.height) return false;
    return this.fogGrid[ty * this.width + tx] >= 1;
  }
}
