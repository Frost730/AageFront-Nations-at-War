import { BuildingType, AgeName, Resources } from '../types/game.js';

export interface BuildingDefinition {
  type: BuildingType;
  name: string;
  description: string;
  requiredAge: AgeName;
  cost: Resources;
  constructionTime: number; // in seconds
  hp: number;
  width: number;
  height: number;
  populationProvided: number;
  territoryRadius: number; // in tiles
  visionRange: number;
  attackRange?: number;
  attackDamage?: number;
  attackCooldown?: number;
  dropOffResources?: ('food' | 'wood' | 'stone' | 'metal')[];
}

export const BUILDING_DEFINITIONS: Record<BuildingType, BuildingDefinition> = {
  town_centre: {
    type: 'town_centre',
    name: 'Town Centre',
    description: 'The administrative heart of your civilization. Drops off all resources, trains workers, and advances ages.',
    requiredAge: 'Founding Age',
    cost: { food: 0, wood: 250, stone: 100, metal: 0, knowledge: 0 },
    constructionTime: 25,
    hp: 2400,
    width: 4,
    height: 4,
    populationProvided: 10,
    territoryRadius: 18,
    visionRange: 14,
    attackRange: 7.0,
    attackDamage: 18,
    attackCooldown: 1.2,
    dropOffResources: ['food', 'wood', 'stone', 'metal']
  },
  house: {
    type: 'house',
    name: 'Residential House',
    description: 'Shelters citizens and expands your civilization’s maximum population limit by 5.',
    requiredAge: 'Founding Age',
    cost: { food: 0, wood: 60, stone: 0, metal: 0, knowledge: 0 },
    constructionTime: 6,
    hp: 450,
    width: 2,
    height: 2,
    populationProvided: 5,
    territoryRadius: 4,
    visionRange: 5
  },
  farm: {
    type: 'farm',
    name: 'Agricultural Farm',
    description: 'Sustainable agrarian plots that provide endless food harvesting for workers.',
    requiredAge: 'Founding Age',
    cost: { food: 0, wood: 75, stone: 0, metal: 0, knowledge: 0 },
    constructionTime: 6,
    hp: 350,
    width: 2,
    height: 2,
    populationProvided: 0,
    territoryRadius: 3,
    visionRange: 4,
    dropOffResources: ['food']
  },
  lumber_camp: {
    type: 'lumber_camp',
    name: 'Lumber Camp',
    description: 'Drop-off point for timber harvested by workers in surrounding woodlands.',
    requiredAge: 'Founding Age',
    cost: { food: 0, wood: 80, stone: 0, metal: 0, knowledge: 0 },
    constructionTime: 6,
    hp: 550,
    width: 2,
    height: 2,
    populationProvided: 0,
    territoryRadius: 6,
    visionRange: 6,
    dropOffResources: ['wood']
  },
  quarry: {
    type: 'quarry',
    name: 'Stone Quarry Station',
    description: 'Drop-off depot for stone extracted from rocky outcroppings.',
    requiredAge: 'Founding Age',
    cost: { food: 0, wood: 80, stone: 20, metal: 0, knowledge: 0 },
    constructionTime: 6,
    hp: 600,
    width: 2,
    height: 2,
    populationProvided: 0,
    territoryRadius: 6,
    visionRange: 6,
    dropOffResources: ['stone']
  },
  mining_camp: {
    type: 'mining_camp',
    name: 'Ore Mining Camp',
    description: 'Depot for precious metal and ore extraction from mineral veins.',
    requiredAge: 'Founding Age',
    cost: { food: 0, wood: 90, stone: 25, metal: 0, knowledge: 0 },
    constructionTime: 6,
    hp: 600,
    width: 2,
    height: 2,
    populationProvided: 0,
    territoryRadius: 6,
    visionRange: 6,
    dropOffResources: ['metal']
  },
  barracks: {
    type: 'barracks',
    name: 'Military Barracks',
    description: 'Muster station for foot soldiers, frontline infantry, and spearmen.',
    requiredAge: 'Founding Age',
    cost: { food: 0, wood: 120, stone: 30, metal: 0, knowledge: 0 },
    constructionTime: 10,
    hp: 1100,
    width: 3,
    height: 3,
    populationProvided: 0,
    territoryRadius: 8,
    visionRange: 7
  },
  archery_range: {
    type: 'archery_range',
    name: 'Archery Range',
    description: 'Trains archers, crossbowmen, and riflemen for standoff fire support.',
    requiredAge: 'Kingdom Age',
    cost: { food: 0, wood: 140, stone: 40, metal: 20, knowledge: 0 },
    constructionTime: 10,
    hp: 1000,
    width: 3,
    height: 3,
    populationProvided: 0,
    territoryRadius: 8,
    visionRange: 8
  },
  stable: {
    type: 'stable',
    name: 'Cavalry Stable',
    description: 'Breeds warhorses and equips swift mounted cavalry and heavy shock lancers.',
    requiredAge: 'Kingdom Age',
    cost: { food: 0, wood: 150, stone: 50, metal: 40, knowledge: 0 },
    constructionTime: 12,
    hp: 1200,
    width: 3,
    height: 3,
    populationProvided: 0,
    territoryRadius: 8,
    visionRange: 8
  },
  workshop: {
    type: 'workshop',
    name: 'Siege Workshop',
    description: 'Assembles catapults, ballistas, trebuchets, and heavy artillery.',
    requiredAge: 'Imperial Age',
    cost: { food: 0, wood: 200, stone: 100, metal: 80, knowledge: 0 },
    constructionTime: 14,
    hp: 1400,
    width: 3,
    height: 3,
    populationProvided: 0,
    territoryRadius: 8,
    visionRange: 8
  },
  market: {
    type: 'market',
    name: 'Commercial Market',
    description: 'Fosters economic exchange and generates commercial revenue.',
    requiredAge: 'Kingdom Age',
    cost: { food: 0, wood: 130, stone: 40, metal: 0, knowledge: 0 },
    constructionTime: 8,
    hp: 850,
    width: 3,
    height: 3,
    populationProvided: 0,
    territoryRadius: 8,
    visionRange: 7
  },
  research_hall: {
    type: 'research_hall',
    name: 'Research Academy',
    description: 'Scholarly enclave that generates knowledge and conducts civil, military, and economic research.',
    requiredAge: 'Founding Age',
    cost: { food: 0, wood: 140, stone: 70, metal: 30, knowledge: 0 },
    constructionTime: 12,
    hp: 950,
    width: 3,
    height: 3,
    populationProvided: 0,
    territoryRadius: 8,
    visionRange: 7
  },
  watchtower: {
    type: 'watchtower',
    name: 'Defensive Watchtower',
    description: 'Shoots arrows or bullets at nearby hostile forces and provides territorial visibility.',
    requiredAge: 'Kingdom Age',
    cost: { food: 0, wood: 60, stone: 120, metal: 10, knowledge: 0 },
    constructionTime: 8,
    hp: 1200,
    width: 2,
    height: 2,
    populationProvided: 0,
    territoryRadius: 10,
    visionRange: 12,
    attackRange: 8.0,
    attackDamage: 16,
    attackCooldown: 1.4
  },
  fort: {
    type: 'fort',
    name: 'Grand Fortress',
    description: 'Colossal stronghold, project of immense national power, trains elite advanced units and anchors borders.',
    requiredAge: 'Imperial Age',
    cost: { food: 0, wood: 180, stone: 350, metal: 100, knowledge: 20 },
    constructionTime: 20,
    hp: 3800,
    width: 4,
    height: 4,
    populationProvided: 5,
    territoryRadius: 22,
    visionRange: 15,
    attackRange: 9.5,
    attackDamage: 32,
    attackCooldown: 1.5
  },
  wall: {
    type: 'wall',
    name: 'Stone Wall',
    description: 'Reinforced defensive barrier that prevents enemy movement.',
    requiredAge: 'Founding Age',
    cost: { food: 0, wood: 0, stone: 20, metal: 0, knowledge: 0 },
    constructionTime: 6,
    hp: 800,
    width: 1,
    height: 1,
    populationProvided: 0,
    territoryRadius: 2,
    visionRange: 3
  },
  gate: {
    type: 'gate',
    name: 'Fortified Gate',
    description: 'Permits allied units to pass freely while remaining shut to adversaries.',
    requiredAge: 'Founding Age',
    cost: { food: 0, wood: 20, stone: 50, metal: 0, knowledge: 0 },
    constructionTime: 10,
    hp: 1200,
    width: 2,
    height: 1,
    populationProvided: 0,
    territoryRadius: 3,
    visionRange: 4
  }
};
