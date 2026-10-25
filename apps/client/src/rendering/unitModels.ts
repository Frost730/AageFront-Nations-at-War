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

  // Archer & Royal Guard reference-accurate materials (Units & Character Models reference)
  const archerGreenTunicMat = new THREE.MeshStandardMaterial({
    color: 0x3d6628, // Quilted forest-green doublet / gambeson (Silent Quill)
    roughness: 0.82,
    metalness: 0.05,
    flatShading: false
  });
  const archerBrownLeatherMat = new THREE.MeshStandardMaterial({
    color: 0x6e4526, // Hardened leather pauldron, bracers, and back quiver
    roughness: 0.72,
    metalness: 0.08,
    flatShading: false
  });
  const archerHairBlondeMat = new THREE.MeshStandardMaterial({
    color: 0xba9667, // Elven hair
    roughness: 0.82,
    flatShading: false
  });
  const crimsonVelvetMat = new THREE.MeshStandardMaterial({
    color: 0x881337, // Royal crimson velvet cloak, arming skirt, and shield field
    roughness: 0.84,
    metalness: 0.04,
    flatShading: false
  });
  const crimsonPlumeMat = new THREE.MeshStandardMaterial({
    color: 0x991b1b, // Helmet comb horsehair plumage
    roughness: 0.65,
    metalness: 0.08,
    flatShading: false
  });
  const fletchGoldMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.6 });
  const fletchGreenMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.6 });
  const fletchRedMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.6 });

  // Heavy Lancer & Pathfinder Scout reference-accurate materials (Nanite 3D Asset Library)
  const chainmailMat = new THREE.MeshStandardMaterial({
    color: 0x64748b, // Interlocking steel mail rings (crinet, fringe)
    roughness: 0.55,
    metalness: 0.75,
    flatShading: true
  });
  const darkGothicSteelMat = new THREE.MeshStandardMaterial({
    color: 0x475569, // Burnished gothic plate armor & rivets
    roughness: 0.42,
    metalness: 0.88,
    flatShading: false
  });
  const elvenSilverMat = new THREE.MeshStandardMaterial({
    color: 0xd6e0ea, // Filigreed elven silver chanfron & peytral
    roughness: 0.32,
    metalness: 0.92,
    flatShading: false
  });
  const pathfinderGreenHoodMat = new THREE.MeshStandardMaterial({
    color: 0x274320, // Deep forest-green ranger hood / cowl (Silent Quill)
    roughness: 0.85,
    metalness: 0.04,
    flatShading: false
  });
  const saddleLeatherMat = new THREE.MeshStandardMaterial({
    color: 0x4a2a16, // Stitched saddle leather
    roughness: 0.65,
    metalness: 0.12,
    flatShading: false
  });
  const bedrollCanvasMat = new THREE.MeshStandardMaterial({
    color: 0xb5a88e, // Rolled scout canvas bedroll & ration baggage
    roughness: 0.92,
    metalness: 0.02,
    flatShading: false
  });

  // Dragon materials (Faithfully matching user photo reference)
  const dragonRedScalesMat = new THREE.MeshStandardMaterial({
    color: 0x941b1b, // Deep royal volcanic crimson/ruby
    roughness: 0.52,
    metalness: 0.15,
    flatShading: true
  });
  const dragonBellyCreamMat = new THREE.MeshStandardMaterial({
    color: 0xd8c89d, // Chiseled warm ivory / burnished bone ventral plates
    roughness: 0.55,
    metalness: 0.08,
    flatShading: true
  });
  const dragonObsidianMat = new THREE.MeshStandardMaterial({
    color: 0x1c1a20, // Polished dark obsidian/onyx horns, claws, dorsal spikes
    roughness: 0.32,
    metalness: 0.25,
    flatShading: true
  });
  const dragonCrestAmberMat = new THREE.MeshStandardMaterial({
    color: 0xb45309, // Dark amber-bronze brow crest
    roughness: 0.38,
    metalness: 0.2,
    flatShading: true
  });
  const dragonEyeMat = new THREE.MeshBasicMaterial({
    color: 0xffb703 // Molten burning amber-gold predatory eyes
  });
  const dragonWingRedMat = new THREE.MeshStandardMaterial({
    color: 0x821818, // Deep crimson dorsal wing membrane & spars
    roughness: 0.65,
    side: THREE.DoubleSide,
    flatShading: true
  });
  const dragonWingCreamMat = new THREE.MeshStandardMaterial({
    color: 0xb53d2d, // Rich ember-terracotta undertone membrane
    roughness: 0.7,
    side: THREE.DoubleSide,
    flatShading: true
  });
  const dragonTeamGlowMat = new THREE.MeshStandardMaterial({
    color: teamCol,
    roughness: 0.2,
    metalness: 0.8,
    emissive: teamCol.clone().multiplyScalar(0.7),
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
    length: number = 0.55,
    armorMat?: THREE.Material
  ): THREE.Group => {
    const legGroup = new THREE.Group();
    legGroup.name = name;
    legGroup.position.set(x, -0.12, z);

    // Muscular Upper Thigh / Gaskin
    const thighGeom = new THREE.CylinderGeometry(0.085, 0.062, length * 0.5, 12);
    thighGeom.translate(0, -length * 0.25, 0);
    const thigh = new THREE.Mesh(thighGeom, mat);
    thigh.castShadow = true;
    legGroup.add(thigh);

    // Hock / Knee Joint
    const hockGeom = new THREE.SphereGeometry(0.055, 8, 8);
    const hock = new THREE.Mesh(hockGeom, mat);
    hock.position.set(0, -length * 0.5, -0.012);
    legGroup.add(hock);

    // Armor poleyn / cop if heavy plate
    if (armorMat) {
      const cop = new THREE.Mesh(new THREE.SphereGeometry(0.058, 8, 8), armorMat);
      cop.position.set(0, -length * 0.5, 0.01);
      cop.scale.set(1.1, 0.9, 0.8);
      legGroup.add(cop);
      const rivet = new THREE.Mesh(new THREE.DodecahedronGeometry(0.018, 0), goldMat);
      rivet.position.set(0, -length * 0.5, 0.05);
      legGroup.add(rivet);
    }

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

    const ironShoe = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.02, 0.09), steelMat);
    ironShoe.position.set(0, -length - 0.045, 0.012);
    legGroup.add(ironShoe);

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
    bardingType: 'heavy_plate' | 'scout_elven' | 'none' | boolean = 'none',
    bardingMat?: THREE.Material
  ): THREE.Group => {
    const isHeavyPlate = bardingType === 'heavy_plate' || bardingType === true;
    const isScoutElven = bardingType === 'scout_elven';

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

    // Tail (braided/tied for heavy destrier, flowing for courser)
    if (isHeavyPlate) {
      const tailCup = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.14, 10), steelMat);
      tailCup.position.set(0, -0.01, -0.68);
      tailCup.rotation.x = -Math.PI / 5;
      horseRoot.add(tailCup);

      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.5, 8), maneMat);
      tail.position.set(0, -0.16, -0.74);
      tail.rotation.x = -Math.PI / 8;
      horseRoot.add(tail);
    } else {
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.58, 8), maneMat);
      tail.position.set(0, -0.04, -0.72);
      tail.rotation.x = -Math.PI / 7;
      horseRoot.add(tail);
    }

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

    // Neck Barding: Crinet
    if (isHeavyPlate) {
      // Articulated Gothic Steel Crinet plates protecting top of neck
      const crinet = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.44, 0.22), steelMat);
      crinet.position.set(0, 0.26, -0.01);
      crinet.rotation.x = Math.PI / 5;
      neckGroup.add(crinet);

      const crinetSpines = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.46, 0.26), goldMat);
      crinetSpines.position.set(0, 0.28, -0.01);
      crinetSpines.rotation.x = Math.PI / 5;
      neckGroup.add(crinetSpines);
    } else if (isScoutElven) {
      // Chainmail crinet wrap protecting neck
      const mailGeom = new THREE.CylinderGeometry(0.16, 0.24, 0.48, 12);
      mailGeom.translate(0, 0.23, 0);
      mailGeom.rotateX(Math.PI / 5);
      const mailCrinet = new THREE.Mesh(mailGeom, chainmailMat);
      neckGroup.add(mailCrinet);
    }

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

    // Chamfron Armor
    if (isHeavyPlate) {
      // Full Gothic Steel Chamfron (Reference: Heavy Lancer)
      const chamfron = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.24, 0.2), steelMat);
      chamfron.position.set(0, 0.03, 0.08);
      headGroup.add(chamfron);

      // Cheek flanges
      const cheekL = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.14, 0.18), steelMat);
      cheekL.position.set(-0.1, -0.02, 0.08);
      headGroup.add(cheekL);
      const cheekR = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.14, 0.18), steelMat);
      cheekR.position.set(0.1, -0.02, 0.08);
      headGroup.add(cheekR);

      // Central pointed forehead spike
      const chanfronSpike = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.22, 8), darkGothicSteelMat);
      chanfronSpike.position.set(0, 0.16, 0.18);
      chanfronSpike.rotation.x = Math.PI / 3.4;
      headGroup.add(chanfronSpike);

      const chanfronBoss = new THREE.Mesh(new THREE.DodecahedronGeometry(0.04, 0), goldMat);
      chanfronBoss.position.set(0, 0.08, 0.19);
      headGroup.add(chanfronBoss);
    } else if (isScoutElven) {
      // Elegant Elven Silver Chamfron with wing/feather brow plate (Reference: Pathfinder Scout)
      const elvenBrow = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.14), elvenSilverMat);
      elvenBrow.position.set(0, 0.08, 0.06);
      headGroup.add(elvenBrow);

      const elvenNoseBridge = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.22, 6), elvenSilverMat);
      elvenNoseBridge.position.set(0, -0.04, 0.16);
      elvenNoseBridge.rotation.x = Math.PI / 3;
      headGroup.add(elvenNoseBridge);

      const elvenCrest = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.12, 4), elvenSilverMat);
      elvenCrest.position.set(0, 0.16, 0.05);
      elvenCrest.rotation.x = -Math.PI / 6;
      headGroup.add(elvenCrest);
    }

    neckGroup.add(headGroup);
    horseRoot.add(neckGroup);

    // Torso Barding & Saddle Systems
    if (isHeavyPlate) {
      // 1. Peytral (Chest Armor with flared scalloped edges)
      const peytral = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.36, 0.32), steelMat);
      peytral.position.set(0, 0.02, 0.38);
      horseRoot.add(peytral);

      const peytralBossL = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), goldMat);
      peytralBossL.position.set(-0.18, 0.04, 0.54);
      horseRoot.add(peytralBossL);
      const peytralBossR = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), goldMat);
      peytralBossR.position.set(0.18, 0.04, 0.54);
      horseRoot.add(peytralBossR);

      // 2. Flanchards & Crupper (Flank & Rump steel armor)
      const crupper = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.38, 0.62), steelMat);
      crupper.position.set(0, 0.02, -0.36);
      horseRoot.add(crupper);

      // Draped heraldic caparison underneath plates
      const caparison = new THREE.Mesh(new THREE.BoxGeometry(0.60, 0.44, 0.98), bardingMat || teamMat);
      caparison.position.set(0, -0.08, -0.08);
      horseRoot.add(caparison);

      const goldFringe = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.04, 1.0), goldMat);
      goldFringe.position.set(0, -0.30, -0.08);
      horseRoot.add(goldFringe);

      // Gothic War Saddle (High pommel, deep seat, high flared cantle)
      const saddlePommel = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.08), steelMat);
      saddlePommel.position.set(0, 0.28, 0.12);
      horseRoot.add(saddlePommel);

      const saddleSeat = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.36), saddleLeatherMat);
      saddleSeat.position.set(0, 0.22, -0.06);
      horseRoot.add(saddleSeat);

      const saddleCantle = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.18, 0.08), steelMat);
      saddleCantle.position.set(0, 0.30, -0.24);
      horseRoot.add(saddleCantle);
    } else if (isScoutElven) {
      // 1. Scalloped Silver Peytral across chest
      const elvenPeytral = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.22, 0.26), elvenSilverMat);
      elvenPeytral.position.set(0, 0.04, 0.36);
      horseRoot.add(elvenPeytral);

      // Chainmail fringe hanging under chest
      const mailFringe = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.16, 0.22), chainmailMat);
      mailFringe.position.set(0, -0.12, 0.34);
      horseRoot.add(mailFringe);

      // Saddle Pad with team color border
      const saddlePad = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.12, 0.58), bardingMat || teamMat);
      saddlePad.position.set(0, 0.14, -0.06);
      horseRoot.add(saddlePad);

      // Scout Stitched Leather Saddle
      const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.38), saddleLeatherMat);
      saddle.position.set(0, 0.22, -0.06);
      horseRoot.add(saddle);

      // Rolled Explorer Bedroll / Blanket strapped behind cantle (Reference Detail!)
      const bedrollGeom = new THREE.CylinderGeometry(0.09, 0.09, 0.44, 12);
      bedrollGeom.rotateZ(Math.PI / 2);
      const bedroll = new THREE.Mesh(bedrollGeom, bedrollCanvasMat);
      bedroll.position.set(0, 0.28, -0.28);
      horseRoot.add(bedroll);

      // Twin leather buckled cinch straps around bedroll
      const strapL = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.025, 12), archerBrownLeatherMat);
      strapL.rotateZ(Math.PI / 2);
      strapL.position.set(-0.14, 0.28, -0.28);
      horseRoot.add(strapL);

      const strapR = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.025, 12), archerBrownLeatherMat);
      strapR.rotateZ(Math.PI / 2);
      strapR.position.set(0.14, 0.28, -0.28);
      horseRoot.add(strapR);

      // Explorer Saddlebags / Ration Packs flanking hindquarters
      const bagL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.22), archerBrownLeatherMat);
      bagL.position.set(-0.24, 0.08, -0.28);
      bagL.rotation.z = 0.15;
      horseRoot.add(bagL);

      const bagR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.22), archerBrownLeatherMat);
      bagR.position.set(0.24, 0.08, -0.28);
      bagR.rotation.z = -0.15;
      horseRoot.add(bagR);
    } else {
      // Default / Unarmored saddle
      const saddlePad = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.18, 0.58), teamMat);
      saddlePad.position.set(0, 0.1, -0.06);
      horseRoot.add(saddlePad);

      const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.1, 0.42), darkLeatherMat);
      saddle.position.set(0, 0.2, -0.06);
      horseRoot.add(saddle);
    }

    // 4 Articulated Muscular Legs with optional knee armor
    const legArmor = isHeavyPlate ? steelMat : undefined;
    horseRoot.add(createHorseLeg(coatMat, -0.18, 0.32, 'horse_leg_fl', 0.55, legArmor));
    horseRoot.add(createHorseLeg(coatMat, 0.18, 0.32, 'horse_leg_fr', 0.55, legArmor));
    horseRoot.add(createHorseLeg(coatMat, -0.18, -0.36, 'horse_leg_bl', 0.55, legArmor));
    horseRoot.add(createHorseLeg(coatMat, 0.18, -0.36, 'horse_leg_br', 0.55, legArmor));

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
      // 1. Sleek Agile Elven Courser with Silver Chamfron, Mail Crinet, Bedroll & Saddlebags (Reference: Silent Quill)
      root.add(createArticulatedHorse(horseCoatMat, darkLeatherMat, 'scout_elven', teamMat));

      // 2. Elven Pathfinder Scout Rider (Silent Quill Unit - Exact to Reference Photo!)
      const riderGroup = new THREE.Group();
      riderGroup.position.set(0, 0.78, -0.06);

      // Quilted Forest-Green Gambeson Doublet (diamond-quilted elven tunic)
      const riderTorso = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.28, 0.18), archerGreenTunicMat);
      riderTorso.position.y = 0.14;
      riderGroup.add(riderTorso);

      // Hardened Boiled Leather Jerkin Vest over chest
      const leatherVest = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.24, 0.19), archerBrownLeatherMat);
      leatherVest.position.y = 0.15;
      riderGroup.add(leatherVest);

      // Diagonal Leather Baldric Strap across chest holding back quiver
      const baldric = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.32, 0.21), archerBrownLeatherMat);
      baldric.position.set(0, 0.15, 0);
      baldric.rotation.z = -Math.PI / 6;
      riderGroup.add(baldric);

      const baldricBuckle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.22), goldMat);
      baldricBuckle.position.set(-0.04, 0.17, 0);
      riderGroup.add(baldricBuckle);

      // Wide Explorer Belt with Brass Buckle
      const riderBelt = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.05, 12), archerBrownLeatherMat);
      riderBelt.position.y = 0.02;
      riderGroup.add(riderBelt);

      const beltBuckle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.03), goldMat);
      beltBuckle.position.set(0, 0.02, 0.15);
      riderGroup.add(beltBuckle);

      // Modular Gear Pouches (Reference: Modular Attachment Points - baggage, rations, map case)
      // Left hip: sheathed hunting dagger with brass pommel
      const daggerSheath = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.04), archerBrownLeatherMat);
      daggerSheath.position.set(-0.16, 0.02, 0.02);
      daggerSheath.rotation.z = 0.2;
      riderGroup.add(daggerSheath);

      const daggerHilt = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.08, 6), goldMat);
      daggerHilt.position.set(-0.18, 0.15, 0.02);
      daggerHilt.rotation.z = 0.2;
      riderGroup.add(daggerHilt);

      // Right hip: rolled map case & scout pouch
      const mapCase = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.24, 8), darkLeatherMat);
      mapCase.position.set(0.16, 0.04, 0.02);
      mapCase.rotation.z = -0.25;
      riderGroup.add(mapCase);

      const gearPouch = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.09, 0.07), archerBrownLeatherMat);
      gearPouch.position.set(0.14, 0.01, -0.06);
      riderGroup.add(gearPouch);

      // Studded Leather Pauldrons
      const lPauldron = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), archerBrownLeatherMat);
      lPauldron.position.set(-0.16, 0.24, 0);
      lPauldron.scale.set(1.1, 0.9, 0.9);
      riderGroup.add(lPauldron);

      const rPauldron = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), archerBrownLeatherMat);
      rPauldron.position.set(0.16, 0.24, 0);
      rPauldron.scale.set(1.1, 0.9, 0.9);
      riderGroup.add(rPauldron);

      // Arms & Bracers: Left arm holding elven bow & reins, right arm holding spear
      const lArm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.24, 8), archerGreenTunicMat);
      lArm.position.set(-0.16, 0.14, 0.08);
      lArm.rotation.set(-Math.PI / 4, 0, -Math.PI / 10);
      riderGroup.add(lArm);

      const lBracer = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.038, 0.12, 8), archerBrownLeatherMat);
      lBracer.position.set(-0.16, 0.09, 0.12);
      lBracer.rotation.set(-Math.PI / 4, 0, -Math.PI / 10);
      riderGroup.add(lBracer);

      const rArm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.24, 8), archerGreenTunicMat);
      rArm.position.set(0.16, 0.14, 0.02);
      rArm.rotation.set(Math.PI / 10, 0, Math.PI / 10);
      riderGroup.add(rArm);

      const rBracer = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.038, 0.12, 8), archerBrownLeatherMat);
      rBracer.position.set(0.16, 0.08, 0.02);
      rBracer.rotation.set(Math.PI / 10, 0, Math.PI / 10);
      riderGroup.add(rBracer);

      // Reins from horse bit to left hand
      const reinsL = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.45), darkLeatherMat);
      reinsL.position.set(-0.08, 0.18, 0.35);
      reinsL.rotation.set(-Math.PI / 6, -0.15, 0);
      riderGroup.add(reinsL);

      // Recurve Elven Composite Bow held in left hand
      const bowGroup = new THREE.Group();
      bowGroup.position.set(-0.20, 0.14, 0.20);
      bowGroup.rotation.set(-0.2, 0.3, -0.1);

      const upperLimb = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.025, 0.46, 8), woodMat);
      upperLimb.position.set(0, 0.2, 0.04);
      upperLimb.rotation.x = -Math.PI / 8;
      bowGroup.add(upperLimb);

      const upperRecurve = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.015, 0.14, 8), goldMat);
      upperRecurve.position.set(0, 0.44, -0.01);
      upperRecurve.rotation.x = Math.PI / 6;
      bowGroup.add(upperRecurve);

      const lowerLimb = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.015, 0.46, 8), woodMat);
      lowerLimb.position.set(0, -0.2, 0.04);
      lowerLimb.rotation.x = Math.PI / 8;
      bowGroup.add(lowerLimb);

      const lowerRecurve = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.01, 0.14, 8), goldMat);
      lowerRecurve.position.set(0, -0.44, -0.01);
      lowerRecurve.rotation.x = -Math.PI / 6;
      bowGroup.add(lowerRecurve);

      const bowString = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.94, 4), canvasMat);
      bowString.position.set(0, 0, -0.04);
      bowGroup.add(bowString);
      riderGroup.add(bowGroup);

      // Back-Mounted Quiver with 5 Tricolor Arrows (Reference: Silent Quill Quiver)
      const quiverGroup = new THREE.Group();
      quiverGroup.position.set(0.08, 0.22, -0.12);
      quiverGroup.rotation.set(-0.25, 0, -0.35);

      const quiverBody = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.05, 0.55, 10), archerBrownLeatherMat);
      quiverGroup.add(quiverBody);

      // 5 Fletched Arrows peeking over the shoulder
      const arrowOffsets = [
        { x: -0.02, z: -0.02, mat: fletchGoldMat },
        { x: 0.02, z: -0.02, mat: fletchGreenMat },
        { x: -0.03, z: 0.02, mat: fletchRedMat },
        { x: 0.03, z: 0.02, mat: fletchGoldMat },
        { x: 0.0, z: 0.0, mat: fletchGreenMat }
      ];
      arrowOffsets.forEach((arr) => {
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.42, 6), woodMat);
        shaft.position.set(arr.x, 0.32, arr.z);
        quiverGroup.add(shaft);

        const fletching = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.12, 0.015), arr.mat);
        fletching.position.set(arr.x, 0.46, arr.z);
        quiverGroup.add(fletching);
      });
      riderGroup.add(quiverGroup);

      // Rider Legs in Stirrups
      const rLegL = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.045, 0.36, 8), darkGothicSteelMat);
      rLegL.position.set(-0.21, -0.05, 0.06);
      rLegL.rotation.set(Math.PI / 7, 0, Math.PI / 12);
      riderGroup.add(rLegL);

      const bootL = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.042, 0.2, 8), archerBrownLeatherMat);
      bootL.position.set(-0.23, -0.15, 0.11);
      bootL.rotation.set(Math.PI / 7, 0, Math.PI / 12);
      riderGroup.add(bootL);

      const rLegR = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.045, 0.36, 8), darkGothicSteelMat);
      rLegR.position.set(0.21, -0.05, 0.06);
      rLegR.rotation.set(Math.PI / 7, 0, -Math.PI / 12);
      riderGroup.add(rLegR);

      const bootR = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.042, 0.2, 8), archerBrownLeatherMat);
      bootR.position.set(0.23, -0.15, 0.11);
      bootR.rotation.set(Math.PI / 7, 0, -Math.PI / 12);
      riderGroup.add(bootR);

      // Head with Elven Features & Ranger Hood Cowl (Reference Accurate)
      const riderHead = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), fleshMat);
      riderHead.position.set(0, 0.36, 0.02);
      riderGroup.add(riderHead);

      // Pointed Elven Ears
      const earLMesh = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.11, 4), fleshMat);
      earLMesh.position.set(-0.11, 0.38, 0);
      earLMesh.rotation.set(0.2, 0, -Math.PI / 3);
      riderGroup.add(earLMesh);

      const earRMesh = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.11, 4), fleshMat);
      earRMesh.position.set(0.11, 0.38, 0);
      earRMesh.rotation.set(0.2, 0, Math.PI / 3);
      riderGroup.add(earRMesh);

      // Deep Forest-Green Ranger Hood pulled over brow
      const hood = new THREE.Mesh(new THREE.SphereGeometry(0.135, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.75), pathfinderGreenHoodMat);
      hood.position.set(0, 0.38, 0);
      riderGroup.add(hood);

      const hoodPeak = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.18, 6), pathfinderGreenHoodMat);
      hoodPeak.position.set(0, 0.44, -0.11);
      hoodPeak.rotation.x = -Math.PI / 3.5;
      riderGroup.add(hoodPeak);

      const hoodMantle = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.12, 10), pathfinderGreenHoodMat);
      hoodMantle.position.set(0, 0.27, 0);
      riderGroup.add(hoodMantle);

      root.add(riderGroup);

      // 3. Recon Scout Spear / Light Lance on Lance Pivot (Points forward along +Z!)
      const lancePivot = new THREE.Group();
      lancePivot.name = 'lance_pivot';
      lancePivot.position.set(0.24, 0.88, 0.1);
      lancePivot.rotation.x = -0.32; // Default rest angle pointing forward-up

      const spearGeom = new THREE.CylinderGeometry(0.022, 0.022, 2.1, 10);
      spearGeom.rotateX(Math.PI / 2);
      const spearShaft = new THREE.Mesh(spearGeom, woodMat);
      spearShaft.position.set(0, 0, 0.65);
      lancePivot.add(spearShaft);

      // Leaf-bladed elven spearhead
      const tipGeom = new THREE.ConeGeometry(0.048, 0.32, 6);
      tipGeom.rotateX(Math.PI / 2);
      const spearTip = new THREE.Mesh(tipGeom, elvenSilverMat);
      spearTip.position.set(0, 0, 1.76);
      lancePivot.add(spearTip);

      const pennon = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.16, 0.48), teamMat);
      pennon.position.set(0, -0.07, 1.45);
      lancePivot.add(pennon);

      root.add(lancePivot);
      break;
    }

    case 'basic_infantry': {
      // 1. Swordsman / Man-at-Arms in Gilded Cuirass & Crested Helm (Reference Accurate)
      const torsoGroup = new THREE.Group();
      torsoGroup.name = 'unit_torso';
      torsoGroup.position.y = 0.44;

      // Sculpted Anatomical Cuirass / Musculata
      const cuirassGeom = new THREE.BoxGeometry(0.3, 0.26, 0.2);
      const cuirass = new THREE.Mesh(cuirassGeom, steelMat);
      cuirass.position.y = 0.13;
      torsoGroup.add(cuirass);

      // Golden Pectoral Plate & Medial Ridge
      const chestRidge = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.04), goldMat);
      chestRidge.position.set(0, 0.13, 0.1);
      torsoGroup.add(chestRidge);

      // Pteruges Leather Armor Skirt strips (Reference Accurate: blue undergarment + gold-tipped strips)
      const skirtBase = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.12, 12), teamClothMat);
      skirtBase.position.y = -0.01;
      torsoGroup.add(skirtBase);

      for (let p = 0; p < 8; p++) {
        const angle = (p / 8) * Math.PI * 2;
        const strip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.13, 0.02), darkLeatherMat);
        strip.position.set(Math.cos(angle) * 0.16, -0.03, Math.sin(angle) * 0.16);
        strip.rotation.y = -angle;
        torsoGroup.add(strip);
      }

      // Golden Pauldrons (Shoulder Armor)
      const pauldronGeom = new THREE.SphereGeometry(0.08, 10, 8);
      const lPauldron = new THREE.Mesh(pauldronGeom, goldMat);
      lPauldron.position.set(-0.19, 0.19, 0);
      torsoGroup.add(lPauldron);

      const rPauldron = new THREE.Mesh(pauldronGeom, goldMat);
      rPauldron.position.set(0.19, 0.19, 0);
      torsoGroup.add(rPauldron);

      // Arms & Bracers
      const lArm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.26, 8), teamClothMat);
      lArm.position.set(-0.18, 0.09, 0);
      lArm.rotation.z = Math.PI / 10;
      torsoGroup.add(lArm);

      const rArm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.26, 8), teamClothMat);
      rArm.position.set(0.18, 0.09, 0);
      rArm.rotation.z = -Math.PI / 10;
      torsoGroup.add(rArm);

      // Head with Crested Helmet (Blue & Gold Plume - exact to reference!)
      const coif = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.08, 8), fleshMat);
      coif.position.y = 0.26;
      torsoGroup.add(coif);

      const helm = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.13, 0.18, 14), steelMat);
      helm.position.y = 0.37;
      torsoGroup.add(helm);

      const helmBrow = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.06), goldMat);
      helmBrow.position.set(0, 0.4, 0.12);
      torsoGroup.add(helmBrow);

      // Tall Arched Horsehair Crest Plume (Blue & White)
      const plumeArc = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.26, 0.24), teamMat);
      plumeArc.position.set(0, 0.54, 0.02);
      torsoGroup.add(plumeArc);

      const plumeTip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.26), canvasMat);
      plumeTip.position.set(0, 0.65, 0.02);
      torsoGroup.add(plumeTip);

      root.add(torsoGroup);

      // 2. Articulated Greaves & Sabatons
      root.add(createArticulatedLeg(goldMat, -0.1, 'left_leg', 0.42, true));
      root.add(createArticulatedLeg(goldMat, 0.1, 'right_leg', 0.42, true));

      // 3. Sword Pivot with Leaf-Bladed Arming Sword
      const swordPivot = new THREE.Group();
      swordPivot.name = 'sword_pivot';
      swordPivot.position.set(0.24, 0.48, 0.12);

      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.72, 0.1), steelMat);
      blade.position.set(0, 0.34, 0);
      swordPivot.add(blade);

      const fullerGroove = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.48, 0.02), darkIronMat);
      fullerGroove.position.set(0, 0.32, 0);
      swordPivot.add(fullerGroove);

      const swordTip = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 6), steelMat);
      swordTip.position.set(0, 0.76, 0);
      swordPivot.add(swordTip);

      const crossguard = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.26), goldMat);
      crossguard.position.set(0, 0.05, 0);
      swordPivot.add(crossguard);

      const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), goldMat);
      pommel.position.set(0, -0.1, 0);
      swordPivot.add(pommel);

      root.add(swordPivot);

      // 4. Shield Pivot with Round Aspis/Hoplon Shield (Reference Accurate)
      const shieldPivot = new THREE.Group();
      shieldPivot.name = 'shield_pivot';
      shieldPivot.position.set(-0.25, 0.48, 0.1);

      // Convex round shield
      const shieldFace = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.04, 18), teamMat);
      shieldFace.rotation.z = Math.PI / 2;
      shieldPivot.add(shieldFace);

      const shieldRim = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.02, 8, 20), goldMat);
      shieldRim.rotation.y = Math.PI / 2;
      shieldPivot.add(shieldRim);

      // Emblem on shield face (Golden sacred owl/sun emblem)
      const emblem = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), goldMat);
      emblem.position.set(-0.025, 0, 0);
      emblem.scale.set(0.4, 1.0, 1.0);
      shieldPivot.add(emblem);

      root.add(shieldPivot);
      break;
    }

    case 'spearman': {
      // 1. Spearman / Hoplite in Golden Musculata Cuirass (Reference Accurate)
      const torsoGroup = new THREE.Group();
      torsoGroup.name = 'unit_torso';
      torsoGroup.position.y = 0.44;

      const cuirassGeom = new THREE.BoxGeometry(0.28, 0.26, 0.18);
      const cuirass = new THREE.Mesh(cuirassGeom, goldMat);
      cuirass.position.y = 0.13;
      torsoGroup.add(cuirass);

      // Blue undertunic with pteruges skirt
      const skirtBase = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 0.12, 12), teamClothMat);
      skirtBase.position.y = -0.01;
      torsoGroup.add(skirtBase);

      for (let p = 0; p < 8; p++) {
        const angle = (p / 8) * Math.PI * 2;
        const strip = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.12, 0.02), darkLeatherMat);
        strip.position.set(Math.cos(angle) * 0.15, -0.03, Math.sin(angle) * 0.15);
        strip.rotation.y = -angle;
        torsoGroup.add(strip);
      }

      // Arms & Shoulders
      const lArm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.26, 8), teamClothMat);
      lArm.position.set(-0.18, 0.09, 0);
      lArm.rotation.z = Math.PI / 10;
      torsoGroup.add(lArm);

      const rArm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.26, 8), teamClothMat);
      rArm.position.set(0.18, 0.09, 0);
      rArm.rotation.z = -Math.PI / 10;
      torsoGroup.add(rArm);

      // Head & Corinthian Helmet with Transverse Crest
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), fleshMat);
      head.position.y = 0.34;
      torsoGroup.add(head);

      const helm = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.13, 0.18, 14), goldMat);
      helm.position.y = 0.37;
      torsoGroup.add(helm);

      const helmCrest = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.24, 0.26), teamMat);
      helmCrest.position.set(0, 0.52, 0.02);
      torsoGroup.add(helmCrest);

      root.add(torsoGroup);

      // 2. Stately 2.6m Ash Spear (Dory) with Leaf Tip & Gold Sauroter
      const pikePivot = new THREE.Group();
      pikePivot.name = 'pike_pivot';
      pikePivot.position.set(0.24, 0.52, 0.12);

      const pikeShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 2.6, 10), woodMat);
      pikeShaft.position.set(0, 0.78, 0);
      pikeShaft.rotation.x = Math.PI / 18;
      pikePivot.add(pikeShaft);

      const pikeBlade = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.42, 10), steelMat);
      pikeBlade.position.set(0, 2.12, 0.15);
      pikeBlade.rotation.x = Math.PI / 18;
      pikePivot.add(pikeBlade);

      const buttSpike = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.18, 8), goldMat);
      buttSpike.position.set(0, -0.52, -0.05);
      buttSpike.rotation.x = Math.PI + Math.PI / 18;
      pikePivot.add(buttSpike);

      root.add(pikePivot);

      // 3. Forearm Round Aspis Shield (Matching reference image)
      const buckler = new THREE.Group();
      buckler.name = 'left_arm';
      buckler.position.set(-0.25, 0.48, 0.08);

      const shieldDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.04, 16), teamMat);
      shieldDisc.rotation.z = Math.PI / 2;
      buckler.add(shieldDisc);

      const shieldRimRing = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.018, 8, 18), goldMat);
      shieldRimRing.rotation.y = Math.PI / 2;
      buckler.add(shieldRimRing);

      const shieldBoss = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.08, 10), goldMat);
      shieldBoss.position.set(-0.03, 0, 0);
      shieldBoss.rotation.z = Math.PI / 2;
      buckler.add(shieldBoss);

      root.add(buckler);

      // Articulated Legs with Bronze Greaves
      root.add(createArticulatedLeg(goldMat, -0.09, 'left_leg', 0.42, true));
      root.add(createArticulatedLeg(goldMat, 0.09, 'right_leg', 0.42, true));
      break;
    }

    case 'ranged_infantry': {
      // 1. Archer (Elven) in Quilted Forest-Green Gambeson & Leather Pauldron (Silent Quill reference)
      const torsoGroup = new THREE.Group();
      torsoGroup.name = 'unit_torso';
      torsoGroup.position.y = 0.44;

      // Quilted Forest-Green Gambeson / Doublet
      const gambeson = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.26, 0.18), archerGreenTunicMat);
      gambeson.position.y = 0.13;
      torsoGroup.add(gambeson);

      // Leather Chest Harness & Cross-straps
      const harness = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.05, 0.19), darkLeatherMat);
      harness.position.set(0, 0.17, 0);
      torsoGroup.add(harness);

      const diagonalStrap = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.28, 0.19), darkLeatherMat);
      diagonalStrap.position.set(0.02, 0.13, 0.01);
      diagonalStrap.rotation.z = Math.PI / 6;
      torsoGroup.add(diagonalStrap);

      // Molded Hardened Leather Pauldron on Left Shoulder with Gold Rivets (Pedestal A)
      const lPauldron = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 0.14, 8), archerBrownLeatherMat);
      lPauldron.position.set(-0.19, 0.22, 0);
      lPauldron.rotation.z = -Math.PI / 7;
      torsoGroup.add(lPauldron);

      const pauldronRivet = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 4), goldMat);
      pauldronRivet.position.set(-0.24, 0.24, 0);
      torsoGroup.add(pauldronRivet);

      // Quilted Gambeson Tunic Skirt over Thighs
      const tunicSkirt = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.16, 12), archerGreenTunicMat);
      tunicSkirt.position.y = -0.04;
      torsoGroup.add(tunicSkirt);

      // Leather Belt with Brass Buckle & Hip Pouch
      const belt = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.04, 0.19), darkLeatherMat);
      belt.position.y = 0.02;
      torsoGroup.add(belt);

      const hipPouch = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.07), archerBrownLeatherMat);
      hipPouch.position.set(0.15, -0.02, 0.04);
      torsoGroup.add(hipPouch);

      // Arms: Forest-Green Sleeves with Hardened Leather Bracers
      const lUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.15, 8), archerGreenTunicMat);
      lUpperArm.position.set(-0.17, 0.14, 0);
      lUpperArm.rotation.z = Math.PI / 10;
      torsoGroup.add(lUpperArm);

      const lBracer = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.038, 0.16, 8), archerBrownLeatherMat);
      lBracer.position.set(-0.19, 0.01, 0.06);
      lBracer.rotation.set(Math.PI / 6, 0, Math.PI / 12);
      torsoGroup.add(lBracer);

      const rUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.15, 8), archerGreenTunicMat);
      rUpperArm.position.set(0.17, 0.14, 0);
      rUpperArm.rotation.z = -Math.PI / 10;
      torsoGroup.add(rUpperArm);

      const rBracer = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.038, 0.16, 8), archerBrownLeatherMat);
      rBracer.position.set(0.19, 0.01, 0.04);
      rBracer.rotation.set(-Math.PI / 8, 0, -Math.PI / 12);
      torsoGroup.add(rBracer);

      // Sculpted Head with Elven Features & Tied-Back Hair
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), fleshMat);
      head.position.y = 0.35;
      torsoGroup.add(head);

      // Pointed Elven Ears
      const earL = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.09, 4), fleshMat);
      earL.position.set(-0.1, 0.36, -0.01);
      earL.rotation.set(-0.3, 0, -Math.PI / 3);
      torsoGroup.add(earL);

      const earR = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.09, 4), fleshMat);
      earR.position.set(0.1, 0.36, -0.01);
      earR.rotation.set(-0.3, 0, Math.PI / 3);
      torsoGroup.add(earR);

      // Tied-Back Elven Hair
      const hairCrown = new THREE.Mesh(new THREE.SphereGeometry(0.108, 10, 8), archerHairBlondeMat);
      hairCrown.position.set(0, 0.37, -0.02);
      torsoGroup.add(hairCrown);

      const hairTail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.015, 0.22, 6), archerHairBlondeMat);
      hairTail.position.set(0, 0.3, -0.12);
      hairTail.rotation.x = -Math.PI / 4;
      torsoGroup.add(hairTail);

      // Forehead Browband
      const browband = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.025, 12), darkLeatherMat);
      browband.position.set(0, 0.39, 0);
      torsoGroup.add(browband);

      // Back-Slung Embossed Leather Quiver with Colorful Arrows (Pedestal A)
      const quiver = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.05, 0.52, 10), archerBrownLeatherMat);
      quiver.position.set(-0.13, 0.38, -0.16);
      quiver.rotation.set(-Math.PI / 10, 0, Math.PI / 6);
      torsoGroup.add(quiver);

      const quiverRim = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.04, 10), goldMat);
      quiverRim.position.set(-0.19, 0.62, -0.19);
      quiverRim.rotation.set(-Math.PI / 10, 0, Math.PI / 6);
      torsoGroup.add(quiverRim);

      // Multi-Colored Fletched Arrows in Quiver (Yellow, Green, Red feathers)
      const fletchMats = [fletchGoldMat, fletchGreenMat, fletchRedMat, fletchGreenMat, fletchGoldMat];
      for (let a = 0; a < 5; a++) {
        const arrowTail = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.12, 0.05), fletchMats[a]);
        const ox = (a - 2) * 0.02;
        const oz = ((a % 2) - 0.5) * 0.03;
        arrowTail.position.set(-0.2 + ox, 0.72 + (a % 2) * 0.04, -0.2 + oz);
        arrowTail.rotation.set(-Math.PI / 10, 0, Math.PI / 6);
        torsoGroup.add(arrowTail);
      }

      root.add(torsoGroup);

      // 2. Masterwork Recurve Composite Bow ("Silent Quill Unit" in reference)
      const bowPivot = new THREE.Group();
      bowPivot.name = 'bow_pivot';
      bowPivot.position.set(0.22, 0.48, 0.18);

      // Central Leather Riser Grip
      const bowGrip = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.16, 8), darkLeatherMat);
      bowPivot.add(bowGrip);

      // Upper Recurve Limb
      const upperLimb = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.012, 0.45, 8), woodMat);
      upperLimb.position.set(0, 0.26, -0.06);
      upperLimb.rotation.x = -Math.PI / 8;
      bowPivot.add(upperLimb);

      const upperSiyah = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.008, 0.14, 8), goldMat);
      upperSiyah.position.set(0, 0.46, -0.01);
      upperSiyah.rotation.x = Math.PI / 5;
      bowPivot.add(upperSiyah);

      // Lower Recurve Limb
      const lowerLimb = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.45, 8), woodMat);
      lowerLimb.position.set(0, -0.26, -0.06);
      lowerLimb.rotation.x = Math.PI / 8;
      bowPivot.add(lowerLimb);

      const lowerSiyah = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.14, 8), goldMat);
      lowerSiyah.position.set(0, -0.46, -0.01);
      lowerSiyah.rotation.x = -Math.PI / 5;
      bowPivot.add(lowerSiyah);

      // Taut Bowstring
      const bowString = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.98, 6), canvasMat);
      bowString.position.set(0, 0, -0.16);
      bowPivot.add(bowString);

      // Nocked Bodkin Arrow ready to loose
      const arrowShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.65, 6), woodMat);
      arrowShaft.position.set(0, 0, 0.08);
      arrowShaft.rotation.x = Math.PI / 2;
      bowPivot.add(arrowShaft);

      const arrowTip = new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.08, 6), steelMat);
      arrowTip.position.set(0, 0, 0.42);
      arrowTip.rotation.x = Math.PI / 2;
      bowPivot.add(arrowTip);

      const fletch1 = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.04, 0.1), fletchGreenMat);
      fletch1.position.set(0, 0.02, -0.2);
      bowPivot.add(fletch1);

      const fletch2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.008, 0.1), fletchGoldMat);
      fletch2.position.set(0, 0, -0.2);
      bowPivot.add(fletch2);

      root.add(bowPivot);

      // 3. Articulated Legs with High Cuffed Ranger Boots
      root.add(createArticulatedLeg(darkLeatherMat, -0.09, 'left_leg', 0.42, true));
      root.add(createArticulatedLeg(darkLeatherMat, 0.09, 'right_leg', 0.42, true));
      break;
    }

    case 'cavalry': {
      // 1. Armored Destrier Warhorse with Full Gothic Plate Barding (Crimson Talon Defender)
      root.add(createArticulatedHorse(whiteHorseMat, darkLeatherMat, 'heavy_plate', teamMat));

      // 2. Knight in Full Gothic Fluted Plate Armor (Exact to Reference Photo!)
      const knightGroup = new THREE.Group();
      knightGroup.position.set(0, 0.88, -0.06);

      // Gothic Steel Cuirass with central tapul ridge
      const knightCuirass = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.30, 0.22), steelMat);
      knightCuirass.position.y = 0.15;
      knightGroup.add(knightCuirass);

      // Tapul vertical center keel ridge
      const tapulKeel = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.26, 4), steelMat);
      tapulKeel.position.set(0, 0.15, 0.12);
      knightGroup.add(tapulKeel);

      // Crossed Leather Weapon Harness Belts (Direct from reference "Deep-inset Magnification Case"!)
      const harnessStrap1 = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.34, 0.03), darkLeatherMat);
      harnessStrap1.position.set(0, 0.16, 0.115);
      harnessStrap1.rotation.z = Math.PI / 5;
      knightGroup.add(harnessStrap1);

      const harnessStrap2 = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.34, 0.03), darkLeatherMat);
      harnessStrap2.position.set(0, 0.16, 0.115);
      harnessStrap2.rotation.z = -Math.PI / 5;
      knightGroup.add(harnessStrap2);

      // Central Brass Belt Buckle at intersection
      const crossBuckle = new THREE.Mesh(new THREE.DodecahedronGeometry(0.035, 0), goldMat);
      crossBuckle.position.set(0, 0.16, 0.135);
      knightGroup.add(crossBuckle);

      // Fauld & Hanging Articulated Tassets over velvet arming skirt
      const fauld = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.20, 0.08, 12), steelMat);
      fauld.position.y = -0.01;
      knightGroup.add(fauld);

      const tassetL = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.16, 0.03), steelMat);
      tassetL.position.set(-0.11, -0.09, 0.09);
      tassetL.rotation.set(0.2, 0, 0.15);
      knightGroup.add(tassetL);

      const tassetR = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.16, 0.03), steelMat);
      tassetR.position.set(0.11, -0.09, 0.09);
      tassetR.rotation.set(0.2, 0, -0.15);
      knightGroup.add(tassetR);

      const velvetSkirt = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.23, 0.14, 12), crimsonVelvetMat);
      velvetSkirt.position.y = -0.05;
      knightGroup.add(velvetSkirt);

      // Multi-Tiered Pauldrons with Besagew Disks guarding armpits
      const lPauldron = new THREE.Mesh(new THREE.SphereGeometry(0.10, 10, 8), steelMat);
      lPauldron.position.set(-0.21, 0.24, 0);
      lPauldron.scale.set(1.1, 0.9, 1.0);
      knightGroup.add(lPauldron);

      const lBesagew = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 10), goldMat);
      lBesagew.position.set(-0.19, 0.16, 0.10);
      lBesagew.rotation.x = Math.PI / 2;
      knightGroup.add(lBesagew);

      const rPauldron = new THREE.Mesh(new THREE.SphereGeometry(0.10, 10, 8), steelMat);
      rPauldron.position.set(0.21, 0.24, 0);
      rPauldron.scale.set(1.1, 0.9, 1.0);
      knightGroup.add(rPauldron);

      const rBesagew = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 10), goldMat);
      rBesagew.position.set(0.19, 0.16, 0.10);
      rBesagew.rotation.x = Math.PI / 2;
      knightGroup.add(rBesagew);

      // Arms: left holding reins/shield, right controlling lance
      const lArm = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.042, 0.26, 8), steelMat);
      lArm.position.set(-0.19, 0.12, 0.08);
      lArm.rotation.set(-Math.PI / 4, 0, -Math.PI / 10);
      knightGroup.add(lArm);

      const lCouter = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.08, 6), steelMat);
      lCouter.position.set(-0.24, 0.10, 0.04);
      lCouter.rotation.set(0, 0, Math.PI / 2);
      knightGroup.add(lCouter);

      const rArm = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.042, 0.26, 8), steelMat);
      rArm.position.set(0.19, 0.12, 0);
      rArm.rotation.set(Math.PI / 10, 0, Math.PI / 10);
      knightGroup.add(rArm);

      const rCouter = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.08, 6), steelMat);
      rCouter.position.set(0.24, 0.10, -0.04);
      rCouter.rotation.set(0, 0, -Math.PI / 2);
      knightGroup.add(rCouter);

      // Gothic Close-Helm with Sparrow's Beak Visor & Neck Gorget (Reference Accurate)
      const helmDome = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), steelMat);
      helmDome.position.set(0, 0.44, 0);
      knightGroup.add(helmDome);

      const helmComb = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, 0.24), goldMat);
      helmComb.position.set(0, 0.52, 0);
      knightGroup.add(helmComb);

      // Sparrow's Beak pointed visor
      const beakVisor = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.15, 6), darkGothicSteelMat);
      beakVisor.position.set(0, 0.42, 0.14);
      beakVisor.rotation.x = Math.PI / 2.2;
      knightGroup.add(beakVisor);

      // Vision slit
      const eyeSlit = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.02, 0.03), darkLeatherMat);
      eyeSlit.position.set(0, 0.45, 0.13);
      knightGroup.add(eyeSlit);

      // Gorget neck collar
      const gorget = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.17, 0.10, 12), steelMat);
      gorget.position.set(0, 0.32, 0);
      knightGroup.add(gorget);

      // Flowing Horsehair Plumage arching up and back (Crimson Comb)
      const plume = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.28, 0.22), crimsonPlumeMat);
      plume.position.set(0, 0.62, -0.08);
      plume.rotation.x = -Math.PI / 10;
      knightGroup.add(plume);

      // Mounted plate legs with winged poleyns in steel stirrups
      const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.052, 0.42, 8), steelMat);
      legL.position.set(-0.24, -0.05, 0.08);
      legL.rotation.set(Math.PI / 7, 0, Math.PI / 12);
      knightGroup.add(legL);

      const poleynL = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), steelMat);
      poleynL.position.set(-0.25, -0.06, 0.22);
      knightGroup.add(poleynL);

      const sabatonL = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.16, 6), steelMat);
      sabatonL.position.set(-0.25, -0.24, 0.18);
      sabatonL.rotation.x = Math.PI / 3;
      knightGroup.add(sabatonL);

      const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.052, 0.42, 8), steelMat);
      legR.position.set(0.24, -0.05, 0.08);
      legR.rotation.set(Math.PI / 7, 0, -Math.PI / 12);
      knightGroup.add(legR);

      const poleynR = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), steelMat);
      poleynR.position.set(0.25, -0.06, 0.22);
      knightGroup.add(poleynR);

      const sabatonR = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.16, 6), steelMat);
      sabatonR.position.set(0.25, -0.24, 0.18);
      sabatonR.rotation.x = Math.PI / 3;
      knightGroup.add(sabatonR);

      // Left Flank Mounted Gothic Heater Shield
      const knightShield = new THREE.Group();
      knightShield.position.set(-0.30, 0.15, 0.06);

      const kShieldBody = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.14, 0.48, 12, 1, false, 0, Math.PI), crimsonVelvetMat);
      kShieldBody.rotation.y = -Math.PI / 2;
      knightShield.add(kShieldBody);

      const kShieldRim = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.50, 0.38), steelMat);
      knightShield.add(kShieldRim);

      const kShieldEmblem = new THREE.Mesh(new THREE.OctahedronGeometry(0.08, 0), goldMat);
      kShieldEmblem.position.set(-0.04, 0.04, 0);
      knightShield.add(kShieldEmblem);

      knightGroup.add(knightShield);
      root.add(knightGroup);

      // 3. Massive Tournament Heavy Lance (Points forward along +Z!)
      const lancePivot = new THREE.Group();
      lancePivot.name = 'lance_pivot';
      lancePivot.position.set(0.28, 0.98, 0.1);
      lancePivot.rotation.x = -0.32; // Default rest angle pointing forward-up

      // Long tapered ash/steel lance shaft
      const lanceShaftGeom = new THREE.CylinderGeometry(0.03, 0.045, 2.9, 10);
      lanceShaftGeom.rotateX(Math.PI / 2);
      const lanceShaft = new THREE.Mesh(lanceShaftGeom, woodMat);
      lanceShaft.position.set(0, 0, 1.1);
      lancePivot.add(lanceShaft);

      // Large Conical Bell Vamplate (Hand Guard Shielding Rider's Right Hand)
      const vamplateGeom = new THREE.CylinderGeometry(0.05, 0.22, 0.18, 16);
      vamplateGeom.rotateX(Math.PI / 2);
      const vamplate = new THREE.Mesh(vamplateGeom, steelMat);
      vamplate.position.set(0, 0, -0.06);
      lancePivot.add(vamplate);

      const vamplateRim = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.015, 8, 16), goldMat);
      vamplateRim.position.set(0, 0, -0.15);
      lancePivot.add(vamplateRim);

      // Heavy Counterweight Butt behind the hand
      const buttGeom = new THREE.CylinderGeometry(0.05, 0.035, 0.55, 10);
      buttGeom.rotateX(Math.PI / 2);
      const butt = new THREE.Mesh(buttGeom, steelMat);
      butt.position.set(0, 0, -0.42);
      lancePivot.add(butt);

      // Four-Sided Diamond Steel Lance Tip
      const lanceTipGeom = new THREE.ConeGeometry(0.055, 0.42, 4);
      lanceTipGeom.rotateX(Math.PI / 2);
      const lanceTip = new THREE.Mesh(lanceTipGeom, steelMat);
      lanceTip.position.set(0, 0, 2.7);
      lancePivot.add(lanceTip);

      // Golden Socket Collar Rings
      const socketRing = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.08, 10), goldMat);
      socketRing.rotateX(Math.PI / 2);
      socketRing.position.set(0, 0, 2.48);
      lancePivot.add(socketRing);

      // Team Heraldic Pennon Streamer
      const pennon = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.22, 0.55), teamMat);
      pennon.position.set(0, -0.10, 2.1);
      lancePivot.add(pennon);

      root.add(lancePivot);
      break;
    }

    case 'siege_unit': {
      // 1. Mangonel / Onager Open Timber Frame Chassis (Exact to AoE Reference Photo!)
      const chassis = new THREE.Group();
      chassis.name = 'siege_chassis';
      chassis.position.y = 0.32;

      // Two thick longitudinal squared timber side beams
      const sideBeamL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 2.0), woodMat);
      sideBeamL.position.set(-0.48, 0, 0);
      chassis.add(sideBeamL);

      const sideBeamR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 2.0), woodMat);
      sideBeamR.position.set(0.48, 0, 0);
      chassis.add(sideBeamR);

      // Front and rear heavy crossbars
      const frontCross = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.22, 0.18), woodMat);
      frontCross.position.set(0, 0, 0.88);
      chassis.add(frontCross);

      const rearCross = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.22, 0.18), woodMat);
      rearCross.position.set(0, 0, -0.88);
      chassis.add(rearCross);

      // Central fulcrum axle beam
      const midAxle = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.18, 0.16), woodMat);
      midAxle.position.set(0, -0.02, 0);
      chassis.add(midAxle);

      // 2. Iconic Purple/Team-Colored Torsion Skein Roller (Exact to reference photo!)
      const torsionRoller = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.76, 16), teamClothMat);
      torsionRoller.rotation.z = Math.PI / 2;
      torsionRoller.position.set(0, 0.05, 0.45);
      chassis.add(torsionRoller);

      // Torsion skein rope windings flanking the roller
      for (const rx of [-0.28, 0.28]) {
        const ropeWinding = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.04, 8, 16), canvasMat);
        ropeWinding.position.set(rx, 0.05, 0.45);
        ropeWinding.rotation.y = Math.PI / 2;
        chassis.add(ropeWinding);
      }

      // External Iron Ratchet Wheels and Winding Handles
      for (const side of [-0.58, 0.58]) {
        const ratchet = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.05, 12), darkIronMat);
        ratchet.position.set(side, 0.05, 0.45);
        ratchet.rotation.z = Math.PI / 2;
        chassis.add(ratchet);

        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.32, 0.04), ironMat);
        handle.position.set(side * 1.05, 0.12, 0.45);
        chassis.add(handle);
      }

      // 3. 4 Solid Timber Disc Wheels with Iron Tire Rims & Hub Pegs
      const wheelGeom = new THREE.CylinderGeometry(0.32, 0.32, 0.14, 16);
      wheelGeom.rotateZ(Math.PI / 2);
      const wheelPos = [
        [-0.68, 0.02, -0.65], [0.68, 0.02, -0.65],
        [-0.68, 0.02, 0.65], [0.68, 0.02, 0.65]
      ];
      const wheelNames = ['wheel_fl', 'wheel_fr', 'wheel_bl', 'wheel_br'];
      wheelPos.forEach(([wx, wy, wz], wIdx) => {
        const wheel = new THREE.Mesh(wheelGeom, woodMat);
        wheel.name = wheelNames[wIdx];
        wheel.position.set(wx, wy, wz);
        chassis.add(wheel);

        // Iron Tire Rim Band
        const rimBand = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.02, 6, 16), darkIronMat);
        rimBand.position.set(wx, wy, wz);
        rimBand.rotation.y = Math.PI / 2;
        chassis.add(rimBand);

        // Axle Hub Pin
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.22, 12), darkIronMat);
        hub.position.set(wx, wy, wz);
        hub.rotation.z = Math.PI / 2;
        chassis.add(hub);
      });

      // 4. A-Frame Vertical Uprights, Diagonal Braces & Cross-Bumper
      const postL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.25, 0.16), woodMat);
      postL.position.set(-0.45, 0.65, 0.02);
      chassis.add(postL);

      const postR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.25, 0.16), woodMat);
      postR.position.set(0.45, 0.65, 0.02);
      chassis.add(postR);

      // Diagonal timber kick-braces (front to top of posts)
      const braceL = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 1.15, 8), woodMat);
      braceL.position.set(-0.45, 0.5, 0.42);
      braceL.rotation.x = -Math.PI / 4.5;
      chassis.add(braceL);

      const braceR = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 1.15, 8), woodMat);
      braceR.position.set(0.45, 0.5, 0.42);
      braceR.rotation.x = -Math.PI / 4.5;
      chassis.add(braceR);

      // Horizontal Cross-Bumper stop beam across top
      const bumperBeam = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.2, 0.2), woodMat);
      bumperBeam.position.set(0, 1.25, 0.02);
      chassis.add(bumperBeam);

      // White/Canvas Rope Bindings wrapped around joint tops (matching reference photo!)
      for (const lx of [-0.45, 0.45]) {
        const ropeLash = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 0.24), canvasMat);
        ropeLash.position.set(lx, 1.25, 0.02);
        chassis.add(ropeLash);
      }

      root.add(chassis);

      // 5. Catapult Throwing Arm Pivot with Carved Wooden Cup & Stone Missile
      const armPivot = new THREE.Group();
      armPivot.name = 'arm_pivot';
      armPivot.position.set(0, 0.48, 0.05);

      // Tapered timber throwing arm
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.75, 0.14), woodMat);
      arm.position.set(0, 0.82, 0);
      arm.rotation.x = -Math.PI / 4.2;
      armPivot.add(arm);

      // Rope bindings along the arm
      const armRope = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.18, 10), canvasMat);
      armRope.position.set(0, 0.45, 0);
      armRope.rotation.x = -Math.PI / 4.2;
      armPivot.add(armRope);

      // Carved Wooden Bowl / Cup at throwing end (exact to reference photo!)
      const cupGeom = new THREE.CylinderGeometry(0.24, 0.16, 0.22, 14);
      const cup = new THREE.Mesh(cupGeom, woodMat);
      cup.position.set(0, 1.55, -0.42);
      cup.rotation.x = Math.PI / 5;
      armPivot.add(cup);

      // Rough Chiseled Granite Rock Payload sitting in the cup (exact to reference!)
      const rockPayload = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22, 1), darkStoneMat);
      rockPayload.position.set(0, 1.68, -0.42);
      rockPayload.scale.set(1.15, 0.85, 1.05);
      armPivot.add(rockPayload);

      // Leather Sling Strap & Iron Release Claw
      const slingStrap = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.32, 0.04), darkLeatherMat);
      slingStrap.position.set(0, 1.48, -0.32);
      slingStrap.rotation.x = -Math.PI / 4.2;
      armPivot.add(slingStrap);

      root.add(armPivot);
      break;
    }

    case 'advanced_unit': {
      // 1. Royal Guard in Full Gothic Fluted Plate Armor with Crimson Plumage & Regalia (Crimson Talon Defender)
      const torsoGroup = new THREE.Group();
      torsoGroup.name = 'unit_torso';
      torsoGroup.position.y = 0.44;

      // Heavy Fluted Gothic Steel Breastplate with Tapul Ridge
      const cuirass = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.32, 0.24), steelMat);
      cuirass.position.y = 0.15;
      torsoGroup.add(cuirass);

      // Embossed Gold Filigree Borders (Neckline, Waist, Plating)
      const goldCollar = new THREE.Mesh(new THREE.BoxGeometry(0.37, 0.05, 0.25), goldMat);
      goldCollar.position.y = 0.29;
      torsoGroup.add(goldCollar);

      const goldWaist = new THREE.Mesh(new THREE.BoxGeometry(0.37, 0.05, 0.25), goldMat);
      goldWaist.position.y = 0.02;
      torsoGroup.add(goldWaist);

      // Imperial Golden Double-Headed Eagle Medallion on Chest (Pedestal reference)
      const eagleMedallion = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.04), goldMat);
      eagleMedallion.position.set(0, 0.18, 0.13);
      torsoGroup.add(eagleMedallion);

      // Solid Steel Gorget Collar Protecting Throat
      const gorget = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.1, 14), steelMat);
      gorget.position.y = 0.32;
      torsoGroup.add(gorget);

      // Massive Multi-Tiered Gothic Pauldrons with Gold Filigree Edges
      for (let side = -1; side <= 1; side += 2) {
        // Upper pauldron plate
        const pauldronUpper = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.24), steelMat);
        pauldronUpper.position.set(side * 0.26, 0.26, 0);
        pauldronUpper.rotation.z = side * -Math.PI / 9;
        torsoGroup.add(pauldronUpper);

        const pauldronTrim = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.04, 0.25), goldMat);
        pauldronTrim.position.set(side * 0.26, 0.31, 0);
        pauldronTrim.rotation.z = side * -Math.PI / 9;
        torsoGroup.add(pauldronTrim);

        // Lower articulated tier
        const pauldronLower = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.22), steelMat);
        pauldronLower.position.set(side * 0.27, 0.16, 0);
        torsoGroup.add(pauldronLower);

        // Circular Fluted Besagew (Armpit deflector with gold stud)
        const besagew = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.03, 12), goldMat);
        besagew.position.set(side * 0.23, 0.18, 0.12);
        besagew.rotation.x = Math.PI / 2;
        torsoGroup.add(besagew);

        // Articulated Steel Arm Armor (Rerebrace, Couter Elbow Spike, Vambrace)
        const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.18, 8), steelMat);
        upperArm.position.set(side * 0.25, 0.11, 0);
        upperArm.rotation.z = side * -Math.PI / 12;
        torsoGroup.add(upperArm);

        // Pointed Couter (Elbow guard)
        const couter = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.1, 6), steelMat);
        couter.position.set(side * 0.28, 0.01, -0.04);
        couter.rotation.set(-Math.PI / 4, 0, side * Math.PI / 3);
        torsoGroup.add(couter);

        const vambrace = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.18, 8), steelMat);
        vambrace.position.set(side * 0.25, -0.07, 0.04);
        vambrace.rotation.set(Math.PI / 8, 0, side * -Math.PI / 14);
        torsoGroup.add(vambrace);

        // Hourglass Steel Gauntlet
        const gauntlet = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.09, 0.09), goldMat);
        gauntlet.position.set(side * 0.25, -0.16, 0.08);
        torsoGroup.add(gauntlet);
      }

      // Pleated Royal Crimson Velvet Arming Skirt with Gold Hem
      const armingSkirt = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.18, 14), crimsonVelvetMat);
      armingSkirt.position.y = -0.06;
      torsoGroup.add(armingSkirt);

      const skirtGoldHem = new THREE.Mesh(new THREE.CylinderGeometry(0.255, 0.265, 0.035, 14), goldMat);
      skirtGoldHem.position.y = -0.14;
      torsoGroup.add(skirtGoldHem);

      // Steel Plate Tassets (Front Thigh Armor) with Gold Borders
      for (let side = -1; side <= 1; side += 2) {
        const tasset = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.04), steelMat);
        tasset.position.set(side * 0.09, -0.08, 0.13);
        tasset.rotation.set(Math.PI / 12, 0, side * -0.08);
        torsoGroup.add(tasset);

        const tassetTrim = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.03, 0.045), goldMat);
        tassetTrim.position.set(side * 0.09, -0.15, 0.14);
        tassetTrim.rotation.set(Math.PI / 12, 0, side * -0.08);
        torsoGroup.add(tassetTrim);
      }

      // Royal Crimson Velvet Cape with Gold Shoulder Clasps (Billowing behind)
      const cape = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.72, 0.04), crimsonVelvetMat);
      cape.position.set(0, 0.02, -0.16);
      cape.rotation.x = Math.PI / 18;
      torsoGroup.add(cape);

      const capeGoldHem = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.04, 0.045), goldMat);
      capeGoldHem.position.set(0, -0.33, -0.19);
      capeGoldHem.rotation.x = Math.PI / 18;
      torsoGroup.add(capeGoldHem);

      // Close-Helm / Armet with Visor Prow & Flowing Crimson Plumage (Reference Accurate)
      const helmSkull = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 12), steelMat);
      helmSkull.position.set(0, 0.44, 0);
      torsoGroup.add(helmSkull);

      // Pointed Visor with Eye Slit
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.14), steelMat);
      visor.position.set(0, 0.42, 0.07);
      torsoGroup.add(visor);

      const eyeSlit = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.02, 0.04), darkIronMat);
      eyeSlit.position.set(0, 0.45, 0.14);
      torsoGroup.add(eyeSlit);

      const visorGoldTrim = new THREE.Mesh(new THREE.BoxGeometry(0.185, 0.025, 0.05), goldMat);
      visorGoldTrim.position.set(0, 0.465, 0.135);
      torsoGroup.add(visorGoldTrim);

      // High Arched Helmet Comb
      const helmComb = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.14, 0.22), goldMat);
      helmComb.position.set(0, 0.54, 0.01);
      torsoGroup.add(helmComb);

      // Flowing Crimson Horsehair Plumage / Crest arching up and back
      const plumeBase = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.22, 8), crimsonPlumeMat);
      plumeBase.position.set(0, 0.62, 0.06);
      plumeBase.rotation.x = Math.PI / 5;
      torsoGroup.add(plumeBase);

      const plumeTail = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.03, 0.32, 8), crimsonPlumeMat);
      plumeTail.position.set(0, 0.54, -0.1);
      plumeTail.rotation.x = -Math.PI / 4;
      torsoGroup.add(plumeTail);

      // 2. Ornate Crimson Talon Defender Kite / Heater Shield (Mounted on Left Arm)
      const shieldGroup = new THREE.Group();
      shieldGroup.position.set(-0.35, 0.08, 0.12);
      shieldGroup.rotation.set(0, Math.PI / 6, -Math.PI / 20);

      // Shield Body (Heater Shape)
      const shieldBody = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.55, 0.05), crimsonVelvetMat);
      shieldGroup.add(shieldBody);

      // Embossed Heavy Gold Filigree Border
      const shieldBorder = new THREE.Mesh(new THREE.BoxGeometry(0.39, 0.58, 0.04), goldMat);
      shieldBorder.position.z = -0.01;
      shieldGroup.add(shieldBorder);

      // Golden Imperial Double-Headed Eagle Shield Boss
      const eagleShieldBoss = new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), goldMat);
      eagleShieldBoss.position.set(0, 0.06, 0.04);
      eagleShieldBoss.scale.set(1.4, 1.2, 0.4);
      shieldGroup.add(eagleShieldBoss);

      torsoGroup.add(shieldGroup);

      root.add(torsoGroup);

      // 3. Heavy Crimson Talon Poleaxe / Halberd (Mounted in halberd_pivot)
      const halberdPivot = new THREE.Group();
      halberdPivot.name = 'halberd_pivot';
      halberdPivot.position.set(0.28, 0.52, 0.16);

      // Polished Hardwood Shaft with Steel Langets
      const halberdShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 2.45, 10), woodMat);
      halberdShaft.position.set(0, 0.68, 0);
      halberdPivot.add(halberdShaft);

      // Steel Langet Reinforcing Strips
      const langet = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.9, 0.032), steelMat);
      langet.position.set(0, 1.2, 0);
      halberdPivot.add(langet);

      // Broad Curved Crescent Axe Blade (Pedestal reference)
      const axeBlade = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.48, 0.38), steelMat);
      axeBlade.position.set(0, 1.5, 0.18);
      halberdPivot.add(axeBlade);

      const axeGoldInlay = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.32, 0.2), goldMat);
      axeGoldInlay.position.set(0, 1.5, 0.12);
      halberdPivot.add(axeGoldInlay);

      // Rear Armor-Piercing Hooked Fluke / Beak
      const rearBeak = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.28, 6), steelMat);
      rearBeak.position.set(0, 1.5, -0.16);
      rearBeak.rotation.x = -Math.PI / 2.2;
      halberdPivot.add(rearBeak);

      // Long Diamond-Section Top Spear Point
      const spearSpike = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.48, 8), steelMat);
      spearSpike.position.set(0, 1.95, 0);
      halberdPivot.add(spearSpike);

      // Bottom Brass Ferrule & Pommel
      const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.12, 8), goldMat);
      ferrule.position.set(0, -0.52, 0);
      halberdPivot.add(ferrule);

      root.add(halberdPivot);

      // 4. Articulated Gothic Plate Leg Harness (Cuisses, Winged Poleyns, Greaves, Sabatons)
      root.add(createArticulatedLeg(steelMat, -0.11, 'left_leg', 0.42, true));
      root.add(createArticulatedLeg(steelMat, 0.11, 'right_leg', 0.42, true));
      break;
    }

    case 'dragon': {
      // 1. Dragon Torso & Muscular Anatomy (Faithfully sculpted from AMD Nanite reference model sheet)
      // Main tapered thoracic cage
      const torso = new THREE.Mesh(new THREE.ConeGeometry(0.72, 2.2, 8), dragonRedScalesMat);
      torso.name = 'dragon_torso';
      torso.rotation.x = Math.PI / 2.22;
      torso.position.set(0, 0.44, -0.05);
      root.add(torso);

      // Deep muscular pectoral masses (Left and Right breast ridges)
      const pectL = new THREE.Mesh(new THREE.DodecahedronGeometry(0.48, 1), dragonRedScalesMat);
      pectL.position.set(-0.24, 0.54, 0.42);
      pectL.scale.set(0.85, 1.25, 0.9);
      root.add(pectL);

      const pectR = new THREE.Mesh(new THREE.DodecahedronGeometry(0.48, 1), dragonRedScalesMat);
      pectR.position.set(0.24, 0.54, 0.42);
      pectR.scale.set(0.85, 1.25, 0.9);
      root.add(pectR);

      // Segmented Chevron Warm Ivory Ventral Scutes (7 overlapping gastrosteges plates exact to Nanite model sheet)
      for (let b = 0; b < 7; b++) {
        const bellyPlate = new THREE.Mesh(
          new THREE.BoxGeometry(0.62 - b * 0.055, 0.16, 0.38 - b * 0.03),
          dragonBellyCreamMat
        );
        bellyPlate.position.set(0, 0.18 + b * 0.11, 0.72 - b * 0.24);
        bellyPlate.rotation.x = Math.PI / 3.8 + b * 0.06;
        bellyPlate.scale.set(1.0 - b * 0.06, 0.78, 1.0);
        root.add(bellyPlate);
      }

      // Spiked Scapular Shoulder Ridges (projecting outward/backward from shoulders)
      for (let side = -1; side <= 1; side += 2) {
        const scapSpike = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.52, 4), dragonObsidianMat);
        scapSpike.position.set(side * 0.54, 0.72, 0.22);
        scapSpike.rotation.set(-0.35, 0, side * -0.65);
        root.add(scapSpike);

        const scapSpike2 = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.38, 4), dragonObsidianMat);
        scapSpike2.position.set(side * 0.58, 0.62, 0.08);
        scapSpike2.rotation.set(-0.4, 0, side * -0.8);
        root.add(scapSpike2);
      }

      // Lateral Flank Spikes on Hips
      const flankSpikeGeom = new THREE.ConeGeometry(0.13, 0.52, 4);
      const leftFlankSpike = new THREE.Mesh(flankSpikeGeom, dragonRedScalesMat);
      leftFlankSpike.position.set(-0.62, 0.4, -0.42);
      leftFlankSpike.rotation.set(0.3, 0, -Math.PI / 3.0);
      root.add(leftFlankSpike);

      const rightFlankSpike = new THREE.Mesh(flankSpikeGeom, dragonRedScalesMat);
      rightFlankSpike.position.set(0.62, 0.4, -0.42);
      rightFlankSpike.rotation.set(0.3, 0, Math.PI / 3.0);
      root.add(rightFlankSpike);

      // Serrated Dorsal Obsidian Spines along spine
      for (let s = 0; s < 6; s++) {
        const spine = new THREE.Mesh(new THREE.ConeGeometry(0.095 - s * 0.01, 0.42 - s * 0.04, 4), dragonObsidianMat);
        spine.position.set(0, 0.85 - s * 0.085, 0.3 - s * 0.28);
        spine.rotation.x = -Math.PI / 7;
        root.add(spine);
      }

      // Glowing Dragonheart Crest Crystal on Sternum (Faction team color)
      const teamCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0), dragonTeamGlowMat);
      teamCrystal.position.set(0, 0.78, 0.62);
      root.add(teamCrystal);

      // 2. Four Muscular Quadrupedal Limbs with Elbow/Hock Spurs & Sharp Claws
      // Left Foreleg
      const leftForeleg = new THREE.Group();
      leftForeleg.position.set(-0.48, 0.38, 0.42);
      const lDeltoid = new THREE.Mesh(new THREE.DodecahedronGeometry(0.24, 0), dragonRedScalesMat);
      lDeltoid.position.set(-0.06, 0.12, 0);
      leftForeleg.add(lDeltoid);

      const lUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.46, 6), dragonRedScalesMat);
      lUpperArm.position.set(-0.06, -0.04, 0);
      lUpperArm.rotation.z = Math.PI / 10;
      leftForeleg.add(lUpperArm);

      // Elbow Spur
      const lElbowSpur = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.26, 4), dragonObsidianMat);
      lElbowSpur.position.set(-0.14, -0.18, -0.08);
      lElbowSpur.rotation.set(-0.5, 0, -0.8);
      leftForeleg.add(lElbowSpur);

      const lLowerArm = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.1, 0.44, 6), dragonRedScalesMat);
      lLowerArm.position.set(-0.02, -0.34, 0.04);
      leftForeleg.add(lLowerArm);

      // 4 Articulated Talons / Claws
      for (let c = -1; c <= 2; c++) {
        const claw = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.26, 4), dragonObsidianMat);
        const cx = (c - 0.5) * 0.07 - 0.02;
        claw.position.set(cx, -0.54, 0.14 + (c === 0 || c === 1 ? 0.04 : 0));
        claw.rotation.set(Math.PI / 2.7, 0, (c - 0.5) * -0.15);
        leftForeleg.add(claw);
      }
      root.add(leftForeleg);

      // Right Foreleg
      const rightForeleg = new THREE.Group();
      rightForeleg.position.set(0.48, 0.38, 0.42);
      const rDeltoid = new THREE.Mesh(new THREE.DodecahedronGeometry(0.24, 0), dragonRedScalesMat);
      rDeltoid.position.set(0.06, 0.12, 0);
      rightForeleg.add(rDeltoid);

      const rUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.46, 6), dragonRedScalesMat);
      rUpperArm.position.set(0.06, -0.04, 0);
      rUpperArm.rotation.z = -Math.PI / 10;
      rightForeleg.add(rUpperArm);

      // Elbow Spur
      const rElbowSpur = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.26, 4), dragonObsidianMat);
      rElbowSpur.position.set(0.14, -0.18, -0.08);
      rElbowSpur.rotation.set(-0.5, 0, 0.8);
      rightForeleg.add(rElbowSpur);

      const rLowerArm = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.1, 0.44, 6), dragonRedScalesMat);
      rLowerArm.position.set(0.02, -0.34, 0.04);
      rightForeleg.add(rLowerArm);

      // 4 Articulated Talons / Claws
      for (let c = -1; c <= 2; c++) {
        const claw = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.26, 4), dragonObsidianMat);
        const cx = (c - 0.5) * 0.07 + 0.02;
        claw.position.set(cx, -0.54, 0.14 + (c === 0 || c === 1 ? 0.04 : 0));
        claw.rotation.set(Math.PI / 2.7, 0, (c - 0.5) * 0.15);
        rightForeleg.add(claw);
      }
      root.add(rightForeleg);

      // Left Hindleg
      const leftHindleg = new THREE.Group();
      leftHindleg.position.set(-0.56, 0.34, -0.5);
      const lThigh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32, 0), dragonRedScalesMat);
      lThigh.scale.set(0.9, 1.35, 1.15);
      lThigh.position.set(-0.06, 0.06, 0);
      leftHindleg.add(lThigh);

      // Hock Spur
      const lHockSpur = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.28, 4), dragonObsidianMat);
      lHockSpur.position.set(-0.12, -0.12, -0.16);
      lHockSpur.rotation.set(-0.6, 0, -0.35);
      leftHindleg.add(lHockSpur);

      const lCrus = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.1, 0.46, 6), dragonRedScalesMat);
      lCrus.position.set(-0.04, -0.28, 0.08);
      lCrus.rotation.x = -Math.PI / 9;
      leftHindleg.add(lCrus);

      for (let c = -1; c <= 2; c++) {
        const claw = new THREE.Mesh(new THREE.ConeGeometry(0.046, 0.25, 4), dragonObsidianMat);
        const cx = (c - 0.5) * 0.07 - 0.04;
        claw.position.set(cx, -0.52, 0.18 + (c === 0 || c === 1 ? 0.04 : 0));
        claw.rotation.set(Math.PI / 2.5, 0, (c - 0.5) * -0.15);
        leftHindleg.add(claw);
      }
      root.add(leftHindleg);

      // Right Hindleg
      const rightHindleg = new THREE.Group();
      rightHindleg.position.set(0.56, 0.34, -0.5);
      const rThigh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32, 0), dragonRedScalesMat);
      rThigh.scale.set(0.9, 1.35, 1.15);
      rThigh.position.set(0.06, 0.06, 0);
      rightHindleg.add(rThigh);

      // Hock Spur
      const rHockSpur = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.28, 4), dragonObsidianMat);
      rHockSpur.position.set(0.12, -0.12, -0.16);
      rHockSpur.rotation.set(-0.6, 0, 0.35);
      rightHindleg.add(rHockSpur);

      const rCrus = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.1, 0.46, 6), dragonRedScalesMat);
      rCrus.position.set(0.04, -0.28, 0.08);
      rCrus.rotation.x = -Math.PI / 9;
      rightHindleg.add(rCrus);

      for (let c = -1; c <= 2; c++) {
        const claw = new THREE.Mesh(new THREE.ConeGeometry(0.046, 0.25, 4), dragonObsidianMat);
        const cx = (c - 0.5) * 0.07 + 0.04;
        claw.position.set(cx, -0.52, 0.18 + (c === 0 || c === 1 ? 0.04 : 0));
        claw.rotation.set(Math.PI / 2.5, 0, (c - 0.5) * 0.15);
        rightHindleg.add(claw);
      }
      root.add(rightHindleg);

      // 3. Muscular S-Curved Articulated Neck
      const neckGroup = new THREE.Group();
      neckGroup.name = 'dragon_neck';
      neckGroup.position.set(0, 0.62, 0.52);

      const neckBase = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, 0.65, 7), dragonRedScalesMat);
      neckBase.position.set(0, 0.22, 0.12);
      neckBase.rotation.x = -Math.PI / 5.2;
      neckGroup.add(neckBase);

      const neckUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 0.65, 7), dragonRedScalesMat);
      neckUpper.position.set(0, 0.68, 0.28);
      neckUpper.rotation.x = -Math.PI / 6.5;
      neckGroup.add(neckUpper);

      // Segmented Throat Scutes (5 overlapping plates ascending to chin)
      for (let tp = 0; tp < 5; tp++) {
        const throatPlate = new THREE.Mesh(
          new THREE.BoxGeometry(0.32 - tp * 0.035, 0.18, 0.24 - tp * 0.02),
          dragonBellyCreamMat
        );
        throatPlate.position.set(0, 0.14 + tp * 0.2, 0.32 + tp * 0.02);
        throatPlate.rotation.x = -Math.PI / 5.5;
        neckGroup.add(throatPlate);
      }

      // Dorsal Obsidian Spines along nape
      for (let ns = 0; ns < 4; ns++) {
        const nSpine = new THREE.Mesh(new THREE.ConeGeometry(0.07 - ns * 0.01, 0.3 - ns * 0.04, 4), dragonObsidianMat);
        nSpine.position.set(0, 0.22 + ns * 0.22, -0.04 - ns * 0.04);
        nSpine.rotation.x = -Math.PI / 4.2;
        neckGroup.add(nSpine);
      }

      // 4. Fierce High-Poly Sculpted Dragon Head (Matching Nanite Model Sheet)
      const headGroup = new THREE.Group();
      headGroup.position.set(0, 0.98, 0.44);

      // Cranium
      const cranium = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.92, 6), dragonRedScalesMat);
      cranium.position.set(0, 0.06, 0.42);
      cranium.rotation.x = Math.PI / 2.22;
      headGroup.add(cranium);

      // Angular Brow Ridges (Menacing heavy supraorbital arches)
      const browL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 0.38), dragonRedScalesMat);
      browL.position.set(-0.16, 0.16, 0.34);
      browL.rotation.set(0.1, 0, -0.22);
      headGroup.add(browL);

      const browR = browL.clone();
      browR.position.x = 0.16;
      browR.rotation.z = 0.22;
      headGroup.add(browR);

      // Molten Glowing Predatory Eyes
      const eyeGeom = new THREE.BoxGeometry(0.07, 0.05, 0.14);
      const leftEye = new THREE.Mesh(eyeGeom, dragonEyeMat);
      leftEye.position.set(-0.17, 0.15, 0.36);
      leftEye.rotation.y = -Math.PI / 7;
      headGroup.add(leftEye);

      const rightEye = new THREE.Mesh(eyeGeom, dragonEyeMat);
      rightEye.position.set(0.17, 0.15, 0.36);
      rightEye.rotation.y = Math.PI / 7;
      headGroup.add(rightEye);

      // Nasal / Snout Crest Ridge (Subtle bronze crest)
      const crestHorn = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.45, 4), dragonCrestAmberMat);
      crestHorn.position.set(0, 0.24, 0.52);
      crestHorn.rotation.set(-Math.PI / 4.8, 0, 0);
      headGroup.add(crestHorn);

      // Primary Twin Swept-Back Obsidian Horns (Curving back & flaring up/out)
      for (let side = -1; side <= 1; side += 2) {
        // Base horn segment
        const hornBase = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.52, 5), dragonObsidianMat);
        hornBase.position.set(side * 0.22, 0.26, 0.04);
        hornBase.rotation.set(-0.45, 0, side * -0.42);
        headGroup.add(hornBase);

        // Curved mid-horn
        const hornMid = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.55, 4), dragonObsidianMat);
        hornMid.position.set(side * 0.34, 0.64, -0.16);
        hornMid.rotation.set(-0.75, side * 0.12, side * 0.26);
        headGroup.add(hornMid);

        // Sharp horn tip
        const hornTip = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.42, 4), dragonObsidianMat);
        hornTip.position.set(side * 0.42, 0.98, -0.44);
        hornTip.rotation.set(-0.95, side * 0.18, side * 0.14);
        headGroup.add(hornTip);

        // Secondary Jugal / Cheek Horn (Projecting back from jaw hinge)
        const cheekHorn = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.4, 4), dragonObsidianMat);
        cheekHorn.position.set(side * 0.28, 0.04, 0.08);
        cheekHorn.rotation.set(-0.35, 0, side * -1.25);
        headGroup.add(cheekHorn);

        const cheekHorn2 = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.28, 4), dragonObsidianMat);
        cheekHorn2.position.set(side * 0.26, -0.06, 0.16);
        cheekHorn2.rotation.set(-0.45, 0, side * -1.38);
        headGroup.add(cheekHorn2);
      }

      // Maxillary Upper Fangs
      for (let t = 0; t < 4; t++) {
        const fangL = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.1, 4), dragonBellyCreamMat);
        fangL.position.set(-0.12, -0.04, 0.36 + t * 0.11);
        fangL.rotation.x = Math.PI;
        headGroup.add(fangL);

        const fangR = fangL.clone();
        fangR.position.x = 0.12;
        headGroup.add(fangR);
      }

      // Articulated Lower Mandible / Jaw (Rotated by renderer.ts during roar/fire breath)
      const jaw = new THREE.Group();
      jaw.name = 'dragon_jaw';
      jaw.position.set(0, -0.06, 0.18);

      const jawBase = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.11, 0.65), dragonRedScalesMat);
      jawBase.position.set(0, -0.04, 0.28);
      jaw.add(jawBase);

      const jawChin = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.1, 0.5), dragonBellyCreamMat);
      jawChin.position.set(0, -0.09, 0.24);
      jaw.add(jawChin);

      // Mandibular Lower Fangs
      for (let t = 0; t < 4; t++) {
        const toothL = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.09, 4), dragonBellyCreamMat);
        toothL.position.set(-0.11, 0.05, 0.16 + t * 0.11);
        jaw.add(toothL);
        const toothR = toothL.clone();
        toothR.position.x = 0.11;
        jaw.add(toothR);
      }
      headGroup.add(jaw);

      // Flame Emitter Anchor for Fire Breath Visuals
      const flameEmitter = new THREE.Group();
      flameEmitter.name = 'flame_emitter';
      flameEmitter.position.set(0, -0.04, 0.82);
      headGroup.add(flameEmitter);

      neckGroup.add(headGroup);
      root.add(neckGroup);

      // 5. Long Serpentine Curving Tail with Arrowhead Fin Blade
      const tailGroup = new THREE.Group();
      tailGroup.name = 'dragon_tail';
      tailGroup.position.set(0, 0.24, -0.85);

      const tail1 = new THREE.Mesh(new THREE.ConeGeometry(0.38, 1.45, 6), dragonRedScalesMat);
      tail1.position.set(0, 0, -0.65);
      tail1.rotation.x = -Math.PI / 2.12;
      tailGroup.add(tail1);

      const tail2 = new THREE.Mesh(new THREE.ConeGeometry(0.24, 1.4, 6), dragonRedScalesMat);
      tail2.position.set(0.12, -0.04, -1.85);
      tail2.rotation.set(-Math.PI / 2.2, 0, -0.15);
      tailGroup.add(tail2);

      const tail3 = new THREE.Mesh(new THREE.ConeGeometry(0.14, 1.1, 6), dragonRedScalesMat);
      tail3.position.set(0.28, 0.02, -2.95);
      tail3.rotation.set(-Math.PI / 2.28, 0, -0.22);
      tailGroup.add(tail3);

      // Continuous Tail Dorsal Obsidian Spines
      for (let ts = 0; ts < 6; ts++) {
        const tSpine = new THREE.Mesh(
          new THREE.ConeGeometry(0.075 - ts * 0.01, 0.32 - ts * 0.04, 4),
          dragonObsidianMat
        );
        tSpine.position.set(ts * 0.05, 0.26 - ts * 0.03, -0.35 - ts * 0.52);
        tSpine.rotation.x = -Math.PI / 4.8;
        tailGroup.add(tSpine);
      }

      // Flared Arrowhead / Spade Fin Blade at tail tip (Nanite reference)
      const spadeFinGroup = new THREE.Group();
      spadeFinGroup.position.set(0.38, 0.06, -3.45);
      spadeFinGroup.rotation.set(-Math.PI / 4.2, 0, -0.25);

      const centerBlade = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.85, 4), dragonObsidianMat);
      centerBlade.scale.set(0.3, 1.0, 1.6);
      spadeFinGroup.add(centerBlade);

      const barbL = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.52, 4), dragonRedScalesMat);
      barbL.position.set(-0.18, -0.18, -0.08);
      barbL.rotation.z = Math.PI / 3.6;
      spadeFinGroup.add(barbL);

      const barbR = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.52, 4), dragonRedScalesMat);
      barbR.position.set(0.18, -0.18, -0.08);
      barbR.rotation.z = -Math.PI / 3.6;
      spadeFinGroup.add(barbR);

      tailGroup.add(spadeFinGroup);
      root.add(tailGroup);

      // 6. Magnificent Arched 4-Finger Nanite-Accurate Wings
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
        wing.position.set(s * 0.44, 0.72, 0.08);

        // Core joint nodes
        const pShoulder = new THREE.Vector3(0, 0, 0);
        const pElbow = new THREE.Vector3(s * 0.92, 0.78, 0.12);
        const pWrist = new THREE.Vector3(s * 1.7, 1.5, -0.05);
        const pThumbClawTip = new THREE.Vector3(s * 1.95, 1.8, 0.08);

        // 4 Radiating Finger Struts (matching Nanite 4-finger wing design)
        const pTip1 = new THREE.Vector3(s * 2.38, 0.72, -0.38); // Leading primary finger
        const pTip2 = new THREE.Vector3(s * 1.88, 0.28, -0.62); // Upper middle finger
        const pTip3 = new THREE.Vector3(s * 1.32, 0.12, -0.68); // Lower middle finger
        const pTip4 = new THREE.Vector3(s * 0.82, -0.02, -0.58); // Inner trailing finger
        const pFlank = new THREE.Vector3(s * 0.38, -0.22, -0.38); // Flank attachment

        // Midpoints along the wing web (boundary between upper red & lower ember membrane)
        const pMid1 = new THREE.Vector3(s * 2.04, 1.1, -0.22);
        const pMid2 = new THREE.Vector3(s * 1.76, 0.88, -0.32);
        const pMid3 = new THREE.Vector3(s * 1.36, 0.65, -0.28);
        const pMid4 = new THREE.Vector3(s * 0.88, 0.38, -0.22);

        // Scalloped trailing edge points forming the deep arch bays
        const pScallop1 = new THREE.Vector3(s * 2.08, -0.15, -0.88);
        const pScallop2 = new THREE.Vector3(s * 1.55, -0.22, -0.85);
        const pScallop3 = new THREE.Vector3(s * 1.05, -0.24, -0.78);
        const pScallop4 = new THREE.Vector3(s * 0.58, -0.26, -0.62);

        // 1. Structural Bone Struts
        addBoneBetween(wing, pShoulder, pElbow, 0.14, dragonRedScalesMat);
        addBoneBetween(wing, pElbow, pWrist, 0.11, dragonRedScalesMat);

        // Elbow Spur
        const pElbowSpur = new THREE.Vector3(s * 1.05, 0.95, -0.08);
        addBoneBetween(wing, pElbow, pElbowSpur, 0.065, dragonObsidianMat);

        // 4 Finger Struts
        addBoneBetween(wing, pWrist, pTip1, 0.055, dragonRedScalesMat);
        addBoneBetween(wing, pWrist, pTip2, 0.048, dragonRedScalesMat);
        addBoneBetween(wing, pWrist, pTip3, 0.044, dragonRedScalesMat);
        addBoneBetween(wing, pElbow, pTip4, 0.042, dragonRedScalesMat);

        // Prominent Curved Apex Thumb Claw (Alula) at Wrist
        addBoneBetween(wing, pWrist, pThumbClawTip, 0.075, dragonObsidianMat);

        // Finger Claws at Wing Tips
        const clawOffset1 = new THREE.Vector3(s * 0.1, -0.08, -0.06);
        addBoneBetween(wing, pTip1, pTip1.clone().add(clawOffset1), 0.042, dragonObsidianMat);
        const clawOffset2 = new THREE.Vector3(s * 0.08, -0.08, -0.06);
        addBoneBetween(wing, pTip2, pTip2.clone().add(clawOffset2), 0.04, dragonObsidianMat);
        const clawOffset3 = new THREE.Vector3(s * 0.06, -0.08, -0.06);
        addBoneBetween(wing, pTip3, pTip3.clone().add(clawOffset3), 0.038, dragonObsidianMat);
        const clawOffset4 = new THREE.Vector3(s * 0.05, -0.08, -0.05);
        addBoneBetween(wing, pTip4, pTip4.clone().add(clawOffset4), 0.036, dragonObsidianMat);

        // Helper to push triangle vertices
        const pushTri = (arr: number[], v1: THREE.Vector3, v2: THREE.Vector3, v3: THREE.Vector3) => {
          if (isLeft) {
            arr.push(v1.x, v1.y, v1.z, v3.x, v3.y, v3.z, v2.x, v2.y, v2.z);
          } else {
            arr.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z, v3.x, v3.y, v3.z);
          }
        };

        // 2. Upper Red Leathery Membrane Mesh (Deep Volcanic Crimson)
        const redVerts: number[] = [];
        pushTri(redVerts, pShoulder, pElbow, pMid4);
        pushTri(redVerts, pElbow, pWrist, pMid3);
        pushTri(redVerts, pElbow, pMid3, pMid4);
        pushTri(redVerts, pWrist, pMid2, pMid3);
        pushTri(redVerts, pWrist, pMid1, pMid2);
        pushTri(redVerts, pWrist, pTip1, pMid1);

        const redGeom = new THREE.BufferGeometry();
        redGeom.setAttribute('position', new THREE.Float32BufferAttribute(redVerts, 3));
        redGeom.computeVertexNormals();
        const redMesh = new THREE.Mesh(redGeom, dragonWingRedMat);
        wing.add(redMesh);

        // 3. Lower Scalloped Leathery Ember Membrane Mesh
        const creamVerts: number[] = [];
        pushTri(creamVerts, pMid4, pShoulder, pFlank);
        pushTri(creamVerts, pMid4, pFlank, pScallop4);
        pushTri(creamVerts, pMid4, pScallop4, pTip4);
        pushTri(creamVerts, pMid4, pTip4, pMid3);
        pushTri(creamVerts, pMid3, pTip4, pScallop3);
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
