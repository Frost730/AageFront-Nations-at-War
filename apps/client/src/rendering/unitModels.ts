import * as THREE from 'three';
import { UnitData } from '@agefront/shared';
import { getWoodPlankTexture } from './proceduralTextures.js';

/**
 * Creates high-poly, authentic Age of Empires II / III: Definitive Edition
 * 3D models with historical arms, armor, articulated skeletal pivots,
 * and high-fidelity PBR materials.
 */
export function createUnitModel(unit: UnitData, teamColor: string): THREE.Group {
  const root = new THREE.Group();
  root.position.set(unit.x, 0, unit.y);

  // -------------------------------------------------------------
  // HIGH-FIDELITY PBR HISTORICAL MATERIALS PALETTE
  // -------------------------------------------------------------
  const teamCol = new THREE.Color(teamColor);
  const teamMat = new THREE.MeshStandardMaterial({
    color: teamCol,
    roughness: 0.38,
    metalness: 0.22,
    flatShading: false
  });
  const teamDarkMat = new THREE.MeshStandardMaterial({
    color: teamCol.clone().multiplyScalar(0.65),
    roughness: 0.45,
    metalness: 0.18,
    flatShading: false
  });
  const teamClothMat = new THREE.MeshStandardMaterial({
    color: teamCol,
    roughness: 0.82,
    metalness: 0.04,
    flatShading: false
  });
  const fleshMat = new THREE.MeshStandardMaterial({
    color: 0xfbd0b8, // Natural warm skin tone
    roughness: 0.72,
    metalness: 0.02,
    flatShading: false
  });
  const hairBrownMat = new THREE.MeshStandardMaterial({
    color: 0x3d2314,
    roughness: 0.85,
    flatShading: false
  });
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0xb0bec5, // Polished tempered steel (Age of Empires II: DE sheen)
    roughness: 0.18,
    metalness: 0.92,
    flatShading: false
  });
  const darkIronMat = new THREE.MeshStandardMaterial({
    color: 0x374151, // Forged dark iron & chainmail rings
    roughness: 0.42,
    metalness: 0.82,
    flatShading: false
  });
  const ironMat = darkIronMat;
  const darkStoneMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.88,
    flatShading: false
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b, // Royal gilded brass / ornate champion gold
    roughness: 0.22,
    metalness: 0.88,
    flatShading: false
  });
  const leatherMat = new THREE.MeshStandardMaterial({
    color: 0x664228, // Sturdy oiled leather armor & straps
    roughness: 0.75,
    metalness: 0.08,
    flatShading: false
  });
  const darkLeatherMat = new THREE.MeshStandardMaterial({
    color: 0x261914, // Boots, scabbards & belts
    roughness: 0.82,
    flatShading: false
  });
  const woodTex = getWoodPlankTexture();
  const woodMat = new THREE.MeshStandardMaterial({
    map: woodTex,
    color: 0x7c4a21,
    roughness: 0.68,
    metalness: 0.04,
    flatShading: false
  });
  const horseCoatMat = new THREE.MeshStandardMaterial({
    color: 0x452312, // Rich chestnut / bay equine coat
    roughness: 0.72,
    flatShading: false
  });
  const whiteHorseMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0, // Pure white warhorse
    roughness: 0.62,
    flatShading: false
  });
  const canvasMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7, // Padded linen & straw
    roughness: 0.88,
    flatShading: false
  });

  // Dragon materials (Faithfully matching user photo reference)
  const dragonRedScalesMat = new THREE.MeshStandardMaterial({
    color: 0xee4d1b, // Vivid fiery crimson-orange body scales
    roughness: 0.38,
    metalness: 0.16,
    flatShading: true
  });
  const dragonBellyCreamMat = new THREE.MeshStandardMaterial({
    color: 0xf6eee3, // Pale warm ivory/cream underbelly scute plates
    roughness: 0.44,
    metalness: 0.08,
    flatShading: true
  });
  const dragonObsidianMat = new THREE.MeshStandardMaterial({
    color: 0x2b1e2e, // Dark obsidian/charcoal purple horns, claws, dorsal spikes
    roughness: 0.36,
    metalness: 0.28,
    flatShading: true
  });
  const dragonCrestAmberMat = new THREE.MeshStandardMaterial({
    color: 0xf57c00, // Golden-amber snout / brow horn crest
    roughness: 0.32,
    metalness: 0.22,
    flatShading: true
  });
  const dragonEyeMat = new THREE.MeshBasicMaterial({
    color: 0xffaa00 // Glowing fiery predatory eyes
  });
  const dragonWingRedMat = new THREE.MeshStandardMaterial({
    color: 0xe64a19, // Fiery red-orange upper wing membrane and spars
    roughness: 0.42,
    side: THREE.DoubleSide,
    flatShading: true
  });
  const dragonWingCreamMat = new THREE.MeshStandardMaterial({
    color: 0xf7efe4, // Pale cream lower scalloped wing webs
    roughness: 0.46,
    side: THREE.DoubleSide,
    flatShading: true
  });
  const dragonTeamGlowMat = new THREE.MeshStandardMaterial({
    color: teamCol,
    roughness: 0.2,
    metalness: 0.8,
    emissive: teamCol.clone().multiplyScalar(0.4),
    flatShading: true
  });
  const dragonScalesMat = dragonRedScalesMat;
  const dragonBellyMat = dragonBellyCreamMat;
  const wingMat = dragonWingRedMat;
  const fireGlowMat = new THREE.MeshBasicMaterial({ color: 0xffbb00 });
  const boneMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.45,
    flatShading: false
  });

  // -------------------------------------------------------------
  // HIGH-POLY ARTICULATED LIMB FACTORIES (AoE Animation Skeletons)
  // -------------------------------------------------------------
  const createArticulatedLeg = (
    mat: THREE.Material,
    xOffset: number,
    name: string,
    height: number = 0.44,
    isSteelGreave: boolean = false
  ): THREE.Group => {
    const legGroup = new THREE.Group();
    legGroup.name = name;
    legGroup.position.set(xOffset, 0.44, 0);

    // Thigh (Cuisses / Chausses) - slender realistic human proportion
    const thighGeom = new THREE.CylinderGeometry(0.048, 0.042, 0.22, 10);
    thighGeom.translate(0, -0.11, 0);
    const thigh = new THREE.Mesh(thighGeom, mat);
    thigh.castShadow = true;
    legGroup.add(thigh);

    // Articulated Knee Cop (Poleyn)
    const kneeGeom = new THREE.SphereGeometry(0.046, 8, 8);
    const knee = new THREE.Mesh(kneeGeom, isSteelGreave ? steelMat : mat);
    knee.position.set(0, -0.22, 0.015);
    knee.castShadow = true;
    legGroup.add(knee);

    // Shin / Greave
    const shinGeom = new THREE.CylinderGeometry(0.044, 0.038, 0.20, 10);
    shinGeom.translate(0, -0.32, 0);
    const shin = new THREE.Mesh(shinGeom, isSteelGreave ? steelMat : mat);
    shin.castShadow = true;
    legGroup.add(shin);

    // Foot / Riding Boot / Sabaton touching ground at y = 0
    const bootGeom = new THREE.BoxGeometry(0.075, 0.065, 0.14);
    bootGeom.translate(0, -0.41, 0.035);
    const boot = new THREE.Mesh(bootGeom, isSteelGreave ? steelMat : darkLeatherMat);
    boot.castShadow = true;
    legGroup.add(boot);

    return legGroup;
  };

  const createHorseLeg = (
    mat: THREE.Material,
    x: number,
    z: number,
    name: string,
    length: number = 0.55
  ): THREE.Group => {
    const legGroup = new THREE.Group();
    legGroup.name = name;
    legGroup.position.set(x, -0.12, z);

    // Muscular Upper Thigh / Gaskin
    const thighGeom = new THREE.CylinderGeometry(0.08, 0.06, length * 0.5, 12);
    thighGeom.translate(0, -length * 0.25, 0);
    const thigh = new THREE.Mesh(thighGeom, mat);
    thigh.castShadow = true;
    legGroup.add(thigh);

    // Hock / Knee Joint
    const hockGeom = new THREE.SphereGeometry(0.055, 8, 8);
    const hock = new THREE.Mesh(hockGeom, mat);
    hock.position.set(0, -length * 0.5, -0.012);
    legGroup.add(hock);

    // Cannon Bone & Pastern
    const cannonGeom = new THREE.CylinderGeometry(0.048, 0.04, length * 0.5, 12);
    cannonGeom.translate(0, -length * 0.75, 0);
    const cannon = new THREE.Mesh(cannonGeom, mat);
    cannon.castShadow = true;
    legGroup.add(cannon);

    // Flared Equine Hoof with iron shoe
    const hoofGeom = new THREE.CylinderGeometry(0.045, 0.068, 0.075, 12);
    hoofGeom.translate(0, -length - 0.015, 0.012);
    const hoof = new THREE.Mesh(hoofGeom, darkLeatherMat);
    hoof.castShadow = true;
    legGroup.add(hoof);

    return legGroup;
  };

  // -------------------------------------------------------------
  // ANATOMICAL HORSE FACTORY (AGE OF EMPIRES EQUINE SCULPT)
  // Naturally oriented along Z-axis (Z+ forward, Z- rear) so
  // rotation.x = 0 is naturally horizontal with zero disorientation.
  // -------------------------------------------------------------
  const createArticulatedHorse = (
    coatMat: THREE.Material,
    maneMat: THREE.Material,
    isArmored: boolean,
    bardingMat?: THREE.Material
  ): THREE.Group => {
    const horseRoot = new THREE.Group();
    horseRoot.name = 'horse_body';
    horseRoot.position.y = 0.55;

    // Horizontally sculpted horse torso
    // Barrel chest & ribcage
    const chestGeom = new THREE.CylinderGeometry(0.28, 0.32, 0.62, 14);
    chestGeom.rotateX(Math.PI / 2);
    const chestMesh = new THREE.Mesh(chestGeom, coatMat);
    chestMesh.position.set(0, 0, 0.18);
    horseRoot.add(chestMesh);

    // Flanks & powerful hindquarters
    const hindGeom = new THREE.CylinderGeometry(0.31, 0.28, 0.62, 14);
    hindGeom.rotateX(Math.PI / 2);
    const hindMesh = new THREE.Mesh(hindGeom, coatMat);
    hindMesh.position.set(0, 0.02, -0.32);
    horseRoot.add(hindMesh);

    // Muscular shoulder withers
    const withers = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 0.32), coatMat);
    withers.position.set(0, 0.16, 0.3);
    horseRoot.add(withers);

    // Muscular rounded rump
    const rump = new THREE.Mesh(new THREE.SphereGeometry(0.29, 12, 10), coatMat);
    rump.position.set(0, 0.05, -0.52);
    rump.scale.set(0.9, 0.95, 1.0);
    horseRoot.add(rump);

    // Flowing Tail
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.55, 8), maneMat);
    tail.position.set(0, -0.04, -0.72);
    tail.rotation.x = -Math.PI / 7;
    horseRoot.add(tail);

    // Arched Neck & Head
    const neckGroup = new THREE.Group();
    neckGroup.name = 'horse_neck';
    neckGroup.position.set(0, 0.12, 0.42);

    const neckGeom = new THREE.CylinderGeometry(0.14, 0.22, 0.56, 12);
    neckGeom.translate(0, 0.25, 0);
    neckGeom.rotateX(Math.PI / 5);
    const neckMesh = new THREE.Mesh(neckGeom, coatMat);
    neckGroup.add(neckMesh);

    // Mane along crest of neck
    const mane = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.5, 0.16), maneMat);
    mane.position.set(0, 0.26, -0.04);
    mane.rotation.x = Math.PI / 5;
    neckGroup.add(mane);

    // Head placed at top of neck
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.46, 0.26);

    const cranium = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.24), coatMat);
    cranium.position.set(0, 0.02, 0.02);
    headGroup.add(cranium);

    const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 0.28, 10), coatMat);
    muzzle.rotation.x = Math.PI / 3;
    muzzle.position.set(0, -0.08, 0.18);
    headGroup.add(muzzle);

    // Ears
    const earL = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.11, 6), coatMat);
    earL.position.set(-0.06, 0.14, -0.05);
    earL.rotation.set(-Math.PI / 10, 0, -Math.PI / 12);
    headGroup.add(earL);

    const earR = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.11, 6), coatMat);
    earR.position.set(0.06, 0.14, -0.05);
    earR.rotation.set(-Math.PI / 10, 0, Math.PI / 12);
    headGroup.add(earR);

    // Eyes
    const eyeGeom = new THREE.SphereGeometry(0.022, 6, 6);
    const eyeL = new THREE.Mesh(eyeGeom, darkLeatherMat);
    eyeL.position.set(-0.095, 0.04, 0.04);
    headGroup.add(eyeL);
    const eyeR = new THREE.Mesh(eyeGeom, darkLeatherMat);
    eyeR.position.set(0.095, 0.04, 0.04);
    headGroup.add(eyeR);

    if (isArmored) {
      // Steel Chanfron
      const chanfron = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.22, 0.16), steelMat);
      chanfron.position.set(0, 0.02, 0.08);
      headGroup.add(chanfron);

      const chanfronSpike = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.16, 8), goldMat);
      chanfronSpike.position.set(0, 0.14, 0.16);
      chanfronSpike.rotation.x = Math.PI / 3.5;
      headGroup.add(chanfronSpike);
    }

    neckGroup.add(headGroup);
    horseRoot.add(neckGroup);

    // Barding / Caparison
    if (bardingMat) {
      const caparison = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.42, 0.95), bardingMat);
      caparison.position.set(0, -0.06, -0.08);
      horseRoot.add(caparison);

      const goldFringe = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.04, 0.97), goldMat);
      goldFringe.position.set(0, -0.27, -0.08);
      horseRoot.add(goldFringe);
    } else {
      const saddlePad = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.18, 0.58), teamMat);
      saddlePad.position.set(0, 0.1, -0.06);
      horseRoot.add(saddlePad);
    }

    // Leather Saddle
    const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.1, 0.42), darkLeatherMat);
    saddle.position.set(0, 0.2, -0.06);
    horseRoot.add(saddle);

    // 4 Articulated Muscular Legs
    horseRoot.add(createHorseLeg(coatMat, -0.18, 0.32, 'horse_leg_fl', 0.55));
    horseRoot.add(createHorseLeg(coatMat, 0.18, 0.32, 'horse_leg_fr', 0.55));
    horseRoot.add(createHorseLeg(coatMat, -0.18, -0.36, 'horse_leg_bl', 0.55));
    horseRoot.add(createHorseLeg(coatMat, 0.18, -0.36, 'horse_leg_br', 0.55));

    return horseRoot;
  };

  // -------------------------------------------------------------
  // UNIT ARCHETYPES (AGE OF EMPIRES II & III DEFINITIVE EDITION)
  // -------------------------------------------------------------
  switch (unit.type) {
    case 'worker': {
      // 1. Torso with Leather Apron & Faction Tunic (Anatomical Medieval Villager)
      const torsoGroup = new THREE.Group();
      torsoGroup.name = 'unit_torso';
      torsoGroup.position.y = 0.44; // Placed right at waist level above legs

      // Tapered chest & tunic (width 0.28, height 0.25, depth 0.18)
      const chestGeom = new THREE.BoxGeometry(0.28, 0.25, 0.18);
      const chest = new THREE.Mesh(chestGeom, teamClothMat);
      chest.position.y = 0.12;
      torsoGroup.add(chest);

      // Short tunic skirt (only reaches y = -0.08, leaving legs fully visible!)
      const skirtGeom = new THREE.CylinderGeometry(0.15, 0.18, 0.14, 12);
      skirtGeom.translate(0, -0.02, 0);
      const skirt = new THREE.Mesh(skirtGeom, teamClothMat);
      torsoGroup.add(skirt);

      // Heavy Laborer Leather Apron bib & lap
      const apronBib = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.18, 0.04), leatherMat);
      apronBib.position.set(0, 0.11, 0.1);
      torsoGroup.add(apronBib);

      const apronSkirt = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.04), leatherMat);
      apronSkirt.position.set(0, -0.04, 0.1);
      torsoGroup.add(apronSkirt);

      // Utility Leather Belt with Gilded Buckle & Tool Pouch
      const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.165, 0.05, 12), darkLeatherMat);
      belt.position.y = 0.02;
      torsoGroup.add(belt);

      const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.03), goldMat);
      buckle.position.set(0, 0.02, 0.12);
      torsoGroup.add(buckle);

      const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.09, 0.06), leatherMat);
      pouch.position.set(-0.13, -0.02, 0.08);
      torsoGroup.add(pouch);

      // Slender Sleeved Arms & Hands
      const lArm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.26, 8), teamClothMat);
      lArm.name = 'left_arm';
      lArm.position.set(-0.18, 0.1, 0);
      lArm.rotation.z = Math.PI / 10;
      torsoGroup.add(lArm);

      const lHand = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), fleshMat);
      lHand.position.set(-0.21, -0.05, 0);
      torsoGroup.add(lHand);

      const rArm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.26, 8), teamClothMat);
      rArm.position.set(0.18, 0.1, 0);
      rArm.rotation.z = -Math.PI / 10;
      torsoGroup.add(rArm);

      // Neck & Sculpted Head
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.08, 8), fleshMat);
      neck.position.y = 0.26;
      torsoGroup.add(neck);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 12), fleshMat);
      head.position.y = 0.35;
      torsoGroup.add(head);

      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.115, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2), hairBrownMat);
      hair.position.set(0, 0.36, -0.015);
      torsoGroup.add(hair);

      // Artisan Felt Cap with Turned-up Brim
      const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.03, 14), darkLeatherMat);
      hatBrim.position.y = 0.42;
      torsoGroup.add(hatBrim);

      const hatCrown = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.16, 14), teamDarkMat);
      hatCrown.position.y = 0.5;
      torsoGroup.add(hatCrown);

      // Back-mounted Wicker Resource Hod / Gathering Basket
      const basket = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.28, 0.16), woodMat);
      basket.position.set(0, 0.12, -0.15);
      torsoGroup.add(basket);

      root.add(torsoGroup);

      // 2. Articulated Legs & Sturdy Worker Boots (Distinctly visible from waist 0.44 down to 0)
      root.add(createArticulatedLeg(darkLeatherMat, -0.09, 'left_leg'));
      root.add(createArticulatedLeg(darkLeatherMat, 0.09, 'right_leg'));

      // 3. Tool Pivot (Masterwork AoE Pickaxe / Woodsman Axe)
      const toolPivot = new THREE.Group();
      toolPivot.name = 'tool_pivot';
      toolPivot.position.set(0.22, 0.48, 0.1);

      const toolHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.024, 0.68, 10), woodMat);
      toolHandle.position.set(0, 0.18, 0);
      toolHandle.rotation.z = Math.PI / 4.5;
      toolPivot.add(toolHandle);

      // Dual-head Mining Pickaxe & Logging Axe
      const pickHead = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.07, 0.06), steelMat);
      pickHead.position.set(0.18, 0.4, 0);
      toolPivot.add(pickHead);

      const pickSpike = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.16, 8), steelMat);
      pickSpike.position.set(0.32, 0.4, 0);
      pickSpike.rotation.z = -Math.PI / 2;
      toolPivot.add(pickSpike);

      const axeBlade = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.14, 8), steelMat);
      axeBlade.position.set(0.04, 0.4, 0);
      axeBlade.rotation.z = Math.PI / 2;
      toolPivot.add(axeBlade);

      root.add(toolPivot);
      break;
    }

    case 'scout': {
      // 1. Sleek Agile Light Horse (High-Poly Equine Anatomy)
      root.add(createArticulatedHorse(horseCoatMat, darkLeatherMat, false));

      // 2. Scout Rider in Light Recon Armor seated in saddle
      const riderGroup = new THREE.Group();
      riderGroup.position.set(0, 0.78, -0.06);

      const riderTorso = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, 0.18), teamClothMat);
      riderTorso.position.y = 0.13;
      riderGroup.add(riderTorso);

      const riderBelt = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.04, 12), darkLeatherMat);
      riderBelt.position.y = 0.02;
      riderGroup.add(riderBelt);

      // Arms: left hand holding reins forward, right arm holding spear
      const lArm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.24, 8), teamClothMat);
      lArm.position.set(-0.16, 0.12, 0.08);
      lArm.rotation.set(-Math.PI / 4, 0, -Math.PI / 10);
      riderGroup.add(lArm);

      const rArm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.24, 8), teamClothMat);
      rArm.position.set(0.16, 0.12, 0);
      rArm.rotation.set(Math.PI / 10, 0, Math.PI / 10);
      riderGroup.add(rArm);

      // Reins from bit to left hand
      const reinsL = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.45), darkLeatherMat);
      reinsL.position.set(-0.08, 0.18, 0.35);
      reinsL.rotation.set(-Math.PI / 6, -0.15, 0);
      riderGroup.add(reinsL);

      // Rider Legs in Stirrups flanking horse
      const rLegL = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.045, 0.36, 8), darkLeatherMat);
      rLegL.position.set(-0.21, -0.05, 0.06);
      rLegL.rotation.set(Math.PI / 7, 0, Math.PI / 12);
      riderGroup.add(rLegL);

      const rLegR = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.045, 0.36, 8), darkLeatherMat);
      rLegR.position.set(0.21, -0.05, 0.06);
      rLegR.rotation.set(Math.PI / 7, 0, -Math.PI / 12);
      riderGroup.add(rLegR);

      // Head & Recon Cap with team feather
      const riderHead = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), fleshMat);
      riderHead.position.y = 0.34;
      riderGroup.add(riderHead);

      const scoutCap = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.18, 12), darkLeatherMat);
      scoutCap.position.y = 0.44;
      riderGroup.add(scoutCap);

      const scoutFeather = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.18, 0.06), teamMat);
      scoutFeather.position.set(-0.07, 0.5, 0);
      scoutFeather.rotation.z = Math.PI / 8;
      riderGroup.add(scoutFeather);

      root.add(riderGroup);

      // 3. Lance Pivot with Scout Spear & Pennon (Points forward along +Z!)
      const lancePivot = new THREE.Group();
      lancePivot.name = 'lance_pivot';
      lancePivot.position.set(0.24, 0.88, 0.1);
      lancePivot.rotation.x = -0.32; // Default rest angle pointing forward-up

      const spearGeom = new THREE.CylinderGeometry(0.02, 0.02, 2.0, 10);
      spearGeom.rotateX(Math.PI / 2);
      const spearShaft = new THREE.Mesh(spearGeom, woodMat);
      spearShaft.position.set(0, 0, 0.6);
      lancePivot.add(spearShaft);

      const tipGeom = new THREE.ConeGeometry(0.045, 0.28, 8);
      tipGeom.rotateX(Math.PI / 2);
      const spearTip = new THREE.Mesh(tipGeom, steelMat);
      spearTip.position.set(0, 0, 1.7);
      lancePivot.add(spearTip);

      const pennon = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.18, 0.42), teamMat);
      pennon.position.set(0, -0.08, 1.4);
      lancePivot.add(pennon);

      root.add(lancePivot);
      break;
    }

    case 'basic_infantry': {
      // 1. Man-at-Arms with Chainmail, Fluted Cuirass & Steel Norman Helm
      const torsoGroup = new THREE.Group();
      torsoGroup.name = 'unit_torso';
      torsoGroup.position.y = 0.44;

      // Steel Cuirass / Breastplate over Mail
      const cuirassGeom = new THREE.BoxGeometry(0.3, 0.26, 0.2);
      const cuirass = new THREE.Mesh(cuirassGeom, steelMat);
      cuirass.position.y = 0.13;
      torsoGroup.add(cuirass);

      // Faction Heraldic Tabard / Crest on Chest
      const crest = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, 0.04), teamMat);
      crest.position.set(0, 0.13, 0.1);
      torsoGroup.add(crest);

      // Mail Fauld Skirt (protects hips, stops at y = -0.06 leaving legs fully visible!)
      const fauldGeom = new THREE.CylinderGeometry(0.16, 0.19, 0.13, 12);
      fauldGeom.translate(0, -0.02, 0);
      const fauld = new THREE.Mesh(fauldGeom, darkIronMat);
      torsoGroup.add(fauld);

      // Steel Pauldrons (Shoulder Armor)
      const pauldronGeom = new THREE.SphereGeometry(0.08, 10, 8);
      const lPauldron = new THREE.Mesh(pauldronGeom, steelMat);
      lPauldron.position.set(-0.19, 0.19, 0);
      torsoGroup.add(lPauldron);

      const rPauldron = new THREE.Mesh(pauldronGeom, steelMat);
      rPauldron.position.set(0.19, 0.19, 0);
      torsoGroup.add(rPauldron);

      // Mail Sleeves & Gauntleted Hands
      const lArm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.26, 8), darkIronMat);
      lArm.position.set(-0.18, 0.09, 0);
      lArm.rotation.z = Math.PI / 10;
      torsoGroup.add(lArm);

      const rArm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.26, 8), darkIronMat);
      rArm.position.set(0.18, 0.09, 0);
      rArm.rotation.z = -Math.PI / 10;
      torsoGroup.add(rArm);

      // Neck in Mail Coif
      const coif = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.08, 8), darkIronMat);
      coif.position.y = 0.26;
      torsoGroup.add(coif);

      // Norman Nasal Helm with eye slit and nose guard
      const helmGeom = new THREE.CylinderGeometry(0.12, 0.13, 0.18, 14);
      const helm = new THREE.Mesh(helmGeom, steelMat);
      helm.position.y = 0.37;
      torsoGroup.add(helm);

      const nasalGuard = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.14, 0.04), steelMat);
      nasalGuard.position.set(0, 0.32, 0.14);
      torsoGroup.add(nasalGuard);

      const helmCrown = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.14, 14), steelMat);
      helmCrown.position.y = 0.51;
      torsoGroup.add(helmCrown);

      // Flowing Team Plume
      const plume = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.22, 0.14), teamMat);
      plume.position.set(0, 0.55, -0.04);
      torsoGroup.add(plume);

      root.add(torsoGroup);

      // 2. Articulated Greaves & Sabatons (Distinctly visible running legs)
      root.add(createArticulatedLeg(steelMat, -0.1, 'left_leg', 0.42, true));
      root.add(createArticulatedLeg(steelMat, 0.1, 'right_leg', 0.42, true));

      // 3. Sword Pivot with Broad Arming Sword (Detailed Fuller & Crossguard)
      const swordPivot = new THREE.Group();
      swordPivot.name = 'sword_pivot';
      swordPivot.position.set(0.24, 0.48, 0.12);

      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.75, 0.09), steelMat);
      blade.position.set(0, 0.35, 0);
      swordPivot.add(blade);

      const fullerGroove = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.5, 0.02), darkIronMat);
      fullerGroove.position.set(0, 0.32, 0);
      swordPivot.add(fullerGroove);

      const swordTip = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.14, 6), steelMat);
      swordTip.position.set(0, 0.78, 0);
      swordPivot.add(swordTip);

      const crossguard = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.26), goldMat);
      crossguard.position.set(0, 0.05, 0);
      swordPivot.add(crossguard);

      const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), goldMat);
      pommel.position.set(0, -0.1, 0);
      swordPivot.add(pommel);

      root.add(swordPivot);

      // 4. Shield Pivot with Heater Shield & Team Heraldry
      const shieldPivot = new THREE.Group();
      shieldPivot.name = 'shield_pivot';
      shieldPivot.position.set(-0.24, 0.48, 0.1);

      // Curved Shield Face
      const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.5, 12, 1, false, 0, Math.PI), teamMat);
      shield.rotation.y = -Math.PI / 2;
      shieldPivot.add(shield);

      const shieldRim = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.52, 0.38), steelMat);
      shieldRim.position.x = -0.01;
      shieldPivot.add(shieldRim);

      const shieldBoss = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.09, 10), goldMat);
      shieldBoss.position.set(-0.05, 0.04, 0);
      shieldBoss.rotation.z = Math.PI / 2;
      shieldPivot.add(shieldBoss);

      root.add(shieldPivot);
      break;
    }

    case 'spearman': {
      // 1. Spearman Torso in Quilted Gambeson & Scale Hauberk
      const torsoGroup = new THREE.Group();
      torsoGroup.name = 'unit_torso';
      torsoGroup.position.y = 0.44;

      const gambesonGeom = new THREE.BoxGeometry(0.28, 0.26, 0.18);
      const gambeson = new THREE.Mesh(gambesonGeom, teamMat);
      gambeson.position.y = 0.13;
      torsoGroup.add(gambeson);

      const scaleArmor = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.16, 0.19), darkIronMat);
      scaleArmor.position.y = 0.14;
      torsoGroup.add(scaleArmor);

      // Short Tunic Skirt
      const tunicSkirt = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 0.12, 12), teamMat);
      tunicSkirt.position.y = -0.02;
      torsoGroup.add(tunicSkirt);

      // Arms & Shoulders
      const lArm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.26, 8), teamMat);
      lArm.position.set(-0.18, 0.09, 0);
      lArm.rotation.z = Math.PI / 10;
      torsoGroup.add(lArm);

      const rArm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.26, 8), teamMat);
      rArm.position.set(0.18, 0.09, 0);
      rArm.rotation.z = -Math.PI / 10;
      torsoGroup.add(rArm);

      // Coif & Head
      const coif = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.08, 8), darkIronMat);
      coif.position.y = 0.26;
      torsoGroup.add(coif);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), fleshMat);
      head.position.y = 0.34;
      torsoGroup.add(head);

      // Kettle Hat / Chapel de Fer with Flared Protective Brim
      const kettleHat = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), steelMat);
      kettleHat.position.y = 0.38;
      torsoGroup.add(kettleHat);

      const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.025, 16), steelMat);
      hatBrim.position.y = 0.37;
      torsoGroup.add(hatBrim);

      root.add(torsoGroup);

      // 2. Stately 2.8m Ash Pike with Leaf Spearhead & Silk Tassel
      const pikePivot = new THREE.Group();
      pikePivot.name = 'pike_pivot';
      pikePivot.position.set(0.24, 0.52, 0.12);

      const pikeShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 2.5, 10), woodMat);
      pikeShaft.position.set(0, 0.75, 0);
      pikeShaft.rotation.x = Math.PI / 18;
      pikePivot.add(pikeShaft);

      const pikeBlade = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.38, 10), steelMat);
      pikeBlade.position.set(0, 2.05, 0.15);
      pikeBlade.rotation.x = Math.PI / 18;
      pikePivot.add(pikeBlade);

      const pikeTassel = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), teamMat);
      pikeTassel.position.set(0, 1.85, 0.14);
      pikePivot.add(pikeTassel);

      root.add(pikePivot);

      // Forearm Steel Buckler Shield
      const buckler = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.035, 14), steelMat);
      buckler.name = 'left_arm';
      buckler.position.set(-0.24, 0.48, 0.08);
      buckler.rotation.z = Math.PI / 2;
      const bucklerBoss = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.065, 8), goldMat);
      bucklerBoss.position.set(0, 0.035, 0);
      buckler.add(bucklerBoss);
      root.add(buckler);

      // Articulated Legs
      root.add(createArticulatedLeg(darkIronMat, -0.09, 'left_leg', 0.42, true));
      root.add(createArticulatedLeg(darkIronMat, 0.09, 'right_leg', 0.42, true));
      break;
    }

    case 'ranged_infantry': {
      // 1. Archer in Leather Brigandine, Armguard & Hood
      const torsoGroup = new THREE.Group();
      torsoGroup.name = 'unit_torso';
      torsoGroup.position.y = 0.44;

      const chestGeom = new THREE.BoxGeometry(0.27, 0.24, 0.17);
      const chest = new THREE.Mesh(chestGeom, teamClothMat);
      chest.position.y = 0.12;
      torsoGroup.add(chest);

      const leatherVest = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.2, 0.18), leatherMat);
      leatherVest.position.y = 0.12;
      torsoGroup.add(leatherVest);

      // Short tunic skirt
      const tunicSkirt = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.12, 12), teamClothMat);
      tunicSkirt.position.y = -0.02;
      torsoGroup.add(tunicSkirt);

      // Arms
      const lArm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.26, 8), teamClothMat);
      lArm.position.set(-0.17, 0.09, 0);
      lArm.rotation.z = Math.PI / 10;
      torsoGroup.add(lArm);

      const rArm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.26, 8), teamClothMat);
      rArm.position.set(0.17, 0.09, 0);
      rArm.rotation.z = -Math.PI / 10;
      torsoGroup.add(rArm);

      // Archer's Hood & Face
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), fleshMat);
      head.position.y = 0.34;
      torsoGroup.add(head);

      const hood = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.26, 12), teamDarkMat);
      hood.position.y = 0.44;
      torsoGroup.add(hood);

      root.add(torsoGroup);

      // 2. Masterwork Recurve Yew Longbow with Horn Nocks & Drawn String
      const bowPivot = new THREE.Group();
      bowPivot.name = 'bow_pivot';
      bowPivot.position.set(0.24, 0.48, 0.15);

      const bowLimb = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.024, 8, 20, Math.PI * 0.95), woodMat);
      bowLimb.rotation.y = Math.PI / 2;
      bowPivot.add(bowLimb);

      const bowString = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.68, 6), canvasMat);
      bowString.position.set(0, 0, -0.13);
      bowPivot.add(bowString);

      // Notched bodkin arrow ready to loose
      const arrowShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.58, 6), woodMat);
      arrowShaft.position.set(0, 0, 0.06);
      arrowShaft.rotation.x = Math.PI / 2;
      bowPivot.add(arrowShaft);

      const arrowTip = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.07, 6), steelMat);
      arrowTip.position.set(0, 0, 0.36);
      arrowTip.rotation.x = Math.PI / 2;
      bowPivot.add(arrowTip);

      root.add(bowPivot);

      // 3. Side Quiver with Fletched Goose-Feather Arrows
      const quiver = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.055, 0.48, 10), darkLeatherMat);
      quiver.position.set(-0.16, 0.55, -0.16);
      quiver.rotation.z = Math.PI / 5;
      root.add(quiver);

      for (let a = 0; a < 3; a++) {
        const arrowTail = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.1, 0.06), teamMat);
        arrowTail.position.set(-0.14 - a * 0.025, 0.82 + a * 0.015, -0.16);
        root.add(arrowTail);
      }

      // Articulated Legs
      root.add(createArticulatedLeg(darkLeatherMat, -0.09, 'left_leg'));
      root.add(createArticulatedLeg(darkLeatherMat, 0.09, 'right_leg'));
      break;
    }

    case 'cavalry': {
      // 1. Armored Destrier Warhorse with Caparison & Chanfron
      root.add(createArticulatedHorse(whiteHorseMat, darkLeatherMat, true, teamMat));

      // 2. Knight in Full Gothic Plate Armor seated in saddle
      const knightGroup = new THREE.Group();
      knightGroup.position.set(0, 0.88, -0.06);

      const knightCuirass = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.28, 0.22), steelMat);
      knightCuirass.position.y = 0.14;
      knightGroup.add(knightCuirass);

      const knightTabard = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, 0.04), teamMat);
      knightTabard.position.set(0, 0.14, 0.11);
      knightGroup.add(knightTabard);

      // Pauldrons
      const lPauldron = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), steelMat);
      lPauldron.position.set(-0.2, 0.22, 0);
      knightGroup.add(lPauldron);

      const rPauldron = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), steelMat);
      rPauldron.position.set(0.2, 0.22, 0);
      knightGroup.add(rPauldron);

      // Arms: left forward holding reins, right holding lance
      const lArm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.26, 8), steelMat);
      lArm.position.set(-0.18, 0.12, 0.08);
      lArm.rotation.set(-Math.PI / 4, 0, -Math.PI / 10);
      knightGroup.add(lArm);

      const rArm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.26, 8), steelMat);
      rArm.position.set(0.18, 0.12, 0);
      rArm.rotation.set(Math.PI / 10, 0, Math.PI / 10);
      knightGroup.add(rArm);

      // Greathelm with visor and plume
      const helm = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.14, 0.22, 14), steelMat);
      helm.position.y = 0.42;
      knightGroup.add(helm);

      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 0.06), goldMat);
      visor.position.set(0, 0.42, 0.12);
      knightGroup.add(visor);

      const knightPlume = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.28, 0.18), teamMat);
      knightPlume.position.set(0, 0.6, -0.06);
      knightGroup.add(knightPlume);

      // Mounted plate legs in stirrups
      const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.42, 8), steelMat);
      legL.position.set(-0.23, -0.05, 0.08);
      legL.rotation.set(Math.PI / 7, 0, Math.PI / 12);
      knightGroup.add(legL);

      const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.42, 8), steelMat);
      legR.position.set(0.23, -0.05, 0.08);
      legR.rotation.set(Math.PI / 7, 0, -Math.PI / 12);
      knightGroup.add(legR);

      root.add(knightGroup);

      // 3. Heavy Tournament Lance (Points forward along +Z!)
      const lancePivot = new THREE.Group();
      lancePivot.name = 'lance_pivot';
      lancePivot.position.set(0.28, 0.98, 0.1);
      lancePivot.rotation.x = -0.32; // Default rest angle pointing forward-up

      const lanceGeom = new THREE.ConeGeometry(0.075, 2.8, 12);
      lanceGeom.rotateX(Math.PI / 2);
      const lanceMesh = new THREE.Mesh(lanceGeom, teamMat);
      lanceMesh.position.set(0, 0, 1.1);
      lancePivot.add(lanceMesh);

      const vamplate = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.14, 14), steelMat);
      vamplate.rotation.x = -Math.PI / 2;
      vamplate.position.set(0, 0, -0.15);
      lancePivot.add(vamplate);

      root.add(lancePivot);
      break;
    }

    case 'siege_unit': {
      // 1. Reinforced Oak Timber Chassis with Heavy Iron Strapping
      const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.3, 1.8), woodMat);
      chassis.name = 'siege_chassis';
      chassis.position.y = 0.32;
      root.add(chassis);

      // Heavy Forged Iron Corner Straps and Rivet Plates
      for (const z of [0.72, -0.72]) {
        const strap = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.06, 0.1), ironMat);
        strap.position.set(0, 0.32, z);
        root.add(strap);
      }

      // 4 Heavy 16-Spoke Wooden Wheels with Iron Rim Tires & Brass Hubs
      const wheelGeom = new THREE.CylinderGeometry(0.34, 0.34, 0.12, 18);
      wheelGeom.rotateZ(Math.PI / 2);
      const wheels = [
        [-0.7, 0.34, -0.62], [0.7, 0.34, -0.62],
        [-0.7, 0.34, 0.62], [0.7, 0.34, 0.62]
      ];
      const wheelNames = ['wheel_fl', 'wheel_fr', 'wheel_bl', 'wheel_br'];
      wheels.forEach(([wx, wy, wz], wIdx) => {
        const wheel = new THREE.Mesh(wheelGeom, darkIronMat);
        wheel.name = wheelNames[wIdx];
        wheel.position.set(wx, wy, wz);
        root.add(wheel);

        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.16, 12), goldMat);
        hub.position.set(wx, wy, wz);
        hub.rotation.z = Math.PI / 2;
        root.add(hub);
      });

      // 2. Heavy Timber A-Frame Upright Trestle with Cross Braces
      const frameL = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.4, 10), woodMat);
      frameL.position.set(-0.45, 0.9, -0.1);
      root.add(frameL);

      const frameR = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.4, 10), woodMat);
      frameR.position.set(0.45, 0.9, -0.1);
      root.add(frameR);

      const crossBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.05, 12), woodMat);
      crossBeam.position.set(0, 1.38, -0.1);
      crossBeam.rotation.z = Math.PI / 2;
      root.add(crossBeam);

      // 3. Catapult / Trebuchet Throwing Arm Pivot
      const armPivot = new THREE.Group();
      armPivot.name = 'arm_pivot';
      armPivot.position.set(0, 0.88, -0.15);

      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.8, 0.14), woodMat);
      arm.position.set(0, 0.82, 0);
      arm.rotation.x = -Math.PI / 4.2;
      armPivot.add(arm);

      // Heavy Counterweight Box loaded with Granite Ballast
      const counterweight = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.46, 0.42), darkStoneMat);
      counterweight.position.set(0, -0.26, 0.2);
      armPivot.add(counterweight);

      // Throwing Sling Bucket with Chiseled Granite Ballistic Stone Payload (AoE II Trebuchet Style)
      const bucket = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.28, 0.48), ironMat);
      bucket.position.set(0, 1.62, -0.46);
      armPivot.add(bucket);

      // Realistic Chiseled Granite Boulder Payload
      const graniteBoulder = new THREE.Mesh(new THREE.DodecahedronGeometry(0.26, 1), darkStoneMat);
      graniteBoulder.position.set(0, 1.78, -0.46);
      graniteBoulder.scale.set(1.0, 0.85, 1.0);
      armPivot.add(graniteBoulder);

      // Iron strapping around boulder
      const boulderBand = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.02, 6, 14), darkIronMat);
      boulderBand.position.set(0, 1.78, -0.46);
      armPivot.add(boulderBand);

      root.add(armPivot);
      break;
    }

    case 'advanced_unit': {
      // 1. Royal Champion / Teutonic Knight in Gilded Imperial Plate Armor
      const torsoGroup = new THREE.Group();
      torsoGroup.name = 'unit_torso';
      torsoGroup.position.y = 0.44;

      // Heavy Fluted Gothic Steel Cuirass (Anatomical torso)
      const cuirassGeom = new THREE.BoxGeometry(0.32, 0.28, 0.22);
      const cuirass = new THREE.Mesh(cuirassGeom, steelMat);
      cuirass.position.y = 0.14;
      torsoGroup.add(cuirass);

      // Gilded Royal Filigree Trims & Imperial Double Eagle Emblem
      const goldTrim = new THREE.Mesh(new THREE.BoxGeometry(0.33, 0.05, 0.23), goldMat);
      goldTrim.position.y = 0.18;
      torsoGroup.add(goldTrim);

      const chestEmblem = new THREE.Mesh(new THREE.OctahedronGeometry(0.08, 0), goldMat);
      chestEmblem.position.set(0, 0.18, 0.12);
      torsoGroup.add(chestEmblem);

      // Gothic Plate Fauld / Tassets (protects hips, stops at y = -0.06 leaving legs fully visible!)
      const fauldGeom = new THREE.CylinderGeometry(0.17, 0.21, 0.14, 12);
      fauldGeom.translate(0, -0.02, 0);
      const fauld = new THREE.Mesh(fauldGeom, steelMat);
      torsoGroup.add(fauld);

      // Sculpted Lion-Head Pauldrons with Gold Crests
      const lPauldron = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.2), goldMat);
      lPauldron.position.set(-0.24, 0.22, 0);
      torsoGroup.add(lPauldron);

      const rPauldron = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.2), goldMat);
      rPauldron.position.set(0.24, 0.22, 0);
      torsoGroup.add(rPauldron);

      // Steel plate arms
      const lArm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.28, 8), steelMat);
      lArm.position.set(-0.21, 0.1, 0);
      lArm.rotation.z = Math.PI / 10;
      torsoGroup.add(lArm);

      const rArm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.28, 8), steelMat);
      rArm.position.set(0.21, 0.1, 0);
      rArm.rotation.z = -Math.PI / 10;
      torsoGroup.add(rArm);

      // Visored Frogmouth Helm with Horned / Winged Royal Crest
      const helmGeom = new THREE.CylinderGeometry(0.13, 0.15, 0.24, 14);
      const helm = new THREE.Mesh(helmGeom, steelMat);
      helm.position.y = 0.42;
      torsoGroup.add(helm);

      const hornL = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.24, 8), goldMat);
      hornL.position.set(-0.14, 0.54, -0.04);
      hornL.rotation.set(-Math.PI / 8, 0, -Math.PI / 4);
      torsoGroup.add(hornL);

      const hornR = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.24, 8), goldMat);
      hornR.position.set(0.14, 0.54, -0.04);
      hornR.rotation.set(-Math.PI / 8, 0, Math.PI / 4);
      torsoGroup.add(hornR);

      // Flowing Imperial Cape in Faction Colors
      const cape = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.65, 0.05), teamClothMat);
      cape.position.set(0, 0.06, -0.16);
      cape.rotation.x = Math.PI / 16;
      torsoGroup.add(cape);

      root.add(torsoGroup);

      // 2. Heavy Swiss Halberd / Crescent Poleaxe
      const halberdPivot = new THREE.Group();
      halberdPivot.name = 'halberd_pivot';
      halberdPivot.position.set(0.26, 0.52, 0.14);

      const halberdShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 2.4, 10), darkIronMat);
      halberdShaft.position.set(0, 0.65, 0);
      halberdPivot.add(halberdShaft);

      const axeBlade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.45, 0.34), goldMat);
      axeBlade.position.set(0, 1.45, 0.1);
      halberdPivot.add(axeBlade);

      const topSpike = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.38, 10), steelMat);
      topSpike.position.set(0, 1.82, 0);
      halberdPivot.add(topSpike);

      root.add(halberdPivot);

      // Articulated Steel Plate Greaves (Distinctly visible running legs)
      root.add(createArticulatedLeg(steelMat, -0.11, 'left_leg', 0.42, true));
      root.add(createArticulatedLeg(steelMat, 0.11, 'right_leg', 0.42, true));
      break;
    }

    case 'dragon': {
      // 1. Dragon Torso & Muscular Anatomy (Faithfully sculpted from reference photo)
      const torso = new THREE.Mesh(new THREE.ConeGeometry(0.75, 2.1, 8), dragonRedScalesMat);
      torso.name = 'dragon_torso';
      torso.rotation.x = Math.PI / 2.25;
      torso.position.set(0, 0.42, -0.05);
      root.add(torso);

      // Muscular chest mass
      const chestMass = new THREE.Mesh(new THREE.DodecahedronGeometry(0.65, 1), dragonRedScalesMat);
      chestMass.position.set(0, 0.52, 0.38);
      chestMass.scale.set(0.95, 1.25, 0.9);
      root.add(chestMass);

      // Segmented Chevron Cream Ventral Scutes (Underbelly plates exact to photo reference)
      for (let b = 0; b < 6; b++) {
        const bellyPlate = new THREE.Mesh(new THREE.BoxGeometry(0.58 - b * 0.06, 0.18, 0.36 - b * 0.03), dragonBellyCreamMat);
        bellyPlate.position.set(0, 0.22 + b * 0.11, 0.65 - b * 0.26);
        bellyPlate.rotation.x = Math.PI / 3.6 + b * 0.07;
        bellyPlate.scale.set(1.0 - b * 0.07, 0.78, 1.0);
        root.add(bellyPlate);
      }

      // Lateral Flank Spikes on Hips (exact to reference photo)
      const flankSpikeGeom = new THREE.ConeGeometry(0.14, 0.55, 4);
      const leftFlankSpike = new THREE.Mesh(flankSpikeGeom, dragonRedScalesMat);
      leftFlankSpike.position.set(-0.64, 0.38, -0.42);
      leftFlankSpike.rotation.set(0.3, 0, -Math.PI / 3.0);
      root.add(leftFlankSpike);

      const rightFlankSpike = new THREE.Mesh(flankSpikeGeom, dragonRedScalesMat);
      rightFlankSpike.position.set(0.64, 0.38, -0.42);
      rightFlankSpike.rotation.set(0.3, 0, Math.PI / 3.0);
      root.add(rightFlankSpike);

      // Dorsal Obsidian Spines along back
      for (let s = 0; s < 5; s++) {
        const spine = new THREE.Mesh(new THREE.ConeGeometry(0.09 - s * 0.012, 0.38 - s * 0.04, 4), dragonObsidianMat);
        spine.position.set(0, 0.82 - s * 0.09, 0.22 - s * 0.32);
        spine.rotation.x = -Math.PI / 7;
        root.add(spine);
      }

      // Glowing Team Crest Crystal on upper chest
      const teamCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), dragonTeamGlowMat);
      teamCrystal.position.set(0, 0.76, 0.58);
      root.add(teamCrystal);

      // 2. Four Muscular Legs with Sharp Obsidian Claws (Quadrupedal stance from photo)
      // Left Foreleg
      const leftForeleg = new THREE.Group();
      leftForeleg.position.set(-0.46, 0.36, 0.42);
      const lUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.45, 6), dragonRedScalesMat);
      lUpperArm.position.set(-0.06, 0.02, 0);
      lUpperArm.rotation.z = Math.PI / 10;
      leftForeleg.add(lUpperArm);

      const lLowerArm = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.45, 6), dragonRedScalesMat);
      lLowerArm.position.set(-0.02, -0.28, 0.04);
      leftForeleg.add(lLowerArm);

      for (let c = -1; c <= 1; c++) {
        const claw = new THREE.Mesh(new THREE.ConeGeometry(0.048, 0.25, 4), dragonObsidianMat);
        claw.position.set(c * 0.08 - 0.02, -0.48, 0.16);
        claw.rotation.set(Math.PI / 2.8, 0, c * -0.15);
        leftForeleg.add(claw);
      }
      root.add(leftForeleg);

      // Right Foreleg
      const rightForeleg = new THREE.Group();
      rightForeleg.position.set(0.46, 0.36, 0.42);
      const rUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.45, 6), dragonRedScalesMat);
      rUpperArm.position.set(0.06, 0.02, 0);
      rUpperArm.rotation.z = -Math.PI / 10;
      rightForeleg.add(rUpperArm);

      const rLowerArm = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.45, 6), dragonRedScalesMat);
      rLowerArm.position.set(0.02, -0.28, 0.04);
      rightForeleg.add(rLowerArm);

      for (let c = -1; c <= 1; c++) {
        const claw = new THREE.Mesh(new THREE.ConeGeometry(0.048, 0.25, 4), dragonObsidianMat);
        claw.position.set(c * 0.08 + 0.02, -0.48, 0.16);
        claw.rotation.set(Math.PI / 2.8, 0, c * 0.15);
        rightForeleg.add(claw);
      }
      root.add(rightForeleg);

      // Left Hindleg
      const leftHindleg = new THREE.Group();
      leftHindleg.position.set(-0.55, 0.32, -0.5);
      const lThigh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28, 0), dragonRedScalesMat);
      lThigh.scale.set(0.9, 1.3, 1.1);
      lThigh.position.set(-0.06, 0.05, 0);
      leftHindleg.add(lThigh);

      const lHock = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.1, 0.45, 6), dragonRedScalesMat);
      lHock.position.set(-0.04, -0.25, 0.08);
      lHock.rotation.x = -Math.PI / 10;
      leftHindleg.add(lHock);

      for (let c = -1; c <= 1; c++) {
        const claw = new THREE.Mesh(new THREE.ConeGeometry(0.048, 0.24, 4), dragonObsidianMat);
        claw.position.set(c * 0.08 - 0.04, -0.46, 0.2);
        claw.rotation.set(Math.PI / 2.6, 0, c * -0.15);
        leftHindleg.add(claw);
      }
      root.add(leftHindleg);

      // Right Hindleg
      const rightHindleg = new THREE.Group();
      rightHindleg.position.set(0.55, 0.32, -0.5);
      const rThigh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28, 0), dragonRedScalesMat);
      rThigh.scale.set(0.9, 1.3, 1.1);
      rThigh.position.set(0.06, 0.05, 0);
      rightHindleg.add(rThigh);

      const rHock = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.1, 0.45, 6), dragonRedScalesMat);
      rHock.position.set(0.04, -0.25, 0.08);
      rHock.rotation.x = -Math.PI / 10;
      rightHindleg.add(rHock);

      for (let c = -1; c <= 1; c++) {
        const claw = new THREE.Mesh(new THREE.ConeGeometry(0.048, 0.24, 4), dragonObsidianMat);
        claw.position.set(c * 0.08 + 0.04, -0.46, 0.2);
        claw.rotation.set(Math.PI / 2.6, 0, c * 0.15);
        rightHindleg.add(claw);
      }
      root.add(rightHindleg);

      // 3. Muscular Articulated Neck
      const neckGroup = new THREE.Group();
      neckGroup.name = 'dragon_neck';
      neckGroup.position.set(0, 0.58, 0.48);

      const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 1.15, 6), dragonRedScalesMat);
      neckMesh.position.set(0, 0.48, 0.18);
      neckMesh.rotation.x = -Math.PI / 5.2;
      neckGroup.add(neckMesh);

      // Pale Cream Throat Plates (continuing ventral scutes up the throat)
      for (let tp = 0; tp < 4; tp++) {
        const throatPlate = new THREE.Mesh(new THREE.BoxGeometry(0.3 - tp * 0.035, 0.2, 0.22), dragonBellyCreamMat);
        throatPlate.position.set(0, 0.2 + tp * 0.25, 0.36 - tp * 0.06);
        throatPlate.rotation.x = -Math.PI / 5.2;
        neckGroup.add(throatPlate);
      }

      // Dorsal Obsidian Spines along nape
      for (let ns = 0; ns < 3; ns++) {
        const nSpine = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.24, 4), dragonObsidianMat);
        nSpine.position.set(0, 0.32 + ns * 0.26, 0.0 - ns * 0.08);
        nSpine.rotation.x = -Math.PI / 4;
        neckGroup.add(nSpine);
      }

      // 4. Fierce Sculpted Dragon Head (attached to neck)
      const headGroup = new THREE.Group();
      headGroup.position.set(0, 0.98, 0.36);

      // Faceted Cranium & Snout
      const cranium = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.88, 5), dragonRedScalesMat);
      cranium.position.set(0, 0.08, 0.36);
      cranium.rotation.x = Math.PI / 2.22;
      headGroup.add(cranium);

      // Angular Brow Ridges
      const browL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 0.36), dragonRedScalesMat);
      browL.position.set(-0.16, 0.16, 0.3);
      browL.rotation.set(0.1, 0, -0.22);
      headGroup.add(browL);

      const browR = browL.clone();
      browR.position.x = 0.16;
      browR.rotation.z = 0.22;
      headGroup.add(browR);

      // Glowing Predatory Eyes
      const eyeGeom = new THREE.BoxGeometry(0.07, 0.05, 0.14);
      const leftEye = new THREE.Mesh(eyeGeom, dragonEyeMat);
      leftEye.position.set(-0.17, 0.15, 0.34);
      leftEye.rotation.y = -Math.PI / 7;
      headGroup.add(leftEye);

      const rightEye = new THREE.Mesh(eyeGeom, dragonEyeMat);
      rightEye.position.set(0.17, 0.15, 0.34);
      rightEye.rotation.y = Math.PI / 7;
      headGroup.add(rightEye);

      // Prominent Golden-Amber Snout/Forehead Crest Horn (exact to photo reference!)
      const crestHorn = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.6, 4), dragonCrestAmberMat);
      crestHorn.position.set(0, 0.34, 0.42);
      crestHorn.rotation.set(-Math.PI / 5.5, 0, 0);
      headGroup.add(crestHorn);

      // Swept-Back Dark Obsidian Horns (exact to photo reference!)
      // Left Horn
      const leftHornBase = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.48, 5), dragonObsidianMat);
      leftHornBase.position.set(-0.22, 0.28, 0.05);
      leftHornBase.rotation.set(-0.4, 0, -0.42);
      headGroup.add(leftHornBase);

      const leftHornTip = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.65, 4), dragonObsidianMat);
      leftHornTip.position.set(-0.32, 0.68, -0.12);
      leftHornTip.rotation.set(-0.7, 0.12, 0.28);
      headGroup.add(leftHornTip);

      // Right Horn
      const rightHornBase = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.48, 5), dragonObsidianMat);
      rightHornBase.position.set(0.22, 0.28, 0.05);
      rightHornBase.rotation.set(-0.4, 0, 0.42);
      headGroup.add(rightHornBase);

      const rightHornTip = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.65, 4), dragonObsidianMat);
      rightHornTip.position.set(0.32, 0.68, -0.12);
      rightHornTip.rotation.set(-0.7, -0.12, -0.28);
      headGroup.add(rightHornTip);

      // Cheek Frills / Spikes (2 on each cheek)
      for (let side = -1; side <= 1; side += 2) {
        const cheek1 = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.3, 4), dragonRedScalesMat);
        cheek1.position.set(side * 0.28, 0.14, 0.1);
        cheek1.rotation.set(-0.2, 0, side * -1.25);
        headGroup.add(cheek1);

        const cheek2 = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.24, 4), dragonRedScalesMat);
        cheek2.position.set(side * 0.26, 0.0, 0.18);
        cheek2.rotation.set(-0.35, 0, side * -1.38);
        headGroup.add(cheek2);
      }

      // Articulated Lower Jaw (controlled by renderer.ts animation loop)
      const jaw = new THREE.Group();
      jaw.name = 'dragon_jaw';
      jaw.position.set(0, -0.05, 0.18);

      const jawBase = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.12, 0.6), dragonRedScalesMat);
      jawBase.position.set(0, -0.06, 0.25);
      jaw.add(jawBase);

      const jawChin = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.1, 0.45), dragonBellyCreamMat);
      jawChin.position.set(0, -0.11, 0.22);
      jaw.add(jawChin);

      // Sharp fangs
      for (let t = 0; t < 4; t++) {
        const toothL = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.09, 4), dragonBellyCreamMat);
        toothL.position.set(-0.11, 0.04, 0.12 + t * 0.11);
        jaw.add(toothL);
        const toothR = toothL.clone();
        toothR.position.x = 0.11;
        jaw.add(toothR);
      }
      headGroup.add(jaw);

      // Flame Emitter Anchor for Fire Breath Visuals
      const flameEmitter = new THREE.Group();
      flameEmitter.name = 'flame_emitter';
      flameEmitter.position.set(0, -0.04, 0.72);
      headGroup.add(flameEmitter);

      neckGroup.add(headGroup);
      root.add(neckGroup);

      // 5. Long Serpentine Curving Tail with Arrowhead Fin (matching photo)
      const tailGroup = new THREE.Group();
      tailGroup.name = 'dragon_tail';
      tailGroup.position.set(0, 0.22, -0.85);

      const tail1 = new THREE.Mesh(new THREE.ConeGeometry(0.38, 1.45, 6), dragonRedScalesMat);
      tail1.position.set(0, 0, -0.65);
      tail1.rotation.x = -Math.PI / 2.12;
      tailGroup.add(tail1);

      const tail2 = new THREE.Mesh(new THREE.ConeGeometry(0.24, 1.4, 6), dragonRedScalesMat);
      tail2.position.set(0.12, -0.05, -1.85);
      tail2.rotation.set(-Math.PI / 2.2, 0, -0.15);
      tailGroup.add(tail2);

      // Tail Dorsal Obsidian Spikes
      for (let ts = 0; ts < 4; ts++) {
        const tSpine = new THREE.Mesh(new THREE.ConeGeometry(0.07 - ts * 0.012, 0.3 - ts * 0.04, 4), dragonObsidianMat);
        tSpine.position.set(ts * 0.03, 0.24 - ts * 0.03, -0.4 - ts * 0.5);
        tSpine.rotation.x = -Math.PI / 5;
        tailGroup.add(tSpine);
      }

      // Flared Arrowhead / Spade Fin Blade at tail tip
      const spadeFinGroup = new THREE.Group();
      spadeFinGroup.position.set(0.22, -0.05, -2.55);
      spadeFinGroup.rotation.set(-Math.PI / 4, 0, -0.2);

      const centerBlade = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.8, 4), dragonObsidianMat);
      centerBlade.scale.set(0.35, 1.0, 1.5);
      spadeFinGroup.add(centerBlade);

      const barbL = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.48, 4), dragonRedScalesMat);
      barbL.position.set(-0.16, -0.15, -0.08);
      barbL.rotation.z = Math.PI / 3.8;
      spadeFinGroup.add(barbL);

      const barbR = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.48, 4), dragonRedScalesMat);
      barbR.position.set(0.16, -0.15, -0.08);
      barbR.rotation.z = -Math.PI / 3.8;
      spadeFinGroup.add(barbR);

      tailGroup.add(spadeFinGroup);
      root.add(tailGroup);

      // 6. Magnificent Two-Tone Arched Wings (Seamlessly sculpted from reference photo)
      const addBoneBetween = (
        parent: THREE.Group,
        pA: THREE.Vector3,
        pB: THREE.Vector3,
        radius: number,
        mat: THREE.Material
      ) => {
        const dir = new THREE.Vector3().subVectors(pB, pA);
        const len = dir.length();
        if (len < 0.001) return;
        const boneGeom = new THREE.CylinderGeometry(radius * 0.75, radius, len, 8);
        boneGeom.translate(0, len / 2, 0);
        boneGeom.rotateX(Math.PI / 2);
        const boneMesh = new THREE.Mesh(boneGeom, mat);
        boneMesh.position.copy(pA);
        boneMesh.lookAt(pB);
        parent.add(boneMesh);
      };

      const buildDragonWing = (isLeft: boolean): THREE.Group => {
        const wing = new THREE.Group();
        wing.name = isLeft ? 'left_wing' : 'right_wing';
        const s = isLeft ? -1 : 1;
        wing.position.set(s * 0.42, 0.65, 0.05);

        // Core joint nodes
        const pShoulder = new THREE.Vector3(0, 0, 0);
        const pElbow = new THREE.Vector3(s * 0.9, 0.75, 0.1);
        const pWrist = new THREE.Vector3(s * 1.65, 1.45, -0.05);
        const pClawTip = new THREE.Vector3(s * 1.9, 1.7, -0.08);

        // Finger bone tips
        const pTip1 = new THREE.Vector3(s * 2.3, 0.65, -0.35);
        const pTip2 = new THREE.Vector3(s * 1.75, 0.25, -0.55);
        const pTip3 = new THREE.Vector3(s * 1.15, 0.1, -0.5);
        const pFlank = new THREE.Vector3(s * 0.45, -0.15, -0.35);

        // Midpoints along the wing web (boundary between upper red & lower cream membrane)
        const pMid1 = new THREE.Vector3(s * 1.97, 1.05, -0.2);
        const pMid2 = new THREE.Vector3(s * 1.7, 0.85, -0.3);
        const pMid3 = new THREE.Vector3(s * 1.02, 0.42, -0.2);

        // Scalloped trailing edge points
        const pScallop1 = new THREE.Vector3(s * 1.95, -0.2, -0.85);
        const pScallop2 = new THREE.Vector3(s * 1.4, -0.25, -0.8);
        const pScallop3 = new THREE.Vector3(s * 0.75, -0.25, -0.65);

        // 1. Structural Bone Struts (mathematically bound to vertex joints)
        addBoneBetween(wing, pShoulder, pElbow, 0.14, dragonRedScalesMat);
        addBoneBetween(wing, pElbow, pWrist, 0.11, dragonRedScalesMat);
        addBoneBetween(wing, pWrist, pTip1, 0.055, dragonRedScalesMat);
        addBoneBetween(wing, pWrist, pTip2, 0.048, dragonRedScalesMat);
        addBoneBetween(wing, pElbow, pTip3, 0.048, dragonRedScalesMat);

        // Apex Thumb Claw at Wrist
        addBoneBetween(wing, pWrist, pClawTip, 0.07, dragonObsidianMat);

        // Finger claws at wing tips
        const clawOffset1 = new THREE.Vector3(s * 0.1, -0.08, -0.05);
        addBoneBetween(wing, pTip1, pTip1.clone().add(clawOffset1), 0.04, dragonObsidianMat);
        const clawOffset2 = new THREE.Vector3(s * 0.08, -0.08, -0.05);
        addBoneBetween(wing, pTip2, pTip2.clone().add(clawOffset2), 0.04, dragonObsidianMat);
        const clawOffset3 = new THREE.Vector3(s * 0.06, -0.08, -0.05);
        addBoneBetween(wing, pTip3, pTip3.clone().add(clawOffset3), 0.04, dragonObsidianMat);

        // Helper to push triangle vertices
        const pushTri = (arr: number[], v1: THREE.Vector3, v2: THREE.Vector3, v3: THREE.Vector3) => {
          if (isLeft) {
            arr.push(v1.x, v1.y, v1.z, v3.x, v3.y, v3.z, v2.x, v2.y, v2.z);
          } else {
            arr.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z, v3.x, v3.y, v3.z);
          }
        };

        // 2. Upper Red Membrane Mesh (Fiery Red Scales)
        const redVerts: number[] = [];
        pushTri(redVerts, pShoulder, pElbow, pMid3);
        pushTri(redVerts, pElbow, pWrist, pMid2);
        pushTri(redVerts, pElbow, pMid2, pMid3);
        pushTri(redVerts, pWrist, pMid1, pMid2);
        pushTri(redVerts, pWrist, pTip1, pMid1);

        const redGeom = new THREE.BufferGeometry();
        redGeom.setAttribute('position', new THREE.Float32BufferAttribute(redVerts, 3));
        redGeom.computeVertexNormals();
        const redMesh = new THREE.Mesh(redGeom, dragonWingRedMat);
        wing.add(redMesh);

        // 3. Lower Scalloped Cream Membrane Mesh (Exact match to reference photo!)
        const creamVerts: number[] = [];
        pushTri(creamVerts, pMid3, pShoulder, pFlank);
        pushTri(creamVerts, pMid3, pFlank, pScallop3);
        pushTri(creamVerts, pMid3, pScallop3, pTip3);
        pushTri(creamVerts, pMid3, pTip3, pMid2);
        pushTri(creamVerts, pMid2, pTip3, pScallop2);
        pushTri(creamVerts, pMid2, pScallop2, pTip2);
        pushTri(creamVerts, pMid2, pTip2, pMid1);
        pushTri(creamVerts, pMid1, pTip2, pScallop1);
        pushTri(creamVerts, pMid1, pScallop1, pTip1);

        const creamGeom = new THREE.BufferGeometry();
        creamGeom.setAttribute('position', new THREE.Float32BufferAttribute(creamVerts, 3));
        creamGeom.computeVertexNormals();
        const creamMesh = new THREE.Mesh(creamGeom, dragonWingCreamMat);
        wing.add(creamMesh);

        return wing;
      };

      root.add(buildDragonWing(true));
      root.add(buildDragonWing(false));
      break;
    }

    case 'trade_cart': {
      // 1. Covered Merchant Cargo Wagon (Age of Empires II: DE Trade Cart)
      const wagonBody = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.4, 1.4), woodMat);
      wagonBody.name = 'siege_chassis';
      wagonBody.position.set(0, 0.42, -0.25);
      root.add(wagonBody);

      // Arched Canvas Conestoga Canopy
      const canopyGeom = new THREE.CylinderGeometry(0.48, 0.48, 1.42, 16, 1, false, 0, Math.PI);
      canopyGeom.rotateZ(Math.PI / 2);
      canopyGeom.rotateY(Math.PI / 2);
      const canopy = new THREE.Mesh(canopyGeom, canvasMat);
      canopy.position.set(0, 0.65, -0.25);
      root.add(canopy);

      // Faction Banner on Canopy Flap
      const rearFlap = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.35, 0.05), teamClothMat);
      rearFlap.position.set(0, 0.55, -0.96);
      root.add(rearFlap);

      // Cargo Burlap Sacks & Wooden Crates Inside
      const crate1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.28, 0.3), woodMat);
      crate1.position.set(-0.18, 0.48, -0.15);
      root.add(crate1);

      const sack = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), leatherMat);
      sack.position.set(0.18, 0.44, -0.1);
      root.add(sack);

      // 2 Large 16-Spoke Wooden Carriage Wheels with Iron Rims
      const cartWheelGeom = new THREE.CylinderGeometry(0.38, 0.38, 0.1, 18);
      cartWheelGeom.rotateZ(Math.PI / 2);

      const leftWheel = new THREE.Mesh(cartWheelGeom, darkIronMat);
      leftWheel.name = 'wheel_fl';
      leftWheel.position.set(-0.52, 0.38, -0.25);
      root.add(leftWheel);

      const rightWheel = new THREE.Mesh(cartWheelGeom, darkIronMat);
      rightWheel.name = 'wheel_fr';
      rightWheel.position.set(0.52, 0.38, -0.25);
      root.add(rightWheel);

      // Wooden Shaft Tongue & Yoke
      const tongue = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.1, 10), woodMat);
      tongue.position.set(0, 0.32, 0.7);
      tongue.rotation.x = Math.PI / 2;
      root.add(tongue);

      // 2. Draft Donkey / Mule in Harness
      const mule = createArticulatedHorse(horseCoatMat, darkLeatherMat, false);
      mule.position.set(0, 0, 1.15);
      mule.scale.set(0.85, 0.85, 0.85);
      root.add(mule);
      break;
    }
  }

  // Tag every mesh with entityId for raycast selection and enable high-fidelity shadow casting
  root.traverse((child: any) => {
    if ((child as THREE.Mesh).isMesh) {
      child.userData = { entityType: 'unit', entityId: unit.id };
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return root;
}
