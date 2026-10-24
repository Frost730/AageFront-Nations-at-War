import * as THREE from 'three';
import {
  UnitData,
  BuildingData,
  ResourceNodeData,
  MapTile,
  BuildingType,
  BUILDING_DEFINITIONS,
  Vector2D
} from '@agefront/shared';
import { GameRenderer } from '../rendering/renderer.js';
import { SelectionManager } from './selectionManager.js';
import { soundManager } from '../audio/soundManager.js';

export interface CommandDispatcher {
  dispatchMove: (unitIds: string[], target: Vector2D) => void;
  dispatchAttack: (unitIds: string[], targetEntityId: string) => void;
  dispatchGather: (unitIds: string[], resourceNodeId: string) => void;
  dispatchBuild: (unitIds: string[], buildingType: BuildingType, position: Vector2D) => void;
  dispatchRepair: (unitIds: string[], buildingId: string) => void;
  dispatchSetRallyPoint: (buildingId: string, point: Vector2D, targetEntityId?: string, targetType?: 'ground' | 'resource' | 'building') => void;
}

export class InputHandler {
  private canvas: HTMLCanvasElement;
  private renderer: GameRenderer;
  private selection: SelectionManager;
  private dispatcher: CommandDispatcher;

  private mapWidth: number = 120;
  private mapHeight: number = 120;
  private mapTiles: MapTile[] | null = null;

  private isLeftDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private selectionBoxElem: HTMLElement;

  private placementBuildingType: BuildingType | null = null;
  public onPlacementChanged?: (type: BuildingType | null) => void;
  public onPlacementError?: (msg: string) => void;
  public onResourceHover?: (screenX: number, screenY: number, node: ResourceNodeData) => void;
  public onResourceHoverEnd?: () => void;
  public onResourceSelect?: (node: ResourceNodeData) => void;
  public onRallyPointSet?: (bldg: BuildingData, point: Vector2D, desc: string) => void;

  private myPlayerId: string = '';
  private myTeam: number = 1;

  public activeUnitsForSelection: UnitData[] = [];
  public activeBuildingsForSelection: BuildingData[] = [];
  public activeResourcesForSelection: ResourceNodeData[] = [];

  constructor(
    canvas: HTMLCanvasElement,
    renderer: GameRenderer,
    selection: SelectionManager,
    dispatcher: CommandDispatcher
  ) {
    this.canvas = canvas;
    this.renderer = renderer;
    this.selection = selection;
    this.dispatcher = dispatcher;
    this.selectionBoxElem = document.getElementById('selection-box')!;

    this.setupMouseEvents();
    this.setupKeyboardEvents();
  }

  public setPlayerInfo(myPlayerId: string, myTeam: number): void {
    this.myPlayerId = myPlayerId;
    this.myTeam = myTeam;
  }

  public setMapData(width: number, height: number, tiles: MapTile[]): void {
    this.mapWidth = width;
    this.mapHeight = height;
    this.mapTiles = tiles;
  }

  public startPlacement(type: BuildingType): void {
    this.placementBuildingType = type;
    this.onPlacementChanged?.(type);
    soundManager.playClick();
  }

  public cancelPlacement(): void {
    this.placementBuildingType = null;
    this.renderer.setPlacementPreview(null);
    this.onPlacementChanged?.(null);
  }

  public isPlacementValid(type: BuildingType, px: number, py: number): boolean {
    const def = BUILDING_DEFINITIONS[type];
    if (!def) return false;
    if (px < 1 || px + def.width >= this.mapWidth - 1 || py < 1 || py + def.height >= this.mapHeight - 1) return false;

    // Check map tiles: Cannot construct on restricted mountain tops, water, or impassable cliffs
    if (this.mapTiles) {
      for (let dx = 0; dx < def.width; dx++) {
        for (let dy = 0; dy < def.height; dy++) {
          const tx = px + dx;
          const ty = py + dy;
          if (tx < 0 || tx >= this.mapWidth || ty < 0 || ty >= this.mapHeight) return false;
          const tile = this.mapTiles[ty * this.mapWidth + tx];
          if (!tile || !tile.walkable || tile.terrain === 'mountain' || tile.terrain === 'water') {
            return false;
          }
        }
      }
    }

    // Collide with other buildings
    for (const b of this.activeBuildingsForSelection) {
      if (
        px < b.x + b.width &&
        px + def.width > b.x &&
        py < b.y + b.height &&
        py + def.height > b.y
      ) {
        return false;
      }
    }

    // Collide with resource nodes
    for (const r of this.activeResourcesForSelection) {
      if (r.amount > 0) {
        if (
          px <= r.x && r.x < px + def.width &&
          py <= r.y && r.y < py + def.height
        ) {
          return false;
        }
      }
    }

    return true;
  }

  private setupMouseEvents(): void {
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        // Left Click
        if (this.placementBuildingType) {
          const groundPos = this.renderer.raycastGround(e.clientX, e.clientY);
          if (groundPos) {
            const px = Math.floor(groundPos.x);
            const py = Math.floor(groundPos.z);
            const isValid = this.isPlacementValid(this.placementBuildingType, px, py);
            if (!isValid) {
              soundManager.playError();
              this.onPlacementError?.('⚠️ Restricted Terrain: Cannot construct on mountain peaks, cliffs, or deep water!');
              return;
            }
            const workerIds = Array.from(this.selection.selectedIds);
            this.dispatcher.dispatchBuild(workerIds, this.placementBuildingType, { x: px, y: py });
            soundManager.playBuild();
            this.cancelPlacement();
          }
          return;
        }

        // Start marquee drag
        this.isLeftDragging = true;
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
        this.selectionBoxElem.style.left = `${e.clientX}px`;
        this.selectionBoxElem.style.top = `${e.clientY}px`;
        this.selectionBoxElem.style.width = '0px';
        this.selectionBoxElem.style.height = '0px';
        this.selectionBoxElem.style.display = 'block';
      } else if (e.button === 2) {
        // Right Click: Order or Cancel Placement
        if (this.placementBuildingType) {
          this.cancelPlacement();
          return;
        }

        this.handleRightClickOrder(e.clientX, e.clientY);
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (this.placementBuildingType) {
        const groundPos = this.renderer.raycastGround(e.clientX, e.clientY);
        if (groundPos) {
          const px = Math.floor(groundPos.x);
          const pz = Math.floor(groundPos.z);
          const isValid = this.isPlacementValid(this.placementBuildingType, px, pz);
          this.renderer.setPlacementPreview(this.placementBuildingType, px, pz, isValid);
        } else {
          this.renderer.setPlacementPreview(null);
        }
      }

      if (this.isLeftDragging) {
        const left = Math.min(this.dragStartX, e.clientX);
        const top = Math.min(this.dragStartY, e.clientY);
        const width = Math.abs(e.clientX - this.dragStartX);
        const height = Math.abs(e.clientY - this.dragStartY);

        this.selectionBoxElem.style.left = `${left}px`;
        this.selectionBoxElem.style.top = `${top}px`;
        this.selectionBoxElem.style.width = `${width}px`;
        this.selectionBoxElem.style.height = `${height}px`;
        this.onResourceHoverEnd?.();
      } else if (!this.placementBuildingType) {
        // Resource Hover Detection
        const hit = this.renderer.raycastInteractive(e.clientX, e.clientY);
        let hoveredNode: ResourceNodeData | undefined;

        if (hit && hit.type === 'resource') {
          hoveredNode = this.activeResourcesForSelection.find(r => r.id === hit.id);
        } else {
          const ground = this.renderer.raycastGround(e.clientX, e.clientY);
          if (ground) {
            for (const res of this.activeResourcesForSelection) {
              if (res.amount > 0) {
                const d = Math.hypot(res.x + 0.5 - ground.x, res.y + 0.5 - ground.z);
                if (d <= 1.4) {
                  hoveredNode = res;
                  break;
                }
              }
            }
          }
        }

        if (hoveredNode) {
          this.canvas.style.cursor = 'pointer';
          this.onResourceHover?.(e.clientX, e.clientY, hoveredNode);
        } else {
          this.canvas.style.cursor = 'default';
          this.onResourceHoverEnd?.();
        }
      } else {
        this.onResourceHoverEnd?.();
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0 && this.isLeftDragging) {
        this.isLeftDragging = false;
        this.selectionBoxElem.style.display = 'none';

        const dragDistance = Math.hypot(e.clientX - this.dragStartX, e.clientY - this.dragStartY);
        if (dragDistance > 6) {
          this.executeBoxSelection(this.dragStartX, this.dragStartY, e.clientX, e.clientY);
        } else {
          this.executeSingleClickSelection(e.clientX, e.clientY, e.shiftKey);
        }
      }
    });
  }

  private setupKeyboardEvents(): void {
    window.addEventListener('keydown', (e) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      if (e.key === 'Escape') {
        if (this.placementBuildingType) {
          this.cancelPlacement();
        } else {
          this.selection.clear();
        }
        return;
      }

      // Control groups (1-9)
      const num = parseInt(e.key, 10);
      if (!isNaN(num) && num >= 1 && num <= 9) {
        if (e.ctrlKey) {
          this.selection.assignControlGroup(num);
        }
      }
    });
  }

  private executeBoxSelection(startX: number, startY: number, endX: number, endY: number): void {
    const minX = Math.min(startX, endX);
    const maxX = Math.max(startX, endX);
    const minY = Math.min(startY, endY);
    const maxY = Math.max(startY, endY);

    const selected: string[] = [];
    const tempVec = new THREE.Vector3();

    for (const u of this.activeUnitsForSelection) {
      if (u.ownerId !== this.myPlayerId || u.state === 'dead') continue;

      tempVec.set(u.x, 0, u.y);
      tempVec.project(this.renderer.camera);

      const screenX = ((tempVec.x + 1) * window.innerWidth) / 2;
      const screenY = ((-tempVec.y + 1) * window.innerHeight) / 2;

      if (screenX >= minX && screenX <= maxX && screenY >= minY && screenY <= maxY) {
        selected.push(u.id);
      }
    }

    if (selected.length > 0) {
      this.selection.selectMultiple(selected);
    } else {
      this.selection.clear();
    }
  }

  // Exact 3D mesh raycasting + footprint fallback
  private executeSingleClickSelection(screenX: number, screenY: number, isShift: boolean): void {
    // 1. Precise 3D Mesh Raycasting
    const hit = this.renderer.raycastInteractive(screenX, screenY);
    if (hit) {
      if (hit.type === 'unit') {
        if (isShift) {
          this.selection.toggle(hit.id, 'unit');
        } else {
          this.selection.selectSingle(hit.id, 'unit');
        }
        return;
      } else if (hit.type === 'building') {
        this.selection.selectSingle(hit.id, 'building');
        return;
      } else if (hit.type === 'resource') {
        const node = this.activeResourcesForSelection.find(r => r.id === hit.id);
        if (node) {
          this.selection.clear();
          this.onResourceSelect?.(node);
          soundManager.playSelect();
          return;
        }
      }
    }

    // 2. Ground Raycasting & Footprint Test
    const ground = this.renderer.raycastGround(screenX, screenY);
    if (!ground) return;

    // Check closest unit nearby
    for (const u of this.activeUnitsForSelection) {
      if (u.state === 'dead') continue;
      const d = Math.hypot(u.x - ground.x, u.y - ground.z);
      if (d <= 1.5) {
        if (isShift) this.selection.toggle(u.id, 'unit');
        else this.selection.selectSingle(u.id, 'unit');
        return;
      }
    }

    // Check if clicked inside any building footprint (width x height)
    for (const b of this.activeBuildingsForSelection) {
      const margin = 0.4;
      if (
        ground.x >= b.x - margin &&
        ground.x <= b.x + b.width + margin &&
        ground.z >= b.y - margin &&
        ground.z <= b.y + b.height + margin
      ) {
        this.selection.selectSingle(b.id, 'building');
        return;
      }
    }

    // Check if clicked near a resource node
    for (const res of this.activeResourcesForSelection) {
      if (res.amount > 0) {
        const d = Math.hypot(res.x + 0.5 - ground.x, res.y + 0.5 - ground.z);
        if (d <= 1.4) {
          this.selection.clear();
          this.onResourceSelect?.(res);
          soundManager.playSelect();
          return;
        }
      }
    }

    // Clicked empty ground -> clear selection
    if (!isShift) {
      this.selection.clear();
    }
  }

  private handleRightClickOrder(screenX: number, screenY: number): void {
    if (this.selection.selectedIds.size === 0) return;

    // A. Building Selected -> Set Production Rally Point / Checkpoint!
    if (this.selection.selectedType === 'building') {
      const bldgId = Array.from(this.selection.selectedIds)[0];
      const bldg = this.activeBuildingsForSelection.find(b => b.id === bldgId);
      if (!bldg || bldg.ownerId !== this.myPlayerId) return;

      // 1. Raycast interactive entities
      const hit = this.renderer.raycastInteractive(screenX, screenY);
      if (hit) {
        if (hit.type === 'resource') {
          const res = this.activeResourcesForSelection.find(r => r.id === hit.id);
          if (res) {
            const pt = { x: res.x + 0.5, y: res.y + 0.5 };
            bldg.rallyPoint = { ...pt, targetEntityId: res.id, targetType: 'resource' };
            this.dispatcher.dispatchSetRallyPoint(bldg.id, pt, res.id, 'resource');
            this.renderer.spawnOrderMarker(pt.x, pt.y, 'gather');
            soundManager.playOrder();
            this.onRallyPointSet?.(bldg, pt, `Gathering from ${res.type}`);
            return;
          }
        } else if (hit.type === 'building') {
          const targetB = this.activeBuildingsForSelection.find(b => b.id === hit.id);
          if (targetB) {
            const pt = { x: targetB.x + targetB.width / 2, y: targetB.y + targetB.height / 2 };
            bldg.rallyPoint = { ...pt, targetEntityId: targetB.id, targetType: 'building' };
            this.dispatcher.dispatchSetRallyPoint(bldg.id, pt, targetB.id, 'building');
            this.renderer.spawnOrderMarker(pt.x, pt.y, 'gather');
            soundManager.playOrder();
            this.onRallyPointSet?.(bldg, pt, `Assigned to ${targetB.type}`);
            return;
          }
        }
      }

      // 2. Ground position
      const ground = this.renderer.raycastGround(screenX, screenY);
      if (ground) {
        // Check if near resource
        for (const res of this.activeResourcesForSelection) {
          if (res.amount > 0 && Math.hypot(res.x + 0.5 - ground.x, res.y + 0.5 - ground.z) <= 1.8) {
            const pt = { x: res.x + 0.5, y: res.y + 0.5 };
            bldg.rallyPoint = { ...pt, targetEntityId: res.id, targetType: 'resource' };
            this.dispatcher.dispatchSetRallyPoint(bldg.id, pt, res.id, 'resource');
            this.renderer.spawnOrderMarker(pt.x, pt.y, 'gather');
            soundManager.playOrder();
            this.onRallyPointSet?.(bldg, pt, `Gathering from ${res.type}`);
            return;
          }
        }

        const pt = { x: ground.x, y: ground.z };
        bldg.rallyPoint = { ...pt, targetType: 'ground' };
        this.dispatcher.dispatchSetRallyPoint(bldg.id, pt, undefined, 'ground');
        this.renderer.spawnOrderMarker(ground.x, ground.z, 'move');
        soundManager.playOrder();
        this.onRallyPointSet?.(bldg, pt, 'Movement Checkpoint');
      }
      return;
    }

    if (this.selection.selectedType !== 'unit') return;

    const unitIds = Array.from(this.selection.selectedIds);

    // 1. Raycast 3D interactive entities first
    const hit = this.renderer.raycastInteractive(screenX, screenY);
    if (hit) {
      if (hit.type === 'unit') {
        const targetUnit = this.activeUnitsForSelection.find(u => u.id === hit.id);
        if (targetUnit && targetUnit.team !== this.myTeam) {
          this.dispatcher.dispatchAttack(unitIds, targetUnit.id);
          this.renderer.spawnOrderMarker(targetUnit.x, targetUnit.y, 'attack');
          soundManager.playAttack();
          return;
        }
      } else if (hit.type === 'building') {
        const targetBldg = this.activeBuildingsForSelection.find(b => b.id === hit.id);
        if (targetBldg) {
          const cx = targetBldg.x + targetBldg.width / 2;
          const cy = targetBldg.y + targetBldg.height / 2;

          if (targetBldg.team !== this.myTeam) {
            // Attack enemy building
            this.dispatcher.dispatchAttack(unitIds, targetBldg.id);
            this.renderer.spawnOrderMarker(cx, cy, 'attack');
            soundManager.playAttack();
            return;
          } else {
            // Friendly building
            if (!targetBldg.isConstructed || targetBldg.hp < targetBldg.maxHp) {
              this.dispatcher.dispatchRepair(unitIds, targetBldg.id);
              this.renderer.spawnOrderMarker(cx, cy, 'gather');
              soundManager.playBuild();
              return;
            } else if (targetBldg.type === 'farm' || targetBldg.type === 'lumber_camp' || targetBldg.type === 'quarry' || targetBldg.type === 'mining_camp') {
              this.dispatcher.dispatchGather(unitIds, targetBldg.id);
              this.renderer.spawnOrderMarker(cx, cy, 'gather');
              soundManager.playOrder();
              return;
            } else {
              this.dispatcher.dispatchRepair(unitIds, targetBldg.id);
              this.renderer.spawnOrderMarker(cx, cy, 'gather');
              soundManager.playBuild();
              return;
            }
          }
        }
      } else if (hit.type === 'resource') {
        const node = this.activeResourcesForSelection.find(r => r.id === hit.id);
        if (node) {
          this.dispatcher.dispatchGather(unitIds, node.id);
          this.renderer.spawnOrderMarker(node.x + 0.5, node.y + 0.5, 'gather');
          soundManager.playOrder();
          return;
        }
      }
    }

    // 2. Ground Position Fallback
    const ground = this.renderer.raycastGround(screenX, screenY);
    if (!ground) return;

    // Check if right-clicked inside friendly building footprint to repair/build/gather
    for (const b of this.activeBuildingsForSelection) {
      const margin = 0.5;
      if (
        ground.x >= b.x - margin &&
        ground.x <= b.x + b.width + margin &&
        ground.z >= b.y - margin &&
        ground.z <= b.y + b.height + margin
      ) {
        if (b.team !== this.myTeam) {
          this.dispatcher.dispatchAttack(unitIds, b.id);
          this.renderer.spawnOrderMarker(b.x + b.width / 2, b.y + b.height / 2, 'attack');
          soundManager.playAttack();
        } else {
          if (!b.isConstructed || b.hp < b.maxHp) {
            this.dispatcher.dispatchRepair(unitIds, b.id);
            this.renderer.spawnOrderMarker(b.x + b.width / 2, b.y + b.height / 2, 'gather');
            soundManager.playBuild();
          } else if (b.type === 'farm' || b.type === 'lumber_camp' || b.type === 'quarry' || b.type === 'mining_camp') {
            this.dispatcher.dispatchGather(unitIds, b.id);
            this.renderer.spawnOrderMarker(b.x + b.width / 2, b.y + b.height / 2, 'gather');
            soundManager.playOrder();
          } else {
            this.dispatcher.dispatchRepair(unitIds, b.id);
            this.renderer.spawnOrderMarker(b.x + b.width / 2, b.y + b.height / 2, 'gather');
            soundManager.playBuild();
          }
        }
        return;
      }
    }

    // Check if right-clicked on or near any resource deposit (trees, stone, metal, fruit)
    for (const res of this.activeResourcesForSelection) {
      if (res.amount > 0) {
        const d = Math.hypot(res.x + 0.5 - ground.x, res.y + 0.5 - ground.z);
        if (d <= 1.8) {
          this.dispatcher.dispatchGather(unitIds, res.id);
          this.renderer.spawnOrderMarker(res.x + 0.5, res.y + 0.5, 'gather');
          soundManager.playOrder();
          return;
        }
      }
    }

    // Right-clicked terrain -> Move
    this.dispatcher.dispatchMove(unitIds, { x: ground.x, y: ground.z });
    this.renderer.spawnOrderMarker(ground.x, ground.z, 'move');
    soundManager.playOrder();

  }
}
