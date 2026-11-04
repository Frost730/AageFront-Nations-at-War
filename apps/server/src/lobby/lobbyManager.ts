import {
  GameSettings,
  LobbyPlayer,
  LobbyState,
  CivName,
  CIVILIZATIONS,
  SimulationEngine,
  CommandPayload,
  RoomJoinRequest,
  ActiveRoomSummary,
  sanitizeText
} from '@agefront/shared';

export interface Room {
  roomCode: string;
  hostAddress: string;
  hostSocketId: string;
  players: LobbyPlayer[];
  settings: GameSettings;
  simulation: SimulationEngine | null;
  tickInterval: NodeJS.Timeout | null;
  disconnectedGrace: Map<string, NodeJS.Timeout>; // Grace period timers
  requireApproval: boolean;
  isPrivate: boolean;
  pendingRequests: RoomJoinRequest[];
}


export function validateGameSettings(settings: any): Partial<GameSettings> {
  if (!settings || typeof settings !== 'object') return {};
  const validated: Partial<GameSettings> = {};
  const allowedMapTypes = ['green_frontier', 'highland_kingdom', 'riverlands'];
  const allowedVictories = ['conquest', 'territorial', 'technology', 'elimination'];
  const allowedResources = ['standard', 'high', 'deathmatch'];
  const allowedDifficulties = ['easy', 'standard', 'tough', 'toughest', 'medium', 'hard'];

  if (typeof settings.mapType === 'string' && allowedMapTypes.includes(settings.mapType)) {
    validated.mapType = settings.mapType as any;
  }
  if (typeof settings.mapSize === 'number' && Number.isFinite(settings.mapSize)) {
    validated.mapSize = Math.max(40, Math.min(400, Math.round(settings.mapSize)));
  }
  if (typeof settings.seed === 'number' && Number.isFinite(settings.seed)) {
    validated.seed = Math.round(settings.seed);
  }
  if (typeof settings.victoryCondition === 'string' && allowedVictories.includes(settings.victoryCondition)) {
    validated.victoryCondition = settings.victoryCondition as any;
  }
  if (typeof settings.startingResources === 'string' && allowedResources.includes(settings.startingResources)) {
    validated.startingResources = settings.startingResources as any;
  }
  if (typeof settings.sharedTeamEconomy === 'boolean') {
    validated.sharedTeamEconomy = settings.sharedTeamEconomy;
  }
  if (typeof settings.aiDifficulty === 'string' && allowedDifficulties.includes(settings.aiDifficulty)) {
    validated.aiDifficulty = settings.aiDifficulty as any;
  }
  return validated;
}

export class LobbyManager {
  private rooms: Map<string, Room> = new Map();
  private hostAddress: string;

  constructor(hostAddress: string) {
    this.hostAddress = hostAddress;
  }

  public getOrCreateRoom(roomCode: string = 'MAIN'): Room {
    const safeCode = (typeof roomCode === 'string' && roomCode.trim().length > 0)
      ? sanitizeText(roomCode.trim(), 16).replace(/[^A-Za-z0-9_-]/g, '') || 'MAIN'
      : 'MAIN';

    let room = this.rooms.get(safeCode);
    if (!room) {
      // Auto-prune empty inactive rooms to prevent resource exhaustion
      this.pruneEmptyRooms();

      // Enforce global room limit (max 50 concurrent rooms)
      if (this.rooms.size >= 50) {
        return (this.rooms.get('MAIN') || Array.from(this.rooms.values())[0])!;
      }

      room = {
        roomCode: safeCode,
        hostAddress: this.hostAddress,
        hostSocketId: '',
        players: [],
        settings: {
          mapType: 'green_frontier',
          mapSize: 280,
          seed: Math.floor(Math.random() * 100000),
          victoryCondition: 'conquest',
          startingResources: 'standard',
          sharedTeamEconomy: false,
          aiDifficulty: 'standard'
        },
        simulation: null,
        tickInterval: null,
        disconnectedGrace: new Map(),
        requireApproval: true,
        isPrivate: false,
        pendingRequests: []
      };
      this.rooms.set(safeCode, room);
    }
    return room;
  }

  public pruneEmptyRooms(): void {
    for (const [code, r] of this.rooms.entries()) {
      if (code !== 'MAIN' && r.players.length === 0 && !r.simulation) {
        this.rooms.delete(code);
      }
    }
  }

  public addPlayer(
    room: Room,
    socketId: string,
    name: string,
    civ: CivName = 'Veyran Confederacy',
    team: number = 1
  ): LobbyPlayer {
    const isFirst = room.players.length === 0;
    const isHost = isFirst || room.hostSocketId === socketId;

    if (isHost) {
      room.hostSocketId = socketId;
    }

    const cleanName = sanitizeText(name, 20) || 'Commander';
    const validCiv: CivName = (civ && civ in CIVILIZATIONS) ? civ : 'Veyran Confederacy';
    const validTeam = (Number.isInteger(team) && team >= 1 && team <= 4) ? team : 1;

    // Check if reconnecting player with same name
    const existing = room.players.find(p => p.name === cleanName);
    if (existing) {
      existing.socketId = socketId;
      const grace = room.disconnectedGrace.get(existing.id);
      if (grace) {
        clearTimeout(grace);
        room.disconnectedGrace.delete(existing.id);
      }
      return existing;
    }

    const playerId = `player_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const colors = ['#2563eb', '#16a34a', '#dc2626', '#d97706', '#9333ea', '#06b6d4'];
    const assignedColor = colors[room.players.length % colors.length];

    const newPlayer: LobbyPlayer = {
      id: playerId,
      socketId,
      name: cleanName,
      civ: validCiv,
      team: validTeam,
      color: assignedColor,
      isHost,
      isReady: isHost,
      isAi: false
    };

    room.players.push(newPlayer);
    return newPlayer;
  }

  public addAi(room: Room, civ: CivName = 'Ironvale Kingdom', team: number = 2): LobbyPlayer | null {
    if (room.players.length >= 8) return null;
    const validCiv: CivName = (civ && civ in CIVILIZATIONS) ? civ : 'Ironvale Kingdom';
    const validTeam = (Number.isInteger(team) && team >= 1 && team <= 4) ? team : 2;
    const aiId = `ai_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const allyColors = ['#06b6d4', '#10b981', '#38bdf8', '#8b5cf6'];
    const enemyColors = ['#dc2626', '#e11d48', '#f97316', '#b91c1c'];
    const color = team === 1
      ? allyColors[room.players.filter(p => p.team === 1).length % allyColors.length]
      : enemyColors[room.players.filter(p => p.team !== 1).length % enemyColors.length];

    const aiPlayer: LobbyPlayer = {
      id: aiId,
      socketId: '',
      name: validTeam === 1 ? `AI Ally (${validCiv.split(' ')[0]})` : `AI Enemy (${validCiv.split(' ')[0]})`,
      team: validTeam,
      civ: validCiv,
      color,
      isHost: false,
      isReady: true,
      isAi: true
    };
    room.players.push(aiPlayer);
    return aiPlayer;
  }

  public removeAi(room: Room, aiId: string): boolean {
    const idx = room.players.findIndex(p => p.id === aiId && p.isAi);
    if (idx !== -1) {
      room.players.splice(idx, 1);
      return true;
    }
    return false;
  }

  public removePlayer(room: Room, socketId: string): void {
    const player = room.players.find(p => p.socketId === socketId);
    if (!player) return;

    if (room.simulation) {
      // Game in progress: start a 60-second grace reconnection period
      const timer = setTimeout(() => {
        room.players = room.players.filter(p => p.id !== player.id);
        room.disconnectedGrace.delete(player.id);
      }, 60000);
      room.disconnectedGrace.set(player.id, timer);
    } else {
      room.players = room.players.filter(p => p.socketId !== socketId);
      if (player.isHost && room.players.length > 0) {
        // Transfer host to first non-AI player
        const nextHuman = room.players.find(p => !p.isAi);
        if (nextHuman) {
          nextHuman.isHost = true;
          room.hostSocketId = nextHuman.socketId;
        }
      }
    }
  }

  public getLobbyState(room: Room): LobbyState {
    // Strip private internal socketIds from player data broadcast to clients
    const safePlayers = room.players.map(p => ({
      ...p,
      socketId: '' // Prevent leaking connection IDs over the network
    }));

    // Strip internal socketId from pending requests broadcast to host
    const safePendingRequests = room.pendingRequests.map(r => ({
      requestId: r.requestId,
      name: r.name,
      civ: r.civ,
      team: r.team,
      requestedAt: r.requestedAt
    }));

    return {
      roomCode: room.roomCode,
      hostAddress: this.hostAddress,
      players: safePlayers,
      settings: room.settings,
      inGame: room.simulation !== null,
      requireApproval: room.requireApproval,
      isPrivate: room.isPrivate,
      pendingRequests: safePendingRequests
    };
  }

  public getActiveRoomsList(): ActiveRoomSummary[] {
    const list: ActiveRoomSummary[] = [];
    for (const room of this.rooms.values()) {
      // Do not list empty rooms or rooms marked private by the host
      if (room.players.length > 0 && !room.isPrivate) {
        const host = room.players.find(p => p.isHost) || room.players[0];
        list.push({
          roomCode: room.roomCode,
          roomName: `${host.name}'s War Room`,
          hostName: host.name,
          hostCiv: host.civ,
          playerCount: room.players.length,
          maxPlayers: 8,
          mapType: room.settings.mapType,
          mapSize: room.settings.mapSize,
          inGame: room.simulation !== null,
          requireApproval: room.requireApproval,
          isPrivate: room.isPrivate,
          hostAddress: this.hostAddress
        });
      }
    }
    return list;
  }

  public addJoinRequest(
    room: Room,
    socketId: string,
    name: string,
    civ: CivName = 'Veyran Confederacy',
    team: number = 1
  ): RoomJoinRequest | null {
    // Prune stale join requests older than 2 minutes
    const now = Date.now();
    room.pendingRequests = room.pendingRequests.filter(r => now - r.requestedAt < 120000);

    // Limit maximum pending requests per room to prevent memory/DOM exhaustion
    if (room.pendingRequests.length >= 10) {
      return null;
    }

    // Remove any previous request from this socket
    room.pendingRequests = room.pendingRequests.filter(r => r.socketId !== socketId);

    const cleanName = sanitizeText(name, 20) || 'Applicant';

    const req: RoomJoinRequest = {
      requestId: `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      socketId,
      name: cleanName,
      civ,
      team,
      requestedAt: now
    };
    room.pendingRequests.push(req);
    return req;
  }

  public approveJoinRequest(room: Room, requestId: string): { request: RoomJoinRequest; player: LobbyPlayer } | null {
    const idx = room.pendingRequests.findIndex(r => r.requestId === requestId);
    if (idx === -1) return null;
    const req = room.pendingRequests[idx];
    room.pendingRequests.splice(idx, 1);

    const player = this.addPlayer(room, req.socketId || '', req.name, req.civ, req.team);
    return { request: req, player };
  }

  public declineJoinRequest(room: Room, requestId: string): RoomJoinRequest | null {
    const idx = room.pendingRequests.findIndex(r => r.requestId === requestId);
    if (idx === -1) return null;
    const req = room.pendingRequests[idx];
    room.pendingRequests.splice(idx, 1);
    return req;
  }

  public cancelJoinRequest(room: Room, requestId: string, socketId: string): boolean {
    const idx = room.pendingRequests.findIndex(r => r.requestId === requestId && r.socketId === socketId);
    if (idx !== -1) {
      room.pendingRequests.splice(idx, 1);
      return true;
    }
    return false;
  }

  public startMatch(room: Room): SimulationEngine {
    // If not enough opponents, auto-add an AI opponent on opposite team
    const teams = new Set(room.players.map(p => p.team));
    if (teams.size < 2) {
      this.addAi(room, 'Ironvale Kingdom', 2);
    }

    const simPlayers = room.players.map(p => ({
      id: p.id,
      name: p.name,
      team: p.team,
      civ: p.civ,
      color: p.color,
      isAi: p.isAi
    }));

    room.simulation = new SimulationEngine(room.settings, simPlayers);
    return room.simulation;
  }
}
