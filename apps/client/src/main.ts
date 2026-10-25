import {
  UnitData,
  BuildingData,
  ResourceNodeData,
  PlayerState,
  BuildingType,
  UnitType,
  Vector2D,
  GameSettings,
  CivName,
  BUILDING_DEFINITIONS,
  FormationType,
  UnitStance,
  MatchReplayRecorder,
  MatchReplayPlayer,
  MatchReplayData
} from '@agefront/shared';
import { GameRenderer } from './rendering/renderer.js';
import { SelectionManager } from './controls/selectionManager.js';
import { InputHandler } from './controls/inputHandler.js';
import { Minimap } from './rendering/minimap.js';
import { HudView } from './ui/hud.js';
import { MainMenuView } from './ui/mainMenuView.js';
import { LobbyView } from './ui/lobbyView.js';
import { VictoryView } from './ui/victoryView.js';
import { ChatConsole } from './ui/chatConsole.js';
import { networkClient, GameStartData, SkirmishCommanderConfig } from './networking/networkClient.js';
import { soundManager } from './audio/soundManager.js';

class GameApp {
  private canvas: HTMLCanvasElement;
  private uiLayer: HTMLElement;

  private renderer: GameRenderer;
  private selection: SelectionManager;
  private inputHandler: InputHandler;
  private minimap: Minimap | null = null;
  private activeFormation: FormationType = 'line';
  private replayRecorder: MatchReplayRecorder | null = null;
  private replayPlayer: MatchReplayPlayer | null = null;
  private isReplaying: boolean = false;
  private replayPaused: boolean = false;
  private replaySpeed: number = 1;

  private hud: HudView;
  private mainMenu: MainMenuView;
  private lobbyView: LobbyView;
  private victoryView: VictoryView;
  private chatConsole: ChatConsole;

  // Active game state
  private inGame: boolean = false;
  private currentUnits: UnitData[] = [];
  private currentBuildings: BuildingData[] = [];
  private currentResourceNodes: ResourceNodeData[] = [];
  private currentPlayers: PlayerState[] = [];
  private myPlayerId: string = 'human_player';
  private myTeam: number = 1;

  private lastTime: number = 0;
  private matchStartTime: number = 0;

  constructor() {
    this.canvas = document.getElementById('render-canvas') as HTMLCanvasElement;
    this.uiLayer = document.getElementById('ui-layer') as HTMLElement;

    this.renderer = new GameRenderer(this.canvas);
    this.selection = new SelectionManager();

    this.inputHandler = new InputHandler(this.canvas, this.renderer, this.selection, {
      dispatchMove: (unitIds, target) => {
        networkClient.sendCommand({ type: 'MOVE', unitIds, target, formation: this.activeFormation });
      },
      dispatchAttack: (unitIds, targetEntityId) => {
        networkClient.sendCommand({ type: 'ATTACK', unitIds, targetEntityId });
      },
      dispatchGather: (unitIds, resourceNodeId) => {
        networkClient.sendCommand({ type: 'GATHER', unitIds, resourceNodeId });
      },
      dispatchBuild: (unitIds, buildingType, position) => {
        networkClient.sendCommand({ type: 'BUILD', unitIds, buildingType, position });
      },
      dispatchRepair: (unitIds, buildingId) => {
        networkClient.sendCommand({ type: 'REPAIR', unitIds, buildingId });
      },
      dispatchSetRallyPoint: (buildingId, point, targetEntityId, targetType) => {
        networkClient.sendCommand({ type: 'SET_RALLY_POINT', buildingId, point, targetEntityId, targetType });
      }
    });

    this.inputHandler.onPlacementChanged = (type) => {
      this.hud.setPlacementActive(type);
    };
    this.inputHandler.onPlacementError = (msg) => {
      this.hud.showNotification(msg);
    };
    this.inputHandler.onRallyPointSet = (bldg, pt, desc) => {
      const bdef = BUILDING_DEFINITIONS[bldg.type];
      this.hud.showNotification(`🚩 Checkpoint set for ${bdef?.name || 'Building'} (${desc})`);
    };

    this.hud = new HudView(this.uiLayer, {
      onStartPlacement: (type: BuildingType) => {
        this.inputHandler.startPlacement(type);
      },
      onCancelPlacement: () => {
        this.inputHandler.cancelPlacement();
      },
      onTrainUnit: (buildingId: string, unitType: UnitType) => {
        networkClient.sendCommand({ type: 'TRAIN_UNIT', buildingId, unitType });
        soundManager.playTrainUnit();
      },
      onResearchTech: (buildingId: string, techId: string) => {
        networkClient.sendCommand({ type: 'RESEARCH_TECH', buildingId, techId });
        soundManager.playClick();
      },
      onTradeCommodity: (buyResource, sellResource, buyAmount, sellAmount) => {
        networkClient.sendCommand({
          type: 'TRADE_COMMODITY',
          buyResource,
          sellResource,
          buyAmount,
          sellAmount
        });
      },
      onAdvanceAge: (buildingId: string) => {
        networkClient.sendCommand({ type: 'ADVANCE_AGE', buildingId });
        soundManager.playAgeUp();
      },
      onSelectIdleWorker: () => {
        this.selectNextIdleWorker();
      },
      onSelectAllMilitary: () => {
        const military = this.currentUnits.filter(
          u => u.ownerId === this.myPlayerId && u.type !== 'worker' && u.state !== 'dead'
        );
        if (military.length > 0) {
          this.selection.selectMultiple(military.map(u => u.id));
          this.hud.showNotification(`📯 Selected ${military.length} combat units!`);
        } else {
          this.hud.showNotification('ℹ️ No active combat units in your regiment.');
        }
      },
      onSetStance: (stance: UnitStance) => {
        const militaryIds = this.currentUnits
          .filter(u => this.selection.selectedIds.has(u.id) && u.ownerId === this.myPlayerId && u.type !== 'worker' && u.state !== 'dead')
          .map(u => u.id);
        if (militaryIds.length > 0) {
          networkClient.sendCommand({ type: 'SET_STANCE', unitIds: militaryIds, stance });
          soundManager.playClick();
        }
      },
      onSetFormation: (formation: FormationType) => {
        this.activeFormation = formation;
        soundManager.playClick();
      },
      onAssignWorkersToBuild: (buildingId: string) => {
        const myWorkers = this.currentUnits.filter(u => u.ownerId === this.myPlayerId && u.type === 'worker' && u.state !== 'dead');
        const workerIds = myWorkers.map(w => w.id);
        networkClient.sendCommand({ type: 'REPAIR', unitIds: workerIds, buildingId });
      },
      onOpenMenu: () => {
        if (confirm('Return to main menu?')) {
          this.endGame();
        }
      },
      onTransferResources: (recipientId, resource, amount) => {
        networkClient.sendCommand({ type: 'TRANSFER_RESOURCES', recipientId, resource, amount });
      }
    });

    this.inputHandler.onResourceHover = (x, y, node) => this.hud.showResourceHoverTooltip(x, y, node);
    this.inputHandler.onResourceHoverEnd = () => this.hud.hideResourceHoverTooltip();
    this.inputHandler.onResourceSelect = (node) => this.hud.showResourceDetails(node);

    this.mainMenu = new MainMenuView(this.uiLayer, {
      onPlayReplay: (data: MatchReplayData) => {
        this.startReplayMode(data);
      },
      onStartSinglePlayer: (roster, settings) => {
        this.startSinglePlayerGame(roster, settings);
      },
      onHostLan: (name, civ) => {
        this.hostLanGame(name, civ);
      },
      onJoinLan: (serverAddress, name, civ) => {
        this.joinLanGame(serverAddress, name, civ);
      },
      onRequestJoinLan: (serverAddress, name, civ, roomCode) => {
        this.requestJoinLanGame(serverAddress, name, civ, roomCode);
      },
      onCancelJoinRequest: (requestId) => {
        networkClient.cancelJoinRequest(requestId);
      }
    });

    this.lobbyView = new LobbyView(this.uiLayer, {
      onUpdatePlayer: (civ, team, isReady) => {
        networkClient.updatePlayer({ civ, team, isReady });
      },
      onUpdateSettings: (settings) => {
        networkClient.updateLobbySettings(settings);
      },
      onAddAi: (civ, team) => {
        networkClient.addAi(civ, team);
      },
      onRemoveAi: (aiId) => {
        networkClient.removeAi(aiId);
      },
      onStartGame: () => {
        networkClient.startGame();
      },
      onLeave: () => {
        networkClient.stop();
        this.lobbyView.hide();
        this.mainMenu.show();
      },
      onApproveJoin: (requestId) => {
        networkClient.approveJoin(requestId);
      },
      onDeclineJoin: (requestId) => {
        networkClient.declineJoin(requestId);
      },
      onSetApprovalRequired: (requireApproval) => {
        networkClient.setApprovalRequired(requireApproval);
      },
      onSetPrivate: (isPrivate) => {
        networkClient.setPrivate(isPrivate);
      }
    });
    this.lobbyView.hide();

    this.victoryView = new VictoryView(this.uiLayer, {
      onDownloadReplay: () => {
        const json = this.replayRecorder?.exportToJson() || localStorage.getItem('last_afr_replay');
        if (!json) {
          alert('No recorded replay available for this match.');
          return;
        }
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `AgeFront_Match_${Date.now()}.afr`;
        a.click();
        URL.revokeObjectURL(url);
      },
      onRematch: () => {
        this.victoryView.hide();
        this.mainMenu.show();
      },
      onMainMenu: () => {
        this.victoryView.hide();
        this.endGame();
      }
    });

    this.chatConsole = new ChatConsole(this.uiLayer, {
      onSubmit: (text) => {
        const result = networkClient.executeCheat(text);
        if (result.success && result.effect === 'reveal_map') {
          if (this.renderer.fogOfWar) {
            this.renderer.fogOfWar.revealAll();
          }
        }
        return result;
      },
      onNotification: (msg) => {
        this.hud.showNotification(msg, 4000);
      },
      onOpen: () => {
        this.renderer.cameraController.clearKeys();
      }
    });

    this.setupNetworkCallbacks();

    // Start 60 FPS Render Loop
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  private setupNetworkCallbacks(): void {
    networkClient.onLobbyState = (state) => {
      if (networkClient.myPlayerId) {
        this.lobbyView.setMyPlayerId(networkClient.myPlayerId);
      }
      this.lobbyView.update(state);
    };

    networkClient.onRoomList = (rooms) => {
      this.mainMenu.setDiscoveredRooms(rooms);
    };

    networkClient.onJoinPending = (data) => {
      this.mainMenu.setJoinPending(data.requestId, data.hostName, data.roomCode);
    };

    networkClient.onJoinApproved = (_data) => {
      soundManager.playOrder();
      this.mainMenu.hide();
      if (networkClient.myPlayerId) {
        this.lobbyView.setMyPlayerId(networkClient.myPlayerId);
      }
      this.lobbyView.show();
    };

    networkClient.onJoinDeclined = (data) => {
      this.mainMenu.setJoinDeclined(data.reason || 'Host declined your request to join the match.');
    };

    networkClient.onJoinRequested = (_request) => {
      soundManager.playOrder();
    };

    networkClient.onLobbyError = (msg) => {
      alert(msg);
    };

    networkClient.onGameStart = (data: GameStartData) => {
      this.handleGameStart(data);
    };

    networkClient.onGameSnapshot = (snapshot) => {
      this.handleGameSnapshot(snapshot);
    };
  }

  private startSinglePlayerGame(
    roster: SkirmishCommanderConfig[],
    settings: GameSettings
  ): void {
    this.mainMenu.hide();
    const human = roster.find(p => !p.isAi) || roster[0];
    this.myPlayerId = human.id || 'human_player';
    this.myTeam = human.team || 1;
    this.inputHandler.setPlayerInfo(this.myPlayerId, this.myTeam);
    networkClient.startSinglePlayer(roster, settings);
  }

  private hostLanGame(name: string, civ: CivName): void {
    this.mainMenu.hide();
    const serverUrl = window.location.origin;
    networkClient.connect(serverUrl);
    networkClient.joinLobby(name, civ, 1);
    this.lobbyView.show();
  }

  private joinLanGame(serverAddress: string, name: string, civ: CivName): void {
    this.mainMenu.hide();
    networkClient.connect(serverAddress);
    networkClient.joinLobby(name, civ, 1);
    this.lobbyView.show();
  }

  private requestJoinLanGame(serverAddress: string, name: string, civ: CivName, roomCode: string): void {
    networkClient.connect(serverAddress);
    networkClient.requestJoin(name, civ, 1, roomCode);
  }

  
  private startReplayMode(replayData: MatchReplayData): void {
    this.mainMenu.hide();
    this.lobbyView.hide();
    this.victoryView.hide();
    this.hud.show();
    this.inGame = true;
    this.isReplaying = true;
    this.replayPaused = false;
    this.replaySpeed = 1;
    this.replayPlayer = new MatchReplayPlayer(replayData);

    const firstPlayer = replayData.initialPlayers[0];
    this.myPlayerId = firstPlayer.id;
    this.myTeam = firstPlayer.team;
    this.inputHandler.setPlayerInfo(this.myPlayerId, this.myTeam);

    const snap = this.replayPlayer.sim.getSnapshot();
    this.currentUnits = snap.units;
    this.currentBuildings = snap.buildings;
    this.currentResourceNodes = snap.resourceNodes;
    this.currentPlayers = snap.players;
    this.inputHandler.activeUnitsForSelection = this.currentUnits;
    this.inputHandler.activeBuildingsForSelection = this.currentBuildings;
    this.inputHandler.activeResourcesForSelection = this.currentResourceNodes;

    this.renderer.initMap(
      this.replayPlayer.sim.mapData.width,
      this.replayPlayer.sim.mapData.height,
      this.replayPlayer.sim.mapData.tiles,
      this.currentResourceNodes,
      this.myTeam
    );

    this.hud.showReplayControls(
      (isPaused) => { this.replayPaused = isPaused; },
      (speed) => { this.replaySpeed = speed; }
    );
    this.hud.showNotification('Match Replay Mode Loaded (.afr)');
  }

  private handleGameStart(data: GameStartData): void {
    this.mainMenu.hide();
    this.lobbyView.hide();
    this.victoryView.hide();
    this.hud.show();
    this.inGame = true;
    this.matchStartTime = performance.now();
    this.chatConsole.setGameState(true, networkClient.isSinglePlayer);
    this.replayRecorder = new MatchReplayRecorder(
      Date.now().toString() || `match_${Date.now()}`,
      data.settings,
      data.players.map(p => ({
        id: p.id,
        name: p.name,
        team: p.team,
        civ: p.civ,
        color: p.color,
        isAi: p.isAi
      }))
    );


    // Find my player: prioritize yourPlayerId sent by server or networkClient.myPlayerId
    const me = (data.yourPlayerId ? data.players.find(p => p.id === data.yourPlayerId) : null) ||
      (networkClient.myPlayerId ? data.players.find(p => p.id === networkClient.myPlayerId) : null) ||
      data.players.find(p => !p.isAi) ||
      data.players[0];

    this.myPlayerId = me.id;
    this.myTeam = me.team;
    this.inputHandler.setPlayerInfo(this.myPlayerId, this.myTeam);

    this.currentUnits = data.units;
    this.currentBuildings = data.buildings;
    this.currentResourceNodes = data.resourceNodes;
    this.currentPlayers = data.players;
    this.inputHandler.activeUnitsForSelection = this.currentUnits;
    this.inputHandler.activeBuildingsForSelection = this.currentBuildings;
    this.inputHandler.activeResourcesForSelection = this.currentResourceNodes;
    this.inputHandler.setMapData(data.mapTiles.width, data.mapTiles.height, data.mapTiles.tiles);

    // Initialize map in renderer
    this.renderer.initMap(
      data.mapTiles.width,
      data.mapTiles.height,
      data.mapTiles.tiles,
      data.resourceNodes,
      this.myTeam
    );

    // Initialize Minimap
    const minimapContainer = this.hud.getMinimapContainer();
    minimapContainer.innerHTML = '';
    this.minimap = new Minimap(
      minimapContainer,
      data.mapTiles.width,
      data.mapTiles.height,
      data.mapTiles.tiles,
      (worldX, worldZ) => {
        this.renderer.cameraController.jumpTo(worldX, worldZ);
      }
    );

    // Center camera on my starting Town Centre
    const myTC = data.buildings.find(b => b.ownerId === this.myPlayerId && b.type === 'town_centre');
    if (myTC) {
      this.renderer.cameraController.jumpTo(myTC.x + myTC.width / 2, myTC.y + myTC.height / 2);
    }

    soundManager.startAmbientMusic();
  }

  private handleGameSnapshot(snapshot: any): void {
    this.currentUnits = snapshot.units;
    this.currentBuildings = snapshot.buildings;
    this.currentResourceNodes = snapshot.resourceNodes;
    this.currentPlayers = snapshot.players;

    this.inputHandler.activeUnitsForSelection = this.currentUnits;
    this.inputHandler.activeBuildingsForSelection = this.currentBuildings;
    this.inputHandler.activeResourcesForSelection = this.currentResourceNodes;

    const me = this.currentPlayers.find(p => p.id === this.myPlayerId) || this.currentPlayers[0];

    // Count idle workers
    const idleCount = this.currentUnits.filter(
      u => u.ownerId === this.myPlayerId && u.type === 'worker' && u.state === 'idle'
    ).length;

    const myTC = this.currentBuildings.find(b => b.ownerId === this.myPlayerId && b.type === 'town_centre');

    if (me) {
      const elapsedSec = (performance.now() - this.matchStartTime) / 1000;
      this.hud.updatePlayerStats(
        me,
        idleCount,
        myTC?.id,
        this.currentPlayers,
        this.currentUnits,
        this.currentBuildings,
        elapsedSec
      );
    }

    // Process Events
    if (snapshot.events) {
      for (const ev of snapshot.events) {
        if (ev.type === 'ATTACK_HIT') {
          soundManager.playAttack();
          this.renderer.spawnAttackVisual(ev.attackerId, ev.targetId, this.currentUnits, this.currentBuildings);
        } else if (ev.type === 'AGE_ADVANCED') {
          soundManager.playAgeUp();
          this.hud.showNotification(`Civilization advanced to ${ev.newAge}!`);
        } else if (ev.type === 'TECH_RESEARCHED') {
          this.hud.showNotification(`Technology Researched: ${ev.techId}`);
        } else if (ev.type === 'BUILDING_COMPLETED') {
          soundManager.playBuild();
        } else 
        if (ev.type === 'TRADE_COMPLETED') {
          if (ev.ownerId === this.myPlayerId) {
            soundManager.playCoin();
            this.renderer.spawnFloatingText(ev.x, ev.y, `+${ev.goldEarned} 🪙`, '#facc15');
            this.hud.showNotification(`💰 Caravan delivered trade goods: +${ev.goldEarned} Gold Revenue!`);
          }
        }

        if (ev.type === 'UNIT_SPAWNED') {
          if (ev.ownerId === this.myPlayerId) {
            soundManager.playTrainUnit();
            if (ev.unitType === 'worker') {
              this.hud.showNotification(`🧑‍🌾 Citizen Worker ready & automated to work!`);
            } else {
              const name = ev.unitType.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
              this.hud.showNotification(`⚔️ ${name} deployed into service!`);
            }
          }
        } else if (ev.type === 'PLAYER_DEFEATED') {
          const isMe = ev.playerId === this.myPlayerId;
          if (isMe) {
            this.hud.showNotification(`⚠️ Your civilization has collapsed!`);
          } else {
            this.hud.showNotification(`🚩 Adversary Defeated: ${ev.playerName} has fallen!`);
          }
        } else if (ev.type === 'GAME_OVER') {
          const isVictory = me ? me.team === ev.winnerTeam : false;
          const durationSec = (performance.now() - this.matchStartTime) / 1000;
          if (isVictory) {
            this.hud.showNotification(`🏆 VICTORY! All enemy forces vanquished!`);
          } else {
            this.hud.showNotification(`💀 DEFEAT! Your civilization was conquered.`);
          }
          
    const replay = this.replayRecorder?.finalize(Math.round(durationSec * 20), ev.winnerTeam, ev.reason);
    if (replay) {
      try {
        localStorage.setItem('last_afr_replay', JSON.stringify(replay));
      } catch (e) {}
    }
  
    this.victoryView.show(isVictory, ev.reason, me, durationSec);
        }
      }
    }

    // Update HUD selection card
    const selectedUnits = this.currentUnits.filter(u => this.selection.selectedIds.has(u.id));
    const selectedBuildings = this.currentBuildings.filter(b => this.selection.selectedIds.has(b.id));
    if (me) {
      this.hud.updateSelection(selectedUnits, selectedBuildings, me);
    }
  }

  private selectNextIdleWorker(): void {
    const idleWorkers = this.currentUnits.filter(
      u => u.ownerId === this.myPlayerId && u.type === 'worker' && u.state === 'idle'
    );
    if (idleWorkers.length > 0) {
      const target = idleWorkers[0];
      this.selection.selectSingle(target.id, 'unit');
      this.renderer.cameraController.jumpTo(target.x, target.y);
      soundManager.playSelect();
    }
  }

  private endGame(): void {
    this.inGame = false;
    this.chatConsole.setGameState(false, false);
    soundManager.stopAmbientMusic();
    networkClient.stop();
    this.selection.clear();
    this.currentUnits = [];
    this.currentBuildings = [];
    this.currentResourceNodes = [];
    this.currentPlayers = [];
    this.inputHandler.activeUnitsForSelection = [];
    this.inputHandler.activeBuildingsForSelection = [];
    this.inputHandler.activeResourcesForSelection = [];
    this.hud.hide();
    this.hud.hideReplayControls();
    this.isReplaying = false;
    this.replayPlayer = null;
    if (this.minimap) {
      const minimapContainer = this.hud.getMinimapContainer();
      minimapContainer.innerHTML = '';
      this.minimap = null;
    }
    this.renderer.clearGameScene();
    this.victoryView.hide();
    this.lobbyView.hide();
    this.mainMenu.show();
  }

  private loop(now: number): void {
    const dt = Math.min(0.1, (now - this.lastTime) / 1000);
    this.lastTime = now;

    if (this.inGame) {
      // Update Three.js entities and render
      
    if (this.isReplaying && this.replayPlayer && !this.replayPaused) {
      for (let s = 0; s < this.replaySpeed; s++) {
        const hasMore = this.replayPlayer.step(0.05);
        if (!hasMore) {
          this.replayPaused = true;
          this.hud.showNotification('Replay Reached End of Match.');
          break;
        }
      }
      const snap = this.replayPlayer.sim.getSnapshot();
      this.currentUnits = snap.units;
      this.currentBuildings = snap.buildings;
      this.currentPlayers = snap.players;
      this.inputHandler.activeUnitsForSelection = this.currentUnits;
      this.inputHandler.activeBuildingsForSelection = this.currentBuildings;
      this.hud.updateReplayTime(this.replayPlayer.currentTick * 0.05, this.replayPlayer.replayData.totalTicks * 0.05);
    }

    this.renderer.updateEntities(
        this.currentUnits,
        this.currentBuildings,
        this.currentPlayers,
        this.selection.selectedIds,
        this.myPlayerId,
        this.myTeam,
        dt
      );
      this.renderer.render(dt);

      // Update Minimap
      if (this.minimap && this.renderer.fogOfWar) {
        this.minimap.render(
          this.currentUnits,
          this.currentBuildings,
          this.currentResourceNodes,
          this.renderer.fogOfWar,
          this.renderer.cameraController.target.x,
          this.renderer.cameraController.target.z,
          this.myPlayerId,
          this.myTeam
        );
      }
    }

    requestAnimationFrame((t) => this.loop(t));
  }
}

// Start Game App on DOM ready
window.addEventListener('DOMContentLoaded', () => {
  new GameApp();
});
