
function distToSegment(px: number, pz: number, x1: number, z1: number, x2: number, z2: number): number {
  const l2 = (x2 - x1) * (x2 - x1) + (z2 - z1) * (z2 - z1);
  if (l2 === 0) return Math.hypot(px - x1, pz - z1);
  let t = ((px - x1) * (x2 - x1) + (pz - z1) * (z2 - z1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), pz - (z1 + t * (z2 - z1)));
}

import * as THREE from 'three';
import { MapTile, ResourceNodeData } from '@agefront/shared';
import {
  getTerrainGrassTexture,
  getTerrainBumpTexture,
  getWaterRippleTexture,
  getWaterCausticsTexture,
  getShorelineFoamTexture,
  getWoodPlankTexture,
  getFoliageTexture,
  getPineNeedleTexture
} from './proceduralTextures.js';

export class TerrainMesh {
  public group: THREE.Group;
  private width: number;
  private height: number;
  private groundMesh: THREE.Mesh;
  private waterMesh: THREE.Mesh | null = null;
  private waterRippleTex: THREE.CanvasTexture | null = null;
  private waterCausticsTex: THREE.CanvasTexture | null = null;
  private waterCausticsMesh: THREE.Mesh | null = null;
  private shorelineFoamMesh: THREE.Mesh | null = null;
  private shorelineFoamMat: THREE.MeshBasicMaterial | null = null;
  private shorelineFoamTex: THREE.CanvasTexture | null = null;
  public resourceMeshes: Map<string, THREE.Object3D> = new Map();
  private borderLinesGroup: THREE.Group;
  private restrictedBorderGroup: THREE.Group;
  private treesGroup: THREE.Group;
  private tiles: MapTile[];
  private windUniforms = { uTime: { value: 0.0 } };

  
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

    
    // Precompute desire lines / dirt trails between resource nodes and settlement hubs
    const pathSegments: { x1: number; z1: number; x2: number; z2: number }[] = [];
    if (resourceNodes && resourceNodes.length > 0) {
      for (let a = 0; a < resourceNodes.length; a++) {
        const nodeA = resourceNodes[a];
        let nearestDist = 26;
        let nearestB: ResourceNodeData | null = null;
        for (let b = 0; b < resourceNodes.length; b++) {
          if (a === b) continue;
          const nodeB = resourceNodes[b];
          const d = Math.hypot(nodeA.x - nodeB.x, nodeA.y - nodeB.y);
          if (d < nearestDist && d > 3.5) {
            nearestDist = d;
            nearestB = nodeB;
          }
        }
        if (nearestB) {
          pathSegments.push({ x1: nodeA.x, z1: nodeA.y, x2: nearestB.x, z2: nearestB.y });
        }
      }
    }

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

      
      // Natural Trodden Dirt Footpaths & Workyard Clearings (Rise of Nations / Settlers Style)
      if (tile.terrain === 'grass') {
        let minPathDist = 999;
        for (let s = 0; s < pathSegments.length; s++) {
          const seg = pathSegments[s];
          if (vx < Math.min(seg.x1, seg.x2) - 2.5 || vx > Math.max(seg.x1, seg.x2) + 2.5) continue;
          if (vz < Math.min(seg.z1, seg.z2) - 2.5 || vz > Math.max(seg.z1, seg.z2) + 2.5) continue;
          const d = distToSegment(vx, vz, seg.x1, seg.z1, seg.x2, seg.z2);
          if (d < minPathDist) minPathDist = d;
        }

        const pathNoise = Math.sin(vx * 2.4 + vz * 1.8) * 0.16;
        const effectiveDist = minPathDist + pathNoise;
        if (effectiveDist < 1.15) {
          const intensity = Math.pow(1.0 - effectiveDist / 1.15, 1.4);
          const pathDirt = new THREE.Color(0x735639);
          const pathGravel = new THREE.Color(0x8a7052);
          const blendColor = effectiveDist < 0.45 ? pathDirt : pathGravel;
          color.lerp(blendColor, Math.min(0.88, intensity * 0.95));
        }

        // Trampled earth around resource clearing hubs
        let minNodeDist = 999;
        for (let n = 0; n < resourceNodes.length; n++) {
          const rn = resourceNodes[n];
          if (Math.abs(vx - rn.x) > 3.5 || Math.abs(vz - rn.y) > 3.5) continue;
          const d = Math.hypot(vx - rn.x, vz - rn.y);
          if (d < minNodeDist) minNodeDist = d;
        }
        if (minNodeDist < 2.4) {
          const nodeIntensity = Math.pow(1.0 - minNodeDist / 2.4, 1.3);
          const workyardColor = new THREE.Color(0x6e5235);
          color.lerp(workyardColor, Math.min(0.78, nodeIntensity * 0.88));
        }
      }

      // Wet Sand / Shoreline transition when near water level (Age of Empires II: DE damp beach)
      if (tile.terrain === 'sand' && vy < 0.14) {
        const wetness = Math.max(0, 1.0 - vy / 0.14);
        color.lerp(new THREE.Color(0x5c4832), wetness * 0.48); // Dark glistening wet shoreline sand
      }

      // Slope Cliff Shading: Any steep slope automatically turns into striated rock cliff face (AoE II: DE style)
      if (tile.terrain !== 'water' && tile.terrain !== 'sand' && ny < 0.75) {
        const strata = Math.sin(vy * 9.0 + Math.sin(vx * 1.5 + vz * 1.2) * 1.2) * 0.5 + 0.5;
        const cliffDark = new THREE.Color(0x2d343c); // Dark slate crevice
        const cliffLight = new THREE.Color(0x5a636e); // Exposed stone ledge strata
        const cliffColor = cliffDark.clone().lerp(cliffLight, strata * 0.5);
        const cliffMix = Math.min(1.0, (0.75 - ny) * 3.8);
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

      this.waterRippleTex = getWaterRippleTexture();
      this.waterRippleTex.repeat.set(width / 4, height / 4);

      const waterMat = new THREE.MeshStandardMaterial({
        color: 0x1873aa, // Vibrant aquatic river blue (Age of Empires II style)
        emissive: 0x0c3e5e, // Clear aquatic luminescence
        emissiveIntensity: 0.22,
        bumpMap: this.waterRippleTex,
        bumpScale: 0.045,
        roughness: 0.12,
        metalness: 0.22,
        transparent: true,
        opacity: 0.88,
        depthWrite: false
      });

      this.waterMesh = new THREE.Mesh(waterGeom, waterMat);
      this.waterMesh.receiveShadow = true;
      this.group.add(this.waterMesh);

      // 3b. Dynamic River Caustics Overlay (Sunlight refractions dancing across riverbeds)
      this.waterCausticsTex = getWaterCausticsTexture();
      this.waterCausticsTex.repeat.set(width / 4.5, height / 4.5);
      const causticsMat = new THREE.MeshBasicMaterial({
        map: this.waterCausticsTex,
        transparent: true,
        opacity: 0.32,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      this.waterCausticsMesh = new THREE.Mesh(waterGeom.clone(), causticsMat);
      this.waterCausticsMesh.position.y = 0.003; // Layered just above base water
      this.group.add(this.waterCausticsMesh);

      // 3c. Dynamic Shoreline Water Foam Ribbons (Frothy surf where water meets land)
      const isWater = (gx: number, gz: number): boolean => {
        if (gx < 0 || gx >= width || gz < 0 || gz >= height) return false;
        return tiles[gz * width + gx].terrain === 'water';
      };

      const foamPositions: number[] = [];
      const foamUvs: number[] = [];
      const foamIndices: number[] = [];
      const foamY = waterSurfaceY + 0.007;

      const addFoamRibbon = (
        p0x: number, p0z: number, p1x: number, p1z: number,
        in0x: number, in0z: number, in1x: number, in1z: number
      ) => {
        const baseIdx = foamPositions.length / 3;
        // Inner water side (v = 0.0)
        foamPositions.push(in0x, foamY, in0z);
        foamUvs.push(0.0, 0.0);

        foamPositions.push(in1x, foamY, in1z);
        foamUvs.push(1.0, 0.0);

        // Shore crest side (v = 1.0)
        foamPositions.push(p0x, foamY, p0z);
        foamUvs.push(0.0, 1.0);

        foamPositions.push(p1x, foamY, p1z);
        foamUvs.push(1.0, 1.0);

        foamIndices.push(baseIdx, baseIdx + 2, baseIdx + 1);
        foamIndices.push(baseIdx + 1, baseIdx + 2, baseIdx + 3);
      };

      for (const { tx, tz } of waterTiles) {
        // North border
        if (!isWater(tx, tz - 1)) {
          addFoamRibbon(
            tx, tz - 0.06, tx + 1, tz - 0.06,
            tx, tz + 0.38, tx + 1, tz + 0.38
          );
        }
        // South border
        if (!isWater(tx, tz + 1)) {
          addFoamRibbon(
            tx, tz + 1.06, tx + 1, tz + 1.06,
            tx, tz + 0.62, tx + 1, tz + 0.62
          );
        }
        // West border
        if (!isWater(tx - 1, tz)) {
          addFoamRibbon(
            tx - 0.06, tz, tx - 0.06, tz + 1,
            tx + 0.38, tz, tx + 0.38, tz + 1
          );
        }
        // East border
        if (!isWater(tx + 1, tz)) {
          addFoamRibbon(
            tx + 1.06, tz, tx + 1.06, tz + 1,
            tx + 0.62, tz, tx + 0.62, tz + 1
          );
        }
      }

      if (foamPositions.length > 0) {
        const foamGeom = new THREE.BufferGeometry();
        foamGeom.setAttribute('position', new THREE.Float32BufferAttribute(foamPositions, 3));
        foamGeom.setAttribute('uv', new THREE.Float32BufferAttribute(foamUvs, 2));
        foamGeom.setIndex(foamIndices);
        foamGeom.computeVertexNormals();

        this.shorelineFoamTex = getShorelineFoamTexture();
        this.shorelineFoamMat = new THREE.MeshBasicMaterial({
          map: this.shorelineFoamTex,
          transparent: true,
          opacity: 0.76,
          blending: THREE.NormalBlending,
          depthWrite: false
        });

        this.shorelineFoamMesh = new THREE.Mesh(foamGeom, this.shorelineFoamMat);
        this.group.add(this.shorelineFoamMesh);
      }
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
  // MOUNTAIN MASSIFS (Clean Natural AoE Cliff Ridges - no scattered balls)
  // -------------------------------------------------------------
  private buildMountainMassifs(width: number, height: number, tiles: MapTile[]): void {
    // The high-relief terrain mesh and sedimentary cliff strata shader already render
    // authentic Age of Empires granite and alpine mountain peaks directly on the terrain geometry.
  }

  // -------------------------------------------------------------
  // RESTRICTED AREA BOUNDARY MARKERS
  // -------------------------------------------------------------
  private buildRestrictedAreaBoundaryMarkers(width: number, height: number, tiles: MapTile[]): void {
    // Left clean to avoid cluttering hills and terrain with loose spheres
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

    // Diverse Forest Trees: Conifer Pines & Noble Broadleaf Oaks (Authentic AoE II/III DE style)
    if (forestSpots.length > 0) {
      const woodTex = getWoodPlankTexture();
      const foliageTex = getFoliageTexture();
      const pineNeedleTex = getPineNeedleTexture();

      const trunkMat = new THREE.MeshStandardMaterial({
        map: woodTex,
        color: 0x4a2a14, // Dark European timber bark
        roughness: 0.92,
        flatShading: false
      });

      // Conifers (50% of trees)
      const coniferSpots: THREE.Vector3[] = [];
      const oakSpots: THREE.Vector3[] = [];

      forestSpots.forEach((p, idx) => {
        if (idx % 2 === 0) coniferSpots.push(p);
        else oakSpots.push(p);
      });

      // Apply wind physics vertex animation shader hook
      const applyWindHook = (mat: THREE.MeshStandardMaterial) => {
        mat.onBeforeCompile = (shader) => {
          shader.uniforms.uTime = this.windUniforms.uTime;
          shader.vertexShader = `
            uniform float uTime;
            ${shader.vertexShader}
          `;
          shader.vertexShader = shader.vertexShader.replace(
            '#include <begin_vertex>',
            `
            #include <begin_vertex>
            // Wind physics: sway branches naturally
            float branchHeight = max(0.0, position.y);
            float windGust = sin(uTime * 2.2 + position.x * 2.0 + position.z * 1.5);
            float swayAmt = branchHeight * 0.045 * windGust;
            transformed.x += swayAmt;
            transformed.z += swayAmt * 0.6;
            `
          );
        };
      };

      // Conifer Meshes (Realistic tiered pine skirts with pine needle texture)
      if (coniferSpots.length > 0) {
        const cTrunkGeom = new THREE.CylinderGeometry(0.1, 0.18, 1.4, 8);
        cTrunkGeom.translate(0, 0.6, 0);

        const cTier1 = new THREE.ConeGeometry(0.98, 0.9, 8);
        cTier1.translate(0, 1.1, 0);
        const cTier2 = new THREE.ConeGeometry(0.78, 0.85, 8);
        cTier2.translate(0, 1.6, 0);
        const cTier3 = new THREE.ConeGeometry(0.55, 0.8, 8);
        cTier3.translate(0, 2.05, 0);

        const coniferMat1 = new THREE.MeshStandardMaterial({
          map: pineNeedleTex,
          color: 0x183b15,
          roughness: 0.85,
          flatShading: false
        });
        const coniferMat2 = new THREE.MeshStandardMaterial({
          map: pineNeedleTex,
          color: 0x214a1e,
          roughness: 0.82,
          flatShading: false
        });
        const coniferMat3 = new THREE.MeshStandardMaterial({
          map: pineNeedleTex,
          color: 0x2b5926,
          roughness: 0.8,
          flatShading: false
        });

        applyWindHook(coniferMat1);
        applyWindHook(coniferMat2);
        applyWindHook(coniferMat3);

        const instCTrunk = new THREE.InstancedMesh(cTrunkGeom, trunkMat, coniferSpots.length);
        const instCTier1 = new THREE.InstancedMesh(cTier1, coniferMat1, coniferSpots.length);
        const instCTier2 = new THREE.InstancedMesh(cTier2, coniferMat2, coniferSpots.length);
        const instCTier3 = new THREE.InstancedMesh(cTier3, coniferMat3, coniferSpots.length);

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
          instCTier1.setMatrixAt(idx, dummy.matrix);
          instCTier2.setMatrixAt(idx, dummy.matrix);
          instCTier3.setMatrixAt(idx, dummy.matrix);
        });

        instCTrunk.castShadow = true;
        instCTier1.castShadow = true;
        instCTier2.castShadow = true;
        instCTier3.castShadow = true;

        this.treesGroup.add(instCTrunk);
        this.treesGroup.add(instCTier1);
        this.treesGroup.add(instCTier2);
        this.treesGroup.add(instCTier3);
      }

      // Broadleaf Oaks (Layered organic canopies with leaf foliage texture)
      if (oakSpots.length > 0) {
        const oTrunkGeom = new THREE.CylinderGeometry(0.14, 0.22, 1.25, 8);
        oTrunkGeom.translate(0, 0.6, 0);

        const oCrown1Geom = new THREE.DodecahedronGeometry(0.85, 1);
        oCrown1Geom.translate(0, 1.5, 0);
        const oCrown2Geom = new THREE.DodecahedronGeometry(0.68, 1);
        oCrown2Geom.translate(-0.35, 1.35, 0.2);
        const oCrown3Geom = new THREE.DodecahedronGeometry(0.72, 1);
        oCrown3Geom.translate(0.35, 1.38, -0.18);

        const oakMat1 = new THREE.MeshStandardMaterial({
          map: foliageTex,
          color: 0x2a521a,
          roughness: 0.85,
          flatShading: false
        });
        const oakMat2 = new THREE.MeshStandardMaterial({
          map: foliageTex,
          color: 0x366622,
          roughness: 0.82,
          flatShading: false
        });
        const oakMat3 = new THREE.MeshStandardMaterial({
          map: foliageTex,
          color: 0x447a2c,
          roughness: 0.8,
          flatShading: false
        });

        applyWindHook(oakMat1);
        applyWindHook(oakMat2);
        applyWindHook(oakMat3);

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
  // RESOURCE DEPOSITS (Gold crystal nuggets, timber, stone, forage berries)
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

    const foliageTex = getFoliageTexture();
    const foodGeom = new THREE.DodecahedronGeometry(0.55, 1);
    const foodMat = new THREE.MeshStandardMaterial({
      map: foliageTex,
      color: 0x1f541b,
      roughness: 0.82,
      flatShading: false
    });
    const berryMat = new THREE.MeshStandardMaterial({
      color: 0xef4444, // Bright ruby red
      roughness: 0.35,
      metalness: 0.15,
      flatShading: false
    });

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
    // 1. Water surface wave opacity and flowing current ripple animation
    if (this.waterMesh && (this.waterMesh.material as THREE.MeshStandardMaterial)) {
      (this.waterMesh.material as THREE.MeshStandardMaterial).opacity = 0.82 + Math.sin(time * 2.0) * 0.04;
    }
    if (this.waterRippleTex) {
      this.waterRippleTex.offset.x = (time * 0.015) % 1.0;
      this.waterRippleTex.offset.y = (time * 0.009) % 1.0;
    }

    // 2. Dynamic River Caustics (Opposing fluid current drift and solar shimmer pulse)
    if (this.waterCausticsTex && this.waterCausticsMesh) {
      this.waterCausticsTex.offset.x = (-time * 0.012) % 1.0;
      this.waterCausticsTex.offset.y = (time * 0.016) % 1.0;
      (this.waterCausticsMesh.material as THREE.MeshBasicMaterial).opacity = 0.28 + Math.sin(time * 2.4) * 0.08;
    }

    // 3. Dynamic Shoreline Water Foam (Lapping surf and frothy lateral drift)
    if (this.shorelineFoamMat && this.shorelineFoamTex) {
      this.shorelineFoamMat.opacity = 0.64 + Math.sin(time * 3.2) * 0.20;
      this.shorelineFoamTex.offset.x = (time * 0.032) % 1.0;
    }

    // 4. Wind Physics Uniform for Swaying Forest Canopies
    this.windUniforms.uTime.value = time;
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
