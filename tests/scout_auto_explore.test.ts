import { describe, it, expect } from 'vitest';
import {
  SimulationEngine
} from '../packages/shared/src/index.js';

describe('Pathfinder Scout Auto-Explore System (AoE Style)', () => {
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

  it('activates and cancels auto-explore via TOGGLE_AUTO_EXPLORE command', () => {
    const sim = createSim();
    const scout = Array.from(sim.units.values()).find(u => u.ownerId === 'p1' && u.type === 'scout')!;
    expect(scout).toBeDefined();
    expect(scout.autoExploring).toBeFalsy();

    // 1. Activate Auto-Explore
    const resActivate = sim.processCommand('p1', {
      type: 'TOGGLE_AUTO_EXPLORE',
      unitIds: [scout.id],
      enabled: true
    });
    expect(resActivate).toBe(true);
    expect(scout.autoExploring).toBe(true);
    expect(scout.state).toBe('moving');
    expect(scout.path && scout.path.length > 0).toBe(true);

    // 2. Cancel Auto-Explore
    const resCancel = sim.processCommand('p1', {
      type: 'TOGGLE_AUTO_EXPLORE',
      unitIds: [scout.id],
      enabled: false
    });
    expect(resCancel).toBe(true);
    expect(scout.autoExploring).toBe(false);
    expect(scout.state).toBe('idle');
  });

  it('scout continuously traverses unexplored territory while auto-exploring', () => {
    const sim = createSim();
    const scout = Array.from(sim.units.values()).find(u => u.ownerId === 'p1' && u.type === 'scout')!;
    const startX = scout.x;
    const startY = scout.y;

    sim.processCommand('p1', {
      type: 'TOGGLE_AUTO_EXPLORE',
      unitIds: [scout.id],
      enabled: true
    });

    expect(scout.autoExploring).toBe(true);

    // Advance simulation ticks (100 ticks = 5 seconds)
    for (let t = 0; t < 100; t++) {
      sim.tick(0.05);
    }

    // Scout must have moved away from starting base into uncharted territory
    const distTraveled = Math.hypot(scout.x - startX, scout.y - startY);
    expect(distTraveled).toBeGreaterThan(5);
    expect(scout.autoExploring).toBe(true);
  });

  it('clears auto-exploring when player issues a manual MOVE or ATTACK command', () => {
    const sim = createSim();
    const scout = Array.from(sim.units.values()).find(u => u.ownerId === 'p1' && u.type === 'scout')!;

    sim.processCommand('p1', {
      type: 'TOGGLE_AUTO_EXPLORE',
      unitIds: [scout.id],
      enabled: true
    });
    expect(scout.autoExploring).toBe(true);

    // Player manually right-clicks ground to move
    sim.processCommand('p1', {
      type: 'MOVE',
      unitIds: [scout.id],
      target: { x: 15, y: 15 }
    });

    expect(scout.autoExploring).toBe(false);
    expect(scout.targetX).toBe(15);
    expect(scout.targetY).toBe(15);
  });
});
