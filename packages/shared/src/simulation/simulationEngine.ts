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
  AgeName,
  FormationType,
  UnitStance
} from '../types/game.js';
import { CommandPayload, ServerSnapshot, GameEvent } from '../types/network.js';
import { UNIT_DEFINITIONS } from '../constants/units.js';
import { BUILDING_DEFINITIONS } from '../constants/buildings.js';
import { CIVILIZATIONS } from '../constants/civilizations.js';
import { TECHNOLOGIES, AGE_ADVANCEMENT_REQUIREMENTS } from '../constants/technologies.js';
import { generateMap, GeneratedMap } from './mapGenerator.js';
import { GridPathfinder } from './pathfinding.js';
import { SpatialUnitGrid } from './spatialGrid.js';

export interface AICommanderState {
  playerId: string;
  rallyPoint: Vector2D;
  currentTactic: 'amassing' | 'assault' | 'harass' | 'defend' | 'counter' | 'retreat';
  nextWaveTick: number;
  waveNumber: number;
  assignedTargetId?: string;
  harassUnitIds: string[];
  lastHarassTick: number;
  lastAllyHelpTick: number;
}

export class SimulationEngine {
  public settings: GameSettings;
  public players: Map<string, PlayerState> = new Map();
  public units: Map<string, UnitData> = new Map();
  public buildings: Map<string, BuildingData> = new Map();
  public resourceNodes: Map<string, ResourceNodeData> = new Map();
  public mapData: GeneratedMap;
  public pathfinder: GridPathfinder;
  public spatialGrid: SpatialUnitGrid;
  private territoryDirty: boolean = true;

  public currentTick: number = 0;
  public isGameOver: boolean = false;
  public winnerTeam: number | null = null;
  public victoryReason: string = '';

  private pendingEvents: GameEvent[] = [];
  private unitIdCounter: number = 1000;
  private buildingIdCounter: number = 2000;
  private aiStates: Map<string, AICommanderState> = new Map();

  public getAIState(playerId: string): AICommanderState | undefined {
    return this.aiStates.get(playerId);
  }

  constructor(settings: GameSettings, initialPlayers: { id: string; name: string; team: number; civ: CivName; color: string; isAi: boolean }[]) {
    this.settings = settings;
    this.mapData = generateMap(settings.mapType, settings.mapSize, settings.seed, initialPlayers.length);
    this.pathfinder = new GridPathfinder(this.mapData.width, this.mapData.height);
    this.spatialGrid = new SpatialUnitGrid(this.mapData.width, this.mapData.height, 4);

    // Initial walkability from map tiles
    for (let y = 0; y < this.mapData.height; y++) {
      for (let x = 0; x < this.mapData.width; x++) {
        const tile = this.mapData.tiles[y * this.mapData.width + x];
        this.pathfinder.setWalkable(x, y, tile.walkable);
      }
    }

    // Populate resource nodes
    for (const node of this.mapData.resourceNodes) {
      this.resourceNodes.set(node.id, { ...node });
      if (node.type === 'wood') {
        this.pathfinder.setWalkable(node.x, node.y, false);
      }
    }

    // Starting resource values based on game settings
    const startingResources = settings.startingResources === 'high'
      ? { food: 600, wood: 600, stone: 400, metal: 300, knowledge: 100 }
      : settings.startingResources === 'deathmatch'
      ? { food: 5000, wood: 5000, stone: 3000, metal: 3000, knowledge: 1000 }
      : { food: 250, wood: 250, stone: 100, metal: 50, knowledge: 0 };

    // Group starting positions by team so teammates start adjacent to each other on the map
    const sortedPlayers = [...initialPlayers].sort((a, b) => a.team - b.team);

    // Initialize players and starting bases
    sortedPlayers.forEach((p, index) => {
      const playerState: PlayerState = {
        id: p.id,
        name: p.name,
        team: p.team,
        civ: p.civ,
        color: p.color,
        isAi: p.isAi,
        aiDifficulty: settings.aiDifficulty,
        age: 'Founding Age',
        resources: { ...startingResources },
        population: 4, // 3 workers + 1 scout
        maxPopulation: 15,
        researchedTechs: [],
        isDefeated: false,
        isVictorious: false,
        stats: {
          score: 100,
          enemiesDefeated: 0,
          buildingsConstructed: 1,
          resourcesGathered: { food: 0, wood: 0, stone: 0, metal: 0, knowledge: 0 },
          technologiesResearched: 0
        }
      };

      this.players.set(p.id, playerState);

      const startPos = this.mapData.startPositions[index % this.mapData.startPositions.length];
      this.spawnInitialBase(p.id, p.team, startPos);
    });

    this.recalculateTerritory();
  }


  public isValidBuildingPlacement(type: BuildingType, px: number, py: number, minGap: number = 1): boolean {
    const def = BUILDING_DEFINITIONS[type];
    if (!def) return false;

    // Bounds check
    if (px < 1 || px + def.width >= this.mapData.width - 1 || py < 1 || py + def.height >= this.mapData.height - 1) {
      return false;
    }

    // Footprint walkability & terrain check (must not be mountain or water)
    for (let dx = 0; dx < def.width; dx++) {
      for (let dy = 0; dy < def.height; dy++) {
        const tx = px + dx;
        const ty = py + dy;
        if (!this.pathfinder.isWalkable(tx, ty)) {
          return false;
        }
        const tile = this.mapData.tiles[ty * this.mapData.width + tx];
        if (!tile || !tile.walkable || tile.terrain === 'mountain' || tile.terrain === 'water') {
          return false;
        }
      }
    }

    // Clearance gap check against existing buildings
    const isWallOrGate = type === 'wall' || type === 'gate';
    for (const b of this.buildings.values()) {
      const otherIsWallOrGate = b.type === 'wall' || b.type === 'gate';
      if (isWallOrGate && otherIsWallOrGate) {
        // Walls and gates can connect directly (gap = 0 allowed), but cannot overlap
        if (
          px < b.x + b.width &&
          px + def.width > b.x &&
          py < b.y + b.height &&
          py + def.height > b.y
        ) {
          return false;
        }
      } else {
        // Mandatory minimum clearance gap (at least minGap tiles between building footprints)
        if (
          px < b.x + b.width + minGap &&
          px + def.width + minGap > b.x &&
          py < b.y + b.height + minGap &&
          py + def.height + minGap > b.y
        ) {
          return false;
        }
      }
    }

    // Non-wall buildings cannot be placed directly adjacent to mountain cliffs or water edges
    if (!isWallOrGate) {
      for (let dx = -minGap; dx < def.width + minGap; dx++) {
        for (let dy = -minGap; dy < def.height + minGap; dy++) {
          const tx = px + dx;
          const ty = py + dy;
          if (tx >= 0 && tx < this.mapData.width && ty >= 0 && ty < this.mapData.height) {
            const tile = this.mapData.tiles[ty * this.mapData.width + tx];
            if (tile && (tile.terrain === 'mountain' || tile.terrain === 'water')) {
              return false;
            }
          }
        }
      }
    }

    return true;
  }

  private findSafeStartingBasePosition(preferredPos: Vector2D): Vector2D {
    const tcDef = BUILDING_DEFINITIONS.town_centre;
    const isSpotOpen = (x: number, y: number): boolean => {
      if (x < 4 || y < 4 || x + tcDef.width >= this.mapData.width - 4 || y + tcDef.height >= this.mapData.height - 4) {
        return false;
      }
      for (let dx = -2; dx < tcDef.width + 2; dx++) {
        for (let dy = -2; dy < tcDef.height + 2; dy++) {
          const tx = x + dx;
          const ty = y + dy;
          const tile = this.mapData.tiles[ty * this.mapData.width + tx];
          if (!tile || !tile.walkable || tile.terrain === 'mountain' || tile.terrain === 'water' || tile.elevation > 1) {
            return false;
          }
        }
      }
      return true;
    };

    if (isSpotOpen(preferredPos.x, preferredPos.y)) {
      return preferredPos;
    }

    for (let r = 1; r <= 20; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          if (Math.abs(dx) === r || Math.abs(dy) === r) {
            const candX = preferredPos.x + dx;
            const candY = preferredPos.y + dy;
            if (isSpotOpen(candX, candY)) {
              return { x: candX, y: candY };
            }
          }
        }
      }
    }
    return preferredPos;
  }

  private spawnInitialBase(ownerId: string, team: number, rawPos: Vector2D): void {
    const pos = this.findSafeStartingBasePosition(rawPos);
    // Spawn Town Centre (4x4)
    const tcDef = BUILDING_DEFINITIONS.town_centre;
    const tcId = `bldg_${this.buildingIdCounter++}`;
    const tc: BuildingData = {
      id: tcId,
      type: 'town_centre',
      ownerId,
      team,
      x: pos.x,
      y: pos.y,
      width: tcDef.width,
      height: tcDef.height,
      hp: tcDef.hp,
      maxHp: tcDef.hp,
      isConstructed: true,
      constructionProgress: 100,
      productionQueue: [],
      rallyPoint: { x: pos.x + 5, y: pos.y + 2 },
      attackCooldown: 0
    };
    this.buildings.set(tcId, tc);

    // Block pathfinding for TC
    for (let dx = 0; dx < tc.width; dx++) {
      for (let dy = 0; dy < tc.height; dy++) {
        this.pathfinder.setWalkable(pos.x + dx, pos.y + dy, false);
      }
    }

    // Spawn 3 Workers
    for (let i = 0; i < 3; i++) {
      const uid = `unit_${this.unitIdCounter++}`;
      const workerDef = UNIT_DEFINITIONS.worker;
      this.units.set(uid, {
        id: uid,
        type: 'worker',
        ownerId,
        team,
        x: pos.x + 5,
        y: pos.y + i,
        hp: workerDef.hp,
        maxHp: workerDef.hp,
        state: 'idle',
        carriedResourceAmount: 0,
        attackCooldown: 0,
        gatherCooldown: 0,
        facingAngle: 0
      });
    }

    // Spawn 1 Scout
    const scoutId = `unit_${this.unitIdCounter++}`;
    const scoutDef = UNIT_DEFINITIONS.scout;
    this.units.set(scoutId, {
      id: scoutId,
      type: 'scout',
      ownerId,
      team,
      x: pos.x + 5,
      y: pos.y + 3,
      hp: scoutDef.hp,
      maxHp: scoutDef.hp,
      state: 'idle',
      carriedResourceAmount: 0,
      attackCooldown: 0,
      gatherCooldown: 0,
      facingAngle: 0
    });
  }

  // Execute client commands
  
  private calculateFormationPositions(units: UnitData[], target: Vector2D, formation: FormationType = 'line'): Map<string, Vector2D> {
    const result = new Map<string, Vector2D>();
    if (units.length === 0) return result;
    if (units.length === 1) {
      result.set(units[0].id, { x: target.x, y: target.y });
      return result;
    }

    const avgX = units.reduce((acc, u) => acc + u.x, 0) / units.length;
    const avgY = units.reduce((acc, u) => acc + u.y, 0) / units.length;
    let heading = Math.atan2(target.y - avgY, target.x - avgX);
    if (Math.hypot(target.x - avgX, target.y - avgY) < 0.1) {
      heading = 0;
    }
    const perp = heading + Math.PI / 2;
    const fx = Math.cos(heading);
    const fy = Math.sin(heading);
    const px = Math.cos(perp);
    const py = Math.sin(perp);

    const findValidNear = (tx: number, ty: number): Vector2D => {
      const ix = Math.floor(tx);
      const iy = Math.floor(ty);
      if (this.pathfinder.isWalkable(ix, iy)) {
        return { x: ix + 0.5, y: iy + 0.5 };
      }
      for (let r = 1; r <= 3; r++) {
        for (let dx = -r; dx <= r; dx++) {
          for (let dy = -r; dy <= r; dy++) {
            if (this.pathfinder.isWalkable(ix + dx, iy + dy)) {
              return { x: ix + dx + 0.5, y: iy + dy + 0.5 };
            }
          }
        }
      }
      return { x: target.x, y: target.y };
    };

    if (formation === 'line') {
      const rankOrder = (t: UnitType) => {
        if (t === 'spearman' || t === 'basic_infantry' || t === 'advanced_unit') return 0;
        if (t === 'scout' || t === 'cavalry') return 1;
        if (t === 'ranged_infantry') return 2;
        return 3;
      };
      const sorted = [...units].sort((a, b) => rankOrder(a.type) - rankOrder(b.type));
      const ranks: UnitData[][] = [[], [], []];
      for (const u of sorted) {
        const ro = rankOrder(u.type);
        if (ro === 0 || ro === 1) ranks[0].push(u);
        else if (ro === 2) ranks[1].push(u);
        else ranks[2].push(u);
      }
      let rowOffsetF = 0;
      for (const rankUnits of ranks) {
        if (rankUnits.length === 0) continue;
        const maxPerRow = 8;
        const numRows = Math.ceil(rankUnits.length / maxPerRow);
        for (let r = 0; r < numRows; r++) {
          const rowSlice = rankUnits.slice(r * maxPerRow, (r + 1) * maxPerRow);
          const count = rowSlice.length;
          const spacing = 1.4;
          rowSlice.forEach((u, idx) => {
            const offsetP = (idx - (count - 1) / 2) * spacing;
            const candX = target.x + offsetP * px - rowOffsetF * fx;
            const candY = target.y + offsetP * py - rowOffsetF * fy;
            result.set(u.id, findValidNear(candX, candY));
          });
          rowOffsetF += 1.8;
        }
      }
    } else if (formation === 'box') {
      const cols = Math.ceil(Math.sqrt(units.length));
      const rows = Math.ceil(units.length / cols);
      const spacing = 1.4;
      units.forEach((u, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const offsetP = (col - (cols - 1) / 2) * spacing;
        const offsetF = (row - (rows - 1) / 2) * spacing;
        const candX = target.x + offsetP * px - offsetF * fx;
        const candY = target.y + offsetP * py - offsetF * fy;
        result.set(u.id, findValidNear(candX, candY));
      });
    } else if (formation === 'staggered') {
      const cols = Math.max(3, Math.ceil(Math.sqrt(units.length) * 1.4));
      const spacingP = 2.4;
      const spacingF = 2.0;
      units.forEach((u, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const stagger = (row % 2 === 1) ? 1.2 : 0;
        const offsetP = (col - (cols - 1) / 2) * spacingP + stagger;
        const offsetF = row * spacingF;
        const candX = target.x + offsetP * px - offsetF * fx;
        const candY = target.y + offsetP * py - offsetF * fy;
        result.set(u.id, findValidNear(candX, candY));
      });
    } else if (formation === 'column') {
      const spacingP = 1.6;
      const spacingF = 1.8;
      units.forEach((u, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const offsetP = (col - 0.5) * spacingP;
        const offsetF = row * spacingF;
        const candX = target.x + offsetP * px - offsetF * fx;
        const candY = target.y + offsetP * py - offsetF * fy;
        result.set(u.id, findValidNear(candX, candY));
      });
    }

    return result;
  }

  public processCommand(playerId: string, cmd: CommandPayload): boolean {
    const player = this.players.get(playerId);
    if (!player || player.isDefeated) return false;

    switch (cmd.type) {
      case 'MOVE': {
        const validUnits: UnitData[] = [];
        for (const uid of cmd.unitIds) {
          const u = this.units.get(uid);
          if (u && u.ownerId === playerId && u.state !== 'dead') {
            validUnits.push(u);
          }
        }
        if (validUnits.length === 0) return false;

        const positions = this.calculateFormationPositions(validUnits, cmd.target, cmd.formation || 'line');

        for (const unit of validUnits) {
          unit.state = 'moving';
          unit.targetEntityId = undefined;
          unit.stuckTicks = 0;

          const slot = positions.get(unit.id) || cmd.target;
          unit.targetX = slot.x;
          unit.targetY = slot.y;
          unit.guardX = slot.x;
          unit.guardY = slot.y;

          if (unit.type === 'dragon') {
            unit.path = [{ x: slot.x, y: slot.y }];
          } else {
            unit.path = this.pathfinder.findPath(unit.x, unit.y, slot.x, slot.y);
          }
        }
        return true;
      }

      case 'TRADE_COMMODITY': {
        if (cmd.buyAmount <= 0 || cmd.sellAmount <= 0) return false;
        if (player.resources[cmd.sellResource] < cmd.sellAmount) return false;
        player.resources[cmd.sellResource] -= cmd.sellAmount;
        player.resources[cmd.buyResource] += cmd.buyAmount;
        player.stats.resourcesGathered[cmd.buyResource] += cmd.buyAmount;
        return true;
      }

      case 'SET_STANCE': {
        for (const uid of cmd.unitIds) {
          const unit = this.units.get(uid);
          if (!unit || unit.ownerId !== playerId || unit.state === 'dead') continue;
          unit.stance = cmd.stance;
          unit.guardX = unit.x;
          unit.guardY = unit.y;
        }
        return true;
      }

      case 'ATTACK': {
        const targetUnit = this.units.get(cmd.targetEntityId);
        const targetBuilding = this.buildings.get(cmd.targetEntityId);
        const targetTeam = targetUnit?.team ?? targetBuilding?.team;

        if (targetTeam === undefined || targetTeam === player.team) return false;

        for (const uid of cmd.unitIds) {
          const unit = this.units.get(uid);
          if (!unit || unit.ownerId !== playerId || unit.state === 'dead') continue;

          unit.state = 'attacking';
          unit.targetEntityId = cmd.targetEntityId;
          unit.stuckTicks = 0;

          const udef = UNIT_DEFINITIONS[unit.type];
          let attackRange = udef.attackRange;
          if (unit.type === 'ranged_infantry' && player.researchedTechs.includes('bodkin_arrows')) {
            attackRange += 1.0;
          }

          let targetPos = { x: unit.x, y: unit.y };

          if (targetUnit) {
            const distToUnit = Math.hypot(unit.x - targetUnit.x, unit.y - targetUnit.y);
            if (distToUnit <= attackRange) {
              // Already within firing distance! Keep current position and fire without moving
              unit.targetX = unit.x;
              unit.targetY = unit.y;
              unit.path = undefined;
              continue;
            }

            if (unit.type === 'dragon') {
              // Aerial standoff position along trajectory to target
              const angle = Math.atan2(unit.y - targetUnit.y, unit.x - targetUnit.x);
              const standoff = Math.max(2.0, attackRange * 0.85);
              targetPos = {
                x: targetUnit.x + Math.cos(angle) * standoff,
                y: targetUnit.y + Math.sin(angle) * standoff
              };
            } else {
              targetPos = { x: targetUnit.x, y: targetUnit.y };
            }
          } else if (targetBuilding) {
            // Check if already in firing range
            const clampedX = Math.max(targetBuilding.x, Math.min(targetBuilding.x + targetBuilding.width, unit.x));
            const clampedY = Math.max(targetBuilding.y, Math.min(targetBuilding.y + targetBuilding.height, unit.y));
            const distToBuilding = Math.hypot(unit.x - clampedX, unit.y - clampedY);

            if (distToBuilding <= attackRange) {
              // Already within firing distance! Keep current position and fire without moving
              unit.targetX = unit.x;
              unit.targetY = unit.y;
              unit.path = undefined;
              continue;
            }

            if (unit.type === 'dragon') {
              // Aerial standoff position directly along vector to building edge, flying freely over terrain
              const angle = Math.atan2(unit.y - clampedY, unit.x - clampedX);
              const standoff = Math.max(2.0, attackRange * 0.85);
              targetPos = {
                x: clampedX + Math.cos(angle) * standoff,
                y: clampedY + Math.sin(angle) * standoff
              };
            } else if (attackRange >= 3.0) {
              // Standoff firing position for siege engines and marksmen
              const firingSpot = this.pathfinder.findOptimalRangedAttackTile(
                targetBuilding.x, targetBuilding.y,
                targetBuilding.width, targetBuilding.height,
                unit.x, unit.y,
                3.0, attackRange * 0.85
              );
              if (firingSpot) {
                targetPos = firingSpot;
              } else {
                const adj = this.findAdjacentWalkableToBuilding(targetBuilding.x, targetBuilding.y, targetBuilding.width, targetBuilding.height, unit.x, unit.y);
                targetPos = adj || { x: clampedX, y: clampedY };
              }
            } else {
              const adj = this.findAdjacentWalkableToBuilding(targetBuilding.x, targetBuilding.y, targetBuilding.width, targetBuilding.height, unit.x, unit.y);
              targetPos = adj || { x: clampedX, y: clampedY };
            }
          }

          unit.targetX = targetPos.x;
          unit.targetY = targetPos.y;
          if (unit.type === 'dragon') {
            unit.path = [{ x: targetPos.x, y: targetPos.y }];
          } else {
            unit.path = this.pathfinder.findPath(unit.x, unit.y, targetPos.x, targetPos.y);
          }
        }
        return true;
      }

      case 'GATHER': {
        const node = this.resourceNodes.get(cmd.resourceNodeId);
        const bldg = this.buildings.get(cmd.resourceNodeId);

        if (!node && (!bldg || bldg.ownerId !== playerId || !bldg.isConstructed)) return false;

        let targetId = cmd.resourceNodeId;
        let targetPosX = 0;
        let targetPosY = 0;

        if (node) {
          targetPosX = node.x;
          targetPosY = node.y;
        } else if (bldg) {
          if (bldg.type === 'farm') {
            const adj = this.findAdjacentWalkableToBuilding(bldg.x, bldg.y, bldg.width, bldg.height) || { x: bldg.x, y: bldg.y };
            targetPosX = adj.x;
            targetPosY = adj.y;
          } else if (bldg.type === 'lumber_camp' || bldg.type === 'quarry' || bldg.type === 'mining_camp') {
            const campResType: ResourceType = bldg.type === 'lumber_camp' ? 'wood' : bldg.type === 'quarry' ? 'stone' : 'metal';
            let bestNearNode: ResourceNodeData | null = null;
            let bestNearDist = Infinity;
            for (const rNode of this.resourceNodes.values()) {
              if (rNode.type === campResType && rNode.amount > 0) {
                const d = Math.hypot(rNode.x - bldg.x, rNode.y - bldg.y);
                if (d < bestNearDist) {
                  bestNearDist = d;
                  bestNearNode = rNode;
                }
              }
            }
            if (bestNearNode) {
              targetId = bestNearNode.id;
              targetPosX = bestNearNode.x;
              targetPosY = bestNearNode.y;
            } else {
              const adj = this.findAdjacentWalkableToBuilding(bldg.x, bldg.y, bldg.width, bldg.height) || { x: bldg.x, y: bldg.y };
              targetPosX = adj.x;
              targetPosY = adj.y;
            }
          } else {
            const adj = this.findAdjacentWalkableToBuilding(bldg.x, bldg.y, bldg.width, bldg.height) || { x: bldg.x, y: bldg.y };
            targetPosX = adj.x;
            targetPosY = adj.y;
          }
        }

        for (const uid of cmd.unitIds) {
          const unit = this.units.get(uid);
          if (!unit || unit.ownerId !== playerId || unit.type !== 'worker' || unit.state === 'dead') continue;

          unit.state = 'gathering';
          unit.targetEntityId = targetId;
          unit.targetX = targetPosX;
          unit.targetY = targetPosY;
          unit.path = this.pathfinder.findPath(unit.x, unit.y, targetPosX, targetPosY);
        }
        return true;
      }


      case 'BUILD': {
        const def = BUILDING_DEFINITIONS[cmd.buildingType];
        if (!def) return false;

        // Check age prerequisite
        const ageRank = (a: AgeName) => ['Founding Age', 'Kingdom Age', 'Imperial Age', 'Industrial Age'].indexOf(a);
        if (ageRank(player.age) < ageRank(def.requiredAge)) {
          return false;
        }

        // Check resource cost
        if (
          player.resources.food < def.cost.food ||
          player.resources.wood < def.cost.wood ||
          player.resources.stone < def.cost.stone ||
          player.resources.metal < def.cost.metal ||
          player.resources.knowledge < def.cost.knowledge
        ) {
          return false;
        }

        // Check tile placement validity: clearance gap and open terrain
        const px = Math.floor(cmd.position.x);
        const py = Math.floor(cmd.position.y);
        if (!this.isValidBuildingPlacement(cmd.buildingType, px, py, 1)) {
          return false;
        }

        // Deduct resources
        player.resources.food -= def.cost.food;
        player.resources.wood -= def.cost.wood;
        player.resources.stone -= def.cost.stone;
        player.resources.metal -= def.cost.metal;
        player.resources.knowledge -= def.cost.knowledge;

        // Create building site
        const bldgId = `bldg_${this.buildingIdCounter++}`;
        const newBuilding: BuildingData = {
          id: bldgId,
          type: cmd.buildingType,
          ownerId: playerId,
          team: player.team,
          x: px,
          y: py,
          width: def.width,
          height: def.height,
          hp: Math.max(10, Math.floor((player.researchedTechs.includes('masonry') ? Math.round(def.hp * 1.25) : def.hp) * 0.1)),
          maxHp: player.researchedTechs.includes('masonry') ? Math.round(def.hp * 1.25) : def.hp,
          isConstructed: false,
          constructionProgress: 0,
          productionQueue: []
        };
        this.buildings.set(bldgId, newBuilding);

        // Mark tiles as non-walkable
        for (let dx = 0; dx < def.width; dx++) {
          for (let dy = 0; dy < def.height; dy++) {
            this.pathfinder.setWalkable(px + dx, py + dy, false);
          }
        }

        // Auto-assign workers: use cmd.unitIds if workers provided, otherwise find closest available worker
        let assignedWorkers: UnitData[] = [];
        for (const uid of cmd.unitIds) {
          const unit = this.units.get(uid);
          if (unit && unit.ownerId === playerId && unit.type === 'worker' && unit.state !== 'dead') {
            assignedWorkers.push(unit);
          }
        }

        if (assignedWorkers.length === 0) {
          let closestW: UnitData | null = null;
          let minWDist = Infinity;
          for (const u of this.units.values()) {
            if (u.ownerId === playerId && u.type === 'worker' && u.state !== 'dead') {
              const d = Math.hypot(u.x - (px + def.width / 2), u.y - (py + def.height / 2));
              if (d < minWDist) {
                minWDist = d;
                closestW = u;
              }
            }
          }
          if (closestW) {
            assignedWorkers.push(closestW);
          }
        }

        for (const unit of assignedWorkers) {
          unit.state = 'building';
          unit.targetEntityId = bldgId;
          const targetTile = this.findAdjacentWalkableToBuilding(px, py, def.width, def.height) || { x: px, y: py };
          unit.targetX = targetTile.x;
          unit.targetY = targetTile.y;
          unit.path = this.pathfinder.findPath(unit.x, unit.y, targetTile.x, targetTile.y);
        }

        return true;
      }

      case 'REPAIR': {
        const bldg = this.buildings.get(cmd.buildingId);
        if (!bldg) return false;
        const player = this.players.get(playerId);
        if (!player || bldg.team !== player.team) return false;

        const isUnfinished = !bldg.isConstructed;
        if (!isUnfinished && bldg.hp >= bldg.maxHp) return false;

        const targetTile = this.findAdjacentWalkableToBuilding(bldg.x, bldg.y, bldg.width, bldg.height) || { x: bldg.x, y: bldg.y };

        for (const uid of cmd.unitIds) {
          const unit = this.units.get(uid);
          if (!unit || unit.ownerId !== playerId || unit.type !== 'worker' || unit.state === 'dead') continue;

          unit.state = isUnfinished ? 'building' : 'repairing';
          unit.targetEntityId = cmd.buildingId;
          unit.targetX = targetTile.x;
          unit.targetY = targetTile.y;
          unit.path = this.pathfinder.findPath(unit.x, unit.y, targetTile.x, targetTile.y);
        }
        return true;
      }

      case 'TRAIN_UNIT': {
        const bldg = this.buildings.get(cmd.buildingId);
        if (!bldg || bldg.ownerId !== playerId || !bldg.isConstructed) return false;

        const udef = UNIT_DEFINITIONS[cmd.unitType];
        const isAllowedProducer = udef && (
          udef.producedAt === bldg.type ||
          (cmd.unitType === 'dragon' && (bldg.type === 'town_centre' || bldg.type === 'fort')) ||
          (cmd.unitType === 'advanced_unit' && (bldg.type === 'fort' || bldg.type === 'barracks'))
        );
        if (!udef || !isAllowedProducer) return false;

        // Check age
        const ageRank = (a: AgeName) => ['Founding Age', 'Kingdom Age', 'Imperial Age', 'Industrial Age'].indexOf(a);
        if (ageRank(player.age) < ageRank(udef.requiredAge)) return false;

        // Check population cap
        if (player.population + udef.populationCost > player.maxPopulation) return false;

        // Check costs
        if (
          player.resources.food < udef.cost.food ||
          player.resources.wood < udef.cost.wood ||
          player.resources.stone < udef.cost.stone ||
          player.resources.metal < udef.cost.metal ||
          player.resources.knowledge < udef.cost.knowledge
        ) {
          return false;
        }

        // Deduct resources
        player.resources.food -= udef.cost.food;
        player.resources.wood -= udef.cost.wood;
        player.resources.stone -= udef.cost.stone;
        player.resources.metal -= udef.cost.metal;
        player.resources.knowledge -= udef.cost.knowledge;

        player.population += udef.populationCost;

        // In the last age advancement (Industrial Age), troops spawn instantly!
        if (player.age === 'Industrial Age') {
          this.spawnTrainedUnit(bldg, cmd.unitType);
          return true;
        }

        bldg.productionQueue.push({
          id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          itemType: cmd.unitType,
          category: 'unit',
          progress: 0,
          totalTime: udef.trainingTime
        });

        return true;
      }

      case 'RESEARCH_TECH': {
        const bldg = this.buildings.get(cmd.buildingId);
        if (!bldg || bldg.ownerId !== playerId || !bldg.isConstructed) return false;

        const tech = TECHNOLOGIES[cmd.techId];
        if (!tech || player.researchedTechs.includes(tech.id)) return false;

        // Check prerequisites
        for (const req of tech.prerequisites) {
          if (!player.researchedTechs.includes(req)) return false;
        }

        // Check age
        const ageRank = (a: AgeName) => ['Founding Age', 'Kingdom Age', 'Imperial Age', 'Industrial Age'].indexOf(a);
        if (ageRank(player.age) < ageRank(tech.requiredAge)) return false;

        // Check cost
        if (
          player.resources.food < tech.cost.food ||
          player.resources.wood < tech.cost.wood ||
          player.resources.stone < tech.cost.stone ||
          player.resources.metal < tech.cost.metal ||
          player.resources.knowledge < tech.cost.knowledge
        ) {
          return false;
        }

        // Deduct cost
        player.resources.food -= tech.cost.food;
        player.resources.wood -= tech.cost.wood;
        player.resources.stone -= tech.cost.stone;
        player.resources.metal -= tech.cost.metal;
        player.resources.knowledge -= tech.cost.knowledge;

        bldg.productionQueue.push({
          id: `tech_${tech.id}`,
          itemType: tech.id,
          category: 'tech',
          progress: 0,
          totalTime: tech.researchTime
        });

        return true;
      }

      case 'ADVANCE_AGE': {
        const bldg = this.buildings.get(cmd.buildingId);
        if (!bldg || bldg.ownerId !== playerId || bldg.type !== 'town_centre' || !bldg.isConstructed) return false;

        const currentReq = AGE_ADVANCEMENT_REQUIREMENTS[player.age];
        if (!currentReq || !currentReq.nextAge) return false;

        if (
          player.resources.food < currentReq.cost.food ||
          player.resources.wood < currentReq.cost.wood ||
          player.resources.stone < currentReq.cost.stone ||
          player.resources.metal < currentReq.cost.metal ||
          player.resources.knowledge < currentReq.cost.knowledge
        ) {
          return false;
        }

        player.resources.food -= currentReq.cost.food;
        player.resources.wood -= currentReq.cost.wood;
        player.resources.stone -= currentReq.cost.stone;
        player.resources.metal -= currentReq.cost.metal;
        player.resources.knowledge -= currentReq.cost.knowledge;

        bldg.productionQueue.push({
          id: `age_${currentReq.nextAge}`,
          itemType: currentReq.nextAge,
          category: 'age',
          progress: 0,
          totalTime: currentReq.researchTime
        });

        return true;
      }

      case 'SET_RALLY_POINT': {
        const bldg = this.buildings.get(cmd.buildingId);
        if (!bldg || bldg.ownerId !== playerId) return false;
        bldg.rallyPoint = {
          x: cmd.point.x,
          y: cmd.point.y,
          targetEntityId: cmd.targetEntityId,
          targetType: cmd.targetType
        };
        return true;
      }

      case 'CANCEL_PRODUCTION': {
        const bldg = this.buildings.get(cmd.buildingId);
        if (!bldg || bldg.ownerId !== playerId) return false;
        const item = bldg.productionQueue[cmd.queueIndex];
        if (!item) return false;

        // Refund costs
        if (item.category === 'unit') {
          const udef = UNIT_DEFINITIONS[item.itemType as UnitType];
          if (udef) {
            player.resources.food += udef.cost.food;
            player.resources.wood += udef.cost.wood;
            player.resources.stone += udef.cost.stone;
            player.resources.metal += udef.cost.metal;
            player.resources.knowledge += udef.cost.knowledge;
            player.population -= udef.populationCost;
          }
        }
        bldg.productionQueue.splice(cmd.queueIndex, 1);
        return true;
      }

      case 'TRANSFER_RESOURCES': {
        const recipient = this.players.get(cmd.recipientId);
        if (!recipient || recipient.team !== player.team || cmd.amount <= 0) return false;

        const currentAmt = player.resources[cmd.resource];
        if (currentAmt < cmd.amount) return false;

        player.resources[cmd.resource] -= cmd.amount;
        recipient.resources[cmd.resource] += cmd.amount;
        return true;
      }
    }

    return false;
  }

  // Main simulation tick (20 ticks/sec, dt = 0.05s)
  public tick(dt: number = 0.05): void {
    if (this.isGameOver) return;
    this.currentTick++;

    // 1. Process Passive Generation & Civilizations Perks
    if (this.currentTick % 20 === 0) {
      for (const player of this.players.values()) {
        if (player.isDefeated) continue;
        const civ = CIVILIZATIONS[player.civ];

        // Baseline passive knowledge generation for all civilizations
        player.resources.knowledge += 1;
        player.stats.resourcesGathered.knowledge += 1;

        // Solari extra passive knowledge generation
        if (player.civ === 'Solari Dominion') {
          player.resources.knowledge += 1;
          player.stats.resourcesGathered.knowledge += 1;
        }

        // Knowledge generated by Research Halls (Academies) - balanced rate (+1/sec per academy)
        let researchHallsCount = 0;
        for (const bldg of this.buildings.values()) {
          if (bldg.ownerId === player.id && bldg.type === 'research_hall' && bldg.isConstructed) {
            researchHallsCount++;
          }
        }
        if (researchHallsCount > 0) {
          const bonus = player.researchedTechs.includes('scholasticism') ? 1.3 : 1.0;
          // Diminishing returns: 1 knowledge/sec for first 2 academies, 0.5/sec for additional academies
          const effectiveAcademies = researchHallsCount <= 2 ? researchHallsCount : 2 + (researchHallsCount - 2) * 0.5;
          const generated = Math.max(1, Math.round(effectiveAcademies * 1.0 * bonus));
          player.resources.knowledge += generated;
          player.stats.resourcesGathered.knowledge += generated;
        }
      }
    }

    this.spatialGrid.build(this.units.values());

    this.updateGates();

    // 2. Units Tick (movement, attack, gather, build, repair)
    this.updateUnits(dt);

    // Auto-assign idle workers to available jobs (every 20 ticks = 1 second)
    if (this.currentTick % 20 === 0) {
      for (const unit of this.units.values()) {
        if (unit.type === 'worker' && unit.state === 'idle' && (!unit.carriedResourceAmount || unit.carriedResourceAmount === 0)) {
          this.assignWorkerToBestJob(unit);
        }
      }
    }

    // 3. Buildings Tick (construction, production, defensive attacks)
    this.updateBuildings(dt);

    // 4. Territory Tick (every 20 ticks = 1 second)
    if (this.currentTick % 20 === 0) {
      this.recalculateTerritory();
    }

    // 5. AI Decision Loop (every 10 ticks = 0.5s)
    if (this.currentTick % 10 === 0) {
      this.updateAI();
    }

    // 6. Check Victory / Defeat Conditions (every 10 ticks = 0.5s)
    if (this.currentTick % 10 === 0) {
      this.checkVictoryConditions();
    }
  }

  
  private updateGates(): void {
    for (const bldg of this.buildings.values()) {
      if (bldg.type === 'gate' && bldg.isConstructed && bldg.hp > 0) {
        const gateCenterX = bldg.x + bldg.width / 2;
        const gateCenterY = bldg.y + bldg.height / 2;

        let friendlyNearby = false;
        let unitDirectlyOnGate = false;

        const nearbyUnits = this.spatialGrid.queryInRadius(gateCenterX, gateCenterY, 3.2);
        for (let i = 0; i < nearbyUnits.length; i++) {
          const u = nearbyUnits[i];
          if (u.state === 'dead') continue;
          const d = Math.hypot(u.x - gateCenterX, u.y - gateCenterY);
          if (d < 1.1) {
            unitDirectlyOnGate = true;
          }
          if (u.team === bldg.team) {
            if (d <= 3.0) {
              friendlyNearby = true;
            }
          }
        }

        const shouldBeOpen = friendlyNearby || unitDirectlyOnGate;
        if (shouldBeOpen !== (bldg.isOpen || false)) {
          bldg.isOpen = shouldBeOpen;
          for (let dx = 0; dx < bldg.width; dx++) {
            for (let dy = 0; dy < bldg.height; dy++) {
              this.pathfinder.setWalkable(bldg.x + dx, bldg.y + dy, shouldBeOpen);
            }
          }
        }
      }
    }
  }

  private updateUnits(dt: number): void {
    for (const unit of this.units.values()) {
      if (unit.state === 'dead') continue;

      const def = UNIT_DEFINITIONS[unit.type];
      const player = this.players.get(unit.ownerId);
      if (!player) continue;

      const civ = CIVILIZATIONS[player.civ];
      let speed = def.speed * (civ?.militarySpeedMultiplier ?? 1.0);
      if (unit.type === 'cavalry' && player.researchedTechs.includes('barding_stirrups')) speed *= 1.1;
      if ((unit.type === 'basic_infantry' || unit.type === 'spearman') && player.researchedTechs.includes('forced_march')) speed *= 1.15;

      // Cooldown decrements
      if (unit.attackCooldown > 0) unit.attackCooldown -= dt;
      if (unit.gatherCooldown > 0) unit.gatherCooldown -= dt;

      // Auto-aggro & defensive scan for idle combat units (instant first-tick response, interleaved subsequent ticks)
      const shouldScanAggro = (unit as any).lastAggroTick === undefined || (this.currentTick - (unit as any).lastAggroTick >= 2);
      if (unit.type !== 'worker' && unit.type !== 'scout' && unit.state === 'idle' && shouldScanAggro) {
        (unit as any).lastAggroTick = this.currentTick;
        let nearestEnemyId: string | undefined;
        const currentStance = unit.stance || 'aggressive';
        const guardOriginX = unit.guardX ?? unit.x;
        const guardOriginY = unit.guardY ?? unit.y;

        let attackRange = def.attackRange;
        if (unit.type === 'ranged_infantry' && player.researchedTechs.includes('bodkin_arrows')) {
          attackRange += 1.0;
        }

        let minEnemyDist = currentStance === 'stand_ground'
          ? (attackRange + 0.3)
          : (unit.type === 'dragon' ? (def.visionRange || 13.0) : (def.visionRange || 8.0));

        // Siege units (Catapults/Trebuchets) prioritize enemy defensive structures and Town Centres
        if (unit.type === 'siege_unit') {
          for (const eb of this.buildings.values()) {
            if (eb.team !== unit.team && eb.hp > 0) {
              const cx = eb.x + eb.width / 2;
              const cy = eb.y + eb.height / 2;
              const d = Math.hypot(cx - unit.x, cy - unit.y);
              if (currentStance === 'stand_ground' && d > attackRange + 0.3) continue;
              if (currentStance === 'defensive') {
                const distFromPost = Math.hypot(cx - guardOriginX, cy - guardOriginY);
                if (distFromPost > 6.0) continue;
              }
              const weight = eb.type === 'watchtower' || eb.type === 'fort' ? 0.45 : eb.type === 'town_centre' ? 0.55 : 0.8;
              if (d * weight < minEnemyDist) {
                minEnemyDist = d * weight;
                nearestEnemyId = eb.id;
              }
            }
          }
        }

        // Tactical unit target evaluation (counter-multiplier bonus and focus-fire low HP units)
        if (!nearestEnemyId) {
          const candidates = this.spatialGrid.queryInRadius(unit.x, unit.y, minEnemyDist);
          for (let i = 0; i < candidates.length; i++) {
            const eu = candidates[i];
            if (eu.team !== unit.team && eu.state !== 'dead') {
              const d = Math.hypot(eu.x - unit.x, eu.y - unit.y);
              if (currentStance === 'stand_ground' && d > attackRange + 0.3) continue;
              if (currentStance === 'defensive') {
                const distFromPost = Math.hypot(eu.x - guardOriginX, eu.y - guardOriginY);
                if (distFromPost > 6.0) continue;
              }
              const bonus = def.bonusMultiplierVs ? (def.bonusMultiplierVs[eu.type] || 1.0) : 1.0;
              const hpRatio = eu.hp / Math.max(1, eu.maxHp);
              // Prioritize units we deal bonus damage against (e.g. spearmen vs cavalry, cavalry vs archers)
              const tacticalDist = (d / bonus) * (0.75 + 0.25 * hpRatio);
              if (tacticalDist < minEnemyDist) {
                minEnemyDist = tacticalDist;
                nearestEnemyId = eu.id;
              }
            }
          }
        }

        if (!nearestEnemyId) {
          for (const eb of this.buildings.values()) {
            if (eb.team !== unit.team && eb.hp > 0) {
              const cx = eb.x + eb.width / 2;
              const cy = eb.y + eb.height / 2;
              const d = Math.hypot(cx - unit.x, cy - unit.y);
              if (d < minEnemyDist) {
                minEnemyDist = d;
                nearestEnemyId = eb.id;
              }
            }
          }
        }

        if (nearestEnemyId) {
          unit.state = 'attacking';
          unit.targetEntityId = nearestEnemyId;
        }
      }

      // Handle States
      switch (unit.state) {
        case 'trading': {
          let targetBldg = unit.tradeTargetId ? this.buildings.get(unit.tradeTargetId) : undefined;
          if (!targetBldg || targetBldg.hp <= 0) {
            let bestDest: BuildingData | null = null;
            let maxDist = 0;
            for (const b of this.buildings.values()) {
              if (b.id !== unit.tradeSourceId && b.hp > 0 && b.isConstructed && (b.type === 'town_centre' || b.type === 'market')) {
                if (b.team === unit.team) {
                  const d = Math.hypot(b.x - unit.x, b.y - unit.y);
                  if (d > maxDist) {
                    maxDist = d;
                    bestDest = b;
                  }
                }
              }
            }
            if (bestDest) {
              unit.tradeTargetId = bestDest.id;
              unit.tradeGoldYield = Math.max(15, Math.round(maxDist * 1.5));
              targetBldg = bestDest;
            } else {
              unit.state = 'idle';
              break;
            }
          }

          const destCenterX = targetBldg.x + targetBldg.width / 2;
          const destCenterY = targetBldg.y + targetBldg.height / 2;
          const dist = Math.hypot(destCenterX - unit.x, destCenterY - unit.y);

          if (dist <= 2.2) {
            const goldEarned = unit.tradeGoldYield || 20;
            const owner = this.players.get(unit.ownerId);
            if (owner) {
              owner.resources.metal += goldEarned;
              owner.stats.resourcesGathered.metal += goldEarned;
            }
            this.pendingEvents.push({
              type: 'TRADE_COMPLETED',
              unitId: unit.id,
              ownerId: unit.ownerId,
              goldEarned,
              x: unit.x,
              y: unit.y
            });

            const temp = unit.tradeSourceId;
            unit.tradeSourceId = unit.tradeTargetId;
            unit.tradeTargetId = temp;

            const nextBldg = unit.tradeTargetId ? this.buildings.get(unit.tradeTargetId) : undefined;
            if (nextBldg) {
              unit.targetX = nextBldg.x + nextBldg.width / 2;
              unit.targetY = nextBldg.y + nextBldg.height / 2;
              unit.path = this.pathfinder.findPath(unit.x, unit.y, unit.targetX, unit.targetY);
            }
          } else {
            if (!unit.path || unit.path.length === 0) {
              unit.path = this.pathfinder.findPath(unit.x, unit.y, destCenterX, destCenterY);
            }
            this.stepUnitMovement(unit, speed, dt);
          }
          break;
        }

        case 'moving': {
          this.stepUnitMovement(unit, speed, dt);
          break;
        }

        case 'attacking': {
          const targetUnit = unit.targetEntityId ? this.units.get(unit.targetEntityId) : undefined;
          const targetBldg = unit.targetEntityId ? this.buildings.get(unit.targetEntityId) : undefined;

          if ((!targetUnit || targetUnit.state === 'dead') && (!targetBldg || targetBldg.hp <= 0)) {
            unit.state = 'idle';
            unit.targetEntityId = undefined;
            unit.path = undefined;
            break;
          }

          let dist = 0;
          let aimX = 0;
          let aimY = 0;

          if (targetUnit) {
            aimX = targetUnit.x;
            aimY = targetUnit.y;
            dist = Math.hypot(targetUnit.x - unit.x, targetUnit.y - unit.y);
          } else if (targetBldg) {
            // Distance to building perimeter edge, NOT the inaccessible center!
            const clampedX = Math.max(targetBldg.x, Math.min(targetBldg.x + targetBldg.width, unit.x));
            const clampedY = Math.max(targetBldg.y, Math.min(targetBldg.y + targetBldg.height, unit.y));
            dist = Math.hypot(unit.x - clampedX, unit.y - clampedY);
            aimX = clampedX;
            aimY = clampedY;
          }

          let attackRange = def.attackRange;
          if (unit.type === 'ranged_infantry' && player.researchedTechs.includes('bodkin_arrows')) {
            attackRange += 1.0;
          }

          if (dist <= attackRange + 0.3) {
            // In attack range
            unit.path = undefined;
            unit.facingAngle = Math.atan2(aimY - unit.y, aimX - unit.x);

            if (unit.attackCooldown <= 0) {
              this.executeUnitAttack(unit, targetUnit, targetBldg, def, player);
              unit.attackCooldown = def.attackCooldown;
            }
          } else {
            // Move closer towards target or optimal standoff firing perimeter
            const needsNewPath = !unit.path || unit.path.length === 0;
            if (needsNewPath || (this.currentTick % 25 === 0 && unit.path)) {
              let moveTargetX = aimX;
              let moveTargetY = aimY;
              if (unit.type === 'dragon') {
                const angle = Math.atan2(unit.y - aimY, unit.x - aimX);
                const standoff = Math.max(2.0, attackRange * 0.85);
                moveTargetX = aimX + Math.cos(angle) * standoff;
                moveTargetY = aimY + Math.sin(angle) * standoff;
              } else if (targetBldg) {
                if (attackRange >= 3.0) {
                  const firingSpot = this.pathfinder.findOptimalRangedAttackTile(
                    targetBldg.x, targetBldg.y,
                    targetBldg.width, targetBldg.height,
                    unit.x, unit.y,
                    3.0, attackRange * 0.85
                  );
                  if (firingSpot) {
                    moveTargetX = firingSpot.x;
                    moveTargetY = firingSpot.y;
                  } else {
                    const adj = this.findAdjacentWalkableToBuilding(targetBldg.x, targetBldg.y, targetBldg.width, targetBldg.height, unit.x, unit.y);
                    if (adj) {
                      moveTargetX = adj.x;
                      moveTargetY = adj.y;
                    }
                  }
                } else {
                  const adj = this.findAdjacentWalkableToBuilding(targetBldg.x, targetBldg.y, targetBldg.width, targetBldg.height, unit.x, unit.y);
                  if (adj) {
                    moveTargetX = adj.x;
                    moveTargetY = adj.y;
                  }
                }
              }

              // Only re-path if no path exists, or if destination changed by > 2.0 tiles
              const endPath = unit.path && unit.path.length > 0 ? unit.path[unit.path.length - 1] : null;
              if (!endPath || Math.hypot(endPath.x - moveTargetX, endPath.y - moveTargetY) > 2.0) {
                if (unit.type === 'dragon') {
                  unit.path = [{ x: moveTargetX, y: moveTargetY }];
                } else {
                  unit.path = this.pathfinder.findPath(unit.x, unit.y, moveTargetX, moveTargetY);
                }
              }
            }
            this.stepUnitMovement(unit, speed, dt);
          }
          break;
        }

        case 'gathering': {
          if (unit.type !== 'worker') {
            unit.state = 'idle';
            break;
          }

          const maxCarry = player.researchedTechs.includes('logistics_caravans') ? 25 : 15;

          // If bag is full, return to nearest drop-off
          if (unit.carriedResourceAmount >= maxCarry) {
            unit.state = 'returning_resources';
            break;
          }

          // 1. Check if target is a friendly Farm building
          const farmBldg = unit.targetEntityId ? this.buildings.get(unit.targetEntityId) : undefined;
          if (farmBldg && farmBldg.type === 'farm' && farmBldg.isConstructed && farmBldg.ownerId === unit.ownerId) {
            const clampedX = Math.max(farmBldg.x, Math.min(farmBldg.x + farmBldg.width, unit.x));
            const clampedY = Math.max(farmBldg.y, Math.min(farmBldg.y + farmBldg.height, unit.y));
            const distToEdge = Math.hypot(unit.x - clampedX, unit.y - clampedY);

            if (distToEdge <= 2.2) {
              unit.path = undefined;
              unit.facingAngle = Math.atan2((farmBldg.y + farmBldg.height / 2) - unit.y, (farmBldg.x + farmBldg.width / 2) - unit.x);

              if (unit.gatherCooldown <= 0) {
                unit.carriedResourceType = 'food';
                unit.carriedResourceAmount += 3;
                unit.gatherCooldown = 1.0;
                if (unit.carriedResourceAmount >= maxCarry) {
                  unit.state = 'returning_resources';
                }
              }
            } else {
              if (!unit.path || unit.path.length === 0 || this.currentTick % 20 === 0) {
                const targetTile = this.findAdjacentWalkableToBuilding(farmBldg.x, farmBldg.y, farmBldg.width, farmBldg.height) || { x: clampedX, y: clampedY };
                unit.path = this.pathfinder.findPath(unit.x, unit.y, targetTile.x, targetTile.y);
              }
              this.stepUnitMovement(unit, speed, dt);
            }
            break;
          }

          // 2. Resource Node gathering (wood, stone, metal, wild fruit)
          const node = unit.targetEntityId ? this.resourceNodes.get(unit.targetEntityId) : undefined;
          if (!node || node.amount <= 0) {
            // Find another node of SAME type nearby (e.g. wood -> next tree)
            const preferredType = unit.carriedResourceType;
            const nextNode = (preferredType ? this.findNearestResourceNode(unit.x, unit.y, preferredType) : null) || this.findNearestResourceNode(unit.x, unit.y);
            if (nextNode) {
              unit.targetEntityId = nextNode.id;
              const targetSpot = this.pathfinder.findNearestWalkable(nextNode.x, nextNode.y, 4) || { x: nextNode.x, y: nextNode.y };
              unit.path = this.pathfinder.findPath(unit.x, unit.y, targetSpot.x, targetSpot.y);
            } else if (!this.assignWorkerToBestJob(unit)) {
              unit.state = 'idle';
            }
            break;
          }

          const dist = Math.hypot(node.x - unit.x, node.y - unit.y);
          if (dist <= 2.2) {
            unit.path = undefined;
            unit.facingAngle = Math.atan2(node.y - unit.y, node.x - unit.x);

            if (unit.gatherCooldown <= 0) {
              const harvestAmt = Math.min(3, node.amount);
              node.amount -= harvestAmt;
              unit.carriedResourceType = node.type;
              unit.carriedResourceAmount += harvestAmt;
              unit.gatherCooldown = 1.0;

              if (node.amount <= 0) {
                // Free up walkability if it was wood
                if (node.type === 'wood') {
                  this.pathfinder.setWalkable(node.x, node.y, true);
                }
                this.resourceNodes.delete(node.id);
              }

              if (unit.carriedResourceAmount >= maxCarry) {
                unit.state = 'returning_resources';
              }
            }
          } else {
            if (!unit.path || unit.path.length === 0 || this.currentTick % 20 === 0) {
              const targetSpot = this.pathfinder.findNearestWalkable(node.x, node.y, 4) || { x: node.x, y: node.y };
              unit.path = this.pathfinder.findPath(unit.x, unit.y, targetSpot.x, targetSpot.y);
            }
            this.stepUnitMovement(unit, speed, dt);
          }
          break;
        }

        case 'returning_resources': {
          const dropOff = this.findNearestDropOff(unit.ownerId, unit.carriedResourceType || 'food', unit.x, unit.y);
          if (!dropOff) {
            if (!this.assignWorkerToBestJob(unit)) {
              unit.state = 'idle';
            }
            break;
          }

          const dropX = dropOff.x + dropOff.width / 2;
          const dropY = dropOff.y + dropOff.height / 2;
          const dist = Math.hypot(dropX - unit.x, dropY - unit.y);

          if (dist <= Math.max(dropOff.width, dropOff.height) + 1.2) {
            // Deposit resources
            if (unit.carriedResourceType && unit.carriedResourceAmount > 0) {
              let bonus = civ.gatherRateMultiplier;
              if (unit.carriedResourceType === 'wood' && player.researchedTechs.includes('forestry_axes')) bonus *= 1.3;
              if (unit.carriedResourceType === 'food' && player.researchedTechs.includes('crop_rotation')) bonus *= 1.3;
              if ((unit.carriedResourceType === 'stone' || unit.carriedResourceType === 'metal') && player.researchedTechs.includes('deep_shaft_mining')) bonus *= 1.3;

              const totalAdded = Math.round(unit.carriedResourceAmount * bonus);
              player.resources[unit.carriedResourceType] += totalAdded;
              player.stats.resourcesGathered[unit.carriedResourceType] += totalAdded;

              if (this.settings.sharedTeamEconomy) {
                for (const tm of this.players.values()) {
                  if (tm.team === player.team && tm.id !== player.id && !tm.isDefeated) {
                    tm.resources[unit.carriedResourceType] += totalAdded;
                    tm.stats.resourcesGathered[unit.carriedResourceType] += totalAdded;
                  }
                }
              }

              unit.carriedResourceAmount = 0;
            }

            // Return to gathering
            if (unit.targetEntityId && this.resourceNodes.has(unit.targetEntityId)) {
              unit.state = 'gathering';
              const node = this.resourceNodes.get(unit.targetEntityId)!;
              const targetSpot = this.pathfinder.findNearestWalkable(node.x, node.y, 4) || { x: node.x, y: node.y };
              unit.path = this.pathfinder.findPath(unit.x, unit.y, targetSpot.x, targetSpot.y);
            } else if (unit.targetEntityId && this.buildings.has(unit.targetEntityId) && this.buildings.get(unit.targetEntityId)!.type === 'farm') {
              unit.state = 'gathering';
              const farm = this.buildings.get(unit.targetEntityId)!;
              const targetTile = this.findAdjacentWalkableToBuilding(farm.x, farm.y, farm.width, farm.height) || { x: farm.x, y: farm.y };
              unit.path = this.pathfinder.findPath(unit.x, unit.y, targetTile.x, targetTile.y);
            } else {
              // The specific node was depleted while returning resources!
              // Search for another node of the SAME resource type so worker keeps their profession!
              const sameTypeNode = unit.carriedResourceType ? this.findNearestResourceNode(unit.x, unit.y, unit.carriedResourceType) : null;
              if (sameTypeNode) {
                unit.state = 'gathering';
                unit.targetEntityId = sameTypeNode.id;
                const targetSpot = this.pathfinder.findNearestWalkable(sameTypeNode.x, sameTypeNode.y, 4) || { x: sameTypeNode.x, y: sameTypeNode.y };
                unit.path = this.pathfinder.findPath(unit.x, unit.y, targetSpot.x, targetSpot.y);
              } else if (!this.assignWorkerToBestJob(unit)) {
                unit.state = 'idle';
              }
            }
          } else {
            if (!unit.path || unit.path.length === 0 || this.currentTick % 20 === 0) {
              const targetTile = this.findAdjacentWalkableToBuilding(dropOff.x, dropOff.y, dropOff.width, dropOff.height) || { x: dropX, y: dropY };
              unit.path = this.pathfinder.findPath(unit.x, unit.y, targetTile.x, targetTile.y);
            }
            this.stepUnitMovement(unit, speed, dt);
          }
          break;
        }



        case 'building':
        case 'repairing': {
          const bldg = unit.targetEntityId ? this.buildings.get(unit.targetEntityId) : undefined;
          if (!bldg) {
            unit.state = 'idle';
            break;
          }

          const clampedX = Math.max(bldg.x, Math.min(bldg.x + bldg.width, unit.x));
          const clampedY = Math.max(bldg.y, Math.min(bldg.y + bldg.height, unit.y));
          const distToEdge = Math.hypot(unit.x - clampedX, unit.y - clampedY);

          if (distToEdge <= 1.8) {
            unit.path = undefined;
            unit.facingAngle = Math.atan2((bldg.y + bldg.height / 2) - unit.y, (bldg.x + bldg.width / 2) - unit.x);

            if (!bldg.isConstructed) {
              // Advance construction
              const defBldg = BUILDING_DEFINITIONS[bldg.type];
              let rate = 100 / defBldg.constructionTime;
              if (player.researchedTechs.includes('architecture')) rate *= 1.25;

              bldg.constructionProgress += rate * dt;
              bldg.hp = Math.min(bldg.maxHp, Math.floor((bldg.constructionProgress / 100) * bldg.maxHp));

              if (bldg.constructionProgress >= 100) {
                bldg.isConstructed = true;
                bldg.constructionProgress = 100;
                bldg.hp = bldg.maxHp;
                player.stats.buildingsConstructed++;
                player.maxPopulation += defBldg.populationProvided;

                this.pendingEvents.push({ type: 'BUILDING_COMPLETED', buildingId: bldg.id });
                unit.state = 'idle';
                unit.targetEntityId = undefined;

                // Any other workers also working on this building finish and auto-assign to best available job
                for (const other of this.units.values()) {
                  if (other.targetEntityId === bldg.id && (other.state === 'building' || other.state === 'repairing')) {
                    other.state = 'idle';
                    other.targetEntityId = undefined;
                    this.assignWorkerToBestJob(other);
                  }
                }
                this.assignWorkerToBestJob(unit);
              }
            } else if (bldg.hp < bldg.maxHp) {
              // Repairing
              bldg.hp = Math.min(bldg.maxHp, bldg.hp + 40 * dt);
              if (bldg.hp >= bldg.maxHp) {
                unit.state = 'idle';
                unit.targetEntityId = undefined;
                this.assignWorkerToBestJob(unit);
              }
            } else {
              unit.state = 'idle';
              unit.targetEntityId = undefined;
              this.assignWorkerToBestJob(unit);
            }
          } else {
            if (!unit.path || unit.path.length === 0 || this.currentTick % 20 === 0) {
              const targetTile = this.findAdjacentWalkableToBuilding(bldg.x, bldg.y, bldg.width, bldg.height) || { x: clampedX, y: clampedY };
              unit.path = this.pathfinder.findPath(unit.x, unit.y, targetTile.x, targetTile.y);
            }
            this.stepUnitMovement(unit, speed, dt);
          }
          break;
        }
      }
    }

    // Soft friendly unit separation (repulsion) optimized with spatial partitioning O(N)
    this.spatialGrid.forEachNearbyPair((u1, u2) => {
      const dx = u2.x - u1.x;
      const dy = u2.y - u1.y;
      const distSq = dx * dx + dy * dy;
      const minGap = (u1.type === 'siege_unit' || u2.type === 'siege_unit') ? 1.15 : 0.65;
      const minGapSq = minGap * minGap;

      if (distSq < minGapSq && distSq > 0.0001) {
        const dist = Math.sqrt(distSq);
        const overlap = (minGap - dist) * 0.5;
        const nx = (dx / dist) * overlap * 0.25;
        const ny = (dy / dist) * overlap * 0.25;

        const p1x = Math.floor(u1.x - nx);
        const p1y = Math.floor(u1.y - ny);
        if (this.pathfinder.isWalkable(p1x, p1y)) {
          u1.x -= nx;
          u1.y -= ny;
        }

        const p2x = Math.floor(u2.x + nx);
        const p2y = Math.floor(u2.y + ny);
        if (this.pathfinder.isWalkable(p2x, p2y)) {
          u2.x += nx;
          u2.y += ny;
        }
      }
    });
  }

  private stepUnitMovement(unit: UnitData, speed: number, dt: number): void {
    if (!unit.path || unit.path.length === 0) {
      if (unit.state === 'moving') unit.state = 'idle';
      unit.stuckTicks = 0;
      return;
    }

    // Line of sight shortcut: if next waypoint after current is directly reachable with clearance, skip current
    if (unit.path.length >= 2) {
      const pNext = unit.path[1];
      const clearance = unit.type === 'siege_unit' ? 0.45 : 0.25;
      if (this.pathfinder.hasLineOfSight(unit.x, unit.y, pNext.x, pNext.y, clearance)) {
        unit.path.shift();
      }
    }

    const nextPoint = unit.path[0];
    const dx = nextPoint.x - unit.x;
    const dy = nextPoint.y - unit.y;
    const dist = Math.hypot(dx, dy);
    const moveStep = speed * dt;

    unit.facingAngle = Math.atan2(dy, dx);

    // Anti-stuck progress tracking
    const prevX = unit.x;
    const prevY = unit.y;

    if (dist <= moveStep) {
      unit.x = nextPoint.x;
      unit.y = nextPoint.y;
      unit.path.shift();
      unit.stuckTicks = 0;
      if (unit.path.length === 0 && unit.state === 'moving') {
        unit.state = 'idle';
        unit.path = undefined;
      }
    } else {
      const newX = unit.x + (dx / dist) * moveStep;
      const newY = unit.y + (dy / dist) * moveStep;

      // Aerial units fly over water, walls, and ground obstacles; ground units check walkability
      if (unit.type === 'dragon') {
        if (newX >= 1 && newX <= this.mapData.width - 1 && newY >= 1 && newY <= this.mapData.height - 1) {
          unit.x = newX;
          unit.y = newY;
        }
      } else if (this.pathfinder.isWalkable(Math.floor(newX), Math.floor(newY))) {
        unit.x = newX;
        unit.y = newY;
      } else {
        unit.stuckTicks = (unit.stuckTicks || 0) + 1;
      }
    }

    const actualDistMoved = Math.hypot(unit.x - prevX, unit.y - prevY);
    if (actualDistMoved < 0.015) {
      unit.stuckTicks = (unit.stuckTicks || 0) + 1;
    } else {
      unit.stuckTicks = 0;
    }

    // Unstuck recovery if blocked for 8+ consecutive ticks (0.4s)
    if ((unit.stuckTicks || 0) >= 8) {
      unit.stuckTicks = 0;
      if (unit.path && unit.path.length > 1) {
        // Skip problematic waypoint
        unit.path.shift();
      } else if (unit.targetX !== undefined && unit.targetY !== undefined) {
        // Recalculate path from clean nearby tile
        const safeStart = this.pathfinder.findNearestWalkable(unit.x, unit.y, 6) || { x: unit.x, y: unit.y };
        unit.path = this.pathfinder.findPath(safeStart.x, safeStart.y, unit.targetX, unit.targetY);
      } else {
        unit.path = undefined;
        if (unit.state === 'moving') unit.state = 'idle';
      }
    }
  }

  private executeUnitAttack(
    attacker: UnitData,
    targetUnit: UnitData | undefined,
    targetBldg: BuildingData | undefined,
    def: any,
    player: PlayerState
  ): void {
    let damage = def.damage;

    // Apply military upgrades
    if ((attacker.type === 'basic_infantry' || attacker.type === 'spearman') && player.researchedTechs.includes('forged_blades')) damage *= 1.2;
    if (attacker.type === 'ranged_infantry' && player.researchedTechs.includes('bodkin_arrows')) damage *= 1.2;
    if (attacker.type === 'siege_unit' && player.researchedTechs.includes('siege_engineering')) damage *= 1.35;

    if (targetUnit) {
      const bonus = def.bonusMultiplierVs?.[targetUnit.type] || 1.0;
      const finalDamage = Math.round(damage * bonus);
      targetUnit.hp -= finalDamage;

      this.pendingEvents.push({
        type: 'ATTACK_HIT',
        attackerId: attacker.id,
        targetId: targetUnit.id,
        damage: finalDamage
      });

      if (targetUnit.hp <= 0) {
        targetUnit.state = 'dead';
        const targetOwner = this.players.get(targetUnit.ownerId);
        if (targetOwner) {
          const targetDef = UNIT_DEFINITIONS[targetUnit.type];
          targetOwner.population = Math.max(0, targetOwner.population - targetDef.populationCost);
        }
        player.stats.enemiesDefeated++;
        this.pendingEvents.push({ type: 'UNIT_DIED', unitId: targetUnit.id, killerId: attacker.id });
        attacker.state = 'idle';
        attacker.targetEntityId = undefined;
        attacker.path = undefined;
        this.checkVictoryConditions();
      } else {
        // Retaliate if idle or gathering
        if (targetUnit.type !== 'worker' && (targetUnit.state === 'idle' || targetUnit.state === 'moving')) {
          targetUnit.state = 'attacking';
          targetUnit.targetEntityId = attacker.id;
        }
        // Nearby friendly military units rush to defend
        for (const ally of this.units.values()) {
          if (ally.team === targetUnit.team && ally.id !== targetUnit.id && ally.type !== 'worker' && ally.type !== 'scout') {
            if (ally.state === 'idle' || ally.state === 'moving') {
              const d = Math.hypot(ally.x - targetUnit.x, ally.y - targetUnit.y);
              if (d <= 25) {
                ally.state = 'attacking';
                ally.targetEntityId = attacker.id;
              }
            }
          }
        }
      }
    } else if (targetBldg) {
      const bonus = def.bonusMultiplierVs?.['buildings'] || 1.0;
      const finalDamage = Math.round(damage * bonus);
      targetBldg.hp -= finalDamage;

      this.pendingEvents.push({
        type: 'ATTACK_HIT',
        attackerId: attacker.id,
        targetId: targetBldg.id,
        damage: finalDamage
      });

      if (targetBldg.hp <= 0) {
        this.destroyBuilding(targetBldg.id);
        attacker.state = 'idle';
        attacker.targetEntityId = undefined;
        attacker.path = undefined;
      } else {
        // Nearby friendly military defenders rush to defend structure
        for (const ally of this.units.values()) {
          if (ally.team === targetBldg.team && ally.type !== 'worker' && ally.type !== 'scout') {
            if (ally.state === 'idle' || ally.state === 'moving') {
              const d = Math.hypot(ally.x - targetBldg.x, ally.y - targetBldg.y);
              if (d <= 30) {
                ally.state = 'attacking';
                ally.targetEntityId = attacker.id;
              }
            }
          }
        }
      }
    }
  }

  private updateBuildings(dt: number): void {
    for (const bldg of this.buildings.values()) {
      const player = this.players.get(bldg.ownerId);
      if (!player) continue;

      // Defensive attacks (Town Centre, Fort, Watchtower)
      const def = BUILDING_DEFINITIONS[bldg.type];
      if (bldg.isConstructed && def.attackDamage && def.attackRange) {
        if (!bldg.attackCooldown) bldg.attackCooldown = 0;
        if (bldg.attackCooldown > 0) bldg.attackCooldown -= dt;

        if (bldg.attackCooldown <= 0) {
          // Find closest enemy unit in range
          let closestEnemy: UnitData | null = null;
          let maxRange = def.attackRange;
          if (bldg.type === 'watchtower' && player.researchedTechs.includes('arrow_slits')) {
            maxRange += 1.5;
          }
          let closestDist = maxRange;

          const cx = bldg.x + bldg.width / 2;
          const cy = bldg.y + bldg.height / 2;

          const nearbyEnemies = this.spatialGrid.queryInRadius(cx, cy, maxRange);
          for (let i = 0; i < nearbyEnemies.length; i++) {
            const u = nearbyEnemies[i];
            if (u.team !== bldg.team && u.state !== 'dead') {
              const d = Math.hypot(u.x - cx, u.y - cy);
              if (d < closestDist) {
                closestDist = d;
                closestEnemy = u;
              }
            }
          }

          if (closestEnemy) {
            let dmg = def.attackDamage;
            if (bldg.type === 'watchtower' && player.researchedTechs.includes('arrow_slits')) dmg *= 1.25;

            closestEnemy.hp -= dmg;
            bldg.attackCooldown = def.attackCooldown || 1.5;

            this.pendingEvents.push({
              type: 'ATTACK_HIT',
              attackerId: bldg.id,
              targetId: closestEnemy.id,
              damage: dmg
            });

            if (closestEnemy.hp <= 0) {
              closestEnemy.state = 'dead';
              const enemyOwner = this.players.get(closestEnemy.ownerId);
              if (enemyOwner) {
                const udef = UNIT_DEFINITIONS[closestEnemy.type];
                enemyOwner.population = Math.max(0, enemyOwner.population - udef.populationCost);
              }
              this.pendingEvents.push({ type: 'UNIT_DIED', unitId: closestEnemy.id, killerId: bldg.id });
            }
          }
        }
      }

      // Production queues
      if (bldg.isConstructed && bldg.productionQueue.length > 0) {
        const item = bldg.productionQueue[0];
        const civ = CIVILIZATIONS[player.civ];

        let speedMultiplier = 1.0;
        if (item.category === 'unit' && player.researchedTechs.includes('standing_army')) {
          speedMultiplier *= 1.25;
        }
        if (item.category === 'tech') {
          speedMultiplier *= civ.researchSpeedMultiplier;
        }

        item.progress += (dt * speedMultiplier / item.totalTime) * 100;

        if (item.progress >= 100) {
          // Finished item
          bldg.productionQueue.shift();

          if (item.category === 'unit') {
            this.spawnTrainedUnit(bldg, item.itemType as UnitType);
          } else if (item.category === 'tech') {
            player.researchedTechs.push(item.itemType);
            player.stats.technologiesResearched++;
            this.pendingEvents.push({ type: 'TECH_RESEARCHED', playerId: player.id, techId: item.itemType });

            // Apply immediate one-time structural or population tech bonuses
            if (item.itemType === 'urban_planning') {
              player.maxPopulation += 15;
            } else if (item.itemType === 'masonry') {
              for (const b of this.buildings.values()) {
                if (b.ownerId === player.id) {
                  b.maxHp = Math.round(b.maxHp * 1.25);
                  b.hp = Math.round(b.hp * 1.25);
                }
              }
            } else if (item.itemType === 'barding_stirrups') {
              for (const u of this.units.values()) {
                if (u.ownerId === player.id && u.type === 'cavalry') {
                  u.maxHp = Math.round(u.maxHp * 1.25);
                  u.hp = Math.round(u.hp * 1.25);
                }
              }
            }
          } else if (item.category === 'age') {
            player.age = item.itemType as AgeName;
            this.pendingEvents.push({ type: 'AGE_ADVANCED', playerId: player.id, newAge: player.age });

            // In the last age advancement (Industrial Age), troops spawn instantly after research!
            if (player.age === 'Industrial Age') {
              // 1. Immediately complete and spawn all units currently queued in any production building
              for (const b of this.buildings.values()) {
                if (b.ownerId === player.id && b.isConstructed) {
                  const queuedUnits = b.productionQueue.filter(q => q.category === 'unit');
                  b.productionQueue = b.productionQueue.filter(q => q.category !== 'unit');
                  for (const q of queuedUnits) {
                    this.spawnTrainedUnit(b, q.itemType as UnitType);
                  }
                }
              }

              // 2. Spawn an elite vanguard battalion of Industrial troops as an immediate reward
              const tc = Array.from(this.buildings.values()).find(b => b.ownerId === player.id && b.type === 'town_centre');
              if (tc) {
                const vanguardTroops: UnitType[] = ['advanced_unit', 'ranged_infantry', 'cavalry', 'siege_unit'];
                for (const uType of vanguardTroops) {
                  const udef = UNIT_DEFINITIONS[uType];
                  if (player.population + udef.populationCost <= player.maxPopulation) {
                    player.population += udef.populationCost;
                    this.spawnTrainedUnit(tc, uType);
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  private spawnTrainedUnit(bldg: BuildingData, unitType: UnitType): void {
    const udef = UNIT_DEFINITIONS[unitType];
    const uid = `unit_${this.unitIdCounter++}`;
    const player = this.players.get(bldg.ownerId);

    // Find spawn spot at building edge
    let spawnX = bldg.x + bldg.width + 0.5;
    let spawnY = bldg.y + bldg.height / 2;

    const walkableSpot = this.findAdjacentWalkableToBuilding(bldg.x, bldg.y, bldg.width, bldg.height, spawnX, spawnY) ||
      this.pathfinder.findNearestWalkable(spawnX, spawnY, 8);
    if (walkableSpot) {
      spawnX = walkableSpot.x + 0.5;
      spawnY = walkableSpot.y + 0.5;
    }

    let maxHp = udef.hp;
    if (unitType === 'cavalry' && player?.researchedTechs.includes('barding_stirrups')) {
      maxHp = Math.round(maxHp * 1.25);
    }

    const unit: UnitData = {
      id: uid,
      type: unitType,
      ownerId: bldg.ownerId,
      team: bldg.team,
      x: spawnX,
      y: spawnY,
      hp: maxHp,
      maxHp: maxHp,
      state: 'idle',
      carriedResourceAmount: 0,
      attackCooldown: 0,
      gatherCooldown: 0,
      facingAngle: 0
    };

    this.units.set(uid, unit);

    this.pendingEvents.push({
      type: 'UNIT_SPAWNED',
      unitId: uid,
      ownerId: bldg.ownerId,
      unitType: unitType,
      x: spawnX,
      y: spawnY
    });

    if (unitType === 'trade_cart') {
      let bestDest: BuildingData | null = null;
      let maxDist = 0;
      for (const b of this.buildings.values()) {
        if (b.id !== bldg.id && b.hp > 0 && b.isConstructed && (b.type === 'town_centre' || b.type === 'market')) {
          if (b.team === bldg.team) {
            const d = Math.hypot(b.x - bldg.x, b.y - bldg.y);
            if (d > maxDist) {
              maxDist = d;
              bestDest = b;
            }
          }
        }
      }
      if (bestDest) {
        unit.state = 'trading';
        unit.tradeSourceId = bldg.id;
        unit.tradeTargetId = bestDest.id;
        unit.tradeGoldYield = Math.max(15, Math.round(maxDist * 1.5));
        unit.targetX = bestDest.x + bestDest.width / 2;
        unit.targetY = bestDest.y + bestDest.height / 2;
        unit.path = this.pathfinder.findPath(unit.x, unit.y, unit.targetX, unit.targetY);
      }
    }

    if (unitType === 'worker') {
      if (bldg.rallyPoint) {
        if (bldg.rallyPoint.targetEntityId) {
          const resNode = this.resourceNodes.get(bldg.rallyPoint.targetEntityId);
          if (resNode && resNode.amount > 0) {
            unit.state = 'gathering';
            unit.targetEntityId = resNode.id;
            const targetSpot = this.pathfinder.findNearestWalkable(resNode.x, resNode.y, 4) || { x: resNode.x, y: resNode.y };
            unit.targetX = targetSpot.x;
            unit.targetY = targetSpot.y;
            unit.path = this.pathfinder.findPath(unit.x, unit.y, targetSpot.x, targetSpot.y);
          } else {
            const targetBldg = this.buildings.get(bldg.rallyPoint.targetEntityId);
            if (targetBldg) {
              unit.state = (!targetBldg.isConstructed || targetBldg.hp < targetBldg.maxHp) ? 'building' : 'idle';
              unit.targetEntityId = targetBldg.id;
              const adj = this.findAdjacentWalkableToBuilding(targetBldg.x, targetBldg.y, targetBldg.width, targetBldg.height, unit.x, unit.y);
              if (adj) {
                unit.targetX = adj.x;
                unit.targetY = adj.y;
                unit.path = this.pathfinder.findPath(unit.x, unit.y, adj.x, adj.y);
              }
            } else {
              unit.state = 'moving';
              unit.targetX = bldg.rallyPoint.x;
              unit.targetY = bldg.rallyPoint.y;
              unit.path = this.pathfinder.findPath(unit.x, unit.y, bldg.rallyPoint.x, bldg.rallyPoint.y);
            }
          }
        } else {
          unit.state = 'moving';
          unit.targetX = bldg.rallyPoint.x;
          unit.targetY = bldg.rallyPoint.y;
          unit.path = this.pathfinder.findPath(unit.x, unit.y, bldg.rallyPoint.x, bldg.rallyPoint.y);
        }
      } else {
        this.assignWorkerToBestJob(unit);
      }
    } else if (bldg.rallyPoint) {
      if (bldg.rallyPoint.targetEntityId) {
        const enemyUnit = this.units.get(bldg.rallyPoint.targetEntityId);
        const enemyBldg = this.buildings.get(bldg.rallyPoint.targetEntityId);
        if (enemyUnit && enemyUnit.team !== bldg.team && enemyUnit.state !== 'dead') {
          unit.state = 'attacking';
          unit.targetEntityId = enemyUnit.id;
          unit.targetX = enemyUnit.x;
          unit.targetY = enemyUnit.y;
          unit.path = this.pathfinder.findPath(unit.x, unit.y, enemyUnit.x, enemyUnit.y);
        } else if (enemyBldg && enemyBldg.team !== bldg.team && enemyBldg.hp > 0) {
          unit.state = 'attacking';
          unit.targetEntityId = enemyBldg.id;
          const adj = this.findAdjacentWalkableToBuilding(enemyBldg.x, enemyBldg.y, enemyBldg.width, enemyBldg.height, unit.x, unit.y);
          if (adj) {
            unit.targetX = adj.x;
            unit.targetY = adj.y;
            unit.path = this.pathfinder.findPath(unit.x, unit.y, adj.x, adj.y);
          }
        } else {
          unit.state = 'moving';
          unit.targetX = bldg.rallyPoint.x;
          unit.targetY = bldg.rallyPoint.y;
          unit.path = this.pathfinder.findPath(unit.x, unit.y, bldg.rallyPoint.x, bldg.rallyPoint.y);
        }
      } else {
        unit.state = 'moving';
        unit.targetX = bldg.rallyPoint.x;
        unit.targetY = bldg.rallyPoint.y;
        unit.path = this.pathfinder.findPath(unit.x, unit.y, bldg.rallyPoint.x, bldg.rallyPoint.y);
      }
    }
  }


  public destroyBuilding(bldgId: string): void {
    const bldg = this.buildings.get(bldgId);
    if (!bldg) return;

    // Free up tiles for pathfinding
    for (let dx = 0; dx < bldg.width; dx++) {
      for (let dy = 0; dy < bldg.height; dy++) {
        this.pathfinder.setWalkable(bldg.x + dx, bldg.y + dy, true);
      }
    }

    const player = this.players.get(bldg.ownerId);
    if (player) {
      const def = BUILDING_DEFINITIONS[bldg.type];
      player.maxPopulation = Math.max(10, player.maxPopulation - def.populationProvided);

      // Refund units in production queue
      if (bldg.productionQueue && bldg.productionQueue.length > 0) {
        for (const item of bldg.productionQueue) {
          if (item.category === 'unit') {
            const udef = UNIT_DEFINITIONS[item.itemType as UnitType];
            if (udef) {
              player.population = Math.max(0, player.population - udef.populationCost);
              player.resources.food += udef.cost.food;
              player.resources.wood += udef.cost.wood;
              player.resources.stone += udef.cost.stone;
              player.resources.metal += udef.cost.metal;
            }
          }
        }
      }
      this.syncPlayerPopulation(player.id);
    }

    this.buildings.delete(bldgId);
    this.territoryDirty = true;
    this.pendingEvents.push({ type: 'BUILDING_DESTROYED', buildingId: bldgId });
    this.checkVictoryConditions();
  }

  public syncPlayerPopulation(playerId: string): void {
    const player = this.players.get(playerId);
    if (!player) return;
    let currentPop = 0;
    for (const u of this.units.values()) {
      if (u.ownerId === playerId && u.state !== 'dead') {
        const udef = UNIT_DEFINITIONS[u.type];
        currentPop += udef ? udef.populationCost : 1;
      }
    }
    for (const b of this.buildings.values()) {
      if (b.ownerId === playerId && b.productionQueue) {
        for (const item of b.productionQueue) {
          if (item.category === 'unit') {
            const udef = UNIT_DEFINITIONS[item.itemType as UnitType];
            currentPop += udef ? udef.populationCost : 1;
          }
        }
      }
    }
    player.population = currentPop;
  }

  private recalculateTerritory(): void {
    if (!this.territoryDirty) return;
    this.territoryDirty = false;
    // Reset tile territory
    for (const tile of this.mapData.tiles) {
      tile.territoryOwnerId = undefined;
      tile.territoryTeam = undefined;
    }

    // Apply influence circles around anchor buildings
    for (const bldg of this.buildings.values()) {
      if (!bldg.isConstructed) continue;
      const def = BUILDING_DEFINITIONS[bldg.type];
      if (def.territoryRadius <= 0) continue;

      const cx = bldg.x + bldg.width / 2;
      const cy = bldg.y + bldg.height / 2;
      const r = def.territoryRadius;

      const minX = Math.max(0, Math.floor(cx - r));
      const maxX = Math.min(this.mapData.width - 1, Math.ceil(cx + r));
      const minY = Math.max(0, Math.floor(cy - r));
      const maxY = Math.min(this.mapData.height - 1, Math.ceil(cy + r));

      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const dist = Math.hypot(x - cx, y - cy);
          if (dist <= r) {
            const tile = this.mapData.tiles[y * this.mapData.width + x];
            tile.territoryOwnerId = bldg.ownerId;
            tile.territoryTeam = bldg.team;
          }
        }
      }
    }
  }

  private findNearestDropOff(ownerId: string, resource: ResourceType, x: number, y: number): BuildingData | null {
    let nearest: BuildingData | null = null;
    let minDist = Infinity;
    const player = this.players.get(ownerId);
    const myTeam = player ? player.team : null;

    for (const bldg of this.buildings.values()) {
      const isFriendly = bldg.ownerId === ownerId || (myTeam !== null && bldg.team === myTeam);
      if (isFriendly && bldg.isConstructed) {
        const def = BUILDING_DEFINITIONS[bldg.type];
        if (def.dropOffResources?.includes(resource as any)) {
          const d = Math.hypot(bldg.x - x, bldg.y - y);
          if (d < minDist) {
            minDist = d;
            nearest = bldg;
          }
        }
      }
    }
    return nearest;
  }

  private findNearestResourceNode(x: number, y: number, type?: ResourceType): ResourceNodeData | null {
    let nearest: ResourceNodeData | null = null;
    let minDist = Infinity;

    for (const node of this.resourceNodes.values()) {
      if (node.amount > 0 && (!type || node.type === type)) {
        const d = Math.hypot(node.x - x, node.y - y);
        if (d < minDist) {
          minDist = d;
          nearest = node;
        }
      }
    }
    return nearest;
  }

  public assignWorkerToBestJob(worker: UnitData): boolean {
    if (worker.type !== 'worker' || worker.state === 'dead') return false;
    const player = this.players.get(worker.ownerId);
    if (!player) return false;

    // 1. Priority: Construction sites needing builders or damaged buildings needing repair
    let bestBldgToWork: BuildingData | null = null;
    let bestBldgDist = Infinity;
    // Pre-calculate active repair/construction workers per building in a single linear pass
    const activeBuilders = new Map<string, number>();
    for (const u of this.units.values()) {
      if (u.targetEntityId && (u.state === 'building' || u.state === 'repairing')) {
        activeBuilders.set(u.targetEntityId, (activeBuilders.get(u.targetEntityId) || 0) + 1);
      }
    }

    for (const b of this.buildings.values()) {
      const isFriendly = b.ownerId === worker.ownerId || (player.team !== undefined && b.team === player.team);
      if (isFriendly && (!b.isConstructed || b.hp < b.maxHp * 0.9)) {
        const currentWorkers = activeBuilders.get(b.id) || 0;
        const maxAllowed = b.isConstructed ? 2 : 4;
        if (currentWorkers < maxAllowed) {
          const d = Math.hypot(b.x - worker.x, b.y - worker.y);
          if (d < bestBldgDist) {
            bestBldgDist = d;
            bestBldgToWork = b;
          }
        }
      }
    }

    if (bestBldgToWork) {
      worker.state = bestBldgToWork.isConstructed ? 'repairing' : 'building';
      worker.targetEntityId = bestBldgToWork.id;
      const targetTile = this.findAdjacentWalkableToBuilding(bestBldgToWork.x, bestBldgToWork.y, bestBldgToWork.width, bestBldgToWork.height) || { x: bestBldgToWork.x, y: bestBldgToWork.y };
      worker.targetX = targetTile.x;
      worker.targetY = targetTile.y;
      worker.path = this.pathfinder.findPath(worker.x, worker.y, targetTile.x, targetTile.y);
      return true;
    }

    // 2. Intelligent Economic Balancing across Wood, Stone, Metal, and Food
    // Count how many workers are currently harvesting each resource type
    let workersOnFood = 0;
    let workersOnWood = 0;
    let workersOnStone = 0;
    let workersOnMetal = 0;

    for (const u of this.units.values()) {
      if (u.ownerId === worker.ownerId && u.type === 'worker' && u.state !== 'dead' && u.id !== worker.id) {
        if (u.state === 'gathering' || u.state === 'returning_resources') {
          if (u.carriedResourceType) {
            if (u.carriedResourceType === 'food') workersOnFood++;
            else if (u.carriedResourceType === 'wood') workersOnWood++;
            else if (u.carriedResourceType === 'stone') workersOnStone++;
            else if (u.carriedResourceType === 'metal') workersOnMetal++;
          } else if (u.targetEntityId) {
            const b = this.buildings.get(u.targetEntityId);
            if (b && b.type === 'farm') workersOnFood++;
            const n = this.resourceNodes.get(u.targetEntityId);
            if (n) {
              if (n.type === 'food') workersOnFood++;
              else if (n.type === 'wood') workersOnWood++;
              else if (n.type === 'stone') workersOnStone++;
              else if (n.type === 'metal') workersOnMetal++;
            }
          }
        }
      }
    }

    // Weight need based on existing stockpile + active workforce
    const woodScore = player.resources.wood + workersOnWood * 120;
    const stoneScore = player.resources.stone + workersOnStone * 140;
    const metalScore = player.resources.metal + workersOnMetal * 140;
    const foodScore = player.resources.food + workersOnFood * 150;

    const resourcePriorities: ResourceType[] = (['wood', 'stone', 'metal', 'food'] as ResourceType[]).sort((a, b) => {
      const scoreA = a === 'food' ? foodScore : a === 'wood' ? woodScore : a === 'stone' ? stoneScore : metalScore;
      const scoreB = b === 'food' ? foodScore : b === 'wood' ? woodScore : b === 'stone' ? stoneScore : metalScore;
      return scoreA - scoreB;
    });

    for (const resType of resourcePriorities) {
      if (resType === 'wood') {
        // Find nearest wood node near lumber camp or near worker
        let bestWoodNode: ResourceNodeData | null = null;
        let bestWoodDist = Infinity;

        // Check around Lumber Camps first
        for (const camp of this.buildings.values()) {
          if (camp.ownerId === worker.ownerId && camp.type === 'lumber_camp' && camp.isConstructed) {
            for (const n of this.resourceNodes.values()) {
              if (n.type === 'wood' && n.amount > 0) {
                const dCamp = Math.hypot(n.x - camp.x, n.y - camp.y);
                if (dCamp <= 20) {
                  const dWorker = Math.hypot(n.x - worker.x, n.y - worker.y);
                  if (dWorker < bestWoodDist) {
                    bestWoodDist = dWorker;
                    bestWoodNode = n;
                  }
                }
              }
            }
          }
        }

        if (!bestWoodNode) {
          bestWoodNode = this.findNearestResourceNode(worker.x, worker.y, 'wood');
        }

        if (bestWoodNode) {
          worker.state = 'gathering';
          worker.targetEntityId = bestWoodNode.id;
          worker.targetX = bestWoodNode.x;
          worker.targetY = bestWoodNode.y;
          const targetSpot = this.pathfinder.findNearestWalkable(bestWoodNode.x, bestWoodNode.y, 4) || { x: bestWoodNode.x, y: bestWoodNode.y };
          worker.path = this.pathfinder.findPath(worker.x, worker.y, targetSpot.x, targetSpot.y);
          return true;
        }
      } else if (resType === 'stone') {
        let bestStoneNode: ResourceNodeData | null = null;
        let bestStoneDist = Infinity;

        for (const camp of this.buildings.values()) {
          if (camp.ownerId === worker.ownerId && camp.type === 'quarry' && camp.isConstructed) {
            for (const n of this.resourceNodes.values()) {
              if (n.type === 'stone' && n.amount > 0) {
                const dCamp = Math.hypot(n.x - camp.x, n.y - camp.y);
                if (dCamp <= 20) {
                  const dWorker = Math.hypot(n.x - worker.x, n.y - worker.y);
                  if (dWorker < bestStoneDist) {
                    bestStoneDist = dWorker;
                    bestStoneNode = n;
                  }
                }
              }
            }
          }
        }

        if (!bestStoneNode) {
          bestStoneNode = this.findNearestResourceNode(worker.x, worker.y, 'stone');
        }

        if (bestStoneNode) {
          worker.state = 'gathering';
          worker.targetEntityId = bestStoneNode.id;
          worker.targetX = bestStoneNode.x;
          worker.targetY = bestStoneNode.y;
          const targetSpot = this.pathfinder.findNearestWalkable(bestStoneNode.x, bestStoneNode.y, 4) || { x: bestStoneNode.x, y: bestStoneNode.y };
          worker.path = this.pathfinder.findPath(worker.x, worker.y, targetSpot.x, targetSpot.y);
          return true;
        }
      } else if (resType === 'metal') {
        let bestMetalNode: ResourceNodeData | null = null;
        let bestMetalDist = Infinity;

        for (const camp of this.buildings.values()) {
          if (camp.ownerId === worker.ownerId && camp.type === 'mining_camp' && camp.isConstructed) {
            for (const n of this.resourceNodes.values()) {
              if (n.type === 'metal' && n.amount > 0) {
                const dCamp = Math.hypot(n.x - camp.x, n.y - camp.y);
                if (dCamp <= 20) {
                  const dWorker = Math.hypot(n.x - worker.x, n.y - worker.y);
                  if (dWorker < bestMetalDist) {
                    bestMetalDist = dWorker;
                    bestMetalNode = n;
                  }
                }
              }
            }
          }
        }

        if (!bestMetalNode) {
          bestMetalNode = this.findNearestResourceNode(worker.x, worker.y, 'metal');
        }

        if (bestMetalNode) {
          worker.state = 'gathering';
          worker.targetEntityId = bestMetalNode.id;
          worker.targetX = bestMetalNode.x;
          worker.targetY = bestMetalNode.y;
          const targetSpot = this.pathfinder.findNearestWalkable(bestMetalNode.x, bestMetalNode.y, 4) || { x: bestMetalNode.x, y: bestMetalNode.y };
          worker.path = this.pathfinder.findPath(worker.x, worker.y, targetSpot.x, targetSpot.y);
          return true;
        }
      } else if (resType === 'food') {
        // Operational Farms
        let bestFarm: BuildingData | null = null;
        let bestFarmDist = Infinity;
        for (const b of this.buildings.values()) {
          if (b.ownerId === worker.ownerId && b.type === 'farm' && b.isConstructed) {
            let farmers = 0;
            for (const u of this.units.values()) {
              if (u.targetEntityId === b.id && u.state === 'gathering') {
                farmers++;
              }
            }
            if (farmers < 2) {
              const d = Math.hypot(b.x - worker.x, b.y - worker.y);
              if (d < bestFarmDist) {
                bestFarmDist = d;
                bestFarm = b;
              }
            }
          }
        }

        if (bestFarm) {
          worker.state = 'gathering';
          worker.targetEntityId = bestFarm.id;
          const targetTile = this.findAdjacentWalkableToBuilding(bestFarm.x, bestFarm.y, bestFarm.width, bestFarm.height) || { x: bestFarm.x, y: bestFarm.y };
          worker.targetX = targetTile.x;
          worker.targetY = targetTile.y;
          worker.path = this.pathfinder.findPath(worker.x, worker.y, targetTile.x, targetTile.y);
          return true;
        }

        // Fruit bushes
        const foodNode = this.findNearestResourceNode(worker.x, worker.y, 'food');
        if (foodNode) {
          worker.state = 'gathering';
          worker.targetEntityId = foodNode.id;
          worker.targetX = foodNode.x;
          worker.targetY = foodNode.y;
          const targetSpot = this.pathfinder.findNearestWalkable(foodNode.x, foodNode.y, 4) || { x: foodNode.x, y: foodNode.y };
          worker.path = this.pathfinder.findPath(worker.x, worker.y, targetSpot.x, targetSpot.y);
          return true;
        }
      }
    }

    // 3. Fallback: nearest resource node anywhere reachable
    const nearestNode = this.findNearestResourceNode(worker.x, worker.y);
    if (nearestNode) {
      worker.state = 'gathering';
      worker.targetEntityId = nearestNode.id;
      worker.targetX = nearestNode.x;
      worker.targetY = nearestNode.y;
      const targetSpot = this.pathfinder.findNearestWalkable(nearestNode.x, nearestNode.y, 4) || { x: nearestNode.x, y: nearestNode.y };
      worker.path = this.pathfinder.findPath(worker.x, worker.y, targetSpot.x, targetSpot.y);
      return true;
    }

    return false;
  }



  private getOrCreateAIState(player: PlayerState, basePos: Vector2D): AICommanderState {
    let state = this.aiStates.get(player.id);
    if (!state) {
      const mapCenterX = this.mapData.width / 2;
      const mapCenterY = this.mapData.height / 2;
      const dx = mapCenterX - basePos.x;
      const dy = mapCenterY - basePos.y;
      const dist = Math.hypot(dx, dy) || 1;
      const rallyDist = Math.min(12, dist * 0.35);
      const rawRallyX = Math.round(basePos.x + (dx / dist) * rallyDist);
      const rawRallyY = Math.round(basePos.y + (dy / dist) * rallyDist);

      const walkableRally = this.pathfinder.findNearestWalkable(rawRallyX, rawRallyY, 8) || { x: rawRallyX, y: rawRallyY };
      const initialDelay = player.aiDifficulty === 'hard' ? 1000 : player.aiDifficulty === 'medium' ? 1600 : 2200;

      state = {
        playerId: player.id,
        rallyPoint: walkableRally,
        currentTactic: 'amassing',
        nextWaveTick: this.currentTick + initialDelay,
        waveNumber: 0,
        harassUnitIds: [],
        lastHarassTick: 0,
        lastAllyHelpTick: 0
      };
      this.aiStates.set(player.id, state);
    }
    return state;
  }

  // AI Logic Routine (Supports singleplayer, multiplayer, AI allies, and AI enemies)
  private updateAI(): void {
    for (const player of this.players.values()) {
      if (!player.isAi || player.isDefeated) continue;

      // Authoritative population sync to eliminate ghost cap lockouts
      this.syncPlayerPopulation(player.id);

      const myUnits = Array.from(this.units.values()).filter(u => u.ownerId === player.id && u.state !== 'dead');
      const myBuildings = Array.from(this.buildings.values()).filter(b => b.ownerId === player.id && b.hp > 0);
      const workers = myUnits.filter(u => u.type === 'worker');
      const military = myUnits.filter(u => u.type !== 'worker' && u.type !== 'scout');
      const scouts = myUnits.filter(u => u.type === 'scout');

      // Base anchor point: preferably Town Centre, otherwise any owned building or unit
      const tc = myBuildings.find(b => b.type === 'town_centre' && b.isConstructed) || myBuildings.find(b => b.type === 'town_centre');
      const basePos = tc ? { x: tc.x, y: tc.y } : myBuildings[0] ? { x: myBuildings[0].x, y: myBuildings[0].y } : (myUnits[0] ? { x: myUnits[0].x, y: myUnits[0].y } : null);
      if (!basePos) continue;

      const state = this.getOrCreateAIState(player, basePos);

      // Keep military building rally points synchronized to AI's rally point
      for (const b of myBuildings) {
        if (
          b.type === 'barracks' ||
          b.type === 'archery_range' ||
          b.type === 'stable' ||
          b.type === 'workshop' ||
          b.type === 'fort'
        ) {
          b.rallyPoint = { x: state.rallyPoint.x, y: state.rallyPoint.y };
        }
      }

      // Helper to acquire a worker for construction (prefers idle, fallback to gathering)
      const getBuilderWorker = (): UnitData | undefined => {
        return workers.find(w => w.state === 'idle') || workers.find(w => w.state === 'gathering');
      };

      // -------------------------------------------------------------
      // 1. EMERGENCY CIVILIAN SURVIVAL & RECOVERY
      // -------------------------------------------------------------
      const operationalTCs = myBuildings.filter(b => b.type === 'town_centre' && b.isConstructed);

      if (workers.length === 0) {
        if (operationalTCs.length > 0) {
          // Provide emergency baseline relief food if completely starved so Town Centre can train
          if (player.resources.food < 50) {
            player.resources.food = 50;
          }
          for (const opTc of operationalTCs) {
            if (opTc.productionQueue.length < 2 && player.population < player.maxPopulation) {
              this.processCommand(player.id, {
                type: 'TRAIN_UNIT',
                buildingId: opTc.id,
                unitType: 'worker'
              });
              break;
            }
          }
        } else if (myBuildings.length > 0) {
          // All Town Centres destroyed, but player has other buildings: spawn an emergency refugee worker
          const spawnAnchor = myBuildings[0];
          const spot = this.findAdjacentWalkableToBuilding(spawnAnchor.x, spawnAnchor.y, spawnAnchor.width, spawnAnchor.height) || { x: spawnAnchor.x, y: spawnAnchor.y };
          const workerId = `unit_${this.unitIdCounter++}`;
          const refugeeWorker: UnitData = {
            id: workerId,
            type: 'worker',
            ownerId: player.id,
            team: player.team,
            x: spot.x,
            y: spot.y,
            hp: 100,
            maxHp: 100,
            state: 'idle',
            attackCooldown: 0,
            gatherCooldown: 0,
            facingAngle: 0,
            carriedResourceAmount: 0
          };
          this.units.set(workerId, refugeeWorker);
          this.syncPlayerPopulation(player.id);
          this.pendingEvents.push({ type: 'UNIT_SPAWNED', unitId: workerId, unitType: 'worker', ownerId: player.id, x: spot.x, y: spot.y });
        }
      }

      // -------------------------------------------------------------
      // 2. REBUILD DESTROYED TOWN CENTRE (TOP PRIORITY IF ZERO TCS)
      // -------------------------------------------------------------
      const totalTCs = myBuildings.filter(b => b.type === 'town_centre').length;
      if (totalTCs === 0 && workers.length > 0) {
        if (player.resources.wood >= 250 && player.resources.stone >= 100) {
          const builder = getBuilderWorker();
          if (builder) {
            const spot = this.findBuildingPlacementSpot('town_centre', basePos.x, basePos.y);
            if (spot) {
              this.processCommand(player.id, {
                type: 'BUILD',
                unitIds: [builder.id],
                buildingType: 'town_centre',
                position: spot
              });
            }
          }
        } else {
          // Send workers to gather wood and stone specifically for the new Town Centre
          for (const w of workers) {
            if (w.state === 'idle') {
              const resNeeded = player.resources.wood < 250 ? 'wood' : 'stone';
              const node = this.findNearestResourceNode(w.x, w.y, resNeeded) || this.findNearestResourceNode(w.x, w.y);
              if (node) {
                this.processCommand(player.id, {
                  type: 'GATHER',
                  unitIds: [w.id],
                  resourceNodeId: node.id
                });
              }
            }
          }
        }
      }

      // -------------------------------------------------------------
      // 3. WORKER REPRODUCTION ACROSS ALL TOWN CENTRES
      // -------------------------------------------------------------
      const targetWorkerCount = player.aiDifficulty === 'hard' ? 28 : player.aiDifficulty === 'medium' ? 20 : 14;
      for (const opTc of operationalTCs) {
        if (workers.length < targetWorkerCount && opTc.productionQueue.length < 2 && player.resources.food >= 50 && player.population < player.maxPopulation) {
          this.processCommand(player.id, {
            type: 'TRAIN_UNIT',
            buildingId: opTc.id,
            unitType: 'worker'
          });
        }
      }

      // -------------------------------------------------------------
      // 4. RESUME UNFINISHED CONSTRUCTION & REPAIR DAMAGED BUILDINGS
      // -------------------------------------------------------------
      const damagedOrUnfinished = myBuildings.filter(b => !b.isConstructed || b.hp < b.maxHp * 0.9);
      for (const bldg of damagedOrUnfinished) {
        const assignedRepairs = workers.filter(w => w.targetEntityId === bldg.id && (w.state === 'building' || w.state === 'repairing')).length;
        const maxWorkers = bldg.isConstructed ? 2 : 4;
        if (assignedRepairs < maxWorkers) {
          const builder = getBuilderWorker();
          if (builder) {
            this.processCommand(player.id, {
              type: 'REPAIR',
              buildingId: bldg.id,
              unitIds: [builder.id]
            });
          }
        }
      }

      // -------------------------------------------------------------
      // 5. HOUSING CONSTRUCTION (PREVENT POPULATION CAP BLOCK)
      // -------------------------------------------------------------
      const popHeadroom = player.maxPopulation - player.population;
      const hasPendingHouse = myBuildings.some(b => b.type === 'house' && !b.isConstructed);
      const maxHousingPop = player.aiDifficulty === 'hard' ? 200 : 150;
      const headroomThreshold = player.aiDifficulty === 'hard' ? 7 : 5;
      if (player.maxPopulation < maxHousingPop && popHeadroom <= headroomThreshold && !hasPendingHouse && player.resources.wood >= 60) {
        const builder = getBuilderWorker();
        if (builder) {
          const spot = this.findBuildingPlacementSpot('house', basePos.x, basePos.y);
          if (spot) {
            this.processCommand(player.id, {
              type: 'BUILD',
              unitIds: [builder.id],
              buildingType: 'house',
              position: spot
            });
          }
        }
      }

      // -------------------------------------------------------------
      // 6. NATION EXPANSION (SECONDARY TOWN CENTRES / COLONIES)
      // -------------------------------------------------------------
      const maxTCs = player.age === 'Founding Age' ? 1 : player.age === 'Kingdom Age' ? 2 : (player.aiDifficulty === 'hard' ? 4 : 3);
      if (totalTCs < maxTCs && operationalTCs.length > 0 && workers.length >= 8 && player.resources.wood >= 250 && player.resources.stone >= 100 && !myBuildings.some(b => b.type === 'town_centre' && !b.isConstructed)) {
        const builder = getBuilderWorker();
        if (builder) {
          const spot = this.findExpansionPlacementSpot(basePos.x, basePos.y);
          if (spot) {
            this.processCommand(player.id, {
              type: 'BUILD',
              unitIds: [builder.id],
              buildingType: 'town_centre',
              position: spot
            });
          }
        }
      }

      // -------------------------------------------------------------
      // 7. EXPAND MILITARY & ECONOMIC PRODUCTION INFRASTRUCTURE
      // -------------------------------------------------------------
      const barracksCount = myBuildings.filter(b => b.type === 'barracks').length;
      const archeryCount = myBuildings.filter(b => b.type === 'archery_range').length;
      const stableCount = myBuildings.filter(b => b.type === 'stable').length;
      const workshopCount = myBuildings.filter(b => b.type === 'workshop').length;
      const fortCount = myBuildings.filter(b => b.type === 'fort').length;
      const hasResearch = myBuildings.some(b => b.type === 'research_hall');
      const farmCount = myBuildings.filter(b => b.type === 'farm').length;
      const towerCount = myBuildings.filter(b => b.type === 'watchtower').length;
      const lumberCampCount = myBuildings.filter(b => b.type === 'lumber_camp').length;
      const miningCampCount = myBuildings.filter(b => b.type === 'mining_camp').length;

      // Scaled maximums based on Age & Difficulty
      const maxBarracks = player.age === 'Founding Age' ? (player.aiDifficulty === 'hard' ? 2 : 1) : player.age === 'Kingdom Age' ? (player.aiDifficulty === 'hard' ? 3 : 2) : (player.aiDifficulty === 'hard' ? 4 : 3);
      const maxArchery = player.age === 'Founding Age' ? 0 : player.age === 'Kingdom Age' ? (player.aiDifficulty === 'hard' ? 2 : 1) : (player.aiDifficulty === 'hard' ? 3 : 2);
      const maxStables = player.age === 'Founding Age' ? 0 : player.age === 'Kingdom Age' ? (player.aiDifficulty === 'hard' ? 2 : 1) : (player.aiDifficulty === 'hard' ? 3 : 2);
      const maxWorkshops = (player.age === 'Imperial Age' || player.age === 'Industrial Age') ? (player.aiDifficulty === 'hard' ? 2 : 1) : 0;
      const maxForts = (player.age === 'Imperial Age' || player.age === 'Industrial Age') ? (player.aiDifficulty === 'hard' ? 2 : 1) : 0;
      const maxFarms = player.age === 'Founding Age' ? 4 : player.age === 'Kingdom Age' ? 6 : (player.aiDifficulty === 'hard' ? 10 : 8);
      const maxTowers = player.aiDifficulty === 'hard' ? 6 : player.aiDifficulty === 'medium' ? 4 : 2;

      if (barracksCount < maxBarracks && player.resources.wood >= 120 && player.resources.stone >= 30) {
        const builder = getBuilderWorker();
        if (builder) {
          const spot = this.findBuildingPlacementSpot('barracks', basePos.x, basePos.y);
          if (spot) {
            this.processCommand(player.id, {
              type: 'BUILD',
              unitIds: [builder.id],
              buildingType: 'barracks',
              position: spot
            });
          }
        }
      } else if (!hasResearch && player.resources.wood >= 120 && player.resources.stone >= 60) {
        const builder = getBuilderWorker();
        if (builder) {
          const spot = this.findBuildingPlacementSpot('research_hall', basePos.x, basePos.y);
          if (spot) {
            this.processCommand(player.id, {
              type: 'BUILD',
              unitIds: [builder.id],
              buildingType: 'research_hall',
              position: spot
            });
          }
        }
      } else if (archeryCount < maxArchery && player.resources.wood >= 140 && player.resources.stone >= 40 && player.resources.metal >= 20) {
        const builder = getBuilderWorker();
        if (builder) {
          const spot = this.findBuildingPlacementSpot('archery_range', basePos.x, basePos.y);
          if (spot) {
            this.processCommand(player.id, {
              type: 'BUILD',
              unitIds: [builder.id],
              buildingType: 'archery_range',
              position: spot
            });
          }
        }
      } else if (stableCount < maxStables && player.resources.wood >= 150 && player.resources.stone >= 50 && player.resources.metal >= 40) {
        const builder = getBuilderWorker();
        if (builder) {
          const spot = this.findBuildingPlacementSpot('stable', basePos.x, basePos.y);
          if (spot) {
            this.processCommand(player.id, {
              type: 'BUILD',
              unitIds: [builder.id],
              buildingType: 'stable',
              position: spot
            });
          }
        }
      } else if (workshopCount < maxWorkshops && player.resources.wood >= 200 && player.resources.stone >= 100 && player.resources.metal >= 80) {
        const builder = getBuilderWorker();
        if (builder) {
          const spot = this.findBuildingPlacementSpot('workshop', basePos.x, basePos.y);
          if (spot) {
            this.processCommand(player.id, {
              type: 'BUILD',
              unitIds: [builder.id],
              buildingType: 'workshop',
              position: spot
            });
          }
        }
      } else if (fortCount < maxForts && player.resources.stone >= 250 && player.resources.metal >= 150) {
        const builder = getBuilderWorker();
        if (builder) {
          const spot = this.findBuildingPlacementSpot('fort', basePos.x, basePos.y);
          if (spot) {
            this.processCommand(player.id, {
              type: 'BUILD',
              unitIds: [builder.id],
              buildingType: 'fort',
              position: spot
            });
          }
        }
      } else if (farmCount < maxFarms && player.resources.wood >= 75) {
        const builder = getBuilderWorker();
        if (builder) {
          const spot = this.findBuildingPlacementSpot('farm', basePos.x, basePos.y);
          if (spot) {
            this.processCommand(player.id, {
              type: 'BUILD',
              unitIds: [builder.id],
              buildingType: 'farm',
              position: spot
            });
          }
        }
      } else if (towerCount < maxTowers && player.resources.stone >= 100 && player.resources.wood >= 60) {
        const builder = getBuilderWorker();
        if (builder) {
          const spot = this.findBuildingPlacementSpot('watchtower', basePos.x, basePos.y);
          if (spot) {
            this.processCommand(player.id, {
              type: 'BUILD',
              unitIds: [builder.id],
              buildingType: 'watchtower',
              position: spot
            });
          }
        }
      } else if (lumberCampCount < 2 && player.resources.wood >= 80) {
        const builder = getBuilderWorker();
        if (builder) {
          const spot = this.findBuildingPlacementSpot('lumber_camp', basePos.x, basePos.y);
          if (spot) {
            this.processCommand(player.id, {
              type: 'BUILD',
              unitIds: [builder.id],
              buildingType: 'lumber_camp',
              position: spot
            });
          }
        }
      } else if (miningCampCount < 2 && player.resources.wood >= 100) {
        const builder = getBuilderWorker();
        if (builder) {
          const spot = this.findBuildingPlacementSpot('mining_camp', basePos.x, basePos.y);
          if (spot) {
            this.processCommand(player.id, {
              type: 'BUILD',
              unitIds: [builder.id],
              buildingType: 'mining_camp',
              position: spot
            });
          }
        }
      }

      // -------------------------------------------------------------
      // 8. INTELLIGENT WORKER GATHERING (NEVER IDLE, SUSTAINED FOOD)
      // -------------------------------------------------------------
      const idleWorkers = workers.filter(w => w.state === 'idle');
      for (const worker of idleWorkers) {
        const assigned = this.assignWorkerToBestJob(worker);
        if (!assigned) {
          // Fallback: nearest resource node anywhere
          const node = this.findNearestResourceNode(worker.x, worker.y);
          if (node) {
            this.processCommand(player.id, {
              type: 'GATHER',
              unitIds: [worker.id],
              resourceNodeId: node.id
            });
          }
        }
      }

      // 5. Age Advancement
      const req = AGE_ADVANCEMENT_REQUIREMENTS[player.age];
      if (req && req.nextAge && tc && tc.isConstructed && tc.productionQueue.length === 0) {
        if (
          player.resources.food >= req.cost.food &&
          player.resources.wood >= req.cost.wood &&
          player.resources.stone >= req.cost.stone &&
          player.resources.metal >= req.cost.metal &&
          player.resources.knowledge >= req.cost.knowledge
        ) {
          this.processCommand(player.id, {
            type: 'ADVANCE_AGE',
            buildingId: tc.id
          });
        }
      }

      // 6. Technology Research
      const researchBldg = myBuildings.find(b => b.type === 'research_hall' && b.isConstructed && b.productionQueue.length === 0);
      if (researchBldg) {
        const ages = ['Founding Age', 'Kingdom Age', 'Imperial Age', 'Industrial Age'];
        const playerAgeIdx = ages.indexOf(player.age);
        for (const [tid, tdef] of Object.entries(TECHNOLOGIES)) {
          if (player.researchedTechs.includes(tid)) continue;
          const reqAgeIdx = ages.indexOf(tdef.requiredAge);
          if (reqAgeIdx > playerAgeIdx) continue;
          if (tdef.prerequisites && !tdef.prerequisites.every(p => player.researchedTechs.includes(p))) continue;
          if (
            player.resources.food >= tdef.cost.food &&
            player.resources.wood >= tdef.cost.wood &&
            player.resources.stone >= tdef.cost.stone &&
            player.resources.metal >= tdef.cost.metal &&
            player.resources.knowledge >= tdef.cost.knowledge
          ) {
            this.processCommand(player.id, {
              type: 'RESEARCH_TECH',
              buildingId: researchBldg.id,
              techId: tid
            });
            break;
          }
        }
      }

      // 7. Parallel Military Recruitment (Continuous Army Reproduction & Emergency Mobilization)
      if (military.length === 0 && state.currentTactic !== 'amassing') {
        state.currentTactic = 'amassing';
        state.assignedTargetId = undefined;
      }

      const barracksList = myBuildings.filter(b => b.type === 'barracks' && b.isConstructed && b.productionQueue.length < 2);
      for (const b of barracksList) {
        if (player.population < player.maxPopulation && player.resources.food >= 60 && player.resources.wood >= 25) {
          const unitTypeToTrain = Math.random() < 0.5 ? 'basic_infantry' : 'spearman';
          this.processCommand(player.id, {
            type: 'TRAIN_UNIT',
            buildingId: b.id,
            unitType: unitTypeToTrain
          });
        }
      }

      const archeryList = myBuildings.filter(b => b.type === 'archery_range' && b.isConstructed && b.productionQueue.length < 2);
      for (const b of archeryList) {
        if (player.population < player.maxPopulation && player.resources.food >= 40 && player.resources.wood >= 60) {
          this.processCommand(player.id, {
            type: 'TRAIN_UNIT',
            buildingId: b.id,
            unitType: 'ranged_infantry'
          });
        }
      }

      const stableList = myBuildings.filter(b => b.type === 'stable' && b.isConstructed && b.productionQueue.length < 2);
      for (const b of stableList) {
        if (player.population + 2 <= player.maxPopulation && player.resources.food >= 80 && player.resources.metal >= 60) {
          this.processCommand(player.id, {
            type: 'TRAIN_UNIT',
            buildingId: b.id,
            unitType: 'cavalry'
          });
        }
      }

      const workshopList = myBuildings.filter(b => b.type === 'workshop' && b.isConstructed && b.productionQueue.length < 2);
      for (const b of workshopList) {
        if (player.population + 3 <= player.maxPopulation && player.resources.wood >= 140 && player.resources.metal >= 90) {
          this.processCommand(player.id, {
            type: 'TRAIN_UNIT',
            buildingId: b.id,
            unitType: 'siege_unit'
          });
        }
      }

      const fortList = myBuildings.filter(b => b.type === 'fort' && b.isConstructed && b.productionQueue.length < 2);
      for (const b of fortList) {
        if (player.population + 4 <= player.maxPopulation) {
          const canDragon = player.resources.food >= 150 && player.resources.metal >= 120 && player.resources.knowledge >= 60;
          if (canDragon) {
            this.processCommand(player.id, {
              type: 'TRAIN_UNIT',
              buildingId: b.id,
              unitType: 'dragon'
            });
          } else if (player.resources.food >= 120 && player.resources.metal >= 120) {
            this.processCommand(player.id, {
              type: 'TRAIN_UNIT',
              buildingId: b.id,
              unitType: 'advanced_unit'
            });
          }
        }
      }

      // Train War Dragon from Town Centre in Imperial/Industrial Age if fort is busy or not built
      if ((player.age === 'Imperial Age' || player.age === 'Industrial Age') && tc && tc.isConstructed && tc.productionQueue.length < 2) {
        if (player.population + 4 <= player.maxPopulation && player.resources.food >= 150 && player.resources.metal >= 120 && player.resources.knowledge >= 60) {
          this.processCommand(player.id, {
            type: 'TRAIN_UNIT',
            buildingId: tc.id,
            unitType: 'dragon'
          });
        }
      }

      // 8. Tactical Scout Exploration
      for (const s of scouts) {
        if (s.state === 'idle') {
          const rx = Math.floor(Math.random() * (this.mapData.width - 10) + 5);
          const ry = Math.floor(Math.random() * (this.mapData.height - 10) + 5);
          this.processCommand(player.id, {
            type: 'MOVE',
            unitIds: [s.id],
            target: { x: rx, y: ry }
          });
        }
      }

      // 9. Cooperative & Tactical Military Commander System
      const teammates = Array.from(this.players.values()).filter(p => p.team === player.team && !p.isDefeated);
      const enemies = Array.from(this.players.values()).filter(p => p.team !== player.team && !p.isDefeated);

      // Clean up dead/invalid harass units
      state.harassUnitIds = state.harassUnitIds.filter(hid => {
        const u = this.units.get(hid);
        return u && u.ownerId === player.id && u.state !== 'dead';
      });

      // A. Threat Evaluation:
      // Threat to self base: enemy military units or units attacking our buildings/units within 22 tiles
      let selfThreatTarget: UnitData | null = null;
      let minSelfThreatDist = Infinity;
      const nearbyBaseUnits = this.spatialGrid.queryInRadius(basePos.x, basePos.y, 32);
      for (let i = 0; i < nearbyBaseUnits.length; i++) {
        const eu = nearbyBaseUnits[i];
        if (eu.team !== player.team && eu.state !== 'dead') {
          const isThreatType = (eu.type !== 'worker' && eu.type !== 'scout') || eu.state === 'attacking';
          if (!isThreatType) continue;

          for (const b of myBuildings) {
            const d = Math.hypot(eu.x - b.x, eu.y - b.y);
            if (d < 22 && d < minSelfThreatDist) {
              minSelfThreatDist = d;
              selfThreatTarget = eu;
            }
          }
        }
      }

      // Threat to allied teammate's base (Ally Relief!)
      let allyThreatTarget: UnitData | null = null;
      let minAllyThreatDist = Infinity;
      for (const tm of teammates) {
        if (tm.id === player.id) continue;
        const tmBldgs = Array.from(this.buildings.values()).filter(b => b.ownerId === tm.id && b.hp > 0);
        for (const tb of tmBldgs) {
          const nearbyEnemies = this.spatialGrid.queryInRadius(tb.x, tb.y, 22);
          for (let i = 0; i < nearbyEnemies.length; i++) {
            const eu = nearbyEnemies[i];
            if (eu.team !== player.team && eu.state !== 'dead') {
              const isThreatType = (eu.type !== 'worker' && eu.type !== 'scout') || eu.state === 'attacking';
              if (!isThreatType) continue;

              const d = Math.hypot(eu.x - tb.x, eu.y - tb.y);
              if (d < 22 && d < minAllyThreatDist) {
                minAllyThreatDist = d;
                allyThreatTarget = eu;
              }
            }
          }
        }
      }

      // B. State Transitions:
      if (selfThreatTarget) {
        state.currentTactic = 'defend';
        state.assignedTargetId = selfThreatTarget.id;
        state.harassUnitIds = []; // Recall all harassers for total defense
      } else if (allyThreatTarget && military.length > 0) {
        // Ally is in distress! Dispatch relief expedition!
        state.currentTactic = 'defend';
        state.assignedTargetId = allyThreatTarget.id;
        state.lastAllyHelpTick = this.currentTick;
      } else if (state.currentTactic === 'defend') {
        // Threats eliminated! If we have sufficient forces, launch an immediate counter-offensive!
        if (military.length >= (player.aiDifficulty === 'hard' ? 4 : 5)) {
          state.currentTactic = 'counter';
          state.assignedTargetId = undefined;
        } else {
          state.currentTactic = 'amassing';
          state.assignedTargetId = undefined;
        }
      }

      // C. Cavalry Harass Raids (Medium & Hard AI)
      if (state.currentTactic === 'amassing' && player.aiDifficulty !== 'easy' && state.harassUnitIds.length === 0) {
        const harassCooldown = player.aiDifficulty === 'hard' ? 600 : 1000;
        if (this.currentTick - state.lastHarassTick >= harassCooldown) {
          const cavUnits = military.filter(u => u.type === 'cavalry' && !state.harassUnitIds.includes(u.id));
          if (cavUnits.length >= 1) {
            const enemyWorkers = Array.from(this.units.values()).filter(
              u => u.team !== player.team && u.type === 'worker' && u.state !== 'dead'
            );
            if (enemyWorkers.length > 0) {
              let closestW = enemyWorkers[0];
              let minWDist = Infinity;
              for (const ew of enemyWorkers) {
                const dist = Math.hypot(ew.x - basePos.x, ew.y - basePos.y);
                if (dist < minWDist) {
                  minWDist = dist;
                  closestW = ew;
                }
              }
              const raidUnits = cavUnits.slice(0, player.aiDifficulty === 'hard' ? 2 : 1);
              state.harassUnitIds = raidUnits.map(r => r.id);
              state.lastHarassTick = this.currentTick;
              this.processCommand(player.id, {
                type: 'ATTACK',
                unitIds: state.harassUnitIds,
                targetEntityId: closestW.id
              });
            }
          }
        }
      }

      // Check active harassers: if facing 2+ enemy combat units within 8 tiles, fall back to rally
      if (state.harassUnitIds.length > 0) {
        let shouldDisengage = false;
        for (const hid of state.harassUnitIds) {
          const hu = this.units.get(hid);
          if (hu) {
            const nearbyCombatEnemies = this.spatialGrid.queryInRadius(hu.x, hu.y, 8).filter(
              eu => eu.team !== player.team && eu.type !== 'worker' && eu.state !== 'dead'
            );
            if (nearbyCombatEnemies.length >= 2) {
              shouldDisengage = true;
              break;
            }
          }
        }
        if (shouldDisengage) {
          this.processCommand(player.id, {
            type: 'MOVE',
            unitIds: [...state.harassUnitIds],
            target: { x: state.rallyPoint.x, y: state.rallyPoint.y }
          });
          state.harassUnitIds = [];
        }
      }

      // D. Amassing & Wave Launch Transition
      const mainMilitary = military.filter(m => !state.harassUnitIds.includes(m.id));
      const waveThreshold = player.aiDifficulty === 'hard' ? 10 : player.aiDifficulty === 'medium' ? 7 : 5;
      const minTimerThreshold = player.aiDifficulty === 'hard' ? 4 : player.aiDifficulty === 'medium' ? 3 : 2;

      if (state.currentTactic === 'amassing') {
        // Move idle units to rally point if far from staging area
        for (const m of mainMilitary) {
          if (m.state === 'idle') {
            const d = Math.hypot(m.x - state.rallyPoint.x, m.y - state.rallyPoint.y);
            if (d > 5) {
              this.processCommand(player.id, {
                type: 'MOVE',
                unitIds: [m.id],
                target: { x: state.rallyPoint.x, y: state.rallyPoint.y }
              });
            }
          }
        }

        // Trigger assault wave
        const timeTriggered = this.currentTick >= state.nextWaveTick && mainMilitary.length >= minTimerThreshold;
        const sizeTriggered = mainMilitary.length >= waveThreshold;

        if (sizeTriggered || timeTriggered) {
          state.currentTactic = 'assault';
          state.waveNumber++;
          const waveCooldown = player.aiDifficulty === 'hard' ? 1200 : player.aiDifficulty === 'medium' ? 1800 : 2400;
          state.nextWaveTick = this.currentTick + waveCooldown;
          state.assignedTargetId = undefined;
        }
      }

      // E. Assault & Counter-Offensive Execution
      if (state.currentTactic === 'assault' || state.currentTactic === 'counter') {
        if (mainMilitary.length < 2) {
          state.currentTactic = 'retreat';
          state.assignedTargetId = undefined;
        } else {
          let target: UnitData | BuildingData | null = null;
          if (state.assignedTargetId) {
            target = this.units.get(state.assignedTargetId) || this.buildings.get(state.assignedTargetId) || null;
            if (target && (('state' in target && target.state === 'dead') || ('hp' in target && target.hp <= 0))) {
              target = null;
              state.assignedTargetId = undefined;
            }
          }

          if (!target) {
            // Priority 1: Allied Teammate Target (Cooperative offensive!)
            for (const tm of teammates) {
              const attackingAllies = Array.from(this.units.values()).filter(u => u.ownerId === tm.id && u.state === 'attacking' && u.targetEntityId);
              for (const au of attackingAllies) {
                if (au.targetEntityId) {
                  const allyTargetU = this.units.get(au.targetEntityId);
                  const allyTargetB = this.buildings.get(au.targetEntityId);
                  if ((allyTargetU && allyTargetU.state !== 'dead') || (allyTargetB && allyTargetB.hp > 0)) {
                    target = allyTargetU || allyTargetB || null;
                    state.assignedTargetId = au.targetEntityId;
                    break;
                  }
                }
              }
              if (target) break;
            }

            // Priority 2: Enemy Defensive Towers or Forts
            if (!target) {
              let minDefDist = Infinity;
              for (const eb of this.buildings.values()) {
                if (eb.team !== player.team && eb.hp > 0 && (eb.type === 'watchtower' || eb.type === 'fort')) {
                  const d = Math.hypot(eb.x - basePos.x, eb.y - basePos.y);
                  if (d < minDefDist) {
                    minDefDist = d;
                    target = eb;
                    state.assignedTargetId = eb.id;
                  }
                }
              }
            }

            // Priority 3: Enemy Town Centre
            if (!target) {
              let minTcDist = Infinity;
              for (const eb of this.buildings.values()) {
                if (eb.team !== player.team && eb.hp > 0 && eb.type === 'town_centre') {
                  const d = Math.hypot(eb.x - basePos.x, eb.y - basePos.y);
                  if (d < minTcDist) {
                    minTcDist = d;
                    target = eb;
                    state.assignedTargetId = eb.id;
                  }
                }
              }
            }

            // Priority 4: Enemy Military Buildings
            if (!target) {
              let minMilDist = Infinity;
              for (const eb of this.buildings.values()) {
                if (eb.team !== player.team && eb.hp > 0 && ['barracks', 'archery_range', 'stable', 'workshop'].includes(eb.type)) {
                  const d = Math.hypot(eb.x - basePos.x, eb.y - basePos.y);
                  if (d < minMilDist) {
                    minMilDist = d;
                    target = eb;
                    state.assignedTargetId = eb.id;
                  }
                }
              }
            }

            // Priority 5: Any other enemy building
            if (!target) {
              let minBldgDist = Infinity;
              for (const eb of this.buildings.values()) {
                if (eb.team !== player.team && eb.hp > 0) {
                  const d = Math.hypot(eb.x - basePos.x, eb.y - basePos.y);
                  if (d < minBldgDist) {
                    minBldgDist = d;
                    target = eb;
                    state.assignedTargetId = eb.id;
                  }
                }
              }
            }

            // Priority 6: Any enemy unit
            if (!target) {
              let minUnitDist = Infinity;
              for (const eu of this.units.values()) {
                if (eu.team !== player.team && eu.state !== 'dead') {
                  const d = Math.hypot(eu.x - basePos.x, eu.y - basePos.y);
                  if (d < minUnitDist) {
                    minUnitDist = d;
                    target = eu;
                    state.assignedTargetId = eu.id;
                  }
                }
              }
            }
          }

          if (target) {
            const idleOrRetarget = mainMilitary.filter(m => {
              if (m.state === 'idle') return true;
              if (m.state === 'moving' && (!m.targetEntityId || m.targetEntityId !== target?.id)) return true;
              if (m.state === 'attacking' && m.targetEntityId !== target?.id) {
                const curU = this.units.get(m.targetEntityId!);
                const curB = this.buildings.get(m.targetEntityId!);
                if ((!curU || curU.state === 'dead') && (!curB || curB.hp <= 0)) return true;
              }
              return false;
            });

            if (idleOrRetarget.length > 0) {
              this.processCommand(player.id, {
                type: 'ATTACK',
                unitIds: idleOrRetarget.map(m => m.id),
                targetEntityId: target.id
              });
            }
          } else {
            state.currentTactic = 'amassing';
            state.assignedTargetId = undefined;
          }
        }
      }

      // F. Defense Execution
      if (state.currentTactic === 'defend' && state.assignedTargetId) {
        const defTarget = this.units.get(state.assignedTargetId);
        if (defTarget && defTarget.state !== 'dead') {
          const unitsToDefend = mainMilitary.filter(m => m.state !== 'attacking' || m.targetEntityId !== defTarget.id);
          if (unitsToDefend.length > 0) {
            this.processCommand(player.id, {
              type: 'ATTACK',
              unitIds: unitsToDefend.map(m => m.id),
              targetEntityId: defTarget.id
            });
          }
        } else {
          state.assignedTargetId = undefined;
        }
      }

      // G. Retreat Execution
      if (state.currentTactic === 'retreat') {
        const retreatingUnits = mainMilitary.filter(m => m.state !== 'moving' || Math.hypot(m.x - state.rallyPoint.x, m.y - state.rallyPoint.y) > 6);
        if (retreatingUnits.length > 0) {
          this.processCommand(player.id, {
            type: 'MOVE',
            unitIds: retreatingUnits.map(m => m.id),
            target: { x: state.rallyPoint.x, y: state.rallyPoint.y }
          });
        }
        const nearRally = mainMilitary.filter(m => Math.hypot(m.x - state.rallyPoint.x, m.y - state.rallyPoint.y) <= 6);
        if (nearRally.length >= 3 || mainMilitary.length === 0) {
          state.currentTactic = 'amassing';
        }
      }
    }
  }

  public findExpansionPlacementSpot(nearX: number, nearY: number): Vector2D | null {
    const def = BUILDING_DEFINITIONS['town_centre'];
    for (let r = 18; r <= 38; r += 3) {
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 10) {
        const px = Math.floor(nearX + Math.cos(angle) * r);
        const py = Math.floor(nearY + Math.sin(angle) * r);

        // Require 2-tile gap clearance for spacious municipal settlement
        if (!this.isValidBuildingPlacement('town_centre', px, py, 2)) {
          continue;
        }

        // Open terrain rule: AI expansion Town Centres must be in wide open plains, away from mountains
        let isOpenPlains = true;
        for (let dx = -3; dx < def.width + 3; dx++) {
          for (let dy = -3; dy < def.height + 3; dy++) {
            const tx = px + dx;
            const ty = py + dy;
            if (tx < 0 || tx >= this.mapData.width || ty < 0 || ty >= this.mapData.height) {
              isOpenPlains = false;
              break;
            }
            const tile = this.mapData.tiles[ty * this.mapData.width + tx];
            if (!tile || tile.terrain === 'mountain' || tile.terrain === 'water' || tile.elevation > 1) {
              isOpenPlains = false;
              break;
            }
          }
          if (!isOpenPlains) break;
        }

        if (isOpenPlains) return { x: px, y: py };
      }
    }
    return this.findBuildingPlacementSpot('town_centre', nearX, nearY);
  }

  private findBuildingPlacementSpot(type: BuildingType, nearX: number, nearY: number): Vector2D | null {
    const def = BUILDING_DEFINITIONS[type];
    if (!def) return null;

    // Search outward in rings
    for (let r = 5; r <= 42; r += 2) {
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 10) {
        const px = Math.floor(nearX + Math.cos(angle) * r);
        const py = Math.floor(nearY + Math.sin(angle) * r);

        // 1. Check building placement clearance gap
        if (!this.isValidBuildingPlacement(type, px, py, 1)) {
          continue;
        }

        // 2. Open terrain rule: AI buildings must spawn in the open, NOT inside or touching mountain areas or steep slopes
        let isOpenTerrain = true;
        for (let dx = -2; dx < def.width + 2; dx++) {
          for (let dy = -2; dy < def.height + 2; dy++) {
            const tx = px + dx;
            const ty = py + dy;
            if (tx < 0 || tx >= this.mapData.width || ty < 0 || ty >= this.mapData.height) {
              isOpenTerrain = false;
              break;
            }
            const tile = this.mapData.tiles[ty * this.mapData.width + tx];
            if (!tile || tile.terrain === 'mountain' || tile.terrain === 'water' || tile.elevation > 1) {
              isOpenTerrain = false;
              break;
            }
          }
          if (!isOpenTerrain) break;
        }

        if (isOpenTerrain) {
          return { x: px, y: py };
        }
      }
    }

    // Fallback: If 2-tile open perimeter couldn't be satisfied on dense maps, use standard valid placement
    for (let r = 5; r <= 44; r += 2) {
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
        const px = Math.floor(nearX + Math.cos(angle) * r);
        const py = Math.floor(nearY + Math.sin(angle) * r);
        if (this.isValidBuildingPlacement(type, px, py, 1)) {
          return { x: px, y: py };
        }
      }
    }

    return null;
  }

  public findAdjacentWalkableToBuilding(bx: number, by: number, width: number, height: number, fromX?: number, fromY?: number): Vector2D | null {
    let bestSpot: Vector2D | null = null;
    let minFromDist = Infinity;

    for (let r = 1; r <= 8; r++) {
      for (let x = bx - r; x <= bx + width + r - 1; x++) {
        for (let y = by - r; y <= by + height + r - 1; y++) {
          if (x < bx || x >= bx + width || y < by || y >= by + height) {
            if (this.pathfinder.isWalkable(x, y)) {
              const spot = { x: x + 0.5, y: y + 0.5 };
              if (fromX !== undefined && fromY !== undefined) {
                const d = Math.hypot(spot.x - fromX, spot.y - fromY);
                if (d < minFromDist) {
                  minFromDist = d;
                  bestSpot = spot;
                }
              } else {
                return spot;
              }
            }
          }
        }
      }
      if (bestSpot) return bestSpot;
    }
    return bestSpot;
  }

  public checkVictoryConditions(): void {
    if (this.isGameOver) return;
    if (this.currentTick < 20) return;

    const activeTeams = new Set<number>();
    for (const player of this.players.values()) {
      if (player.isDefeated) continue;

      const myBuildings = Array.from(this.buildings.values()).filter(b => b.ownerId === player.id);
      const myUnits = Array.from(this.units.values()).filter(u => u.ownerId === player.id && u.state !== 'dead');

      const hasTC = myBuildings.some(b => b.type === 'town_centre' && b.isConstructed);
      const hasWorkers = myUnits.some(u => u.type === 'worker');
      const hasMilitaryBldg = myBuildings.some(b =>
        b.isConstructed && ['barracks', 'archery_range', 'stable', 'workshop', 'fort'].includes(b.type)
      );
      const combatUnits = myUnits.filter(u => u.type !== 'worker' && u.type !== 'scout');

      // Elimination condition:
      // 1. Total wipeout: no buildings and no units
      // 2. All buildings destroyed AND (no workers OR combat units <= 1)
      // 3. No Town Centre AND no workers AND combat units <= 1 (cannot rebuild, expand, or fight)
      // 4. No Town Centre AND no operational military buildings AND combat units <= 1 (military & civic base eradicated)
      // 5. No Town Centre AND no buildings left at all
      const isEliminated =
        (myBuildings.length === 0 && (myUnits.length === 0 || !hasWorkers || combatUnits.length <= 1)) ||
        (!hasTC && !hasMilitaryBldg && combatUnits.length <= 1) ||
        (!hasTC && !hasWorkers && combatUnits.length <= 1) ||
        (!hasTC && myBuildings.length === 0) ||
        (!hasTC && myUnits.length === 0);

      if (isEliminated) {
        player.isDefeated = true;

        // Clean up remaining abandoned buildings
        for (const b of myBuildings) {
          for (let dx = 0; dx < b.width; dx++) {
            for (let dy = 0; dy < b.height; dy++) {
              this.pathfinder.setWalkable(b.x + dx, b.y + dy, true);
            }
          }
          this.buildings.delete(b.id);
          this.pendingEvents.push({ type: 'BUILDING_DESTROYED', buildingId: b.id });
        }

        // Clean up remaining stray units (such as distant scouts or isolated workers in fog of war)
        for (const u of myUnits) {
          u.state = 'dead';
          u.hp = 0;
          this.pendingEvents.push({ type: 'UNIT_DIED', unitId: u.id });
        }

        // Emit PLAYER_DEFEATED event
        this.pendingEvents.push({
          type: 'PLAYER_DEFEATED',
          playerId: player.id,
          playerName: player.name,
          team: player.team
        });
      } else {
        activeTeams.add(player.team);
      }
    }

    if (activeTeams.size <= 1) {
      this.isGameOver = true;
      this.winnerTeam = activeTeams.size === 1 ? Array.from(activeTeams)[0] : 1;
      this.victoryReason = 'Conquest: All adversary bases and forces eliminated!';

      for (const p of this.players.values()) {
        p.isVictorious = p.team === this.winnerTeam;
      }

      this.pendingEvents.push({
        type: 'GAME_OVER',
        winnerTeam: this.winnerTeam,
        reason: this.victoryReason
      });
    }
  }

  // Generates authoritative state snapshot for network broadcasting or client rendering
  public getSnapshot(): ServerSnapshot {
    const events = [...this.pendingEvents];
    this.pendingEvents = [];

    return {
      tick: this.currentTick,
      units: Array.from(this.units.values()).map(u => ({ ...u })),
      buildings: Array.from(this.buildings.values()).map(b => ({
        ...b,
        productionQueue: b.productionQueue.map(q => ({ ...q }))
      })),
      resourceNodes: Array.from(this.resourceNodes.values()).map(r => ({ ...r })),
      players: Array.from(this.players.values()).map(p => ({
        ...p,
        resources: { ...p.resources },
        stats: { ...p.stats, resourcesGathered: { ...p.stats.resourcesGathered } }
      })),
      events
    };
  }

  /**
   * Applies Single-Player cheat commands (Rise of Nations style)
   */
  public applyCheat(playerId: string, rawCheat: string): { success: boolean; message: string; effect?: string } {
    const player = this.players.get(playerId);
    if (!player) {
      return { success: false, message: 'Commander not found.' };
    }

    const trimmed = rawCheat.trim();
    if (!trimmed) {
      return { success: false, message: 'Empty command.' };
    }

    const lower = trimmed.toLowerCase();
    const parts = lower.split(/\s+/);

    if (parts[0] === 'help' || (parts[0] === 'cheat' && parts[1] === 'help')) {
      return {
        success: true,
        message: 'Cheats: cheat resource all [amt], cheat age [advance|1-4], cheat reveal, cheat victory, cheat pop, cheat tech all, cheat heal'
      };
    }

    if (parts[0] !== 'cheat') {
      return { success: false, message: `Unknown command "${trimmed}". Type "cheat help" for commands.` };
    }

    const sub = parts[1];

    // cheat resource ... or cheat resources ...
    if (sub === 'resource' || sub === 'resources') {
      const target = parts[2];
      const amtArg = parts[3] ? parseInt(parts[3], 10) : undefined;
      const defaultAmount = 10000;

      if (!target || target === 'all') {
        const amount = (parts[2] && !isNaN(parseInt(parts[2], 10))) ? parseInt(parts[2], 10) : (amtArg || defaultAmount);
        player.resources.food += amount;
        player.resources.wood += amount;
        player.resources.stone += amount;
        player.resources.metal += amount;
        player.resources.knowledge += amount;
        return { success: true, message: `Granted +${amount.toLocaleString()} to all resources!` };
      }

      const validTypes: ResourceType[] = ['food', 'wood', 'stone', 'metal', 'knowledge'];
      if (validTypes.includes(target as ResourceType)) {
        const amount = amtArg || defaultAmount;
        player.resources[target as ResourceType] += amount;
        return { success: true, message: `Granted +${amount.toLocaleString()} ${target}!` };
      }

      const parsedNum = parseInt(target, 10);
      if (!isNaN(parsedNum)) {
        player.resources.food += parsedNum;
        player.resources.wood += parsedNum;
        player.resources.stone += parsedNum;
        player.resources.metal += parsedNum;
        player.resources.knowledge += parsedNum;
        return { success: true, message: `Granted +${parsedNum.toLocaleString()} to all resources!` };
      }

      return { success: false, message: `Unknown resource type "${target}". Valid: food, wood, stone, metal, knowledge, all.` };
    }

    // cheat age [advance|1-4|founding|kingdom|imperial|industrial]
    if (sub === 'age') {
      const ageArg = parts[2];
      const ageSequence: AgeName[] = ['Founding Age', 'Kingdom Age', 'Imperial Age', 'Industrial Age'];
      const currentIndex = ageSequence.indexOf(player.age);

      let targetAge: AgeName | null = null;
      if (!ageArg || ageArg === 'advance' || ageArg === 'up' || ageArg === 'next') {
        if (currentIndex < ageSequence.length - 1) {
          targetAge = ageSequence[currentIndex + 1];
        } else {
          return { success: false, message: `Civilization is already in the pinnacle age (${player.age})!` };
        }
      } else if (ageArg === '1' || ageArg === 'founding') {
        targetAge = 'Founding Age';
      } else if (ageArg === '2' || ageArg === 'kingdom') {
        targetAge = 'Kingdom Age';
      } else if (ageArg === '3' || ageArg === 'imperial') {
        targetAge = 'Imperial Age';
      } else if (ageArg === '4' || ageArg === 'industrial') {
        targetAge = 'Industrial Age';
      } else {
        return { success: false, message: `Invalid age option "${ageArg}". Use: advance, 1-4, founding, kingdom, imperial, industrial.` };
      }

      player.age = targetAge;
      this.pendingEvents.push({ type: 'AGE_ADVANCED', playerId: player.id, newAge: targetAge });

      if (targetAge === 'Industrial Age') {
        for (const b of this.buildings.values()) {
          if (b.ownerId === player.id && b.isConstructed) {
            const queuedUnits = b.productionQueue.filter(q => q.category === 'unit');
            b.productionQueue = b.productionQueue.filter(q => q.category !== 'unit');
            for (const q of queuedUnits) {
              this.spawnTrainedUnit(b, q.itemType as UnitType);
            }
          }
        }
      }
      return { success: true, message: `Civilization advanced to ${targetAge}! (Troops now recruit instantly)`, effect: 'age_advanced' };
    }

    // cheat reveal / cheat map
    if (sub === 'reveal' || sub === 'map' || sub === 'vision' || sub === 'fog') {
      return { success: true, message: 'All territory shrouded in darkness is now fully revealed!', effect: 'reveal_map' };
    }

    // cheat victory / cheat win
    if (sub === 'victory' || sub === 'win') {
      this.isGameOver = true;
      this.winnerTeam = player.team;
      this.victoryReason = 'Victory achieved through commander decree!';
      for (const p of this.players.values()) {
        p.isVictorious = p.team === this.winnerTeam;
      }
      this.pendingEvents.push({
        type: 'GAME_OVER',
        winnerTeam: this.winnerTeam,
        reason: this.victoryReason
      });
      return { success: true, message: 'Victory declared for your nation!', effect: 'victory' };
    }

    // cheat pop / cheat population
    if (sub === 'pop' || sub === 'population') {
      const amt = parts[2] ? parseInt(parts[2], 10) : 200;
      player.maxPopulation = Math.max(player.maxPopulation, isNaN(amt) ? 200 : amt);
      return { success: true, message: `Population capacity expanded to ${player.maxPopulation}!` };
    }

    // cheat tech [all]
    if (sub === 'tech') {
      const techArg = parts[2];
      if (!techArg || techArg === 'all') {
        for (const tid of Object.keys(TECHNOLOGIES)) {
          if (!player.researchedTechs.includes(tid)) {
            player.researchedTechs.push(tid);
            this.pendingEvents.push({ type: 'TECH_RESEARCHED', playerId: player.id, techId: tid });
          }
        }
        for (const u of this.units.values()) {
          if (u.ownerId === player.id && u.type === 'cavalry') {
            u.maxHp = Math.round(u.maxHp * 1.25);
            u.hp = Math.round(u.hp * 1.25);
          }
        }
        for (const b of this.buildings.values()) {
          if (b.ownerId === player.id) {
            b.maxHp = Math.round(b.maxHp * 1.25);
            b.hp = Math.round(b.hp * 1.25);
          }
        }
        return { success: true, message: 'All civilization technologies unlocked!' };
      }
    }

    // cheat heal / cheat heal all
    if (sub === 'heal') {
      let count = 0;
      for (const u of this.units.values()) {
        if (u.ownerId === player.id && u.state !== 'dead') {
          u.hp = u.maxHp;
          count++;
        }
      }
      for (const b of this.buildings.values()) {
        if (b.ownerId === player.id) {
          b.hp = b.maxHp;
          b.isConstructed = true;
          b.constructionProgress = 100;
          count++;
        }
      }
      return { success: true, message: `Fully healed and restored ${count} military units & structures!` };
    }

    return { success: false, message: `Unrecognized cheat: "${trimmed}". Type "cheat help" for available codes.` };
  }
}
