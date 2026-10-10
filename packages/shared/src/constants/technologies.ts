import { AgeName, Resources } from '../types/game.js';

export interface TechDefinition {
  id: string;
  name: string;
  category: 'Economy' | 'Military' | 'Construction' | 'Exploration' | 'Civilization';
  requiredAge: AgeName;
  prerequisites: string[];
  cost: Resources;
  researchTime: number; // in seconds
  description: string;
  effects: {
    gatherWoodBonus?: number;
    gatherFoodBonus?: number;
    gatherStoneMetalBonus?: number;
    workerCarryBonus?: number;
    infantryDamageBonus?: number;
    rangedDamageBonus?: number;
    rangedRangeBonus?: number;
    cavalryHpBonus?: number;
    cavalrySpeedBonus?: number;
    siegeDamageBonus?: number;
    buildingHpBonus?: number;
    constructionSpeedBonus?: number;
    towerBonus?: number;
    visionBonus?: number;
    movementSpeedBonus?: number;
    maxPopBonus?: number;
    knowledgeRateBonus?: number;
    recruitmentSpeedBonus?: number;
  };
}

export const AGE_ADVANCEMENT_REQUIREMENTS: Record<AgeName, {
  nextAge: AgeName | null;
  cost: Resources;
  researchTime: number;
}> = {
  'Founding Age': {
    nextAge: 'Kingdom Age',
    cost: { food: 250, wood: 150, stone: 0, metal: 0, knowledge: 20 },
    researchTime: 12
  },
  'Kingdom Age': {
    nextAge: 'Imperial Age',
    cost: { food: 500, wood: 300, stone: 150, metal: 100, knowledge: 60 },
    researchTime: 18
  },
  'Imperial Age': {
    nextAge: 'Industrial Age',
    cost: { food: 800, wood: 500, stone: 300, metal: 250, knowledge: 120 },
    researchTime: 25
  },
  'Industrial Age': {
    nextAge: null,
    cost: { food: 0, wood: 0, stone: 0, metal: 0, knowledge: 0 },
    researchTime: 0
  }
};

export const TECHNOLOGIES: Record<string, TechDefinition> = {
  forestry_axes: {
    id: 'forestry_axes',
    name: 'Forestry Axes',
    category: 'Economy',
    requiredAge: 'Founding Age',
    prerequisites: [],
    cost: { food: 50, wood: 80, stone: 0, metal: 0, knowledge: 20 },
    researchTime: 18,
    description: 'Improves logging efficiency, increasing wood gathering rate by 20%.',
    effects: { gatherWoodBonus: 0.20 }
  },
  crop_rotation: {
    id: 'crop_rotation',
    name: 'Crop Rotation',
    category: 'Economy',
    requiredAge: 'Kingdom Age',
    prerequisites: [],
    cost: { food: 100, wood: 100, stone: 0, metal: 0, knowledge: 40 },
    researchTime: 22,
    description: 'Advanced farming techniques increase farm food harvest yield by 25%.',
    effects: { gatherFoodBonus: 0.25 }
  },
  deep_shaft_mining: {
    id: 'deep_shaft_mining',
    name: 'Deep Shaft Mining',
    category: 'Economy',
    requiredAge: 'Kingdom Age',
    prerequisites: [],
    cost: { food: 100, wood: 120, stone: 80, metal: 40, knowledge: 40 },
    researchTime: 24,
    description: 'Excavation tunnels increase stone and metal extraction speeds by 25%.',
    effects: { gatherStoneMetalBonus: 0.25 }
  },
  logistics_caravans: {
    id: 'logistics_caravans',
    name: 'Logistics Caravans',
    category: 'Economy',
    requiredAge: 'Imperial Age',
    prerequisites: ['forestry_axes'],
    cost: { food: 150, wood: 150, stone: 50, metal: 50, knowledge: 80 },
    researchTime: 28,
    description: 'Pack mules and carts increase citizen worker carrying capacity by +5.',
    effects: { workerCarryBonus: 5 }
  },

  forged_blades: {
    id: 'forged_blades',
    name: 'Forged Steel Blades',
    category: 'Military',
    requiredAge: 'Kingdom Age',
    prerequisites: [],
    cost: { food: 80, wood: 50, stone: 0, metal: 70, knowledge: 30 },
    researchTime: 20,
    description: 'Honed edges and tempered steel grant infantry +20% attack damage.',
    effects: { infantryDamageBonus: 0.20 }
  },
  bodkin_arrows: {
    id: 'bodkin_arrows',
    name: 'Bodkin Arrows',
    category: 'Military',
    requiredAge: 'Kingdom Age',
    prerequisites: [],
    cost: { food: 60, wood: 90, stone: 0, metal: 40, knowledge: 30 },
    researchTime: 20,
    description: 'Armor-piercing bodkin arrowheads enhance ranged attack power and +1 attack range.',
    effects: { rangedDamageBonus: 0.20, rangedRangeBonus: 1.0 }
  },
  barding_stirrups: {
    id: 'barding_stirrups',
    name: 'Barding & Stirrups',
    category: 'Military',
    requiredAge: 'Imperial Age',
    prerequisites: [],
    cost: { food: 140, wood: 60, stone: 0, metal: 120, knowledge: 60 },
    researchTime: 25,
    description: 'Reinforced horse armor provides +25% cavalry hitpoints and +10% movement speed.',
    effects: { cavalryHpBonus: 0.25, cavalrySpeedBonus: 0.10 }
  },
  siege_engineering: {
    id: 'siege_engineering',
    name: 'Siege Engineering',
    category: 'Military',
    requiredAge: 'Imperial Age',
    prerequisites: [],
    cost: { food: 0, wood: 200, stone: 100, metal: 120, knowledge: 80 },
    researchTime: 30,
    description: 'Calibrated torsion mechanisms increase siege weapon damage vs structures by 35%.',
    effects: { siegeDamageBonus: 0.35 }
  },

  masonry: {
    id: 'masonry',
    name: 'Reinforced Masonry',
    category: 'Construction',
    requiredAge: 'Founding Age',
    prerequisites: [],
    cost: { food: 0, wood: 80, stone: 100, metal: 0, knowledge: 25 },
    researchTime: 18,
    description: 'Mortar and dressed stone grant all buildings and walls +25% hitpoints.',
    effects: { buildingHpBonus: 0.25 }
  },
  architecture: {
    id: 'architecture',
    name: 'Urban Architecture',
    category: 'Construction',
    requiredAge: 'Kingdom Age',
    prerequisites: ['masonry'],
    cost: { food: 0, wood: 120, stone: 140, metal: 40, knowledge: 50 },
    researchTime: 22,
    description: 'Standardized blueprints speed up construction of all buildings by 25%.',
    effects: { constructionSpeedBonus: 0.25 }
  },
  arrow_slits: {
    id: 'arrow_slits',
    name: 'Arrow Slits & Machicolations',
    category: 'Construction',
    requiredAge: 'Kingdom Age',
    prerequisites: ['masonry'],
    cost: { food: 0, wood: 70, stone: 150, metal: 30, knowledge: 40 },
    researchTime: 20,
    description: 'Embrasures increase defensive tower attack range by +1.5 and attack damage by 25%.',
    effects: { towerBonus: 0.25 }
  },

  cartography: {
    id: 'cartography',
    name: 'Cartography',
    category: 'Exploration',
    requiredAge: 'Founding Age',
    prerequisites: [],
    cost: { food: 40, wood: 40, stone: 0, metal: 0, knowledge: 30 },
    researchTime: 15,
    description: 'Detailed grid mapmaking expands the line of sight of all units and buildings by +2 tiles.',
    effects: { visionBonus: 2.0 }
  },
  forced_march: {
    id: 'forced_march',
    name: 'Forced March',
    category: 'Exploration',
    requiredAge: 'Kingdom Age',
    prerequisites: [],
    cost: { food: 80, wood: 50, stone: 0, metal: 20, knowledge: 35 },
    researchTime: 20,
    description: 'Rigorous endurance drilling accelerates infantry march speed by 15%.',
    effects: { movementSpeedBonus: 0.15 }
  },

  urban_planning: {
    id: 'urban_planning',
    name: 'Urban Planning',
    category: 'Civilization',
    requiredAge: 'Founding Age',
    prerequisites: [],
    cost: { food: 80, wood: 80, stone: 40, metal: 0, knowledge: 25 },
    researchTime: 18,
    description: 'Orderly city district zoning grants an immediate +15 maximum population capacity.',
    effects: { maxPopBonus: 15 }
  },
  scholasticism: {
    id: 'scholasticism',
    name: 'Scholasticism',
    category: 'Civilization',
    requiredAge: 'Kingdom Age',
    prerequisites: [],
    cost: { food: 60, wood: 100, stone: 50, metal: 0, knowledge: 60 },
    researchTime: 24,
    description: 'Encourages academic inquiry, accelerating passive and research hall knowledge generation by 30%.',
    effects: { knowledgeRateBonus: 0.30 }
  },
  standing_army: {
    id: 'standing_army',
    name: 'Standing Army',
    category: 'Civilization',
    requiredAge: 'Imperial Age',
    prerequisites: [],
    cost: { food: 150, wood: 120, stone: 60, metal: 100, knowledge: 80 },
    researchTime: 30,
    description: 'Permanent professional garrison reduces military recruitment time by 25%.',
    effects: { recruitmentSpeedBonus: 0.25 }
  }
};
