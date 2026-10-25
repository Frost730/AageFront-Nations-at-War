import * as THREE from 'three';
import {
  MapTile,
  ResourceNodeData,
  UnitData,
  BuildingData,
  PlayerState,
  Vector2D,
  BuildingType,
  UnitType,
  BUILDING_DEFINITIONS
} from '@agefront/shared';
import { CameraController } from '../camera/cameraController.js';
import { TerrainMesh } from './terrainMesh.js';
import { getCloudShadowTexture } from './proceduralTextures.js';
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
  lastTrailPos?: THREE.Vector3;
}

interface VisualEffect {
  mesh: THREE.Object3D;
  createdAt: number;
  duration: number;
  update?: (progress: number) => void;
}


function createSelectionDecalTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const cx = 64;
  const cy = 64;

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(cx, cy, 54, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, 45, 0, Math.PI * 2);
  ctx.stroke();

  const pips = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
  pips.forEach(ang => {
    const px = cx + Math.cos(ang) * 54;
    const py = cy + Math.sin(ang) * 54;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 61);
  ctx.lineTo(cx - 7, cy - 50);
  ctx.lineTo(cx + 7, cy - 50);
  ctx.closePath();
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

function createScorchTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 58);
  grad.addColorStop(0, 'rgba(15, 10, 8, 0.95)');
  grad.addColorStop(0.35, 'rgba(38, 20, 10, 0.85)');
  grad.addColorStop(0.7, 'rgba(65, 35, 15, 0.45)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(64, 64, 60, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f97316';
  for (let i = 0; i < 16; i++) {
    const r = Math.random() * 32 + 5;
    const theta = Math.random() * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(64 + Math.cos(theta) * r, 64 + Math.sin(theta) * r, Math.random() * 1.5 + 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
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
  private cloudShadowMesh: THREE.Mesh | null = null;
  private cloudShadowTexture: THREE.CanvasTexture | null = null;
  private dustMotes: THREE.Points | null = null;
  private activeMapWidth: number = 240;
  private activeMapHeight: number = 240;

  private selectionDecalTexture: THREE.CanvasTexture | null = null;
  private scorchTexture: THREE.CanvasTexture | null = null;
  private groundScars: { mesh: THREE.Mesh; createdAt: number; maxLifetime: number }[] = [];
  private battlefieldRemains: { group: THREE.Group; createdAt: number; maxLifetime: number; baseElevation: number }[] = [];

  private healthBars: Map<string, THREE.Sprite> = new Map();
  private buildingStatusBars: Map<string, THREE.Sprite> = new Map();
  private healthBarLastHp: Map<string, number> = new Map();
  private buildingStatusLastState: Map<string, string> = new Map();
  private buildingStatusLastTime: Map<string, number> = new Map();
  private rotatorObjects: { bldgId: string; obj: THREE.Object3D; speed: number; axis: string }[] = [];
  private windObjects: {
    bldgId: string;
    obj: THREE.Object3D;
    type: 'wheat' | 'banner';
    baseRotX: number;
    baseRotY: number;
    baseRotZ: number;
    phase: number;
  }[] = [];
  public hemiLight: THREE.HemisphereLight;
  public sunLight: THREE.DirectionalLight;
  private townCenterNightLight: THREE.PointLight;
  private lanternMeshes: THREE.Mesh[] = [];
  private ambientGlowMultiplier: number = 1.0;

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
    this.scene.background = new THREE.Color(0x6b8ea8); // Soft historical daytime sky (Rise of Nations / AoE)
    this.scene.fog = new THREE.Fog(0x6b8ea8, 120, 280); // Crisp playable area with gentle horizon fade

    const aspect = window.innerWidth / window.innerHeight;
    // Age of Empires isometric telephoto FOV (32 degrees compresses perspective into crisp isometric orthographic look)
    this.camera = new THREE.PerspectiveCamera(32, aspect, 0.5, 500);
    this.cameraController = new CameraController(this.camera);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    // Cap pixel ratio to 1.25 to prevent 4K GPU fill-rate throttling on high-DPI displays
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    // Atmospheric Warm Natural Lighting (Age of Empires II style)
    this.hemiLight = new THREE.HemisphereLight(0xdceaf8, 0x485836, 0.95);
    this.scene.add(this.hemiLight);

    // North-West Sun casting crisp high-contrast shadows towards South-East (AoE style)
    this.sunLight = new THREE.DirectionalLight(0xfff8e8, 1.65);
    this.sunLight.position.set(-70, 110, -50);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 350;
    this.sunLight.shadow.camera.left = -140;
    this.sunLight.shadow.camera.right = 140;
    this.sunLight.shadow.camera.top = 140;
    this.sunLight.shadow.camera.bottom = -140;
    this.sunLight.shadow.bias = -0.0003;
    this.scene.add(this.sunLight);

    // Dynamic Settlement Night Hearth / Lantern point light
    this.townCenterNightLight = new THREE.PointLight(0xff9a3c, 0.0, 38, 1.8);
    this.townCenterNightLight.position.set(24, 4.5, 24);
    this.scene.add(this.townCenterNightLight);

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.cameraController.clampCameraToMap();
    });
  }

  public clearGameScene(): void {
        if (this.cloudShadowMesh) {
      this.scene.remove(this.cloudShadowMesh);
      this.cloudShadowMesh = null;
      this.cloudShadowTexture = null;
    }
    if (this.dustMotes) {
      this.scene.remove(this.dustMotes);
      this.dustMotes = null;
    }

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
    this.windObjects = [];
    this.lanternMeshes = [];

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
    this.activeMapWidth = width;
    this.activeMapHeight = height;

    // Drifting Cloud Shadows (MultiplyBlending layer over terrain and structures)
    const cloudTex = getCloudShadowTexture();
    const cloudGeom = new THREE.PlaneGeometry(width * 2.2, height * 2.2);
    cloudGeom.rotateX(-Math.PI / 2);
    cloudGeom.translate(width / 2, 0, height / 2);
    const cloudMat = new THREE.MeshBasicMaterial({
      map: cloudTex,
      transparent: true,
      blending: THREE.MultiplyBlending,
      depthWrite: false,
      opacity: 0.62
    });
    this.cloudShadowMesh = new THREE.Mesh(cloudGeom, cloudMat);
    this.cloudShadowMesh.position.y = 0.22;
    this.scene.add(this.cloudShadowMesh);
    this.cloudShadowTexture = cloudTex;

    // Atmospheric Sunlight Pollen / Dust Motes
    const moteCount = 160;
    const moteGeom = new THREE.BufferGeometry();
    const motePositions = new Float32Array(moteCount * 3);
    for (let i = 0; i < moteCount; i++) {
      motePositions[i * 3] = Math.random() * width;
      motePositions[i * 3 + 1] = Math.random() * 3.5 + 0.3;
      motePositions[i * 3 + 2] = Math.random() * height;
    }
    moteGeom.setAttribute('position', new THREE.BufferAttribute(motePositions, 3));
    const moteMat = new THREE.PointsMaterial({
      color: 0xfef08a,
      size: 0.12,
      transparent: true,
      opacity: 0.52,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.dustMotes = new THREE.Points(moteGeom, moteMat);
    this.scene.add(this.dustMotes);

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
          this.updateSelectionRing(unit.id, groundPos, 1.3, selectedIds.has(unit.id), unit.facingAngle || 0, unit.team === myTeam ? 0xfacc15 : 0xef4444);

          // Floating health bar above the soaring dragon
          const healthBarPos = new THREE.Vector3(group.position.x, group.position.y + 1.25, group.position.z);
          this.updateHealthBar(unit.id, healthBarPos, unit.hp, unit.maxHp, 1.8);
        } else {
          group.position.y = 0;

          if (unit.facingAngle !== undefined) {
            group.rotation.y = -unit.facingAngle + Math.PI / 2;
          }

          // Selection ring
          this.updateSelectionRing(unit.id, group.position, 0.75, selectedIds.has(unit.id), unit.facingAngle || 0, unit.team === myTeam ? 0xfacc15 : 0xef4444);

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
        this.spawnBattlefieldRemains(mesh.position.x, mesh.position.z, mesh.userData?.unitType);
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
          this.windObjects = this.windObjects.filter(w => w.bldgId !== bldg.id);
          this.lanternMeshes = this.lanternMeshes.filter(m => m.userData?.bldgId !== bldg.id);
        }
        const teamColor = playerColorMap.get(bldg.ownerId) || '#3b82f6';
        group = createBuildingModel(bldg, teamColor);
        group.userData = {
          isConstructed: bldg.isConstructed,
          width: bldg.width,
          height: bldg.height,
          buildingType: bldg.type
        };
        this.buildingMeshes.set(bldg.id, group);
        this.scene.add(group);

        // Cache rotators & wind-animated foliage/banners & lanterns for 0-overhead animation loop
        group.traverse((child: any) => {
          if (child.userData?.isRotator) {
            this.rotatorObjects.push({
              bldgId: bldg.id,
              obj: child,
              speed: child.userData.rotSpeed || 1.0,
              axis: child.userData.rotAxis || 'z'
            });
          } else if (child.userData?.isWindWheat) {
            this.windObjects.push({
              bldgId: bldg.id,
              obj: child,
              type: 'wheat',
              baseRotX: child.rotation.x,
              baseRotY: child.rotation.y,
              baseRotZ: child.rotation.z,
              phase: bldg.x * 2.1 + bldg.y * 1.7 + (child.userData.baseZ || 0) * 3.0
            });
          } else if (child.userData?.isWindBanner) {
            this.windObjects.push({
              bldgId: bldg.id,
              obj: child,
              type: 'banner',
              baseRotX: child.rotation.x,
              baseRotY: child.rotation.y,
              baseRotZ: child.rotation.z,
              phase: bldg.x * 1.5 + bldg.y * 1.2
            });
          } else if (child.userData?.isLantern) {
            child.userData.bldgId = bldg.id;
            this.lanternMeshes.push(child);
          }
        });
      }

      if (bldg.type === 'town_centre' && bldg.ownerId === myPlayerId) {
        this.townCenterNightLight.position.set(bldg.x + bldg.width / 2, 4.5, bldg.y + bldg.height / 2);
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

    // Remove destroyed buildings & simulate structural collapse debris
    for (const [id, mesh] of this.buildingMeshes.entries()) {
      if (!currentBldgIds.has(id)) {
        if (mesh.userData?.isConstructed) {
          this.spawnBuildingDestruction(
            mesh.position.x,
            mesh.position.z,
            mesh.userData?.width || 2,
            mesh.userData?.height || 2,
            mesh.userData?.buildingType || 'house'
          );
        }
        this.scene.remove(mesh);
        this.buildingMeshes.delete(id);
        this.removeSelectionRing(id);
        this.removeHealthBar(id);
        this.removeBuildingStatusBar(id);
        this.rotatorObjects = this.rotatorObjects.filter(r => r.bldgId !== id);
        this.windObjects = this.windObjects.filter(w => w.bldgId !== id);
        this.lanternMeshes = this.lanternMeshes.filter(m => m.userData?.bldgId !== id);
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

  private updateSelectionRing(id: string, pos: THREE.Vector3, radius: number, isSelected: boolean, facingAngle: number = 0, colorHex: number = 0xfacc15): void {
    let ring = this.selectionRings.get(id);
    if (isSelected) {
      if (!this.selectionDecalTexture) {
        this.selectionDecalTexture = createSelectionDecalTexture();
      }
      if (!ring) {
        const ringGeom = new THREE.PlaneGeometry(radius * 2.3, radius * 2.3);
        ringGeom.rotateX(-Math.PI / 2);
        const ringMat = new THREE.MeshBasicMaterial({
          map: this.selectionDecalTexture,
          color: colorHex,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.9,
          depthWrite: false
        });
        ring = new THREE.Mesh(ringGeom, ringMat);
        this.scene.add(ring);
        this.selectionRings.set(id, ring);
      }
      const groundElev = this.terrainMesh?.getElevationAt(pos.x, pos.z) || 0;
      ring.position.set(pos.x, groundElev + 0.04, pos.z);
      ring.rotation.y = -facingAngle + Math.PI / 2;
      const pulse = 0.82 + Math.sin(performance.now() * 0.005) * 0.12;
      (ring.material as THREE.MeshBasicMaterial).opacity = pulse;
      (ring.material as THREE.MeshBasicMaterial).color.setHex(colorHex);
      ring.visible = true;
    } else if (ring) {
      ring.visible = false;
    }
  }

  
  
  public spawnFloatingText(x: number, z: number, text: string, colorHex: string = '#facc15'): void {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    ctx.font = 'bold 32px "Cinzel", Georgia, serif';
    ctx.fillStyle = colorHex;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.shadowBlur = 6;
    ctx.fillText(text, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
    const sprite = new THREE.Sprite(mat);

    const groundElev = this.terrainMesh?.getElevationAt(x, z) || 0;
    const startY = groundElev + 1.6;
    sprite.position.set(x, startY, z);
    sprite.scale.set(2.4, 0.6, 1.0);

    this.scene.add(sprite);
    this.visualEffects.push({
      mesh: sprite,
      createdAt: performance.now(),
      duration: 1400,
      update: (t) => {
        sprite.position.y = startY + t * 1.2;
        mat.opacity = Math.max(0, 1.0 - t * t);
      }
    });
  }

  public spawnGroundScorch(x: number, z: number, radius: number = 1.0): void {
    if (!this.scorchTexture) {
      this.scorchTexture = createScorchTexture();
    }
    const groundElev = this.terrainMesh?.getElevationAt(x, z) || 0;
    const geom = new THREE.PlaneGeometry(radius * 2.2, radius * 2.2);
    geom.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      map: this.scorchTexture,
      transparent: true,
      opacity: 0.88,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(x, groundElev + 0.02, z);
    mesh.rotation.y = Math.random() * Math.PI * 2;
    this.scene.add(mesh);

    this.groundScars.push({
      mesh,
      createdAt: performance.now(),
      maxLifetime: 45000
    });

    if (this.groundScars.length > 100) {
      const oldest = this.groundScars.shift();
      if (oldest) this.scene.remove(oldest.mesh);
    }
  }

  public spawnBattlefieldRemains(x: number, z: number, unitType?: UnitType): void {
    const groundElev = this.terrainMesh?.getElevationAt(x, z) || 0;
    const group = new THREE.Group();
    group.position.set(x, groundElev + 0.015, z);
    group.rotation.y = Math.random() * Math.PI * 2;

    const stainGeom = new THREE.CircleGeometry(0.48, 12);
    stainGeom.rotateX(-Math.PI / 2);
    const stainMat = new THREE.MeshBasicMaterial({
      color: 0x220c0c,
      transparent: true,
      opacity: 0.65,
      depthWrite: false
    });
    const stainMesh = new THREE.Mesh(stainGeom, stainMat);
    group.add(stainMesh);

    const boneMat = new THREE.MeshStandardMaterial({
      color: 0xd8d4cb,
      roughness: 0.9,
      metalness: 0.1
    });

    const spineGeom = new THREE.CylinderGeometry(0.04, 0.04, 0.45, 6);
    spineGeom.rotateZ(Math.PI / 2);
    const spine = new THREE.Mesh(spineGeom, boneMat);
    spine.position.set(0, 0.04, 0);
    group.add(spine);

    for (let r = -2; r <= 2; r++) {
      const ribGeom = new THREE.TorusGeometry(0.09, 0.02, 4, 8, Math.PI);
      ribGeom.rotateX(Math.PI / 2);
      const rib = new THREE.Mesh(ribGeom, boneMat);
      rib.position.set(r * 0.07, 0.05, 0);
      group.add(rib);
    }

    const skullGeom = new THREE.BoxGeometry(0.12, 0.11, 0.14);
    const skull = new THREE.Mesh(skullGeom, boneMat);
    skull.position.set(0.3, 0.06, 0);
    group.add(skull);

    const weaponMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      metalness: 0.8,
      roughness: 0.4
    });
    const shaftMat = new THREE.MeshStandardMaterial({
      color: 0x78350f,
      roughness: 0.9
    });

    if (unitType === 'spearman') {
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.7, 5), shaftMat);
      shaft.rotateZ(Math.PI / 2 - 0.2);
      shaft.position.set(-0.1, 0.03, 0.22);
      group.add(shaft);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.14, 4), weaponMat);
      tip.rotateZ(-Math.PI / 2);
      tip.position.set(0.28, 0.03, 0.26);
      group.add(tip);
    } else {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.02, 0.06), weaponMat);
      blade.position.set(-0.05, 0.03, 0.22);
      group.add(blade);
      const crossguard = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.14), weaponMat);
      crossguard.position.set(0.14, 0.03, 0.22);
      group.add(crossguard);
    }

    this.scene.add(group);
    this.battlefieldRemains.push({
      group,
      createdAt: performance.now(),
      maxLifetime: 60000,
      baseElevation: groundElev
    });

    if (this.battlefieldRemains.length > 80) {
      const oldest = this.battlefieldRemains.shift();
      if (oldest) this.scene.remove(oldest.group);
    }
  }

  // Structural collapse simulation: tumbling masonry blocks, shattered beams, and billowing dust clouds
  public spawnBuildingDestruction(
    x: number,
    z: number,
    width: number,
    height: number,
    buildingType: string
  ): void {
    const groundElev = this.terrainMesh?.getElevationAt(x, z) || 0;
    const size = Math.max(width, height);

    // 1. Blackened scorch foundation crater
    this.spawnGroundScorch(x, z, size * 0.85);

    // 2. Shockwave blast & fiery collapse explosion
    this.spawnExplosion(new THREE.Vector3(x, groundElev + 1.2, z), 0xf97316, size * 1.15);

    // 3. Volumetric Billowing Mortar & Masonry Dust Clouds
    const dustCount = Math.min(18, Math.max(8, Math.round(size * 4)));
    const dustGeom = new THREE.DodecahedronGeometry(0.55, 0);
    const dustColors = [0xa8a29e, 0x78716c, 0xd6d3d1, 0x57534e];

    for (let i = 0; i < dustCount; i++) {
      const dustMat = new THREE.MeshBasicMaterial({
        color: dustColors[i % dustColors.length],
        transparent: true,
        opacity: 0.82,
        depthWrite: false
      });
      const dust = new THREE.Mesh(dustGeom, dustMat);
      const angle = (i / dustCount) * Math.PI * 2 + Math.random() * 0.5;
      const dist = Math.random() * size * 0.45;
      const startX = x + Math.cos(angle) * dist;
      const startZ = z + Math.sin(angle) * dist;
      const startY = groundElev + Math.random() * 0.8 + 0.3;
      dust.position.set(startX, startY, startZ);
      this.scene.add(dust);

      const expandRate = 1.4 + Math.random() * 1.2;
      const riseSpeed = 0.6 + Math.random() * 0.7;
      const duration = 1600 + Math.random() * 600;

      this.visualEffects.push({
        mesh: dust,
        createdAt: performance.now(),
        duration,
        update: (t) => {
          const s = 0.6 + t * expandRate * size * 0.7;
          dust.scale.set(s, s, s);
          dust.position.y = startY + t * riseSpeed;
          dustMat.opacity = Math.max(0, 0.82 * (1.0 - t * t));
        }
      });
    }

    // 4. Structural Collapse Masonry Blocks & Timber Debris Group
    const debrisGroup = new THREE.Group();
    debrisGroup.position.set(x, groundElev, z);

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9 });
    const darkStoneMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.95 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.85 });
    const tileMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.8 });

    const debrisPieces: {
      mesh: THREE.Mesh;
      vel: THREE.Vector3;
      rotVel: THREE.Vector3;
      groundY: number;
      settled: boolean;
    }[] = [];

    const pieceCount = Math.min(24, Math.max(12, Math.round(size * 5)));
    for (let i = 0; i < pieceCount; i++) {
      let geom: THREE.BufferGeometry;
      let mat: THREE.Material;
      const pieceKind = i % 3;

      if (pieceKind === 0) {
        // Ashlar masonry stone block
        const bw = 0.3 + Math.random() * 0.25;
        const bh = 0.2 + Math.random() * 0.2;
        const bd = 0.3 + Math.random() * 0.3;
        geom = new THREE.BoxGeometry(bw, bh, bd);
        mat = i % 2 === 0 ? stoneMat : darkStoneMat;
      } else if (pieceKind === 1) {
        // Shattered timber rafter / beam
        const bw = 0.12 + Math.random() * 0.08;
        const bl = 0.7 + Math.random() * 0.8;
        geom = new THREE.BoxGeometry(bw, bw, bl);
        mat = woodMat;
      } else {
        // Slate or terracotta roof tile chunk
        geom = new THREE.BoxGeometry(0.32, 0.08, 0.32);
        mat = tileMat;
      }

      const mesh = new THREE.Mesh(geom, mat);
      const px = (Math.random() - 0.5) * (width * 0.8);
      const pz = (Math.random() - 0.5) * (height * 0.8);
      const py = Math.random() * 1.8 + 0.6;
      mesh.position.set(px, py, pz);

      mesh.castShadow = true;
      mesh.receiveShadow = true;
      debrisGroup.add(mesh);

      debrisPieces.push({
        mesh,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 4.2,
          Math.random() * 3.5 + 1.8,
          (Math.random() - 0.5) * 4.2
        ),
        rotVel: new THREE.Vector3(
          (Math.random() - 0.5) * 12,
          (Math.random() - 0.5) * 12,
          (Math.random() - 0.5) * 12
        ),
        groundY: 0.08 + Math.random() * 0.08,
        settled: false
      });
    }

    this.scene.add(debrisGroup);

    // Debris tumbling physics update
    const physicsDuration = 1400;
    this.visualEffects.push({
      mesh: debrisGroup,
      createdAt: performance.now(),
      duration: physicsDuration,
      update: (t) => {
        const dtStep = 0.016;
        for (let j = 0; j < debrisPieces.length; j++) {
          const p = debrisPieces[j];
          if (p.settled) continue;

          p.vel.y -= 16.0 * dtStep; // gravity
          p.mesh.position.addScaledVector(p.vel, dtStep);
          p.mesh.rotation.x += p.rotVel.x * dtStep;
          p.mesh.rotation.y += p.rotVel.y * dtStep;
          p.mesh.rotation.z += p.rotVel.z * dtStep;

          if (p.mesh.position.y <= p.groundY) {
            p.mesh.position.y = p.groundY;
            p.vel.set(0, 0, 0);
            p.rotVel.set(0, 0, 0);
            p.settled = true;
          }
        }
      }
    });

    // Register settled ruins as persistent battlefield remains (sink & fade over 45s)
    this.battlefieldRemains.push({
      group: debrisGroup,
      createdAt: performance.now(),
      maxLifetime: 45000,
      baseElevation: groundElev
    });

    if (this.battlefieldRemains.length > 80) {
      const oldest = this.battlefieldRemains.shift();
      if (oldest) this.scene.remove(oldest.group);
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

    // In Age of Empires, overhead progress indicators appear ONLY during active construction, active recruitment/research, or damage
    const isUnderConstruction = !bldg.isConstructed;
    const hasQueue = bldg.productionQueue && bldg.productionQueue.length > 0;
    const isDamaged = bldg.hp < bldg.maxHp;

    const shouldShow = isUnderConstruction || hasQueue || isDamaged;

    if (!shouldShow) {
      this.removeBuildingStatusBar(bldg.id);
      return;
    }

    let sprite = this.buildingStatusBars.get(bldg.id);
    if (!sprite) {
      const canvas = document.createElement('canvas');
      canvas.width = 180;
      canvas.height = 46;
      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;
      const mat = new THREE.SpriteMaterial({ map: texture, depthTest: false });
      sprite = new THREE.Sprite(mat);
      sprite.scale.set(3.4, 0.87, 1);
      this.scene.add(sprite);
      this.buildingStatusBars.set(bldg.id, sprite);
    }

    const heightOffset = bldg.type === 'town_centre' ? 4.6 : (bldg.type === 'fort' || bldg.type === 'watchtower') ? 4.2 : (bldg.type === 'farm') ? 2.2 : 3.5;
    sprite.position.set(pos.x, pos.y + heightOffset, pos.z);

    // Throttle canvas texture re-draws (10 FPS or on state change)
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
    ctx.clearRect(0, 0, 180, 46);

    // 1. Aged Deckled Parchment Card Background (AoE theme)
    const cardGrad = ctx.createLinearGradient(0, 0, 0, 46);
    cardGrad.addColorStop(0, '#fffbf0');
    cardGrad.addColorStop(0.5, '#edd8a8');
    cardGrad.addColorStop(1, '#d8b975');
    ctx.fillStyle = cardGrad;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(0, 0, 180, 46, 5);
    else ctx.rect(0, 0, 180, 46);
    ctx.fill();

    // 2. Antique Gilded Bronze Outer Border
    ctx.lineWidth = isSelected ? 2.5 : 1.8;
    ctx.strokeStyle = isSelected ? '#b45309' : '#8c6a34';
    ctx.stroke();

    // 3. Four Iron Corner Rivets
    const rivets = [[5, 5], [175, 5], [5, 41], [175, 41]];
    rivets.forEach(([rx, ry]) => {
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(rx, ry, 2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Determine state, title, progress fill, and colors
    let stateLabel = '';
    let percentText = '';
    let fillGradStart = '#b91c1c';
    let fillGradEnd = '#6b0e0e';
    let progress = 0;

    if (isUnderConstruction) {
      stateLabel = '🔨 RAISING STRUCTURE';
      progress = Math.min(1.0, Math.max(0, bldg.constructionProgress / 100));
      percentText = `${Math.floor(bldg.constructionProgress)}%`;
      fillGradStart = '#d97706';
      fillGradEnd = '#92400e';
    } else if (hasQueue) {
      const item = bldg.productionQueue[0];
      const itemName = item.itemType.replace('_', ' ').toUpperCase();
      const countSuffix = bldg.productionQueue.length > 1 ? ` (+${bldg.productionQueue.length - 1})` : '';
      stateLabel = `⚜️ ${itemName}${countSuffix}`;
      progress = Math.min(1.0, Math.max(0, item.progress / 100));
      percentText = `${Math.floor(item.progress)}%`;
      fillGradStart = '#b91c1c';
      fillGradEnd = '#6b0e0e';
    } else if (isDamaged) {
      stateLabel = '🛡️ FORTIFICATION INTEGRITY';
      progress = Math.min(1.0, Math.max(0, bldg.hp / bldg.maxHp));
      percentText = `${Math.ceil(bldg.hp)}/${bldg.maxHp}`;
      fillGradStart = progress > 0.5 ? '#15803d' : progress > 0.25 ? '#ca8a04' : '#b91c1c';
      fillGradEnd = progress > 0.5 ? '#14532d' : progress > 0.25 ? '#854d0e' : '#7f1d1d';
    }

    // 4. Header Label Text (Classical Roman Serif Typography)
    ctx.font = '800 10.5px "Cinzel", Georgia, serif';
    ctx.fillStyle = '#381c08'; // Deep antique walnut
    ctx.fillText(stateLabel, 10, 16);

    // 5. Percent / Status Badge Text
    ctx.font = '800 10.5px "Cinzel", Georgia, serif';
    ctx.fillStyle = '#854d0e';
    const textWidth = ctx.measureText(percentText).width;
    ctx.fillText(percentText, 170 - textWidth, 16);

    // 6. Main Progress Bar Trough (Carved dark walnut wood)
    const barY = 22;
    const barH = 14;
    const barW = 158;

    ctx.fillStyle = '#261307';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(11, barY, barW, barH, 3);
    else ctx.rect(11, barY, barW, barH);
    ctx.fill();

    // Trough Bronze Border
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#8c6a34';
    ctx.stroke();

    // 7. Progress Bar Fill (Royal Crimson / Amber Gold)
    const fillW = Math.max(2, Math.floor(barW * progress));
    const fillGrad = ctx.createLinearGradient(11, barY, 11, barY + barH);
    fillGrad.addColorStop(0, fillGradStart);
    fillGrad.addColorStop(1, fillGradEnd);
    ctx.fillStyle = fillGrad;

    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(11, barY, fillW, barH, 3);
    else ctx.rect(11, barY, fillW, barH);
    ctx.fill();

    // Beveled gold top highlight lip on progress bar
    ctx.fillStyle = 'rgba(254, 240, 138, 0.45)';
    ctx.fillRect(11, barY, fillW, 2);

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

    // Movement & Combat Range Evaluation
    const hasPath = Boolean(unit.path && unit.path.length > 0);
    const isMoving = unit.state === 'moving' || hasPath;

    // Check if within genuine combat range of current target
    let inRangeOfTarget = false;
    if (unit.targetEntityId) {
      const targetPos = this.findEntityPosition(unit.targetEntityId, units, buildings);
      if (targetPos) {
        const d = Math.hypot(targetPos.x - group.position.x, targetPos.z - group.position.z);
        const maxRange = unit.type === 'siege_unit' ? 12.0 : unit.type === 'dragon' ? 10.0 : unit.type === 'ranged_infantry' ? 8.5 : 2.5;
        inRangeOfTarget = d <= maxRange;
      }
    }

    const isAttacking = unit.state === 'attacking' && !isMoving && inRangeOfTarget;

    // Standard Human Stride & March helpers
    const lLeg = group.getObjectByName('left_leg');
    const rLeg = group.getObjectByName('right_leg');
    const lArm = group.getObjectByName('left_arm');
    const torso = group.getObjectByName('unit_torso');

    const isHumanoid = unit.type !== 'cavalry' && unit.type !== 'scout' && unit.type !== 'siege_unit' && unit.type !== 'dragon';

    // Universal Humanoid Movement Leg March Animation (Age of Empires II: DE)
    if (isHumanoid) {
      if (isMoving) {
        const strideRate = 9.5;
        const stride = Math.sin(time * strideRate);
        if (lLeg) lLeg.rotation.x = stride * 0.62;
        if (rLeg) rLeg.rotation.x = -stride * 0.62;
        if (lArm) lArm.rotation.x = -stride * 0.45;
        if (torso) {
          const baseTorsoY = unit.type === 'advanced_unit' ? 0.62 : unit.type === 'spearman' ? 0.5 : 0.48;
          torso.position.y = baseTorsoY + Math.abs(Math.sin(time * strideRate)) * 0.045;
          torso.rotation.y = stride * 0.09;
          torso.rotation.z = Math.cos(time * strideRate * 0.5) * 0.025;
        }
      } else if (!isAttacking && unit.state !== 'gathering') {
        // Natural idle planted footing & gentle breathing
        if (lLeg) lLeg.rotation.x = 0;
        if (rLeg) rLeg.rotation.x = 0;
        if (lArm) lArm.rotation.x = 0;
        if (torso) {
          const baseTorsoY = unit.type === 'advanced_unit' ? 0.62 : unit.type === 'spearman' ? 0.5 : 0.48;
          torso.position.y = baseTorsoY + Math.sin(time * 2.2) * 0.012;
          torso.rotation.set(0, 0, 0);
        }
      }
    }

    switch (unit.type) {
      case 'worker': {
        const toolPivot = group.getObjectByName('tool_pivot');
        if (!toolPivot) break;

        if (unit.state === 'gathering') {
          // Detect resource type or target to perform authentic AoE gathering actions
          const resType = (unit as any).carriedResourceType || 'wood';
          if (resType === 'wood') {
            // Authentic AoE Lumberjack Axe Chop: 2-stage windup and overhead down-stroke
            const chopCycle = (time * 2.2) % 1.0;
            if (chopCycle < 0.45) {
              // High windup overhead
              const p = chopCycle / 0.45;
              toolPivot.rotation.x = -0.2 - p * 1.25;
              if (torso) {
                torso.rotation.x = -p * 0.15;
                torso.position.y = 0.45 + p * 0.04;
              }
            } else if (chopCycle < 0.6) {
              // Violent down-stroke into timber trunk!
              const p = (chopCycle - 0.45) / 0.15;
              toolPivot.rotation.x = -1.45 + p * 2.4;
              if (torso) {
                torso.rotation.x = -0.15 + p * 0.35;
                torso.position.y = 0.49 - p * 0.08;
              }
            } else {
              // Impact recoil & recovery
              const p = (chopCycle - 0.6) / 0.4;
              toolPivot.rotation.x = 0.95 - p * 1.15;
              if (torso) {
                torso.rotation.x = 0.2 * (1.0 - p);
                torso.position.y = 0.41 + p * 0.04;
              }
            }
          } else if (resType === 'food') {
            // Forager / Farmer Sickle Action: stooping to harvest crops
            const farmCycle = Math.sin(time * 6);
            if (torso) {
              torso.position.y = 0.34 + farmCycle * 0.03;
              torso.rotation.x = 0.4 + farmCycle * 0.08;
            }
            toolPivot.rotation.x = 0.4 + farmCycle * 0.5;
            toolPivot.rotation.z = Math.cos(time * 6) * 0.3;
          } else {
            // Stone / Gold Mining: Diagonal pickaxe driving stroke
            const mineCycle = (time * 2.5) % 1.0;
            if (mineCycle < 0.5) {
              toolPivot.rotation.x = -0.2 - (mineCycle / 0.5) * 1.1;
              toolPivot.rotation.z = -(mineCycle / 0.5) * 0.25;
            } else {
              const strike = (mineCycle - 0.5) / 0.5;
              toolPivot.rotation.x = -1.3 + strike * 2.2;
              toolPivot.rotation.z = -0.25 + strike * 0.25;
            }
          }
        } else if (unit.state === 'building' || unit.state === 'repairing') {
          // Authentic AoE Villager Double-Tap Hammer Rhythm ("tink-tink... pause... tink-tink")
          const hammerCycle = (time * 3.5) % 2.0;
          let hammerAngle = -0.3;
          if (hammerCycle < 0.3) {
            hammerAngle = -0.3 + Math.sin(hammerCycle / 0.3 * Math.PI) * 0.95;
          } else if (hammerCycle > 0.4 && hammerCycle < 0.7) {
            hammerAngle = -0.3 + Math.sin((hammerCycle - 0.4) / 0.3 * Math.PI) * 0.95;
          }
          toolPivot.rotation.x = hammerAngle;
          if (torso) torso.position.y = 0.45 + (hammerAngle > 0.2 ? -0.04 : 0);
        } else if (isAttacking) {
          // Aggressive improvised axe slash
          const slash = Math.sin(time * 12);
          toolPivot.rotation.x = slash * 1.25;
          if (torso) torso.rotation.y = slash * 0.22;
        } else if (isMoving) {
          toolPivot.rotation.x = Math.sin(time * 8) * 0.25;
          // When carrying resource bundle/basket, lean forward with weight
          if (torso && (unit as any).carriedResourceAmount > 0) {
            torso.rotation.x = 0.12;
          }
        } else {
          toolPivot.rotation.set(0, 0, 0);
        }
        break;
      }

      case 'basic_infantry': {
        const swordPivot = group.getObjectByName('sword_pivot');
        const shieldPivot = group.getObjectByName('shield_pivot');

        if (isAttacking) {
          // Authentic AoE 3-Phase Sword Slash & Shield Defense
          const slashCycle = (time * 2.2) % 1.0;
          if (slashCycle < 0.35) {
            // Windup: raises sword, braces shield to chin
            const p = slashCycle / 0.35;
            if (swordPivot) {
              swordPivot.rotation.x = -p * 1.15;
              swordPivot.rotation.y = -p * 0.45;
            }
            if (shieldPivot) {
              shieldPivot.position.z = 0.12 + p * 0.1;
              shieldPivot.rotation.y = 0.35;
            }
            if (torso) torso.rotation.y = -p * 0.28;
          } else if (slashCycle < 0.58) {
            // Explosive downward diagonal cut!
            const p = (slashCycle - 0.35) / 0.23;
            if (swordPivot) {
              swordPivot.rotation.x = -1.15 + p * 2.45;
              swordPivot.rotation.y = -0.45 + p * 0.95;
            }
            if (shieldPivot) shieldPivot.position.z = 0.22;
            if (torso) {
              torso.rotation.y = -0.28 + p * 0.65;
              torso.position.z = p * 0.12;
            }
          } else {
            // Recovery back to guard
            const p = (slashCycle - 0.58) / 0.42;
            if (swordPivot) {
              swordPivot.rotation.x = 1.3 * (1.0 - p);
              swordPivot.rotation.y = 0.5 * (1.0 - p);
            }
            if (shieldPivot) shieldPivot.position.z = 0.22 - p * 0.1;
            if (torso) {
              torso.rotation.y = 0.37 * (1.0 - p);
              torso.position.z = 0.12 * (1.0 - p);
            }
          }
        } else if (unit.state === 'moving') {
          if (swordPivot) swordPivot.rotation.x = Math.sin(time * 9.5) * 0.3;
          if (shieldPivot) shieldPivot.position.z = 0.12;
        } else {
          if (swordPivot) swordPivot.rotation.set(0, 0, 0);
          if (shieldPivot) {
            shieldPivot.position.set(-0.3, 0.54, 0.1);
            shieldPivot.rotation.set(0, 0, 0);
          }
        }
        break;
      }

      case 'spearman': {
        const pikePivot = group.getObjectByName('pike_pivot');

        if (isAttacking) {
          // Authentic AoE Phalanx Pike Thrust
          const thrustCycle = (time * 2.0) % 1.0;
          if (thrustCycle < 0.3) {
            // Coil back
            const p = thrustCycle / 0.3;
            if (pikePivot) pikePivot.position.z = 0.15 - p * 0.28;
            if (torso) torso.position.z = -p * 0.1;
          } else if (thrustCycle < 0.52) {
            // Deep lunging forward thrust!
            const p = (thrustCycle - 0.3) / 0.22;
            if (pikePivot) {
              pikePivot.position.z = -0.13 + p * 1.05;
              pikePivot.rotation.x = Math.PI / 18 - p * 0.08;
            }
            if (torso) torso.position.z = -0.1 + p * 0.3;
            if (lLeg) lLeg.rotation.x = p * 0.42;
            if (rLeg) rLeg.rotation.x = -p * 0.42;
          } else {
            // Retract
            const p = (thrustCycle - 0.52) / 0.48;
            if (pikePivot) {
              pikePivot.position.z = 0.92 - p * 0.77;
              pikePivot.rotation.x = Math.PI / 18;
            }
            if (torso) torso.position.z = 0.2 * (1.0 - p);
            if (lLeg) lLeg.rotation.x = 0.42 * (1.0 - p);
            if (rLeg) rLeg.rotation.x = -0.42 * (1.0 - p);
          }
        } else if (isMoving) {
          if (pikePivot) {
            // Held upright in march
            pikePivot.position.set(0.28, 0.6, 0.15);
            pikePivot.rotation.x = Math.PI / 16 + Math.sin(time * 9.5) * 0.08;
          }
        } else {
          if (pikePivot) {
            pikePivot.position.set(0.28, 0.6, 0.15);
            pikePivot.rotation.set(0, 0, 0);
          }
        }
        break;
      }

      case 'ranged_infantry': {
        const bowPivot = group.getObjectByName('bow_pivot');

        if (isAttacking) {
          // Authentic AoE 4-Phase Archery Sequence (Nock -> Draw -> Hold -> Loose)
          const archerCycle = (time * 1.8) % 1.0;
          if (archerCycle < 0.42) {
            // Phase 1: Draw string back to cheek, torso turns sideways into firing stance
            const p = archerCycle / 0.42;
            if (bowPivot) {
              bowPivot.position.z = 0.18 - p * 0.25;
              bowPivot.rotation.x = -p * (Math.PI / 9);
            }
            if (torso) torso.rotation.y = p * 0.45;
          } else if (archerCycle < 0.65) {
            // Phase 2: Steady aim at target with tense bowstring
            if (bowPivot) {
              bowPivot.position.z = -0.07;
              bowPivot.rotation.x = -Math.PI / 9;
            }
            if (torso) torso.rotation.y = 0.45;
          } else if (archerCycle < 0.78) {
            // Phase 3: Loose / Release! Bow kicks forward with recoil
            const p = (archerCycle - 0.65) / 0.13;
            if (bowPivot) {
              bowPivot.position.z = -0.07 + p * 0.18;
              bowPivot.rotation.x = -Math.PI / 9 + p * 0.1;
            }
            if (torso) torso.rotation.y = 0.45 - p * 0.2;
          } else {
            // Phase 4: Re-nock arrow from hip quiver
            const p = (archerCycle - 0.78) / 0.22;
            if (bowPivot) {
              bowPivot.position.z = 0.11 + p * 0.07;
              bowPivot.rotation.x = 0;
            }
            if (torso) torso.rotation.y = 0.25 * (1.0 - p);
          }
        } else if (isMoving) {
          if (bowPivot) {
            bowPivot.position.set(0.28, 0.55, 0.18);
            bowPivot.rotation.x = Math.sin(time * 9.5) * 0.15;
          }
        } else {
          if (bowPivot) {
            bowPivot.position.set(0.28, 0.55, 0.18);
            bowPivot.rotation.set(0, 0, 0);
          }
        }
        break;
      }

      case 'cavalry':
      case 'scout': {
        const horse = group.getObjectByName('horse_body');
        const horseNeck = group.getObjectByName('horse_neck');
        const lancePivot = group.getObjectByName('lance_pivot');
        const legFL = group.getObjectByName('horse_leg_fl');
        const legFR = group.getObjectByName('horse_leg_fr');
        const legBL = group.getObjectByName('horse_leg_bl');
        const legBR = group.getObjectByName('horse_leg_br');

        const baseHorseY = unit.type === 'cavalry' ? 0.58 : 0.52;

        if (unit.state === 'attacking') {
          // Warhorse Rearing Up & Heavy Mounted Lance Thrust
          const rearCycle = Math.sin(time * 9);
          if (horse) {
            horse.rotation.x = -0.32 + rearCycle * 0.15;
            horse.position.y = baseHorseY + 0.18 + Math.max(0, rearCycle) * 0.1;
          }
          if (horseNeck) horseNeck.rotation.x = -Math.PI / 6 - 0.2;
          if (lancePivot) {
            lancePivot.position.z = 0.35 + rearCycle * 0.55;
            lancePivot.rotation.x = Math.PI / 3 - rearCycle * 0.3;
          }
          // Front hooves flail slightly when rearing
          if (legFL) legFL.rotation.x = 0.4 + rearCycle * 0.25;
          if (legFR) legFR.rotation.x = 0.2 - rearCycle * 0.25;
          if (legBL) legBL.rotation.x = -0.3;
          if (legBR) legBR.rotation.x = -0.3;
        } else if (unit.state === 'moving') {
          // Authentic 4-Beat Equine Gallop Cadence
          const gallop = time * 14.0;
          const strideL = Math.sin(gallop);
          const strideR = Math.sin(gallop + 0.6);

          if (legFL) legFL.rotation.x = strideL * 0.72;
          if (legFR) legFR.rotation.x = strideR * 0.72;
          if (legBL) legBL.rotation.x = -strideL * 0.72;
          if (legBR) legBR.rotation.x = -strideR * 0.72;

          if (horse) {
            horse.position.y = baseHorseY + Math.abs(Math.sin(gallop)) * 0.14;
            horse.rotation.x = Math.sin(gallop) * 0.1;
          }
          if (horseNeck) {
            horseNeck.rotation.x = -Math.PI / 6 + Math.sin(gallop * 2) * 0.12;
          }
          if (lancePivot) {
            lancePivot.position.set(0.38, 1.1, 0.35);
            lancePivot.rotation.x = Math.PI / 3.2 + Math.sin(time * 7) * 0.08;
          }
        } else {
          // Standing idle horse
          if (horse) {
            horse.rotation.x = 0;
            horse.position.y = baseHorseY;
          }
          if (horseNeck) horseNeck.rotation.x = -Math.PI / 6 + Math.sin(time * 2.0) * 0.04;
          if (lancePivot) {
            lancePivot.position.set(0.38, 1.1, 0.35);
            lancePivot.rotation.set(0, 0, 0);
          }
          if (legFL) legFL.rotation.x = 0;
          if (legFR) legFR.rotation.x = 0;
          if (legBL) legBL.rotation.x = 0;
          if (legBR) legBR.rotation.x = 0;
        }
        break;
      }

      case 'siege_unit': {
        const armPivot = group.getObjectByName('arm_pivot');
        const chassis = group.getObjectByName('siege_chassis');
        const wheelFL = group.getObjectByName('wheel_fl');
        const wheelFR = group.getObjectByName('wheel_fr');
        const wheelBL = group.getObjectByName('wheel_bl');
        const wheelBR = group.getObjectByName('wheel_br');

        if (isMoving) {
          // Continuous 4-wheel rotation when rolling across battlefield
          const rollRate = dt * 6.5;
          [wheelFL, wheelFR, wheelBL, wheelBR].forEach(w => {
            if (w) w.rotation.x += rollRate;
          });
          if (armPivot) armPivot.rotation.x = -Math.PI / 4.2 + Math.sin(time * 8) * 0.05;
          if (chassis) chassis.position.y = 0.32 + Math.sin(time * 12) * 0.015;
        } else if (isAttacking) {
          // Authentic AoE Mangonel / Onager Launch & Recoil
          const launchCycle = (time * 1.4) % 1.0;
          if (launchCycle < 0.55) {
            // Arm winching back down
            const p = launchCycle / 0.55;
            if (armPivot) armPivot.rotation.x = -Math.PI / 4.2 - p * 0.45;
            if (chassis) chassis.position.z = 0;
          } else if (launchCycle < 0.72) {
            // Explosive release! Arm snaps forward 125° and slams crossbeam
            const p = (launchCycle - 0.55) / 0.17;
            if (armPivot) armPivot.rotation.x = -Math.PI / 4.2 - 0.45 + p * 1.5;
            // Massive chassis recoil backwards!
            if (chassis) {
              chassis.position.z = -p * 0.18;
              chassis.rotation.x = -p * 0.08;
            }
            [wheelFL, wheelFR, wheelBL, wheelBR].forEach(w => {
              if (w) w.rotation.x -= p * 0.2;
            });
          } else {
            // Recoil settling
            const p = (launchCycle - 0.72) / 0.28;
            if (armPivot) armPivot.rotation.x = 0.8 - p * (0.8 + Math.PI / 4.2);
            if (chassis) {
              chassis.position.z = -0.18 * (1.0 - p);
              chassis.rotation.x = -0.08 * (1.0 - p);
            }
          }
        } else {
          if (armPivot) armPivot.rotation.x = -Math.PI / 4.2;
          if (chassis) {
            chassis.position.set(0, 0.32, 0);
            chassis.rotation.set(0, 0, 0);
          }
        }
        break;
      }

      case 'advanced_unit': {
        const halberdPivot = group.getObjectByName('halberd_pivot');

        if (isAttacking) {
          // Authentic AoE Champion Two-Handed Halberd Cleave
          const cleaveCycle = (time * 1.9) % 1.0;
          if (cleaveCycle < 0.42) {
            // Lifts massive halberd blade high over helmet
            const p = cleaveCycle / 0.42;
            if (halberdPivot) {
              halberdPivot.rotation.x = -p * 1.55;
              halberdPivot.position.y = 0.95 + p * 0.25;
            }
            if (torso) {
              torso.rotation.y = -p * 0.35;
              torso.position.y = 0.62 + p * 0.05;
            }
          } else if (cleaveCycle < 0.62) {
            // Powerful downward cleave!
            const p = (cleaveCycle - 0.42) / 0.2;
            if (halberdPivot) {
              halberdPivot.rotation.x = -1.55 + p * 2.85;
              halberdPivot.position.y = 1.2 - p * 0.45;
            }
            if (torso) {
              torso.rotation.y = -0.35 + p * 0.75;
              torso.position.y = 0.67 - p * 0.1;
              torso.position.z = p * 0.16;
            }
            if (lLeg) lLeg.rotation.x = p * 0.35;
            if (rLeg) rLeg.rotation.x = -p * 0.35;
          } else {
            // Recovery
            const p = (cleaveCycle - 0.62) / 0.38;
            if (halberdPivot) {
              halberdPivot.rotation.x = 1.3 * (1.0 - p);
              halberdPivot.position.y = 0.75 + p * 0.2;
            }
            if (torso) {
              torso.rotation.y = 0.4 * (1.0 - p);
              torso.position.y = 0.57 + p * 0.05;
              torso.position.z = 0.16 * (1.0 - p);
            }
            if (lLeg) lLeg.rotation.x = 0.35 * (1.0 - p);
            if (rLeg) rLeg.rotation.x = -0.35 * (1.0 - p);
          }
        } else if (unit.state === 'moving') {
          if (halberdPivot) halberdPivot.rotation.x = Math.sin(time * 9.5) * 0.25;
        } else {
          if (halberdPivot) {
            halberdPivot.position.set(0.38, 0.95, 0.18);
            halberdPivot.rotation.set(0, 0, 0);
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
        const flapRate = isMoving ? 0.016 : 0.011;
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

        if (isAttacking) {
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
    this.spawnGroundScorch(pos.x, pos.z, maxRadius * 0.85);
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
      // Melee strike with dynamic sweeping arc slash trail
      this.spawnMeleeWeaponTrail(attackerPos, targetPos, attackerType);
    }
  }

  // Dynamic sweeping crescent weapon swing trail (AoE / Warcraft style)
  private spawnMeleeWeaponTrail(attackerPos: THREE.Vector3, targetPos: THREE.Vector3, attackerType: string): void {
    const dir = targetPos.clone().sub(attackerPos);
    dir.y = 0;
    const len = dir.length();
    if (len > 0.001) dir.normalize();

    const yaw = Math.atan2(dir.x, dir.z);
    const midPos = attackerPos.clone().lerp(targetPos, 0.45);
    midPos.y = attackerPos.y + 0.62;

    // Distinct trail colors by unit specialization
    let trailColor = 0xf8fafc; // Clean polished steel
    if (attackerType === 'cavalry') {
      trailColor = 0x60a5fa; // Azure knightly saber arc
    } else if (attackerType === 'advanced_unit') {
      trailColor = 0xfbbf24; // Imperial gold champion slash
    } else if (attackerType === 'spearman') {
      trailColor = 0x38bdf8; // Piercing spear thrust trail
    }

    // Wide sweeping crescent arc
    const arcRadius = attackerType === 'cavalry' ? 1.35 : attackerType === 'spearman' ? 1.45 : 1.1;
    const ringGeom = new THREE.RingGeometry(arcRadius * 0.52, arcRadius, 16, 1, -Math.PI * 0.45, Math.PI * 0.9);
    ringGeom.rotateX(Math.PI / 2);
    ringGeom.rotateY(yaw - Math.PI / 2);

    const ringMat = new THREE.MeshBasicMaterial({
      color: trailColor,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    const slashMesh = new THREE.Mesh(ringGeom, ringMat);
    slashMesh.position.copy(midPos);
    this.scene.add(slashMesh);

    this.visualEffects.push({
      mesh: slashMesh,
      createdAt: performance.now(),
      duration: 190,
      update: (t) => {
        const s = 1.0 + t * 0.28;
        slashMesh.scale.set(s, s, s);
        ringMat.opacity = Math.max(0, 0.95 * (1.0 - t * t));
      }
    });

    this.spawnImpactSparks(targetPos, 6);
  }

  // Trailing projectile smoke ribbons and sparks
  private spawnProjectileTrail(pos: THREE.Vector3, type: string): void {
    if (type === 'boulder') {
      // Billowing smoke puff behind catapult firestone
      const puffGeom = new THREE.DodecahedronGeometry(0.24, 0);
      const isFire = Math.random() > 0.45;
      const puffMat = new THREE.MeshBasicMaterial({
        color: isFire ? 0xf97316 : 0x334155,
        transparent: true,
        opacity: 0.75,
        depthWrite: false
      });
      const puff = new THREE.Mesh(puffGeom, puffMat);
      puff.position.copy(pos);
      this.scene.add(puff);

      this.visualEffects.push({
        mesh: puff,
        createdAt: performance.now(),
        duration: 380,
        update: (t) => {
          const s = 1.0 + t * 1.6;
          puff.scale.set(s, s, s);
          puff.position.y += 0.008; // Gentle rising smoke
          puffMat.opacity = Math.max(0, 0.75 * (1.0 - t));
        }
      });
    } else if (type === 'cannon') {
      // Hot gunpowder flash & smoke whisp
      const puffGeom = new THREE.SphereGeometry(0.18, 6, 6);
      const puffMat = new THREE.MeshBasicMaterial({
        color: 0x94a3b8,
        transparent: true,
        opacity: 0.65,
        depthWrite: false
      });
      const puff = new THREE.Mesh(puffGeom, puffMat);
      puff.position.copy(pos);
      this.scene.add(puff);

      this.visualEffects.push({
        mesh: puff,
        createdAt: performance.now(),
        duration: 260,
        update: (t) => {
          const s = 1.0 + t * 1.3;
          puff.scale.set(s, s, s);
          puffMat.opacity = Math.max(0, 0.65 * (1.0 - t));
        }
      });
    } else if (type === 'arrow') {
      // Arrow flight vapor ribbon whisp
      const whispGeom = new THREE.SphereGeometry(0.07, 4, 4);
      const whispMat = new THREE.MeshBasicMaterial({
        color: 0xe2e8f0,
        transparent: true,
        opacity: 0.42,
        depthWrite: false
      });
      const whisp = new THREE.Mesh(whispGeom, whispMat);
      whisp.position.copy(pos);
      this.scene.add(whisp);

      this.visualEffects.push({
        mesh: whisp,
        createdAt: performance.now(),
        duration: 180,
        update: (t) => {
          const s = 1.0 + t * 0.8;
          whisp.scale.set(s, s, s);
          whispMat.opacity = Math.max(0, 0.42 * (1.0 - t));
        }
      });
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

        // Projectile smoke & vapor ribbon emitter
        if (!p.lastTrailPos) {
          p.lastTrailPos = p.mesh.position.clone();
        } else if (p.mesh.position.distanceTo(p.lastTrailPos) >= 0.42) {
          this.spawnProjectileTrail(p.mesh.position, p.type);
          p.lastTrailPos.copy(p.mesh.position);
        }

        if (p.type === 'dragon_fire') {
          p.mesh.rotation.x += dt * 8;
          p.mesh.rotation.y += dt * 10;
          const s = 1.0 + Math.sin(t * 15) * 0.25;
          p.mesh.scale.set(s, s, s);
        } else if (p.type === 'boulder') {
          p.mesh.rotation.x += dt * 7.5;
          p.mesh.rotation.z += dt * 5.0;
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

    // Animate wind physics on wheat crops and royal banners
    const nowSec = now * 0.001;
    for (let i = 0; i < this.windObjects.length; i++) {
      const w = this.windObjects[i];
      const bldgMesh = this.buildingMeshes.get(w.bldgId);
      if (!bldgMesh || !bldgMesh.visible) continue;
      if (w.type === 'wheat') {
        // Organic undulating sway across the field
        w.obj.rotation.x = w.baseRotX + Math.sin(nowSec * 3.4 + w.phase) * 0.12;
        w.obj.rotation.z = w.baseRotZ + Math.cos(nowSec * 2.6 + w.phase) * 0.06;
      } else if (w.type === 'banner') {
        // Fluttering cloth in the breeze
        w.obj.rotation.y = w.baseRotY + Math.sin(nowSec * 4.4 + w.phase) * 0.32 + 0.18;
        w.obj.rotation.z = w.baseRotZ + Math.cos(nowSec * 5.8 + w.phase) * 0.12;
      }
    }

    
    // Animate persistent battlefield ground scars / scorch marks
    for (let i = this.groundScars.length - 1; i >= 0; i--) {
      const scar = this.groundScars[i];
      const elapsed = now - scar.createdAt;
      if (elapsed > scar.maxLifetime) {
        this.scene.remove(scar.mesh);
        this.groundScars.splice(i, 1);
      } else if (elapsed > 25000) {
        const fadeProgress = (elapsed - 25000) / (scar.maxLifetime - 25000);
        (scar.mesh.material as THREE.MeshBasicMaterial).opacity = 0.88 * (1.0 - fadeProgress);
      }
    }

    // Animate battlefield fallen skeletons and remains (weathering & sinking)
    for (let i = this.battlefieldRemains.length - 1; i >= 0; i--) {
      const remains = this.battlefieldRemains[i];
      const elapsed = now - remains.createdAt;
      if (elapsed > remains.maxLifetime) {
        this.scene.remove(remains.group);
        this.battlefieldRemains.splice(i, 1);
      } else if (elapsed > 35000) {
        const sinkProgress = (elapsed - 35000) / (remains.maxLifetime - 35000);
        remains.group.position.y = remains.baseElevation + 0.015 - sinkProgress * 0.25;
        remains.group.traverse(child => {
          if (child instanceof THREE.Mesh && child.material) {
            child.material.transparent = true;
            child.material.opacity = Math.max(0, 1.0 - sinkProgress);
          }
        });
      }
    }

    
    // Animate drifting cloud shadows across the landscape
    if (this.cloudShadowTexture) {
      this.cloudShadowTexture.offset.x += dt * 0.0032;
      this.cloudShadowTexture.offset.y += dt * 0.0019;
    }

    // Animate swirling sunlight pollen / dust motes
    if (this.dustMotes) {
      const pos = this.dustMotes.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i) + Math.sin(now * 0.0018 + i) * dt * 0.15;
        let x = pos.getX(i) + dt * 0.35;
        if (x > this.activeMapWidth) x = 0;
        pos.setX(i, x);
        pos.setY(i, y);
      }
      pos.needsUpdate = true;
    }

    this.terrainMesh?.update(now * 0.001, dt);
    this.updateDayNightCycle(now * 0.001);
    this.cameraController.update(dt);
    this.renderer.render(this.scene, this.camera);
  }

  // -------------------------------------------------------------
  // DYNAMIC ATMOSPHERIC DAY / NIGHT & GOLDEN HOUR LIGHTING CYCLE
  // -------------------------------------------------------------
  private updateDayNightCycle(nowSec: number): void {
    // 240-second diurnal lighting cycle (Noon -> Golden Hour Sunset -> Sapphire Twilight Dusk -> Peach Dawn)
    const cycleDuration = 240;
    const progress = (nowSec % cycleDuration) / cycleDuration;

    const noonSun = new THREE.Color(0xfff8e8);
    const goldenSun = new THREE.Color(0xff9a3c);
    const duskMoon = new THREE.Color(0x9bc2ea);
    const dawnSun = new THREE.Color(0xfec89a);

    const noonSky = new THREE.Color(0xdceaf8);
    const noonGround = new THREE.Color(0x485836);

    const goldenSky = new THREE.Color(0xfde68a);
    const goldenGround = new THREE.Color(0x4a321e);

    const duskSky = new THREE.Color(0x1e293b);
    const duskGround = new THREE.Color(0x0f172a);

    const dawnSky = new THREE.Color(0xe0e7ff);
    const dawnGround = new THREE.Color(0x2d3a22);

    let sunColor: THREE.Color;
    let skyColor: THREE.Color;
    let groundColor: THREE.Color;
    let sunIntensity: number;
    let hemiIntensity: number;
    let sunElevation: number;

    if (progress < 0.40) {
      // 1. Crisp Daylight & High Noon (0% - 40%)
      sunColor = noonSun;
      skyColor = noonSky;
      groundColor = noonGround;
      sunIntensity = 1.65;
      hemiIntensity = 0.95;
      sunElevation = 110;
    } else if (progress < 0.62) {
      // 2. Golden Hour / Amber Sunset (40% - 62%)
      const t = (progress - 0.40) / 0.22;
      sunColor = noonSun.clone().lerp(goldenSun, t);
      skyColor = noonSky.clone().lerp(goldenSky, t);
      groundColor = noonGround.clone().lerp(goldenGround, t);
      sunIntensity = 1.65 + t * 0.25;
      hemiIntensity = 0.95 - t * 0.15;
      sunElevation = 110 - t * 45;
    } else if (progress < 0.82) {
      // 3. Sapphire Twilight & Moonlit Dusk (62% - 82%)
      const t = (progress - 0.62) / 0.20;
      sunColor = goldenSun.clone().lerp(duskMoon, t);
      skyColor = goldenSky.clone().lerp(duskSky, t);
      groundColor = goldenGround.clone().lerp(duskGround, t);
      sunIntensity = 1.90 - t * 1.15; // Soft silvery moonlight (0.75)
      hemiIntensity = 0.80 - t * 0.35; // Dim ambient twilight (0.45)
      sunElevation = 65 + t * 35;
    } else {
      // 4. Rose & Peach Dawn (82% - 100%)
      const t = (progress - 0.82) / 0.18;
      sunColor = duskMoon.clone().lerp(dawnSun, t);
      skyColor = duskSky.clone().lerp(dawnSky, t);
      groundColor = duskGround.clone().lerp(dawnGround, t);
      sunIntensity = 0.75 + t * 0.90;
      hemiIntensity = 0.45 + t * 0.50;
      sunElevation = 80 + t * 30;
    }

    this.sunLight.color.copy(sunColor);
    this.sunLight.intensity = sunIntensity;
    this.sunLight.position.y = sunElevation;

    this.hemiLight.color.copy(skyColor);
    this.hemiLight.groundColor.copy(groundColor);
    this.hemiLight.intensity = hemiIntensity;

    // Torch & Window Glow Factor: Activates during dusk & twilight (progress 0.55 - 0.88)
    let glowFactor = 0.0;
    if (progress >= 0.55 && progress <= 0.88) {
      glowFactor = 1.0 - Math.abs(progress - 0.72) / 0.17;
      glowFactor = Math.max(0, Math.min(1, glowFactor));
    }

    // Subtle candle & brazier flame flicker
    const flicker = 1.0 + Math.sin(nowSec * 12.0) * 0.08 + Math.cos(nowSec * 19.0) * 0.06;
    this.ambientGlowMultiplier = 0.85 + glowFactor * 1.65 * flicker;

    // Dynamic town center hearth night light
    if (this.townCenterNightLight) {
      this.townCenterNightLight.intensity = glowFactor * 2.8 * flicker;
    }

    // Animate emissive intensity on all lanterns and braziers
    for (let i = 0; i < this.lanternMeshes.length; i++) {
      const mesh = this.lanternMeshes[i];
      if (mesh.material) {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (mat.emissiveIntensity !== undefined) {
          mat.emissiveIntensity = this.ambientGlowMultiplier;
        }
      }
    }
  }
}
