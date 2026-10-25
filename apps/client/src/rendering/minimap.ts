import { MapTile, ResourceNodeData, UnitData, BuildingData } from '@agefront/shared';
import { FogOfWar } from './fogOfWar.js';

export class Minimap {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private terrainCanvas: HTMLCanvasElement;
  private width: number;
  private height: number;
  private mapWidth: number;
  private mapHeight: number;
  private tiles: MapTile[];
  private onNavigate: (x: number, y: number) => void;
  private isMouseDown: boolean = false;
  private lastRenderTime: number = 0;

  constructor(
    container: HTMLElement,
    mapWidth: number,
    mapHeight: number,
    tiles: MapTile[],
    onNavigate: (x: number, y: number) => void
  ) {
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;
    this.tiles = tiles;
    this.onNavigate = onNavigate;

    this.canvas = document.createElement('canvas');
    this.canvas.width = 190;
    this.canvas.height = 190;
    this.canvas.style.width = '190px';
    this.canvas.style.height = '190px';
    this.canvas.style.borderRadius = '50%';
    this.canvas.style.border = 'none';
    this.canvas.style.background = '#090d16';
    this.canvas.style.cursor = 'crosshair';

    this.width = this.canvas.width;
    this.height = this.canvas.height;
    this.ctx = this.canvas.getContext('2d')!;

    // Pre-render static terrain once to off-screen buffer to eliminate thousands of fillRect calls per frame
    this.terrainCanvas = document.createElement('canvas');
    this.terrainCanvas.width = this.width;
    this.terrainCanvas.height = this.height;
    const tCtx = this.terrainCanvas.getContext('2d')!;

    tCtx.fillStyle = '#090d16';
    tCtx.fillRect(0, 0, this.width, this.height);

    const scaleX = this.width / this.mapWidth;
    const scaleY = this.height / this.mapHeight;

    for (let ty = 0; ty < this.mapHeight; ty += 2) {
      for (let tx = 0; tx < this.mapWidth; tx += 2) {
        const idx = ty * this.mapWidth + tx;
        const tile = this.tiles[idx];
        if (!tile) continue;

        let color = '#2d5a27'; // grass
        if (tile.terrain === 'forest') color = '#193a1c';
        else if (tile.terrain === 'water') color = '#0284c7';
        else if (tile.terrain === 'mountain') color = (tile.elevation || 0) >= 2 ? '#e2e8f0' : '#475569';
        else if (tile.terrain === 'sand') color = '#d97706';

        tCtx.fillStyle = color;
        tCtx.fillRect(tx * scaleX, ty * scaleY, scaleX * 2, scaleY * 2);
      }
    }

    container.appendChild(this.canvas);
    this.setupListeners();
  }

  private setupListeners(): void {
    const handleClick = (e: MouseEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      const normX = clickX / this.width;
      const normY = clickY / this.height;

      const worldX = normX * this.mapWidth;
      const worldZ = normY * this.mapHeight;

      this.onNavigate(worldX, worldZ);
    };

    this.canvas.addEventListener('mousedown', (e) => {
      this.isMouseDown = true;
      handleClick(e);
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isMouseDown) {
        handleClick(e);
      }
    });

    window.addEventListener('mouseup', () => {
      this.isMouseDown = false;
    });
  }

  public render(
    units: UnitData[],
    buildings: BuildingData[],
    resourceNodes: ResourceNodeData[],
    fog: FogOfWar,
    cameraTargetX: number,
    cameraTargetZ: number,
    myPlayerId: string,
    myTeam: number
  ): void {
    const now = performance.now();
    // Throttle minimap refresh to 20 FPS (every 50ms) to preserve main rendering throughput
    if (now - this.lastRenderTime < 45) {
      return;
    }
    this.lastRenderTime = now;

    // 1. Draw Pre-rendered Terrain Base
    this.ctx.drawImage(this.terrainCanvas, 0, 0);

    const scaleX = this.width / this.mapWidth;
    const scaleY = this.height / this.mapHeight;

    // 2. Draw Resource Deposits
    for (const res of resourceNodes) {
      if (res.amount <= 0) continue;
      if (!fog.isTileExplored(res.x, res.y)) continue;

      if (res.type === 'stone') this.ctx.fillStyle = '#94a3b8';
      else if (res.type === 'metal') this.ctx.fillStyle = '#fbbf24';
      else if (res.type === 'food') this.ctx.fillStyle = '#ef4444';
      else this.ctx.fillStyle = '#166534';

      this.ctx.fillRect(res.x * scaleX, res.y * scaleY, scaleX * 1.5, scaleY * 1.5);
    }

    // 3. Draw Buildings
    for (const b of buildings) {
      const isExplored = fog.isTileExplored(b.x + b.width / 2, b.y + b.height / 2);

      // Enemy buildings only visible if currently visible or explored
      if (b.team !== myTeam && !isExplored) continue;

      this.ctx.fillStyle = b.team === myTeam ? '#38bdf8' : '#ef4444';
      this.ctx.fillRect(b.x * scaleX, b.y * scaleY, b.width * scaleX, b.height * scaleY);
    }

    // 4. Draw Units
    for (const u of units) {
      if (u.state === 'dead') continue;
      const isVisible = fog.isTileVisible(u.x, u.y);

      // Enemy units only drawn if in visible line of sight
      if (u.team !== myTeam && !isVisible) continue;

      this.ctx.fillStyle = u.team === myTeam ? '#60a5fa' : '#f87171';
      this.ctx.beginPath();
      this.ctx.arc(u.x * scaleX, u.y * scaleY, 2, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // 5. Draw Fog Overlay smoothly via pre-rasterized fog canvas (Zero GPU readback stall!)
    this.ctx.drawImage(fog.getCanvas(), 0, 0, this.width, this.height);

    // 6. Draw Isometric Camera View Frustum (Trapezoid matching 3D perspective)
    const camCenterX = cameraTargetX * scaleX;
    const camCenterY = cameraTargetZ * scaleY;
    const nearW = 16 * scaleX;
    const farW = 28 * scaleX;
    const depth = 20 * scaleY;
    const bottomY = camCenterY + depth * 0.45;
    const topY = camCenterY - depth * 0.55;

    this.ctx.save();
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 1.6;
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    this.ctx.beginPath();
    this.ctx.moveTo(camCenterX - nearW / 2, bottomY);
    this.ctx.lineTo(camCenterX + nearW / 2, bottomY);
    this.ctx.lineTo(camCenterX + farW / 2, topY);
    this.ctx.lineTo(camCenterX - farW / 2, topY);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();
    this.ctx.restore();
  }
}
