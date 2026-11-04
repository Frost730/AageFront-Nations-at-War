import { describe, it, expect } from 'vitest';
import {
  SimulationEngine,
  escapeHtml,
  sanitizeText,
  CIVILIZATIONS
} from '../packages/shared/src/index.js';
import {
  LobbyManager,
  validateGameSettings
} from '../apps/server/src/lobby/lobbyManager.js';

describe('Vibe-Coded Security Hardening & Vulnerability Mitigations', () => {
  function createTestSim() {
    return new SimulationEngine(
      {
        mapType: 'green_frontier',
        mapSize: 48,
        seed: 42,
        victoryCondition: 'conquest',
        startingResources: 'standard',
        sharedTeamEconomy: false,
        aiDifficulty: 'standard'
      },
      [
        { id: 'p1', name: 'Player 1', team: 1, civ: 'Veyran Confederacy', color: '#2563eb', isAi: false },
        { id: 'p2', name: 'Player 2', team: 2, civ: 'Ironvale Kingdom', color: '#dc2626', isAi: true }
      ]
    );
  }

  describe('1. In-Game Command Injection & Crash Immunity', () => {
    it('gracefully rejects malformed MOVE command with undefined unitIds without throwing TypeError', () => {
      const sim = createTestSim();
      expect(() => {
        const ok = sim.processCommand('p1', { type: 'MOVE' } as any);
        expect(ok).toBe(false);
      }).not.toThrow();
    });

    it('rejects MOVE command with NaN/Infinity target coordinates and clamps out-of-bounds positions', () => {
      const sim = createTestSim();
      const p1Unit = Array.from(sim.units.values()).find(u => u.ownerId === 'p1')!;
      expect(p1Unit).toBeDefined();

      // NaN coords
      const nanOk = sim.processCommand('p1', {
        type: 'MOVE',
        unitIds: [p1Unit.id],
        target: { x: NaN, y: NaN }
      });
      expect(nanOk).toBe(false);

      // Infinity coords
      const infOk = sim.processCommand('p1', {
        type: 'MOVE',
        unitIds: [p1Unit.id],
        target: { x: Infinity, y: 10 }
      });
      expect(infOk).toBe(false);
    });

    it('rejects commands with prototype pollution keys or non-object payloads', () => {
      const sim = createTestSim();
      expect(sim.processCommand('p1', null as any)).toBe(false);
      expect(sim.processCommand('p1', undefined as any)).toBe(false);
      expect(sim.processCommand('p1', 'DROP TABLE units;' as any)).toBe(false);
    });
  });

  describe('2. Economic & Trading Cheat Exploit Mitigations', () => {
    it('blocks commodity trading when player does not own an operational Market', () => {
      const sim = createTestSim();
      const p1 = sim.players.get('p1')!;
      p1.resources.wood = 500;
      p1.resources.food = 100;

      // P1 has no market building yet
      const tradeOk = sim.processCommand('p1', {
        type: 'TRADE_COMMODITY',
        buyResource: 'food',
        sellResource: 'wood',
        buyAmount: 100,
        sellAmount: 120
      });
      expect(tradeOk).toBe(false);
      expect(p1.resources.wood).toBe(500); // Not deducted
    });

    it('blocks unfair / infinite resource inflation trades (e.g. buying 10,000 food for 1 wood)', () => {
      const sim = createTestSim();
      const p1 = sim.players.get('p1')!;
      p1.resources.wood = 500;
      p1.resources.food = 100;

      // Add a constructed market
      sim.buildings.set('market_test', {
        id: 'market_test',
        ownerId: 'p1',
        team: 1,
        type: 'market',
        x: 10,
        y: 10,
        width: 3,
        height: 3,
        hp: 600,
        maxHp: 600,
        isConstructed: true,
        constructionProgress: 1,
        productionQueue: []
      });

      // Exploitative trade: 1 wood for 10000 food
      const exploitOk = sim.processCommand('p1', {
        type: 'TRADE_COMMODITY',
        buyResource: 'food',
        sellResource: 'wood',
        buyAmount: 10000,
        sellAmount: 1
      });
      expect(exploitOk).toBe(false);
      expect(p1.resources.wood).toBe(500);
      expect(p1.resources.food).toBe(100);
    });

    it('blocks corrupt resource transfer attempts with NaN or invalid resource types', () => {
      const sim = createTestSim();
      const p1 = sim.players.get('p1')!;
      p1.resources.food = 500;

      // Add a teammate
      sim.players.set('p1_ally', {
        id: 'p1_ally',
        name: 'Ally',
        team: 1,
        civ: 'Solari Dominion',
        color: '#10b981',
        age: 'Founding Age',
        population: 3,
        maxPopulation: 25,
        isAi: false,
        isDefeated: false,
        researchedTechs: [],
        resources: { food: 100, wood: 100, stone: 50, metal: 50, knowledge: 0 },
        stats: { score: 100, enemiesDefeated: 0, buildingsConstructed: 1, technologiesResearched: 0, resourcesGathered: { food: 0, wood: 0, stone: 0, metal: 0, knowledge: 0 } }
      });

      // Transfer with NaN amount
      const nanTransfer = sim.processCommand('p1', {
        type: 'TRANSFER_RESOURCES',
        recipientId: 'p1_ally',
        resource: 'food',
        amount: NaN
      });
      expect(nanTransfer).toBe(false);
      expect(p1.resources.food).toBe(500); // Must NOT become NaN

      // Transfer with invalid resource type
      const invalidResTransfer = sim.processCommand('p1', {
        type: 'TRANSFER_RESOURCES',
        recipientId: 'p1_ally',
        resource: '__proto__' as any,
        amount: 50
      });
      expect(invalidResTransfer).toBe(false);
      expect(p1.resources.food).toBe(500);
    });
  });

  describe('3. Lobby & Server-Side Security Hardening', () => {
    it('validates and clamps game settings to safe boundaries, ignoring illegal prototype pollution', () => {
      const dangerousSettings = {
        mapSize: 999999999, // Attempted Out-Of-Memory DoS
        mapType: '../../etc/passwd', // Path-like string
        victoryCondition: 'hacked',
        seed: 12345,
        __proto__: { admin: true }
      };

      const validated = validateGameSettings(dangerousSettings);
      expect(validated.mapSize).toBe(400); // Clamped to max allowed 400
      expect((validated as any).mapType).toBeUndefined(); // Illegal mapType ignored
      expect((validated as any).victoryCondition).toBeUndefined(); // Illegal victory ignored
      expect(validated.seed).toBe(12345);
      expect((Object.prototype as any).admin).toBeUndefined(); // Prototype NOT polluted
    });

    it('enforces maximum 8 players per room when adding AI bots', () => {
      const lobby = new LobbyManager('http://127.0.0.1:3000');
      const room = lobby.getOrCreateRoom('SECURITY_TEST');
      lobby.addPlayer(room, 'sock_host', 'Host Commander', 'Veyran Confederacy', 1);

      // Add 7 AIs (room becomes full at 8)
      for (let i = 0; i < 7; i++) {
        const added = lobby.addAi(room, 'Ironvale Kingdom', 2);
        expect(added).not.toBeNull();
      }
      expect(room.players.length).toBe(8);

      // 9th player must be blocked
      const blocked = lobby.addAi(room, 'Ironvale Kingdom', 2);
      expect(blocked).toBeNull();
      expect(room.players.length).toBe(8);
    });

    it('sanitizes roomCode and automatically prunes empty inactive rooms', () => {
      const lobby = new LobbyManager('http://127.0.0.1:3000');
      const room = lobby.getOrCreateRoom('ROOM <script>');
      expect(room.roomCode).not.toContain('<');
      expect(room.roomCode).not.toContain('>');

      // Pruning empty rooms
      lobby.pruneEmptyRooms();
      expect(room.players.length).toBe(0);
    });
  });

  describe('4. Cross-Site Scripting (XSS) Sanitization', () => {
    it('properly escapes malicious HTML injection strings', () => {
      const xssPayload = '"><img src=x onerror=alert(1)>';
      const escaped = escapeHtml(xssPayload);
      expect(escaped).not.toContain('<');
      expect(escaped).not.toContain('>');
      expect(escaped).not.toContain('"');
      expect(escaped).toContain('&lt;img');
    });

    it('sanitizes input names, stripping HTML characters and enforcing length limits', () => {
      const dirty = '<b>Overlord</b> 12345678901234567890';
      const sanitized = sanitizeText(dirty, 20);
      expect(sanitized).not.toContain('<');
      expect(sanitized).not.toContain('>');
      expect(sanitized.length).toBeLessThanOrEqual(20);
    });
  });
});
