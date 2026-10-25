import * as THREE from 'three';
import { UnitData } from '@agefront/shared';
import { getWoodPlankTexture } from './proceduralTextures.js';

export function createUnitModel(unit: UnitData, teamColor: string): THREE.Group {
  const root = new THREE.Group();
  root.position.set(unit.x, 0, unit.y);

  // -------------------------------------------------------------
  // HIGH-FIDELITY PBR MATERIALS PALETTE
  // -------------------------------------------------------------
  const teamCol = new THREE.Color(teamColor);
  const teamMat = new THREE.MeshStandardMaterial({
    color: teamCol,
    roughness: 0.35,
    metalness: 0.25,
    flatShading: false
  });
  const teamDarkMat = new THREE.MeshStandardMaterial({
    color: teamCol.clone().multiplyScalar(0.68),
    roughness: 0.45,
    metalness: 0.2,
    flatShading: false
  });
  const teamClothMat = new THREE.MeshStandardMaterial({
    color: teamCol,
    roughness: 0.8,
    metalness: 0.05,
    flatShading: false
  });
  const fleshMat = new THREE.MeshStandardMaterial({
    color: 0xfbcfe8, // Peach skin tone
    roughness: 0.75,
    metalness: 0.05,
    flatShading: false
  });
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8, // Polished steel armor & weapons
    roughness: 0.16,
    metalness: 0.92,
    flatShading: false
  });
  const darkIronMat = new THREE.MeshStandardMaterial({
    color: 0x334155, // Forged dark iron & mail
    roughness: 0.4,
    metalness: 0.75,
    flatShading: false
  });
  const ironMat = darkIronMat;
  const darkStoneMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.9,
    flatShading: false
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24, // Gilded brass / champion gold
    roughness: 0.18,
    metalness: 0.88,
    flatShading: false
  });
  const leatherMat = new THREE.MeshStandardMaterial({
    color: 0x5c3a21, // Sturdy brown leather
    roughness: 0.78,
    metalness: 0.1,
    flatShading: false
  });
  const darkLeatherMat = new THREE.MeshStandardMaterial({
    color: 0x271c19, // Boots & belts
    roughness: 0.85,
    flatShading: false
  });
  const woodTex = getWoodPlankTexture();
  const woodMat = new THREE.MeshStandardMaterial({
    map: woodTex,
    color: 0x82491a,
    roughness: 0.72,
    metalness: 0.05,
    flatShading: false
  });
  const horseCoatMat = new THREE.MeshStandardMaterial({
    color: 0x3e2312, // Rich chestnut / bay coat
    roughness: 0.75,
    flatShading: false
  });
  const whiteHorseMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0, // Pure white warhorse
    roughness: 0.65,
    flatShading: false
  });
  const canvasMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7, // Padded linen & straw
    roughness: 0.9,
    flatShading: false
  });

  // Dragon materials
  const dragonScalesMat = new THREE.MeshStandardMaterial({
    color: teamCol.clone().multiplyScalar(0.85),
    roughness: 0.28,
    metalness: 0.48,
    flatShading: false
  });
  const dragonBellyMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    roughness: 0.45,
    metalness: 0.12,
    flatShading: false
  });
  const wingMat = new THREE.MeshStandardMaterial({
    color: teamCol.clone().offsetHSL(0.04, 0.3, 0.1),
    roughness: 0.45,
    side: THREE.DoubleSide,
    flatShading: false
  });
  const fireMat = new THREE.MeshBasicMaterial({ color: 0xff4400 });
  const fireGlowMat = new THREE.MeshBasicMaterial({ color: 0xffbb00 });
  const boneMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.5,
    flatShading: false
  });

  // -------------------------------------------------------------
  // UNIT ARCHETYPES
  // -------------------------------------------------------------
  switch (unit.type) {
    case 'worker': {
      // 1. Torso with Leather Apron & Faction Tunic
      const torsoGroup = new THREE.Group();
      torsoGroup.name = 'unit_torso';
      torsoGroup.position.y = 0.45;

      const tunic = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.65, 10), teamMat);
      torsoGroup.add(tunic);

      const apron = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.45, 0.08), leatherMat);
      apron.position.set(0, -0.08, 0.14);
      torsoGroup.add(apron);

      const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.08, 10), darkLeatherMat);
      belt.position.y = -0.05;
      torsoGroup.add(belt);

      const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.04), goldMat);
      buckle.position.set(0, -0.05, 0.23);
      torsoGroup.add(buckle);

      // Shoulders & Arms
      const lArm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.38, 8), teamClothMat);
      lArm.position.set(-0.25, 0.12, 0);
      lArm.rotation.z = Math.PI / 10;
      torsoGroup.add(lArm);

      const rArm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.38, 8), teamClothMat);
      rArm.position.set(0.25, 0.12, 0);
      rArm.rotation.z = -Math.PI / 10;
      torsoGroup.add(rArm);

      // Head & Hat
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), fleshMat);
      head.position.y = 0.44;
      torsoGroup.add(head);

      // Artisan Wool/Felt Cap with Brim
      const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.04, 8), darkLeatherMat);
      hatBrim.position.y = 0.54;
      torsoGroup.add(hatBrim);

      const hatCrown = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.22, 10), teamDarkMat);
      hatCrown.position.y = 0.65;
      torsoGroup.add(hatCrown);

      // Back-mounted wicker collection basket
      const basket = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.22), woodMat);
      basket.position.set(0, 0.1, -0.22);
      torsoGroup.add(basket);

      root.add(torsoGroup);

      // 2. Legs & Boots
      const lLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.35, 8), darkLeatherMat);
      lLeg.position.set(-0.1, 0.18, 0);
      root.add(lLeg);

      const rLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.35, 8), darkLeatherMat);
      rLeg.position.set(0.1, 0.18, 0);
      root.add(rLeg);

      // 3. Tool Pivot (Chopping Axe / Pickaxe / Hammer)
      const toolPivot = new THREE.Group();
      toolPivot.name = 'tool_pivot';
      toolPivot.position.set(0.28, 0.5, 0.12);

      const toolHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.72, 8), woodMat);
      toolHandle.position.set(0, 0.2, 0);
      toolHandle.rotation.z = Math.PI / 4.5;
      toolPivot.add(toolHandle);

      // Forged Pickaxe / Axe Head
      const pickHead = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.1, 0.09), steelMat);
      pickHead.position.set(0.2, 0.44, 0);
      toolPivot.add(pickHead);

      const pickPoint = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 8), steelMat);
      pickPoint.position.set(0.36, 0.44, 0);
      pickPoint.rotation.z = -Math.PI / 2;
      toolPivot.add(pickPoint);

      root.add(toolPivot);
      break;
    }

    case 'scout': {
      // 1. Agile Light Horse
      const horse = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.55, 1.15), horseCoatMat);
      horse.name = 'horse_body';
      horse.position.y = 0.52;

      // Neck & Muzzle
      const neck = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.48, 0.45), horseCoatMat);
      neck.position.set(0, 0.38, 0.48);
      neck.rotation.x = -Math.PI / 7;
      horse.add(neck);

      const head = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, 0.38), horseCoatMat);
      head.position.set(0, 0.58, 0.72);
      horse.add(head);

      // Mane
      const mane = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.48, 0.15), darkLeatherMat);
      mane.position.set(0, 0.45, 0.38);
      horse.add(mane);

      // 4 Legs
      const legGeom = new THREE.CylinderGeometry(0.07, 0.06, 0.5, 8);
      const legPositions = [
        [-0.18, -0.32, 0.35], [0.18, -0.32, 0.35],
        [-0.18, -0.32, -0.35], [0.18, -0.32, -0.35]
      ];
      legPositions.forEach(([lx, ly, lz]) => {
        const leg = new THREE.Mesh(legGeom, horseCoatMat);
        leg.position.set(lx, ly, lz);
        horse.add(leg);
      });

      // Saddlecloth in faction color
      const saddlecloth = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.3, 0.65), teamMat);
      saddlecloth.position.set(0, 0.1, 0);
      horse.add(saddlecloth);

      root.add(horse);

      // 2. Scout Rider in Light Armor
      const riderTorso = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.6, 10), teamClothMat);
      riderTorso.position.set(0, 0.95, 0.05);
      root.add(riderTorso);

      const riderHead = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), fleshMat);
      riderHead.position.set(0, 1.32, 0.05);
      root.add(riderHead);

      const scoutCap = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.25, 10), darkLeatherMat);
      scoutCap.position.set(0, 1.48, 0.05);
      root.add(scoutCap);

      // 3. Lance Pivot with Scout Pennon
      const lancePivot = new THREE.Group();
      lancePivot.name = 'lance_pivot';
      lancePivot.position.set(0.28, 1.0, 0.15);

      const spearShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.8, 8), woodMat);
      spearShaft.position.set(0, 0.4, 0);
      spearShaft.rotation.x = Math.PI / 10;
      lancePivot.add(spearShaft);

      const spearTip = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.28, 8), steelMat);
      spearTip.position.set(0, 1.35, 0.28);
      spearTip.rotation.x = Math.PI / 10;
      lancePivot.add(spearTip);

      const pennon = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.25, 0.5), teamMat);
      pennon.position.set(0, 1.15, 0.05);
      lancePivot.add(pennon);

      root.add(lancePivot);
      break;
    }

    case 'basic_infantry': {
      // 1. Man-at-Arms Armored Torso with Chainmail & Breastplate
      const torsoGroup = new THREE.Group();
      torsoGroup.name = 'unit_torso';
      torsoGroup.position.y = 0.5;

      const chainmail = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.72, 10), darkIronMat);
      torsoGroup.add(chainmail);

      // Steel Cuirass Breastplate
      const breastplate = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.25, 0.45, 10), steelMat);
      breastplate.position.set(0, 0.08, 0.04);
      torsoGroup.add(breastplate);

      // Faction Crest Inlay on chest
      const crest = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), teamMat);
      crest.position.set(0, 0.12, 0.26);
      torsoGroup.add(crest);

      // Steel Pauldrons (Shoulder guards)
      const pauldronGeom = new THREE.SphereGeometry(0.12, 10, 8);
      const lPauldron = new THREE.Mesh(pauldronGeom, steelMat);
      lPauldron.position.set(-0.28, 0.24, 0);
      torsoGroup.add(lPauldron);

      const rPauldron = new THREE.Mesh(pauldronGeom, steelMat);
      rPauldron.position.set(0.28, 0.24, 0);
      torsoGroup.add(rPauldron);

      // Greathelm with eye slits & team plume
      const helm = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.32, 10), steelMat);
      helm.position.y = 0.48;
      torsoGroup.add(helm);

      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.04), darkIronMat);
      visor.position.set(0, 0.48, 0.18);
      torsoGroup.add(visor);

      const plume = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.28, 0.2), teamMat);
      plume.position.set(0, 0.7, -0.04);
      torsoGroup.add(plume);

      root.add(torsoGroup);

      // 2. Greaves & Sabatons (Legs & armored boots)
      const lGreave = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.36, 8), steelMat);
      lGreave.position.set(-0.11, 0.18, 0);
      root.add(lGreave);

      const rGreave = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.36, 8), steelMat);
      rGreave.position.set(0.11, 0.18, 0);
      root.add(rGreave);

      // 3. Sword Pivot with Broad Arming Sword
      const swordPivot = new THREE.Group();
      swordPivot.name = 'sword_pivot';
      swordPivot.position.set(0.3, 0.54, 0.15);

      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.85, 0.14), steelMat);
      blade.position.set(0, 0.4, 0);
      swordPivot.add(blade);

      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.32), goldMat);
      guard.position.set(0, 0.05, 0);
      swordPivot.add(guard);

      const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.06, 4, 4), goldMat);
      pommel.position.set(0, -0.12, 0);
      swordPivot.add(pommel);

      root.add(swordPivot);

      // 4. Shield Pivot with Heater Shield & Team Heraldry
      const shieldPivot = new THREE.Group();
      shieldPivot.name = 'shield_pivot';
      shieldPivot.position.set(-0.3, 0.54, 0.1);

      const shield = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, 0.42), teamMat);
      shieldPivot.add(shield);

      const shieldRim = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.62, 0.04), steelMat);
      shieldPivot.add(shieldRim);

      const shieldBoss = new THREE.Mesh(new THREE.OctahedronGeometry(0.08, 0), goldMat);
      shieldBoss.position.x = -0.05;
      shieldPivot.add(shieldBoss);

      root.add(shieldPivot);
      break;
    }

    case 'spearman': {
      // 1. Spearman Torso in Scale Corselet & Gambeson
      const torsoGroup = new THREE.Group();
      torsoGroup.name = 'unit_torso';
      torsoGroup.position.y = 0.5;

      const gambeson = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.72, 10), teamMat);
      torsoGroup.add(gambeson);

      const scaleArmor = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.23, 0.4, 10), darkIronMat);
      scaleArmor.position.y = 0.06;
      torsoGroup.add(scaleArmor);

      // Conical Spangenhelm / Kettle Hat
      const kettleHat = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.32, 10), steelMat);
      kettleHat.position.y = 0.52;
      torsoGroup.add(kettleHat);

      const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.04, 8), steelMat);
      hatBrim.position.y = 0.38;
      torsoGroup.add(hatBrim);

      root.add(torsoGroup);

      // 2. Pike Pivot with Stately 2.6m Pike & Leaf Blade
      const pikePivot = new THREE.Group();
      pikePivot.name = 'pike_pivot';
      pikePivot.position.set(0.28, 0.6, 0.15);

      const pikeShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.6, 10), woodMat);
      pikeShaft.position.set(0, 0.8, 0);
      pikeShaft.rotation.x = Math.PI / 18;
      pikePivot.add(pikeShaft);

      const pikeBlade = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.45, 8), steelMat);
      pikeBlade.position.set(0, 2.15, 0.16);
      pikeBlade.rotation.x = Math.PI / 18;
      pikePivot.add(pikeBlade);

      const tassel = new THREE.Mesh(new THREE.SphereGeometry(0.08, 4, 4), teamMat);
      tassel.position.set(0, 1.9, 0.14);
      pikePivot.add(tassel);

      root.add(pikePivot);

      // Forearm Buckler Shield
      const buckler = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.05, 8), steelMat);
      buckler.position.set(-0.28, 0.55, 0.1);
      buckler.rotation.z = Math.PI / 2;
      root.add(buckler);
      break;
    }

    case 'ranged_infantry': {
      // 1. Archer Torso in Leather Brigandine & Hood
      const torsoGroup = new THREE.Group();
      torsoGroup.name = 'unit_torso';
      torsoGroup.position.y = 0.48;

      const tunic = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.22, 0.68, 10), teamMat);
      torsoGroup.add(tunic);

      const leatherVest = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.42, 10), leatherMat);
      leatherVest.position.y = 0.04;
      torsoGroup.add(leatherVest);

      // Archer's Hood & Face
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), fleshMat);
      head.position.y = 0.44;
      torsoGroup.add(head);

      const hood = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.35, 10), teamDarkMat);
      hood.position.y = 0.58;
      torsoGroup.add(hood);

      root.add(torsoGroup);

      // 2. Masterwork Recurve Longbow
      const bowPivot = new THREE.Group();
      bowPivot.name = 'bow_pivot';
      bowPivot.position.set(0.28, 0.55, 0.18);

      const bowLimb = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.035, 5, 14, Math.PI * 0.9), woodMat);
      bowLimb.rotation.y = Math.PI / 2;
      bowPivot.add(bowLimb);

      const bowString = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.78, 3), canvasMat);
      bowString.position.set(0, 0, -0.16);
      bowPivot.add(bowString);

      root.add(bowPivot);

      // 3. Side Quiver with Fletched Arrows
      const quiver = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.58, 10), darkLeatherMat);
      quiver.position.set(-0.16, 0.65, -0.2);
      quiver.rotation.z = Math.PI / 5;
      root.add(quiver);

      // Arrow fletchings visible in quiver
      for (let a = 0; a < 3; a++) {
        const arrowTail = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.12, 0.08), teamMat);
        arrowTail.position.set(-0.16 - a * 0.04, 0.98 + a * 0.03, -0.2);
        root.add(arrowTail);
      }
      break;
    }

    case 'cavalry': {
      // 1. Armored Warhorse (Destrier) with Caparison
      const horse = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.65, 1.25), whiteHorseMat);
      horse.name = 'horse_body';
      horse.position.y = 0.58;

      // Heavy team-colored flowing barding caparison
      const caparison = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.45, 0.95), teamMat);
      caparison.position.set(0, -0.05, 0);
      horse.add(caparison);

      // Muscular Neck & Head with Steel Chamfron
      const neck = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.52, 0.5), whiteHorseMat);
      neck.position.set(0, 0.42, 0.52);
      neck.rotation.x = -Math.PI / 6;
      horse.add(neck);

      const head = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.35, 0.45), whiteHorseMat);
      head.position.set(0, 0.68, 0.8);
      horse.add(head);

      const chamfron = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.32, 0.2), steelMat);
      chamfron.position.set(0, 0.72, 0.88);
      horse.add(chamfron);

      // 4 Powerful Armored Legs
      const legGeom = new THREE.CylinderGeometry(0.08, 0.07, 0.55, 8);
      const legOffsets = [
        [-0.2, -0.36, 0.38], [0.2, -0.36, 0.38],
        [-0.2, -0.36, -0.38], [0.2, -0.36, -0.38]
      ];
      legOffsets.forEach(([lx, ly, lz]) => {
        const leg = new THREE.Mesh(legGeom, whiteHorseMat);
        leg.position.set(lx, ly, lz);
        horse.add(leg);
      });

      root.add(horse);

      // 2. Knight in Full Gothic Plate Armor
      const knight = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.28, 0.68, 10), steelMat);
      knight.position.set(0, 1.1, 0.05);
      root.add(knight);

      // Knightly Greathelm with Flowing Mantling
      const helm = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.35, 10), steelMat);
      helm.position.set(0, 1.55, 0.05);
      root.add(helm);

      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.06), goldMat);
      visor.position.set(0, 1.55, 0.22);
      root.add(visor);

      const knightPlume = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.35, 0.25), teamMat);
      knightPlume.position.set(0, 1.8, -0.05);
      root.add(knightPlume);

      // 3. Heavy Tournament Lance Pivot
      const lancePivot = new THREE.Group();
      lancePivot.name = 'lance_pivot';
      lancePivot.position.set(0.38, 1.1, 0.35);

      const lance = new THREE.Mesh(new THREE.ConeGeometry(0.08, 2.9, 10), teamMat);
      lance.rotation.x = Math.PI / 3;
      lance.position.set(0, 0.4, 0.5);
      lancePivot.add(lance);

      const vamplate = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.15, 10), steelMat);
      vamplate.position.set(0, -0.1, -0.3);
      lancePivot.add(vamplate);

      root.add(lancePivot);
      break;
    }

    case 'siege_unit': {
      // 1. Reinforced Timber Chassis & Heavy Wheels
      const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.32, 1.7), woodMat);
      chassis.position.y = 0.32;
      root.add(chassis);

      // Iron corner strapping
      const strap1 = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.06, 0.1), ironMat);
      strap1.position.set(0, 0.32, 0.7);
      root.add(strap1);
      const strap2 = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.06, 0.1), ironMat);
      strap2.position.set(0, 0.32, -0.7);
      root.add(strap2);

      // 4 Iron-Rimmed Heavy Spoked Wheels
      const wheelGeom = new THREE.CylinderGeometry(0.32, 0.32, 0.14, 12);
      wheelGeom.rotateZ(Math.PI / 2);
      const wheels = [
        [-0.68, 0.32, -0.6], [0.68, 0.32, -0.6],
        [-0.68, 0.32, 0.6], [0.68, 0.32, 0.6]
      ];
      wheels.forEach(([wx, wy, wz]) => {
        const wheel = new THREE.Mesh(wheelGeom, darkIronMat);
        wheel.position.set(wx, wy, wz);
        root.add(wheel);

        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.18, 10), goldMat);
        hub.position.set(wx, wy, wz);
        hub.rotation.z = Math.PI / 2;
        root.add(hub);
      });

      // 2. Heavy A-frame Uprights
      const frameL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.4, 8), woodMat);
      frameL.position.set(-0.45, 0.9, -0.1);
      root.add(frameL);

      const frameR = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.4, 8), woodMat);
      frameR.position.set(0.45, 0.9, -0.1);
      root.add(frameR);

      // 3. Catapult Throwing Arm Pivot
      const armPivot = new THREE.Group();
      armPivot.name = 'arm_pivot';
      armPivot.position.set(0, 0.85, -0.15);

      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.8, 0.16), woodMat);
      arm.position.set(0, 0.8, 0);
      arm.rotation.x = -Math.PI / 4.2;
      armPivot.add(arm);

      // Heavy Counterweight Box
      const counterweight = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 0.4), darkStoneMat);
      counterweight.position.set(0, -0.25, 0.2);
      armPivot.add(counterweight);

      // Throwing Sling Bucket loaded with Burning Boulder
      const bucket = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.5), ironMat);
      bucket.position.set(0, 1.6, -0.45);
      armPivot.add(bucket);

      const fieryBoulder = new THREE.Mesh(new THREE.DodecahedronGeometry(0.24, 0), fireGlowMat);
      fieryBoulder.position.set(0, 1.75, -0.45);
      armPivot.add(fieryBoulder);

      root.add(armPivot);
      break;
    }

    case 'advanced_unit': {
      // 1. Royal Champion in Gilded Imperial Plate Armor
      const torsoGroup = new THREE.Group();
      torsoGroup.name = 'unit_torso';
      torsoGroup.position.y = 0.62;

      const cuirass = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.33, 0.88, 10), steelMat);
      torsoGroup.add(cuirass);

      // Gilded Royal Filigree & Lion Crest
      const goldTrim = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.12, 10), goldMat);
      goldTrim.position.y = 0.1;
      torsoGroup.add(goldTrim);

      const chestEmblem = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), goldMat);
      chestEmblem.position.set(0, 0.22, 0.3);
      torsoGroup.add(chestEmblem);

      // Massive Lion Pauldrons
      const lPauldron = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 0.26), goldMat);
      lPauldron.position.set(-0.35, 0.32, 0);
      torsoGroup.add(lPauldron);

      const rPauldron = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 0.26), goldMat);
      rPauldron.position.set(0.35, 0.32, 0);
      torsoGroup.add(rPauldron);

      // Knightly Frogmouth Helm with Triple Plume
      const helm = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.45, 10), steelMat);
      helm.position.y = 0.62;
      torsoGroup.add(helm);

      const plume1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.38, 0.25), teamMat);
      plume1.position.set(0, 0.9, -0.05);
      torsoGroup.add(plume1);

      // Royal Cape flowing on back
      const cape = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.85, 0.06), teamMat);
      cape.position.set(0, 0.05, -0.32);
      cape.rotation.x = Math.PI / 18;
      torsoGroup.add(cape);

      root.add(torsoGroup);

      // 2. Swiss Halberd / Poleaxe Pivot
      const halberdPivot = new THREE.Group();
      halberdPivot.name = 'halberd_pivot';
      halberdPivot.position.set(0.38, 0.95, 0.18);

      const halberdShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.6, 10), darkIronMat);
      halberdShaft.position.set(0, 0.6, 0);
      halberdPivot.add(halberdShaft);

      // Crescent Battleaxe Blade
      const axeBlade = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.55, 0.4), goldMat);
      axeBlade.position.set(0, 1.6, 0.12);
      halberdPivot.add(axeBlade);

      // Armor-piercing top spike
      const topSpike = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.45, 8), steelMat);
      topSpike.position.set(0, 2.05, 0);
      halberdPivot.add(topSpike);

      root.add(halberdPivot);
      break;
    }

    case 'dragon': {
      // 1. Dragon Torso (muscular serpentine chest and abdomen)
      const torso = new THREE.Mesh(new THREE.ConeGeometry(0.65, 2.0, 7), dragonScalesMat);
      torso.name = 'dragon_torso';
      torso.rotation.x = Math.PI / 2.2;
      torso.position.set(0, 0, 0);
      root.add(torso);

      // Underbelly scales (golden / pale underplate)
      const belly = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.52, 1.4, 10), dragonBellyMat);
      belly.position.set(0, -0.18, 0.1);
      belly.rotation.x = Math.PI / 2.2;
      root.add(belly);

      // Dorsal Armor Spine Ridges running down the back
      for (let s = 0; s < 5; s++) {
        const spine = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.35, 8), boneMat);
        spine.position.set(0, 0.4 - s * 0.05, 0.6 - s * 0.4);
        spine.rotation.x = -Math.PI / 8;
        root.add(spine);
      }

      // 2. Articulated Neck
      const neckGroup = new THREE.Group();
      neckGroup.name = 'dragon_neck';
      neckGroup.position.set(0, 0.3, 0.85);

      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.42, 1.2, 10), dragonScalesMat);
      neck.position.set(0, 0.35, 0.35);
      neck.rotation.x = Math.PI / 4;
      neckGroup.add(neck);

      // 3. Head & Maw
      const headGroup = new THREE.Group();
      headGroup.name = 'dragon_head';
      headGroup.position.set(0, 0.8, 0.8);

      const cranium = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.95, 5), dragonScalesMat);
      cranium.rotation.x = Math.PI / 2.2;
      cranium.position.set(0, 0.1, 0.3);
      headGroup.add(cranium);

      const jaw = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.75, 8), dragonScalesMat);
      jaw.name = 'dragon_jaw';
      jaw.rotation.x = Math.PI / 2.05;
      jaw.position.set(0, -0.12, 0.28);
      headGroup.add(jaw);

      const flameEmitter = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), fireMat);
      flameEmitter.name = 'flame_emitter';
      flameEmitter.position.set(0, -0.02, 0.6);
      headGroup.add(flameEmitter);

      const innerGlow = new THREE.PointLight(0xff6600, 1.5, 4);
      innerGlow.position.set(0, 0, 0.5);
      headGroup.add(innerGlow);

      // 4 Sweeping Horns
      const hornGeom = new THREE.ConeGeometry(0.09, 0.75, 5);
      const leftHorn1 = new THREE.Mesh(hornGeom, boneMat);
      leftHorn1.position.set(-0.22, 0.3, -0.15);
      leftHorn1.rotation.set(-Math.PI / 4, 0, -Math.PI / 5);
      headGroup.add(leftHorn1);

      const rightHorn1 = new THREE.Mesh(hornGeom, boneMat);
      rightHorn1.position.set(0.22, 0.3, -0.15);
      rightHorn1.rotation.set(-Math.PI / 4, 0, Math.PI / 5);
      headGroup.add(rightHorn1);

      const leftHorn2 = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.45, 8), boneMat);
      leftHorn2.position.set(-0.25, 0.15, -0.05);
      leftHorn2.rotation.set(-Math.PI / 5, 0, -Math.PI / 3);
      headGroup.add(leftHorn2);

      const rightHorn2 = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.45, 8), boneMat);
      rightHorn2.position.set(0.25, 0.15, -0.05);
      rightHorn2.rotation.set(-Math.PI / 5, 0, Math.PI / 3);
      headGroup.add(rightHorn2);

      // Glowing Fire Eyes
      const eyeGeom = new THREE.SphereGeometry(0.08, 4, 4);
      const leftEye = new THREE.Mesh(eyeGeom, fireGlowMat);
      leftEye.position.set(-0.17, 0.16, 0.28);
      headGroup.add(leftEye);

      const rightEye = new THREE.Mesh(eyeGeom, fireGlowMat);
      rightEye.position.set(0.17, 0.16, 0.28);
      headGroup.add(rightEye);

      neckGroup.add(headGroup);
      root.add(neckGroup);

      // 4. Long Serpentine Tail
      const tailGroup = new THREE.Group();
      tailGroup.name = 'dragon_tail';
      tailGroup.position.set(0, -0.1, -1.0);

      const tail1 = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.6, 5), dragonScalesMat);
      tail1.position.set(0, 0, -0.7);
      tail1.rotation.x = -Math.PI / 2.05;
      tailGroup.add(tail1);

      const tail2 = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1.4, 8), dragonScalesMat);
      tail2.position.set(0, 0.1, -2.0);
      tail2.rotation.x = -Math.PI / 2.15;
      tailGroup.add(tail2);

      const tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.45, 0.6), boneMat);
      tailFin.position.set(0, 0.22, -2.7);
      tailFin.rotation.x = -Math.PI / 5;
      tailGroup.add(tailFin);

      root.add(tailGroup);

      // 5. Claws & Talons
      const talonGeom = new THREE.ConeGeometry(0.06, 0.35, 8);
      const frontLeftClaw = new THREE.Mesh(talonGeom, boneMat);
      frontLeftClaw.position.set(-0.35, -0.4, 0.4);
      frontLeftClaw.rotation.x = Math.PI / 3;
      root.add(frontLeftClaw);

      const frontRightClaw = new THREE.Mesh(talonGeom, boneMat);
      frontRightClaw.position.set(0.35, -0.4, 0.4);
      frontRightClaw.rotation.x = Math.PI / 3;
      root.add(frontRightClaw);

      const rearLeftClaw = new THREE.Mesh(talonGeom, boneMat);
      rearLeftClaw.position.set(-0.35, -0.35, -0.6);
      rearLeftClaw.rotation.x = Math.PI / 4;
      root.add(rearLeftClaw);

      const rearRightClaw = new THREE.Mesh(talonGeom, boneMat);
      rearRightClaw.position.set(0.35, -0.35, -0.6);
      rearRightClaw.rotation.x = Math.PI / 4;
      root.add(rearRightClaw);

      // 6. Magnificent Articulated Wings
      const leftWing = new THREE.Group();
      leftWing.name = 'left_wing';
      leftWing.position.set(-0.45, 0.25, 0.35);

      const armBone1 = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 1.5, 8), boneMat);
      armBone1.position.set(-0.65, 0.2, 0);
      armBone1.rotation.z = Math.PI / 2.4;
      leftWing.add(armBone1);

      const armBone2 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 1.6, 8), boneMat);
      armBone2.position.set(-1.8, 0.35, -0.2);
      armBone2.rotation.z = Math.PI / 2.8;
      leftWing.add(armBone2);

      for (let f = 0; f < 3; f++) {
        const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 1.8 - f * 0.3, 3), boneMat);
        finger.position.set(-1.4 - f * 0.4, 0.1, -0.6 - f * 0.4);
        finger.rotation.set(-Math.PI / 6, 0, Math.PI / 3 + f * 0.2);
        leftWing.add(finger);
      }

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

      const rArmBone1 = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 1.5, 8), boneMat);
      rArmBone1.position.set(0.65, 0.2, 0);
      rArmBone1.rotation.z = -Math.PI / 2.4;
      rightWing.add(rArmBone1);

      const rArmBone2 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 1.6, 8), boneMat);
      rArmBone2.position.set(1.8, 0.35, -0.2);
      rArmBone2.rotation.z = -Math.PI / 2.8;
      rightWing.add(rArmBone2);

      for (let f = 0; f < 3; f++) {
        const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 1.8 - f * 0.3, 3), boneMat);
        finger.position.set(1.4 + f * 0.4, 0.1, -0.6 - f * 0.4);
        finger.rotation.set(-Math.PI / 6, 0, -Math.PI / 3 - f * 0.2);
        rightWing.add(finger);
      }

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
  }

  // Tag every mesh with entityId for raycast selection and enable shadows
  root.traverse((child: any) => {
    if ((child as THREE.Mesh).isMesh) {
      child.userData = { entityType: 'unit', entityId: unit.id };
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return root;
}
