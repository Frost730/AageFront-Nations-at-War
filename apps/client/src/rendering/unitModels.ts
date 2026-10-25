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

  // Dragon materials
  const dragonScalesMat = new THREE.MeshStandardMaterial({
    color: teamCol.clone().multiplyScalar(0.85),
    roughness: 0.26,
    metalness: 0.48,
    flatShading: false
  });
  const dragonBellyMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    roughness: 0.42,
    metalness: 0.12,
    flatShading: false
  });
  const wingMat = new THREE.MeshStandardMaterial({
    color: teamCol.clone().offsetHSL(0.04, 0.28, 0.08),
    roughness: 0.45,
    side: THREE.DoubleSide,
    flatShading: false
  });
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
    height: number = 0.38,
    isSteelGreave: boolean = false
  ): THREE.Group => {
    const legGroup = new THREE.Group();
    legGroup.name = name;
    legGroup.position.set(xOffset, 0.36, 0);

    // Thigh (Cuisses / Chausses) with 16 smooth radial segments
    const thighGeom = new THREE.CylinderGeometry(0.085, 0.072, height * 0.52, 16);
    thighGeom.translate(0, -height * 0.26, 0);
    const thigh = new THREE.Mesh(thighGeom, mat);
    thigh.castShadow = true;
    legGroup.add(thigh);

    // Articulated Knee Cop (Poleyn)
    const kneeGeom = new THREE.SphereGeometry(0.075, 12, 10);
    const knee = new THREE.Mesh(kneeGeom, isSteelGreave ? steelMat : mat);
    knee.position.set(0, -height * 0.5, 0.025);
    knee.castShadow = true;
    legGroup.add(knee);

    // Shin / Greave
    const shinGeom = new THREE.CylinderGeometry(0.07, 0.058, height * 0.5, 16);
    shinGeom.translate(0, -height * 0.75, 0);
    const shin = new THREE.Mesh(shinGeom, isSteelGreave ? steelMat : mat);
    shin.castShadow = true;
    legGroup.add(shin);

    // Contoured Historical Sabaton / Riding Boot with toe curve
    const bootGeom = new THREE.CylinderGeometry(0.07, 0.08, 0.16, 12);
    bootGeom.rotateX(Math.PI / 2);
    bootGeom.scale(1.0, 0.75, 1.4);
    bootGeom.translate(0, -height - 0.025, 0.05);
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
    legGroup.position.set(x, -0.15, z);

    // Muscular Upper Thigh / Gaskin
    const thighGeom = new THREE.CylinderGeometry(0.09, 0.065, length * 0.5, 14);
    thighGeom.translate(0, -length * 0.25, 0);
    const thigh = new THREE.Mesh(thighGeom, mat);
    thigh.castShadow = true;
    legGroup.add(thigh);

    // Hock / Knee Joint
    const hockGeom = new THREE.SphereGeometry(0.065, 10, 8);
    const hock = new THREE.Mesh(hockGeom, mat);
    hock.position.set(0, -length * 0.5, -0.015);
    legGroup.add(hock);

    // Cannon Bone & Pastern
    const cannonGeom = new THREE.CylinderGeometry(0.055, 0.045, length * 0.5, 14);
    cannonGeom.translate(0, -length * 0.75, 0);
    const cannon = new THREE.Mesh(cannonGeom, mat);
    cannon.castShadow = true;
    legGroup.add(cannon);

    // Flared Equine Hoof with iron shoe
    const hoofGeom = new THREE.CylinderGeometry(0.05, 0.075, 0.08, 14);
    hoofGeom.translate(0, -length - 0.02, 0.015);
    const hoof = new THREE.Mesh(hoofGeom, darkLeatherMat);
    hoof.castShadow = true;
    legGroup.add(hoof);

    return legGroup;
  };

  // -------------------------------------------------------------
  // UNIT ARCHETYPES (AGE OF EMPIRES II & III DEFINITIVE EDITION)
  // -------------------------------------------------------------
  switch (unit.type) {
    case 'worker': {
      // 1. Torso with Leather Apron & Faction Tunic
      const torsoGroup = new THREE.Group();
      torsoGroup.name = 'unit_torso';
      torsoGroup.position.y = 0.45;

      // Sculpted Tunic with natural waist flare
      const tunicGeom = new THREE.CylinderGeometry(0.18, 0.23, 0.65, 16);
      const tunic = new THREE.Mesh(tunicGeom, teamClothMat);
      torsoGroup.add(tunic);

      // Heavy Blacksmith/Laborer Leather Apron with shoulder bib
      const apronBib = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.05), leatherMat);
      apronBib.position.set(0, 0.08, 0.16);
      torsoGroup.add(apronBib);

      const apronSkirt = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.38, 0.06), leatherMat);
      apronSkirt.position.set(0, -0.15, 0.16);
      torsoGroup.add(apronSkirt);

      // Utility Leather Belt with Gilded Buckle & Pouch
      const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.07, 16), darkLeatherMat);
      belt.position.y = -0.05;
      torsoGroup.add(belt);

      const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.04), goldMat);
      buckle.position.set(0, -0.05, 0.23);
      torsoGroup.add(buckle);

      const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.08), leatherMat);
      pouch.position.set(-0.16, -0.08, 0.15);
      torsoGroup.add(pouch);

      // Shoulders & Rolled Tunic Sleeves
      const lArm = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.38, 12), teamClothMat);
      lArm.name = 'left_arm';
      lArm.position.set(-0.25, 0.12, 0);
      lArm.rotation.z = Math.PI / 10;
      torsoGroup.add(lArm);

      const lHand = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), fleshMat);
      lHand.position.set(-0.29, -0.08, 0);
      torsoGroup.add(lHand);

      const rArm = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.38, 12), teamClothMat);
      rArm.position.set(0.25, 0.12, 0);
      rArm.rotation.z = -Math.PI / 10;
      torsoGroup.add(rArm);

      // Realistic Head with Facial Contours
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 14), fleshMat);
      head.position.y = 0.44;
      torsoGroup.add(head);

      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.155, 14, 12, 0, Math.PI * 2, 0, Math.PI / 2), hairBrownMat);
      hair.position.set(0, 0.45, -0.02);
      torsoGroup.add(hair);

      // Artisan Felt Cap with Turned-up Brim
      const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.04, 16), darkLeatherMat);
      hatBrim.position.y = 0.54;
      torsoGroup.add(hatBrim);

      const hatCrown = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.22, 16), teamDarkMat);
      hatCrown.position.y = 0.65;
      torsoGroup.add(hatCrown);

      // Back-mounted Wicker Resource Hod / Gathering Basket
      const basket = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.42, 0.22), woodMat);
      basket.position.set(0, 0.12, -0.22);
      torsoGroup.add(basket);

      const ropeStrapL = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 8), darkLeatherMat);
      ropeStrapL.position.set(-0.12, 0.18, 0);
      ropeStrapL.rotation.x = Math.PI / 6;
      torsoGroup.add(ropeStrapL);

      const ropeStrapR = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 8), darkLeatherMat);
      ropeStrapR.position.set(0.12, 0.18, 0);
      ropeStrapR.rotation.x = Math.PI / 6;
      torsoGroup.add(ropeStrapR);

      root.add(torsoGroup);

      // 2. Articulated Legs & Sturdy Worker Boots
      root.add(createArticulatedLeg(darkLeatherMat, -0.1, 'left_leg'));
      root.add(createArticulatedLeg(darkLeatherMat, 0.1, 'right_leg'));

      // 3. Tool Pivot (Masterwork AoE Pickaxe / Woodsman Axe)
      const toolPivot = new THREE.Group();
      toolPivot.name = 'tool_pivot';
      toolPivot.position.set(0.28, 0.5, 0.12);

      const toolHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, 0.76, 12), woodMat);
      toolHandle.position.set(0, 0.2, 0);
      toolHandle.rotation.z = Math.PI / 4.5;
      toolPivot.add(toolHandle);

      // Dual-head Mining Pickaxe & Logging Axe
      const pickHead = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.09, 0.08), steelMat);
      pickHead.position.set(0.22, 0.46, 0);
      toolPivot.add(pickHead);

      const pickSpike = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.2, 12), steelMat);
      pickSpike.position.set(0.38, 0.46, 0);
      pickSpike.rotation.z = -Math.PI / 2;
      toolPivot.add(pickSpike);

      const axeBlade = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.18, 12), steelMat);
      axeBlade.position.set(0.05, 0.46, 0);
      axeBlade.rotation.z = Math.PI / 2;
      toolPivot.add(axeBlade);

      root.add(toolPivot);
      break;
    }

    case 'scout': {
      // 1. Sleek Agile Light Horse (High-Poly Equine Geometry)
      const horse = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 1.25, 16), horseCoatMat);
      horse.name = 'horse_body';
      horse.position.y = 0.55;
      horse.rotation.x = Math.PI / 2;

      // Arched Muscular Neck
      const neckGeom = new THREE.CylinderGeometry(0.18, 0.26, 0.65, 14);
      const neck = new THREE.Mesh(neckGeom, horseCoatMat);
      neck.name = 'horse_neck';
      neck.position.set(0, 0.35, 0.52);
      neck.rotation.x = -Math.PI / 5.5;
      horse.add(neck);

      // Sculpted Equine Head with muzzle & nostrils
      const headGeom = new THREE.CylinderGeometry(0.12, 0.17, 0.46, 14);
      const head = new THREE.Mesh(headGeom, horseCoatMat);
      head.position.set(0, 0.62, 0.74);
      head.rotation.x = Math.PI / 4;
      horse.add(head);

      // Perked Horse Ears
      const earGeom = new THREE.ConeGeometry(0.035, 0.12, 8);
      const earL = new THREE.Mesh(earGeom, horseCoatMat);
      earL.position.set(-0.08, 0.75, 0.68);
      earL.rotation.set(-Math.PI / 8, 0, -Math.PI / 10);
      horse.add(earL);

      const earR = new THREE.Mesh(earGeom, horseCoatMat);
      earR.position.set(0.08, 0.75, 0.68);
      earR.rotation.set(-Math.PI / 8, 0, Math.PI / 10);
      horse.add(earR);

      // Flowing Dark Mane
      const mane = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.52, 0.18), darkLeatherMat);
      mane.position.set(0, 0.48, 0.42);
      horse.add(mane);

      // Flowing Horse Tail
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.55, 10), darkLeatherMat);
      tail.position.set(0, 0.05, -0.65);
      tail.rotation.x = -Math.PI / 8;
      horse.add(tail);

      // 4 Articulated Gallop Legs
      horse.add(createHorseLeg(horseCoatMat, -0.19, 0.38, 'horse_leg_fl'));
      horse.add(createHorseLeg(horseCoatMat, 0.19, 0.38, 'horse_leg_fr'));
      horse.add(createHorseLeg(horseCoatMat, -0.19, -0.38, 'horse_leg_bl'));
      horse.add(createHorseLeg(horseCoatMat, 0.19, -0.38, 'horse_leg_br'));

      // Padded Faction Saddlecloth & Leather Saddle
      const saddlecloth = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.28, 0.68), teamMat);
      saddlecloth.position.set(0, 0.12, 0);
      horse.add(saddlecloth);

      const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.48), darkLeatherMat);
      saddle.position.set(0, 0.26, 0);
      horse.add(saddle);

      root.add(horse);

      // 2. Scout Rider in Light Recon Armor
      const riderTorso = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.22, 0.62, 14), teamClothMat);
      riderTorso.position.set(0, 1.0, 0.05);
      root.add(riderTorso);

      const riderBelt = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.06, 14), darkLeatherMat);
      riderBelt.position.set(0, 0.85, 0.05);
      root.add(riderBelt);

      const riderHead = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 12), fleshMat);
      riderHead.position.set(0, 1.38, 0.05);
      root.add(riderHead);

      const scoutCap = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.26, 14), darkLeatherMat);
      scoutCap.position.set(0, 1.54, 0.05);
      root.add(scoutCap);

      const scoutFeather = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.22, 0.08), teamMat);
      scoutFeather.position.set(-0.1, 1.62, 0.05);
      scoutFeather.rotation.z = Math.PI / 8;
      root.add(scoutFeather);

      // 3. Lance Pivot with Scout Pennon
      const lancePivot = new THREE.Group();
      lancePivot.name = 'lance_pivot';
      lancePivot.position.set(0.28, 1.05, 0.18);

      const spearShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 1.9, 12), woodMat);
      spearShaft.position.set(0, 0.42, 0);
      spearShaft.rotation.x = Math.PI / 10;
      lancePivot.add(spearShaft);

      const spearTip = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.32, 12), steelMat);
      spearTip.position.set(0, 1.42, 0.3);
      spearTip.rotation.x = Math.PI / 10;
      lancePivot.add(spearTip);

      const pennon = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.25, 0.55), teamMat);
      pennon.position.set(0, 1.22, 0.08);
      lancePivot.add(pennon);

      root.add(lancePivot);
      break;
    }

    case 'basic_infantry': {
      // 1. Man-at-Arms with Chainmail, Fluted Cuirass & Steel Norman Helm
      const torsoGroup = new THREE.Group();
      torsoGroup.name = 'unit_torso';
      torsoGroup.position.y = 0.5;

      // Heavy Riveted Mail Hauberk
      const chainmail = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.27, 0.74, 16), darkIronMat);
      torsoGroup.add(chainmail);

      // Steel Cuirass (Breastplate with medial ridge)
      const breastplate = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.25, 0.48, 16), steelMat);
      breastplate.position.set(0, 0.09, 0.04);
      torsoGroup.add(breastplate);

      // Golden Faction Heraldic Crest on Breastplate
      const crest = new THREE.Mesh(new THREE.OctahedronGeometry(0.08, 0), goldMat);
      crest.position.set(0, 0.14, 0.27);
      torsoGroup.add(crest);

      // Fluted Steel Pauldrons (Shoulder Armor)
      const pauldronGeom = new THREE.SphereGeometry(0.125, 14, 12);
      const lPauldron = new THREE.Mesh(pauldronGeom, steelMat);
      lPauldron.position.set(-0.29, 0.25, 0);
      torsoGroup.add(lPauldron);

      const rPauldron = new THREE.Mesh(pauldronGeom, steelMat);
      rPauldron.position.set(0.29, 0.25, 0);
      torsoGroup.add(rPauldron);

      // Norman Nasal Helm with eye line and cheek guards
      const helmGeom = new THREE.CylinderGeometry(0.17, 0.19, 0.32, 16);
      const helm = new THREE.Mesh(helmGeom, steelMat);
      helm.position.y = 0.5;
      torsoGroup.add(helm);

      const nasalGuard = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.18, 0.04), steelMat);
      nasalGuard.position.set(0, 0.42, 0.2);
      torsoGroup.add(nasalGuard);

      const helmCrown = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.18, 16), steelMat);
      helmCrown.position.y = 0.72;
      torsoGroup.add(helmCrown);

      // Flowing Team Feather Plume
      const plume = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.32, 0.22), teamMat);
      plume.position.set(0, 0.75, -0.06);
      torsoGroup.add(plume);

      root.add(torsoGroup);

      // 2. Articulated Greaves & Sabatons
      root.add(createArticulatedLeg(steelMat, -0.11, 'left_leg', 0.38, true));
      root.add(createArticulatedLeg(steelMat, 0.11, 'right_leg', 0.38, true));

      // 3. Sword Pivot with Broad Arming Sword (Detailed Fuller & Crossguard)
      const swordPivot = new THREE.Group();
      swordPivot.name = 'sword_pivot';
      swordPivot.position.set(0.3, 0.54, 0.15);

      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.88, 0.12), steelMat);
      blade.position.set(0, 0.42, 0);
      swordPivot.add(blade);

      const fullerGroove = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.6, 0.03), darkIronMat);
      fullerGroove.position.set(0, 0.38, 0);
      swordPivot.add(fullerGroove);

      const swordTip = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 8), steelMat);
      swordTip.position.set(0, 0.94, 0);
      swordPivot.add(swordTip);

      const crossguard = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.34), goldMat);
      crossguard.position.set(0, 0.06, 0);
      swordPivot.add(crossguard);

      const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), goldMat);
      pommel.position.set(0, -0.12, 0);
      swordPivot.add(pommel);

      root.add(swordPivot);

      // 4. Shield Pivot with Heater Shield & Team Heraldry
      const shieldPivot = new THREE.Group();
      shieldPivot.name = 'shield_pivot';
      shieldPivot.position.set(-0.3, 0.54, 0.1);

      // Curved Shield Face
      const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.22, 0.62, 14, 1, false, 0, Math.PI), teamMat);
      shield.rotation.y = -Math.PI / 2;
      shieldPivot.add(shield);

      const shieldRim = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.64, 0.46), steelMat);
      shieldRim.position.x = -0.01;
      shieldPivot.add(shieldRim);

      const shieldBoss = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.12, 12), goldMat);
      shieldBoss.position.set(-0.06, 0.05, 0);
      shieldBoss.rotation.z = Math.PI / 2;
      shieldPivot.add(shieldBoss);

      root.add(shieldPivot);
      break;
    }

    case 'spearman': {
      // 1. Spearman Torso in Quilted Gambeson & Scale Hauberk
      const torsoGroup = new THREE.Group();
      torsoGroup.name = 'unit_torso';
      torsoGroup.position.y = 0.5;

      const gambeson = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.25, 0.72, 16), teamMat);
      torsoGroup.add(gambeson);

      const scaleArmor = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.24, 0.44, 16), darkIronMat);
      scaleArmor.position.y = 0.07;
      torsoGroup.add(scaleArmor);

      // Kettle Hat / Chapel de Fer with Flared Protective Brim
      const kettleHat = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), steelMat);
      kettleHat.position.y = 0.48;
      torsoGroup.add(kettleHat);

      const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.035, 18), steelMat);
      hatBrim.position.y = 0.47;
      torsoGroup.add(hatBrim);

      root.add(torsoGroup);

      // 2. Stately 2.8m Ash Pike with Leaf Spearhead & Silk Tassel
      const pikePivot = new THREE.Group();
      pikePivot.name = 'pike_pivot';
      pikePivot.position.set(0.28, 0.6, 0.15);

      const pikeShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.8, 14), woodMat);
      pikeShaft.position.set(0, 0.85, 0);
      pikeShaft.rotation.x = Math.PI / 18;
      pikePivot.add(pikeShaft);

      const pikeBlade = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.48, 12), steelMat);
      pikeBlade.position.set(0, 2.3, 0.18);
      pikeBlade.rotation.x = Math.PI / 18;
      pikePivot.add(pikeBlade);

      const pikeTassel = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), teamMat);
      pikeTassel.position.set(0, 2.05, 0.16);
      pikePivot.add(pikeTassel);

      root.add(pikePivot);

      // Forearm Steel Buckler Shield
      const buckler = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.04, 16), steelMat);
      buckler.name = 'left_arm';
      buckler.position.set(-0.28, 0.55, 0.1);
      buckler.rotation.z = Math.PI / 2;
      const bucklerBoss = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.08, 10), goldMat);
      bucklerBoss.position.set(0, 0.04, 0);
      buckler.add(bucklerBoss);
      root.add(buckler);

      // Articulated Legs
      root.add(createArticulatedLeg(darkIronMat, -0.11, 'left_leg', 0.38, true));
      root.add(createArticulatedLeg(darkIronMat, 0.11, 'right_leg', 0.38, true));
      break;
    }

    case 'ranged_infantry': {
      // 1. Archer in Leather Brigandine, Armguard & Hood
      const torsoGroup = new THREE.Group();
      torsoGroup.name = 'unit_torso';
      torsoGroup.position.y = 0.48;

      const tunic = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.23, 0.68, 16), teamClothMat);
      torsoGroup.add(tunic);

      const leatherVest = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.44, 16), leatherMat);
      leatherVest.position.y = 0.05;
      torsoGroup.add(leatherVest);

      // Archer's Hood & Face
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 12), fleshMat);
      head.position.y = 0.44;
      torsoGroup.add(head);

      const hood = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.36, 16), teamDarkMat);
      hood.position.y = 0.58;
      torsoGroup.add(hood);

      root.add(torsoGroup);

      // 2. Masterwork Recurve Yew Longbow with Horn Nocks & Drawn String
      const bowPivot = new THREE.Group();
      bowPivot.name = 'bow_pivot';
      bowPivot.position.set(0.28, 0.55, 0.18);

      const bowLimb = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.03, 10, 24, Math.PI * 0.95), woodMat);
      bowLimb.rotation.y = Math.PI / 2;
      bowPivot.add(bowLimb);

      const bowString = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.84, 6), canvasMat);
      bowString.position.set(0, 0, -0.16);
      bowPivot.add(bowString);

      // Notched bodkin arrow ready to loose
      const arrowShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.72, 8), woodMat);
      arrowShaft.position.set(0, 0, 0.08);
      arrowShaft.rotation.x = Math.PI / 2;
      bowPivot.add(arrowShaft);

      const arrowTip = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.09, 8), steelMat);
      arrowTip.position.set(0, 0, 0.46);
      arrowTip.rotation.x = Math.PI / 2;
      bowPivot.add(arrowTip);

      root.add(bowPivot);

      // 3. Side Quiver with Fletched Goose-Feather Arrows
      const quiver = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.6, 14), darkLeatherMat);
      quiver.position.set(-0.18, 0.66, -0.2);
      quiver.rotation.z = Math.PI / 5;
      root.add(quiver);

      for (let a = 0; a < 4; a++) {
        const arrowTail = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.12, 0.08), teamMat);
        arrowTail.position.set(-0.16 - a * 0.03, 1.0 + a * 0.02, -0.2);
        root.add(arrowTail);
      }

      // Articulated Legs
      root.add(createArticulatedLeg(darkLeatherMat, -0.1, 'left_leg'));
      root.add(createArticulatedLeg(darkLeatherMat, 0.1, 'right_leg'));
      break;
    }

    case 'cavalry': {
      // 1. Armored Destrier Warhorse with Steel Chanfron & Flowing Caparison
      const horse = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.44, 1.35, 18), whiteHorseMat);
      horse.name = 'horse_body';
      horse.position.y = 0.6;
      horse.rotation.x = Math.PI / 2;

      // Heavy team-colored flowing barding caparison with gold fringe trim
      const caparison = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.5, 0.98), teamMat);
      caparison.position.set(0, -0.06, 0);
      horse.add(caparison);

      const goldFringe = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.06, 1.0), goldMat);
      goldFringe.position.set(0, -0.32, 0);
      horse.add(goldFringe);

      // Muscular Neck & Head with Polished Steel Chanfron (Head Armor)
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 0.68, 16), whiteHorseMat);
      neck.name = 'horse_neck';
      neck.position.set(0, 0.38, 0.54);
      neck.rotation.x = -Math.PI / 5.2;
      horse.add(neck);

      const head = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.19, 0.48, 16), whiteHorseMat);
      head.position.set(0, 0.68, 0.78);
      head.rotation.x = Math.PI / 4;
      horse.add(head);

      const chanfron = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.34, 0.2), steelMat);
      chanfron.position.set(0, 0.72, 0.86);
      horse.add(chanfron);

      const chanfronSpike = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.16, 10), goldMat);
      chanfronSpike.position.set(0, 0.86, 0.98);
      chanfronSpike.rotation.x = Math.PI / 3;
      horse.add(chanfronSpike);

      // 4 Powerful Articulated Warhorse Legs
      horse.add(createHorseLeg(whiteHorseMat, -0.22, 0.4, 'horse_leg_fl', 0.6));
      horse.add(createHorseLeg(whiteHorseMat, 0.22, 0.4, 'horse_leg_fr', 0.6));
      horse.add(createHorseLeg(whiteHorseMat, -0.22, -0.4, 'horse_leg_bl', 0.6));
      horse.add(createHorseLeg(whiteHorseMat, 0.22, -0.4, 'horse_leg_br', 0.6));

      root.add(horse);

      // 2. Knight in Full Gothic Plate Armor with Greathelm & Royal Crest
      const knight = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.29, 0.7, 16), steelMat);
      knight.position.set(0, 1.15, 0.05);
      root.add(knight);

      const helm = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.36, 16), steelMat);
      helm.position.set(0, 1.62, 0.05);
      root.add(helm);

      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.08), goldMat);
      visor.position.set(0, 1.62, 0.22);
      root.add(visor);

      const knightPlume = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.38, 0.26), teamMat);
      knightPlume.position.set(0, 1.88, -0.06);
      root.add(knightPlume);

      // 3. Heavy Tournament Lance with Conical Vamplate Shield
      const lancePivot = new THREE.Group();
      lancePivot.name = 'lance_pivot';
      lancePivot.position.set(0.38, 1.15, 0.35);

      const lance = new THREE.Mesh(new THREE.ConeGeometry(0.085, 3.2, 14), teamMat);
      lance.rotation.x = Math.PI / 3;
      lance.position.set(0, 0.45, 0.55);
      lancePivot.add(lance);

      const vamplate = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.16, 16), steelMat);
      vamplate.position.set(0, -0.1, -0.3);
      lancePivot.add(vamplate);

      root.add(lancePivot);
      break;
    }

    case 'siege_unit': {
      // 1. Reinforced Oak Timber Chassis with Heavy Iron Strapping
      const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.34, 1.85), woodMat);
      chassis.name = 'siege_chassis';
      chassis.position.y = 0.34;
      root.add(chassis);

      // Heavy Forged Iron Corner Straps and Rivet Plates
      for (const z of [0.75, -0.75]) {
        const strap = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.07, 0.12), ironMat);
        strap.position.set(0, 0.34, z);
        root.add(strap);
      }

      // 4 Heavy 16-Spoke Wooden Wheels with Iron Rim Tires & Brass Hubs
      const wheelGeom = new THREE.CylinderGeometry(0.35, 0.35, 0.14, 20);
      wheelGeom.rotateZ(Math.PI / 2);
      const wheels = [
        [-0.72, 0.35, -0.65], [0.72, 0.35, -0.65],
        [-0.72, 0.35, 0.65], [0.72, 0.35, 0.65]
      ];
      const wheelNames = ['wheel_fl', 'wheel_fr', 'wheel_bl', 'wheel_br'];
      wheels.forEach(([wx, wy, wz], wIdx) => {
        const wheel = new THREE.Mesh(wheelGeom, darkIronMat);
        wheel.name = wheelNames[wIdx];
        wheel.position.set(wx, wy, wz);
        root.add(wheel);

        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.18, 14), goldMat);
        hub.position.set(wx, wy, wz);
        hub.rotation.z = Math.PI / 2;
        root.add(hub);
      });

      // 2. Heavy Timber A-Frame Upright Trestle with Cross Braces
      const frameL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.5, 12), woodMat);
      frameL.position.set(-0.48, 0.95, -0.1);
      root.add(frameL);

      const frameR = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.5, 12), woodMat);
      frameR.position.set(0.48, 0.95, -0.1);
      root.add(frameR);

      const crossBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.1, 14), woodMat);
      crossBeam.position.set(0, 1.45, -0.1);
      crossBeam.rotation.z = Math.PI / 2;
      root.add(crossBeam);

      // 3. Catapult / Trebuchet Throwing Arm Pivot
      const armPivot = new THREE.Group();
      armPivot.name = 'arm_pivot';
      armPivot.position.set(0, 0.9, -0.15);

      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.9, 0.16), woodMat);
      arm.position.set(0, 0.85, 0);
      arm.rotation.x = -Math.PI / 4.2;
      armPivot.add(arm);

      // Heavy Counterweight Box loaded with Granite Ballast
      const counterweight = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.5, 0.45), darkStoneMat);
      counterweight.position.set(0, -0.28, 0.22);
      armPivot.add(counterweight);

      // Throwing Sling Bucket with Fiery Brimstone Boulder
      const bucket = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.32, 0.52), ironMat);
      bucket.position.set(0, 1.7, -0.48);
      armPivot.add(bucket);

      const fieryBoulder = new THREE.Mesh(new THREE.DodecahedronGeometry(0.26, 1), fireGlowMat);
      fieryBoulder.position.set(0, 1.88, -0.48);
      armPivot.add(fieryBoulder);

      root.add(armPivot);
      break;
    }

    case 'advanced_unit': {
      // 1. Royal Champion / Teutonic Knight in Gilded Imperial Plate Armor
      const torsoGroup = new THREE.Group();
      torsoGroup.name = 'unit_torso';
      torsoGroup.position.y = 0.62;

      // Heavy Fluted Gothic Steel Cuirass
      const cuirass = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.9, 18), steelMat);
      torsoGroup.add(cuirass);

      // Gilded Royal Filigree Trims & Imperial Double Eagle Emblem
      const goldTrim = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.35, 0.12, 18), goldMat);
      goldTrim.position.y = 0.1;
      torsoGroup.add(goldTrim);

      const chestEmblem = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), goldMat);
      chestEmblem.position.set(0, 0.24, 0.32);
      torsoGroup.add(chestEmblem);

      // Sculpted Lion-Head Pauldrons with Gold Crests
      const lPauldron = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.26, 0.28), goldMat);
      lPauldron.position.set(-0.36, 0.34, 0);
      torsoGroup.add(lPauldron);

      const rPauldron = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.26, 0.28), goldMat);
      rPauldron.position.set(0.36, 0.34, 0);
      torsoGroup.add(rPauldron);

      // Visored Frogmouth Helm with Horned / Winged Royal Crest
      const helm = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.48, 18), steelMat);
      helm.position.y = 0.64;
      torsoGroup.add(helm);

      const hornL = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.35, 10), goldMat);
      hornL.position.set(-0.2, 0.8, -0.05);
      hornL.rotation.set(-Math.PI / 8, 0, -Math.PI / 4);
      torsoGroup.add(hornL);

      const hornR = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.35, 10), goldMat);
      hornR.position.set(0.2, 0.8, -0.05);
      hornR.rotation.set(-Math.PI / 8, 0, Math.PI / 4);
      torsoGroup.add(hornR);

      // Flowing Imperial Cape in Faction Colors
      const cape = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.92, 0.07), teamClothMat);
      cape.position.set(0, 0.05, -0.34);
      cape.rotation.x = Math.PI / 16;
      torsoGroup.add(cape);

      root.add(torsoGroup);

      // 2. Heavy Swiss Halberd / Crescent Poleaxe
      const halberdPivot = new THREE.Group();
      halberdPivot.name = 'halberd_pivot';
      halberdPivot.position.set(0.38, 0.95, 0.18);

      const halberdShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.7, 14), darkIronMat);
      halberdShaft.position.set(0, 0.65, 0);
      halberdPivot.add(halberdShaft);

      const axeBlade = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.58, 0.44), goldMat);
      axeBlade.position.set(0, 1.68, 0.14);
      halberdPivot.add(axeBlade);

      const topSpike = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.48, 12), steelMat);
      topSpike.position.set(0, 2.12, 0);
      halberdPivot.add(topSpike);

      root.add(halberdPivot);

      // Articulated Steel Plate Greaves
      root.add(createArticulatedLeg(steelMat, -0.13, 'left_leg', 0.42, true));
      root.add(createArticulatedLeg(steelMat, 0.13, 'right_leg', 0.42, true));
      break;
    }

    case 'dragon': {
      // 1. Dragon Torso (Muscular Reptilian Anatomy)
      const torso = new THREE.Mesh(new THREE.ConeGeometry(0.68, 2.1, 14), dragonScalesMat);
      torso.name = 'dragon_torso';
      torso.rotation.x = Math.PI / 2.2;
      torso.position.set(0, 0, 0);
      root.add(torso);

      // Underbelly Plate Scales
      const belly = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.55, 1.5, 14), dragonBellyMat);
      belly.position.set(0, -0.2, 0.1);
      belly.rotation.x = Math.PI / 2.2;
      root.add(belly);

      // Dorsal Armor Spine Ridges running down the back
      for (let s = 0; s < 6; s++) {
        const spine = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.38, 10), boneMat);
        spine.position.set(0, 0.42 - s * 0.05, 0.65 - s * 0.35);
        spine.rotation.x = -Math.PI / 8;
        root.add(spine);
      }

      // 2. Muscular Articulated Neck
      const neckGroup = new THREE.Group();
      neckGroup.name = 'dragon_neck';
      neckGroup.position.set(0, 0.15, 0.95);

      const neckMesh = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.2, 12), dragonScalesMat);
      neckMesh.position.set(0, 0.35, 0.45);
      neckMesh.rotation.x = -Math.PI / 3.8;
      neckGroup.add(neckMesh);

      // 3. Fierce Sculpted Dragon Head with Horns & Fangs
      const headGroup = new THREE.Group();
      headGroup.position.set(0, 0.75, 0.85);

      const cranium = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.9, 12), dragonScalesMat);
      cranium.position.set(0, 0, 0.35);
      cranium.rotation.x = Math.PI / 2.3;
      headGroup.add(cranium);

      // Articulated Lower Jaw
      const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.65), dragonScalesMat);
      jaw.name = 'dragon_jaw';
      jaw.position.set(0, -0.15, 0.35);
      headGroup.add(jaw);

      // Flame Emitter Anchor for Fire Breath Visuals
      const flameEmitter = new THREE.Group();
      flameEmitter.name = 'flame_emitter';
      flameEmitter.position.set(0, -0.05, 0.72);
      headGroup.add(flameEmitter);

      // Swept-back Horns
      const hornGeom = new THREE.ConeGeometry(0.08, 0.7, 10);
      const leftHorn = new THREE.Mesh(hornGeom, boneMat);
      leftHorn.position.set(-0.2, 0.25, 0.05);
      leftHorn.rotation.set(-Math.PI / 3.5, 0, -Math.PI / 7);
      headGroup.add(leftHorn);

      const rightHorn = new THREE.Mesh(hornGeom, boneMat);
      rightHorn.position.set(0.2, 0.25, 0.05);
      rightHorn.rotation.set(-Math.PI / 3.5, 0, Math.PI / 7);
      headGroup.add(rightHorn);

      // Glowing Fire Eyes
      const eyeGeom = new THREE.SphereGeometry(0.08, 8, 8);
      const leftEye = new THREE.Mesh(eyeGeom, fireGlowMat);
      leftEye.position.set(-0.17, 0.16, 0.28);
      headGroup.add(leftEye);

      const rightEye = new THREE.Mesh(eyeGeom, fireGlowMat);
      rightEye.position.set(0.17, 0.16, 0.28);
      headGroup.add(rightEye);

      neckGroup.add(headGroup);
      root.add(neckGroup);

      // 4. Long Serpentine Tail with Stinger Barb
      const tailGroup = new THREE.Group();
      tailGroup.name = 'dragon_tail';
      tailGroup.position.set(0, -0.1, -1.0);

      const tail1 = new THREE.Mesh(new THREE.ConeGeometry(0.36, 1.6, 12), dragonScalesMat);
      tail1.position.set(0, 0, -0.7);
      tail1.rotation.x = -Math.PI / 2.05;
      tailGroup.add(tail1);

      const tail2 = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.4, 12), dragonScalesMat);
      tail2.position.set(0, 0.1, -2.0);
      tail2.rotation.x = -Math.PI / 2.15;
      tailGroup.add(tail2);

      const tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.48, 0.65), boneMat);
      tailFin.position.set(0, 0.22, -2.7);
      tailFin.rotation.x = -Math.PI / 5;
      tailGroup.add(tailFin);

      root.add(tailGroup);

      // 5. Claws & Talons
      const talonGeom = new THREE.ConeGeometry(0.065, 0.38, 10);
      const claws = [
        [-0.38, -0.42, 0.42], [0.38, -0.42, 0.42],
        [-0.38, -0.38, -0.62], [0.38, -0.38, -0.62]
      ];
      claws.forEach(([cx, cy, cz]) => {
        const claw = new THREE.Mesh(talonGeom, boneMat);
        claw.position.set(cx, cy, cz);
        claw.rotation.x = Math.PI / 3;
        root.add(claw);
      });

      // 6. Magnificent Articulated Wings with Double-Sided Aerodynamic Membrane
      const leftWing = new THREE.Group();
      leftWing.name = 'left_wing';
      leftWing.position.set(-0.45, 0.25, 0.35);

      const armBone1 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.5, 12), boneMat);
      armBone1.position.set(-0.65, 0.2, 0);
      armBone1.rotation.z = Math.PI / 2.4;
      leftWing.add(armBone1);

      const armBone2 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.6, 12), boneMat);
      armBone2.position.set(-1.8, 0.35, -0.2);
      armBone2.rotation.z = Math.PI / 2.8;
      leftWing.add(armBone2);

      const leftMembraneShape = new THREE.BufferGeometry();
      const leftVertices = new Float32Array([
        0, 0, 0,
        -1.3, 0.3, 0.1,
        -1.4, -0.2, -1.2,

        -1.3, 0.3, 0.1,
        -2.5, 0.4, -0.3,
        -2.0, -0.2, -1.6,

        -1.3, 0.3, 0.1,
        -2.0, -0.2, -1.6,
        -1.4, -0.2, -1.2,

        0, 0, 0,
        -1.4, -0.2, -1.2,
        -0.4, -0.25, -1.2
      ]);
      leftMembraneShape.setAttribute('position', new THREE.BufferAttribute(leftVertices, 3));
      leftMembraneShape.computeVertexNormals();
      const leftMembrane = new THREE.Mesh(leftMembraneShape, wingMat);
      leftWing.add(leftMembrane);
      root.add(leftWing);

      const rightWing = new THREE.Group();
      rightWing.name = 'right_wing';
      rightWing.position.set(0.45, 0.25, 0.35);

      const rArmBone1 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.5, 12), boneMat);
      rArmBone1.position.set(0.65, 0.2, 0);
      rArmBone1.rotation.z = -Math.PI / 2.4;
      rightWing.add(rArmBone1);

      const rArmBone2 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.6, 12), boneMat);
      rArmBone2.position.set(1.8, 0.35, -0.2);
      rArmBone2.rotation.z = -Math.PI / 2.8;
      rightWing.add(rArmBone2);

      const rightMembraneShape = new THREE.BufferGeometry();
      const rightVertices = new Float32Array([
        0, 0, 0,
        1.3, 0.3, 0.1,
        1.4, -0.2, -1.2,

        1.3, 0.3, 0.1,
        2.5, 0.4, -0.3,
        2.0, -0.2, -1.6,

        1.3, 0.3, 0.1,
        2.0, -0.2, -1.6,
        1.4, -0.2, -1.2,

        0, 0, 0,
        1.4, -0.2, -1.2,
        0.4, -0.25, -1.2
      ]);
      rightMembraneShape.setAttribute('position', new THREE.BufferAttribute(rightVertices, 3));
      rightMembraneShape.computeVertexNormals();
      const rightMembrane = new THREE.Mesh(rightMembraneShape, wingMat);
      rightWing.add(rightMembrane);
      root.add(rightWing);
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
      const mule = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.85, 14), horseCoatMat);
      mule.name = 'horse_body';
      mule.position.set(0, 0.48, 1.1);
      mule.rotation.x = Math.PI / 2;

      const muleNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.45, 12), horseCoatMat);
      muleNeck.name = 'horse_neck';
      muleNeck.position.set(0, 0.25, 0.38);
      muleNeck.rotation.x = -Math.PI / 5;
      mule.add(muleNeck);

      const muleHead = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.35, 12), horseCoatMat);
      muleHead.position.set(0, 0.45, 0.55);
      muleHead.rotation.x = Math.PI / 4;
      mule.add(muleHead);

      // Long Donkey Ears
      const dEarL = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.18, 8), horseCoatMat);
      dEarL.position.set(-0.08, 0.6, 0.48);
      dEarL.rotation.set(-Math.PI / 6, 0, -Math.PI / 8);
      mule.add(dEarL);

      const dEarR = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.18, 8), horseCoatMat);
      dEarR.position.set(0.08, 0.6, 0.48);
      dEarR.rotation.set(-Math.PI / 6, 0, Math.PI / 8);
      mule.add(dEarR);

      mule.add(createHorseLeg(horseCoatMat, -0.14, 0.28, 'horse_leg_fl', 0.46));
      mule.add(createHorseLeg(horseCoatMat, 0.14, 0.28, 'horse_leg_fr', 0.46));
      mule.add(createHorseLeg(horseCoatMat, -0.14, -0.28, 'horse_leg_bl', 0.46));
      mule.add(createHorseLeg(horseCoatMat, 0.14, -0.28, 'horse_leg_br', 0.46));

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
