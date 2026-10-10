import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { io as ClientSocket, Socket } from 'socket.io-client';
import http from 'http';
import express from 'express';
import { Server } from 'socket.io';
import { LobbyManager } from '../apps/server/src/lobby/lobbyManager.js';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  escapeHtml,
  sanitizeText
} from '../packages/shared/src/index.js';

describe('Privacy and Security Safeguards', () => {
  it('escapes HTML special characters to prevent XSS injection', () => {
    const malicious = '<script>alert("pwned")</script>&"\'';
    const escaped = escapeHtml(malicious);
    expect(escaped).not.toContain('<');
    expect(escaped).not.toContain('>');
    expect(escaped).toContain('&lt;script&gt;');
  });

  it('sanitizes input names, stripping HTML/quotes and enforcing length limits', () => {
    const dirty = '  <script>Commander "Overlord"  ';
    const clean = sanitizeText(dirty, 20);
    expect(clean).not.toContain('<');
    expect(clean).not.toContain('>');
    expect(clean).not.toContain('"');
    expect(clean.length).toBeLessThanOrEqual(20);
    expect(clean).toBe('scriptCommander Over');
  });

  describe('Server Socket and Network Privacy', () => {
    let server: http.Server;
    let port: number;
    let hostClient: Socket<ServerToClientEvents, ClientToServerEvents>;
    let peerClient: Socket<ServerToClientEvents, ClientToServerEvents>;
    let lobbyManager: LobbyManager;

    beforeAll(async () => {
      const app = express();
      server = http.createServer(app);
      const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
        cors: { origin: '*' }
      });

      lobbyManager = new LobbyManager('http://127.0.0.1:0');
      const { setupSocketHandler } = await import('../apps/server/src/network/socketHandler.js');
      setupSocketHandler(io, lobbyManager);

      await new Promise<void>((resolve) => {
        server.listen(0, '127.0.0.1', () => {
          const addr = server.address();
          port = typeof addr === 'object' && addr ? addr.port : 3003;
          resolve();
        });
      });
    });

    afterAll(() => {
      hostClient?.disconnect();
      peerClient?.disconnect();
      server?.close();
    });

    it('does not leak internal socket IDs to clients in lobby:state or joinRequested', async () => {
      const serverUrl = `http://127.0.0.1:${port}`;

      hostClient = ClientSocket(serverUrl);
      const hostState = await new Promise<any>((resolve) => {
        hostClient.on('connect', () => {
          hostClient.emit('lobby:join', { name: '<EvilHost>', civ: 'Solari Dominion', team: 1 });
        });
        hostClient.on('lobby:state', (state) => {
          if (state.players.length === 1) {
            resolve(state);
          }
        });
      });

      // 1. Check that socketId is masked / empty string in broadcast state
      expect(hostState.players[0].socketId).toBe('');
      // 2. Check that name was sanitized on server
      expect(hostState.players[0].name).not.toContain('<');

      // 3. Test private match mode
      hostClient.emit('lobby:setPrivate', true);
      await new Promise((r) => setTimeout(r, 100));

      const activeRooms = lobbyManager.getActiveRoomsList();
      // Room is marked private, so it must NOT appear in LAN discovery list
      expect(activeRooms.length).toBe(0);

      // 4. Test un-marking private mode
      hostClient.emit('lobby:setPrivate', false);
      await new Promise((r) => setTimeout(r, 100));
      expect(lobbyManager.getActiveRoomsList().length).toBe(1);

      // 5. Test join request privacy
      peerClient = ClientSocket(serverUrl);
      const hostJoinReqAlertPromise = new Promise<any>((resolve) => {
        hostClient.on('lobby:joinRequested', (req) => {
          resolve(req);
        });
      });

      peerClient.emit('lobby:requestJoin', {
        roomCode: 'MAIN',
        name: 'Friend <Hacker>',
        civ: 'Nambara Alliance',
        team: 1
      });

      const reqAlert = await hostJoinReqAlertPromise;
      // socketId must NOT be exposed in request alert to host
      expect((reqAlert as any).socketId).toBeUndefined();
      // Name must be sanitized
      expect(reqAlert.name).not.toContain('<');
    });
  });
});
