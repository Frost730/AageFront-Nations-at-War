import { CivName } from '../types/game.js';

export interface CivBonus {
  name: CivName;
  description: string;
  color: string;
  secondaryColor: string;
  gatherRateMultiplier: number;
  researchSpeedMultiplier: number;
  buildingHpMultiplier: number;
  militarySpeedMultiplier: number;
  specialTrait: string;
}

export const CIVILIZATIONS: Record<CivName, CivBonus> = {
  'Veyran Confederacy': {
    name: 'Veyran Confederacy',
    description: 'Masters of commerce and resource exploitation with flexible logistical networks.',
    color: '#2563eb', // Blue
    secondaryColor: '#60a5fa',
    gatherRateMultiplier: 1.15,
    researchSpeedMultiplier: 1.0,
    buildingHpMultiplier: 1.0,
    militarySpeedMultiplier: 1.0,
    specialTrait: '+15% Gathering Rate, Cheaper Economic Camps'
  },
  'Solari Dominion': {
    name: 'Solari Dominion',
    description: 'Scholars of the sun who accelerate technological enlightenment and advanced weaponry.',
    color: '#eab308', // Gold
    secondaryColor: '#fde047',
    gatherRateMultiplier: 1.0,
    researchSpeedMultiplier: 1.25,
    buildingHpMultiplier: 1.0,
    militarySpeedMultiplier: 1.0,
    specialTrait: '+25% Tech Research Speed, Generates Knowledge over time'
  },
  'Ironvale Kingdom': {
    name: 'Ironvale Kingdom',
    description: 'Unyielding mountain fortress builders with heavily armored troops and sturdy walls.',
    color: '#dc2626', // Red
    secondaryColor: '#f87171',
    gatherRateMultiplier: 1.0,
    researchSpeedMultiplier: 1.0,
    buildingHpMultiplier: 1.30,
    militarySpeedMultiplier: 0.95,
    specialTrait: '+30% Building & Fortification HP, Stronger Infantry'
  },
  'Nambara Alliance': {
    name: 'Nambara Alliance',
    description: 'Swift nomadic steppe raiders with unparalleled reconnaissance and mounted cavalry.',
    color: '#16a34a', // Green
    secondaryColor: '#4ade80',
    gatherRateMultiplier: 1.0,
    researchSpeedMultiplier: 1.0,
    buildingHpMultiplier: 1.0,
    militarySpeedMultiplier: 1.20,
    specialTrait: '+20% Mounted & Scout Speed, +3 Extra Vision Range'
  }
};
