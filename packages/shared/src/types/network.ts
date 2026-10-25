import {
  GameSettings,
  PlayerState,
  UnitData,
  BuildingData,
  ResourceNodeData,
  Vector2D,
  BuildingType,
  UnitType,
  ResourceType,
  CivName,
  UnitStance,
  FormationType
} from './game.js';

export interface LobbyPlayer {
  id: string;
  socketId: string;
  name: string;
  team: number;
  civ: CivName;
  color: string;
  isHost: boolean;
  isReady: boolean;
  isAi: boolean;
}

export interface RoomJoinRequest {
  requestId: string;
  socketId?: string;
  name: string;
  civ: CivName;
  team: number;
  requestedAt: number;
}

export interface ActiveRoomSummary {
  roomCode: string;
  roomName: string;
  hostName: string;
  hostCiv: CivName;
  playerCount: number;
  maxPlayers: number;
  mapType: string;
  mapSize: number;
  inGame: boolean;
  requireApproval: boolean;
  isPrivate?: boolean;
  hostAddress: string;
}

export interface LobbyState {
  roomCode: string;
  hostAddress: string;
  players: LobbyPlayer[];
  settings: GameSettings;
  inGame: boolean;
  requireApproval?: boolean;
  isPrivate?: boolean;
  pendingRequests?: RoomJoinRequest[];
}

// Commands from client to server
export type CommandPayload =
  | { type: 'MOVE'; unitIds: string[]; target: Vector2D; formation?: FormationType }
  | { type: 'SET_STANCE'; unitIds: string[]; stance: UnitStance }
  | { type: 'ATTACK'; unitIds: string[]; targetEntityId: string }
  | { type: 'GATHER'; unitIds: string[]; resourceNodeId: string }
  | { type: 'BUILD'; unitIds: string[]; buildingType: BuildingType; position: Vector2D }
  | { type: 'REPAIR'; unitIds: string[]; buildingId: string }
  | { type: 'TRAIN_UNIT'; buildingId: string; unitType: UnitType }
  | { type: 'RESEARCH_TECH'; buildingId: string; techId: string }
  | { type: 'ADVANCE_AGE'; buildingId: string }
  | { type: 'SET_RALLY_POINT'; buildingId: string; point: Vector2D; targetEntityId?: string; targetType?: 'ground' | 'resource' | 'building' }
  | { type: 'CANCEL_PRODUCTION'; buildingId: string; queueIndex: number }
  | { type: 'TRANSFER_RESOURCES'; recipientId: string; resource: ResourceType; amount: number };

export interface ServerSnapshot {
  tick: number;
  units: UnitData[];
  buildings: BuildingData[];
  resourceNodes: ResourceNodeData[];
  players: PlayerState[];
  territoryGrid?: number[]; // Compressed or indexed territory ownership
  events: GameEvent[];
}

export type GameEvent =
  | { type: 'ATTACK_HIT'; attackerId: string; targetId: string; damage: number }
  | { type: 'UNIT_DIED'; unitId: string; killerId?: string }
  | { type: 'BUILDING_DESTROYED'; buildingId: string }
  | { type: 'BUILDING_COMPLETED'; buildingId: string }
  | { type: 'AGE_ADVANCED'; playerId: string; newAge: string }
  | { type: 'TECH_RESEARCHED'; playerId: string; techId: string }
  | { type: 'PLAYER_DEFEATED'; playerId: string; playerName: string; team: number }
  | { type: 'GAME_OVER'; winnerTeam: number; reason: string }
  | { type: 'UNIT_SPAWNED'; unitId: string; unitType: string; ownerId: string; x?: number; y?: number };

// Socket.IO event contracts
export interface ClientToServerEvents {
  'lobby:join': (data: { name: string; civ?: CivName; team?: number }) => void;
  'lobby:updateSettings': (settings: Partial<GameSettings>) => void;
  'lobby:updatePlayer': (data: { civ?: CivName; team?: number; isReady?: boolean }) => void;
  'lobby:addAi': (data: { civ: CivName; team: number }) => void;
  'lobby:removeAi': (playerId: string) => void;
  'lobby:startGame': () => void;
  'lobby:listRooms': () => void;
  'lobby:requestJoin': (data: { roomCode?: string; name: string; civ?: CivName; team?: number }) => void;
  'lobby:approveJoin': (data: { requestId: string }) => void;
  'lobby:declineJoin': (data: { requestId: string; reason?: string }) => void;
  'lobby:cancelJoinRequest': (data: { requestId: string }) => void;
  'lobby:setApprovalRequired': (requireApproval: boolean) => void;
  'lobby:setPrivate': (isPrivate: boolean) => void;
  'game:command': (command: CommandPayload) => void;
}

export interface ServerToClientEvents {
  'lobby:state': (state: LobbyState) => void;
  'lobby:joined': (data: { playerId: string }) => void;
  'lobby:error': (message: string) => void;
  'lobby:roomList': (rooms: ActiveRoomSummary[]) => void;
  'lobby:joinPending': (data: { requestId: string; message: string; roomCode: string; hostName?: string }) => void;
  'lobby:joinApproved': (data: { roomCode: string }) => void;
  'lobby:joinDeclined': (data: { reason: string }) => void;
  'lobby:joinRequested': (request: RoomJoinRequest) => void;
  'game:start': (data: {
    settings: GameSettings;
    players: PlayerState[];
    mapTiles: { width: number; height: number; tiles: any[] };
    resourceNodes: ResourceNodeData[];
    units: UnitData[];
    buildings: BuildingData[];
    yourPlayerId?: string;
  }) => void;
  'game:snapshot': (snapshot: ServerSnapshot) => void;
  'game:error': (message: string) => void;
}
