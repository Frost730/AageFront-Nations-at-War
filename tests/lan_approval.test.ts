import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { io as ClientSocket, Socket } from 'socket.io-client';
import http from 'http';
import express from 'express';
import { Server } from 'socket.io';
import { LobbyManager } from '../apps/server/src/lobby/lobbyManager.js';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  ActiveRoomSummary
} from '../packages/shared/src/index.js';

describe('LAN Room Discovery and Permission Approval Flow', () => {
  let server: http.Server;
  let port: number;
  let hostClient: Socket<ServerToClientEvents, ClientToServerEvents>;
  let applicantClient1: Socket<ServerToClientEvents, ClientToServerEvents>;
  let applicantClient2: Socket<ServerToClientEvents, ClientToServerEvents>;
  let lobbyManager: LobbyManager;

  beforeAll(async () => {
    const app = express();
    server = http.createServer(app);
    const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
      cors: { origin: '*' }
    });

    lobbyManager = new LobbyManager('http://127.0.0.1:0');
    app.get('/api/rooms', (_req, res) => {
      res.json(lobbyManager.getActiveRoomsList());
    });

    const { setupSocketHandler } = await import('../apps/server/src/network/socketHandler.js');
    setupSocketHandler(io, lobbyManager);

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        port = typeof addr === 'object' && addr ? addr.port : 3002;
        resolve();
      });
    });
  });

  afterAll(() => {
    hostClient?.disconnect();
    applicantClient1?.disconnect();
    applicantClient2?.disconnect();
    server?.close();
  });

  it('allows friend to see host room and ask permission to join, with host approval and decline', async () => {
    const serverUrl = `http://127.0.0.1:${port}`;

    // 1. Host creates / joins lobby
    hostClient = ClientSocket(serverUrl);
    await new Promise<void>((resolve) => {
      hostClient.on('connect', () => {
        hostClient.emit('lobby:join', { name: 'Host Commander', civ: 'Solari Dominion', team: 1 });
      });
      hostClient.on('lobby:state', (state) => {
        if (state.players.length === 1 && state.players[0].isHost) {
          resolve();
        }
      });
    });

    // 2. Friend connects and lists rooms
    applicantClient1 = ClientSocket(serverUrl);
    const rooms = await new Promise<ActiveRoomSummary[]>((resolve) => {
      applicantClient1.on('connect', () => {
        applicantClient1.emit('lobby:listRooms');
      });
      applicantClient1.on('lobby:roomList', (roomList) => {
        resolve(roomList);
      });
    });

    expect(rooms.length).toBeGreaterThan(0);
    const mainRoom = rooms[0];
    expect(mainRoom.hostName).toBe('Host Commander');
    expect(mainRoom.hostCiv).toBe('Solari Dominion');
    expect(mainRoom.requireApproval).toBe(true);

    // 3. Friend requests permission to join
    const pendingPromise = new Promise<{ requestId: string; hostName?: string }>((resolve) => {
      applicantClient1.on('lobby:joinPending', (data) => {
        resolve(data);
      });
    });

    const hostRequestAlertPromise = new Promise<{ requestId: string; name: string }>((resolve) => {
      hostClient.on('lobby:joinRequested', (req) => {
        resolve(req);
      });
    });

    applicantClient1.emit('lobby:requestJoin', {
      roomCode: mainRoom.roomCode,
      name: 'Friend Bob',
      civ: 'Nambara Alliance',
      team: 1
    });

    const pendingData = await pendingPromise;
    expect(pendingData.requestId).toBeTruthy();
    expect(pendingData.hostName).toBe('Host Commander');

    const hostReceived = await hostRequestAlertPromise;
    expect(hostReceived.name).toBe('Friend Bob');
    expect(hostReceived.requestId).toBe(pendingData.requestId);

    // 4. Host approves Friend Bob
    const approvedPromise = new Promise<{ roomCode: string }>((resolve) => {
      applicantClient1.on('lobby:joinApproved', (data) => {
        resolve(data);
      });
    });

    const hostLobbyUpdatedPromise = new Promise<void>((resolve) => {
      const handler = (state: any) => {
        if (state.players.some((p: any) => p.name === 'Friend Bob')) {
          hostClient.off('lobby:state', handler);
          resolve();
        }
      };
      hostClient.on('lobby:state', handler);
    });

    hostClient.emit('lobby:approveJoin', { requestId: pendingData.requestId });

    const approvedData = await approvedPromise;
    expect(approvedData.roomCode).toBe(mainRoom.roomCode);
    await hostLobbyUpdatedPromise;

    // 5. Test decline flow with applicant 2
    applicantClient2 = ClientSocket(serverUrl);
    const applicant2PendingPromise = new Promise<{ requestId: string }>((resolve) => {
      applicantClient2.on('connect', () => {
        applicantClient2.emit('lobby:requestJoin', {
          roomCode: mainRoom.roomCode,
          name: 'Rogue Player',
          civ: 'Ironvale Kingdom',
          team: 2
        });
      });
      applicantClient2.on('lobby:joinPending', (data) => {
        resolve(data);
      });
    });

    const app2Pending = await applicant2PendingPromise;

    const declinedPromise = new Promise<{ reason: string }>((resolve) => {
      applicantClient2.on('lobby:joinDeclined', (data) => {
        resolve(data);
      });
    });

    hostClient.emit('lobby:declineJoin', {
      requestId: app2Pending.requestId,
      reason: 'Sorry, this match is reserved for team allies.'
    });

    const declinedData = await declinedPromise;
    expect(declinedData.reason).toContain('reserved for team allies');
  });
});
