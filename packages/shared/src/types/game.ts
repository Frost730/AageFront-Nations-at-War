export type ResourceType = 'food' | 'wood' | 'stone' | 'metal' | 'knowledge';

export interface Resources {
  food: number;
  wood: number;
  stone: number;
  metal: number;
  knowledge: number;
}

export type AgeName = 'Founding Age' | 'Kingdom Age' | 'Imperial Age' | 'Industrial Age';

export type CivName = 'Veyran Confederacy' | 'Solari Dominion' | 'Ironvale Kingdom' | 'Nambara Alliance';

export type VictoryConditionType = 'conquest' | 'territorial' | 'technology' | 'elimination';

export type MapType = 'green_frontier' | 'highland_kingdom' | 'riverlands';

export type AIDifficulty = 'easy' | 'medium' | 'hard';

export type UnitType =
  | 'worker'
  | 'scout'
  | 'basic_infantry'
  | 'spearman'
  | 'ranged_infantry'
  | 'cavalry'
  | 'siege_unit'
  | 'advanced_unit'
  | 'dragon';

export type BuildingType =
  | 'town_centre'
  | 'house'
  | 'farm'
  | 'lumber_camp'
  | 'quarry'
  | 'mining_camp'
  | 'barracks'
  | 'archery_range'
  | 'stable'
  | 'workshop'
  | 'market'
  | 'research_hall'
  | 'watchtower'
  | 'fort'
  | 'wall'
  | 'gate';

export type UnitActionState =
  | 'idle'
  | 'moving'
  | 'gathering'
  | 'returning_resources'
  | 'building'
  | 'repairing'
  | 'attacking'
  | 'dead';

export type UnitStance = 'aggressive' | 'defensive' | 'stand_ground';
export type FormationType = 'line' | 'box' | 'staggered' | 'column';

export interface Vector2D {
  x: number;
  y: number;
}

export interface UnitData {
  id: string;
  type: UnitType;
  ownerId: string;
  team: number;
  x: number;
  y: number;
  targetX?: number;
  targetY?: number;
  path?: Vector2D[];
  hp: number;
  maxHp: number;
  state: UnitActionState;
  targetEntityId?: string;
  carriedResourceType?: ResourceType;
  carriedResourceAmount: number;
  attackCooldown: number;
  gatherCooldown: number;
  facingAngle: number;
  stuckTicks?: number;
  stance?: UnitStance;
  guardX?: number;
  guardY?: number;
}

export interface BuildingData {
  id: string;
  type: BuildingType;
  ownerId: string;
  team: number;
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  isConstructed: boolean;
  constructionProgress: number; // 0 to 100
  productionQueue: {
    id: string;
    itemType: UnitType | string; // unit or tech
    category: 'unit' | 'tech' | 'age';
    progress: number;
    totalTime: number;
  }[];
  rallyPoint?: Vector2D & {
    targetEntityId?: string;
    targetType?: 'ground' | 'resource' | 'building';
  };
  attackCooldown?: number;
}

export interface ResourceNodeData {
  id: string;
  type: ResourceType;
  x: number;
  y: number;
  amount: number;
  maxAmount: number;
}

export interface PlayerStats {
  score: number;
  enemiesDefeated: number;
  buildingsConstructed: number;
  resourcesGathered: Resources;
  technologiesResearched: number;
}

export interface PlayerState {
  id: string;
  name: string;
  team: number;
  civ: CivName;
  color: string;
  isAi: boolean;
  aiDifficulty?: AIDifficulty;
  age: AgeName;
  resources: Resources;
  population: number;
  maxPopulation: number;
  researchedTechs: string[];
  isDefeated: boolean;
  isVictorious: boolean;
  stats: PlayerStats;
}

export interface MapTile {
  terrain: 'grass' | 'forest' | 'mountain' | 'water' | 'sand';
  elevation: number;
  walkable: boolean;
  territoryOwnerId?: string;
  territoryTeam?: number;
}

export interface GameSettings {
  mapType: MapType;
  mapSize: number; // e.g. 100x100
  seed: number;
  victoryCondition: VictoryConditionType;
  startingResources: 'standard' | 'high' | 'deathmatch';
  sharedTeamEconomy: boolean;
  aiDifficulty: AIDifficulty;
}
