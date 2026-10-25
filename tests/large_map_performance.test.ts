import { describe, it, expect } from 'vitest';
import { SimulationEngine } from '../packages/shared/src/simulation/simulationEngine.js';

describe('Large Map & Multi-Bot Scalability Performance', () => {
  it('runs smoothly with 8 AI players on a large map (360x360) across 100 simulation ticks', () => {
    const players = [
      { id: 'bot_1', name: 'Bot 1', team: 1, civ: 'Solari Dominion' as const, color: '#3b82f6', isAi: true },
      { id: 'bot_2', name: 'Bot 2', team: 1, civ: 'Ironvale Kingdom' as const, color: '#10b981', isAi: true },
      { id: 'bot_3', name: 'Bot 3', team: 1, civ: 'Veyran Confederacy' as const, color: '#f59e0b', isAi: true },
      { id: 'bot_4', name: 'Bot 4', team: 1, civ: 'Eldori Dominion' as const, color: '#8b5cf6', isAi: true },
      { id: 'bot_5', name: 'Bot 5', team: 2, civ: 'Solari Dominion' as const, color: '#ef4444', isAi: true },
      { id: 'bot_6', name: 'Bot 6', team: 2, civ: 'Ironvale Kingdom' as const, color: '#ec4899', isAi: true },
      { id: 'bot_7', name: 'Bot 7', team: 2, civ: 'Veyran Confederacy' as const, color: '#06b6d4', isAi: true },
      { id: 'bot_8', name: 'Bot 8', team: 2, civ: 'Eldori Dominion' as const, color: '#14b8a6', isAi: true }
    ];

    const sim = new SimulationEngine(
      {
        mapType: 'continental',
        mapSize: 360,
        seed: 9999,
        victoryCondition: 'conquest',
        startingResources: 'deathmatch', // abundant resources so bots reproduce and construct heavily
        sharedTeamEconomy: false,
        aiDifficulty: 'hard'
      },
      players
    );

    expect(sim.mapData.width).toBe(360);
    expect(sim.mapData.height).toBe(360);
    expect(sim.spatialGrid).toBeDefined();

    // Spawn 160 active military and civilian units distributed across all 8 players
    for (const p of players) {
      for (let i = 0; i < 20; i++) {
        const uId = `stress_unit_${p.id}_${i}`;
        sim.units.set(uId, {
          id: uId,
          type: i % 4 === 0 ? 'cavalry' : i % 4 === 1 ? 'basic_infantry' : i % 4 === 2 ? 'ranged_infantry' : 'worker',
          ownerId: p.id,
          team: p.team,
          x: 180 + (Math.random() - 0.5) * 60,
          y: 180 + (Math.random() - 0.5) * 60,
          hp: 100,
          maxHp: 100,
          state: 'idle',
          attackCooldown: 0,
          gatherCooldown: 0,
          facingAngle: 0,
          carriedResourceAmount: 0
        });
      }
    }

    expect(sim.units.size).toBeGreaterThanOrEqual(160);

    const startTime = performance.now();

    // Run 100 simulation ticks (5.0 seconds of game simulation time)
    for (let t = 0; t < 100; t++) {
      sim.tick(0.05);
    }

    const elapsedMs = performance.now() - startTime;

    // 100 ticks (5 seconds of simulated real-time) with 8 bots and 160+ units on 360x360 map
    // must execute comfortably within 1000ms (10ms per tick average, way below 50ms tick budget)
    expect(elapsedMs).toBeLessThan(1500);
    expect(sim.currentTick).toBe(100);
  });
});
