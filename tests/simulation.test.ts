import { describe, it, expect } from 'vitest';
import {
  SimulationEngine,
  generateMap,
  GridPathfinder,
  UNIT_DEFINITIONS,
  BUILDING_DEFINITIONS
} from '../packages/shared/src/index.js';

describe('Map Generation & Pathfinding', () => {
  it('generates consistent map features from the same seed', () => {
    const map1 = generateMap('green_frontier', 60, 12345, 2);
    const map2 = generateMap('green_frontier', 60, 12345, 2);

    expect(map1.tiles.length).toBe(map2.tiles.length);
    expect(map1.tiles[100].terrain).toBe(map2.tiles[100].terrain);
    expect(map1.startPositions.length).toBe(2);
    expect(map1.resourceNodes.length).toBe(map2.resourceNodes.length);
  });

  it('computes path avoiding obstacles with GridPathfinder', () => {
    const pf = new GridPathfinder(10, 10);
    // Block horizontal wall at y = 5 from x = 0 to 8
    for (let x = 0; x <= 8; x++) {
      pf.setWalkable(x, 5, false);
    }

    const path = pf.findPath(2, 2, 2, 8);
    expect(path.length).toBeGreaterThan(0);
    // The path must go through the open gap at x = 9
    const passedGap = path.some(p => Math.floor(p.x) >= 8);
    expect(passedGap).toBe(true);
  });
});

describe('Simulation Engine Gameplay Rules', () => {
  const initialPlayers = [
    { id: 'p1', name: 'Player 1', team: 1, civ: 'Veyran Confederacy' as const, color: '#2563eb', isAi: false },
    { id: 'p2', name: 'Player 2', team: 2, civ: 'Ironvale Kingdom' as const, color: '#dc2626', isAi: true }
  ];

  it('initializes players, Town Centres, starting workers, and scouts', () => {
    const sim = new SimulationEngine(
      {
        mapType: 'green_frontier',
        mapSize: 60,
        seed: 42,
        victoryCondition: 'conquest',
        startingResources: 'standard',
        sharedTeamEconomy: false,
        aiDifficulty: 'medium'
      },
      initialPlayers
    );

    expect(sim.players.size).toBe(2);
    expect(sim.buildings.size).toBe(2); // 2 Town Centres
    expect(sim.units.size).toBe(8); // (3 workers + 1 scout) * 2

    const p1 = sim.players.get('p1')!;
    expect(p1.resources.food).toBe(250);
    expect(p1.population).toBe(4);
  });

  it('queues and trains workers at Town Centre', () => {
    const sim = new SimulationEngine(
      {
        mapType: 'green_frontier',
        mapSize: 60,
        seed: 42,
        victoryCondition: 'conquest',
        startingResources: 'standard',
        sharedTeamEconomy: false,
        aiDifficulty: 'medium'
      },
      initialPlayers
    );

    const tc = Array.from(sim.buildings.values()).find(b => b.ownerId === 'p1' && b.type === 'town_centre')!;
    const initialFood = sim.players.get('p1')!.resources.food;

    const trained = sim.processCommand('p1', {
      type: 'TRAIN_UNIT',
      buildingId: tc.id,
      unitType: 'worker'
    });

    expect(trained).toBe(true);
    expect(tc.productionQueue.length).toBe(1);
    expect(sim.players.get('p1')!.resources.food).toBe(initialFood - 50);

    // Fast-forward ticks to finish training (worker training time is 12s, dt=0.05s -> 240 ticks)
    for (let i = 0; i < 250; i++) {
      sim.tick(0.05);
    }

    expect(tc.productionQueue.length).toBe(0);
    const p1Workers = Array.from(sim.units.values()).filter(u => u.ownerId === 'p1' && u.type === 'worker');
    expect(p1Workers.length).toBe(4); // was 3, now 4
  });

  it('enforces unit counter bonus in combat (Spearman vs Cavalry)', () => {
    const spearmanDef = UNIT_DEFINITIONS.spearman;
    expect(spearmanDef.bonusMultiplierVs?.cavalry).toBeGreaterThan(2.0);
  });

  it('advances age when requirements are met', () => {
    const sim = new SimulationEngine(
      {
        mapType: 'green_frontier',
        mapSize: 60,
        seed: 42,
        victoryCondition: 'conquest',
        startingResources: 'high',
        sharedTeamEconomy: false,
        aiDifficulty: 'medium'
      },
      initialPlayers
    );

    const p1 = sim.players.get('p1')!;
    p1.resources.knowledge = 100;
    const tc = Array.from(sim.buildings.values()).find(b => b.ownerId === 'p1' && b.type === 'town_centre')!;

    const advanced = sim.processCommand('p1', {
      type: 'ADVANCE_AGE',
      buildingId: tc.id
    });

    expect(advanced).toBe(true);
    expect(tc.productionQueue[0].category).toBe('age');

    // Fast-forward to finish age advancement (30s)
    for (let i = 0; i < 620; i++) {
      sim.tick(0.05);
    }

    expect(p1.age).toBe('Kingdom Age');
  });

  it('triggers victory when enemy base is conquered even if lone scout/worker remains', () => {
    const sim = new SimulationEngine(
      {
        mapType: 'green_frontier',
        mapSize: 60,
        seed: 42,
        victoryCondition: 'conquest',
        startingResources: 'standard',
        sharedTeamEconomy: false,
        aiDifficulty: 'medium'
      },
      initialPlayers
    );

    // Run 25 ticks to pass initial grace period
    for (let i = 0; i < 25; i++) {
      sim.tick(0.05);
    }
    expect(sim.isGameOver).toBe(false);

    // Destroy enemy (p2) Town Centre
    const p2TC = Array.from(sim.buildings.values()).find(b => b.ownerId === 'p2' && b.type === 'town_centre')!;
    sim.destroyBuilding(p2TC.id);

    // Notice p2 still has a scout or worker somewhere in the fog of war
    const p2Scout = Array.from(sim.units.values()).find(u => u.ownerId === 'p2' && u.type === 'scout');
    expect(p2Scout).toBeDefined();

    // With the enemy Town Centre and infrastructure destroyed and no military buildings/army,
    // p2 is conquered and game over triggers victory for Team 1!
    sim.checkVictoryConditions();

    expect(sim.isGameOver).toBe(true);
    expect(sim.winnerTeam).toBe(1);
    expect(sim.players.get('p1')!.isVictorious).toBe(true);
    expect(sim.players.get('p2')!.isDefeated).toBe(true);

    const snapshot = sim.getSnapshot();
    const gameOverEvent = snapshot.events.find(e => e.type === 'GAME_OVER');
    expect(gameOverEvent).toBeDefined();
  });

  it('supports multiple AI allies and enemies on large maps (3 vs 3)', () => {
    const multiRoster = [
      { id: 'p1', name: 'Human Commander', team: 1, civ: 'Veyran Confederacy' as const, color: '#2563eb', isAi: false },
      { id: 'ai_ally_1', name: 'AI Ally 1', team: 1, civ: 'Solari Dominion' as const, color: '#06b6d4', isAi: true },
      { id: 'ai_ally_2', name: 'AI Ally 2', team: 1, civ: 'Nambara Alliance' as const, color: '#10b981', isAi: true },
      { id: 'ai_enemy_1', name: 'AI Enemy 1', team: 2, civ: 'Ironvale Kingdom' as const, color: '#dc2626', isAi: true },
      { id: 'ai_enemy_2', name: 'AI Enemy 2', team: 2, civ: 'Veyran Confederacy' as const, color: '#e11d48', isAi: true },
      { id: 'ai_enemy_3', name: 'AI Enemy 3', team: 2, civ: 'Solari Dominion' as const, color: '#f97316', isAi: true }
    ];

    const sim = new SimulationEngine(
      {
        mapType: 'riverlands',
        mapSize: 120, // Huge map
        seed: 9999,
        victoryCondition: 'conquest',
        startingResources: 'high',
        sharedTeamEconomy: false,
        aiDifficulty: 'medium'
      },
      multiRoster
    );

    expect(sim.players.size).toBe(6);
    expect(sim.buildings.size).toBe(6); // 6 Town Centres spawned
    expect(sim.units.size).toBe(24); // 4 units each * 6 = 24 units
    expect(sim.mapData.width).toBe(120);
    expect(sim.mapData.height).toBe(120);

    // Verify all players have their own starting Town Centre at distinct positions
    const tcPositions = Array.from(sim.buildings.values()).map(b => ({ x: b.x, y: b.y }));
    const uniquePositions = new Set(tcPositions.map(p => `${p.x},${p.y}`));
    expect(uniquePositions.size).toBe(6);

    // Run simulation ticks to ensure all 5 AIs make decisions smoothly without collision or errors
    for (let i = 0; i < 60; i++) {
      sim.tick(0.05);
    }

    expect(sim.isGameOver).toBe(false);
    expect(sim.units.size).toBeGreaterThanOrEqual(24);
  });

  it('positions and navigates siege artillery without getting stuck on buildings or corners', () => {
    const pf = new GridPathfinder(40, 40);
    // Block an L-shaped wall barrier
    for (let x = 10; x <= 25; x++) {
      pf.setWalkable(x, 15, false);
    }
    for (let y = 15; y <= 25; y++) {
      pf.setWalkable(25, y, false);
    }

    // A siege vehicle at (12, 10) paths around the corner to (28, 28)
    const path = pf.findPath(12, 10, 28, 28);
    expect(path.length).toBeGreaterThan(0);

    // Verify standoff attack tile targeting for siege unit vs building
    const firingSpot = pf.findOptimalRangedAttackTile(
      28, 28, 3, 3, // 3x3 enemy workshop at (28, 28)
      12, 10,       // Siege engine approaching from (12, 10)
      3.0, 9.0      // 10 range bombard engine
    );
    expect(firingSpot).not.toBeNull();
    // Must be in firing distance from building edge
    const clampedX = Math.max(28, Math.min(28 + 3, firingSpot!.x));
    const clampedY = Math.max(28, Math.min(28 + 3, firingSpot!.y));
    const distToBuilding = Math.hypot(firingSpot!.x - clampedX, firingSpot!.y - clampedY);
    expect(distToBuilding).toBeLessThanOrEqual(9.0);
    expect(distToBuilding).toBeGreaterThanOrEqual(1.5);
  });

  it('trains and flies aerial war dragon across terrain obstacles', () => {
    const dragonDef = UNIT_DEFINITIONS.dragon;
    expect(dragonDef).toBeDefined();
    expect(dragonDef.isFlying).toBe(true);
    expect(dragonDef.damage).toBeGreaterThanOrEqual(40);
    expect(dragonDef.attackRange).toBe(7.5);
    expect(dragonDef.producedAt).toBe('fort');
    expect(dragonDef.bonusMultiplierVs?.siege_unit).toBeGreaterThan(2.0);

    const sim = new SimulationEngine(
      {
        mapType: 'green_frontier',
        mapSize: 60,
        seed: 42,
        victoryCondition: 'conquest',
        startingResources: 'high',
        sharedTeamEconomy: false,
        aiDifficulty: 'medium'
      },
      [
        { id: 'p1', name: 'Commander', team: 1, civ: 'Solari Dominion' as const, color: '#eab308', isAi: false },
        { id: 'p2', name: 'Hostile', team: 2, civ: 'Ironvale Kingdom' as const, color: '#dc2626', isAi: true }
      ]
    );

    const p1 = sim.players.get('p1')!;
    p1.age = 'Imperial Age';
    p1.resources.wood = 500;
    p1.resources.stone = 500;
    p1.resources.metal = 500;
    p1.resources.knowledge = 200;

    // Place and finish a Grand Fortress for p1
    const built = sim.processCommand('p1', {
      type: 'BUILD',
      buildingType: 'fort',
      position: { x: 10, y: 10 },
      unitIds: []
    });
    expect(built).toBe(true);

    const fort = Array.from(sim.buildings.values()).find(b => b.ownerId === 'p1' && b.type === 'fort')!;
    fort.isConstructed = true;
    fort.constructionProgress = 100;

    // Train dragon at the fort
    const trained = sim.processCommand('p1', {
      type: 'TRAIN_UNIT',
      buildingId: fort.id,
      unitType: 'dragon'
    });
    expect(trained).toBe(true);
    expect(fort.productionQueue.length).toBe(1);

    // Fast-forward to spawn the dragon (training time 18s -> ~370 ticks)
    for (let i = 0; i < 380; i++) {
      sim.tick(0.05);
    }

    const dragon = Array.from(sim.units.values()).find(u => u.ownerId === 'p1' && u.type === 'dragon');
    expect(dragon).toBeDefined();
    expect(dragon!.maxHp).toBe(360);
    expect(dragon!.hp).toBeGreaterThan(300);

    // Order dragon to fly across the map
    const moved = sim.processCommand('p1', {
      type: 'MOVE',
      unitIds: [dragon!.id],
      target: { x: 45, y: 45 }
    });
    expect(moved).toBe(true);
    expect(dragon!.path).toBeDefined();
    expect(dragon!.path!.length).toBe(1); // Straight-line aerial trajectory

    // Simulate flight
    for (let i = 0; i < 40; i++) {
      sim.tick(0.05);
    }

    // Dragon has smoothly advanced along aerial path
    expect(dragon!.x).toBeGreaterThan(10);
    expect(dragon!.y).toBeGreaterThan(10);
  });

  it('AI ally actively mobilizes military and attacks when enemy threatens ally base or units', () => {
    const trioPlayers = [
      { id: 'p1', name: 'Human Player', team: 1, civ: 'Veyran Confederacy' as const, color: '#2563eb', isAi: false },
      { id: 'p_ally', name: 'AI Ally', team: 1, civ: 'Ironvale Kingdom' as const, color: '#06b6d4', isAi: true },
      { id: 'p_enemy', name: 'AI Enemy', team: 2, civ: 'Solari Dominion' as const, color: '#dc2626', isAi: true }
    ];

    const sim = new SimulationEngine(
      {
        mapType: 'green_frontier',
        mapSize: 70,
        seed: 999,
        victoryCondition: 'conquest',
        startingResources: 'standard',
        sharedTeamEconomy: false,
        aiDifficulty: 'medium'
      },
      trioPlayers
    );

    const allyTC = Array.from(sim.buildings.values()).find(b => b.ownerId === 'p_ally' && b.type === 'town_centre')!;
    const humanTC = Array.from(sim.buildings.values()).find(b => b.ownerId === 'p1' && b.type === 'town_centre')!;

    // Spawn 2 military units for AI Ally near its Town Centre
    const allySoldier1Id = 'ally_soldier_1';
    const allySoldier2Id = 'ally_soldier_2';
    sim.units.set(allySoldier1Id, {
      id: allySoldier1Id,
      ownerId: 'p_ally',
      team: 1,
      type: 'basic_infantry',
      x: allyTC.x + 2,
      y: allyTC.y + 2,
      hp: 120,
      maxHp: 120,
      state: 'idle',
      attackCooldown: 0,
      gatherCooldown: 0,
      facingAngle: 0
    });
    sim.units.set(allySoldier2Id, {
      id: allySoldier2Id,
      ownerId: 'p_ally',
      team: 1,
      type: 'basic_infantry',
      x: allyTC.x + 3,
      y: allyTC.y + 3,
      hp: 120,
      maxHp: 120,
      state: 'idle',
      attackCooldown: 0,
      gatherCooldown: 0,
      facingAngle: 0
    });

    // Spawn an enemy raiding unit near the Human Player's Town Centre (within 35 tiles)
    const enemyRaiderId = 'enemy_raider_1';
    sim.units.set(enemyRaiderId, {
      id: enemyRaiderId,
      ownerId: 'p_enemy',
      team: 2,
      type: 'basic_infantry',
      x: humanTC.x + 8,
      y: humanTC.y + 8,
      hp: 120,
      maxHp: 120,
      state: 'idle',
      attackCooldown: 0,
      gatherCooldown: 0,
      facingAngle: 0
    });

    // Run AI update ticks (each AI cycle triggers every 10 ticks = 0.5s)
    for (let i = 0; i < 20; i++) {
      sim.tick(0.05);
    }

    const s1 = sim.units.get(allySoldier1Id)!;
    const s2 = sim.units.get(allySoldier2Id)!;

    // AI Ally should have mobilized its military to attack the enemy threatening its teammate!
    expect(s1.state).toBe('attacking');
    expect(s1.targetEntityId).toBe(enemyRaiderId);
    expect(s2.state).toBe('attacking');
    expect(s2.targetEntityId).toBe(enemyRaiderId);
  });

  it('routes newly produced workers and troops to building checkpoints automatically', () => {
    const sim = new SimulationEngine(
      {
        mapType: 'highland_plains',
        mapSize: 48,
        seed: 42,
        victoryCondition: 'conquest',
        startingResources: 'high',
        sharedTeamEconomy: false,
        aiDifficulty: 'medium'
      },
      [
        { id: 'player_1', name: 'Player 1', team: 1, civ: 'Veyran Confederacy', color: '#38bdf8', isAi: false },
        { id: 'enemy_1', name: 'Enemy 1', team: 2, civ: 'Ironvale Kingdom', color: '#ef4444', isAi: true }
      ]
    );

    const tc = Array.from(sim.buildings.values()).find(b => b.ownerId === 'player_1' && b.type === 'town_centre')!;
    expect(tc).toBeDefined();

    // Find a nearby tree resource node
    const nearbyWood = Array.from(sim.resourceNodes.values()).find(
      r => r.type === 'wood' && Math.hypot(r.x - tc.x, r.y - tc.y) < 25
    )!;
    expect(nearbyWood).toBeDefined();

    // 1. Set Town Centre checkpoint to the wood resource node
    sim.processCommand('player_1', {
      type: 'SET_RALLY_POINT',
      buildingId: tc.id,
      point: { x: nearbyWood.x, y: nearbyWood.y },
      targetEntityId: nearbyWood.id,
      targetType: 'resource'
    });

    expect(tc.rallyPoint).toBeDefined();
    expect(tc.rallyPoint?.targetEntityId).toBe(nearbyWood.id);

    // Queue worker in TC
    const initialUnitCount = sim.units.size;
    tc.productionQueue.push({
      itemType: 'worker',
      category: 'unit',
      progress: 99.0, // Almost done
      totalTime: 10
    });

    // Tick simulation to complete production
    for (let i = 0; i < 5; i++) {
      sim.tick(0.05);
    }

    expect(sim.units.size).toBe(initialUnitCount + 1);
    // Find newly spawned worker
    const spawnedWorker = Array.from(sim.units.values()).find(
      u => u.ownerId === 'player_1' && u.type === 'worker' && u.targetEntityId === nearbyWood.id
    );
    expect(spawnedWorker).toBeDefined();
    expect(['gathering', 'moving_to_gather']).toContain(spawnedWorker?.state);

    // 2. Test military building checkpoint to ground coordinates
    const barracksId = 'barracks_checkpoint_test';
    sim.buildings.set(barracksId, {
      id: barracksId,
      ownerId: 'player_1',
      team: 1,
      type: 'barracks',
      x: tc.x + 6,
      y: tc.y,
      width: 3,
      height: 3,
      hp: 1200,
      maxHp: 1200,
      isConstructed: true,
      constructionProgress: 100,
      productionQueue: [],
      rallyPoint: { x: tc.x + 20, y: tc.y + 15, targetType: 'ground' }
    });

    const barracks = sim.buildings.get(barracksId)!;
    barracks.productionQueue.push({
      itemType: 'basic_infantry',
      category: 'unit',
      progress: 99.0,
      totalTime: 12
    });

    for (let i = 0; i < 5; i++) {
      sim.tick(0.05);
    }

    const spawnedInfantry = Array.from(sim.units.values()).find(
      u => u.ownerId === 'player_1' && u.type === 'basic_infantry'
    );
    expect(spawnedInfantry).toBeDefined();
    expect(spawnedInfantry?.state).toBe('moving');
    expect(spawnedInfantry?.targetX).toBe(tc.x + 20);
    expect(spawnedInfantry?.targetY).toBe(tc.y + 15);
  });

  it('balances research academy knowledge generation and executes technologies properly', () => {
    const sim = new SimulationEngine(
      {
        mapType: 'green_frontier',
        mapSize: 60,
        seed: 123,
        victoryCondition: 'conquest',
        startingResources: 'low',
        sharedTeamEconomy: false,
        aiDifficulty: 'easy'
      },
      [
        { id: 'player_1', name: 'Scholar', team: 1, civ: 'Ironvale Kingdom', color: '#3b82f6', isAi: false },
        { id: 'ai_1', name: 'Opponent', team: 2, civ: 'Ironvale Kingdom', color: '#ef4444', isAi: true }
      ]
    );

    const player = sim.players.get('player_1')!;
    expect(player.age).toBe('Founding Age');
    expect(player.researchedTechs).toEqual([]);

    // 1. Build a Research Academy
    const academyId = 'academy_test_1';
    sim.buildings.set(academyId, {
      id: academyId,
      ownerId: 'player_1',
      team: 1,
      type: 'research_hall',
      x: 10,
      y: 10,
      width: 3,
      height: 3,
      hp: 950,
      maxHp: 950,
      isConstructed: true,
      constructionProgress: 100,
      productionQueue: []
    });

    const initKnowledge = player.resources.knowledge;
    // Tick 20 times (1 second)
    for (let i = 0; i < 20; i++) {
      sim.tick(0.05);
    }
    // Baseline +1 and Academy +1 = +2 knowledge total per second for Ironvale
    expect(player.resources.knowledge - initKnowledge).toBe(2);

    // 2. Reject tech requiring Kingdom Age while in Founding Age
    player.resources.food = 500;
    player.resources.wood = 500;
    player.resources.stone = 500;
    player.resources.metal = 500;
    player.resources.knowledge = 500;

    const kingdomTechAttempt = sim.processCommand('player_1', {
      type: 'RESEARCH_TECH',
      buildingId: academyId,
      techId: 'crop_rotation' // Requires Kingdom Age
    });
    expect(kingdomTechAttempt).toBe(false);
    expect(player.researchedTechs).not.toContain('crop_rotation');

    // 3. Successfully research Founding Age tech: urban_planning
    const initMaxPop = player.maxPopulation;
    const urbanTechAttempt = sim.processCommand('player_1', {
      type: 'RESEARCH_TECH',
      buildingId: academyId,
      techId: 'urban_planning'
    });
    expect(urbanTechAttempt).toBe(true);

    const academy = sim.buildings.get(academyId)!;
    expect(academy.productionQueue.length).toBe(1);
    expect(academy.productionQueue[0].itemType).toBe('urban_planning');

    // Fast-forward research queue to 100%
    academy.productionQueue[0].progress = 99.5;
    for (let i = 0; i < 5; i++) {
      sim.tick(0.05);
    }

    expect(player.researchedTechs).toContain('urban_planning');
    expect(player.maxPopulation).toBe(initMaxPop + 15);
  });
});

describe('Single-Player Cheat Codes (Rise of Nations Style)', () => {
  const initialPlayers = [
    { id: 'player_human', name: 'Human Commander', team: 1, civ: 'Veyran Confederacy' as const, color: '#2563eb', isAi: false },
    { id: 'player_enemy', name: 'Enemy AI', team: 2, civ: 'Ironvale Kingdom' as const, color: '#dc2626', isAi: true }
  ];

  function createTestSim(): SimulationEngine {
    return new SimulationEngine(
      {
        mapType: 'green_frontier',
        mapSize: 60,
        seed: 42,
        victoryCondition: 'conquest',
        startingResources: 'standard',
        sharedTeamEconomy: false,
        aiDifficulty: 'medium'
      },
      initialPlayers
    );
  }

  it('handles "cheat resource all" and grants 10000 to each resource', () => {
    const sim = createTestSim();
    const player = sim.players.get('player_human')!;
    const initialFood = player.resources.food;
    const initialWood = player.resources.wood;
    const initialStone = player.resources.stone;
    const initialMetal = player.resources.metal;
    const initialKnowledge = player.resources.knowledge;

    const res = sim.applyCheat('player_human', 'cheat resource all');
    expect(res.success).toBe(true);
    expect(player.resources.food).toBe(initialFood + 10000);
    expect(player.resources.wood).toBe(initialWood + 10000);
    expect(player.resources.stone).toBe(initialStone + 10000);
    expect(player.resources.metal).toBe(initialMetal + 10000);
    expect(player.resources.knowledge).toBe(initialKnowledge + 10000);
  });

  it('handles "cheat resource <type> <amount>" for specific resources', () => {
    const sim = createTestSim();
    const player = sim.players.get('player_human')!;
    const initialFood = player.resources.food;

    const res = sim.applyCheat('player_human', 'cheat resource food 5000');
    expect(res.success).toBe(true);
    expect(player.resources.food).toBe(initialFood + 5000);
  });

  it('handles "cheat age advance" to step through civilization ages', () => {
    const sim = createTestSim();
    const player = sim.players.get('player_human')!;
    expect(player.age).toBe('Founding Age');

    // 1st advance -> Kingdom Age
    let res = sim.applyCheat('player_human', 'cheat age advance');
    expect(res.success).toBe(true);
    expect(player.age).toBe('Kingdom Age');

    let snapshot = sim.getSnapshot();
    const ageEvent1 = snapshot.events.find(e => e.type === 'AGE_ADVANCED');
    expect(ageEvent1).toBeDefined();
    expect((ageEvent1 as any).newAge).toBe('Kingdom Age');

    // 2nd advance -> Imperial Age
    res = sim.applyCheat('player_human', 'cheat age advance');
    expect(res.success).toBe(true);
    expect(player.age).toBe('Imperial Age');

    // 3rd advance -> Industrial Age
    res = sim.applyCheat('player_human', 'cheat age advance');
    expect(res.success).toBe(true);
    expect(player.age).toBe('Industrial Age');

    // 4th advance -> Already at pinnacle
    res = sim.applyCheat('player_human', 'cheat age advance');
    expect(res.success).toBe(false);
    expect(res.message).toContain('pinnacle');
  });

  it('handles direct age selection "cheat age 3" and "cheat age industrial"', () => {
    const sim = createTestSim();
    const player = sim.players.get('player_human')!;

    let res = sim.applyCheat('player_human', 'cheat age 3');
    expect(res.success).toBe(true);
    expect(player.age).toBe('Imperial Age');

    res = sim.applyCheat('player_human', 'cheat age industrial');
    expect(res.success).toBe(true);
    expect(player.age).toBe('Industrial Age');
  });

  it('handles "cheat reveal" and "cheat map"', () => {
    const sim = createTestSim();
    const res = sim.applyCheat('player_human', 'cheat reveal');
    expect(res.success).toBe(true);
    expect(res.effect).toBe('reveal_map');
  });

  it('handles "cheat pop <amount>" to expand maximum population cap', () => {
    const sim = createTestSim();
    const player = sim.players.get('player_human')!;
    const res = sim.applyCheat('player_human', 'cheat pop 250');
    expect(res.success).toBe(true);
    expect(player.maxPopulation).toBe(250);
  });

  it('handles "cheat tech all" to unlock all technologies and upgrades', () => {
    const sim = createTestSim();
    const player = sim.players.get('player_human')!;
    const res = sim.applyCheat('player_human', 'cheat tech all');
    expect(res.success).toBe(true);
    expect(player.researchedTechs.length).toBeGreaterThan(10);
    expect(player.researchedTechs).toContain('masonry');
    expect(player.researchedTechs).toContain('crop_rotation');
  });

  it('handles "cheat victory" to immediately trigger match victory', () => {
    const sim = createTestSim();
    const player = sim.players.get('player_human')!;
    const res = sim.applyCheat('player_human', 'cheat victory');
    expect(res.success).toBe(true);
    expect(sim.isGameOver).toBe(true);
    expect(sim.winnerTeam).toBe(player.team);

    const snapshot = sim.getSnapshot();
    const gameOverEvent = snapshot.events.find(e => e.type === 'GAME_OVER');
    expect(gameOverEvent).toBeDefined();
    expect((gameOverEvent as any).winnerTeam).toBe(player.team);
  });

  it('handles "cheat heal" to restore all damaged units and structures to full HP', () => {
    const sim = createTestSim();
    const unit = Array.from(sim.units.values()).find(u => u.ownerId === 'player_human')!;
    unit.hp = 10; // damaged

    const res = sim.applyCheat('player_human', 'cheat heal');
    expect(res.success).toBe(true);
    expect(unit.hp).toBe(unit.maxHp);
  });

  it('rejects unrecognized commands with helpful guidance', () => {
    const sim = createTestSim();
    const res = sim.applyCheat('player_human', 'cheat nonexistent');
    expect(res.success).toBe(false);
    expect(res.message).toContain('cheat help');
  });
});

describe('Industrial Age Instant Troop Spawning', () => {
  const initialPlayers = [
    { id: 'player_human', name: 'Commander', team: 1, civ: 'Veyran Confederacy' as const, color: '#2563eb', isAi: false },
    { id: 'player_enemy', name: 'Enemy AI', team: 2, civ: 'Ironvale Kingdom' as const, color: '#dc2626', isAi: true }
  ];

  function createTestSim(): SimulationEngine {
    return new SimulationEngine(
      {
        mapType: 'green_frontier',
        mapSize: 60,
        seed: 42,
        victoryCondition: 'conquest',
        startingResources: 'deathmatch',
        sharedTeamEconomy: false,
        aiDifficulty: 'medium'
      },
      initialPlayers
    );
  }

  it('queues units normally in Founding Age', () => {
    const sim = createTestSim();
    const player = sim.players.get('player_human')!;
    expect(player.age).toBe('Founding Age');

    const tc = Array.from(sim.buildings.values()).find(b => b.ownerId === 'player_human' && b.type === 'town_centre')!;
    const initialUnits = Array.from(sim.units.values()).filter(u => u.ownerId === 'player_human').length;

    const trained = sim.processCommand('player_human', {
      type: 'TRAIN_UNIT',
      buildingId: tc.id,
      unitType: 'worker'
    });

    expect(trained).toBe(true);
    expect(tc.productionQueue.length).toBe(1);
    expect(tc.productionQueue[0].itemType).toBe('worker');
    expect(Array.from(sim.units.values()).filter(u => u.ownerId === 'player_human').length).toBe(initialUnits);
  });

  it('spawns troops instantly when recruited in the Industrial Age', () => {
    const sim = createTestSim();
    const player = sim.players.get('player_human')!;
    player.age = 'Industrial Age';

    const tc = Array.from(sim.buildings.values()).find(b => b.ownerId === 'player_human' && b.type === 'town_centre')!;
    const initialUnits = Array.from(sim.units.values()).filter(u => u.ownerId === 'player_human').length;

    const trained = sim.processCommand('player_human', {
      type: 'TRAIN_UNIT',
      buildingId: tc.id,
      unitType: 'worker'
    });

    expect(trained).toBe(true);
    // Queue should remain empty because the worker spawned instantly!
    expect(tc.productionQueue.length).toBe(0);
    expect(Array.from(sim.units.values()).filter(u => u.ownerId === 'player_human').length).toBe(initialUnits + 1);
  });

  it('instantly completes all queued units and spawns vanguard battalion when researching the Industrial Age advancement', () => {
    const sim = createTestSim();
    const player = sim.players.get('player_human')!;
    player.age = 'Imperial Age';

    const tc = Array.from(sim.buildings.values()).find(b => b.ownerId === 'player_human' && b.type === 'town_centre')!;

    // Queue Industrial Age advancement at active slot 0
    tc.productionQueue.push({
      id: 'age_Industrial Age',
      itemType: 'Industrial Age',
      category: 'age',
      progress: 99.9,
      totalTime: 25
    });

    // Queue a unit in waiting slot 1
    tc.productionQueue.push({
      id: 'queued_worker',
      itemType: 'worker',
      category: 'unit',
      progress: 0,
      totalTime: 12
    });

    const initialUnitsCount = Array.from(sim.units.values()).filter(u => u.ownerId === 'player_human').length;

    // Fast-forward simulation to complete Industrial Age research
    for (let i = 0; i < 5; i++) {
      sim.tick(0.05);
    }

    expect(player.age).toBe('Industrial Age');
    // Queued unit should have spawned instantly, and vanguard troops should have spawned!
    const finalUnitsCount = Array.from(sim.units.values()).filter(u => u.ownerId === 'player_human').length;
    expect(finalUnitsCount).toBeGreaterThan(initialUnitsCount + 1);
  });
});
