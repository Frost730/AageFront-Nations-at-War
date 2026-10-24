import { describe, it, expect, beforeEach } from 'vitest';
import { SimulationEngine } from '../packages/shared/src/simulation/simulationEngine.js';

describe('AI Tactical Intelligence & Cooperative Attack Patterns', () => {
  let sim: SimulationEngine;

  beforeEach(() => {
    sim = new SimulationEngine(
      {
        mapType: 'riverlands',
        mapSize: 48,
        seed: 12345,
        victoryCondition: 'conquest',
        startingResources: 'high',
        sharedTeamEconomy: false,
        aiDifficulty: 'hard'
      },
      [
        {
          id: 'p_human',
          name: 'Human Commander',
          team: 1,
          civ: 'Solari Dominion',
          color: '#3b82f6',
          isAi: false
        },
        {
          id: 'p_ally',
          name: 'Allied AI Legion',
          team: 1,
          civ: 'Ironvale Kingdom',
          color: '#10b981',
          isAi: true
        },
        {
          id: 'p_enemy',
          name: 'Enemy AI Overlord',
          team: 2,
          civ: 'Veyran Confederacy',
          color: '#ef4444',
          isAi: true
        }
      ]
    );

    // Run 10 ticks (0.5s) to allow first updateAI pass and initialize AI states
    for (let i = 0; i < 10; i++) {
      sim.tick(0.05);
    }
  });

  it('initializes rally staging point and amasses units before attacking', () => {
    const enemyState = sim.getAIState('p_enemy');
    expect(enemyState).toBeDefined();
    expect(enemyState!.currentTactic).toBe('amassing');
    expect(enemyState!.rallyPoint).toBeDefined();

    const enemyTc = Array.from(sim.buildings.values()).find(b => b.ownerId === 'p_enemy' && b.type === 'town_centre')!;
    // Rally point should be staged out from TC towards the map center
    const distToTc = Math.hypot(enemyState!.rallyPoint.x - enemyTc.x, enemyState!.rallyPoint.y - enemyTc.y);
    expect(distToTc).toBeGreaterThanOrEqual(4);

    // Spawn 3 enemy basic infantry near the TC
    const u1 = 'enemy_inf_1';
    const u2 = 'enemy_inf_2';
    const u3 = 'enemy_inf_3';
    [u1, u2, u3].forEach((uid, i) => {
      sim.units.set(uid, {
        id: uid,
        ownerId: 'p_enemy',
        team: 2,
        type: 'basic_infantry',
        x: enemyTc.x + 1 + i,
        y: enemyTc.y + 1,
        hp: 120,
        maxHp: 120,
        state: 'idle',
        attackCooldown: 0,
        gatherCooldown: 0,
        facingAngle: 0
      });
    });

    // Run 10 ticks for next AI routine cycle
    for (let i = 0; i < 10; i++) {
      sim.tick(0.05);
    }

    // Units should not trickle blindly towards player; they should amass towards the rally point
    const unit1 = sim.units.get(u1)!;
    expect(unit1.state).toBe('moving');
    expect(unit1.targetX).toBe(enemyState!.rallyPoint.x);
    expect(unit1.targetY).toBe(enemyState!.rallyPoint.y);
  });

  it('launches a coordinated assault wave with combined-arms when military threshold is met', () => {
    const enemyState = sim.getAIState('p_enemy')!;

    // Spawn 10 military units at the rally point to satisfy waveThreshold for Hard AI
    for (let i = 0; i < 10; i++) {
      const uid = `wave_unit_${i}`;
      sim.units.set(uid, {
        id: uid,
        ownerId: 'p_enemy',
        team: 2,
        type: i % 2 === 0 ? 'basic_infantry' : 'ranged_infantry',
        x: enemyState.rallyPoint.x,
        y: enemyState.rallyPoint.y,
        hp: 120,
        maxHp: 120,
        state: 'idle',
        attackCooldown: 0,
        gatherCooldown: 0,
        facingAngle: 0
      });
    }

    // Run AI update ticks
    for (let i = 0; i < 10; i++) {
      sim.tick(0.05);
    }

    // Should transition to 'assault'
    expect(enemyState.currentTactic).toBe('assault');
    expect(enemyState.waveNumber).toBeGreaterThanOrEqual(1);

    // All units should be ordered into an attack wave
    const sampleAttacker = sim.units.get('wave_unit_0')!;
    expect(sampleAttacker.state).toBe('attacking');
    expect(sampleAttacker.targetEntityId).toBeDefined();
  });

  it('AI Ally coordinates and dispatches relief expedition when human player base is attacked', () => {
    const allyTc = Array.from(sim.buildings.values()).find(b => b.ownerId === 'p_ally' && b.type === 'town_centre')!;
    const humanTc = Array.from(sim.buildings.values()).find(b => b.ownerId === 'p_human' && b.type === 'town_centre')!;

    // Spawn allied military force
    for (let i = 0; i < 3; i++) {
      const aid = `ally_soldier_${i}`;
      sim.units.set(aid, {
        id: aid,
        ownerId: 'p_ally',
        team: 1,
        type: 'basic_infantry',
        x: allyTc.x + i,
        y: allyTc.y,
        hp: 120,
        maxHp: 120,
        state: 'idle',
        attackCooldown: 0,
        gatherCooldown: 0,
        facingAngle: 0
      });
    }

    // Spawn enemy raider next to human TC (< 22 tiles)
    const enemyRaiderId = 'raider_invading_human';
    sim.units.set(enemyRaiderId, {
      id: enemyRaiderId,
      ownerId: 'p_enemy',
      team: 2,
      type: 'cavalry',
      x: humanTc.x + 3,
      y: humanTc.y + 3,
      hp: 200,
      maxHp: 200,
      state: 'idle',
      attackCooldown: 0,
      gatherCooldown: 0,
      facingAngle: 0
    });

    // Run AI update ticks
    for (let i = 0; i < 10; i++) {
      sim.tick(0.05);
    }

    const allyState = sim.getAIState('p_ally')!;
    expect(allyState.currentTactic).toBe('defend');
    expect(allyState.assignedTargetId).toBe(enemyRaiderId);

    const soldier = sim.units.get('ally_soldier_0')!;
    expect(soldier.state).toBe('attacking');
    expect(soldier.targetEntityId).toBe(enemyRaiderId);
  });

  it('defends base when invaded and launches counter-offensive once invaders are eliminated', () => {
    const enemyTc = Array.from(sim.buildings.values()).find(b => b.ownerId === 'p_enemy' && b.type === 'town_centre')!;

    // Spawn 5 defenders for enemy AI
    for (let i = 0; i < 5; i++) {
      const did = `defender_${i}`;
      sim.units.set(did, {
        id: did,
        ownerId: 'p_enemy',
        team: 2,
        type: 'basic_infantry',
        x: enemyTc.x + i,
        y: enemyTc.y + 2,
        hp: 150,
        maxHp: 150,
        state: 'idle',
        attackCooldown: 0,
        gatherCooldown: 0,
        facingAngle: 0
      });
    }

    // Human attacker approaches enemy base within 22 tiles
    const attackerId = 'human_strike_unit';
    sim.units.set(attackerId, {
      id: attackerId,
      ownerId: 'p_human',
      team: 1,
      type: 'basic_infantry',
      x: enemyTc.x + 6,
      y: enemyTc.y + 6,
      hp: 100,
      maxHp: 100,
      state: 'idle',
      attackCooldown: 0,
      gatherCooldown: 0,
      facingAngle: 0
    });

    // Run AI cycle: should detect threat and switch to defend
    for (let i = 0; i < 10; i++) {
      sim.tick(0.05);
    }

    const enemyState = sim.getAIState('p_enemy')!;
    expect(enemyState.currentTactic).toBe('defend');

    // Simulate attacker killed by defenders
    const attacker = sim.units.get(attackerId)!;
    attacker.state = 'dead';
    attacker.hp = 0;

    // Run AI cycle: threat eliminated, with 5 healthy defenders surviving, should launch immediate counter-offensive!
    for (let i = 0; i < 10; i++) {
      sim.tick(0.05);
    }

    expect(enemyState.currentTactic).toBe('counter');
  });

  it('detaches cavalry for worker harass raid', () => {
    const enemyTc = Array.from(sim.buildings.values()).find(b => b.ownerId === 'p_enemy' && b.type === 'town_centre')!;

    // Spawn a fast cavalry unit for enemy AI
    const cavId = 'enemy_cav_raider';
    sim.units.set(cavId, {
      id: cavId,
      ownerId: 'p_enemy',
      team: 2,
      type: 'cavalry',
      x: enemyTc.x + 2,
      y: enemyTc.y + 2,
      hp: 200,
      maxHp: 200,
      state: 'idle',
      attackCooldown: 0,
      gatherCooldown: 0,
      facingAngle: 0
    });

    // Spawn a human worker gathering resources
    const humanWorkerId = 'human_gatherer';
    sim.units.set(humanWorkerId, {
      id: humanWorkerId,
      ownerId: 'p_human',
      team: 1,
      type: 'worker',
      x: 20,
      y: 20,
      hp: 60,
      maxHp: 60,
      state: 'gathering',
      attackCooldown: 0,
      gatherCooldown: 0,
      facingAngle: 0
    });

    const enemyState = sim.getAIState('p_enemy')!;
    // Advance tick so harass cooldown is satisfied
    enemyState.lastHarassTick = 0;
    sim.currentTick = 1000;

    for (let i = 0; i < 10; i++) {
      sim.tick(0.05);
    }

    expect(enemyState.harassUnitIds).toContain(cavId);
    const cavUnit = sim.units.get(cavId)!;
    expect(cavUnit.state).toBe('attacking');
    expect(cavUnit.targetEntityId).toBeDefined();
    const targetedWorker = sim.units.get(cavUnit.targetEntityId!)!;
    expect(targetedWorker.type).toBe('worker');
    expect(targetedWorker.team).toBe(1);
  });

  it('applies weapon-triangle target prioritization in tactical auto-aggro combat', () => {
    // Spawn an idle Spearman for team 2
    const spearmanId = 'tactical_spearman';
    sim.units.set(spearmanId, {
      id: spearmanId,
      ownerId: 'p_enemy',
      team: 2,
      type: 'spearman',
      x: 25,
      y: 25,
      hp: 110,
      maxHp: 110,
      state: 'idle',
      attackCooldown: 0,
      gatherCooldown: 0,
      facingAngle: 0
    });

    // Spawn an enemy basic infantry at dist 3
    const infantryId = 'nearby_infantry';
    sim.units.set(infantryId, {
      id: infantryId,
      ownerId: 'p_human',
      team: 1,
      type: 'basic_infantry',
      x: 25 + 3,
      y: 25,
      hp: 120,
      maxHp: 120,
      state: 'idle',
      attackCooldown: 0,
      gatherCooldown: 0,
      facingAngle: 0
    });

    // Spawn an enemy cavalry slightly further at dist 4.5
    // With 2.8x spearman bonus against cavalry, tacticalDist for cavalry is 4.5 / 2.8 = 1.61 < 3.0!
    const cavalryId = 'target_cavalry';
    sim.units.set(cavalryId, {
      id: cavalryId,
      ownerId: 'p_human',
      team: 1,
      type: 'cavalry',
      x: 25,
      y: 25 + 4.5,
      hp: 170,
      maxHp: 170,
      state: 'idle',
      attackCooldown: 0,
      gatherCooldown: 0,
      facingAngle: 0
    });

    // Run 1 simulation tick (auto-aggro triggers during updateUnits)
    sim.tick(0.05);

    const spearman = sim.units.get(spearmanId)!;
    expect(spearman.state).toBe('attacking');
    expect(spearman.targetEntityId).toBe(cavalryId);
  });
  it('reproduces civilian workers when all workers are killed', () => {
    // Wipe out all enemy workers
    for (const u of sim.units.values()) {
      if (u.ownerId === 'p_enemy' && u.type === 'worker') {
        u.state = 'dead';
        u.hp = 0;
      }
    }
    const enemyPlayer = sim.players.get('p_enemy')!;
    // Starve enemy food to 0 to simulate total economic exhaustion
    enemyPlayer.resources.food = 0;

    // Run 10 ticks (0.5s) to trigger AI decision loop
    for (let i = 0; i < 10; i++) {
      sim.tick(0.05);
    }

    const enemyTc = Array.from(sim.buildings.values()).find(b => b.ownerId === 'p_enemy' && b.type === 'town_centre')!;
    // Town Centre should have received emergency relief and queued a new worker
    expect(enemyTc.productionQueue.length).toBeGreaterThan(0);
    expect(enemyTc.productionQueue[0].itemType).toBe('worker');
  });

  it('reproduces military troops continuously when army is wiped out', () => {
    const enemyPlayer = sim.players.get('p_enemy')!;
    enemyPlayer.resources.food = 200;
    enemyPlayer.resources.wood = 200;

    const enemyTc = Array.from(sim.buildings.values()).find(b => b.ownerId === 'p_enemy' && b.type === 'town_centre')!;

    // Construct a barracks for the enemy AI
    const barracksId = 'enemy_test_barracks';
    sim.buildings.set(barracksId, {
      id: barracksId,
      ownerId: 'p_enemy',
      team: 2,
      type: 'barracks',
      x: enemyTc.x + 6,
      y: enemyTc.y,
      width: 3,
      height: 3,
      hp: 1200,
      maxHp: 1200,
      isConstructed: true,
      constructionProgress: 100,
      productionQueue: []
    });

    // Wipe out any existing military units
    for (const u of sim.units.values()) {
      if (u.ownerId === 'p_enemy' && u.type !== 'worker' && u.type !== 'scout') {
        u.state = 'dead';
        u.hp = 0;
      }
    }

    // Run 10 ticks (0.5s) for AI decision loop
    for (let i = 0; i < 10; i++) {
      sim.tick(0.05);
    }

    const barracks = sim.buildings.get(barracksId)!;
    // Barracks should have immediately queued fresh replacement troops
    expect(barracks.productionQueue.length).toBeGreaterThan(0);
  });

  it('expands nation by building secondary Town Centre in Kingdom Age', () => {
    const enemyPlayer = sim.players.get('p_enemy')!;
    enemyPlayer.age = 'Kingdom Age';
    enemyPlayer.resources.wood = 500;
    enemyPlayer.resources.stone = 300;

    const enemyTc = Array.from(sim.buildings.values()).find(b => b.ownerId === 'p_enemy' && b.type === 'town_centre')!;

    // Ensure enemy has at least 8 workers to trigger expansion
    for (let i = 0; i < 8; i++) {
      const wid = `extra_w_${i}`;
      sim.units.set(wid, {
        id: wid,
        ownerId: 'p_enemy',
        team: 2,
        type: 'worker',
        x: enemyTc.x + 1,
        y: enemyTc.y + 1,
        hp: 100,
        maxHp: 100,
        state: 'idle',
        attackCooldown: 0,
        gatherCooldown: 0,
        facingAngle: 0,
        carriedResourceAmount: 0
      });
    }

    // Run 10 ticks for AI update
    for (let i = 0; i < 10; i++) {
      sim.tick(0.05);
    }

    const allTCs = Array.from(sim.buildings.values()).filter(b => b.ownerId === 'p_enemy' && b.type === 'town_centre');
    // AI should have planned and placed a second Town Centre (expansion site)
    expect(allTCs.length).toBeGreaterThanOrEqual(2);
  });
});
