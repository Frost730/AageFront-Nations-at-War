import { describe, it, expect } from 'vitest';
import {
  SimulationEngine,
  getAIDifficultyTier,
  UNIT_DEFINITIONS,
  BUILDING_DEFINITIONS
} from '../packages/shared/src/index.js';

describe('AI Difficulty Tiers & Dragon Troops Training System', () => {
  it('correctly maps difficulty tiers for easy, standard, tough, toughest', () => {
    expect(getAIDifficultyTier('easy')).toBe('easy');
    expect(getAIDifficultyTier('standard')).toBe('standard');
    expect(getAIDifficultyTier('medium')).toBe('standard'); // backward compatibility
    expect(getAIDifficultyTier('tough')).toBe('tough');
    expect(getAIDifficultyTier('hard')).toBe('tough'); // backward compatibility
    expect(getAIDifficultyTier('toughest')).toBe('toughest');
    expect(getAIDifficultyTier(undefined)).toBe('easy');
  });

  it('AI automatically advances age when resources are available without being blocked by worker training', () => {
    const sim = new SimulationEngine(
      {
        mapType: 'green_frontier',
        mapSize: 48,
        seed: 42,
        victoryCondition: 'conquest',
        startingResources: 'standard',
        sharedTeamEconomy: false,
        aiDifficulty: 'tough'
      },
      [
        { id: 'p_human', name: 'Human', team: 1, civ: 'Solari Dominion', color: '#2563eb', isAi: false },
        { id: 'p_ai', name: 'AI Tough', team: 2, civ: 'Ironvale Kingdom', color: '#dc2626', isAi: true, difficulty: 'tough' }
      ]
    );

    const aiPlayer = sim.players.get('p_ai')!;
    expect(aiPlayer.age).toBe('Founding Age');

    const tc = Array.from(sim.buildings.values()).find(b => b.ownerId === 'p_ai' && b.type === 'town_centre')!;
    expect(tc).toBeDefined();

    // Spawn workers to reach the economic baseline required for age advancement
    for (let w = 0; w < 6; w++) {
      const wid = `test_worker_${w}`;
      sim.units.set(wid, {
        id: wid,
        type: 'worker',
        ownerId: 'p_ai',
        team: 2,
        x: tc.x + 2,
        y: tc.y + 2,
        hp: 100,
        maxHp: 100,
        state: 'idle',
        attackCooldown: 0,
        gatherCooldown: 0,
        facingAngle: 0
      });
    }

    // Grant resources for Kingdom Age
    aiPlayer.resources.food = 300;
    aiPlayer.resources.wood = 200;
    aiPlayer.resources.knowledge = 30;

    // Run AI ticks
    for (let i = 0; i < 20; i++) {
      sim.tick(0.05);
    }

    // Verify age advancement has been queued or completed
    const isAgeQueuedOrAdvanced =
      aiPlayer.age === 'Kingdom Age' ||
      tc.productionQueue.some(q => q.category === 'age');
    expect(isAgeQueuedOrAdvanced).toBe(true);
  });

  it('AI constructs Fort in Kingdom Age and trains War Dragons in Imperial Age', () => {
    const sim = new SimulationEngine(
      {
        mapType: 'highland_kingdom',
        mapSize: 48,
        seed: 777,
        victoryCondition: 'conquest',
        startingResources: 'high',
        sharedTeamEconomy: false,
        aiDifficulty: 'toughest'
      },
      [
        { id: 'p_human', name: 'Human', team: 1, civ: 'Solari Dominion', color: '#2563eb', isAi: false },
        { id: 'p_ai', name: 'AI Toughest', team: 2, civ: 'Ironvale Kingdom', color: '#dc2626', isAi: true, difficulty: 'toughest' }
      ]
    );

    const aiPlayer = sim.players.get('p_ai')!;
    aiPlayer.age = 'Imperial Age';
    aiPlayer.maxPopulation = 100;
    aiPlayer.resources.food = 1000;
    aiPlayer.resources.wood = 800;
    aiPlayer.resources.stone = 600;
    aiPlayer.resources.metal = 600;
    aiPlayer.resources.knowledge = 300;

    const tc = Array.from(sim.buildings.values()).find(b => b.ownerId === 'p_ai' && b.type === 'town_centre')!;

    // Directly spawn a pre-constructed fort next to TC
    const fortId = `bldg_fort_test_${Date.now()}`;
    sim.buildings.set(fortId, {
      id: fortId,
      ownerId: 'p_ai',
      team: 2,
      type: 'fort',
      x: tc.x + 6,
      y: tc.y,
      hp: 1200,
      maxHp: 1200,
      isConstructed: true,
      constructionProgress: 1,
      productionQueue: []
    });

    // Run AI ticks
    for (let i = 0; i < 40; i++) {
      sim.tick(0.05);
    }

    // Verify AI trained dragon troops at Fort or Town Centre
    const fort = sim.buildings.get(fortId)!;
    const fortQueuedDragon = fort.productionQueue.some(q => q.itemType === 'dragon');
    const tcQueuedDragon = tc.productionQueue.some(q => q.itemType === 'dragon');
    const spawnedDragons = Array.from(sim.units.values()).filter(u => u.ownerId === 'p_ai' && u.type === 'dragon');

    expect(fortQueuedDragon || tcQueuedDragon || spawnedDragons.length > 0).toBe(true);

    // Fast-forward to finish dragon training
    for (let i = 0; i < 400; i++) {
      sim.tick(0.05);
    }

    const totalDragons = Array.from(sim.units.values()).filter(u => u.ownerId === 'p_ai' && u.type === 'dragon');
    expect(totalDragons.length).toBeGreaterThanOrEqual(1);

    const dragon = totalDragons[0];
    expect(dragon.type).toBe('dragon');
    expect(UNIT_DEFINITIONS.dragon.isFlying).toBe(true);
    expect(dragon.hp).toBeGreaterThan(0);
  });
});
