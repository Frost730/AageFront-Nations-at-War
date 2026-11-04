import { Server, Socket } from 'socket.io';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  CommandPayload,
  CivName,
  CIVILIZATIONS
} from '@agefront/shared';
import { LobbyManager, Room, validateGameSettings } from '../lobby/lobbyManager.js';


class SocketRateLimiter {
  private commandBuckets = new Map<string, { count: number; resetTime: number }>();
  private lobbyBuckets = new Map<string, { count: number; resetTime: number }>();

  public checkCommand(socketId: string, limit: number = 60): boolean {
    const now = Date.now();
    let b = this.commandBuckets.get(socketId);
    if (!b || now > b.resetTime) {
      this.commandBuckets.set(socketId, { count: 1, resetTime: now + 1000 });
      return true;
    }
    b.count++;
    return b.count <= limit;
  }

  public checkLobby(socketId: string, limit: number = 15): boolean {
    const now = Date.now();
    let b = this.lobbyBuckets.get(socketId);
    if (!b || now > b.resetTime) {
      this.lobbyBuckets.set(socketId, { count: 1, resetTime: now + 1000 });
      return true;
    }
    b.count++;
    return b.count <= limit;
  }

  public cleanup(socketId: string): void {
    this.commandBuckets.delete(socketId);
    this.lobbyBuckets.delete(socketId);
  }
}

const rateLimiter = new SocketRateLimiter();

export function setupSocketHandler(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  lobbyManager: LobbyManager
): void {
  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    let currentRoom: Room | null = null;
    let currentPlayerId: string | null = null;

    // List Active Open Rooms
    socket.on('lobby:listRooms', () => {
      socket.emit('lobby:roomList', lobbyManager.getActiveRoomsList());
    });

    // Request permission to join a match room
    socket.on('lobby:requestJoin', ({ roomCode = 'MAIN', name, civ = 'Veyran Confederacy', team = 1 }) => {
      if (!rateLimiter.checkLobby(socket.id)) {
        socket.emit('lobby:error', 'Too many requests. Please slow down.');
        return;
      }
      const room = lobbyManager.getOrCreateRoom(roomCode);
      if (room.players.length >= 8) {
        socket.emit('lobby:error', 'Match room is full (8/8 players).');
        return;
      }
      if (room.simulation) {
        socket.emit('lobby:error', 'Match is already in progress.');
        return;
      }

      // If approval is not required or no host yet, admit immediately
      if (!room.requireApproval || room.players.length === 0) {
        currentRoom = room;
        socket.join(room.roomCode);
        const player = lobbyManager.addPlayer(room, socket.id, name, civ, team);
        currentPlayerId = player.id;
        socket.emit('lobby:joined', { playerId: player.id });
        socket.emit('lobby:joinApproved', { roomCode: room.roomCode });
        io.to(room.roomCode).emit('lobby:state', lobbyManager.getLobbyState(room));
        return;
      }

      // Requires host approval
      currentRoom = room;
      const req = lobbyManager.addJoinRequest(room, socket.id, name, civ, team);
      if (!req) {
        socket.emit('lobby:error', 'Room request queue is full. Please try again shortly.');
        return;
      }

      const host = room.players.find(p => p.isHost) || room.players[0];
      socket.emit('lobby:joinPending', {
        requestId: req.requestId,
        message: 'Join request sent to Host. Awaiting permission...',
        roomCode: room.roomCode,
        hostName: host ? host.name : 'Host Commander'
      });

      if (room.hostSocketId) {
        // Strip socketId before emitting to host
        io.to(room.hostSocketId).emit('lobby:joinRequested', {
          requestId: req.requestId,
          name: req.name,
          civ: req.civ,
          team: req.team,
          requestedAt: req.requestedAt
        });
      }
      io.to(room.roomCode).emit('lobby:state', lobbyManager.getLobbyState(room));
    });

    // Host approves join request
    socket.on('lobby:approveJoin', ({ requestId }) => {
      if (!currentRoom) return;
      const host = currentRoom.players.find(p => p.socketId === socket.id);
      if (!host || !host.isHost) {
        socket.emit('lobby:error', 'Only the host can approve join requests.');
        return;
      }

      const result = lobbyManager.approveJoinRequest(currentRoom, requestId);
      if (result && result.request.socketId) {
        const applicantSocket = io.sockets.sockets.get(result.request.socketId);
        if (applicantSocket) {
          applicantSocket.join(currentRoom.roomCode);
        }
        io.to(result.request.socketId).emit('lobby:joined', { playerId: result.player.id });
        io.to(result.request.socketId).emit('lobby:joinApproved', { roomCode: currentRoom.roomCode });
        io.to(currentRoom.roomCode).emit('lobby:state', lobbyManager.getLobbyState(currentRoom));
      }
    });

    // Host declines join request
    socket.on('lobby:declineJoin', ({ requestId, reason }) => {
      if (!currentRoom) return;
      const host = currentRoom.players.find(p => p.socketId === socket.id);
      if (!host || !host.isHost) return;

      const req = lobbyManager.declineJoinRequest(currentRoom, requestId);
      if (req && req.socketId) {
        io.to(req.socketId).emit('lobby:joinDeclined', {
          reason: reason ? reason.slice(0, 80) : 'The host declined your join request.'
        });
        io.to(currentRoom.roomCode).emit('lobby:state', lobbyManager.getLobbyState(currentRoom));
      }
    });

    // Client cancels join request
    socket.on('lobby:cancelJoinRequest', ({ requestId }) => {
      if (!currentRoom) return;
      lobbyManager.cancelJoinRequest(currentRoom, requestId, socket.id);
      io.to(currentRoom.roomCode).emit('lobby:state', lobbyManager.getLobbyState(currentRoom));
    });

    // Host toggles approval requirement
    socket.on('lobby:setApprovalRequired', (requireApproval) => {
      if (!currentRoom) return;
      const host = currentRoom.players.find(p => p.socketId === socket.id);
      if (!host || !host.isHost) return;
      currentRoom.requireApproval = requireApproval;
      io.to(currentRoom.roomCode).emit('lobby:state', lobbyManager.getLobbyState(currentRoom));
    });

    // Host toggles match room privacy (hide from LAN discovery)
    socket.on('lobby:setPrivate', (isPrivate) => {
      if (!currentRoom) return;
      const host = currentRoom.players.find(p => p.socketId === socket.id);
      if (!host || !host.isHost) return;
      currentRoom.isPrivate = !!isPrivate;
      io.to(currentRoom.roomCode).emit('lobby:state', lobbyManager.getLobbyState(currentRoom));
    });

    // Direct Join / Host Lobby
    socket.on('lobby:join', ({ name, civ, team }) => {
      if (!rateLimiter.checkLobby(socket.id)) {
        socket.emit('lobby:error', 'Too many requests. Please slow down.');
        return;
      }
      currentRoom = lobbyManager.getOrCreateRoom('MAIN');
      socket.join(currentRoom.roomCode);

      const player = lobbyManager.addPlayer(currentRoom, socket.id, name, civ, team);
      currentPlayerId = player.id;

      socket.emit('lobby:joined', { playerId: player.id });

      // Broadcast lobby update
      io.to(currentRoom.roomCode).emit('lobby:state', lobbyManager.getLobbyState(currentRoom));
    });

    // Update settings (Host only)
    socket.on('lobby:updateSettings', settings => {
      if (!currentRoom) return;
      const player = currentRoom.players.find(p => p.socketId === socket.id);
      if (!player || !player.isHost) {
        socket.emit('lobby:error', 'Only the host can adjust game settings.');
        return;
      }

      const validatedSettings = validateGameSettings(settings);
      currentRoom.settings = { ...currentRoom.settings, ...validatedSettings };
      io.to(currentRoom.roomCode).emit('lobby:state', lobbyManager.getLobbyState(currentRoom));
    });

    // Update player (civ, team, ready state)
    socket.on('lobby:updatePlayer', data => {
      if (!currentRoom) return;
      const player = currentRoom.players.find(p => p.socketId === socket.id);
      if (!player) return;

      if (data && typeof data === 'object') {
        if (data.civ && data.civ in CIVILIZATIONS) player.civ = data.civ;
        if (typeof data.team === 'number' && Number.isInteger(data.team) && data.team >= 1 && data.team <= 4) player.team = data.team;
        if (typeof data.isReady === 'boolean') player.isReady = data.isReady;
      }

      io.to(currentRoom.roomCode).emit('lobby:state', lobbyManager.getLobbyState(currentRoom));
    });

    // Add AI opponent (Host only)
    socket.on('lobby:addAi', ({ civ, team }) => {
      if (!currentRoom) return;
      const player = currentRoom.players.find(p => p.socketId === socket.id);
      if (!player || !player.isHost) return;

      if (currentRoom.players.length < 8) {
        lobbyManager.addAi(currentRoom, civ, team);
      }
      io.to(currentRoom.roomCode).emit('lobby:state', lobbyManager.getLobbyState(currentRoom));
    });

    // Remove AI opponent (Host only)
    socket.on('lobby:removeAi', aiId => {
      if (!currentRoom) return;
      const player = currentRoom.players.find(p => p.socketId === socket.id);
      if (!player || !player.isHost) return;

      lobbyManager.removeAi(currentRoom, aiId);
      io.to(currentRoom.roomCode).emit('lobby:state', lobbyManager.getLobbyState(currentRoom));
    });

    // Start Game (Host only)
    socket.on('lobby:startGame', () => {
      if (!currentRoom) return;
      const player = currentRoom.players.find(p => p.socketId === socket.id);
      if (!player || !player.isHost) {
        socket.emit('lobby:error', 'Only the host can start the match.');
        return;
      }

      const sim = lobbyManager.startMatch(currentRoom);

      const baseStartData = {
        settings: currentRoom.settings,
        players: Array.from(sim.players.values()),
        mapTiles: {
          width: sim.mapData.width,
          height: sim.mapData.height,
          tiles: sim.mapData.tiles
        },
        resourceNodes: Array.from(sim.resourceNodes.values()),
        units: Array.from(sim.units.values()),
        buildings: Array.from(sim.buildings.values())
      };

      // Emit game start with individual yourPlayerId to each connected human player
      for (const p of currentRoom.players) {
        if (!p.isAi && p.socketId) {
          io.to(p.socketId).emit('game:start', {
            ...baseStartData,
            yourPlayerId: p.id
          });
        }
      }

      // Start authoritative 20 Ticks/Sec loop
      if (currentRoom.tickInterval) {
        clearInterval(currentRoom.tickInterval);
      }

      currentRoom.tickInterval = setInterval(() => {
        if (!currentRoom || !currentRoom.simulation) return;

        currentRoom.simulation.tick(0.05);
        const snapshot = currentRoom.simulation.getSnapshot();
        io.to(currentRoom.roomCode).emit('game:snapshot', snapshot);

        if (currentRoom.simulation.isGameOver && currentRoom.tickInterval) {
          // Stop tick interval once finished
          clearInterval(currentRoom.tickInterval);
          currentRoom.tickInterval = null;
        }
      }, 50);
    });

    // Handle in-game command (Validated server-side and rate-limited)
    socket.on('game:command', (cmd: CommandPayload) => {
      if (!currentRoom || !currentRoom.simulation || !currentPlayerId) return;
      if (!rateLimiter.checkCommand(socket.id)) return;
      if (!cmd || typeof cmd !== 'object') return;

      try {
        currentRoom.simulation.processCommand(currentPlayerId, cmd);
      } catch (err) {
        console.error('[Security] Exception caught in processCommand for socket', socket.id, err);
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      rateLimiter.cleanup(socket.id);
      if (currentRoom) {
        lobbyManager.removePlayer(currentRoom, socket.id);
        currentRoom.pendingRequests = currentRoom.pendingRequests.filter(r => r.socketId !== socket.id);
        io.to(currentRoom.roomCode).emit('lobby:state', lobbyManager.getLobbyState(currentRoom));
      }
    });
  });
}
