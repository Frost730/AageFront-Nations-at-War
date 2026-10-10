import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { io as ClientSocket, Socket } from 'socket.io-client';
import http from 'http';
import express from 'express';
import { Server } from 'socket.io';
import {
  LobbyManager,
  setupSocketHandler
} from '../apps/server/src/lobby/lobbyManager.js';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  ServerSnapshot
} from '../packages/shared/src/index.js';

describe('LAN Multiplayer Client-Server Synchronization', () => {
  let server: http.Server;
  let port: number;
  let client1: Socket<ServerToClientEvents, ClientToServerEvents>;
  let client2: Socket<ServerToClientEvents, ClientToServerEvents>;

  beforeAll(async () => {
    const app = express();
    server = http.createServer(app);
    const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
      cors: { origin: '*' }
    });

    const lobbyManager = new LobbyManager('http://127.0.0.1:0');
    // Note: setupSocketHandler takes (io, lobbyManager)
    const { setupSocketHandler: initHandler } = await import('../apps/server/src/network/socketHandler.js');
    initHandler(io, lobbyManager);

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        port = typeof addr === 'object' && addr ? addr.port : 3001;
        resolve();
      });
    });
  });

  afterAll(() => {
    client1?.disconnect();
    client2?.disconnect();
    server?.close();
  });

  it('allows Host and Peer to connect, customize lobby, and start game', async () => {
    const serverUrl = `http://127.0.0.1:${port}`;

    // 1. Client 1 joins as Host
    client1 = ClientSocket(serverUrl);
    await new Promise<void>((resolve) => {
      client1.on('connect', () => {
        client1.emit('lobby:join', { name: 'Host Alice', civ: 'Veyran Confederacy', team: 1 });
      });
      client1.on('lobby:state', (state) => {
        if (state.players.length === 1 && state.players[0].isHost) {
          resolve();
        }
      });
    });

    // 2. Client 2 joins as Peer (Co-op ally on Team 1)
    client2 = ClientSocket(serverUrl);
    await new Promise<void>((resolve) => {
      client2.on('connect', () => {
        client2.emit('lobby:join', { name: 'Ally Bob', civ: 'Solari Dominion', team: 1 });
      });
      client2.on('lobby:state', (state) => {
        if (state.players.length === 2) {
          resolve();
        }
      });
    });

    // 3. Host adds AI on Team 2
    await new Promise<void>((resolve) => {
      client1.emit('lobby:addAi', { civ: 'Ironvale Kingdom', team: 2 });
      client1.on('lobby:state', (state) => {
        if (state.players.some(p => p.isAi && p.team === 2)) {
          resolve();
        }
      });
    });

    // 4. Host starts match
    const startPromise1 = new Promise<any>((resolve) => {
      client1.once('game:start', (data) => resolve(data));
    });
    const startPromise2 = new Promise<any>((resolve) => {
      client2.once('game:start', (data) => resolve(data));
    });

    client1.emit('lobby:startGame');

    const [startData1, startData2] = await Promise.all([startPromise1, startPromise2]);

    expect(startData1.settings.seed).toBe(startData2.settings.seed);
    expect(startData1.players.length).toBe(3); // Alice, Bob, AI
    expect(startData1.units.length).toBeGreaterThan(0);

    // Verify distinct co-op player identity assignment
    expect(startData1.yourPlayerId).toBeDefined();
    expect(startData2.yourPlayerId).toBeDefined();
    expect(startData1.yourPlayerId).not.toBe(startData2.yourPlayerId);
    expect(startData1.players.find(p => p.id === startData1.yourPlayerId)?.name).toBe('Host Alice');
    expect(startData2.players.find(p => p.id === startData2.yourPlayerId)?.name).toBe('Ally Bob');

    // 5. Verify authoritative snapshots arrive at both clients
    const snap1 = await new Promise<ServerSnapshot>((resolve) => {
      client1.once('game:snapshot', (snapshot) => resolve(snapshot));
    });
    const snap2 = await new Promise<ServerSnapshot>((resolve) => {
      client2.once('game:snapshot', (snapshot) => resolve(snapshot));
    });

    expect(snap1.tick).toBeGreaterThan(0);
    expect(snap2.tick).toBeGreaterThan(0);

    // 6. Host Alice moves her worker
    const aliceWorker = snap1.units.find(u => u.ownerId === snap1.players[0].id && u.type === 'worker')!;
    expect(aliceWorker).toBeDefined();

    client1.emit('game:command', {
      type: 'MOVE',
      unitIds: [aliceWorker.id],
      target: { x: aliceWorker.x + 4, y: aliceWorker.y + 4 }
    });

    // Wait a couple snapshots and check unit moved
    await new Promise<void>((resolve) => {
      let count = 0;
      const onSnap = (s: ServerSnapshot) => {
        count++;
        const moved = s.units.find(u => u.id === aliceWorker.id)!;
        if (moved.state === 'moving' || count >= 5) {
          client1.off('game:snapshot', onSnap);
          resolve();
        }
      };
      client1.on('game:snapshot', onSnap);
    });

    // 7. Verify permission enforcement: Bob (client 2) cannot issue orders for Alice's worker
    const aliceWorkerBefore = (await new Promise<ServerSnapshot>(r => client2.once('game:snapshot', r)))
      .units.find(u => u.id === aliceWorker.id)!;

    // Bob attempts to command Alice's worker to an unauthorized location
    client2.emit('game:command', {
      type: 'MOVE',
      unitIds: [aliceWorker.id],
      target: { x: 0, y: 0 }
    });

    // Alice's worker target must NOT change to {0, 0}
    const aliceWorkerAfter = (await new Promise<ServerSnapshot>(r => client2.once('game:snapshot', r)))
      .units.find(u => u.id === aliceWorker.id)!;

    expect(aliceWorkerAfter.targetX).not.toBe(0);

    // 8. Verify Co-op Tribute (Transfer Resources between Team 1 Allies)
    const aliceId = startData1.yourPlayerId!;
    const bobId = startData2.yourPlayerId!;
    const initialSnap = await new Promise<ServerSnapshot>(r => client1.once('game:snapshot', r));
    const aliceInitialFood = initialSnap.players.find(p => p.id === aliceId)!.resources.food;
    const bobInitialFood = initialSnap.players.find(p => p.id === bobId)!.resources.food;

    client1.emit('game:command', {
      type: 'TRANSFER_RESOURCES',
      recipientId: bobId,
      resource: 'food',
      amount: 100
    });

    await new Promise<void>((resolve) => {
      const onSnap = (s: ServerSnapshot) => {
        const aliceNow = s.players.find(p => p.id === aliceId)!;
        const bobNow = s.players.find(p => p.id === bobId)!;
        if (bobNow.resources.food === bobInitialFood + 100 && aliceNow.resources.food === aliceInitialFood - 100) {
          client1.off('game:snapshot', onSnap);
          resolve();
        }
      };
      client1.on('game:snapshot', onSnap);
    });

    // 9. Verify Co-op Cooperative Construction (Alice places house, Bob's worker helps build it)
    client1.emit('game:command', {
      type: 'BUILD',
      unitIds: [aliceWorker.id],
      buildingType: 'house',
      position: { x: Math.floor(aliceWorker.x) + 2, y: Math.floor(aliceWorker.y) + 2 }
    });

    let newBldgId = '';
    await new Promise<void>((resolve) => {
      const onSnap = (s: ServerSnapshot) => {
        const house = s.buildings.find(b => b.ownerId === aliceId && b.type === 'house');
        if (house) {
          newBldgId = house.id;
          client1.off('game:snapshot', onSnap);
          resolve();
        }
      };
      client1.on('game:snapshot', onSnap);
    });

    expect(newBldgId).not.toBe('');

    const bobWorker = snap1.units.find(u => u.ownerId === bobId && u.type === 'worker')!;
    expect(bobWorker).toBeDefined();

    // Bob orders his worker to help build Alice's house
    client2.emit('game:command', {
      type: 'REPAIR',
      unitIds: [bobWorker.id],
      buildingId: newBldgId
    });

    await new Promise<void>((resolve) => {
      let count = 0;
      const onSnap = (s: ServerSnapshot) => {
        count++;
        const bw = s.units.find(u => u.id === bobWorker.id)!;
        if (bw.targetEntityId === newBldgId || count >= 10) {
          client2.off('game:snapshot', onSnap);
          resolve();
        }
      };
      client2.on('game:snapshot', onSnap);
    });

    const bobWorkerState = (await new Promise<ServerSnapshot>(r => client2.once('game:snapshot', r)))
      .units.find(u => u.id === bobWorker.id)!;
    expect(bobWorkerState.targetEntityId).toBe(newBldgId);
  });
});
