import * as THREE from 'three';
import { BuildingData } from '@agefront/shared';

export function createBuildingModel(bldg: BuildingData, teamColor: string): THREE.Group {
  const root = new THREE.Group();
  root.position.set(bldg.x + bldg.width / 2, 0, bldg.y + bldg.height / 2);

  // -------------------------------------------------------------
  // HIGH-FIDELITY PBR MATERIAL PALETTE
  // -------------------------------------------------------------
  // Dressed Ashlar Stone & Foundations
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8, // Light granite stone
    roughness: 0.82,
    metalness: 0.08,
    flatShading: true
  });
  const darkStoneMat = new THREE.MeshStandardMaterial({
    color: 0x475569, // Dark slate & plinth bedrock
    roughness: 0.88,
    metalness: 0.12,
    flatShading: true
  });
  const marbleMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9, // Polished white marble for academy
    roughness: 0.45,
    metalness: 0.15,
    flatShading: true
  });

  // Heavy Timber & Wood Planks
  const timberMat = new THREE.MeshStandardMaterial({
    color: 0x451a03, // Dark oak structural timber
    roughness: 0.85,
    metalness: 0.05,
    flatShading: true
  });
  const plankWoodMat = new THREE.MeshStandardMaterial({
    color: 0x78350f, // Hewn pine planks
    roughness: 0.75,
    metalness: 0.05,
    flatShading: true
  });
  const lightWoodMat = new THREE.MeshStandardMaterial({
    color: 0xb45309, // Light scaffolding timber
    roughness: 0.7,
    flatShading: true
  });

  // Roof Shingles & Clay Tiles
  const tileRoofMat = new THREE.MeshStandardMaterial({
    color: 0x991b1b, // Weathered terracotta red tile
    roughness: 0.55,
    metalness: 0.1,
    flatShading: true
  });
  const slateRoofMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b, // Dark charcoal slate
    roughness: 0.5,
    metalness: 0.18,
    flatShading: true
  });

  // Faction Team Color & Accents
  const teamCol = new THREE.Color(teamColor);
  const teamMat = new THREE.MeshStandardMaterial({
    color: teamCol,
    roughness: 0.35,
    metalness: 0.25,
    flatShading: true
  });
  const teamDarkMat = new THREE.MeshStandardMaterial({
    color: teamCol.clone().multiplyScalar(0.7),
    roughness: 0.45,
    metalness: 0.2,
    flatShading: true
  });

  // Metals & Glows
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24, // Polished brass & gold finials
    roughness: 0.2,
    metalness: 0.85,
    flatShading: true
  });
  const ironMat = new THREE.MeshStandardMaterial({
    color: 0x334155, // Wrought iron portcullis & anvil
    roughness: 0.4,
    metalness: 0.75,
    flatShading: true
  });
  const canvasMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7, // Woven linen canvas & awnings
    roughness: 0.9,
    flatShading: true
  });
  const lanternGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.9,
    roughness: 0.2
  });
  const fireGlowMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    emissive: 0xea580c,
    emissiveIntensity: 1.2,
    roughness: 0.3
  });
  const arcanaCrystalMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 1.0,
    roughness: 0.15
  });

  // Helper for adding hanging lanterns
  const addLantern = (x: number, y: number, z: number) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.25, 4), ironMat);
    post.position.set(x, y + 0.1, z);
    root.add(post);

    const lantern = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12, 0), lanternGlowMat);
    lantern.position.set(x, y, z);
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
    const poleGeom = new THREE.CylinderGeometry(0.08, 0.08, 2.8, 5);
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
  // DETAILED COMPLETED BUILDINGS
  // -------------------------------------------------------------
  switch (bldg.type) {
    case 'town_centre': {
      // 1. Massive Stepped Stone Foundation & Plinth
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.4, 4.2), darkStoneMat);
      plinth.position.y = 0.2;
      root.add(plinth);

      // Entrance stone stairs
      const stairs = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.25, 0.7), stoneMat);
      stairs.position.set(0, 0.12, 2.2);
      root.add(stairs);

      // 2. Heavy Ground Fortress Keep
      const keep = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.8, 3.6), stoneMat);
      keep.position.y = 1.2;
      root.add(keep);

      // Upper council keep level
      const upperKeep = new THREE.Mesh(new THREE.BoxGeometry(2.9, 1.4, 2.9), darkStoneMat);
      upperKeep.position.y = 2.6;
      root.add(upperKeep);

      // Main Grand Slate Roof
      const mainRoof = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1.6, 4), slateRoofMat);
      mainRoof.position.y = 3.9;
      mainRoof.rotation.y = Math.PI / 4;
      root.add(mainRoof);

      // 3. Four Octagonal Corner Bastions with Conical Roofs
      const bastionGeom = new THREE.CylinderGeometry(0.55, 0.65, 3.4, 8);
      const bastionCapGeom = new THREE.ConeGeometry(0.68, 1.2, 8);
      const corners = [[-1.8, -1.8], [1.8, -1.8], [-1.8, 1.8], [1.8, 1.8]];
      corners.forEach(([cx, cz]) => {
        const bastion = new THREE.Mesh(bastionGeom, stoneMat);
        bastion.position.set(cx, 1.7, cz);
        root.add(bastion);

        const cap = new THREE.Mesh(bastionCapGeom, teamMat);
        cap.position.set(cx, 3.8, cz);
        root.add(cap);

        const finial = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), goldMat);
        finial.position.set(cx, 4.45, cz);
        root.add(finial);
      });

      // 4. Central Belfry & Clock Spire
      const belfry = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.6, 1.2), stoneMat);
      belfry.position.set(0, 4.2, 0);
      root.add(belfry);

      const belfryRoof = new THREE.Mesh(new THREE.ConeGeometry(1.0, 1.4, 4), teamDarkMat);
      belfryRoof.position.set(0, 5.4, 0);
      belfryRoof.rotation.y = Math.PI / 4;
      root.add(belfryRoof);

      // 5. Arched Grand Oak Portal with Iron Trim
      const archPortal = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.3, 0.25), timberMat);
      archPortal.position.set(0, 0.75, 1.82);
      root.add(archPortal);

      const gateFrame = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.5, 0.15), darkStoneMat);
      gateFrame.position.set(0, 0.85, 1.84);
      root.add(gateFrame);

      // 6. High Faction Heraldic Banner
      const flagpole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.6, 5), goldMat);
      flagpole.position.set(0, 6.4, 0);
      root.add(flagpole);

      const flag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.85, 1.3), teamMat);
      flag.position.set(0, 6.7, 0.65);
      root.add(flag);

      // Flanking lanterns
      addLantern(-0.9, 1.0, 1.85);
      addLantern(0.9, 1.0, 1.85);
      break;
    }

    case 'house': {
      // 1. Cobblestone Plinth
      const base = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.35, 1.7), darkStoneMat);
      base.position.y = 0.17;
      root.add(base);

      // 2. Tudor Plaster Walls with Timber Corner Posts
      const walls = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.0, 1.5), canvasMat);
      walls.position.y = 0.8;
      root.add(walls);

      // Diagonal Fachwerk Timber Beams
      const beamL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.0, 0.08), timberMat);
      beamL.position.set(-0.76, 0.8, 0.76);
      root.add(beamL);
      const beamR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.0, 0.08), timberMat);
      beamR.position.set(0.76, 0.8, 0.76);
      root.add(beamR);

      // 3. Steep Terracotta Tiled Gable Roof
      const roof = new THREE.Mesh(new THREE.ConeGeometry(1.4, 1.1, 4), tileRoofMat);
      roof.position.y = 1.8;
      roof.rotation.y = Math.PI / 4;
      root.add(roof);

      // Front Door
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.65, 0.06), timberMat);
      door.position.set(0, 0.5, 0.78);
      root.add(door);

      // Stone Chimney
      const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.2, 0.35), darkStoneMat);
      chimney.position.set(0.45, 1.9, 0.35);
      root.add(chimney);

      // Firewood pile outside
      const woodLog = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.5, 5), lightWoodMat);
      woodLog.rotation.z = Math.PI / 2;
      woodLog.position.set(-0.6, 0.25, 0.7);
      root.add(woodLog);

      addLantern(0.35, 0.8, 0.8);
      break;
    }

    case 'farm': {
      // 1. Ploughed Soil Plot with Furrows
      const soil = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.16, 1.9), new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.95 }));
      soil.position.y = 0.08;
      root.add(soil);

      // 2. Golden Wheat Rows
      const wheatGeom = new THREE.BoxGeometry(1.65, 0.32, 0.16);
      const wheatMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.8, flatShading: true });
      for (let z = -0.65; z <= 0.65; z += 0.32) {
        const row = new THREE.Mesh(wheatGeom, wheatMat);
        row.position.set(0.1, 0.3, z);
        root.add(row);
      }

      // Split rail fence
      const fenceBar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 1.8), lightWoodMat);
      fenceBar.position.set(-0.85, 0.3, 0);
      root.add(fenceBar);

      // 3. Octagonal Windmill Tower
      const mill = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, 2.0, 8), stoneMat);
      mill.position.set(-0.5, 1.0, -0.45);
      root.add(mill);

      const millCap = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.7, 8), tileRoofMat);
      millCap.position.set(-0.5, 2.3, -0.45);
      root.add(millCap);

      // 4. Rotating Windmill Sails Group (Animated in Render Loop!)
      const sailsGroup = new THREE.Group();
      sailsGroup.position.set(-0.5, 2.05, -0.12);
      sailsGroup.userData = { isRotator: true, rotSpeed: 0.8, rotAxis: 'z' };

      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.12, 6), timberMat);
      hub.rotation.x = Math.PI / 2;
      sailsGroup.add(hub);

      const sailGeom = new THREE.BoxGeometry(0.06, 1.4, 0.22);
      const sail1 = new THREE.Mesh(sailGeom, canvasMat);
      sailsGroup.add(sail1);

      const sail2 = new THREE.Mesh(sailGeom, canvasMat);
      sail2.rotation.z = Math.PI / 2;
      sailsGroup.add(sail2);

      root.add(sailsGroup);

      // Stacked flour sacks
      const sack = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16, 0), canvasMat);
      sack.position.set(-0.25, 0.25, 0.4);
      root.add(sack);
      break;
    }

    case 'lumber_camp': {
      // 1. Log Cabin Base with Bark Shingle Roof
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 1.4), timberMat);
      cabin.position.set(-0.15, 0.55, 0.1);
      root.add(cabin);

      const roof = new THREE.Mesh(new THREE.ConeGeometry(1.3, 0.8, 4), slateRoofMat);
      roof.position.set(-0.15, 1.45, 0.1);
      roof.rotation.y = Math.PI / 4;
      root.add(roof);

      // 2. Open-sided Sawpit Pavilion with Uprights
      const postGeom = new THREE.CylinderGeometry(0.06, 0.06, 1.4, 5);
      const p1 = new THREE.Mesh(postGeom, lightWoodMat);
      p1.position.set(0.65, 0.7, -0.6);
      root.add(p1);
      const p2 = new THREE.Mesh(postGeom, lightWoodMat);
      p2.position.set(0.65, 0.7, 0.6);
      root.add(p2);

      const sawCanopy = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 1.4), plankWoodMat);
      sawCanopy.position.set(0.65, 1.4, 0);
      root.add(sawCanopy);

      // Circular saw blade
      const sawBlade = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.04, 12), ironMat);
      sawBlade.position.set(0.65, 0.45, 0);
      sawBlade.rotation.x = Math.PI / 2;
      sawBlade.userData = { isRotator: true, rotSpeed: 4.0, rotAxis: 'y' };
      root.add(sawBlade);

      // 3. Stacked Hewn Logs
      const logGeom = new THREE.CylinderGeometry(0.12, 0.12, 1.2, 6);
      logGeom.rotateZ(Math.PI / 2);
      for (let layer = 0; layer < 3; layer++) {
        for (let row = 0; row < 3 - layer; row++) {
          const log = new THREE.Mesh(logGeom, lightWoodMat);
          log.position.set(-0.25, 0.12 + layer * 0.18, -0.65 + row * 0.26);
          root.add(log);
        }
      }

      // Chopping block with axe
      const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.35, 6), timberMat);
      stump.position.set(0.35, 0.18, 0.65);
      root.add(stump);
      break;
    }

    case 'quarry': {
      // 1. Excavated Terraced Rock Pit
      const pit = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.35, 1.9), darkStoneMat);
      pit.position.y = 0.18;
      root.add(pit);

      // 2. Dressed Granite Ashlar Blocks
      const blockGeom = new THREE.BoxGeometry(0.55, 0.42, 0.55);
      const b1 = new THREE.Mesh(blockGeom, stoneMat);
      b1.position.set(0.4, 0.45, 0.35);
      root.add(b1);

      const b2 = new THREE.Mesh(blockGeom, stoneMat);
      b2.position.set(0.25, 0.85, 0.3);
      b2.rotation.y = 0.25;
      root.add(b2);

      // 3. Heavy Timber Derrick Crane
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 2.4, 6), timberMat);
      mast.position.set(-0.55, 1.2, -0.55);
      root.add(mast);

      const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.8, 5), timberMat);
      boom.position.set(-0.15, 2.0, -0.3);
      boom.rotation.z = Math.PI / 3.2;
      root.add(boom);

      // Hanging Stone Block on Crane Rope
      const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.0, 4), ironMat);
      rope.position.set(0.35, 1.5, -0.15);
      root.add(rope);

      const hangingStone = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.4), stoneMat);
      hangingStone.position.set(0.35, 0.9, -0.15);
      root.add(hangingStone);

      // Rubble handbarrow
      const cart = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 0.4), lightWoodMat);
      cart.position.set(-0.35, 0.25, 0.45);
      root.add(cart);
      break;
    }

    case 'mining_camp': {
      // 1. Reinforced Timber Mine Adit Frame
      const portalBase = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.3, 1.5), darkStoneMat);
      portalBase.position.y = 0.65;
      root.add(portalBase);

      // Dark Mine Shaft Tunnel Mouth
      const tunnel = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.95, 0.15), new THREE.MeshBasicMaterial({ color: 0x020617 }));
      tunnel.position.set(0, 0.55, 0.76);
      root.add(tunnel);

      // Timber Portal Arch
      const postL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.1, 0.14), timberMat);
      postL.position.set(-0.48, 0.6, 0.82);
      root.add(postL);
      const postR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.1, 0.14), timberMat);
      postR.position.set(0.48, 0.6, 0.82);
      root.add(postR);
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.14, 0.14), timberMat);
      lintel.position.set(0, 1.15, 0.82);
      root.add(lintel);

      // 2. Mine Cart Tracks
      const track1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 1.2), ironMat);
      track1.position.set(-0.25, 0.05, 0.9);
      root.add(track1);
      const track2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 1.2), ironMat);
      track2.position.set(0.25, 0.05, 0.9);
      root.add(track2);

      // 3. Loaded Ore Cart with Gold Nuggets
      const cart = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.38, 0.48), ironMat);
      cart.position.set(0, 0.28, 1.1);
      root.add(cart);

      const goldNuggets = new THREE.Mesh(new THREE.DodecahedronGeometry(0.24, 0), goldMat);
      goldNuggets.position.set(0, 0.5, 1.1);
      root.add(goldNuggets);

      // Assay Forge with glowing fire
      const forge = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.5), darkStoneMat);
      forge.position.set(-0.6, 0.3, -0.4);
      root.add(forge);

      const forgeFire = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.25, 0.3), fireGlowMat);
      forgeFire.position.set(-0.6, 0.65, -0.4);
      root.add(forgeFire);

      addLantern(0.65, 0.8, 0.8);
      break;
    }

    case 'barracks': {
      // 1. Heavy Fortified Plinth
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.35, 2.7), darkStoneMat);
      plinth.position.y = 0.17;
      root.add(plinth);

      // 2. Main Muster Hall with Battlements
      const hall = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.5, 2.4), stoneMat);
      hall.position.y = 1.0;
      root.add(hall);

      // Parapet Crenelations
      const parapet = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.3, 2.5), darkStoneMat);
      parapet.position.y = 1.85;
      root.add(parapet);

      // Steep Tiled Roof with Cresting
      const roof = new THREE.Mesh(new THREE.ConeGeometry(2.0, 1.3, 4), teamMat);
      roof.position.y = 2.4;
      roof.rotation.y = Math.PI / 4;
      root.add(roof);

      // 3. Arched Iron Portcullis Gateway
      const gateArch = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.2, 0.2), ironMat);
      gateArch.position.set(0, 0.7, 1.25);
      root.add(gateArch);

      // 4. Heraldic Battle Shield & Torches
      const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.08, 6), teamDarkMat);
      shield.rotation.x = Math.PI / 2;
      shield.position.set(0, 1.4, 1.26);
      root.add(shield);

      // 5. Training Yard: Straw Dummy with Horned Helmet & Sword
      const dummyPost = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.3, 5), timberMat);
      dummyPost.position.set(-1.0, 0.65, 1.4);
      root.add(dummyPost);

      const dummyCross = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.08), timberMat);
      dummyCross.position.set(-1.0, 0.95, 1.4);
      root.add(dummyCross);

      const dummyHead = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 6), canvasMat);
      dummyHead.position.set(-1.0, 1.25, 1.4);
      root.add(dummyHead);

      const dummyHelm = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.25, 4), ironMat);
      dummyHelm.position.set(-1.0, 1.42, 1.4);
      root.add(dummyHelm);

      addLantern(-0.7, 1.1, 1.28);
      addLantern(0.7, 1.1, 1.28);
      break;
    }

    case 'archery_range': {
      // 1. Raised Timber Firing Platform
      const platform = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.3, 2.4), timberMat);
      platform.position.y = 0.15;
      root.add(platform);

      // 2. Colonnade Shooting Pavilion
      const pavilion = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.1, 1.3), plankWoodMat);
      pavilion.position.set(0, 0.8, -0.45);
      root.add(pavilion);

      const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.8, 0.9, 4), tileRoofMat);
      canopy.position.set(0, 1.8, -0.45);
      canopy.rotation.y = Math.PI / 4;
      root.add(canopy);

      // Shooting Rails
      const rail = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 0.08), lightWoodMat);
      rail.position.set(0, 0.8, 0.2);
      root.add(rail);

      // 3. Straw Archery Targets with Arrows Embedded
      const targetGeom = new THREE.CylinderGeometry(0.4, 0.4, 0.12, 12);
      targetGeom.rotateX(Math.PI / 2);
      const t1 = new THREE.Mesh(targetGeom, canvasMat);
      t1.position.set(0.65, 0.65, 0.9);
      root.add(t1);

      const bullseye = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.14, 8), tileRoofMat);
      bullseye.rotateX(Math.PI / 2);
      bullseye.position.set(0.65, 0.65, 0.92);
      root.add(bullseye);

      // Arrow in bullseye
      const arrow = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 4), goldMat);
      arrow.rotation.x = Math.PI / 2;
      arrow.position.set(0.65, 0.65, 1.05);
      root.add(arrow);

      // Second target
      const t2 = new THREE.Mesh(targetGeom, canvasMat);
      t2.position.set(-0.65, 0.65, 0.9);
      root.add(t2);

      // Bow Quiver
      const quiver = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.08, 0.6, 6), timberMat);
      quiver.position.set(0, 0.5, 0.2);
      root.add(quiver);
      break;
    }

    case 'stable': {
      // 1. Stone Foundation
      const base = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.35, 2.5), darkStoneMat);
      base.position.y = 0.17;
      root.add(base);

      // 2. High Gambrel Horse Barn
      const barn = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.5, 2.2), timberMat);
      barn.position.set(-0.4, 0.9, 0);
      root.add(barn);

      const barnRoof = new THREE.Mesh(new THREE.ConeGeometry(1.4, 1.1, 4), tileRoofMat);
      barnRoof.position.set(-0.4, 2.1, 0);
      barnRoof.rotation.y = Math.PI / 4;
      root.add(barnRoof);

      // Hayloft Hoist Beam
      const hoist = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.6), lightWoodMat);
      hoist.position.set(-0.4, 2.1, 1.2);
      root.add(hoist);

      // 3. Fenced Horse Paddock with Hay Trough
      const fenceGeom = new THREE.CylinderGeometry(0.05, 0.05, 0.8, 4);
      const post1 = new THREE.Mesh(fenceGeom, lightWoodMat);
      post1.position.set(0.85, 0.4, 0.85);
      root.add(post1);
      const post2 = new THREE.Mesh(fenceGeom, lightWoodMat);
      post2.position.set(0.85, 0.4, -0.85);
      root.add(post2);

      const rail1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 1.7), lightWoodMat);
      rail1.position.set(0.85, 0.5, 0);
      root.add(rail1);

      // Hay trough
      const trough = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.8), timberMat);
      trough.position.set(0.6, 0.2, 0);
      root.add(trough);

      const hay = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.15, 0.75), new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.9 }));
      hay.position.set(0.6, 0.35, 0);
      root.add(hay);
      break;
    }

    case 'workshop': {
      // 1. Heavy Stone Foundry Hall
      const hall = new THREE.Mesh(new THREE.BoxGeometry(2.7, 1.6, 2.5), darkStoneMat);
      hall.position.y = 0.8;
      root.add(hall);

      const roof = new THREE.Mesh(new THREE.ConeGeometry(2.0, 1.1, 4), slateRoofMat);
      roof.position.y = 2.05;
      roof.rotation.y = Math.PI / 4;
      root.add(roof);

      // 2. Twin Brick Blast Chimneys
      const chimneyMat = new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.85, flatShading: true });
      const chim1 = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 2.8, 6), chimneyMat);
      chim1.position.set(0.85, 1.4, -0.7);
      root.add(chim1);

      const chim2 = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 2.4, 6), chimneyMat);
      chim2.position.set(0.85, 1.2, 0.5);
      root.add(chim2);

      // 3. Blazing Smelting Furnace Mouth
      const furnaceArch = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.2), darkStoneMat);
      furnaceArch.position.set(0.85, 0.4, 0);
      root.add(furnaceArch);

      const furnaceFire = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.35, 0.1), fireGlowMat);
      furnaceFire.position.set(0.85, 0.4, 0.08);
      root.add(furnaceFire);

      // 4. Blacksmith Anvil on Oak Stump
      const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.28, 0.4, 6), timberMat);
      stump.position.set(-0.6, 0.2, 0.8);
      root.add(stump);

      const anvil = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.25), ironMat);
      anvil.position.set(-0.6, 0.45, 0.8);
      root.add(anvil);

      // 5. Cannonball Pyramids
      const ballGeom = new THREE.SphereGeometry(0.12, 6, 6);
      [[-0.8, 0.1, 0.3], [-0.65, 0.1, 0.3], [-0.72, 0.25, 0.3]].forEach(([bx, by, bz]) => {
        const ball = new THREE.Mesh(ballGeom, ironMat);
        ball.position.set(bx, by, bz);
        root.add(ball);
      });
      break;
    }

    case 'market': {
      // 1. Paved Plaza Floor
      const plaza = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.2, 2.5), stoneMat);
      plaza.position.y = 0.1;
      root.add(plaza);

      // 2. Central Trading Guild Monument
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 1.8, 6), marbleMat);
      pillar.position.set(0, 0.9, 0);
      root.add(pillar);

      const finial = new THREE.Mesh(new THREE.OctahedronGeometry(0.25, 0), goldMat);
      finial.position.set(0, 1.9, 0);
      root.add(finial);

      // 3. Three Colorful Striped Merchant Stalls
      // Stall A: Team Color Silk & Spices
      const stallA = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.7), timberMat);
      stallA.position.set(-0.7, 0.3, -0.6);
      root.add(stallA);

      const awningA = new THREE.Mesh(new THREE.ConeGeometry(0.7, 0.5, 4), teamMat);
      awningA.position.set(-0.7, 1.2, -0.6);
      awningA.rotation.y = Math.PI / 4;
      root.add(awningA);

      // Stall B: Grain & Pottery
      const stallB = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.7), timberMat);
      stallB.position.set(0.7, 0.3, -0.6);
      root.add(stallB);

      const awningB = new THREE.Mesh(new THREE.ConeGeometry(0.7, 0.5, 4), canvasMat);
      awningB.position.set(0.7, 1.2, -0.6);
      awningB.rotation.y = Math.PI / 4;
      root.add(awningB);

      // Stall C: Weapon & Armor Smith
      const stallC = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 0.6), timberMat);
      stallC.position.set(0, 0.3, 0.7);
      root.add(stallC);

      const awningC = new THREE.Mesh(new THREE.ConeGeometry(0.85, 0.5, 4), teamDarkMat);
      awningC.position.set(0, 1.2, 0.7);
      awningC.rotation.y = Math.PI / 4;
      root.add(awningC);

      // Amphora and crates
      const crate = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), lightWoodMat);
      crate.position.set(-0.8, 0.15, 0.4);
      root.add(crate);
      break;
    }

    case 'research_hall': {
      // 1. Classical Neoclassical Podium with Steps
      const podium = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.4, 2.9), marbleMat);
      podium.position.y = 0.2;
      root.add(podium);

      const steps = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.25, 0.6), marbleMat);
      steps.position.set(0, 0.12, 1.6);
      root.add(steps);

      // 2. Grand Academic Library Hall
      const hall = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.5, 2.5), stoneMat);
      hall.position.y = 1.05;
      root.add(hall);

      // 4 Fluted Marble Columns
      const colGeom = new THREE.CylinderGeometry(0.12, 0.15, 1.5, 8);
      const cols = [[-1.1, 1.1], [1.1, 1.1], [-1.1, -1.1], [1.1, -1.1]];
      cols.forEach(([cx, cz]) => {
        const col = new THREE.Mesh(colGeom, marbleMat);
        col.position.set(cx, 1.05, cz);
        root.add(col);
      });

      // 3. Stately Celestial Observatory Dome
      const dome = new THREE.Mesh(new THREE.SphereGeometry(1.15, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2), teamDarkMat);
      dome.position.y = 1.8;
      root.add(dome);

      // 4. Rotating Celestial Astrolabe / Armillary Sphere (Animated in Render Loop!)
      const astrolabeGroup = new THREE.Group();
      astrolabeGroup.position.set(0, 3.1, 0);
      astrolabeGroup.userData = { isRotator: true, rotSpeed: 0.6, rotAxis: 'y' };

      const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.035, 6, 16), goldMat);
      astrolabeGroup.add(ring1);

      const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.03, 6, 16), goldMat);
      ring2.rotation.x = Math.PI / 3;
      astrolabeGroup.add(ring2);

      // Radiant Sapphire Arcana Crystal at core
      const coreCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), arcanaCrystalMat);
      astrolabeGroup.add(coreCrystal);

      root.add(astrolabeGroup);

      // Stained glass glowing arched window
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.0, 0.1), arcanaCrystalMat);
      win.position.set(0, 1.0, 1.26);
      root.add(win);
      break;
    }

    case 'watchtower': {
      // 1. Battered Pyramidal Stone Base
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.95, 0.6, 6), darkStoneMat);
      base.position.y = 0.3;
      root.add(base);

      // 2. Tall Slender Stone Tower Shaft with Arrow Loops
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.68, 3.4, 6), stoneMat);
      shaft.position.y = 2.1;
      root.add(shaft);

      // Machicolated Overhanging Parapet Platform
      const parapet = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.65, 0.75, 6), darkStoneMat);
      parapet.position.y = 3.9;
      root.add(parapet);

      // Conical Slate Roof with Team Pennant
      const spire = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.4, 6), teamMat);
      spire.position.y = 4.9;
      root.add(spire);

      const pennant = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.45, 0.8), teamDarkMat);
      pennant.position.set(0, 5.5, 0.4);
      root.add(pennant);

      // Mounted Swivel Ballista / Watch Lantern
      addLantern(0, 3.5, 0.8);
      break;
    }

    case 'fort': {
      // 1. Concentric Curtain Wall Stronghold Base
      const fortress = new THREE.Mesh(new THREE.BoxGeometry(3.9, 2.6, 3.9), darkStoneMat);
      fortress.position.y = 1.3;
      root.add(fortress);

      // Rampart Walkway
      const rampart = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.4, 4.1), stoneMat);
      rampart.position.y = 2.7;
      root.add(rampart);

      // 2. Four Giant Drum Bastion Towers
      const drumGeom = new THREE.CylinderGeometry(0.75, 0.85, 3.8, 8);
      const drumCapGeom = new THREE.ConeGeometry(0.9, 1.3, 8);
      const drumCorners = [[-1.9, -1.9], [1.9, -1.9], [-1.9, 1.9], [1.9, 1.9]];
      drumCorners.forEach(([dx, dz]) => {
        const drum = new THREE.Mesh(drumGeom, stoneMat);
        drum.position.set(dx, 1.9, dz);
        root.add(drum);

        const cap = new THREE.Mesh(drumCapGeom, slateRoofMat);
        cap.position.set(dx, 4.2, dz);
        root.add(cap);

        const flag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.6, 0.9), teamMat);
        flag.position.set(dx, 4.9, dz + 0.45);
        root.add(flag);
      });

      // 3. Central Soaring Citadel Keep
      const citadel = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.8, 2.4), stoneMat);
      citadel.position.set(0, 3.2, 0);
      root.add(citadel);

      const citadelSpire = new THREE.Mesh(new THREE.ConeGeometry(1.6, 1.6, 4), teamMat);
      citadelSpire.position.set(0, 4.7, 0);
      citadelSpire.rotation.y = Math.PI / 4;
      root.add(citadelSpire);

      // 4. Iron Portcullis & Drawbridge Chains
      const gateArch = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.5, 0.3), ironMat);
      gateArch.position.set(0, 0.75, 1.98);
      root.add(gateArch);

      addLantern(-1.0, 1.3, 2.0);
      addLantern(1.0, 1.3, 2.0);
      break;
    }

    case 'wall': {
      // 1. Ashlar Stone Curtain Wall
      const wallBase = new THREE.Mesh(new THREE.BoxGeometry(0.98, 1.35, 0.98), stoneMat);
      wallBase.position.y = 0.67;
      root.add(wallBase);

      // Crenelated Merlons
      const merlon = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.35, 0.35), darkStoneMat);
      merlon.position.set(0, 1.45, 0.3);
      root.add(merlon);
      break;
    }

    case 'gate': {
      // 1. Two Flanking Guard Towers
      const towerGeom = new THREE.BoxGeometry(0.55, 2.2, 0.7);
      const tL = new THREE.Mesh(towerGeom, stoneMat);
      tL.position.set(-0.75, 1.1, 0);
      root.add(tL);

      const tR = new THREE.Mesh(towerGeom, stoneMat);
      tR.position.set(0.75, 1.1, 0);
      root.add(tR);

      // Crenelated Tower Caps
      const capL = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.7, 4), slateRoofMat);
      capL.position.set(-0.75, 2.45, 0);
      capL.rotation.y = Math.PI / 4;
      root.add(capL);

      const capR = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.7, 4), slateRoofMat);
      capR.position.set(0.75, 2.45, 0);
      capR.rotation.y = Math.PI / 4;
      root.add(capR);

      // 2. Heavy Stone Lintel & Machicolation
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.45, 0.7), darkStoneMat);
      lintel.position.set(0, 2.0, 0);
      root.add(lintel);

      // 3. Iron Portcullis Grate
      const portcullis = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.5, 0.12), ironMat);
      portcullis.position.set(0, 0.8, 0);
      root.add(portcullis);

      // Faction Shield over Gate
      const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.06, 6), teamMat);
      shield.rotation.x = Math.PI / 2;
      shield.position.set(0, 2.0, 0.36);
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
