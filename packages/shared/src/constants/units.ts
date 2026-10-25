import { UnitType, AgeName, Resources, BuildingType } from '../types/game.js';

export interface UnitDefinition {
  type: UnitType;
  name: string;
  description: string;
  role: string;
  producedAt: BuildingType;
  requiredAge: AgeName;
  cost: Resources;
  trainingTime: number; // in seconds
  hp: number;
  speed: number; // tiles per second
  damage: number;
  attackRange: number; // in tiles
  attackCooldown: number; // in seconds
  visionRange: number; // in tiles
  populationCost: number;
  isFlying?: boolean;
  bonusMultiplierVs?: Partial<Record<UnitType | 'buildings', number>>;
}

export const UNIT_DEFINITIONS: Record<UnitType, UnitDefinition> = {
  worker: {
    type: 'worker',
    name: 'Citizen Worker',
    description: 'Constructs settlements, repairs damaged structures, and harvests vital raw resources.',
    role: 'Economic',
    producedAt: 'town_centre',
    requiredAge: 'Founding Age',
    cost: { food: 50, wood: 0, stone: 0, metal: 0, knowledge: 0 },
    trainingTime: 5,
    hp: 45,
    speed: 3.2,
    damage: 4,
    attackRange: 1.0,
    attackCooldown: 1.2,
    visionRange: 6,
    populationCost: 1
  },
  scout: {
    type: 'scout',
    name: 'Pathfinder Scout',
    description: 'Swift reconnaissance rider equipped with superior vision for discovering territory and enemy troop movements.',
    role: 'Reconnaissance',
    producedAt: 'town_centre',
    requiredAge: 'Founding Age',
    cost: { food: 70, wood: 20, stone: 0, metal: 0, knowledge: 0 },
    trainingTime: 6,
    hp: 75,
    speed: 5.2,
    damage: 6,
    attackRange: 1.1,
    attackCooldown: 1.1,
    visionRange: 12,
    populationCost: 1
  },
  basic_infantry: {
    type: 'basic_infantry',
    name: 'Frontline Infantry',
    description: 'Stalwart sword and shield soldiers that form the core assault and garrison frontline.',
    role: 'Melee Infantry',
    producedAt: 'barracks',
    requiredAge: 'Founding Age',
    cost: { food: 60, wood: 25, stone: 0, metal: 10, knowledge: 0 },
    trainingTime: 8,
    hp: 110,
    speed: 3.4,
    damage: 13,
    attackRange: 1.1,
    attackCooldown: 1.2,
    visionRange: 7,
    populationCost: 1,
    bonusMultiplierVs: {
      spearman: 1.4,
      buildings: 1.2
    }
  },
  spearman: {
    type: 'spearman',
    name: 'Phalanx Spearman',
    description: 'Anti-cavalry specialist armed with long pikes capable of impaling mounted flankers.',
    role: 'Anti-Cavalry',
    producedAt: 'barracks',
    requiredAge: 'Founding Age',
    cost: { food: 50, wood: 40, stone: 0, metal: 5, knowledge: 0 },
    trainingTime: 8,
    hp: 95,
    speed: 3.3,
    damage: 10,
    attackRange: 1.3,
    attackCooldown: 1.2,
    visionRange: 7,
    populationCost: 1,
    bonusMultiplierVs: {
      cavalry: 2.8,
      scout: 2.2
    }
  },
  ranged_infantry: {
    type: 'ranged_infantry',
    name: 'Marksman',
    description: 'Deadly ranged archers and crossbowmen that shower enemy ranks with volleys from a safe distance.',
    role: 'Ranged Support',
    producedAt: 'archery_range',
    requiredAge: 'Kingdom Age',
    cost: { food: 40, wood: 60, stone: 0, metal: 15, knowledge: 0 },
    trainingTime: 9,
    hp: 70,
    speed: 3.1,
    damage: 14,
    attackRange: 6.5,
    attackCooldown: 1.5,
    visionRange: 9,
    populationCost: 1,
    bonusMultiplierVs: {
      spearman: 1.5,
      worker: 1.8
    }
  },
  cavalry: {
    type: 'cavalry',
    name: 'Heavy Lancer',
    description: 'Armored shock cavalry designed to overrun ranged lines and execute lightning flank maneuvers.',
    role: 'Shock Flanker',
    producedAt: 'stable',
    requiredAge: 'Kingdom Age',
    cost: { food: 80, wood: 30, stone: 0, metal: 60, knowledge: 0 },
    trainingTime: 11,
    hp: 170,
    speed: 4.8,
    damage: 20,
    attackRange: 1.2,
    attackCooldown: 1.4,
    visionRange: 8,
    populationCost: 2,
    bonusMultiplierVs: {
      ranged_infantry: 2.0,
      siege_unit: 2.2,
      worker: 2.0
    }
  },
  siege_unit: {
    type: 'siege_unit',
    name: 'Bombard Siege Engine',
    description: 'Long-range destructive siege apparatus that demolishes fortifications and walls from afar.',
    role: 'Fortress Breaker',
    producedAt: 'workshop',
    requiredAge: 'Imperial Age',
    cost: { food: 0, wood: 140, stone: 50, metal: 90, knowledge: 0 },
    trainingTime: 14,
    hp: 140,
    speed: 2.1,
    damage: 48,
    attackRange: 10.0,
    attackCooldown: 3.2,
    visionRange: 10,
    populationCost: 3,
    bonusMultiplierVs: {
      buildings: 4.5
    }
  },
  advanced_unit: {
    type: 'advanced_unit',
    name: 'Imperial Guard',
    description: 'Elite royal champion equipped with two-handed halberd, full gothic plate armor, and devastating cleave damage.',
    role: 'Apex Combatant',
    producedAt: 'fort',
    requiredAge: 'Imperial Age',
    cost: { food: 120, wood: 40, stone: 0, metal: 120, knowledge: 20 },
    trainingTime: 14,
    hp: 280,
    speed: 3.6,
    damage: 34,
    attackRange: 2.5,
    attackCooldown: 1.3,
    visionRange: 9,
    populationCost: 3,
    bonusMultiplierVs: {
      basic_infantry: 1.6,
      cavalry: 1.5,
      buildings: 1.8
    }
  },
  dragon: {
    type: 'dragon',
    name: 'Aerial War Dragon',
    description: 'Majestic flying draconic leviathan that soars over rivers, cliffs, and walls to rain devastating dragonfire from the sky.',
    role: 'Aerial Dominator',
    producedAt: 'fort',
    requiredAge: 'Imperial Age',
    cost: { food: 150, wood: 40, stone: 0, metal: 120, knowledge: 60 },
    trainingTime: 18,
    hp: 360,
    speed: 5.2,
    damage: 42,
    attackRange: 8.5,
    attackCooldown: 1.6,
    visionRange: 13,
    populationCost: 4,
    isFlying: true,
    bonusMultiplierVs: {
      basic_infantry: 1.8,
      spearman: 2.2,
      siege_unit: 2.5,
      buildings: 1.5
    }
  },
  trade_cart: {
    type: 'trade_cart',
    name: 'Trade Caravan',
    role: 'Economic Trade Caravan',
    description: 'Commercial ox-drawn caravan that travels along trade routes between Markets and Town Centers, generating continuous gold revenue.',
    producedAt: 'market',
    requiredAge: 'Kingdom Age',
    cost: { food: 50, wood: 50, stone: 0, metal: 0, knowledge: 0 },
    trainingTime: 8,
    hp: 100,
    speed: 3.4,
    damage: 0,
    attackRange: 0,
    attackCooldown: 0,
    visionRange: 7,
    populationCost: 1
  }
};
