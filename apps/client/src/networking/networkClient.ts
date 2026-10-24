import { io, Socket } from 'socket.io-client';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  LobbyState,
  ServerSnapshot,
  CommandPayload,
  GameSettings,
  PlayerState,
  UnitData,
  BuildingData,
  ResourceNodeData,
  CivName,
  AIDifficulty,
  SimulationEngine,
  ActiveRoomSummary,
  RoomJoinRequest
} from '@agefront/shared';

export interface GameStartData {
  settings: GameSettings;
  players: PlayerState[];
  mapTiles: { width: number; height: number; tiles: any[] };
  resourceNodes: ResourceNodeData[];
  units: UnitData[];
  buildings: BuildingData[];
  yourPlayerId?: string;
}

export interface SkirmishCommanderConfig {
  id?: string;
  name: string;
  civ: CivName;
  team: number;
  isAi: boolean;
  color?: string;
  difficulty?: AIDifficulty;
}

export class NetworkClient {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
  public isSinglePlayer: boolean = false;
  private localSim: SimulationEngine | null = null;
  private localTickInterval: any = null;

  public onLobbyState: ((state: LobbyState) => void) | null = null;
  public onLobbyError: ((msg: string) => void) | null = null;
  public onRoomList: ((rooms: ActiveRoomSummary[]) => void) | null = null;
  public onJoinPending: ((data: { requestId: string; message: string; roomCode: string; hostName?: string }) => void) | null = null;
  public onJoinApproved: ((data: { roomCode: string }) => void) | null = null;
  public onJoinDeclined: ((data: { reason: string }) => void) | null = null;
  public onJoinRequested: ((request: RoomJoinRequest) => void) | null = null;
  public onGameStart: ((data: GameStartData) => void) | null = null;
  public onGameSnapshot: ((snapshot: ServerSnapshot) => void) | null = null;

  public myPlayerId: string = '';
  public myTeam: number = 1;

  public connect(serverUrl: string): void {
    if (this.socket) {
      this.socket.disconnect();
    }
    this.isSinglePlayer = false;

    this.socket = io(serverUrl, {
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    this.socket.on('lobby:joined', ({ playerId }) => {
      this.myPlayerId = playerId;
    });

    this.socket.on('lobby:state', state => {
      this.onLobbyState?.(state);
    });

    this.socket.on('lobby:roomList', rooms => {
      this.onRoomList?.(rooms);
    });

    this.socket.on('lobby:joinPending', data => {
      this.onJoinPending?.(data);
    });

    this.socket.on('lobby:joinApproved', data => {
      this.onJoinApproved?.(data);
    });

    this.socket.on('lobby:joinDeclined', data => {
      this.onJoinDeclined?.(data);
    });

    this.socket.on('lobby:joinRequested', request => {
      this.onJoinRequested?.(request);
    });

    this.socket.on('lobby:error', msg => {
      this.onLobbyError?.(msg);
    });

    this.socket.on('game:start', data => {
      if (data.yourPlayerId) {
        this.myPlayerId = data.yourPlayerId;
      }
      this.onGameStart?.(data);
    });

    this.socket.on('game:snapshot', snapshot => {
      this.onGameSnapshot?.(snapshot);
    });
  }

  public listRooms(): void {
    this.socket?.emit('lobby:listRooms');
  }

  public requestJoin(name: string, civ: CivName = 'Veyran Confederacy', team: number = 1, roomCode: string = 'MAIN'): void {
    this.socket?.emit('lobby:requestJoin', { roomCode, name, civ, team });
  }

  public approveJoin(requestId: string): void {
    this.socket?.emit('lobby:approveJoin', { requestId });
  }

  public declineJoin(requestId: string, reason?: string): void {
    this.socket?.emit('lobby:declineJoin', { requestId, reason });
  }

  public cancelJoinRequest(requestId: string): void {
    this.socket?.emit('lobby:cancelJoinRequest', { requestId });
  }

  public setApprovalRequired(requireApproval: boolean): void {
    this.socket?.emit('lobby:setApprovalRequired', requireApproval);
  }

  public setPrivate(isPrivate: boolean): void {
    this.socket?.emit('lobby:setPrivate', isPrivate);
  }

  public joinLobby(name: string, civ: CivName = 'Veyran Confederacy', team: number = 1): void {
    this.socket?.emit('lobby:join', { name, civ, team });
  }

  public updateLobbySettings(settings: Partial<GameSettings>): void {
    this.socket?.emit('lobby:updateSettings', settings);
  }

  public updatePlayer(data: { civ?: CivName; team?: number; isReady?: boolean }): void {
    this.socket?.emit('lobby:updatePlayer', data);
  }

  public addAi(civ: CivName, team: number): void {
    this.socket?.emit('lobby:addAi', { civ, team });
  }

  public removeAi(aiId: string): void {
    this.socket?.emit('lobby:removeAi', aiId);
  }

  public startGame(): void {
    this.socket?.emit('lobby:startGame');
  }

  public sendCommand(cmd: CommandPayload): void {
    if (this.isSinglePlayer && this.localSim) {
      this.localSim.processCommand(this.myPlayerId, cmd);
    } else {
      this.socket?.emit('game:command', cmd);
    }
  }

  // Start Offline Single-Player Skirmish
  public startSinglePlayer(
    rosterOrName: SkirmishCommanderConfig[] | string,
    settingsOrCiv: GameSettings | CivName,
    legacyAiCiv?: CivName,
    legacySettings?: GameSettings
  ): void {
    this.isSinglePlayer = true;
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    let initialPlayers: { id: string; name: string; team: number; civ: CivName; color: string; isAi: boolean }[] = [];
    let settings: GameSettings;

    if (Array.isArray(rosterOrName)) {
      settings = settingsOrCiv as GameSettings;
      const human = rosterOrName.find(p => !p.isAi) || rosterOrName[0];
      this.myPlayerId = human.id || 'human_player';
      this.myTeam = human.team || 1;

      const allyColors = ['#2563eb', '#06b6d4', '#10b981', '#38bdf8', '#8b5cf6'];
      const enemyColors = ['#dc2626', '#e11d48', '#f97316', '#b91c1c', '#ea580c', '#c026d3'];
      let allyIdx = 0;
      let enemyIdx = 0;

      initialPlayers = rosterOrName.map((p, idx) => {
        const id = p.id || (p.isAi ? `ai_${idx}_team_${p.team}` : this.myPlayerId);
        let color = p.color;
        if (!color) {
          if (p.team === this.myTeam) {
            color = allyColors[allyIdx++ % allyColors.length];
          } else {
            color = enemyColors[enemyIdx++ % enemyColors.length];
          }
        }
        return {
          id,
          name: p.name,
          team: p.team,
          civ: p.civ,
          color,
          isAi: p.isAi
        };
      });
    } else {
      this.myPlayerId = 'human_player';
      this.myTeam = 1;
      settings = legacySettings!;
      const playerName = rosterOrName as string;
      const playerCiv = settingsOrCiv as CivName;
      const aiCiv = legacyAiCiv!;

      initialPlayers = [
        {
          id: this.myPlayerId,
          name: playerName || 'Commander',
          team: 1,
          civ: playerCiv,
          color: '#2563eb',
          isAi: false
        },
        {
          id: 'ai_opponent',
          name: `AI General (${aiCiv.split(' ')[0]})`,
          team: 2,
          civ: aiCiv,
          color: '#dc2626',
          isAi: true
        }
      ];
    }

    this.localSim = new SimulationEngine(settings, initialPlayers);

    // Apply specific AI difficulty if provided in roster
    if (Array.isArray(rosterOrName)) {
      rosterOrName.forEach(p => {
        if (p.isAi && p.difficulty) {
          const simPlayer = Array.from(this.localSim!.players.values()).find(sp => sp.name === p.name);
          if (simPlayer) {
            simPlayer.aiDifficulty = p.difficulty;
          }
        }
      });
    }

    // Trigger onGameStart
    this.onGameStart?.({
      settings,
      players: Array.from(this.localSim.players.values()),
      mapTiles: {
        width: this.localSim.mapData.width,
        height: this.localSim.mapData.height,
        tiles: this.localSim.mapData.tiles
      },
      resourceNodes: Array.from(this.localSim.resourceNodes.values()),
      units: Array.from(this.localSim.units.values()),
      buildings: Array.from(this.localSim.buildings.values())
    });

    if (this.localTickInterval) {
      clearInterval(this.localTickInterval);
    }

    this.localTickInterval = setInterval(() => {
      if (!this.localSim) return;
      this.localSim.tick(0.05);
      const snapshot = this.localSim.getSnapshot();
      this.onGameSnapshot?.(snapshot);

      if (this.localSim.isGameOver && this.localTickInterval) {
        clearInterval(this.localTickInterval);
        this.localTickInterval = null;
      }
    }, 50);
  }

  public stop(): void {
    if (this.localTickInterval) {
      clearInterval(this.localTickInterval);
      this.localTickInterval = null;
    }
    this.localSim = null;
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
  /**
   * Executes a cheat code strictly in Single Player mode.
   * Cheats are completely blocked and rejected in LAN multiplayer sessions.
   */
  public executeCheat(cheatText: string): { success: boolean; message: string; effect?: string } {
    if (!this.isSinglePlayer || !this.localSim) {
      return { success: false, message: 'Cheats are only permitted in Single Player skirmishes.' };
    }
    return this.localSim.applyCheat(this.myPlayerId, cheatText);
  }

}

export const networkClient = new NetworkClient();
