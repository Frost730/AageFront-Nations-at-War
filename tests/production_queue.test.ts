import { describe, it, expect } from 'vitest';
import {
  SimulationEngine,
  UNIT_DEFINITIONS,
  TECHNOLOGIES,
  AGE_ADVANCEMENT_REQUIREMENTS
} from '../packages/shared/src/index.js';

describe('Production Queuing System (AoE & RoN Style)', () => {
  const initialPlayers = [
    { id: 'p1', name: 'Player 1', team: 1, civ: 'Veyran Confederacy' as const, color: '#2563eb', isAi: false },
    { id: 'p2', name: 'Player 2', team: 2, civ: 'Ironvale Kingdom' as const, color: '#dc2626', isAi: true }
  ];

  function createSim() {
    return new SimulationEngine({
      mapType: 'green_frontier',
      mapSize: 60,
      seed: 42,
      victoryCondition: 'conquest',
      startingResources: 'standard',
      sharedTeamEconomy: false,
      aiDifficulty: 'medium'
    }, initialPlayers);
  }

  it('enforces maximum 15 items in production queue', () => {
    const sim = createSim();
    const p1 = sim.players.get('p1')!;
    p1.resources.food = 10000;
    p1.maxPopulation = 100;

    const townCenter = Array.from(sim.buildings.values()).find(b => b.ownerId === 'p1' && b.type === 'town_centre')!;
    expect(townCenter).toBeDefined();

    // Queue 15 workers
    for (let i = 0; i < 15; i++) {
      const res = sim.processCommand('p1', {
        type: 'TRAIN_UNIT',
        buildingId: townCenter.id,
        unitType: 'worker'
      });
      expect(res).toBe(true);
    }

    expect(townCenter.productionQueue.length).toBe(15);

    // Attempting 16th item should fail and not deduct resources or pop
    const foodBefore = p1.resources.food;
    const popBefore = p1.population;
    const res16 = sim.processCommand('p1', {
      type: 'TRAIN_UNIT',
      buildingId: townCenter.id,
      unitType: 'worker'
    });
    expect(res16).toBe(false);
    expect(townCenter.productionQueue.length).toBe(15);
    expect(p1.resources.food).toBe(foodBefore);
    expect(p1.population).toBe(popBefore);
  });

  it('cancels item at arbitrary queue index and refunds 100% resources and pop', () => {
    const sim = createSim();
    const p1 = sim.players.get('p1')!;
    p1.resources.food = 1000;
    p1.resources.wood = 1000;
    p1.maxPopulation = 50;

    const townCenter = Array.from(sim.buildings.values()).find(b => b.ownerId === 'p1' && b.type === 'town_centre')!;
    
    // Queue 3 workers
    sim.processCommand('p1', { type: 'TRAIN_UNIT', buildingId: townCenter.id, unitType: 'worker' });
    sim.processCommand('p1', { type: 'TRAIN_UNIT', buildingId: townCenter.id, unitType: 'worker' });
    sim.processCommand('p1', { type: 'TRAIN_UNIT', buildingId: townCenter.id, unitType: 'worker' });

    const foodBeforeCancel = p1.resources.food;
    const popBeforeCancel = p1.population;

    // Cancel index 1 (the middle one)
    const cancelRes = sim.processCommand('p1', {
      type: 'CANCEL_PRODUCTION',
      buildingId: townCenter.id,
      queueIndex: 1
    });

    expect(cancelRes).toBe(true);
    expect(townCenter.productionQueue.length).toBe(2);

    const workerCost = UNIT_DEFINITIONS.worker.cost;
    expect(p1.resources.food).toBe(foodBeforeCancel + workerCost.food);
    expect(p1.population).toBe(popBeforeCancel - 1);
  });

  it('prevents duplicate queuing of technologies and refunds 100% on cancel', () => {
    const sim = createSim();
    const p1 = sim.players.get('p1')!;
    p1.resources.food = 2000;
    p1.resources.wood = 2000;
    p1.resources.stone = 2000;
    p1.resources.metal = 2000;
    p1.resources.knowledge = 2000;

    // Place a research hall for p1
    const hallId = 'test_research_hall_1';
    const hall = {
      id: hallId,
      ownerId: 'p1',
      team: p1.team,
      type: 'research_hall' as const,
      x: 20,
      y: 20,
      width: 3,
      height: 3,
      hp: 1500,
      maxHp: 1500,
      isConstructed: true,
      constructionProgress: 100,
      productionQueue: []
    };
    sim.buildings.set(hallId, hall);

    const techDef = TECHNOLOGIES['forestry_axes'];
    const foodBefore = p1.resources.food;
    const woodBefore = p1.resources.wood;
    const knowBefore = p1.resources.knowledge;

    // Queue technology
    const res1 = sim.processCommand('p1', {
      type: 'RESEARCH_TECH',
      buildingId: hall.id,
      techId: 'forestry_axes'
    });
    expect(res1).toBe(true);
    expect(hall.productionQueue.length).toBe(1);
    expect(p1.resources.food).toBe(foodBefore - (techDef.cost.food || 0));
    expect(p1.resources.wood).toBe(woodBefore - (techDef.cost.wood || 0));
    expect(p1.resources.knowledge).toBe(knowBefore - (techDef.cost.knowledge || 0));

    // Try to queue the exact same technology again
    const res2 = sim.processCommand('p1', {
      type: 'RESEARCH_TECH',
      buildingId: hall.id,
      techId: 'forestry_axes'
    });
    expect(res2).toBe(false);
    expect(hall.productionQueue.length).toBe(1);

    // Cancel the technology and check 100% refund
    const cancelRes = sim.processCommand('p1', {
      type: 'CANCEL_PRODUCTION',
      buildingId: hall.id,
      queueIndex: 0
    });
    expect(cancelRes).toBe(true);
    expect(hall.productionQueue.length).toBe(0);
    expect(p1.resources.food).toBe(foodBefore);
    expect(p1.resources.wood).toBe(woodBefore);
    expect(p1.resources.knowledge).toBe(knowBefore);
  });

  it('prevents duplicate age advancement and refunds 100% on cancel', () => {
    const sim = createSim();
    const p1 = sim.players.get('p1')!;
    p1.resources.food = 5000;
    p1.resources.wood = 5000;
    p1.resources.stone = 5000;
    p1.resources.metal = 5000;
    p1.resources.knowledge = 5000;

    const tc = Array.from(sim.buildings.values()).find(b => b.ownerId === 'p1' && b.type === 'town_centre')!;
    const ageReq = AGE_ADVANCEMENT_REQUIREMENTS['Founding Age'];
    const foodBefore = p1.resources.food;
    const woodBefore = p1.resources.wood;
    const knowBefore = p1.resources.knowledge;

    // Advance to Kingdom Age
    const res1 = sim.processCommand('p1', {
      type: 'ADVANCE_AGE',
      buildingId: tc.id
    });
    expect(res1).toBe(true);
    expect(tc.productionQueue.length).toBe(1);
    expect(p1.resources.food).toBe(foodBefore - ageReq.cost.food);
    expect(p1.resources.wood).toBe(woodBefore - ageReq.cost.wood);
    expect(p1.resources.knowledge).toBe(knowBefore - ageReq.cost.knowledge);

    // Duplicate advance attempt
    const res2 = sim.processCommand('p1', {
      type: 'ADVANCE_AGE',
      buildingId: tc.id
    });
    expect(res2).toBe(false);
    expect(tc.productionQueue.length).toBe(1);

    // Cancel age advancement and verify 100% refund
    const cancelRes = sim.processCommand('p1', {
      type: 'CANCEL_PRODUCTION',
      buildingId: tc.id,
      queueIndex: 0
    });
    expect(cancelRes).toBe(true);
    expect(tc.productionQueue.length).toBe(0);
    expect(p1.resources.food).toBe(foodBefore);
    expect(p1.resources.wood).toBe(woodBefore);
    expect(p1.resources.knowledge).toBe(knowBefore);
  });

  it('allows queuing multiple workers and age advancement simultaneously in the same town centre queue', () => {
    const sim = createSim();
    const p1 = sim.players.get('p1')!;
    p1.resources.food = 2000;
    p1.resources.wood = 2000;
    p1.resources.knowledge = 500;
    p1.maxPopulation = 50;

    const tc = Array.from(sim.buildings.values()).find(b => b.ownerId === 'p1' && b.type === 'town_centre')!;
    expect(tc).toBeDefined();

    // 1. Queue 3 workers
    expect(sim.processCommand('p1', { type: 'TRAIN_UNIT', buildingId: tc.id, unitType: 'worker' })).toBe(true);
    expect(sim.processCommand('p1', { type: 'TRAIN_UNIT', buildingId: tc.id, unitType: 'worker' })).toBe(true);
    expect(sim.processCommand('p1', { type: 'TRAIN_UNIT', buildingId: tc.id, unitType: 'worker' })).toBe(true);
    expect(tc.productionQueue.length).toBe(3);

    // 2. Queue Age Advancement directly behind the workers in the town centre queue
    expect(sim.processCommand('p1', { type: 'ADVANCE_AGE', buildingId: tc.id })).toBe(true);
    expect(tc.productionQueue.length).toBe(4);
    expect(tc.productionQueue[3].category).toBe('age');
    expect(tc.productionQueue[3].itemType).toBe('Kingdom Age');

    // 3. Queue 2 more workers behind the age advancement
    expect(sim.processCommand('p1', { type: 'TRAIN_UNIT', buildingId: tc.id, unitType: 'worker' })).toBe(true);
    expect(sim.processCommand('p1', { type: 'TRAIN_UNIT', buildingId: tc.id, unitType: 'worker' })).toBe(true);
    expect(tc.productionQueue.length).toBe(6);

    // Verify order in queue
    expect(tc.productionQueue.map(q => q.category)).toEqual([
      'unit', 'unit', 'unit', 'age', 'unit', 'unit'
    ]);
  });
});
