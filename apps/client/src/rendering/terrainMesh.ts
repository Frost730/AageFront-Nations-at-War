import * as THREE from 'three';
import { MapTile, ResourceNodeData } from '@agefront/shared';

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

  constructor(width: number, height: number, tiles: MapTile[], resourceNodes: ResourceNodeData[]) {
    this.width = width;
    this.height = height;
    this.group = new THREE.Group();

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

      let color = new THREE.Color(0x34d399); // Base vibrant meadow green

      if (tile.terrain === 'water') {
        color = new THREE.Color(0x0284c7); // Vibrant azure riverbed (eliminates dark blackhole effect)
      } else if (tile.terrain === 'sand') {
        color = new THREE.Color(0xf59e0b); // Warm golden shore sand
        color.lerp(new THREE.Color(0xd97706), Math.abs(Math.sin(vx * 0.8)));
      } else if (tile.terrain === 'forest') {
        color = new THREE.Color(0x166534); // Deep woodland emerald
        color.lerp(new THREE.Color(0x14532d), Math.abs(Math.cos(vz * 0.6)));
      } else if (tile.terrain === 'mountain') {
        // Restricted Mountain High Ground
        if (vy >= 2.6) {
          // Alpine Snow Peak
          color = new THREE.Color(0xf8fafc);
          color.lerp(new THREE.Color(0xe2e8f0), 0.2);
        } else if (vy >= 1.6) {
          // High granite slate
          color = new THREE.Color(0x475569);
          if (ny < 0.65) color.lerp(new THREE.Color(0x1e293b), 0.4); // Deep shadow on steep cliff walls
        } else {
          // Rocky mountain slope base
          color = new THREE.Color(0x64748b);
        }
      } else {
        // Smooth natural grassland gradient (eliminates artificial checkerboard / polka-dot grid)
        const varChoice = Math.sin(vx * 0.08) * Math.cos(vz * 0.08) * 0.5 + Math.sin(vx * 0.15 + 1.2) * 0.2;
        const baseGrass = new THREE.Color(0x22c55e); // Lush spring grass
        const deepMeadow = new THREE.Color(0x15803d); // Rich meadow green
        const sunlitGrass = new THREE.Color(0x4ade80); // Sunlit warm hillside
        if (varChoice > 0.1) {
          color = baseGrass.clone().lerp(sunlitGrass, Math.min(1.0, (varChoice - 0.1) * 2.5));
        } else {
          color = baseGrass.clone().lerp(deepMeadow, Math.min(1.0, (0.1 - varChoice) * 2.5));
        }
      }

      // Slope Cliff Shading: Any steep slope automatically turns into striated rock cliff face
      if (tile.terrain !== 'water' && tile.terrain !== 'sand' && ny < 0.72) {
        const cliffColor = new THREE.Color(0x334155); // Dark granite cliff wall
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

    const groundMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.82,
      metalness: 0.08,
      flatShading: true
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
      color: 0x122718,
      roughness: 0.95,
      metalness: 0.05,
      flatShading: true
    });
    const skirtMesh = new THREE.Mesh(skirtGeom, skirtMat);
    skirtMesh.receiveShadow = true;
    this.group.add(skirtMesh);

    // 3. Optimized Static Water Surface - built strictly over actual water tiles with zero vertical movement!
    const waterTiles: { tx: number; tz: number }[] = [];
    for (let tz = 0; tz < height; tz++) {
      for (let tx = 0; tx < width; tx++) {
        if (tiles[tz * width + tx].terrain === 'water') {
          waterTiles.push({ tx, tz });
        }
      }
    }

    if (waterTiles.length > 0) {
      const pos: number[] = [];
      const waterSurfaceY = -0.08;
      const pad = 0.15; // seamless margin into shoreline

      waterTiles.forEach(({ tx, tz }) => {
        const x0 = tx - pad;
        const x1 = tx + 1 + pad;
        const z0 = tz - pad;
        const z1 = tz + 1 + pad;

        pos.push(
          x0, waterSurfaceY, z0,
          x0, waterSurfaceY, z1,
          x1, waterSurfaceY, z0,

          x1, waterSurfaceY, z0,
          x0, waterSurfaceY, z1,
          x1, waterSurfaceY, z1
        );
      });

      const waterGeom = new THREE.BufferGeometry();
      waterGeom.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      waterGeom.computeVertexNormals();

      const waterMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8, // Clear brilliant sky-cyan water
        emissive: 0x0284c7, // Radiant self-luminous azure glow - ensures water is always luminous and never black!
        emissiveIntensity: 0.45,
        roughness: 0.12,
        metalness: 0.1,
        transparent: true,
        opacity: 0.82,
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
  // 3D MOUNTAIN MASSIFS & JAGGED RESTRICTED PEAKS
  // -------------------------------------------------------------
  private buildMountainMassifs(width: number, height: number, tiles: MapTile[]): void {
    const mountainSpots: { pos: THREE.Vector3; elev: number; isHighPeak: boolean }[] = [];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const t = tiles[y * width + x];
        if (t && t.terrain === 'mountain') {
          const elev = t.elevation || 2;
          const baseY = elev >= 3 ? 3.0 : elev >= 2 ? 2.1 : 1.3;
          mountainSpots.push({
            pos: new THREE.Vector3(x + 0.5, baseY, y + 0.5),
            elev,
            isHighPeak: elev >= 2
          });
        }
      }
    }

    if (mountainSpots.length === 0) return;

    const mountainGroup = new THREE.Group();

    // 1. Towering Granite Mountain Spire
    const rockSpireGeom = new THREE.ConeGeometry(0.85, 2.2, 5);
    const rockSpireMat = new THREE.MeshStandardMaterial({
      color: 0x475569, // Slate granite rock
      roughness: 0.88,
      metalness: 0.12,
      flatShading: true
    });

    // 2. High Alpine Snow Cap Crown
    const snowCapGeom = new THREE.ConeGeometry(0.55, 1.0, 5);
    const snowCapMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc, // Pure sparkling alpine snow
      roughness: 0.35,
      metalness: 0.05,
      flatShading: true
    });

    // 3. Secondary Flanking Shoulder Boulder
    const flankGeom = new THREE.DodecahedronGeometry(0.65, 0);
    const flankMat = new THREE.MeshStandardMaterial({
      color: 0x334155, // Dark granite crevice rock
      roughness: 0.9,
      flatShading: true
    });

    const instRock = new THREE.InstancedMesh(rockSpireGeom, rockSpireMat, mountainSpots.length);
    const instSnow = new THREE.InstancedMesh(snowCapGeom, snowCapMat, mountainSpots.length);
    const instFlank1 = new THREE.InstancedMesh(flankGeom, flankMat, mountainSpots.length);
    const instFlank2 = new THREE.InstancedMesh(flankGeom, flankMat, mountainSpots.length);

    instRock.castShadow = true;
    instRock.receiveShadow = true;
    instSnow.castShadow = true;
    instSnow.receiveShadow = true;
    instFlank1.castShadow = true;
    instFlank2.castShadow = true;

    const dummy = new THREE.Object3D();

    mountainSpots.forEach((spot, idx) => {
      const scaleY = spot.elev >= 3 ? 1.5 : spot.elev >= 2 ? 1.2 : 0.9;
      const rotY = (idx * 1.37) % (Math.PI * 2);

      // Central Rock Spire
      dummy.position.set(spot.pos.x, spot.pos.y + 0.3, spot.pos.z);
      dummy.scale.set(1.15, scaleY, 1.15);
      dummy.rotation.set(0, rotY, 0);
      dummy.updateMatrix();
      instRock.setMatrixAt(idx, dummy.matrix);

      // Snow Cap (placed at summit of high peaks)
      if (spot.isHighPeak) {
        dummy.position.set(spot.pos.x, spot.pos.y + 0.3 + scaleY * 0.65, spot.pos.z);
        dummy.scale.set(0.9, scaleY * 0.7, 0.9);
        dummy.rotation.set(0, rotY, 0);
        dummy.updateMatrix();
        instSnow.setMatrixAt(idx, dummy.matrix);
      } else {
        dummy.scale.set(0, 0, 0);
        dummy.updateMatrix();
        instSnow.setMatrixAt(idx, dummy.matrix);
      }

      // Flanking Crag 1
      dummy.position.set(spot.pos.x + 0.38, spot.pos.y - 0.2, spot.pos.z + 0.3);
      dummy.scale.set(0.65, 0.8, 0.65);
      dummy.rotation.set(0.2, rotY + 0.8, -0.3);
      dummy.updateMatrix();
      instFlank1.setMatrixAt(idx, dummy.matrix);

      // Flanking Crag 2
      dummy.position.set(spot.pos.x - 0.35, spot.pos.y - 0.25, spot.pos.z - 0.28);
      dummy.scale.set(0.6, 0.75, 0.6);
      dummy.rotation.set(-0.3, rotY - 0.9, 0.2);
      dummy.updateMatrix();
      instFlank2.setMatrixAt(idx, dummy.matrix);
    });

    mountainGroup.add(instRock);
    mountainGroup.add(instSnow);
    mountainGroup.add(instFlank1);
    mountainGroup.add(instFlank2);
    this.group.add(mountainGroup);
  }

  // -------------------------------------------------------------
  // RESTRICTED AREA BOUNDARY MARKERS (Clear mountain cliff borders)
  // -------------------------------------------------------------
  private buildRestrictedAreaBoundaryMarkers(width: number, height: number, tiles: MapTile[]): void {
    const boundaryPoints: THREE.Vector3[] = [];
    const cairnSpots: THREE.Vector3[] = [];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const t = tiles[y * width + x];
        if (t && t.terrain === 'mountain') {
          // Check 4 cardinal neighbors
          const checkEdge = (nx: number, ny: number, p1: THREE.Vector3, p2: THREE.Vector3) => {
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) return;
            const neighbor = tiles[ny * width + nx];
            if (neighbor && neighbor.terrain !== 'mountain') {
              boundaryPoints.push(p1, p2);
              if (Math.random() < 0.35) {
                cairnSpots.push(new THREE.Vector3((p1.x + p2.x) / 2, 0.2, (p1.z + p2.z) / 2));
              }
            }
          };

          const baseY = 0.25;
          // North edge (z)
          checkEdge(x, y - 1, new THREE.Vector3(x, baseY, y), new THREE.Vector3(x + 1, baseY, y));
          // South edge (z + 1)
          checkEdge(x, y + 1, new THREE.Vector3(x, baseY, y + 1), new THREE.Vector3(x + 1, baseY, y + 1));
          // West edge (x)
          checkEdge(x - 1, y, new THREE.Vector3(x, baseY, y), new THREE.Vector3(x, baseY, y + 1));
          // East edge (x + 1)
          checkEdge(x + 1, y, new THREE.Vector3(x + 1, baseY, y), new THREE.Vector3(x + 1, baseY, y + 1));
        }
      }
    }

    // 1. Subtle, stylish cliff-edge hazard boundary lines
    if (boundaryPoints.length > 0) {
      const lineGeom = new THREE.BufferGeometry().setFromPoints(boundaryPoints);
      const lineMat = new THREE.LineBasicMaterial({
        color: 0xf59e0b, // Amber-gold restricted border highlight
        transparent: true,
        opacity: 0.65,
        linewidth: 2
      });
      const lines = new THREE.LineSegments(lineGeom, lineMat);
      this.restrictedBorderGroup.add(lines);
    }

    // 2. Talus Boulder & Rock Cairn markers along restricted mountain foot
    if (cairnSpots.length > 0) {
      const boulderGeom = new THREE.DodecahedronGeometry(0.28, 0);
      const boulderMat = new THREE.MeshStandardMaterial({
        color: 0x64748b,
        roughness: 0.9,
        flatShading: true
      });
      const instCairn = new THREE.InstancedMesh(boulderGeom, boulderMat, cairnSpots.length);
      const dummy = new THREE.Object3D();
      cairnSpots.forEach((pos, idx) => {
        dummy.position.copy(pos);
        const s = 0.6 + (idx % 5) * 0.15;
        dummy.scale.set(s, s * 0.7, s);
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

    // 1. Diverse Forest Trees: Conifer Pines & Noble Firs
    if (forestSpots.length > 0) {
      const trunkGeom = new THREE.CylinderGeometry(0.12, 0.18, 0.95, 5);
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.9, flatShading: true });

      const cone1Geom = new THREE.ConeGeometry(0.88, 1.25, 5);
      cone1Geom.translate(0, 0.9, 0);
      const cone2Geom = new THREE.ConeGeometry(0.68, 1.05, 5);
      cone2Geom.translate(0, 1.55, 0);

      const foliageMat1 = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.72, flatShading: true });
      const foliageMat2 = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.68, flatShading: true });

      const instTrunk = new THREE.InstancedMesh(trunkGeom, trunkMat, forestSpots.length);
      const instCone1 = new THREE.InstancedMesh(cone1Geom, foliageMat1, forestSpots.length);
      const instCone2 = new THREE.InstancedMesh(cone2Geom, foliageMat2, forestSpots.length);

      const dummy = new THREE.Object3D();
      forestSpots.forEach((pos, idx) => {
        dummy.position.copy(pos);
        const scale = 0.82 + ((idx * 23) % 40) * 0.01;
        dummy.scale.set(scale, scale, scale);
        dummy.rotation.y = ((idx * 47) % 360) * (Math.PI / 180);
        dummy.updateMatrix();

        instTrunk.setMatrixAt(idx, dummy.matrix);
        instCone1.setMatrixAt(idx, dummy.matrix);
        instCone2.setMatrixAt(idx, dummy.matrix);
      });

      instTrunk.castShadow = true;
      instCone1.castShadow = true;
      instCone2.castShadow = true;

      this.treesGroup.add(instTrunk);
      this.treesGroup.add(instCone1);
      this.treesGroup.add(instCone2);
    }
  }

  // -------------------------------------------------------------
  // RESOURCE DEPOSITS (Gold Yellow nuggets, timber, stone, berries)
  // -------------------------------------------------------------
  private buildResourceDecorations(nodes: ResourceNodeData[]): void {
    const stoneGeom = new THREE.DodecahedronGeometry(0.68, 0);
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.85, flatShading: true });

    // Radiant, gleaming Pure Gold Yellow Material
    const goldYellowMat = new THREE.MeshStandardMaterial({
      color: 0xffd700, // Brilliant Pure Gold Yellow
      roughness: 0.15,
      metalness: 0.92,
      emissive: 0x553d00, // Warm golden luminescence
      flatShading: true
    });
    const bedrockMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.9,
      flatShading: true
    });

    const foodGeom = new THREE.SphereGeometry(0.48, 6, 5);
    const foodMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.7, flatShading: true });
    const berryMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4, flatShading: true });

    // Tree geometries for wood nodes
    const trunkGeom = new THREE.CylinderGeometry(0.14, 0.18, 0.95, 5);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.9, flatShading: true });
    const cone1Geom = new THREE.ConeGeometry(0.88, 1.25, 5);
    const cone2Geom = new THREE.ConeGeometry(0.68, 1.05, 5);
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.7, flatShading: true });

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
