import * as THREE from 'three';
import { BuildingData } from '@agefront/shared';
import {
  getStoneBrickTexture,
  getStoneBrickBumpTexture,
  getTerracottaRoofTexture,
  getWoodPlankTexture,
  getCobblestoneTexture
} from './proceduralTextures.js';

/**
 * Creates high-poly, authentic Age of Empires II / III: Definitive Edition
 * 3D architectural models with historical masonry, half-timbering, tile roofs,
 * animated props, and high-fidelity PBR materials.
 */
export function createBuildingModel(bldg: BuildingData, teamColor: string): THREE.Group {
  const root = new THREE.Group();
  root.position.set(bldg.x + bldg.width / 2, 0, bldg.y + bldg.height / 2);

  // -------------------------------------------------------------
  // HIGH-FIDELITY PBR MATERIAL PALETTE (Age of Empires II: DE)
  // -------------------------------------------------------------
  const stoneTex = getStoneBrickTexture();
  const stoneBumpTex = getStoneBrickBumpTexture();
  const cobblestoneTex = getCobblestoneTexture();
  const roofTex = getTerracottaRoofTexture();
  const woodTex = getWoodPlankTexture();

  // Dressed Ashlar Stone & Foundations
  const stoneMat = new THREE.MeshStandardMaterial({
    map: stoneTex,
    bumpMap: stoneBumpTex,
    bumpScale: 0.04,
    roughness: 0.76,
    metalness: 0.08,
    flatShading: false
  });
  const darkStoneMat = new THREE.MeshStandardMaterial({
    map: cobblestoneTex,
    bumpScale: 0.05,
    roughness: 0.84,
    metalness: 0.12,
    flatShading: false
  });
  const marbleMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9, // Classical polished white marble
    roughness: 0.32,
    metalness: 0.12,
    flatShading: false
  });

  // Heavy Timber & Wood Planks
  const timberMat = new THREE.MeshStandardMaterial({
    map: woodTex,
    color: 0x54280e, // Dark European weathered oak
    roughness: 0.8,
    metalness: 0.05,
    flatShading: false
  });
  const plankWoodMat = new THREE.MeshStandardMaterial({
    map: woodTex,
    color: 0x854316, // Hewn pine planks
    roughness: 0.74,
    metalness: 0.05,
    flatShading: false
  });
  const lightWoodMat = new THREE.MeshStandardMaterial({
    map: woodTex,
    color: 0xb45309, // Light scaffolding timber & fences
    roughness: 0.7,
    metalness: 0.04,
    flatShading: false
  });

  // Roof Shingles & Clay Tiles
  const tileRoofMat = new THREE.MeshStandardMaterial({
    map: roofTex,
    roughness: 0.5,
    metalness: 0.08,
    flatShading: false
  });
  const slateRoofMat = new THREE.MeshStandardMaterial({
    map: roofTex,
    color: 0x334155, // Blue-grey Welsh slate
    roughness: 0.46,
    metalness: 0.18,
    flatShading: false
  });

  // Faction Team Color & Accents
  const teamCol = new THREE.Color(teamColor);
  const teamMat = new THREE.MeshStandardMaterial({
    color: teamCol,
    roughness: 0.35,
    metalness: 0.24,
    flatShading: false
  });
  const teamDarkMat = new THREE.MeshStandardMaterial({
    color: teamCol.clone().multiplyScalar(0.68),
    roughness: 0.45,
    metalness: 0.2,
    flatShading: false
  });

  // Metals & Glows
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b, // Polished brass & gilded finials
    roughness: 0.2,
    metalness: 0.88,
    flatShading: false
  });
  const ironMat = new THREE.MeshStandardMaterial({
    color: 0x334155, // Wrought dark iron
    roughness: 0.4,
    metalness: 0.82,
    flatShading: false
  });
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8, // Polished steel
    roughness: 0.2,
    metalness: 0.9,
    flatShading: false
  });
  const canvasMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7, // Woven linen canvas & plaster
    roughness: 0.88,
    flatShading: false
  });
  const darkLeatherMat = new THREE.MeshStandardMaterial({
    color: 0x3d2212, // Dark tanned leather / dark iron hub
    roughness: 0.85,
    metalness: 0.1,
    flatShading: false
  });
  const lanternGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.95,
    roughness: 0.2
  });
  const fireGlowMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    emissive: 0xea580c,
    emissiveIntensity: 1.25,
    roughness: 0.3
  });
  const arcanaCrystalMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 1.1,
    roughness: 0.15
  });

  // Helper for adding hanging lanterns
  const addLantern = (x: number, y: number, z: number) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.26, 12), ironMat);
    post.position.set(x, y + 0.1, z);
    root.add(post);

    const lantern = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12, 0), lanternGlowMat);
    lantern.position.set(x, y, z);
    lantern.userData = { isLantern: true };
    root.add(lantern);
  };

  // -------------------------------------------------------------
  // UNCONSTRUCTED SCAFFOLDING & WORKSITE
  // -------------------------------------------------------------
  if (!bldg.isConstructed) {
    const w = bldg.width;
    const h = bldg.height;

    // Stone foundation outline
    const fnd = new THREE.Mesh(new THREE.BoxGeometry(w * 0.98, 0.25, h * 0.98), darkStoneMat);
    fnd.position.y = 0.12;
    root.add(fnd);

    // Multi-tier timber scaffolding platforms
    const p1 = new THREE.Mesh(new THREE.BoxGeometry(w * 0.85, 0.12, h * 0.85), plankWoodMat);
    p1.position.y = 0.9;
    root.add(p1);

    const p2 = new THREE.Mesh(new THREE.BoxGeometry(w * 0.6, 0.1, h * 0.6), plankWoodMat);
    p2.position.y = 1.9;
    root.add(p2);

    // Upright structural poles
    const poleGeom = new THREE.CylinderGeometry(0.08, 0.08, 2.8, 12);
    const poleOffsets = [
      [-w * 0.42, -h * 0.42], [w * 0.42, -h * 0.42],
      [-w * 0.42, h * 0.42], [w * 0.42, h * 0.42],
      [0, -h * 0.42], [0, h * 0.42],
      [-w * 0.42, 0], [w * 0.42, 0]
    ];
    poleOffsets.forEach(([cx, cz]) => {
      const pole = new THREE.Mesh(poleGeom, lightWoodMat);
      pole.position.set(cx, 1.4, cz);
      root.add(pole);
    });

    // Cross brace beams
    const brace1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, w * 1.1), lightWoodMat);
    brace1.position.set(0, 1.3, -h * 0.42);
    brace1.rotation.y = Math.PI / 2;
    brace1.rotation.x = Math.PI / 5;
    root.add(brace1);

    // Canvas work tarp
    const tarp = new THREE.Mesh(new THREE.BoxGeometry(w * 0.45, 0.9, h * 0.45), canvasMat);
    tarp.position.set(-w * 0.2, 1.7, -h * 0.2);
    root.add(tarp);

    // Masonry stone blocks on ground
    const block1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.5), stoneMat);
    block1.position.set(w * 0.3, 0.3, h * 0.25);
    root.add(block1);

    // Tag and return
    root.traverse((child: any) => {
      if ((child as THREE.Mesh).isMesh) {
        child.userData = { entityType: 'building', entityId: bldg.id };
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return root;
  }

  // -------------------------------------------------------------
  // DETAILED COMPLETED BUILDINGS (AGE OF EMPIRES II: DE)
  // -------------------------------------------------------------
  // Helper for dynamic wind-fluttered royal banners & pennants
  const createFlutteringBanner = (poleHeight: number, bTeamColor: string, bannerWidth = 0.65, bannerHeight = 0.35): THREE.Group => {
    const bannerGroup = new THREE.Group();

    // Wooden flagpole with brass fittings
    const poleGeom = new THREE.CylinderGeometry(0.025, 0.035, poleHeight, 10);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.8 });
    const pole = new THREE.Mesh(poleGeom, poleMat);
    pole.position.y = poleHeight / 2;
    bannerGroup.add(pole);

    // Gilded finial topper
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), goldMat);
    finial.position.y = poleHeight;
    bannerGroup.add(finial);

    // Banner cloth pivot attached to pole
    const bannerPivot = new THREE.Group();
    bannerPivot.position.set(0, poleHeight - bannerHeight * 0.55, 0);
    bannerPivot.userData = { isWindBanner: true };

    // Pennant cloth with pivot at mast edge
    const clothGeom = new THREE.PlaneGeometry(bannerWidth, bannerHeight, 6, 2);
    clothGeom.translate(bannerWidth / 2, 0, 0);
    const clothMat = new THREE.MeshStandardMaterial({
      color: bTeamColor,
      roughness: 0.65,
      metalness: 0.05,
      side: THREE.DoubleSide
    });
    const clothMesh = new THREE.Mesh(clothGeom, clothMat);
    bannerPivot.add(clothMesh);

    bannerGroup.add(bannerPivot);
    return bannerGroup;
  };

  // Age of Empires Ground Foundation Apron (Cobblestone / Beaten Earth Lot)
  if (bldg.type !== 'farm' && bldg.type !== 'wall') {
    const apronW = bldg.width + 0.38;
    const apronH = bldg.height + 0.38;
    const apronGeom = new THREE.BoxGeometry(apronW, 0.06, apronH);
    const apronMat = new THREE.MeshStandardMaterial({
      color: 0x8a7657, // Warm historical earth & weathered cobblestone
      roughness: 0.94,
      metalness: 0.04,
      flatShading: false
    });
    const apron = new THREE.Mesh(apronGeom, apronMat);
    apron.position.y = 0.03;
    apron.receiveShadow = true;
    root.add(apron);

    // Dressed stone curb edging along foundation perimeter
    const curbMat = new THREE.MeshStandardMaterial({
      color: 0x5a5247, // Dark dressed stone trim
      roughness: 0.88,
      flatShading: false
    });
    const curbN = new THREE.Mesh(new THREE.BoxGeometry(apronW + 0.08, 0.08, 0.08), curbMat);
    curbN.position.set(0, 0.04, -apronH / 2);
    curbN.receiveShadow = true;
    root.add(curbN);

    const curbS = new THREE.Mesh(new THREE.BoxGeometry(apronW + 0.08, 0.08, 0.08), curbMat);
    curbS.position.set(0, 0.04, apronH / 2);
    curbS.receiveShadow = true;
    root.add(curbS);

    const curbW = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, apronH), curbMat);
    curbW.position.set(-apronW / 2, 0.04, 0);
    curbW.receiveShadow = true;
    root.add(curbW);

    const curbE = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, apronH), curbMat);
    curbE.position.set(apronW / 2, 0.04, 0);
    curbE.receiveShadow = true;
    root.add(curbE);
  }

  switch (bldg.type) {
    case 'town_centre': {
      // 1. Massive Stepped Stone Foundation & Ashlar Plinth
      const plinth1 = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.25, 4.3), darkStoneMat);
      plinth1.position.y = 0.12;
      root.add(plinth1);

      const plinth2 = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.25, 4.0), stoneMat);
      plinth2.position.y = 0.32;
      root.add(plinth2);

      // Multi-tier entrance stone stairs
      const stairs1 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.18, 0.8), stoneMat);
      stairs1.position.set(0, 0.09, 2.3);
      root.add(stairs1);

      const stairs2 = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.18, 0.5), stoneMat);
      stairs2.position.set(0, 0.25, 2.15);
      root.add(stairs2);

      // 2. Heavy Ground Fortress Keep with Quoins
      const keep = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.8, 3.6), stoneMat);
      keep.position.y = 1.3;
      root.add(keep);

      // Timber hoardings (cantilevered defensive upper gallery with brackets)
      const hoarding = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.3, 3.8), timberMat);
      hoarding.position.y = 2.25;
      root.add(hoarding);

      // Upper council keep level
      const upperKeep = new THREE.Mesh(new THREE.BoxGeometry(2.9, 1.4, 2.9), darkStoneMat);
      upperKeep.position.y = 2.95;
      root.add(upperKeep);

      // Main Grand Slate Roof with 24 segments and ridge tile
      const mainRoof = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1.6, 24), slateRoofMat);
      mainRoof.position.y = 4.25;
      mainRoof.rotation.y = Math.PI / 4;
      root.add(mainRoof);

      // Ridge tile crest bar
      const ridgeBar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 2.2), goldMat);
      ridgeBar.position.y = 4.95;
      root.add(ridgeBar);

      // 3. Four Octagonal Corner Bastions with Machicolations and Conical Roofs
      const bastionGeom = new THREE.CylinderGeometry(0.55, 0.65, 3.6, 20);
      const bastionCapGeom = new THREE.ConeGeometry(0.68, 1.25, 20);
      const corners = [[-1.8, -1.8], [1.8, -1.8], [-1.8, 1.8], [1.8, 1.8]];
      corners.forEach(([cx, cz]) => {
        const bastion = new THREE.Mesh(bastionGeom, stoneMat);
        bastion.position.set(cx, 1.8, cz);
        root.add(bastion);

        const corbelRing = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.55, 0.3, 20), darkStoneMat);
        corbelRing.position.set(cx, 3.6, cz);
        root.add(corbelRing);

        const cap = new THREE.Mesh(bastionCapGeom, teamMat);
        cap.position.set(cx, 4.25, cz);
        root.add(cap);

        const finial = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.3, 10), goldMat);
        finial.position.set(cx, 4.95, cz);
        root.add(finial);
      });

      // 4. Central Belfry & Clock Spire
      const belfry = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.6, 1.25), stoneMat);
      belfry.position.set(0, 4.5, 0);
      root.add(belfry);

      // Bronze Town Bell inside bell arch
      const bell = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.35, 12), goldMat);
      bell.position.set(0, 4.35, 0);
      bell.rotation.x = Math.PI;
      root.add(bell);

      const belfryRoof = new THREE.Mesh(new THREE.ConeGeometry(1.0, 1.45, 20), teamDarkMat);
      belfryRoof.position.set(0, 5.7, 0);
      belfryRoof.rotation.y = Math.PI / 4;
      root.add(belfryRoof);

      // 5. Arched Grand Oak Portal with Iron Trim and Studs
      const archPortal = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.35, 0.25), timberMat);
      archPortal.position.set(0, 0.8, 1.84);
      root.add(archPortal);

      const gateFrame = new THREE.Mesh(new THREE.BoxGeometry(1.35, 1.55, 0.15), darkStoneMat);
      gateFrame.position.set(0, 0.9, 1.86);
      root.add(gateFrame);

      // 6. High Faction Heraldic Banner (Wind Animated)
      const tcBanner = createFlutteringBanner(2.4, teamColor, 1.4, 0.8);
      tcBanner.position.set(0, 6.4, 0);
      root.add(tcBanner);

      // Town Well in Courtyard
      const wellBase = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.38, 0.35, 14), stoneMat);
      wellBase.position.set(-1.1, 0.2, 1.2);
      root.add(wellBase);

      const wellRoof = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.4, 14), tileRoofMat);
      wellRoof.position.set(-1.1, 0.7, 1.2);
      root.add(wellRoof);

      // Flanking lanterns
      addLantern(-0.9, 1.0, 1.85);
      addLantern(0.9, 1.0, 1.85);
      break;
    }

    case 'house': {
      // 1. Cobblestone Fieldstone Plinth
      const base = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.35, 1.75), darkStoneMat);
      base.position.y = 0.17;
      root.add(base);

      // 2. Tudor Plaster Walls with Fachwerk Half-Timber Framing
      const walls = new THREE.Mesh(new THREE.BoxGeometry(1.55, 1.05, 1.55), canvasMat);
      walls.position.y = 0.82;
      root.add(walls);

      // Corner Timber Posts & Diagonal Braces
      const cornersX = [-0.78, 0.78];
      const cornersZ = [-0.78, 0.78];
      cornersX.forEach(cx => {
        cornersZ.forEach(cz => {
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.05, 0.09), timberMat);
          post.position.set(cx, 0.82, cz);
          root.add(post);
        });
      });

      // Horizontal Wall Plate
      const hPlate = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 1.6), timberMat);
      hPlate.position.set(0, 1.34, 0);
      root.add(hPlate);

      // 3. Steep Terracotta Tiled Dual-Pitch Gable Roof with Ridge Tiles
      const roof = new THREE.Mesh(new THREE.ConeGeometry(1.45, 1.15, 20), tileRoofMat);
      roof.position.y = 1.9;
      roof.rotation.y = Math.PI / 4;
      root.add(roof);

      const ridgeCap = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.2), goldMat);
      ridgeCap.position.y = 2.45;
      root.add(ridgeCap);

      // Front Oak Door with Iron Strap Hinges
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.7, 0.06), timberMat);
      door.position.set(0, 0.52, 0.8);
      root.add(door);

      // Stone Chimney with Clay Pot
      const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.25, 0.35), darkStoneMat);
      chimney.position.set(0.45, 1.95, 0.35);
      root.add(chimney);

      const chimPot = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.25, 10), tileRoofMat);
      chimPot.position.set(0.45, 2.65, 0.35);
      root.add(chimPot);

      // Firewood pile outside & water barrel
      const logGeom = new THREE.CylinderGeometry(0.07, 0.07, 0.55, 10);
      logGeom.rotateZ(Math.PI / 2);
      for (let l = 0; l < 3; l++) {
        const log = new THREE.Mesh(logGeom, lightWoodMat);
        log.position.set(-0.6, 0.15 + l * 0.1, 0.75);
        root.add(log);
      }

      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.16, 0.42, 12), timberMat);
      barrel.position.set(0.65, 0.22, 0.75);
      root.add(barrel);

      addLantern(0.35, 0.8, 0.8);
      break;
    }

    case 'farm': {
      // 1. Ploughed Rich Soil Plot with Furrows
      const soil = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.16, 1.95), new THREE.MeshStandardMaterial({ color: 0x6d310e, roughness: 0.96 }));
      soil.position.y = 0.08;
      root.add(soil);

      // 2. Golden Wheat Rows (Wind Animated)
      const wheatGeom = new THREE.BoxGeometry(1.68, 0.35, 0.16);
      const wheatMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.8, flatShading: false });
      for (let z = -0.65; z <= 0.65; z += 0.32) {
        const row = new THREE.Mesh(wheatGeom, wheatMat);
        row.position.set(0.1, 0.32, z);
        row.userData = { isWindWheat: true, baseZ: z };
        root.add(row);
      }

      // Rustic Split-Rail Cedar Fence
      const fenceBar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 1.85), lightWoodMat);
      fenceBar.position.set(-0.88, 0.32, 0);
      root.add(fenceBar);

      // 3. Octagonal Dutch Windmill Tower with 20 segments
      const mill = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 2.1, 20), stoneMat);
      mill.position.set(-0.5, 1.05, -0.45);
      root.add(mill);

      const millCap = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.75, 20), tileRoofMat);
      millCap.position.set(-0.5, 2.4, -0.45);
      root.add(millCap);

      // 4. Rotating 4-Blade Timber Windmill Sails Group (Animated in Render Loop!)
      const sailsGroup = new THREE.Group();
      sailsGroup.position.set(-0.5, 2.15, -0.1);
      sailsGroup.userData = { isRotator: true, rotSpeed: 0.8, rotAxis: 'z' };

      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.12, 14), darkLeatherMat);
      hub.rotation.x = Math.PI / 2;
      sailsGroup.add(hub);

      for (let i = 0; i < 4; i++) {
        const armGroup = new THREE.Group();
        armGroup.rotation.z = (Math.PI / 2) * i;

        // Timber spar
        const spar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.45, 0.05), timberMat);
        spar.position.set(0, 0.75, 0);
        armGroup.add(spar);

        // Linen canvas lattice sail
        const sailCloth = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 1.25), canvasMat);
        sailCloth.position.set(0.18, 0.75, 0.01);
        sailCloth.material.side = THREE.DoubleSide;
        armGroup.add(sailCloth);

        sailsGroup.add(armGroup);
      }
      root.add(sailsGroup);
      break;
    }

    case 'lumber_camp': {
      // 1. Heavy Timber Sawmill Shed
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.65, 1.15, 1.45), timberMat);
      cabin.position.set(-0.15, 0.58, 0.1);
      root.add(cabin);

      const roof = new THREE.Mesh(new THREE.ConeGeometry(1.35, 0.85, 20), slateRoofMat);
      roof.position.set(-0.15, 1.5, 0.1);
      roof.rotation.y = Math.PI / 4;
      root.add(roof);

      // 2. Open Sawpit with Overhead Timber Canopy
      const postGeom = new THREE.CylinderGeometry(0.07, 0.07, 1.45, 12);
      const p1 = new THREE.Mesh(postGeom, lightWoodMat);
      p1.position.set(0.68, 0.72, -0.6);
      root.add(p1);
      const p2 = new THREE.Mesh(postGeom, lightWoodMat);
      p2.position.set(0.68, 0.72, 0.6);
      root.add(p2);

      const sawCanopy = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.08, 1.45), plankWoodMat);
      sawCanopy.position.set(0.68, 1.45, 0);
      root.add(sawCanopy);

      // High-poly Toothed Circular Saw Blade (Rotating in Render Loop!)
      const sawBlade = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.04, 20), steelMat);
      sawBlade.position.set(0.68, 0.45, 0);
      sawBlade.rotation.x = Math.PI / 2;
      sawBlade.userData = { isRotator: true, rotSpeed: 4.0, rotAxis: 'y' };
      root.add(sawBlade);

      // 3. Stacked Hewn Logs with bark texture
      const logGeom = new THREE.CylinderGeometry(0.13, 0.13, 1.25, 16);
      logGeom.rotateZ(Math.PI / 2);
      for (let layer = 0; layer < 3; layer++) {
        for (let row = 0; row < 3 - layer; row++) {
          const log = new THREE.Mesh(logGeom, timberMat);
          log.position.set(-0.25, 0.13 + layer * 0.2, -0.65 + row * 0.28);
          root.add(log);
        }
      }

      // Chopping stump with iron axe embedded
      const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.38, 16), timberMat);
      stump.position.set(0.38, 0.19, 0.68);
      root.add(stump);

      const axeHead = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.05), steelMat);
      axeHead.position.set(0.38, 0.42, 0.68);
      root.add(axeHead);
      break;
    }

    case 'quarry': {
      // 1. Excavated Terraced Limestone Pit
      const pit = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.38, 1.95), darkStoneMat);
      pit.position.y = 0.19;
      root.add(pit);

      // 2. Dressed Granite Ashlar Blocks
      const blockGeom = new THREE.BoxGeometry(0.58, 0.44, 0.58);
      const b1 = new THREE.Mesh(blockGeom, stoneMat);
      b1.position.set(0.42, 0.48, 0.36);
      root.add(b1);

      const b2 = new THREE.Mesh(blockGeom, stoneMat);
      b2.position.set(0.28, 0.9, 0.32);
      b2.rotation.y = 0.25;
      root.add(b2);

      // 3. Heavy Timber Derrick Crane with Pulley Rigging
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 2.5, 14), timberMat);
      mast.position.set(-0.55, 1.25, -0.55);
      root.add(mast);

      const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 1.9, 14), timberMat);
      boom.position.set(-0.15, 2.05, -0.3);
      boom.rotation.z = Math.PI / 3.2;
      root.add(boom);

      // Hanging Stone Block on Crane Cable
      const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.1, 10), ironMat);
      rope.position.set(0.38, 1.55, -0.15);
      root.add(rope);

      const hangingStone = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.32, 0.42), stoneMat);
      hangingStone.position.set(0.38, 0.95, -0.15);
      root.add(hangingStone);
      break;
    }

    case 'mining_camp': {
      // 1. Reinforced Timber Mine Adit Frame with Tunnel Mouth
      const portalBase = new THREE.Mesh(new THREE.BoxGeometry(1.75, 1.35, 1.55), darkStoneMat);
      portalBase.position.y = 0.68;
      root.add(portalBase);

      const tunnel = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.98, 0.15), new THREE.MeshBasicMaterial({ color: 0x020617 }));
      tunnel.position.set(0, 0.58, 0.78);
      root.add(tunnel);

      // Heavy Timber Shoring Posts
      const postL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.15, 0.15), timberMat);
      postL.position.set(-0.5, 0.62, 0.84);
      root.add(postL);

      const postR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.15, 0.15), timberMat);
      postR.position.set(0.5, 0.62, 0.84);
      root.add(postR);

      const lintel = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.15, 0.15), timberMat);
      lintel.position.set(0, 1.2, 0.84);
      root.add(lintel);

      // 2. Iron Mine Rails & Loaded Ore Cart
      for (const trackX of [-0.25, 0.25]) {
        const track = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 1.25), ironMat);
        track.position.set(trackX, 0.06, 0.95);
        root.add(track);
      }

      const cart = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.4, 0.5), ironMat);
      cart.position.set(0, 0.3, 1.15);
      root.add(cart);

      const goldNuggets = new THREE.Mesh(new THREE.DodecahedronGeometry(0.25, 1), goldMat);
      goldNuggets.position.set(0, 0.52, 1.15);
      root.add(goldNuggets);

      // Assay Furnace with Glowing Hot Coals
      const forge = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.65, 0.52), darkStoneMat);
      forge.position.set(-0.62, 0.32, -0.4);
      root.add(forge);

      const forgeFire = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.28, 0.32), fireGlowMat);
      forgeFire.position.set(-0.62, 0.68, -0.4);
      root.add(forgeFire);

      addLantern(0.65, 0.8, 0.8);
      break;
    }

    case 'barracks': {
      // 1. Heavy Fortified Stone Plinth with Buttresses
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(2.95, 0.38, 2.75), darkStoneMat);
      plinth.position.y = 0.19;
      root.add(plinth);

      // 2. Main Muster Hall with Corner Buttresses
      const hall = new THREE.Mesh(new THREE.BoxGeometry(2.65, 1.55, 2.45), stoneMat);
      hall.position.y = 1.05;
      root.add(hall);

      // Parapet Crenellations
      const parapet = new THREE.Mesh(new THREE.BoxGeometry(2.75, 0.32, 2.55), darkStoneMat);
      parapet.position.y = 1.9;
      root.add(parapet);

      // Steep Tiled Roof with Cresting
      const roof = new THREE.Mesh(new THREE.ConeGeometry(2.05, 1.35, 20), teamMat);
      roof.position.y = 2.45;
      roof.rotation.y = Math.PI / 4;
      root.add(roof);

      // 3. Arched Iron Portcullis Gateway
      const gateArch = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.25, 0.2), ironMat);
      gateArch.position.set(0, 0.72, 1.26);
      root.add(gateArch);

      // 4. Heraldic Battle Shield over entryway
      const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.08, 16), teamDarkMat);
      shield.rotation.x = Math.PI / 2;
      shield.position.set(0, 1.45, 1.28);
      root.add(shield);

      // 5. Training Yard Quintain Combat Dummy
      const dummyPost = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 1.35, 12), timberMat);
      dummyPost.position.set(-1.05, 0.68, 1.45);
      root.add(dummyPost);

      const dummyCross = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.08, 0.08), timberMat);
      dummyCross.position.set(-1.05, 0.98, 1.45);
      root.add(dummyCross);

      const dummyHead = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 12), canvasMat);
      dummyHead.position.set(-1.05, 1.28, 1.45);
      root.add(dummyHead);

      const dummyHelm = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.26, 16), ironMat);
      dummyHelm.position.set(-1.05, 1.45, 1.45);
      root.add(dummyHelm);

      addLantern(-0.7, 1.1, 1.28);
      addLantern(0.7, 1.1, 1.28);
      break;
    }

    case 'archery_range': {
      // 1. Raised Timber Firing Platform
      const platform = new THREE.Mesh(new THREE.BoxGeometry(2.65, 0.32, 2.45), timberMat);
      platform.position.y = 0.16;
      root.add(platform);

      // 2. Colonnade Shooting Pavilion Lodge
      const pavilion = new THREE.Mesh(new THREE.BoxGeometry(2.45, 1.15, 1.35), plankWoodMat);
      pavilion.position.set(0, 0.82, -0.48);
      root.add(pavilion);

      const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.85, 0.95, 20), tileRoofMat);
      canopy.position.set(0, 1.85, -0.48);
      canopy.rotation.y = Math.PI / 4;
      root.add(canopy);

      // Shooting Rails
      const rail = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.08, 0.08), lightWoodMat);
      rail.position.set(0, 0.82, 0.22);
      root.add(rail);

      // 3. Traditional Straw Archery Targets with Multi-Ring Bullseyes
      const targetGeom = new THREE.CylinderGeometry(0.42, 0.42, 0.12, 16);
      targetGeom.rotateX(Math.PI / 2);
      const t1 = new THREE.Mesh(targetGeom, canvasMat);
      t1.position.set(0.68, 0.68, 0.92);
      root.add(t1);

      const ringOuter = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.13, 16), teamMat);
      ringOuter.rotateX(Math.PI / 2);
      ringOuter.position.set(0.68, 0.68, 0.93);
      root.add(ringOuter);

      const bullseye = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.14, 16), tileRoofMat);
      bullseye.rotateX(Math.PI / 2);
      bullseye.position.set(0.68, 0.68, 0.94);
      root.add(bullseye);

      const t2 = new THREE.Mesh(targetGeom, canvasMat);
      t2.position.set(-0.68, 0.68, 0.92);
      root.add(t2);

      // Bow Quiver & Arrow Barrel
      const quiver = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.09, 0.62, 14), timberMat);
      quiver.position.set(0, 0.52, 0.22);
      root.add(quiver);
      break;
    }

    case 'stable': {
      // 1. Stone Foundation
      const base = new THREE.Mesh(new THREE.BoxGeometry(2.75, 0.36, 2.55), darkStoneMat);
      base.position.y = 0.18;
      root.add(base);

      // 2. High Gambrel Horse Barn
      const barn = new THREE.Mesh(new THREE.BoxGeometry(1.65, 1.55, 2.25), timberMat);
      barn.position.set(-0.4, 0.92, 0);
      root.add(barn);

      const barnRoof = new THREE.Mesh(new THREE.ConeGeometry(1.45, 1.15, 20), tileRoofMat);
      barnRoof.position.set(-0.4, 2.15, 0);
      barnRoof.rotation.y = Math.PI / 4;
      root.add(barnRoof);

      // Hayloft Hoist Beam
      const hoist = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.65), lightWoodMat);
      hoist.position.set(-0.4, 2.15, 1.25);
      root.add(hoist);

      // 3. Fenced Horse Paddock with Hay Trough
      const post1 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.85, 12), lightWoodMat);
      post1.position.set(0.88, 0.42, 0.88);
      root.add(post1);

      const post2 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.85, 12), lightWoodMat);
      post2.position.set(0.88, 0.42, -0.88);
      root.add(post2);

      const rail1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 1.75), lightWoodMat);
      rail1.position.set(0.88, 0.52, 0);
      root.add(rail1);

      // Stone Water Trough with Hay
      const trough = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.32, 0.85), stoneMat);
      trough.position.set(0.62, 0.22, 0);
      root.add(trough);

      const hay = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.16, 0.78), new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.9 }));
      hay.position.set(0.62, 0.36, 0);
      root.add(hay);
      break;
    }

    case 'workshop': {
      // 1. Heavy Stone Siege Foundry Hall
      const hall = new THREE.Mesh(new THREE.BoxGeometry(2.75, 1.65, 2.55), darkStoneMat);
      hall.position.y = 0.82;
      root.add(hall);

      const roof = new THREE.Mesh(new THREE.ConeGeometry(2.05, 1.15, 20), slateRoofMat);
      roof.position.y = 2.1;
      roof.rotation.y = Math.PI / 4;
      root.add(roof);

      // 2. Twin Brick Blast Chimneys
      const chimneyMat = new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.85, flatShading: false });
      const chim1 = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.46, 2.9, 16), chimneyMat);
      chim1.position.set(0.88, 1.45, -0.7);
      root.add(chim1);

      const chim2 = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.42, 2.5, 16), chimneyMat);
      chim2.position.set(0.88, 1.25, 0.5);
      root.add(chim2);

      // 3. Blazing Smelting Furnace Mouth
      const furnaceArch = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.52, 0.2), darkStoneMat);
      furnaceArch.position.set(0.88, 0.42, 0);
      root.add(furnaceArch);

      const furnaceFire = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.36, 0.1), fireGlowMat);
      furnaceFire.position.set(0.88, 0.42, 0.08);
      root.add(furnaceFire);

      // 4. Blacksmith Anvil on Oak Stump
      const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.29, 0.42, 16), timberMat);
      stump.position.set(-0.62, 0.21, 0.82);
      root.add(stump);

      const anvil = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.26, 0.26), ironMat);
      anvil.position.set(-0.62, 0.47, 0.82);
      root.add(anvil);

      // 5. Pyramid of Heavy Catapult Boulders
      const ballGeom = new THREE.SphereGeometry(0.13, 14, 12);
      [[-0.82, 0.11, 0.3], [-0.65, 0.11, 0.3], [-0.73, 0.27, 0.3]].forEach(([bx, by, bz]) => {
        const ball = new THREE.Mesh(ballGeom, darkStoneMat);
        ball.position.set(bx, by, bz);
        root.add(ball);
      });
      break;
    }

    case 'market': {
      // 1. Paved Stone Plaza Floor
      const plaza = new THREE.Mesh(new THREE.BoxGeometry(2.75, 0.22, 2.55), stoneMat);
      plaza.position.y = 0.11;
      root.add(plaza);

      // 2. Central Guild Memorial Column with Golden Scales
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 1.85, 16), marbleMat);
      pillar.position.set(0, 0.95, 0);
      root.add(pillar);

      const finial = new THREE.Mesh(new THREE.OctahedronGeometry(0.26, 0), goldMat);
      finial.position.set(0, 1.95, 0);
      root.add(finial);

      // 3. Three Striped Medieval Merchant Booths
      // Stall A: Team Color Silk & Exotic Spices
      const stallA = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.52, 0.72), timberMat);
      stallA.position.set(-0.72, 0.32, -0.62);
      root.add(stallA);

      const awningA = new THREE.Mesh(new THREE.ConeGeometry(0.72, 0.52, 18), teamMat);
      awningA.position.set(-0.72, 1.25, -0.62);
      awningA.rotation.y = Math.PI / 4;
      root.add(awningA);

      // Stall B: Harvest Grains & Pottery
      const stallB = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.52, 0.72), timberMat);
      stallB.position.set(0.72, 0.32, -0.62);
      root.add(stallB);

      const awningB = new THREE.Mesh(new THREE.ConeGeometry(0.72, 0.52, 18), canvasMat);
      awningB.position.set(0.72, 1.25, -0.62);
      awningB.rotation.y = Math.PI / 4;
      root.add(awningB);

      // Stall C: Arms & Armor Merchant
      const stallC = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.52, 0.62), timberMat);
      stallC.position.set(0, 0.32, 0.72);
      root.add(stallC);

      const awningC = new THREE.Mesh(new THREE.ConeGeometry(0.88, 0.52, 18), teamDarkMat);
      awningC.position.set(0, 1.25, 0.72);
      awningC.rotation.y = Math.PI / 4;
      root.add(awningC);

      // Merchant Crates & Pottery Amphora
      const crate = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.32), lightWoodMat);
      crate.position.set(-0.82, 0.16, 0.42);
      root.add(crate);
      break;
    }

    case 'research_hall': {
      // 1. Classical Neoclassical Marble Podium with Steps
      const podium = new THREE.Mesh(new THREE.BoxGeometry(2.95, 0.42, 2.95), marbleMat);
      podium.position.y = 0.21;
      root.add(podium);

      const steps = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.26, 0.65), marbleMat);
      steps.position.set(0, 0.13, 1.65);
      root.add(steps);

      // 2. Grand Academic Library Hall with Colonnade
      const hall = new THREE.Mesh(new THREE.BoxGeometry(2.55, 1.55, 2.55), stoneMat);
      hall.position.y = 1.08;
      root.add(hall);

      // 4 Fluted Marble Columns
      const colGeom = new THREE.CylinderGeometry(0.13, 0.16, 1.55, 18);
      const cols = [[-1.12, 1.12], [1.12, 1.12], [-1.12, -1.12], [1.12, -1.12]];
      cols.forEach(([cx, cz]) => {
        const col = new THREE.Mesh(colGeom, marbleMat);
        col.position.set(cx, 1.08, cz);
        root.add(col);
      });

      // 3. Stately Celestial Observatory Dome
      const dome = new THREE.Mesh(new THREE.SphereGeometry(1.18, 20, 16, 0, Math.PI * 2, 0, Math.PI / 2), teamDarkMat);
      dome.position.y = 1.85;
      root.add(dome);

      // 4. Rotating Celestial Astrolabe / Armillary Sphere (Animated in Render Loop!)
      const astrolabeGroup = new THREE.Group();
      astrolabeGroup.position.set(0, 3.15, 0);
      astrolabeGroup.userData = { isRotator: true, rotSpeed: 0.6, rotAxis: 'y' };

      const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.038, 10, 24), goldMat);
      astrolabeGroup.add(ring1);

      const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.032, 10, 24), goldMat);
      ring2.rotation.x = Math.PI / 3;
      astrolabeGroup.add(ring2);

      // Radiant Sapphire Arcana Crystal at core
      const coreCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.26, 0), arcanaCrystalMat);
      astrolabeGroup.add(coreCrystal);

      root.add(astrolabeGroup);

      // Stained Glass Arch Window
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.05, 0.1), arcanaCrystalMat);
      win.position.set(0, 1.05, 1.28);
      root.add(win);
      break;
    }

    case 'watchtower': {
      // 1. Pyramidal Battered Ashlar Stone Base
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.98, 0.65, 18), darkStoneMat);
      base.position.y = 0.32;
      root.add(base);

      // 2. Tall Slender Stone Tower Shaft with Arrow Loops
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.7, 3.5, 18), stoneMat);
      shaft.position.y = 2.15;
      root.add(shaft);

      // Machicolated Overhanging Parapet Platform with Corbel Brackets
      const parapet = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.66, 0.78, 18), darkStoneMat);
      parapet.position.y = 3.95;
      root.add(parapet);

      // Conical Slate Roof with Team Pennant
      const spire = new THREE.Mesh(new THREE.ConeGeometry(0.82, 1.45, 18), teamMat);
      spire.position.y = 4.95;
      root.add(spire);

      // Wind-fluttering Tower Pennant
      const pennant = createFlutteringBanner(0.95, teamColor, 0.72, 0.36);
      pennant.position.set(0, 5.7, 0);
      root.add(pennant);

      addLantern(0, 3.55, 0.82);
      break;
    }

    case 'fort': {
      // 1. Concentric Curtain Wall Stronghold Base (Age of Empires Castle)
      const fortress = new THREE.Mesh(new THREE.BoxGeometry(3.95, 2.65, 3.95), darkStoneMat);
      fortress.position.y = 1.32;
      root.add(fortress);

      // Rampart Walkway
      const rampart = new THREE.Mesh(new THREE.BoxGeometry(4.15, 0.42, 4.15), stoneMat);
      rampart.position.y = 2.75;
      root.add(rampart);

      // 2. Four Giant Drum Bastion Towers with Conical Caps
      const drumGeom = new THREE.CylinderGeometry(0.78, 0.88, 3.9, 20);
      const drumCapGeom = new THREE.ConeGeometry(0.92, 1.35, 20);
      const drumCorners = [[-1.92, -1.92], [1.92, -1.92], [-1.92, 1.92], [1.92, 1.92]];
      drumCorners.forEach(([dx, dz]) => {
        const drum = new THREE.Mesh(drumGeom, stoneMat);
        drum.position.set(dx, 1.95, dz);
        root.add(drum);

        const cap = new THREE.Mesh(drumCapGeom, slateRoofMat);
        cap.position.set(dx, 4.25, dz);
        root.add(cap);

        // Wind-fluttering Bastion Pennant
        const flag = createFlutteringBanner(0.88, teamColor, 0.62, 0.32);
        flag.position.set(dx, 4.92, dz);
        root.add(flag);
      });

      // 3. Central Soaring Citadel Keep
      const citadel = new THREE.Mesh(new THREE.BoxGeometry(2.45, 1.85, 2.45), stoneMat);
      citadel.position.set(0, 3.25, 0);
      root.add(citadel);

      const citadelSpire = new THREE.Mesh(new THREE.ConeGeometry(1.65, 1.65, 20), teamMat);
      citadelSpire.position.set(0, 4.8, 0);
      citadelSpire.rotation.y = Math.PI / 4;
      root.add(citadelSpire);

      // Imperial Grand Citadel Banner
      const citadelBanner = createFlutteringBanner(1.55, teamColor, 1.15, 0.58);
      citadelBanner.position.set(0, 5.65, 0);
      root.add(citadelBanner);

      // 4. Iron Portcullis & Drawbridge Chains
      const gateArch = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.55, 0.32), ironMat);
      gateArch.position.set(0, 0.78, 2.0);
      root.add(gateArch);

      addLantern(-1.0, 1.3, 2.02);
      addLantern(1.0, 1.3, 2.02);
      break;
    }

    case 'wall': {
      // 1. Ashlar Stone Curtain Wall
      const wallBase = new THREE.Mesh(new THREE.BoxGeometry(0.98, 1.38, 0.98), stoneMat);
      wallBase.position.y = 0.69;
      root.add(wallBase);

      // Crenelated Merlons with Stone Coping
      const merlon = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.38, 0.38), darkStoneMat);
      merlon.position.set(0, 1.48, 0.3);
      root.add(merlon);
      break;
    }

    case 'gate': {
      // 1. Two Flanking Guard Towers with Machicolations
      const towerGeom = new THREE.BoxGeometry(0.58, 2.25, 0.72);
      const tL = new THREE.Mesh(towerGeom, stoneMat);
      tL.position.set(-0.76, 1.12, 0);
      root.add(tL);

      const tR = new THREE.Mesh(towerGeom, stoneMat);
      tR.position.set(0.76, 1.12, 0);
      root.add(tR);

      // Conical Slate Tower Caps
      const capL = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.72, 18), slateRoofMat);
      capL.position.set(-0.76, 2.48, 0);
      capL.rotation.y = Math.PI / 4;
      root.add(capL);

      const capR = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.72, 18), slateRoofMat);
      capR.position.set(0.76, 2.48, 0);
      capR.rotation.y = Math.PI / 4;
      root.add(capR);

      // Twin Gatehouse Pennants
      const gateBannerL = createFlutteringBanner(0.82, teamColor, 0.58, 0.3);
      gateBannerL.position.set(-0.76, 2.85, 0);
      root.add(gateBannerL);

      const gateBannerR = createFlutteringBanner(0.82, teamColor, 0.58, 0.3);
      gateBannerR.position.set(0.76, 2.85, 0);
      root.add(gateBannerR);

      // 2. Heavy Stone Overhead Lintel & Rampart
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.48, 0.72), darkStoneMat);
      lintel.position.set(0, 2.05, 0);
      root.add(lintel);

      // 3. Spiked Iron Portcullis Grate
      const portcullis = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.55, 0.12), ironMat);
      portcullis.name = 'gate_portcullis';
      portcullis.position.set(0, 0.82, 0);
      root.add(portcullis);

      // Faction Crest Shield over Gate
      const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.06, 16), teamMat);
      shield.rotation.x = Math.PI / 2;
      shield.position.set(0, 2.05, 0.38);
      root.add(shield);
      break;
    }
  }

  // -------------------------------------------------------------
  // ENTITY TAGGING & SHADOWS FOR INTERACTIVITY
  // -------------------------------------------------------------
  root.traverse((child: any) => {
    if ((child as THREE.Mesh).isMesh) {
      child.userData = {
        ...child.userData,
        entityType: 'building',
        entityId: bldg.id
      };
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return root;
}
