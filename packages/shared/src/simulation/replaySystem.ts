import { GameSettings, CivName, MapType } from '../types/game.js';
import { CommandPayload } from '../types/network.js';
import { SimulationEngine } from './simulationEngine.js';

export interface RecordedPlayer {
  id: string;
  name: string;
  team: number;
  civ: CivName;
  color: string;
  isAi: boolean;
}

export interface RecordedCommand {
  tick: number;
  playerId: string;
  command: CommandPayload;
}

export interface MatchReplayData {
  version: string;
  gameId: string;
  timestamp: number;
  mapType: MapType;
  mapSize: number;
  seed: number;
  settings: GameSettings;
  initialPlayers: RecordedPlayer[];
  totalTicks: number;
  commands: RecordedCommand[];
  winnerTeam?: number | null;
  victoryReason?: string;
}

export class MatchReplayRecorder {
  private replayData: MatchReplayData;

  constructor(
    gameId: string,
    settings: GameSettings,
    initialPlayers: RecordedPlayer[]
  ) {
    this.replayData = {
      version: '1.0.0',
      gameId,
      timestamp: Date.now(),
      mapType: settings.mapType,
      mapSize: settings.mapSize,
      seed: settings.seed,
      settings: { ...settings },
      initialPlayers: initialPlayers.map(p => ({ ...p })),
      totalTicks: 0,
      commands: []
    };
  }

  public recordCommand(tick: number, playerId: string, command: CommandPayload): void {
    // Clone command to prevent external mutation
    this.replayData.commands.push({
      tick,
      playerId,
      command: JSON.parse(JSON.stringify(command))
    });
  }

  public finalize(totalTicks: number, winnerTeam?: number | null, victoryReason?: string): MatchReplayData {
    this.replayData.totalTicks = totalTicks;
    this.replayData.winnerTeam = winnerTeam;
    this.replayData.victoryReason = victoryReason;
    return this.replayData;
  }

  public exportToJson(): string {
    return JSON.stringify(this.replayData, null, 2);
  }

  public getReplayData(): MatchReplayData {
    return this.replayData;
  }
}

export class MatchReplayPlayer {
  public sim: SimulationEngine;
  public replayData: MatchReplayData;
  public currentTick: number = 0;
  private commandIndex: number = 0;
  public isFinished: boolean = false;

  constructor(replayData: MatchReplayData) {
    this.replayData = replayData;
    this.sim = new SimulationEngine(
      replayData.settings,
      replayData.initialPlayers.map(p => ({
        id: p.id,
        name: p.name,
        team: p.team,
        civ: p.civ,
        color: p.color,
        isAi: p.isAi
      }))
    );
  }

  public reset(): void {
    this.currentTick = 0;
    this.commandIndex = 0;
    this.isFinished = false;
    this.sim = new SimulationEngine(
      this.replayData.settings,
      this.replayData.initialPlayers.map(p => ({
        id: p.id,
        name: p.name,
        team: p.team,
        civ: p.civ,
        color: p.color,
        isAi: p.isAi
      }))
    );
  }

  public step(dt: number = 0.05): boolean {
    if (this.currentTick >= this.replayData.totalTicks && this.replayData.totalTicks > 0) {
      this.isFinished = true;
      return false;
    }

    // Process all recorded commands scheduled for this exact tick
    while (
      this.commandIndex < this.replayData.commands.length &&
      this.replayData.commands[this.commandIndex].tick <= this.currentTick
    ) {
      const rec = this.replayData.commands[this.commandIndex];
      this.sim.processCommand(rec.playerId, rec.command);
      this.commandIndex++;
    }

    this.sim.tick(dt);
    this.currentTick++;
    return true;
  }

  public seek(targetTick: number): void {
    if (targetTick < this.currentTick) {
      this.reset();
    }
    const maxTick = Math.min(targetTick, this.replayData.totalTicks);
    while (this.currentTick < maxTick && !this.isFinished) {
      this.step(0.05);
    }
  }
}
