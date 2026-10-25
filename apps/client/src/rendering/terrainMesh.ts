import * as THREE from 'three';
import { MapTile, ResourceNodeData } from '@agefront/shared';
import {
  getTerrainGrassTexture,
  getTerrainBumpTexture,
  getWaterRippleTexture,
  getWoodPlankTexture
} from './proceduralTextures.js';

export class TerrainMesh {
  public group: THREE.Group;
  private width: number;
  private height: number;
  private groundMesh: THREE.Mesh;
  private waterMesh: THREE.Mesh | null = null;
  public resourceMeshes: Map<string, THREE.Object3D> = new Map();
  private borderLinesGroup: THREE.Group;
  private restrictedBorderGroup: THREE.Group;
  private treesGroup: THREE.Group;
  private tiles: MapTile[];

  
  public getElevationAt(x: number, z: number): number {
    if (!this.tiles || this.tiles.length === 0) return 0;
    const tx = Math.min(this.width - 1, Math.max(0, Math.floor(x)));
    const tz = Math.min(this.height - 1, Math.max(0, Math.floor(z)));
    const tile = this.tiles[tz * this.width + tx];
    if (!tile) return 0;
    if (tile.terrain === 'water') return -0.32;
    if (tile.terrain === 'sand') return 0.04;
    if (tile.terrain === 'forest') return 0.12 + (tile.elevation || 0) * 0.8;
    if (tile.terrain === 'mountain') return 0.6 + (tile.elevation || 0) * 1.5;
    return (tile.elevation || 0) * 0.6;
  }

  constructor(width: number, height: number, tiles: MapTile[], resourceNodes: ResourceNodeData[]) {
    this.width = width;
    this.height = height;
    this.group = new THREE.Group();
    this.tiles = tiles;

    // 1. High-Resolution Ground Geometry with Organic Slopes, Cliffs & Alpine Peaks
    // Using a dense grid for smooth hills, craggy mountain slopes, and river valleys
    const geom = new THREE.PlaneGeometry(width, height, width - 1, height - 1);
    geom.rotateX(-Math.PI / 2);
    geom.translate(width / 2, 0, height / 2);

    const posAttr = geom.attributes.position;
    const colors = new Float32Array(posAttr.count * 3);

    // Helper to get tile safely
    const getTileAt = (x: number, z: number): MapTile => {
      const tx = Math.min(width - 1, Math.max(0, Math.floor(x)));
      const tz = Math.min(height - 1, Math.max(0, Math.floor(z)));
      return tiles[tz * width + tx] || { terrain: 'grass', elevation: 0, walkable: true };
    };

    // Calculate height and organic vertex offsets
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vz = posAttr.getZ(i);
      const tile = getTileAt(vx, vz);

      // Micro-relief organic noise
      const microNoise = (Math.sin(vx * 1.2) * Math.cos(vz * 1.2)) * 0.08 +
                         (Math.sin(vx * 2.5 + 1.1) * Math.cos(vz * 2.5 - 0.7)) * 0.04;

      let elevY = 0;
      if (tile.terrain === 'water') {
        elevY = -0.32;
      } else if (tile.terrain === 'sand') {
        elevY = 0.04 + microNoise * 0.4;
      } else if (tile.terrain === 'forest') {
        elevY = 0.12 + (tile.elevation || 0) * 0.8 + microNoise;
      } else if (tile.terrain === 'mountain') {
        // Dramatic towering mountain elevation (restricted zone)
        const peakMult = tile.elevation >= 3 ? 3.4 : tile.elevation >= 2 ? 2.4 : 1.5;
        // Peak ridge noise for jagged mountain crests
        const ridgeNoise = Math.abs(Math.sin(vx * 0.9) * Math.cos(vz * 0.9)) * 0.75;
        elevY = peakMult + ridgeNoise + microNoise * 1.5;
      } else {
        // Grass / hills
        elevY = (tile.elevation || 0) * 0.85 + microNoise;
      }

      posAttr.setY(i, elevY);
    }

    geom.computeVertexNormals();
    const normAttr = geom.attributes.normal;

    // 2. Multi-Palette Vertex Color Blending (Lush grass, sandy beaches, granite cliffs, alpine snow)
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vy = posAttr.getY(i);
      const vz = posAttr.getZ(i);
      const ny = normAttr ? normAttr.getY(i) : 1.0; // slope steepness (1 = flat ground, < 0.7 = steep cliff)

      const tile = getTileAt(vx, vz);

      let color = new THREE.Color(0x446d2c); // Base rich temperate meadow green

      if (tile.terrain === 'water') {
        color = new THREE.Color(0x0e354a); // Deep rich aquatic riverbed (AoE / RoN style)
      } else if (tile.terrain === 'sand') {
        color = new THREE.Color(0x9e845c); // Natural warm river sand / shore sediment
        color.lerp(new THREE.Color(0x826c48), Math.abs(Math.sin(vx * 0.8)));
      } else if (tile.terrain === 'forest') {
        color = new THREE.Color(0x234419); // Rich pine needle and moss woodland floor
        color.lerp(new THREE.Color(0x1c3714), Math.abs(Math.cos(vz * 0.6)));
      } else if (tile.terrain === 'mountain') {
        // Restricted Mountain High Ground
        if (vy >= 2.6) {
          // Alpine Snow Peak
          color = new THREE.Color(0xe8edf2);
          color.lerp(new THREE.Color(0xd0dbe4), 0.25);
        } else if (vy >= 1.6) {
          // High granite slate
          color = new THREE.Color(0x4b5563);
          if (ny < 0.65) color.lerp(new THREE.Color(0x263238), 0.45); // Deep shadow on steep cliff walls
        } else {
          // Rocky mountain slope base
          color = new THREE.Color(0x5a6875);
        }
      } else {
        // Smooth natural grassland gradient (Rise of Nations / Age of Empires style)
        const varChoice = Math.sin(vx * 0.08) * Math.cos(vz * 0.08) * 0.5 + Math.sin(vx * 0.15 + 1.2) * 0.2;
        const baseGrass = new THREE.Color(0x446d2c); // Lush temperate meadow
        const deepMeadow = new THREE.Color(0x2f4c1c); // Forest edge & valley shadow
        const sunlitGrass = new THREE.Color(0x567e35); // Sunlit warm hillside knoll
        if (varChoice > 0.1) {
          color = baseGrass.clone().lerp(sunlitGrass, Math.min(1.0, (varChoice - 0.1) * 2.5));
        } else {
          color = baseGrass.clone().lerp(deepMeadow, Math.min(1.0, (0.1 - varChoice) * 2.5));
        }
      }

      // Slope Cliff Shading: Any steep slope automatically turns into striated rock cliff face
      if (tile.terrain !== 'water' && tile.terrain !== 'sand' && ny < 0.72) {
        const cliffColor = new THREE.Color(0x323a42); // Dark granite cliff wall
        const cliffMix = Math.min(1.0, (0.72 - ny) * 3.5);
        color.lerp(cliffColor, cliffMix);
      }

      // Subtle natural vertex color variation
      const tintNoise = (Math.sin(vx * 1.5) + Math.cos(vz * 1.5)) * 0.02;
      color.offsetHSL(0, 0, tintNoise);

      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geom.computeVertexNormals();

    // High-resolution seamless AoE terrain texture & micro-relief bump map
    const grassTex = getTerrainGrassTexture();
    const bumpTex = getTerrainBumpTexture();
    grassTex.repeat.set(width / 3.5, height / 3.5);
    bumpTex.repeat.set(width / 3.5, height / 3.5);

    const groundMat = new THREE.MeshStandardMaterial({
      map: grassTex,
      bumpMap: bumpTex,
      bumpScale: 0.05,
      vertexColors: true,
      roughness: 0.82,
      metalness: 0.05,
      flatShading: false
    });

    this.groundMesh = new THREE.Mesh(geom, groundMat);
    this.groundMesh.receiveShadow = true;
    this.group.add(this.groundMesh);

    // Natural Perimeter Horizon Skirt (deep underground base to prevent black void at horizon)
    const skirtMargin = 120;
    const skirtGeom = new THREE.PlaneGeometry(width + skirtMargin * 2, height + skirtMargin * 2, 8, 8);
    skirtGeom.rotateX(-Math.PI / 2);
    skirtGeom.translate(width / 2, -1.0, height / 2);

    const skirtMat = new THREE.MeshStandardMaterial({
      color: 0x22351f,
      roughness: 0.95,
      metalness: 0.02,
      flatShading: false
    });
    const skirtMesh = new THREE.Mesh(skirtGeom, skirtMat);
    skirtMesh.receiveShadow = true;
    this.group.add(skirtMesh);

    // 3. Seamless Continuous Indexed Water Surface (Rise of Nations / Age of Empires style)
    // Eliminates all tile seam lines, double-transparency overlaps, and blockiness!
    const waterTiles: { tx: number; tz: number }[] = [];
    for (let tz = 0; tz < height; tz++) {
      for (let tx = 0; tx < width; tx++) {
        if (tiles[tz * width + tx].terrain === 'water') {
          waterTiles.push({ tx, tz });
        }
      }
    }

    if (waterTiles.length > 0) {
      const waterSurfaceY = -0.06;
      const vertexMap = new Map<number, number>();
      const positions: number[] = [];
      const indices: number[] = [];

      const getOrCreateVertex = (gx: number, gz: number): number => {
        const key = gz * (width + 1) + gx;
        const existing = vertexMap.get(key);
        if (existing !== undefined) return existing;

        const newIndex = positions.length / 3;
        positions.push(gx, waterSurfaceY, gz);
        vertexMap.set(key, newIndex);
        return newIndex;
      };

      for (const { tx, tz } of waterTiles) {
        // Shared 4 corners of tile quad (tx, tz):
        const v0 = getOrCreateVertex(tx, tz);
        const v1 = getOrCreateVertex(tx + 1, tz);
        const v2 = getOrCreateVertex(tx, tz + 1);
        const v3 = getOrCreateVertex(tx + 1, tz + 1);

        // Counter-clockwise triangles facing upward (+Y):
        indices.push(v0, v2, v1);
        indices.push(v1, v2, v3);
      }

      const waterGeom = new THREE.BufferGeometry();
      waterGeom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      waterGeom.setIndex(indices);
      waterGeom.computeVertexNormals();

      const waterRipple = getWaterRippleTexture();
      waterRipple.repeat.set(width / 4, height / 4);

      const waterMat = new THREE.MeshStandardMaterial({
        color: 0x1873aa, // Vibrant aquatic river blue (Age of Empires II style)
        emissive: 0x0c3e5e, // Clear aquatic luminescence
        emissiveIntensity: 0.22,
        bumpMap: waterRipple,
        bumpScale: 0.04,
        roughness: 0.12,
        metalness: 0.22,
        transparent: true,
        opacity: 0.88,
        depthWrite: false
      });

      this.waterMesh = new THREE.Mesh(waterGeom, waterMat);
      this.waterMesh.receiveShadow = true;
      this.group.add(this.waterMesh);
    }

    // 4. 3D Mountain Massifs & Jagged Peak Crags (Towering Restricted Alpine Mountains)
    this.buildMountainMassifs(width, height, tiles);

    // 6. Multi-tiered Stylized Forest Trees & Natural Flora
    this.treesGroup = new THREE.Group();
    this.group.add(this.treesGroup);
    this.buildLushForestAndFlora(width, height, tiles);

    // 7. Detailed Resource Deposits (Gold Yellow crystal nuggets, timber, stone, berries)
    this.buildResourceDecorations(resourceNodes);

    // 8. Restricted Area Boundary Indicators (Cliff warnings & Rock cairns along mountain base)
    this.restrictedBorderGroup = new THREE.Group();
    this.group.add(this.restrictedBorderGroup);
    this.buildRestrictedAreaBoundaryMarkers(width, height, tiles);

    // 9. Territory Border Overlay Group
    this.borderLinesGroup = new THREE.Group();
    this.group.add(this.borderLinesGroup);
  }

  // -------------------------------------------------------------
  // 3D MOUNTAIN MASSIFS & ORGANIC ROCKY CRAGS (Rise of Nations / AoE style)
  // Continuous majestic alpine ridges sculpted in terrain; natural scattered crags
  // -------------------------------------------------------------
  private buildMountainMassifs(width: number, height: number, tiles: MapTile[]): void {
    const cragSpots: { pos: THREE.Vector3; elev: number; isHighPeak: boolean; hash: number }[] = [];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const t = tiles[y * width + x];
        if (t && t.terrain === 'mountain') {
          const elev = t.elevation || 2;
          const hash = (x * 19 + y * 37) % 100;
          // Organic distribution: Place rocky crags only on prominent ridges and summits (avoiding uniform grids)
          if (elev >= 2 && hash < 45) {
            const baseY = elev >= 3 ? 2.8 : 1.9;
            cragSpots.push({
              pos: new THREE.Vector3(x + 0.5, baseY, y + 0.5),
              elev,
              isHighPeak: elev >= 3,
              hash
            });
          }
        }
      }
    }

    if (cragSpots.length === 0) return;

    const mountainGroup = new THREE.Group();

    // 1. Weathered Granite Rock Outcropping
    const cragGeom = new THREE.DodecahedronGeometry(0.72, 1);
    const cragMat = new THREE.MeshStandardMaterial({
      color: 0x475569, // Weathered slate granite
      roughness: 0.88,
      metalness: 0.08,
      flatShading: false
    });

    // 2. Jagged Summit Crags & Boulders
    const boulderGeom = new THREE.DodecahedronGeometry(0.55, 0);
    const boulderMat = new THREE.MeshStandardMaterial({
      color: 0x334155, // Dark basalt crevice rock
      roughness: 0.92,
      metalness: 0.05,
      flatShading: false
    });

    const instCrags = new THREE.InstancedMesh(cragGeom, cragMat, cragSpots.length);
    const instBoulders = new THREE.InstancedMesh(boulderGeom, boulderMat, cragSpots.length);

    instCrags.castShadow = true;
    instCrags.receiveShadow = true;
    instBoulders.castShadow = true;
    instBoulders.receiveShadow = true;

    const dummy = new THREE.Object3D();

    cragSpots.forEach((spot, idx) => {
      const rotY = (spot.hash * 0.17) % (Math.PI * 2);
      const rotX = (((spot.hash * 13) % 9) - 4) * 0.03;
      const rotZ = (((spot.hash * 23) % 9) - 4) * 0.03;

      // Natural organic placement jitter
      const jx = (((spot.hash * 7) % 11) - 5) * 0.04;
      const jz = (((spot.hash * 11) % 11) - 5) * 0.04;

      const scaleX = 0.9 + ((spot.hash * 3) % 4) * 0.15;
      const scaleY = spot.elev >= 3 ? 1.35 + ((spot.hash * 5) % 4) * 0.18 : 0.95 + ((spot.hash * 5) % 3) * 0.15;
      const scaleZ = 0.85 + ((spot.hash * 7) % 4) * 0.15;

      // Primary Granite Outcropping
      dummy.position.set(spot.pos.x + jx, spot.pos.y + 0.1, spot.pos.z + jz);
      dummy.scale.set(scaleX, scaleY, scaleZ);
      dummy.rotation.set(rotX, rotY, rotZ);
      dummy.updateMatrix();
      instCrags.setMatrixAt(idx, dummy.matrix);

      // Flanking Jagged Boulder
      const bx = spot.pos.x - jx * 1.5 + 0.25;
      const bz = spot.pos.z - jz * 1.5 - 0.22;
      dummy.position.set(bx, spot.pos.y - 0.15, bz);
      dummy.scale.set(scaleX * 0.75, scaleY * 0.6, scaleZ * 0.75);
      dummy.rotation.set(-rotX, rotY + 1.2, rotZ + 0.4);
      dummy.updateMatrix();
      instBoulders.setMatrixAt(idx, dummy.matrix);
    });

    mountainGroup.add(instCrags);
    mountainGroup.add(instBoulders);
    this.group.add(mountainGroup);
  }

  // -------------------------------------------------------------
  // RESTRICTED AREA BOUNDARY MARKERS (Natural scree talus along mountain base)
  // -------------------------------------------------------------
  private buildRestrictedAreaBoundaryMarkers(width: number, height: number, tiles: MapTile[]): void {
    const cairnSpots: THREE.Vector3[] = [];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const t = tiles[y * width + x];
        if (t && t.terrain === 'mountain') {
          // Check 4 cardinal neighbors
          const checkEdge = (nx: number, ny: number) => {
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) return;
            const neighbor = tiles[ny * width + nx];
            if (neighbor && neighbor.terrain !== 'mountain') {
              if (((x * 13 + y * 29) % 10) < 3) {
                cairnSpots.push(new THREE.Vector3((x + nx) * 0.5 + 0.5, 0.15, (y + ny) * 0.5 + 0.5));
              }
            }
          };

          checkEdge(x, y - 1);
          checkEdge(x, y + 1);
          checkEdge(x - 1, y);
          checkEdge(x + 1, y);
        }
      }
    }

    // Natural scree stones & talus boulders along mountain foot (AoE / RoN style)
    if (cairnSpots.length > 0) {
      const boulderGeom = new THREE.DodecahedronGeometry(0.24, 0);
      const boulderMat = new THREE.MeshStandardMaterial({
        color: 0x526071,
        roughness: 0.92,
        flatShading: false
      });
      const instCairn = new THREE.InstancedMesh(boulderGeom, boulderMat, cairnSpots.length);
      const dummy = new THREE.Object3D();
      cairnSpots.forEach((pos, idx) => {
        const jx = (((idx * 17) % 7) - 3) * 0.04;
        const jz = (((idx * 23) % 7) - 3) * 0.04;
        dummy.position.set(pos.x + jx, pos.y, pos.z + jz);
        const s = 0.5 + (idx % 4) * 0.15;
        dummy.scale.set(s, s * 0.65, s);
        dummy.rotation.set((idx * 0.4) % 1, (idx * 0.7) % 2, 0);
        dummy.updateMatrix();
        instCairn.setMatrixAt(idx, dummy.matrix);
      });
      instCairn.castShadow = true;
      this.restrictedBorderGroup.add(instCairn);
    }
  }

  // -------------------------------------------------------------
  // -------------------------------------------------------------
  // LUSH FOREST TREES & NATURAL FLORA (Pines, Oaks)
  // -------------------------------------------------------------
  private buildLushForestAndFlora(width: number, height: number, tiles: MapTile[]): void {
    const forestSpots: THREE.Vector3[] = [];

    tiles.forEach((t, idx) => {
      const tx = idx % width;
      const tz = Math.floor(idx / width);

      if (t.terrain === 'forest') {
        forestSpots.push(new THREE.Vector3(tx + 0.5, t.elevation * 0.85, tz + 0.5));
      }
    });

    // 1. Diverse Forest Trees: Conifer Pines & Noble Broadleaf Oaks (AoE style)
    if (forestSpots.length > 0) {
      const woodTex = getWoodPlankTexture();
      const trunkMat = new THREE.MeshStandardMaterial({
        map: woodTex,
        color: 0x5a3419,
        roughness: 0.9,
        flatShading: false
      });

      // Conifers (50% of trees)
      const coniferSpots: THREE.Vector3[] = [];
      const oakSpots: THREE.Vector3[] = [];

      forestSpots.forEach((p, idx) => {
        if (idx % 2 === 0) coniferSpots.push(p);
        else oakSpots.push(p);
      });

      // Conifer Meshes
      if (coniferSpots.length > 0) {
        const cTrunkGeom = new THREE.CylinderGeometry(0.12, 0.18, 1.05, 8);
        const cCone1Geom = new THREE.ConeGeometry(0.95, 1.1, 10);
        cCone1Geom.translate(0, 0.9, 0);
        const cCone2Geom = new THREE.ConeGeometry(0.75, 0.95, 10);
        cCone2Geom.translate(0, 1.45, 0);
        const cCone3Geom = new THREE.ConeGeometry(0.52, 0.8, 10);
        cCone3Geom.translate(0, 1.92, 0);

        const coniferMat1 = new THREE.MeshStandardMaterial({ color: 0x183b15, roughness: 0.76, flatShading: false });
        const coniferMat2 = new THREE.MeshStandardMaterial({ color: 0x224c1f, roughness: 0.72, flatShading: false });
        const coniferMat3 = new THREE.MeshStandardMaterial({ color: 0x2d6129, roughness: 0.68, flatShading: false });

        const instCTrunk = new THREE.InstancedMesh(cTrunkGeom, trunkMat, coniferSpots.length);
        const instCCone1 = new THREE.InstancedMesh(cCone1Geom, coniferMat1, coniferSpots.length);
        const instCCone2 = new THREE.InstancedMesh(cCone2Geom, coniferMat2, coniferSpots.length);
        const instCCone3 = new THREE.InstancedMesh(cCone3Geom, coniferMat3, coniferSpots.length);

        const dummy = new THREE.Object3D();
        coniferSpots.forEach((pos, idx) => {
          const jx = (((idx * 17 + 7) % 15) / 14 - 0.5) * 0.52;
          const jz = (((idx * 31 + 11) % 15) / 14 - 0.5) * 0.52;
          dummy.position.set(pos.x + jx, pos.y, pos.z + jz);

          const scale = 0.88 + ((idx * 23) % 35) * 0.012;
          dummy.scale.set(scale, scale * (0.92 + ((idx * 7) % 25) * 0.01), scale);
          dummy.rotation.y = ((idx * 47) % 360) * (Math.PI / 180);
          dummy.rotation.x = (((idx * 13) % 9) - 4) * 0.015;
          dummy.rotation.z = (((idx * 19) % 9) - 4) * 0.015;
          dummy.updateMatrix();

          instCTrunk.setMatrixAt(idx, dummy.matrix);
          instCCone1.setMatrixAt(idx, dummy.matrix);
          instCCone2.setMatrixAt(idx, dummy.matrix);
          instCCone3.setMatrixAt(idx, dummy.matrix);
        });

        instCTrunk.castShadow = true;
        instCCone1.castShadow = true;
        instCCone2.castShadow = true;
        instCCone3.castShadow = true;

        this.treesGroup.add(instCTrunk);
        this.treesGroup.add(instCCone1);
        this.treesGroup.add(instCCone2);
        this.treesGroup.add(instCCone3);
      }

      // Broadleaf Oaks (50% of trees - lush multi-spherical organic canopies)
      if (oakSpots.length > 0) {
        const oTrunkGeom = new THREE.CylinderGeometry(0.15, 0.24, 1.15, 8);
        const oCrown1Geom = new THREE.DodecahedronGeometry(0.85, 2);
        oCrown1Geom.translate(0, 1.45, 0);
        const oCrown2Geom = new THREE.DodecahedronGeometry(0.68, 2);
        oCrown2Geom.translate(-0.35, 1.25, 0.22);
        const oCrown3Geom = new THREE.DodecahedronGeometry(0.72, 2);
        oCrown3Geom.translate(0.36, 1.32, -0.18);

        const oakMat1 = new THREE.MeshStandardMaterial({ color: 0x2e5b1f, roughness: 0.75, flatShading: false });
        const oakMat2 = new THREE.MeshStandardMaterial({ color: 0x3d7329, roughness: 0.72, flatShading: false });
        const oakMat3 = new THREE.MeshStandardMaterial({ color: 0x4d8a34, roughness: 0.68, flatShading: false });

        const instOTrunk = new THREE.InstancedMesh(oTrunkGeom, trunkMat, oakSpots.length);
        const instOCrown1 = new THREE.InstancedMesh(oCrown1Geom, oakMat1, oakSpots.length);
        const instOCrown2 = new THREE.InstancedMesh(oCrown2Geom, oakMat2, oakSpots.length);
        const instOCrown3 = new THREE.InstancedMesh(oCrown3Geom, oakMat3, oakSpots.length);

        const dummy = new THREE.Object3D();
        oakSpots.forEach((pos, idx) => {
          const jx = (((idx * 29 + 5) % 15) / 14 - 0.5) * 0.52;
          const jz = (((idx * 13 + 9) % 15) / 14 - 0.5) * 0.52;
          dummy.position.set(pos.x + jx, pos.y, pos.z + jz);

          const scale = 0.85 + ((idx * 19) % 35) * 0.012;
          dummy.scale.set(scale, scale, scale);
          dummy.rotation.y = ((idx * 53) % 360) * (Math.PI / 180);
          dummy.updateMatrix();

          instOTrunk.setMatrixAt(idx, dummy.matrix);
          instOCrown1.setMatrixAt(idx, dummy.matrix);
          instOCrown2.setMatrixAt(idx, dummy.matrix);
          instOCrown3.setMatrixAt(idx, dummy.matrix);
        });

        instOTrunk.castShadow = true;
        instOCrown1.castShadow = true;
        instOCrown2.castShadow = true;
        instOCrown3.castShadow = true;

        this.treesGroup.add(instOTrunk);
        this.treesGroup.add(instOCrown1);
        this.treesGroup.add(instOCrown2);
        this.treesGroup.add(instOCrown3);
      }
    }
  }

  // -------------------------------------------------------------
  // RESOURCE DEPOSITS (Gold Yellow nuggets, timber, stone, berries)
  // -------------------------------------------------------------
  private buildResourceDecorations(nodes: ResourceNodeData[]): void {
    const stoneGeom = new THREE.DodecahedronGeometry(0.68, 1);
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.85, flatShading: false });

    // Radiant, gleaming Pure Gold Yellow Material
    const goldYellowMat = new THREE.MeshStandardMaterial({
      color: 0xffd700, // Brilliant Pure Gold Yellow
      roughness: 0.15,
      metalness: 0.92,
      emissive: 0x553d00, // Warm golden luminescence
      flatShading: false
    });
    const bedrockMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.9,
      flatShading: false
    });

    const foodGeom = new THREE.SphereGeometry(0.48, 10, 8);
    const foodMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.7, flatShading: false });
    const berryMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4, flatShading: false });

    // Tree geometries for wood nodes
    const trunkGeom = new THREE.CylinderGeometry(0.14, 0.18, 0.95, 5);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.9, flatShading: false });
    const cone1Geom = new THREE.ConeGeometry(0.88, 1.25, 5);
    const cone2Geom = new THREE.ConeGeometry(0.68, 1.05, 5);
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.7, flatShading: false });

    nodes.forEach(node => {
      let obj: THREE.Object3D;

      if (node.type === 'stone') {
        const stoneGroup = new THREE.Group();
        const mainStone = new THREE.Mesh(stoneGeom, stoneMat);
        mainStone.scale.set(1.3, 0.9, 1.2);
        mainStone.castShadow = true;
        stoneGroup.add(mainStone);

        const subStone1 = new THREE.Mesh(stoneGeom, stoneMat);
        subStone1.position.set(0.35, -0.15, 0.3);
        subStone1.scale.set(0.5, 0.5, 0.5);
        stoneGroup.add(subStone1);
        obj = stoneGroup;
      } else if (node.type === 'metal') {
        // Gleaming Gold Mine / Vein Deposit
        const goldGroup = new THREE.Group();

        // Dark mineral stone base / bedrock
        const rockBase = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.85, 0.22, 6), bedrockMat);
        rockBase.position.y = -0.12;
        rockBase.castShadow = true;
        goldGroup.add(rockBase);

        // Central towering Gold crystal nugget
        const mainGold = new THREE.Mesh(new THREE.OctahedronGeometry(0.68, 0), goldYellowMat);
        mainGold.scale.set(1.2, 1.55, 1.2);
        mainGold.position.y = 0.26;
        mainGold.rotation.y = Math.PI / 6;
        mainGold.castShadow = true;
        goldGroup.add(mainGold);

        // Surrounding golden crystal facets
        const sub1 = new THREE.Mesh(new THREE.OctahedronGeometry(0.35, 0), goldYellowMat);
        sub1.position.set(0.42, 0.1, 0.3);
        sub1.rotation.set(0.3, 0.5, -0.2);
        sub1.castShadow = true;
        goldGroup.add(sub1);

        const sub2 = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), goldYellowMat);
        sub2.position.set(-0.38, 0.08, -0.25);
        sub2.rotation.set(-0.4, 0.2, 0.5);
        sub2.castShadow = true;
        goldGroup.add(sub2);

        const sub3 = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), goldYellowMat);
        sub3.position.set(-0.25, 0.06, 0.38);
        sub3.rotation.set(0.5, -0.4, 0.1);
        sub3.castShadow = true;
        goldGroup.add(sub3);

        obj = goldGroup;
      } else if (node.type === 'wood') {
        // Efficient raycast hit proxy (visuals already rendered via instancing in buildLushForestAndFlora)
        const proxyGeom = new THREE.CylinderGeometry(0.45, 0.45, 2.2, 5);
        const proxyMat = new THREE.MeshBasicMaterial({ visible: false });
        const proxy = new THREE.Mesh(proxyGeom, proxyMat);
        proxy.position.set(node.x + 0.5, 1.1, node.y + 0.5);
        proxy.userData = { entityType: 'resource', entityId: node.id, resourceType: 'wood' };
        this.resourceMeshes.set(node.id, proxy);
        this.group.add(proxy);
        return;
      } else {
        // Forage Bush with Red Berries
        const foodGroup = new THREE.Group();
        const bush = new THREE.Mesh(foodGeom, foodMat);
        bush.scale.set(1.1, 0.9, 1.1);
        bush.castShadow = true;
        foodGroup.add(bush);

        // Berry clusters
        const berryGeom = new THREE.SphereGeometry(0.12, 4, 4);
        const berryOffsets = [
          [0.25, 0.25, 0.2], [-0.25, 0.2, 0.22],
          [0.1, 0.35, -0.25], [-0.15, 0.15, -0.28],
          [0, 0.42, 0.05]
        ];
        berryOffsets.forEach(([bx, by, bz]) => {
          const berry = new THREE.Mesh(berryGeom, berryMat);
          berry.position.set(bx, by, bz);
          foodGroup.add(berry);
        });

        obj = foodGroup;
      }

      obj.position.set(node.x + 0.5, 0.35, node.y + 0.5);

      // Tag for raycasting
      obj.userData = { entityType: 'resource', entityId: node.id, resourceType: node.type };
      // Also tag all children so deep raycasting finds it immediately
      obj.traverse((child: any) => {
        child.userData = { entityType: 'resource', entityId: node.id, resourceType: node.type };
      });

      this.resourceMeshes.set(node.id, obj);
      this.group.add(obj);
    });
  }

  // -------------------------------------------------------------
  // ANIMATED LIVING WATER & WIND IN RENDER LOOP
  // -------------------------------------------------------------
  public update(time: number, dt: number): void {
    // Subtle shimmering aquatic opacity wave (strictly NO vertical movement in Y to prevent clipping/bobbing)
    if (this.waterMesh && (this.waterMesh.material as THREE.MeshStandardMaterial)) {
      (this.waterMesh.material as THREE.MeshStandardMaterial).opacity = 0.80 + Math.sin(time * 2.0) * 0.04;
    }
  }

  // Update glowing civilization territory borders on the terrain
  public updateTerritoryBorders(tiles: MapTile[], playerColors: Map<string, string>): void {
    while (this.borderLinesGroup.children.length > 0) {
      const child = this.borderLinesGroup.children[0];
      this.borderLinesGroup.remove(child);
    }

    const segmentsByTeam = new Map<number, THREE.Vector3[]>();

    for (let y = 0; y < this.height - 1; y++) {
      for (let x = 0; x < this.width - 1; x++) {
        const curr = tiles[y * this.width + x];
        const right = tiles[y * this.width + (x + 1)];
        const bottom = tiles[(y + 1) * this.width + x];

        if (curr.territoryTeam !== undefined) {
          if (right && right.territoryTeam !== curr.territoryTeam) {
            if (!segmentsByTeam.has(curr.territoryTeam)) segmentsByTeam.set(curr.territoryTeam, []);
            segmentsByTeam.get(curr.territoryTeam)!.push(
              new THREE.Vector3(x + 1, 0.08, y),
              new THREE.Vector3(x + 1, 0.08, y + 1)
            );
          }
          if (bottom && bottom.territoryTeam !== curr.territoryTeam) {
            if (!segmentsByTeam.has(curr.territoryTeam)) segmentsByTeam.set(curr.territoryTeam, []);
            segmentsByTeam.get(curr.territoryTeam)!.push(
              new THREE.Vector3(x, 0.08, y + 1),
              new THREE.Vector3(x + 1, 0.08, y + 1)
            );
          }
        }
      }
    }

    for (const [team, points] of segmentsByTeam.entries()) {
      if (points.length === 0) continue;
      const geom = new THREE.BufferGeometry().setFromPoints(points);
      const color = team === 1 ? 0x38bdf8 : 0xef4444;
      const mat = new THREE.LineBasicMaterial({
        color,
        linewidth: 2,
        transparent: true,
        opacity: 0.85
      });
      const lines = new THREE.LineSegments(geom, mat);
      this.borderLinesGroup.add(lines);
    }
  }
}
