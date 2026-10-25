import * as THREE from 'three';
import {
  MapTile,
  ResourceNodeData,
  UnitData,
  BuildingData,
  PlayerState,
  Vector2D,
  BuildingType,
  BUILDING_DEFINITIONS
} from '@agefront/shared';
import { CameraController } from '../camera/cameraController.js';
import { TerrainMesh } from './terrainMesh.js';
import { FogOfWar } from './fogOfWar.js';
import { createBuildingModel } from './buildingModels.js';
import { createUnitModel } from './unitModels.js';

export interface InteractiveHit {
  type: 'unit' | 'building' | 'resource';
  id: string;
  point: THREE.Vector3;
}

interface VisualProjectile {
  mesh: THREE.Object3D;
  startPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  arcHeight: number;
  progress: number;
  speed: number;
  type: 'dragon_fire' | 'arrow' | 'boulder' | 'cannon' | 'melee';
  onHit?: () => void;
}

interface VisualEffect {
  mesh: THREE.Object3D;
  createdAt: number;
  duration: number;
  update?: (progress: number) => void;
}

export class GameRenderer {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public cameraController: CameraController;
  public fogOfWar: FogOfWar | null = null;
  public terrainMesh: TerrainMesh | null = null;

  public unitMeshes: Map<string, THREE.Group> = new Map();
  public buildingMeshes: Map<string, THREE.Group> = new Map();
  private selectionRings: Map<string, THREE.Mesh> = new Map();
  private healthBars: Map<string, THREE.Sprite> = new Map();
  private buildingStatusBars: Map<string, THREE.Sprite> = new Map();
  private healthBarLastHp: Map<string, number> = new Map();
  private buildingStatusLastState: Map<string, string> = new Map();
  private buildingStatusLastTime: Map<string, number> = new Map();
  private rotatorObjects: { bldgId: string; obj: THREE.Object3D; speed: number; axis: string }[] = [];

  private placementGhostGroup: THREE.Group | null = null;
  private placementFootprintMesh: THREE.Mesh | null = null;
  private currentGhostType: BuildingType | null = null;

  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private groundPlane: THREE.Plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private canvas: HTMLCanvasElement;

  private orderMarkers: { mesh: THREE.Mesh; createdAt: number; duration: number }[] = [];
  private visualProjectiles: VisualProjectile[] = [];
  private visualEffects: VisualEffect[] = [];
  private lastDragonBreathTime: Map<string, number> = new Map();

  private rallyFlag: THREE.Group | null = null;
  private rallyLine: THREE.Line | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0c1324);
    this.scene.fog = new THREE.FogExp2(0x0c1324, 0.0032);

    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.5, 500);
    this.cameraController = new CameraController(this.camera);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    // Cap pixel ratio to 1.25 to prevent 4K GPU fill-rate throttling on high-DPI displays
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    // Atmospheric Warm Natural Lighting
    const hemiLight = new THREE.HemisphereLight(0xc7d2fe, 0x1e293b, 0.85);
    this.scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff7ed, 1.55);
    sunLight.position.set(65, 95, 55);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 300;
    sunLight.shadow.camera.left = -120;
    sunLight.shadow.camera.right = 120;
    sunLight.shadow.camera.top = 120;
    sunLight.shadow.camera.bottom = -120;
    sunLight.shadow.bias = -0.0004;
    this.scene.add(sunLight);

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.cameraController.clampCameraToMap();
    });
  }

  public clearGameScene(): void {
    // 1. Remove all units
    for (const mesh of this.unitMeshes.values()) {
      this.scene.remove(mesh);
    }
    this.unitMeshes.clear();

    // 2. Remove all buildings
    for (const mesh of this.buildingMeshes.values()) {
      this.scene.remove(mesh);
    }
    this.buildingMeshes.clear();
    this.rotatorObjects = [];

    // 3. Remove all selection rings
    for (const ring of this.selectionRings.values()) {
      this.scene.remove(ring);
    }
    this.selectionRings.clear();

    // 4. Remove all health bars & status bars
    for (const hb of this.healthBars.values()) {
      this.scene.remove(hb);
    }
    this.healthBars.clear();
    this.healthBarLastHp.clear();

    for (const sb of this.buildingStatusBars.values()) {
      this.scene.remove(sb);
    }
    this.buildingStatusBars.clear();
    this.buildingStatusLastState.clear();
    this.buildingStatusLastTime.clear();

    // 5. Remove terrain & fog
    if (this.terrainMesh) {
      this.scene.remove(this.terrainMesh.group);
      this.terrainMesh = null;
    }
    if (this.fogOfWar) {
      this.scene.remove(this.fogOfWar.mesh);
      this.fogOfWar = null;
    }

    // 6. Remove rally indicators & ghost placement
    if (this.rallyFlag) {
      this.scene.remove(this.rallyFlag);
      this.rallyFlag = null;
    }
    if (this.rallyLine) {
      this.scene.remove(this.rallyLine);
      this.rallyLine = null;
    }
    if (this.placementGhostGroup) {
      this.scene.remove(this.placementGhostGroup);
      this.placementGhostGroup = null;
    }
    if (this.placementFootprintMesh) {
      this.scene.remove(this.placementFootprintMesh);
      this.placementFootprintMesh = null;
    }

    // 7. Remove visual effects & projectiles
    for (const p of this.visualProjectiles) {
      this.scene.remove(p.mesh);
    }
    this.visualProjectiles = [];

    for (const eff of this.visualEffects) {
      this.scene.remove(eff.mesh);
    }
    this.visualEffects = [];

    for (const om of this.orderMarkers) {
      this.scene.remove(om.mesh);
    }
    this.orderMarkers = [];

    // 8. Render a clean blank frame
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
  }

  public initMap(
    width: number,
    height: number,
    tiles: MapTile[],
    resourceNodes: ResourceNodeData[],
    myTeam: number
  ): void {
    this.clearGameScene();

    this.cameraController.setMapBounds(width, height);
    this.terrainMesh = new TerrainMesh(width, height, tiles, resourceNodes);
    this.scene.add(this.terrainMesh.group);

    this.fogOfWar = new FogOfWar(width, height, myTeam);
    this.scene.add(this.fogOfWar.mesh);
  }

  // Exact 3D Interactive Raycasting for Units, Buildings, and Resources
  public raycastInteractive(screenX: number, screenY: number): InteractiveHit | null {
    const ndcX = (screenX / window.innerWidth) * 2 - 1;
    const ndcY = -(screenY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);

    const interactiveGroups: THREE.Object3D[] = [
      ...Array.from(this.unitMeshes.values()),
      ...Array.from(this.buildingMeshes.values()),
      ...(this.terrainMesh ? Array.from(this.terrainMesh.resourceMeshes.values()) : [])
    ];

    const intersects = this.raycaster.intersectObjects(interactiveGroups, true);

    for (const hit of intersects) {
      let curr: THREE.Object3D | null = hit.object;
      while (curr && curr !== this.scene) {
        if (curr.userData && curr.userData.entityId && curr.userData.entityType) {
          return {
            type: curr.userData.entityType,
            id: curr.userData.entityId,
            point: hit.point
          };
        }
        curr = curr.parent;
      }
    }

    return null;
  }

  public raycastGround(screenX: number, screenY: number): THREE.Vector3 | null {
    const ndcX = (screenX / window.innerWidth) * 2 - 1;
    const ndcY = -(screenY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);

    const hit = new THREE.Vector3();
    const result = this.raycaster.ray.intersectPlane(this.groundPlane, hit);
    return result ? hit : null;
  }

  // Visual animated order pulse marker on ground
  public spawnOrderMarker(x: number, z: number, type: 'move' | 'attack' | 'gather'): void {
    const color = type === 'move' ? 0x22c55e : type === 'attack' ? 0xef4444 : 0xf59e0b;
    const geom = new THREE.RingGeometry(0.3, 0.45, 16);
    geom.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
    const ring = new THREE.Mesh(geom, mat);
    ring.position.set(x, 0.12, z);
    this.scene.add(ring);
    this.orderMarkers.push({ mesh: ring, createdAt: performance.now(), duration: 400 });
  }

  public updateEntities(
    units: UnitData[],
    buildings: BuildingData[],
    players: PlayerState[],
    selectedIds: Set<string>,
    myPlayerId: string,
    myTeam: number,
    dt: number
  ): void {
    const playerColorMap = new Map<string, string>();
    players.forEach(p => playerColorMap.set(p.id, p.color));

    if (this.fogOfWar) {
      const myPlayer = players.find(p => p.id === myPlayerId);
      const hasCartography = myPlayer?.researchedTechs.includes('cartography') ?? false;
      this.fogOfWar.updateVisibility(units, buildings, myPlayerId, myTeam, hasCartography);
    }

    // 1. Update Units
    const currentUnitIds = new Set<string>();
    for (const unit of units) {
      if (unit.state === 'dead') continue;
      currentUnitIds.add(unit.id);

      const isVisible = this.fogOfWar ? this.fogOfWar.isTileVisible(unit.x, unit.y) : true;
      const shouldRender = unit.team === myTeam || isVisible;

      let group = this.unitMeshes.get(unit.id);
      if (!group) {
        const teamColor = playerColorMap.get(unit.ownerId) || '#3b82f6';
        group = createUnitModel(unit, teamColor);
        this.unitMeshes.set(unit.id, group);
        this.scene.add(group);
      }

      group.visible = shouldRender;
      if (shouldRender) {
        group.position.x += (unit.x - group.position.x) * Math.min(1.0, 16 * dt);
        group.position.z += (unit.y - group.position.z) * Math.min(1.0, 16 * dt);

        if (unit.type === 'dragon') {
          // Elevated flight height + smooth hovering wave
          const hoverOffset = Math.sin(Date.now() * 0.0035 + (unit.id.charCodeAt(unit.id.length - 1) || 0)) * 0.35;
          group.position.y = 2.8 + hoverOffset;

          if (unit.facingAngle !== undefined) {
            group.rotation.y = -unit.facingAngle + Math.PI / 2;
          }

          // Ground shadow / selection ring directly beneath dragon on terrain
          const groundPos = new THREE.Vector3(group.position.x, 0.05, group.position.z);
          this.updateSelectionRing(unit.id, groundPos, 1.3, selectedIds.has(unit.id));

          // Floating health bar above the soaring dragon
          const healthBarPos = new THREE.Vector3(group.position.x, group.position.y + 1.25, group.position.z);
          this.updateHealthBar(unit.id, healthBarPos, unit.hp, unit.maxHp, 1.8);
        } else {
          group.position.y = 0;

          if (unit.facingAngle !== undefined) {
            group.rotation.y = -unit.facingAngle + Math.PI / 2;
          }

          // Selection ring
          this.updateSelectionRing(unit.id, group.position, 0.75, selectedIds.has(unit.id));

          // Floating health bar
          this.updateHealthBar(unit.id, group.position, unit.hp, unit.maxHp, 1.5);
        }

        // Procedural articulated unit animations for all unit actions & dragon flight/combat
        this.animateUnitActions(unit, group, Date.now(), dt, units, buildings);
      }
    }

    // Remove deleted units
    for (const [id, mesh] of this.unitMeshes.entries()) {
      if (!currentUnitIds.has(id)) {
        this.scene.remove(mesh);
        this.unitMeshes.delete(id);
        this.removeSelectionRing(id);
        this.removeHealthBar(id);
      }
    }

    // 2. Update Buildings
    const currentBldgIds = new Set<string>();
    for (const bldg of buildings) {
      currentBldgIds.add(bldg.id);

      const isExplored = this.fogOfWar ? this.fogOfWar.isTileExplored(bldg.x + bldg.width / 2, bldg.y + bldg.height / 2) : true;
      const shouldRender = bldg.team === myTeam || isExplored;

      let group = this.buildingMeshes.get(bldg.id);
      // Re-create building mesh if construction status changed from unfinished to completed!
      const wasConstructed = group?.userData?.isConstructed;
      if (!group || wasConstructed !== bldg.isConstructed) {
        if (group) {
          this.scene.remove(group);
          this.rotatorObjects = this.rotatorObjects.filter(r => r.bldgId !== bldg.id);
        }
        const teamColor = playerColorMap.get(bldg.ownerId) || '#3b82f6';
        group = createBuildingModel(bldg, teamColor);
        group.userData = { isConstructed: bldg.isConstructed };
        this.buildingMeshes.set(bldg.id, group);
        this.scene.add(group);

        // Cache rotators for 0-overhead animation loop
        group.traverse((child: any) => {
          if (child.userData?.isRotator) {
            this.rotatorObjects.push({
              bldgId: bldg.id,
              obj: child,
              speed: child.userData.rotSpeed || 1.0,
              axis: child.userData.rotAxis || 'z'
            });
          }
        });
      }

      group.visible = shouldRender;
      if (shouldRender) {
        const ringRadius = Math.max(bldg.width, bldg.height) * 0.75;
        this.updateSelectionRing(bldg.id, group.position, ringRadius, selectedIds.has(bldg.id));

        // Count active workers working at or near this facility
        let activeWorkers = 0;
        for (const u of units) {
          if (u.ownerId === bldg.ownerId && u.state !== 'dead') {
            if (u.targetEntityId === bldg.id) {
              activeWorkers++;
            } else if (
              (bldg.type === 'lumber_camp' || bldg.type === 'quarry' || bldg.type === 'mining_camp') &&
              u.state === 'gathering'
            ) {
              const d = Math.hypot(u.x - (bldg.x + bldg.width / 2), u.y - (bldg.y + bldg.height / 2));
              if (d <= 14) activeWorkers++;
            }
          }
        }

        this.updateBuildingStatusBar(bldg, group.position, activeWorkers, selectedIds.has(bldg.id));
      }
    }

    // Remove destroyed buildings
    for (const [id, mesh] of this.buildingMeshes.entries()) {
      if (!currentBldgIds.has(id)) {
        this.scene.remove(mesh);
        this.buildingMeshes.delete(id);
        this.removeSelectionRing(id);
        this.removeHealthBar(id);
        this.removeBuildingStatusBar(id);
        this.rotatorObjects = this.rotatorObjects.filter(r => r.bldgId !== id);
      }
    }

    // 3. Update Checkpoint / Rally Point visual for selected friendly building
    let selectedProductionBldg: BuildingData | null = null;
    for (const bldg of buildings) {
      if (selectedIds.has(bldg.id) && bldg.ownerId === myPlayerId) {
        selectedProductionBldg = bldg;
        break;
      }
    }
    const myTeamColor = playerColorMap.get(myPlayerId) || '#38bdf8';
    this.updateRallyPointVisual(selectedProductionBldg, myTeamColor);
  }

  public updateRallyPointVisual(bldg: BuildingData | null, teamColor: string = '#38bdf8'): void {
    const isProductionBldg = bldg && ['town_centre', 'barracks', 'archery_range', 'stable', 'workshop', 'fort'].includes(bldg.type);
    if (!bldg || !isProductionBldg || !bldg.rallyPoint) {
      if (this.rallyFlag) {
        this.rallyFlag.visible = false;
      }
      if (this.rallyLine) {
        this.rallyLine.visible = false;
      }
      return;
    }

    const startX = bldg.x + bldg.width / 2;
    const startZ = bldg.y + bldg.height / 2;
    const endX = bldg.rallyPoint.x;
    const endZ = bldg.rallyPoint.y;

    const colorNum = new THREE.Color(teamColor).getHex();

    // 1. Create or update Rally Flag
    if (!this.rallyFlag) {
      this.rallyFlag = new THREE.Group();

      // Flag pole
      const poleGeom = new THREE.CylinderGeometry(0.04, 0.05, 1.8, 8);
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.3 });
      const pole = new THREE.Mesh(poleGeom, poleMat);
      pole.position.y = 0.9;
      pole.castShadow = true;
      this.rallyFlag.add(pole);

      // Top golden spearhead/finial
      const spearGeom = new THREE.ConeGeometry(0.09, 0.22, 8);
      const spearMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.9, roughness: 0.2 });
      const spear = new THREE.Mesh(spearGeom, spearMat);
      spear.position.y = 1.9;
      this.rallyFlag.add(spear);

      // Pennant / Triangular flag
      const pennantShape = new THREE.Shape();
      pennantShape.moveTo(0, 0);
      pennantShape.lineTo(0.75, 0.25);
      pennantShape.lineTo(0, 0.5);
      pennantShape.closePath();

      const pennantGeom = new THREE.ShapeGeometry(pennantShape);
      const pennantMat = new THREE.MeshStandardMaterial({
        color: colorNum,
        side: THREE.DoubleSide,
        roughness: 0.5
      });
      const pennant = new THREE.Mesh(pennantGeom, pennantMat);
      pennant.name = 'pennant';
      pennant.position.set(0.04, 1.25, 0);
      this.rallyFlag.add(pennant);

      // Ground beacon ring
      const ringGeom = new THREE.RingGeometry(0.35, 0.55, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: colorNum,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.75
      });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.name = 'groundRing';
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.05;
      this.rallyFlag.add(ring);

      this.scene.add(this.rallyFlag);
    }

    // Update flag position & materials
    this.rallyFlag.visible = true;
    this.rallyFlag.position.set(endX, 0, endZ);

    const pennantMesh = this.rallyFlag.getObjectByName('pennant') as THREE.Mesh;
    if (pennantMesh) {
      (pennantMesh.material as THREE.MeshStandardMaterial).color.setHex(colorNum);
      pennantMesh.rotation.y = Math.sin(performance.now() * 0.005) * 0.2;
    }

    const groundRing = this.rallyFlag.getObjectByName('groundRing') as THREE.Mesh;
    if (groundRing) {
      (groundRing.material as THREE.MeshBasicMaterial).color.setHex(colorNum);
      const pulse = 1.0 + Math.sin(performance.now() * 0.006) * 0.15;
      groundRing.scale.set(pulse, pulse, pulse);
    }

    // 2. Create or update Rally Line (dashed path from building to rally point)
    if (!this.rallyLine) {
      const lineGeom = new THREE.BufferGeometry();
      const lineMat = new THREE.LineDashedMaterial({
        color: colorNum,
        dashSize: 0.6,
        gapSize: 0.35,
        linewidth: 2,
        transparent: true,
        opacity: 0.85
      });
      this.rallyLine = new THREE.Line(lineGeom, lineMat);
      this.scene.add(this.rallyLine);
    }

    this.rallyLine.visible = true;
    (this.rallyLine.material as THREE.LineDashedMaterial).color.setHex(colorNum);

    const points = [
      new THREE.Vector3(startX, 0.15, startZ),
      new THREE.Vector3(endX, 0.15, endZ)
    ];
    this.rallyLine.geometry.dispose();
    this.rallyLine.geometry = new THREE.BufferGeometry().setFromPoints(points);
    this.rallyLine.computeLineDistances();
  }

  public setPlacementPreview(buildingType: BuildingType | null, groundX?: number, groundZ?: number, isValid: boolean = true): void {
    if (!buildingType || groundX === undefined || groundZ === undefined) {
      if (this.placementGhostGroup) {
        this.scene.remove(this.placementGhostGroup);
        this.placementGhostGroup = null;
        this.placementFootprintMesh = null;
        this.currentGhostType = null;
      }
      return;
    }

    const def = BUILDING_DEFINITIONS[buildingType];
    if (!def) return;

    const px = Math.floor(groundX);
    const pz = Math.floor(groundZ);

    if (this.currentGhostType !== buildingType || !this.placementGhostGroup) {
      if (this.placementGhostGroup) {
        this.scene.remove(this.placementGhostGroup);
      }
      this.currentGhostType = buildingType;
      this.placementGhostGroup = new THREE.Group();

      const dummyBldg: BuildingData = {
        id: 'placement_ghost',
        type: buildingType,
        ownerId: '',
        team: 0,
        x: 0,
        y: 0,
        width: def.width,
        height: def.height,
        hp: def.hp,
        maxHp: def.hp,
        isConstructed: true,
        constructionProgress: 100,
        productionQueue: []
      };

      const ghostModel = createBuildingModel(dummyBldg, '#38bdf8');
      ghostModel.traverse((child: any) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.castShadow = false;
          mesh.receiveShadow = false;
          if (mesh.material) {
            const mat = (mesh.material as THREE.Material).clone();
            mat.transparent = true;
            mat.opacity = 0.6;
            mesh.material = mat;
          }
        }
      });
      // Building models are created with center offset at (width/2, height/2)
      this.placementGhostGroup.add(ghostModel);

      // Footprint grid
      const planeGeom = new THREE.PlaneGeometry(def.width * 0.96, def.height * 0.96);
      planeGeom.rotateX(-Math.PI / 2);
      const planeMat = new THREE.MeshBasicMaterial({
        color: isValid ? 0x22c55e : 0xef4444,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide
      });
      this.placementFootprintMesh = new THREE.Mesh(planeGeom, planeMat);
      this.placementFootprintMesh.position.set(def.width / 2, 0.08, def.height / 2);
      this.placementGhostGroup.add(this.placementFootprintMesh);

      this.scene.add(this.placementGhostGroup);
    }

    this.placementGhostGroup.position.set(px, 0, pz);
    if (this.placementFootprintMesh) {
      (this.placementFootprintMesh.material as THREE.MeshBasicMaterial).color.setHex(isValid ? 0x22c55e : 0xef4444);
    }
  }

  private updateSelectionRing(id: string, pos: THREE.Vector3, radius: number, isSelected: boolean): void {
    let ring = this.selectionRings.get(id);
    if (isSelected) {
      if (!ring) {
        const ringGeom = new THREE.RingGeometry(radius * 0.82, radius, 36);
        ringGeom.rotateX(-Math.PI / 2);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.85
        });
        ring = new THREE.Mesh(ringGeom, ringMat);
        this.scene.add(ring);
        this.selectionRings.set(id, ring);
      }
      ring.position.set(pos.x, 0.08, pos.z);
      ring.visible = true;
    } else if (ring) {
      ring.visible = false;
    }
  }

  private removeSelectionRing(id: string): void {
    const ring = this.selectionRings.get(id);
    if (ring) {
      this.scene.remove(ring);
      this.selectionRings.delete(id);
    }
  }

  private updateHealthBar(id: string, pos: THREE.Vector3, hp: number, maxHp: number, heightOffset: number): void {
    if (hp >= maxHp) {
      this.removeHealthBar(id);
      return;
    }

    let sprite = this.healthBars.get(id);
    if (!sprite) {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 8;
      const texture = new THREE.CanvasTexture(canvas);
      const mat = new THREE.SpriteMaterial({ map: texture, depthTest: false });
      sprite = new THREE.Sprite(mat);
      sprite.scale.set(1.5, 0.2, 1);
      this.scene.add(sprite);
      this.healthBars.set(id, sprite);
    }

    sprite.position.set(pos.x, pos.y + heightOffset, pos.z);

    const lastHp = this.healthBarLastHp.get(id);
    if (lastHp === hp) {
      return; // Health hasn't changed; avoid expensive canvas redraw and WebGL texture upload
    }
    this.healthBarLastHp.set(id, hp);

    const canvas = (sprite.material.map as THREE.CanvasTexture).image as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, 64, 8);

    const pct = Math.max(0, Math.min(1, hp / maxHp));
    ctx.fillStyle = pct > 0.5 ? '#22c55e' : pct > 0.25 ? '#eab308' : '#ef4444';
    ctx.fillRect(1, 1, Math.floor(62 * pct), 6);

    (sprite.material.map as THREE.CanvasTexture).needsUpdate = true;
  }

  private removeHealthBar(id: string): void {
    const sprite = this.healthBars.get(id);
    if (sprite) {
      this.scene.remove(sprite);
      this.healthBars.delete(id);
    }
    this.healthBarLastHp.delete(id);
  }

  private updateBuildingStatusBar(
    bldg: BuildingData,
    pos: THREE.Vector3,
    activeWorkers: number,
    isSelected: boolean
  ): void {
    const def = BUILDING_DEFINITIONS[bldg.type];

    // Determine if building should show an overhead status / progress bar
    const isUnderConstruction = !bldg.isConstructed;
    const hasQueue = bldg.productionQueue && bldg.productionQueue.length > 0;
    const isFarm = bldg.type === 'farm';
    const isResearchHall = bldg.type === 'research_hall';
    const isCamp = bldg.type === 'lumber_camp' || bldg.type === 'quarry' || bldg.type === 'mining_camp';
    const isDamaged = bldg.hp < bldg.maxHp;

    const shouldShow =
      isUnderConstruction ||
      hasQueue ||
      (isFarm && activeWorkers > 0) ||
      isResearchHall ||
      (isCamp && activeWorkers > 0) ||
      isDamaged ||
      isSelected;

    if (!shouldShow) {
      this.removeBuildingStatusBar(bldg.id);
      return;
    }

    let sprite = this.buildingStatusBars.get(bldg.id);
    if (!sprite) {
      const canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = 42;
      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;
      const mat = new THREE.SpriteMaterial({ map: texture, depthTest: false });
      sprite = new THREE.Sprite(mat);
      sprite.scale.set(3.2, 0.84, 1);
      this.scene.add(sprite);
      this.buildingStatusBars.set(bldg.id, sprite);
    }

    const heightOffset = bldg.type === 'town_centre' ? 4.6 : (bldg.type === 'fort' || bldg.type === 'watchtower') ? 4.2 : (bldg.type === 'farm') ? 2.2 : 3.5;
    sprite.position.set(pos.x, pos.y + heightOffset, pos.z);

    // Throttle canvas texture re-draws:
    // Only re-draw if 100ms has elapsed (~10 FPS) or if critical building state changed
    const now = performance.now();
    const lastTime = this.buildingStatusLastTime.get(bldg.id) || 0;
    const queueProgress = bldg.productionQueue && bldg.productionQueue.length > 0
      ? `${bldg.productionQueue[0].itemType}_${Math.floor(bldg.productionQueue[0].progress)}_${bldg.productionQueue.length}`
      : 'none';
    const stateKey = `${Math.floor(bldg.constructionProgress)}_${queueProgress}_${activeWorkers}_${Math.floor(bldg.hp)}_${isSelected}`;
    const lastState = this.buildingStatusLastState.get(bldg.id);

    if (lastState === stateKey && now - lastTime < 100) {
      return;
    }
    this.buildingStatusLastTime.set(bldg.id, now);
    this.buildingStatusLastState.set(bldg.id, stateKey);

    const canvas = (sprite.material.map as THREE.CanvasTexture).image as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 160, 42);

    // Pill background
    ctx.fillStyle = 'rgba(9, 14, 26, 0.9)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(0, 0, 160, 42, 6);
    else ctx.rect(0, 0, 160, 42);
    ctx.fill();

    // Border
    ctx.lineWidth = isSelected ? 2 : 1;
    ctx.strokeStyle = isSelected ? '#38bdf8' : 'rgba(51, 65, 85, 0.85)';
    ctx.stroke();

    // Determine state, title, progress fill, and colors
    let stateLabel = '';
    let percentText = '';
    let barColor = '#38bdf8';
    let progress = 0;
    let showWorkingPulse = false;

    if (isUnderConstruction) {
      stateLabel = '🔨 BUILDING';
      progress = Math.min(1.0, Math.max(0, bldg.constructionProgress / 100));
      percentText = `${Math.floor(bldg.constructionProgress)}%`;
      barColor = '#f59e0b'; // Amber
      showWorkingPulse = true;
    } else if (hasQueue) {
      const item = bldg.productionQueue[0];
      const itemName = item.itemType.replace('_', ' ').toUpperCase();
      const countSuffix = bldg.productionQueue.length > 1 ? ` (+${bldg.productionQueue.length - 1})` : '';
      stateLabel = `⚙️ ${itemName}${countSuffix}`;
      progress = Math.min(1.0, Math.max(0, item.progress / 100));
      percentText = `${Math.floor(item.progress)}%`;
      barColor = '#06b6d4'; // Cyan
      showWorkingPulse = true;
    } else if (isFarm) {
      if (activeWorkers > 0) {
        stateLabel = `🌾 FARMING (${activeWorkers}w)`;
        progress = ((performance.now() * 0.001) % 1.0);
        percentText = 'WORKING';
        barColor = '#22c55e'; // Emerald
        showWorkingPulse = true;
      } else {
        stateLabel = '🌾 FARM IDLE';
        progress = 0;
        percentText = 'NEED WORKER';
        barColor = '#64748b';
      }
    } else if (isResearchHall) {
      stateLabel = '🧪 ACADEMY';
      progress = ((performance.now() * 0.0008) % 1.0);
      percentText = '+1/SEC';
      barColor = '#a855f7'; // Purple
      showWorkingPulse = true;
    } else if (isCamp && activeWorkers > 0) {
      stateLabel = `📦 DEPOT ACTIVE (${activeWorkers}w)`;
      progress = ((performance.now() * 0.001) % 1.0);
      percentText = 'WORKING';
      barColor = '#3b82f6';
      showWorkingPulse = true;
    } else if (isDamaged) {
      stateLabel = '🛡️ INTEGRITY';
      progress = Math.min(1.0, Math.max(0, bldg.hp / bldg.maxHp));
      percentText = `${Math.ceil(bldg.hp)}/${bldg.maxHp}`;
      barColor = progress > 0.5 ? '#22c55e' : progress > 0.25 ? '#eab308' : '#ef4444';
    } else {
      stateLabel = `🏛️ ${def.name.toUpperCase()}`;
      progress = 1.0;
      percentText = 'READY';
      barColor = '#38bdf8';
    }

    // Working pulse indicator (Glowing green dot)
    if (showWorkingPulse) {
      const pulse = 0.5 + 0.5 * Math.sin(performance.now() * 0.008);
      ctx.fillStyle = `rgba(34, 197, 94, ${0.4 + 0.6 * pulse})`;
      ctx.beginPath();
      ctx.arc(10, 13, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Header Label Text
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(stateLabel, showWorkingPulse ? 18 : 8, 14);

    // Percent / Status Badge Text
    ctx.fillStyle = barColor;
    const textWidth = ctx.measureText(percentText).width;
    ctx.fillText(percentText, 152 - textWidth, 14);

    // Main Progress Bar (Trough)
    const hasSubHp = isDamaged && (isUnderConstruction || hasQueue || isFarm || isResearchHall);
    const barY = hasSubHp ? 19 : 21;
    const barH = hasSubHp ? 10 : 13;

    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(8, barY, 144, barH, 3);
    else ctx.rect(8, barY, 144, barH);
    ctx.fill();

    // Progress Bar Fill
    const fillW = Math.max(2, Math.floor(144 * progress));
    ctx.fillStyle = barColor;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(8, barY, fillW, barH, 3);
    else ctx.rect(8, barY, fillW, barH);
    ctx.fill();

    // Secondary HP bar if building is also damaged
    if (hasSubHp) {
      const hpRatio = Math.min(1.0, Math.max(0, bldg.hp / bldg.maxHp));
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(8, 33, 144, 4, 2);
      else ctx.rect(8, 33, 144, 4);
      ctx.fill();

      ctx.fillStyle = hpRatio > 0.5 ? '#22c55e' : hpRatio > 0.25 ? '#eab308' : '#ef4444';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(8, 33, Math.max(2, Math.floor(144 * hpRatio)), 4, 2);
      else ctx.rect(8, 33, Math.max(2, Math.floor(144 * hpRatio)), 4);
      ctx.fill();
    }

    (sprite.material.map as THREE.CanvasTexture).needsUpdate = true;
  }

  private removeBuildingStatusBar(id: string): void {
    const sprite = this.buildingStatusBars.get(id);
    if (sprite) {
      this.scene.remove(sprite);
      this.buildingStatusBars.delete(id);
    }
    this.buildingStatusLastState.delete(id);
    this.buildingStatusLastTime.delete(id);
  }


  private animateUnitActions(
    unit: UnitData,
    group: THREE.Group,
    now: number,
    dt: number,
    units: UnitData[],
    buildings: BuildingData[]
  ): void {
    const time = now * 0.001;

    switch (unit.type) {
      case 'worker': {
        const toolPivot = group.getObjectByName('tool_pivot');
        const torso = group.getObjectByName('unit_torso');
        if (!toolPivot) break;

        if (unit.state === 'gathering') {
          // Dynamic chopping or pickaxe swing
          const swing = Math.sin(time * 12);
          toolPivot.rotation.x = -0.3 + swing * 1.1;
          toolPivot.rotation.z = Math.cos(time * 12) * 0.2;
          if (torso) torso.rotation.y = swing * 0.15;
        } else if (unit.state === 'building' || unit.state === 'repairing') {
          // Hammering rhythm
          const hammer = Math.sin(time * 9);
          toolPivot.rotation.x = -0.5 + hammer * 0.85;
          toolPivot.rotation.z = 0;
          if (torso) torso.position.y = 0.45 + hammer * 0.04;
        } else if (unit.state === 'attacking') {
          // Aggressive improvised attack chop
          const swing = Math.sin(time * 14);
          toolPivot.rotation.x = swing * 1.2;
          if (torso) torso.rotation.y = swing * 0.25;
        } else if (unit.state === 'moving') {
          // Running stride bob
          toolPivot.rotation.x = Math.sin(time * 8) * 0.35;
          toolPivot.rotation.z = 0;
          if (torso) {
            torso.position.y = 0.45 + Math.abs(Math.sin(time * 10)) * 0.06;
            torso.rotation.y = Math.sin(time * 10) * 0.08;
          }
        } else {
          // Idle breathing
          toolPivot.rotation.set(0, 0, 0);
          if (torso) {
            torso.position.y = 0.45 + Math.sin(time * 2) * 0.015;
            torso.rotation.set(0, 0, 0);
          }
        }
        break;
      }

      case 'basic_infantry': {
        const swordPivot = group.getObjectByName('sword_pivot');
        const shieldPivot = group.getObjectByName('shield_pivot');
        const torso = group.getObjectByName('unit_torso');

        if (unit.state === 'attacking') {
          const slash = Math.sin(time * 13);
          if (swordPivot) {
            swordPivot.rotation.x = slash * 1.25;
            swordPivot.rotation.y = Math.cos(time * 13) * 0.4;
          }
          if (shieldPivot) {
            shieldPivot.position.z = 0.15 + Math.sin(time * 13) * 0.08;
            shieldPivot.rotation.y = 0.25;
          }
          if (torso) torso.rotation.y = slash * 0.25;
        } else if (unit.state === 'moving') {
          if (swordPivot) swordPivot.rotation.x = Math.sin(time * 8) * 0.3;
          if (shieldPivot) shieldPivot.rotation.x = -Math.sin(time * 8) * 0.25;
          if (torso) {
            torso.position.y = 0.48 + Math.abs(Math.sin(time * 10)) * 0.05;
            torso.rotation.y = Math.sin(time * 10) * 0.08;
          }
        } else {
          if (swordPivot) swordPivot.rotation.set(0, 0, 0);
          if (shieldPivot) {
            shieldPivot.position.set(-0.28, 0.52, 0.1);
            shieldPivot.rotation.set(0, 0, 0);
          }
          if (torso) {
            torso.position.y = 0.48 + Math.sin(time * 2) * 0.015;
            torso.rotation.set(0, 0, 0);
          }
        }
        break;
      }

      case 'spearman': {
        const pikePivot = group.getObjectByName('pike_pivot');
        const torso = group.getObjectByName('unit_torso');

        if (unit.state === 'attacking') {
          const thrust = Math.max(0, Math.sin(time * 13));
          if (pikePivot) {
            pikePivot.position.z = 0.15 + thrust * 0.7;
            pikePivot.rotation.x = Math.PI / 16 - thrust * 0.12;
          }
          if (torso) torso.position.z = thrust * 0.12;
        } else if (unit.state === 'moving') {
          if (pikePivot) {
            pikePivot.position.z = 0.15;
            pikePivot.rotation.x = Math.PI / 16 + Math.sin(time * 8) * 0.12;
          }
          if (torso) {
            torso.position.y = 0.48 + Math.abs(Math.sin(time * 10)) * 0.05;
            torso.position.z = 0;
          }
        } else {
          if (pikePivot) {
            pikePivot.position.set(0.26, 0.6, 0.15);
            pikePivot.rotation.set(0, 0, 0);
          }
          if (torso) {
            torso.position.set(0, 0.48 + Math.sin(time * 2) * 0.015, 0);
            torso.rotation.set(0, 0, 0);
          }
        }
        break;
      }

      case 'ranged_infantry': {
        const bowPivot = group.getObjectByName('bow_pivot');
        const torso = group.getObjectByName('unit_torso');

        if (unit.state === 'attacking') {
          const drawCycle = (time * 2.5) % 1.0;
          const drawPull = Math.sin(drawCycle * Math.PI);
          if (bowPivot) {
            bowPivot.position.z = 0.15 - drawPull * 0.22;
            bowPivot.rotation.x = -Math.PI / 8;
          }
          if (torso) torso.rotation.y = 0.35;
        } else if (unit.state === 'moving') {
          if (bowPivot) {
            bowPivot.position.z = 0.15;
            bowPivot.rotation.x = 0;
          }
          if (torso) {
            torso.position.y = 0.48 + Math.abs(Math.sin(time * 10)) * 0.05;
            torso.rotation.y = 0;
          }
        } else {
          if (bowPivot) {
            bowPivot.position.set(0.26, 0.55, 0.15);
            bowPivot.rotation.set(0, 0, 0);
          }
          if (torso) {
            torso.position.y = 0.48 + Math.sin(time * 2) * 0.015;
            torso.rotation.set(0, 0, 0);
          }
        }
        break;
      }

      case 'cavalry':
      case 'scout': {
        const horse = group.getObjectByName('horse_body');
        const lancePivot = group.getObjectByName('lance_pivot');

        if (unit.state === 'attacking') {
          const thrust = Math.sin(time * 11);
          if (lancePivot) {
            lancePivot.position.z = 0.3 + thrust * 0.55;
            lancePivot.rotation.x = Math.PI / 3 - thrust * 0.25;
          }
          if (horse) {
            horse.rotation.x = Math.sin(time * 11) * 0.15;
            horse.position.y = 0.55 + Math.abs(Math.sin(time * 11)) * 0.12;
          }
        } else if (unit.state === 'moving') {
          if (horse) {
            horse.rotation.x = Math.sin(time * 13) * 0.14;
            horse.position.y = 0.55 + Math.abs(Math.sin(time * 13)) * 0.12;
          }
          if (lancePivot) {
            lancePivot.position.z = 0.3;
            lancePivot.rotation.x = Math.PI / 3 + Math.sin(time * 6) * 0.1;
          }
        } else {
          if (horse) {
            horse.rotation.x = 0;
            horse.position.y = 0.55;
          }
          if (lancePivot) {
            lancePivot.position.set(0.36, 1.0, 0.3);
            lancePivot.rotation.set(0, 0, 0);
          }
        }
        break;
      }

      case 'siege_unit': {
        const armPivot = group.getObjectByName('arm_pivot');
        if (!armPivot) break;

        if (unit.state === 'attacking') {
          const cycle = (time * 1.5) % 1.0;
          let angle = -Math.PI / 4;
          if (cycle < 0.6) {
            // Pull arm back to load
            angle = -Math.PI / 4 - (cycle / 0.6) * 0.45;
          } else if (cycle < 0.75) {
            // Violent launch snap forward!
            const snap = (cycle - 0.6) / 0.15;
            angle = -Math.PI / 4 - 0.45 + snap * 1.35;
          } else {
            // Settle arm back down
            const settle = (cycle - 0.75) / 0.25;
            angle = -Math.PI / 4 + 0.9 * (1.0 - settle);
          }
          armPivot.rotation.x = angle;
        } else {
          armPivot.rotation.x = -Math.PI / 4;
        }
        break;
      }

      case 'advanced_unit': {
        const halberdPivot = group.getObjectByName('halberd_pivot');
        const torso = group.getObjectByName('unit_torso');

        if (unit.state === 'attacking') {
          const cleave = Math.sin(time * 8);
          if (halberdPivot) {
            halberdPivot.rotation.x = cleave * 1.4;
            halberdPivot.position.y = 0.9 + Math.cos(time * 8) * 0.25;
          }
          if (torso) torso.rotation.y = cleave * 0.35;
        } else if (unit.state === 'moving') {
          if (halberdPivot) halberdPivot.rotation.x = Math.sin(time * 7) * 0.25;
          if (torso) torso.position.y = 0.6 + Math.abs(Math.sin(time * 8)) * 0.06;
        } else {
          if (halberdPivot) {
            halberdPivot.position.set(0.36, 0.9, 0.15);
            halberdPivot.rotation.set(0, 0, 0);
          }
          if (torso) {
            torso.position.y = 0.6 + Math.sin(time * 2) * 0.015;
            torso.rotation.set(0, 0, 0);
          }
        }
        break;
      }

      case 'dragon': {
        const leftWing = group.getObjectByName('left_wing');
        const rightWing = group.getObjectByName('right_wing');
        const dragonJaw = group.getObjectByName('dragon_jaw');
        const dragonNeck = group.getObjectByName('dragon_neck');
        const dragonTail = group.getObjectByName('dragon_tail');
        const flameEmitter = group.getObjectByName('flame_emitter');

        // Wings flap dynamically: faster flap while moving
        const flapRate = unit.state === 'moving' ? 0.016 : 0.011;
        const flap = Math.sin(now * flapRate) * 0.62;
        if (leftWing) {
          leftWing.rotation.z = flap;
          leftWing.rotation.y = Math.sin(now * flapRate * 0.5) * 0.18;
        }
        if (rightWing) {
          rightWing.rotation.z = -flap;
          rightWing.rotation.y = -Math.sin(now * flapRate * 0.5) * 0.18;
        }

        // Serpentine tail swaying in the slipstream
        if (dragonTail) {
          dragonTail.rotation.y = Math.sin(now * 0.005) * 0.35;
          dragonTail.rotation.z = Math.cos(now * 0.004) * 0.15;
        }

        if (unit.state === 'attacking') {
          // Open jaw wide & lunge neck toward target!
          if (dragonJaw) dragonJaw.rotation.x = Math.PI / 2.05 + 0.45;
          if (dragonNeck) dragonNeck.rotation.x = Math.PI / 4 + 0.3 + Math.sin(now * 0.012) * 0.1;
          if (flameEmitter) {
            const glowScale = 1.6 + Math.sin(now * 0.035) * 0.4;
            flameEmitter.scale.set(glowScale, glowScale, glowScale);
          }

          // Continuous Fire Breath Stream!
          const lastBreath = this.lastDragonBreathTime.get(unit.id) || 0;
          if (now - lastBreath > 110) {
            this.lastDragonBreathTime.set(unit.id, now);
            const targetPos = this.findEntityPosition(unit.targetEntityId, units, buildings);
            if (targetPos) {
              const emitterPos = new THREE.Vector3();
              if (flameEmitter) {
                flameEmitter.getWorldPosition(emitterPos);
              } else {
                emitterPos.set(group.position.x, group.position.y + 0.8, group.position.z);
              }
              this.spawnFireBreathParticle(emitterPos, targetPos);
            }
          }
        } else {
          // Relax jaw and neck to soaring posture
          if (dragonJaw) dragonJaw.rotation.x = Math.PI / 2.05;
          if (dragonNeck) dragonNeck.rotation.x = Math.PI / 4;
          if (flameEmitter) flameEmitter.scale.set(1.0, 1.0, 1.0);
        }
        break;
      }
    }
  }

  private findEntityPosition(
    id: string | undefined,
    units: UnitData[],
    buildings: BuildingData[]
  ): THREE.Vector3 | null {
    if (!id) return null;
    const u = units.find(unit => unit.id === id);
    if (u) {
      const mesh = this.unitMeshes.get(id);
      return mesh ? mesh.position.clone() : new THREE.Vector3(u.x, u.type === 'dragon' ? 2.8 : 0.5, u.y);
    }
    const b = buildings.find(bldg => bldg.id === id);
    if (b) {
      return new THREE.Vector3(b.x + b.width / 2, 1.0, b.y + b.height / 2);
    }
    return null;
  }

  private spawnFireBreathParticle(startPos: THREE.Vector3, targetPos: THREE.Vector3): void {
    const fireMesh = new THREE.Group();

    // Outer flame orb
    const outerGeom = new THREE.SphereGeometry(0.24, 6, 6);
    const outerMat = new THREE.MeshBasicMaterial({
      color: 0xff3b00,
      transparent: true,
      opacity: 0.85
    });
    const outer = new THREE.Mesh(outerGeom, outerMat);
    fireMesh.add(outer);

    // Inner incandescent white-hot core
    const innerGeom = new THREE.SphereGeometry(0.12, 5, 5);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0xfff066
    });
    const inner = new THREE.Mesh(innerGeom, innerMat);
    fireMesh.add(inner);

    fireMesh.position.copy(startPos);
    this.scene.add(fireMesh);

    // Slight turbulent spray jitter
    const jitterTarget = targetPos.clone().add(
      new THREE.Vector3(
        (Math.random() - 0.5) * 0.45,
        (Math.random() - 0.5) * 0.35,
        (Math.random() - 0.5) * 0.45
      )
    );

    this.visualProjectiles.push({
      mesh: fireMesh,
      startPos: startPos.clone(),
      targetPos: jitterTarget,
      arcHeight: 0.15,
      progress: 0,
      speed: 3.6,
      type: 'dragon_fire',
      onHit: () => {
        // Small ground splash/scorch puff
        this.spawnExplosion(jitterTarget, 0xff5500, 0.65);
      }
    });
  }

  private spawnExplosion(pos: THREE.Vector3, colorHex: number, maxRadius: number): void {
    // 1. Expanding fiery blast sphere
    const blastGeom = new THREE.SphereGeometry(maxRadius * 0.6, 7, 7);
    const blastMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.9
    });
    const blast = new THREE.Mesh(blastGeom, blastMat);
    blast.position.copy(pos);
    this.scene.add(blast);

    this.visualEffects.push({
      mesh: blast,
      createdAt: performance.now(),
      duration: 320,
      update: (t) => {
        const s = 0.5 + t * 1.8;
        blast.scale.set(s, s, s);
        blastMat.opacity = Math.max(0, 0.9 * (1.0 - t));
      }
    });

    // 2. Fiery ground scorch ring
    const ringGeom = new THREE.RingGeometry(0.2, maxRadius * 1.1, 16);
    ringGeom.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xff7700,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.position.set(pos.x, 0.06, pos.z);
    this.scene.add(ring);

    this.visualEffects.push({
      mesh: ring,
      createdAt: performance.now(),
      duration: 420,
      update: (t) => {
        const s = 0.6 + t * 1.2;
        ring.scale.set(s, s, s);
        ringMat.opacity = Math.max(0, 0.85 * (1.0 - t));
      }
    });
  }

  private spawnImpactSparks(pos: THREE.Vector3, count: number): void {
    const sparksGroup = new THREE.Group();
    sparksGroup.position.copy(pos);
    const sparkGeom = new THREE.SphereGeometry(0.06, 4, 4);
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffe066 });

    const velocities: THREE.Vector3[] = [];
    for (let i = 0; i < count; i++) {
      const spark = new THREE.Mesh(sparkGeom, sparkMat);
      sparksGroup.add(spark);
      velocities.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 2.5,
          Math.random() * 2.0 + 0.5,
          (Math.random() - 0.5) * 2.5
        )
      );
    }
    this.scene.add(sparksGroup);

    this.visualEffects.push({
      mesh: sparksGroup,
      createdAt: performance.now(),
      duration: 250,
      update: (t) => {
        for (let i = 0; i < sparksGroup.children.length; i++) {
          const child = sparksGroup.children[i];
          const v = velocities[i];
          child.position.x += v.x * 0.016;
          child.position.y += v.y * 0.016 - 0.05; // gravity
          child.position.z += v.z * 0.016;
          const s = Math.max(0, 1.0 - t);
          child.scale.set(s, s, s);
        }
      }
    });
  }

  public spawnAttackVisual(
    attackerId: string,
    targetId: string,
    units: UnitData[],
    buildings: BuildingData[]
  ): void {
    const targetPos = this.findEntityPosition(targetId, units, buildings);
    if (!targetPos) return;

    let attackerPos: THREE.Vector3 | null = null;
    let attackerType: string = 'basic_infantry';

    const u = units.find(unit => unit.id === attackerId);
    if (u) {
      attackerType = u.type;
      const mesh = this.unitMeshes.get(attackerId);
      attackerPos = mesh ? mesh.position.clone() : new THREE.Vector3(u.x, u.type === 'dragon' ? 2.8 : 0.5, u.y);
      if (u.type === 'dragon') attackerPos.y += 0.8;
    } else {
      const b = buildings.find(bldg => bldg.id === attackerId);
      if (b) {
        attackerType = b.type;
        attackerPos = new THREE.Vector3(b.x + b.width / 2, 3.2, b.y + b.height / 2);
      }
    }

    if (!attackerPos) return;

    if (attackerType === 'dragon') {
      // Multi-fireball burst stream!
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          this.spawnFireBreathParticle(attackerPos!, targetPos);
        }, i * 65);
      }
      this.spawnExplosion(targetPos, 0xff3300, 1.4);
    } else if (attackerType === 'ranged_infantry') {
      // Flying Arrow
      const arrowGroup = new THREE.Group();
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, 0.85, 4),
        new THREE.MeshStandardMaterial({ color: 0x78350f })
      );
      shaft.rotation.x = Math.PI / 2;
      arrowGroup.add(shaft);

      const tip = new THREE.Mesh(
        new THREE.ConeGeometry(0.06, 0.22, 4),
        new THREE.MeshStandardMaterial({ color: 0x94a3b8 })
      );
      tip.position.z = 0.48;
      tip.rotation.x = Math.PI / 2;
      arrowGroup.add(tip);

      const fletch = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.12, 0.18),
        new THREE.MeshStandardMaterial({ color: 0xef4444 })
      );
      fletch.position.z = -0.38;
      arrowGroup.add(fletch);

      arrowGroup.position.copy(attackerPos);
      this.scene.add(arrowGroup);

      this.visualProjectiles.push({
        mesh: arrowGroup,
        startPos: attackerPos.clone(),
        targetPos: targetPos.clone(),
        arcHeight: 1.8,
        progress: 0,
        speed: 2.2,
        type: 'arrow',
        onHit: () => {
          this.spawnImpactSparks(targetPos, 3);
        }
      });
    } else if (attackerType === 'siege_unit') {
      // Fiery Catapult Boulder
      const boulder = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.4, 0),
        new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 })
      );
      boulder.position.copy(attackerPos);
      this.scene.add(boulder);

      this.visualProjectiles.push({
        mesh: boulder,
        startPos: attackerPos.clone(),
        targetPos: targetPos.clone(),
        arcHeight: 4.8,
        progress: 0,
        speed: 1.3,
        type: 'boulder',
        onHit: () => {
          this.spawnExplosion(targetPos, 0xf97316, 1.8);
          this.spawnImpactSparks(targetPos, 8);
        }
      });
    } else if (attackerType === 'watchtower' || attackerType === 'fort' || attackerType === 'town_centre') {
      // Defensive Cannon / Heavy Bolt
      const bolt = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 1.2, 5),
        new THREE.MeshBasicMaterial({ color: 0xf59e0b })
      );
      bolt.position.copy(attackerPos);
      this.scene.add(bolt);

      this.visualProjectiles.push({
        mesh: bolt,
        startPos: attackerPos.clone(),
        targetPos: targetPos.clone(),
        arcHeight: 0.8,
        progress: 0,
        speed: 2.8,
        type: 'cannon',
        onHit: () => {
          this.spawnImpactSparks(targetPos, 5);
        }
      });
    } else {
      // Melee strike (swordsman, spearman, cavalry, vanguard, worker)
      this.spawnImpactSparks(targetPos, 6);
    }
  }

  public render(dt: number): void {
    // Animate order markers
    const now = performance.now();
    for (let i = this.orderMarkers.length - 1; i >= 0; i--) {
      const marker = this.orderMarkers[i];
      const elapsed = now - marker.createdAt;
      if (elapsed > marker.duration) {
        this.scene.remove(marker.mesh);
        this.orderMarkers.splice(i, 1);
      } else {
        const scale = 1.0 + (elapsed / marker.duration) * 0.8;
        marker.mesh.scale.set(scale, scale, scale);
        (marker.mesh.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1.0 - elapsed / marker.duration);
      }
    }

    // Animate visual projectiles (flying fire breath, arrows, boulders, cannons)
    for (let i = this.visualProjectiles.length - 1; i >= 0; i--) {
      const p = this.visualProjectiles[i];
      p.progress += p.speed * dt;
      if (p.progress >= 1.0) {
        p.progress = 1.0;
        if (p.onHit) p.onHit();
        this.scene.remove(p.mesh);
        this.visualProjectiles.splice(i, 1);
      } else {
        const t = p.progress;
        p.mesh.position.lerpVectors(p.startPos, p.targetPos, t);
        p.mesh.position.y += 4 * p.arcHeight * t * (1 - t);

        const nextT = Math.min(1.0, t + 0.03);
        const nextPos = new THREE.Vector3().lerpVectors(p.startPos, p.targetPos, nextT);
        nextPos.y += 4 * p.arcHeight * nextT * (1 - nextT);
        p.mesh.lookAt(nextPos);

        if (p.type === 'dragon_fire') {
          p.mesh.rotation.x += dt * 8;
          p.mesh.rotation.y += dt * 10;
          const s = 1.0 + Math.sin(t * 15) * 0.25;
          p.mesh.scale.set(s, s, s);
        } else if (p.type === 'boulder') {
          p.mesh.rotation.x += dt * 6;
          p.mesh.rotation.z += dt * 4;
        }
      }
    }

    // Animate visual effects (sparks, explosions, scorch rings)
    for (let i = this.visualEffects.length - 1; i >= 0; i--) {
      const eff = this.visualEffects[i];
      const elapsed = now - eff.createdAt;
      const t = elapsed / eff.duration;
      if (t >= 1.0) {
        this.scene.remove(eff.mesh);
        this.visualEffects.splice(i, 1);
      } else {
        if (eff.update) eff.update(t);
      }
    }

    // Animate building rotators (windmill sails, celestial astrolabe, saw blades)
    for (let i = 0; i < this.rotatorObjects.length; i++) {
      const rot = this.rotatorObjects[i];
      const bldgMesh = this.buildingMeshes.get(rot.bldgId);
      if (!bldgMesh || !bldgMesh.visible) continue;
      if (rot.axis === 'z') rot.obj.rotation.z += rot.speed * dt;
      else if (rot.axis === 'y') rot.obj.rotation.y += rot.speed * dt;
      else if (rot.axis === 'x') rot.obj.rotation.x += rot.speed * dt;
    }

    this.terrainMesh?.update(now * 0.001, dt);
    this.cameraController.update(dt);
    this.renderer.render(this.scene, this.camera);
  }
}
