import {
  CivName,
  CIVILIZATIONS,
  MapType,
  AIDifficulty,
  VictoryConditionType,
  GameSettings,
  ActiveRoomSummary,
  escapeHtml,
  sanitizeText
} from '@agefront/shared';
import { soundManager } from '../audio/soundManager.js';
import { SkirmishCommanderConfig } from '../networking/networkClient.js';

export interface MainMenuCallbacks {
  onStartSinglePlayer: (roster: SkirmishCommanderConfig[], settings: GameSettings) => void;
  onHostLan: (name: string, civ: CivName) => void;
  onJoinLan: (serverAddress: string, name: string, civ: CivName) => void;
  onRequestJoinLan?: (serverAddress: string, name: string, civ: CivName, roomCode: string) => void;
  onCancelJoinRequest?: (requestId: string) => void;
}

export class MainMenuView {
  public rootElem: HTMLElement;
  private callbacks: MainMenuCallbacks;
  private currentModal: 'none' | 'sp_setup' | 'host_setup' | 'join_setup' | 'how_to_play' | 'settings' = 'none';

  // Join LAN State
  private discoveredRooms: ActiveRoomSummary[] = [];
  private isSearchingRooms: boolean = false;
  private joinPollInterval: any = null;
  public pendingRequestId: string | null = null;
  public pendingHostName: string = '';
  public pendingRoomCode: string = '';
  private joinError: string | null = null;
  private joinCommanderName: string = 'Ally Commander';
  private joinCommanderCiv: CivName = 'Veyran Confederacy';

  // Skirmish War Room State
  private skirmishRoster: SkirmishCommanderConfig[] = [
    { name: 'Commander', civ: 'Veyran Confederacy', team: 1, isAi: false },
    { name: 'AI Enemy 1', civ: 'Ironvale Kingdom', team: 2, isAi: true, difficulty: 'medium' }
  ];
  private skirmishFormat: string = '1v1';
  private skirmishMapSize: number = 240;
  private skirmishMapType: MapType = 'green_frontier';
  private skirmishResources: 'standard' | 'high' | 'deathmatch' = 'standard';
  private skirmishVictory: VictoryConditionType = 'conquest';

  constructor(container: HTMLElement, callbacks: MainMenuCallbacks) {
    this.callbacks = callbacks;
    this.rootElem = document.createElement('div');
    this.rootElem.className = 'modal-backdrop interactive';
    this.rootElem.style.background = 'radial-gradient(ellipse at center, #0f172a 0%, #030712 100%)';
    this.rootElem.style.backdropFilter = 'none';
    container.appendChild(this.rootElem);

    this.render();
  }

  public show(): void {
    this.currentModal = 'none';
    this.stopJoinPolling();
    this.rootElem.style.display = 'flex';
    this.rootElem.style.background = 'radial-gradient(ellipse at center, #0f172a 0%, #030712 100%)';
    this.rootElem.style.backdropFilter = 'none';
    this.render();
  }

  public hide(): void {
    this.stopJoinPolling();
    this.rootElem.style.display = 'none';
  }

  public setDiscoveredRooms(rooms: ActiveRoomSummary[]): void {
    this.discoveredRooms = rooms;
    this.isSearchingRooms = false;
    if (this.currentModal === 'join_setup') {
      this.render();
    }
  }

  public setJoinPending(requestId: string, hostName?: string, roomCode?: string): void {
    this.pendingRequestId = requestId;
    this.pendingHostName = hostName || 'Host Commander';
    this.pendingRoomCode = roomCode || 'MAIN';
    this.joinError = null;
    if (this.currentModal === 'join_setup') {
      this.render();
    }
  }

  public setJoinDeclined(reason: string = 'Host declined your request'): void {
    this.pendingRequestId = null;
    this.joinError = reason;
    if (this.currentModal === 'join_setup') {
      this.render();
    }
  }

  public async refreshRooms(targetAddress?: string): Promise<void> {
    const inputAddr = (this.rootElem.querySelector('#join-address') as HTMLInputElement)?.value;
    const addr = targetAddress || inputAddr || window.location.origin;
    this.isSearchingRooms = true;
    try {
      const res = await fetch(`${addr.replace(/\/$/, '')}/api/rooms`);
      if (res.ok) {
        const rooms = await res.json();
        this.discoveredRooms = rooms;
      }
    } catch {
      // Ignore network fetch errors if host is offline or not yet ready
    } finally {
      this.isSearchingRooms = false;
      if (this.currentModal === 'join_setup' && !this.pendingRequestId) {
        this.render();
      }
    }
  }

  private startJoinPolling(): void {
    this.stopJoinPolling();
    this.refreshRooms();
    this.joinPollInterval = setInterval(() => {
      if (this.currentModal === 'join_setup' && !this.pendingRequestId) {
        this.refreshRooms();
      }
    }, 2500);
  }

  private stopJoinPolling(): void {
    if (this.joinPollInterval) {
      clearInterval(this.joinPollInterval);
      this.joinPollInterval = null;
    }
  }

  private render(): void {
    if (this.currentModal === 'none') {
      this.renderMainMenu();
    } else if (this.currentModal === 'sp_setup') {
      this.renderSinglePlayerSetup();
    } else if (this.currentModal === 'host_setup') {
      this.renderHostSetup();
    } else if (this.currentModal === 'join_setup') {
      this.renderJoinSetup();
    } else if (this.currentModal === 'how_to_play') {
      this.renderHowToPlay();
    } else if (this.currentModal === 'settings') {
      this.renderSettings();
    }
  }

  private renderMainMenu(): void {
    this.rootElem.innerHTML = `
      <div style="
        width: 480px;
        background: linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(10, 15, 30, 0.95) 100%);
        border: 2px solid #334155;
        border-radius: 16px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.8);
        padding: 36px 32px;
        text-align: center;
        color: #f8fafc;
        display: flex;
        flex-direction: column;
        gap: 20px;
      ">
        <div style="display: flex; flex-direction: column; align-items: center;">
          <img src="/logo.jpg" alt="Agefront Logo" style="width: 110px; height: 110px; border-radius: 50%; object-fit: cover; border: 2px solid rgba(56, 189, 248, 0.7); box-shadow: 0 0 25px rgba(56, 189, 248, 0.45); margin-bottom: 12px;" />
          <h1 class="cinzel" style="font-size: 32px; font-weight: 900; color: #f8fafc; letter-spacing: 2px; text-shadow: 0 2px 10px rgba(56, 189, 248, 0.5);">
            AGEFRONT
          </h1>
          <div class="cinzel" style="font-size: 14px; font-weight: 700; color: #38bdf8; letter-spacing: 4px; margin-top: 4px;">
            NATIONS AT WAR
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 10px;">
          <button id="btn-sp" style="
            background: linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%);
            border: none;
            color: white;
            padding: 14px;
            border-radius: 8px;
            font-size: 15px;
            font-weight: 700;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
            transition: transform 0.1s ease;
          ">
            Single Player Skirmish
          </button>

          <button id="btn-host-lan" style="
            background: #1e293b;
            border: 1.5px solid #38bdf8;
            color: #38bdf8;
            padding: 13px;
            border-radius: 8px;
            font-size: 15px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.15s ease;
          ">
            Host LAN Game
          </button>

          <button id="btn-join-lan" style="
            background: #1e293b;
            border: 1.5px solid #4ade80;
            color: #4ade80;
            padding: 13px;
            border-radius: 8px;
            font-size: 15px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.15s ease;
          ">
            Join LAN Game
          </button>

          <button id="btn-how-to-play" style="
            background: transparent;
            border: 1px solid #475569;
            color: #cbd5e1;
            padding: 10px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
          ">
            How to Play & Controls
          </button>

          <button id="btn-settings" style="
            background: transparent;
            border: 1px solid #475569;
            color: #cbd5e1;
            padding: 10px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
          ">
            Settings & Audio
          </button>
        </div>

        <div style="font-size: 11px; color: #475569; margin-top: 6px;">
          Version 1.0.0 • Local Wi-Fi & Wired LAN Co-op
        </div>
      </div>
    `;

    this.rootElem.querySelector('#btn-sp')?.addEventListener('click', () => {
      this.currentModal = 'sp_setup';
      soundManager.playClick();
      this.render();
    });

    this.rootElem.querySelector('#btn-host-lan')?.addEventListener('click', () => {
      this.currentModal = 'host_setup';
      soundManager.playClick();
      this.render();
    });

    this.rootElem.querySelector('#btn-join-lan')?.addEventListener('click', () => {
      this.currentModal = 'join_setup';
      this.joinError = null;
      this.pendingRequestId = null;
      this.startJoinPolling();
      soundManager.playClick();
      this.render();
    });

    this.rootElem.querySelector('#btn-how-to-play')?.addEventListener('click', () => {
      this.currentModal = 'how_to_play';
      soundManager.playClick();
      this.render();
    });

    this.rootElem.querySelector('#btn-settings')?.addEventListener('click', () => {
      this.currentModal = 'settings';
      soundManager.playClick();
      this.render();
    });
  }

  private applyFormatPreset(format: string): void {
    this.skirmishFormat = format;
    const myName = this.skirmishRoster[0]?.name || 'Commander';
    const myCiv = this.skirmishRoster[0]?.civ || 'Veyran Confederacy';
    const me: SkirmishCommanderConfig = { name: myName, civ: myCiv, team: 1, isAi: false };

    switch (format) {
      case '1v1':
        this.skirmishRoster = [
          me,
          { name: 'AI Enemy 1', civ: 'Ironvale Kingdom', team: 2, isAi: true, difficulty: 'medium' }
        ];
        this.skirmishMapSize = 240; // RoN Small (2-3 players)
        break;
      case '2v2':
        this.skirmishRoster = [
          me,
          { name: 'AI Ally 1', civ: 'Solari Dominion', team: 1, isAi: true, difficulty: 'medium' },
          { name: 'AI Enemy 1', civ: 'Ironvale Kingdom', team: 2, isAi: true, difficulty: 'medium' },
          { name: 'AI Enemy 2', civ: 'Nambara Alliance', team: 2, isAi: true, difficulty: 'medium' }
        ];
        this.skirmishMapSize = 280; // RoN Standard (4 players)
        break;
      case '3v3':
        this.skirmishRoster = [
          me,
          { name: 'AI Ally 1', civ: 'Solari Dominion', team: 1, isAi: true, difficulty: 'medium' },
          { name: 'AI Ally 2', civ: 'Nambara Alliance', team: 1, isAi: true, difficulty: 'medium' },
          { name: 'AI Enemy 1', civ: 'Ironvale Kingdom', team: 2, isAi: true, difficulty: 'medium' },
          { name: 'AI Enemy 2', civ: 'Veyran Confederacy', team: 2, isAi: true, difficulty: 'medium' },
          { name: 'AI Enemy 3', civ: 'Solari Dominion', team: 2, isAi: true, difficulty: 'medium' }
        ];
        this.skirmishMapSize = 320; // RoN Large (5-6 players)
        break;
      case '4v4':
        this.skirmishRoster = [
          me,
          { name: 'AI Ally 1', civ: 'Solari Dominion', team: 1, isAi: true, difficulty: 'medium' },
          { name: 'AI Ally 2', civ: 'Nambara Alliance', team: 1, isAi: true, difficulty: 'medium' },
          { name: 'AI Ally 3', civ: 'Ironvale Kingdom', team: 1, isAi: true, difficulty: 'medium' },
          { name: 'AI Enemy 1', civ: 'Ironvale Kingdom', team: 2, isAi: true, difficulty: 'medium' },
          { name: 'AI Enemy 2', civ: 'Veyran Confederacy', team: 2, isAi: true, difficulty: 'medium' },
          { name: 'AI Enemy 3', civ: 'Solari Dominion', team: 2, isAi: true, difficulty: 'medium' },
          { name: 'AI Enemy 4', civ: 'Nambara Alliance', team: 2, isAi: true, difficulty: 'medium' }
        ];
        this.skirmishMapSize = 360; // RoN Huge (7-8 players)
        break;
      case '1v2':
        this.skirmishRoster = [
          me,
          { name: 'AI Enemy 1', civ: 'Ironvale Kingdom', team: 2, isAi: true, difficulty: 'medium' },
          { name: 'AI Enemy 2', civ: 'Solari Dominion', team: 2, isAi: true, difficulty: 'medium' }
        ];
        this.skirmishMapSize = 240; // RoN Small
        break;
      case '1v3':
        this.skirmishRoster = [
          me,
          { name: 'AI Enemy 1', civ: 'Ironvale Kingdom', team: 2, isAi: true, difficulty: 'medium' },
          { name: 'AI Enemy 2', civ: 'Solari Dominion', team: 2, isAi: true, difficulty: 'medium' },
          { name: 'AI Enemy 3', civ: 'Nambara Alliance', team: 2, isAi: true, difficulty: 'medium' }
        ];
        this.skirmishMapSize = 280; // RoN Standard
        break;
      case 'ffa':
        this.skirmishRoster = [
          me,
          { name: 'AI Nation 2', civ: 'Ironvale Kingdom', team: 2, isAi: true, difficulty: 'medium' },
          { name: 'AI Nation 3', civ: 'Solari Dominion', team: 3, isAi: true, difficulty: 'medium' },
          { name: 'AI Nation 4', civ: 'Nambara Alliance', team: 4, isAi: true, difficulty: 'medium' }
        ];
        this.skirmishMapSize = 280; // RoN Standard
        break;
    }
  }

  private renderSinglePlayerSetup(): void {
    const allyCount = this.skirmishRoster.filter(p => p.team === 1 && p.isAi).length;
    const enemyCount = this.skirmishRoster.filter(p => p.team !== 1).length;
    const totalCount = this.skirmishRoster.length;

    const presetLabels: { id: string; label: string }[] = [
      { id: '1v1', label: '1 vs 1' },
      { id: '2v2', label: '2 vs 2 (Co-op)' },
      { id: '3v3', label: '3 vs 3 (Grand War)' },
      { id: '4v4', label: '4 vs 4 (World War)' },
      { id: '1v2', label: '1 vs 2' },
      { id: '1v3', label: '1 vs 3' },
      { id: 'ffa', label: 'FFA (4P)' },
      { id: 'custom', label: 'Custom' }
    ];

    const civOptions = Object.keys(CIVILIZATIONS);

    this.rootElem.innerHTML = `
      <div style="
        width: 860px;
        max-width: 95vw;
        max-height: 90vh;
        background: #0f172a;
        border: 2px solid #334155;
        border-radius: 16px;
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.85);
        padding: 24px;
        color: #f8fafc;
        display: flex;
        flex-direction: column;
        gap: 16px;
        overflow-y: auto;
      ">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e293b; padding-bottom: 12px;">
          <div>
            <h2 class="cinzel" style="font-size: 24px; color: #38bdf8; font-weight: 700; margin: 0;">
              SKIRMISH WAR ROOM
            </h2>
            <div style="font-size: 13px; color: #94a3b8; margin-top: 3px;">
              Configure Multi-Nation Alliances, Adversaries, and Battlefield Map Scale
            </div>
          </div>
          <div style="text-align: right; background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 6px 14px;">
            <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase;">Match Dynamic</div>
            <div style="font-size: 13px; font-weight: 700; color: #4ade80;">
              ${allyCount > 0 ? `You + ${allyCount} Allies` : 'Solo Commander'} vs ${enemyCount} Enemies (${totalCount} Nations)
            </div>
          </div>
        </div>

        <!-- Format Preset Selector -->
        <div>
          <label style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 6px;">
            Match Format Presets
          </label>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            ${presetLabels.map(p => `
              <button class="btn-preset ${this.skirmishFormat === p.id ? 'active-preset' : ''}" data-format="${p.id}" style="
                background: ${this.skirmishFormat === p.id ? '#2563eb' : '#1e293b'};
                border: 1px solid ${this.skirmishFormat === p.id ? '#3b82f6' : '#334155'};
                color: ${this.skirmishFormat === p.id ? '#ffffff' : '#cbd5e1'};
                border-radius: 6px;
                padding: 6px 12px;
                font-size: 12px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.15s ease;
              ">
                ${p.label}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- 2-Column War Room Setup -->
        <div style="display: grid; grid-template-columns: 1.4fr 1fr; gap: 18px;">
          <!-- Left: Commanders Roster (Allies & Enemies) -->
          <div style="background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 14px; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid #334155; padding-bottom: 6px;">
                <span style="font-weight: 700; font-size: 13px; color: #cbd5e1; text-transform: uppercase;">
                  Civilization Commanders (${totalCount}/8)
                </span>
                <span style="font-size: 11px; color: #94a3b8;">
                  Team 1 = Allies • Team 2+ = Adversaries
                </span>
              </div>

              <!-- Roster Cards Container -->
              <div id="roster-container" style="display: flex; flex-direction: column; gap: 8px; max-height: 310px; overflow-y: auto; padding-right: 4px;">
                ${this.skirmishRoster.map((c, idx) => {
                  const isPlayer = !c.isAi;
                  const isAlly = c.team === 1;
                  const teamColor = isAlly ? '#38bdf8' : c.team === 2 ? '#ef4444' : c.team === 3 ? '#f97316' : '#a855f7';
                  const badgeText = isPlayer ? 'YOU (Host)' : isAlly ? 'AI ALLY' : `AI ENEMY (T${c.team})`;

                  return `
                    <div style="
                      background: #0f172a;
                      border: 1px solid ${teamColor};
                      border-left: 4px solid ${teamColor};
                      border-radius: 8px;
                      padding: 8px 10px;
                      display: flex;
                      flex-direction: column;
                      gap: 6px;
                    ">
                      <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="display: flex; align-items: center; gap: 6px;">
                          <span style="background: ${teamColor}22; color: ${teamColor}; border: 1px solid ${teamColor}66; border-radius: 4px; padding: 2px 6px; font-size: 10px; font-weight: 700;">
                            ${badgeText}
                          </span>
                          ${isPlayer ? `
                            <input class="roster-name-input" data-index="${idx}" type="text" value="${c.name}" style="background: #1e293b; border: 1px solid #334155; color: white; border-radius: 4px; padding: 2px 6px; font-size: 12px; font-weight: 600; width: 130px;" />
                          ` : `
                            <span style="font-weight: 600; font-size: 12px; color: #f8fafc;">${c.name}</span>
                          `}
                        </div>

                        ${!isPlayer ? `
                          <div style="display: flex; align-items: center; gap: 6px;">
                            <select class="roster-team-select" data-index="${idx}" style="background: #1e293b; border: 1px solid #334155; color: ${teamColor}; border-radius: 4px; padding: 2px 6px; font-size: 11px; font-weight: 700;">
                              <option value="1" ${c.team === 1 ? 'selected' : ''}>Team 1 (Ally)</option>
                              <option value="2" ${c.team === 2 ? 'selected' : ''}>Team 2 (Enemy)</option>
                              <option value="3" ${c.team === 3 ? 'selected' : ''}>Team 3 (Enemy)</option>
                              <option value="4" ${c.team === 4 ? 'selected' : ''}>Team 4 (Enemy)</option>
                            </select>
                            <button class="btn-remove-roster" data-index="${idx}" style="background: #ef444422; border: 1px solid #ef444488; color: #f87171; border-radius: 4px; padding: 2px 6px; font-size: 11px; cursor: pointer;">
                              ✕
                            </button>
                          </div>
                        ` : ''}
                      </div>

                      <div style="display: flex; gap: 8px;">
                        <div style="flex: 1;">
                          <select class="roster-civ-select" data-index="${idx}" style="width: 100%; background: #1e293b; border: 1px solid #334155; color: #cbd5e1; border-radius: 4px; padding: 4px 6px; font-size: 11px;">
                            ${civOptions.map(civ => `
                              <option value="${civ}" ${c.civ === civ ? 'selected' : ''}>${civ}</option>
                            `).join('')}
                          </select>
                        </div>
                        ${!isPlayer ? `
                          <div style="width: 100px;">
                            <select class="roster-diff-select" data-index="${idx}" style="width: 100%; background: #1e293b; border: 1px solid #334155; color: #cbd5e1; border-radius: 4px; padding: 4px 6px; font-size: 11px;">
                              <option value="easy" ${c.difficulty === 'easy' ? 'selected' : ''}>Easy</option>
                              <option value="medium" ${!c.difficulty || c.difficulty === 'medium' ? 'selected' : ''}>Medium</option>
                              <option value="hard" ${c.difficulty === 'hard' ? 'selected' : ''}>Hard</option>
                            </select>
                          </div>
                        ` : ''}
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- Roster Action Buttons -->
            ${totalCount < 8 ? `
              <div style="display: flex; gap: 8px; margin-top: 10px;">
                <button id="btn-add-ally" style="flex: 1; background: #0369a1; border: 1px solid #0284c7; color: white; border-radius: 6px; padding: 7px; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.15s;">
                  + Add AI Ally (Team 1)
                </button>
                <button id="btn-add-enemy" style="flex: 1; background: #991b1b; border: 1px solid #b91c1c; color: white; border-radius: 6px; padding: 7px; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.15s;">
                  + Add AI Enemy (Team 2)
                </button>
              </div>
            ` : ''}
          </div>

          <!-- Right: Battlefield & Game Options -->
          <div style="background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 14px; display: flex; flex-direction: column; gap: 12px;">
            <div style="font-weight: 700; font-size: 13px; color: #cbd5e1; text-transform: uppercase; border-bottom: 1px solid #334155; padding-bottom: 6px;">
              Battlefield & Campaign Settings
            </div>

            <!-- Map Size Selector -->
            <div>
              <label style="font-size: 11px; color: #94a3b8; display: block; margin-bottom: 4px; font-weight: 600;">
                Map Size & Scale
              </label>
              <select id="sp-map-size" style="width: 100%; background: #0f172a; border: 1px solid #334155; color: #38bdf8; border-radius: 6px; padding: 7px 10px; font-size: 12px; font-weight: 700;">
                <option value="200" ${this.skirmishMapSize === 200 ? 'selected' : ''}>Arena (200×200) — Rise of Nations Duel</option>
                <option value="240" ${this.skirmishMapSize === 240 ? 'selected' : ''}>Small (240×240) — RoN 2–3 Players (Standard Skirmish)</option>
                <option value="280" ${this.skirmishMapSize === 280 ? 'selected' : ''}>Standard (280×280) — RoN 4 Player Battleground</option>
                <option value="320" ${this.skirmishMapSize === 320 ? 'selected' : ''}>Large (320×320) — RoN 5–6 Player Continent</option>
                <option value="360" ${this.skirmishMapSize === 360 ? 'selected' : ''}>Huge (360×360) — RoN 7–8 Player Grand Theater</option>
                <option value="400" ${this.skirmishMapSize === 400 ? 'selected' : ''}>Big Huge (400×400) — RoN Epic World War</option>
              </select>
            </div>

            <!-- Map Type -->
            <div>
              <label style="font-size: 11px; color: #94a3b8; display: block; margin-bottom: 4px; font-weight: 600;">
                Terrain Landscape
              </label>
              <select id="sp-map-type" style="width: 100%; background: #0f172a; border: 1px solid #334155; color: white; border-radius: 6px; padding: 7px 10px; font-size: 12px;">
                <option value="green_frontier" ${this.skirmishMapType === 'green_frontier' ? 'selected' : ''}>Green Frontier (Lush Forests & Gentle Hills)</option>
                <option value="highland_kingdom" ${this.skirmishMapType === 'highland_kingdom' ? 'selected' : ''}>Highland Kingdom (Mountains & Rich Minerals)</option>
                <option value="riverlands" ${this.skirmishMapType === 'riverlands' ? 'selected' : ''}>Riverlands (Fertile Valleys & Water Fords)</option>
              </select>
            </div>

            <!-- Starting Resources -->
            <div>
              <label style="font-size: 11px; color: #94a3b8; display: block; margin-bottom: 4px; font-weight: 600;">
                Starting Stockpile
              </label>
              <select id="sp-res" style="width: 100%; background: #0f172a; border: 1px solid #334155; color: white; border-radius: 6px; padding: 7px 10px; font-size: 12px;">
                <option value="standard" ${this.skirmishResources === 'standard' ? 'selected' : ''}>Standard (250F, 250W, 100S, 50M)</option>
                <option value="high" ${this.skirmishResources === 'high' ? 'selected' : ''}>High Resources (Fast Development)</option>
                <option value="deathmatch" ${this.skirmishResources === 'deathmatch' ? 'selected' : ''}>Deathmatch (Instant Massive Armies)</option>
              </select>
            </div>

            <!-- Victory Condition -->
            <div>
              <label style="font-size: 11px; color: #94a3b8; display: block; margin-bottom: 4px; font-weight: 600;">
                Victory Condition
              </label>
              <select id="sp-victory" style="width: 100%; background: #0f172a; border: 1px solid #334155; color: white; border-radius: 6px; padding: 7px 10px; font-size: 12px;">
                <option value="conquest" ${this.skirmishVictory === 'conquest' ? 'selected' : ''}>Conquest (Destroy Enemy Town Centres & Forces)</option>
                <option value="elimination" ${this.skirmishVictory === 'elimination' ? 'selected' : ''}>Total Elimination (Wipe Out All Enemy Units)</option>
                <option value="territorial" ${this.skirmishVictory === 'territorial' ? 'selected' : ''}>Territorial Control (Control > 60% Map)</option>
                <option value="technology" ${this.skirmishVictory === 'technology' ? 'selected' : ''}>Technology Mastery (Industrial Age & Techs)</option>
              </select>
            </div>

            <!-- Quick Map Tip -->
            <div style="background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 10px; font-size: 11px; color: #94a3b8;">
              💡 <strong style="color: #cbd5e1;">Allied Team Coordination:</strong> AI allies on Team 1 share line-of-sight vision with you, defend your settlements when attacked, and launch synchronized military campaigns against adversaries!
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #1e293b; padding-top: 14px;">
          <button id="btn-back" style="background: transparent; border: 1px solid #475569; color: #94a3b8; border-radius: 6px; padding: 10px 20px; font-size: 13px; cursor: pointer; font-weight: 600;">
            ← Back to Main Menu
          </button>
          <button id="btn-launch-sp" style="background: linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%); border: none; color: white; border-radius: 8px; padding: 12px 32px; font-size: 15px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.45); transition: transform 0.1s ease;">
            Launch Skirmish War ⚔️
          </button>
        </div>
      </div>
    `;

    // Hook up Preset Buttons
    this.rootElem.querySelectorAll('.btn-preset').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const fmt = (e.currentTarget as HTMLElement).dataset.format!;
        this.applyFormatPreset(fmt);
        soundManager.playClick();
        this.render();
      });
    });

    // Hook up Roster Inputs
    this.rootElem.querySelectorAll('.roster-name-input').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const idx = parseInt((e.target as HTMLElement).dataset.index!);
        if (this.skirmishRoster[idx]) {
          this.skirmishRoster[idx].name = (e.target as HTMLInputElement).value;
        }
      });
    });

    this.rootElem.querySelectorAll('.roster-team-select').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const idx = parseInt((e.target as HTMLElement).dataset.index!);
        if (this.skirmishRoster[idx]) {
          this.skirmishRoster[idx].team = parseInt((e.target as HTMLSelectElement).value);
          this.skirmishFormat = 'custom';
          this.render();
        }
      });
    });

    this.rootElem.querySelectorAll('.roster-civ-select').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const idx = parseInt((e.target as HTMLElement).dataset.index!);
        if (this.skirmishRoster[idx]) {
          this.skirmishRoster[idx].civ = (e.target as HTMLSelectElement).value as CivName;
        }
      });
    });

    this.rootElem.querySelectorAll('.roster-diff-select').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const idx = parseInt((e.target as HTMLElement).dataset.index!);
        if (this.skirmishRoster[idx]) {
          this.skirmishRoster[idx].difficulty = (e.target as HTMLSelectElement).value as AIDifficulty;
        }
      });
    });

    this.rootElem.querySelectorAll('.btn-remove-roster').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt((e.currentTarget as HTMLElement).dataset.index!);
        if (idx > 0 && this.skirmishRoster[idx]) {
          this.skirmishRoster.splice(idx, 1);
          this.skirmishFormat = 'custom';
          soundManager.playClick();
          this.render();
        }
      });
    });

    // Add Ally / Enemy Buttons
    this.rootElem.querySelector('#btn-add-ally')?.addEventListener('click', () => {
      if (this.skirmishRoster.length < 8) {
        const allyNum = this.skirmishRoster.filter(p => p.team === 1 && p.isAi).length + 1;
        const civs: CivName[] = ['Solari Dominion', 'Nambara Alliance', 'Ironvale Kingdom', 'Veyran Confederacy'];
        const civ = civs[allyNum % civs.length];
        this.skirmishRoster.push({
          name: `AI Ally ${allyNum}`,
          civ,
          team: 1,
          isAi: true,
          difficulty: 'medium'
        });
        this.skirmishFormat = 'custom';
        soundManager.playClick();
        this.render();
      }
    });

    this.rootElem.querySelector('#btn-add-enemy')?.addEventListener('click', () => {
      if (this.skirmishRoster.length < 8) {
        const enemyNum = this.skirmishRoster.filter(p => p.team !== 1).length + 1;
        const civs: CivName[] = ['Ironvale Kingdom', 'Nambara Alliance', 'Solari Dominion', 'Veyran Confederacy'];
        const civ = civs[enemyNum % civs.length];
        this.skirmishRoster.push({
          name: `AI Enemy ${enemyNum}`,
          civ,
          team: 2,
          isAi: true,
          difficulty: 'medium'
        });
        this.skirmishFormat = 'custom';
        soundManager.playClick();
        this.render();
      }
    });

    // Settings Dropdowns
    this.rootElem.querySelector('#sp-map-size')?.addEventListener('change', (e) => {
      this.skirmishMapSize = parseInt((e.target as HTMLSelectElement).value);
    });

    this.rootElem.querySelector('#sp-map-type')?.addEventListener('change', (e) => {
      this.skirmishMapType = (e.target as HTMLSelectElement).value as MapType;
    });

    this.rootElem.querySelector('#sp-res')?.addEventListener('change', (e) => {
      this.skirmishResources = (e.target as HTMLSelectElement).value as any;
    });

    this.rootElem.querySelector('#sp-victory')?.addEventListener('change', (e) => {
      this.skirmishVictory = (e.target as HTMLSelectElement).value as any;
    });

    // Navigation Buttons
    this.rootElem.querySelector('#btn-back')?.addEventListener('click', () => {
      this.currentModal = 'none';
      soundManager.playClick();
      this.render();
    });

    this.rootElem.querySelector('#btn-launch-sp')?.addEventListener('click', () => {
      soundManager.playOrder();
      this.callbacks.onStartSinglePlayer(this.skirmishRoster, {
        mapType: this.skirmishMapType,
        mapSize: this.skirmishMapSize,
        seed: Math.floor(Math.random() * 100000),
        victoryCondition: this.skirmishVictory,
        startingResources: this.skirmishResources,
        sharedTeamEconomy: false,
        aiDifficulty: 'medium'
      });
    });
  }

  private renderHostSetup(): void {
    this.rootElem.innerHTML = `
      <div style="
        width: 480px;
        background: #0f172a;
        border: 2px solid #334155;
        border-radius: 14px;
        padding: 24px;
        color: #f8fafc;
        display: flex;
        flex-direction: column;
        gap: 16px;
      ">
        <h2 class="cinzel" style="font-size: 22px; color: #38bdf8;">Host Local LAN Game</h2>
        <p style="font-size: 13px; color: #94a3b8;">
          Hosts a match on this computer. Friends on your Wi-Fi or local network can connect using your LAN IP.
        </p>

        <div>
          <label style="font-size: 12px; color: #94a3b8; display: block; margin-bottom: 4px;">Host Player Name</label>
          <input id="host-name" type="text" value="Host Commander" style="width: 100%; background: #1e293b; border: 1px solid #334155; color: white; border-radius: 6px; padding: 8px 10px; font-size: 13px;" />
        </div>

        <div>
          <label style="font-size: 12px; color: #94a3b8; display: block; margin-bottom: 4px;">Civilization</label>
          <select id="host-civ" style="width: 100%; background: #1e293b; border: 1px solid #334155; color: white; border-radius: 6px; padding: 8px 10px; font-size: 13px;">
            ${Object.keys(CIVILIZATIONS).map(c => `<option value="${c}">${c}</option>`).join('')}
          </select>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 14px; border-top: 1px solid #1e293b; padding-top: 14px;">
          <button id="btn-back" style="background: transparent; border: 1px solid #475569; color: #94a3b8; border-radius: 6px; padding: 10px 18px; font-size: 13px; cursor: pointer;">
            Back
          </button>
          <button id="btn-create-lobby" style="background: #2563eb; border: none; color: white; border-radius: 8px; padding: 10px 28px; font-size: 14px; font-weight: 700; cursor: pointer;">
            Open War Room Lobby →
          </button>
        </div>
      </div>
    `;

    this.rootElem.querySelector('#btn-back')?.addEventListener('click', () => {
      this.currentModal = 'none';
      soundManager.playClick();
      this.render();
    });

    this.rootElem.querySelector('#btn-create-lobby')?.addEventListener('click', () => {
      const name = (this.rootElem.querySelector('#host-name') as HTMLInputElement).value || 'Host Commander';
      const civ = (this.rootElem.querySelector('#host-civ') as HTMLSelectElement).value as CivName;
      this.callbacks.onHostLan(name, civ);
      soundManager.playClick();
    });
  }

  private renderJoinSetup(): void {
    if (this.pendingRequestId) {
      this.rootElem.innerHTML = `
        <div style="
          width: 500px;
          background: #0f172a;
          border: 2px solid #f59e0b;
          border-radius: 14px;
          padding: 32px 28px;
          color: #f8fafc;
          display: flex;
          flex-direction: column;
          gap: 20px;
          text-align: center;
          align-items: center;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8), 0 0 25px rgba(245, 158, 11, 0.25);
        ">
          <div style="font-size: 46px;">⏳</div>
          <div>
            <h3 class="cinzel" style="font-size: 22px; color: #fbbf24; margin-bottom: 8px;">Permission Request Sent!</h3>
            <p style="font-size: 14px; color: #cbd5e1; line-height: 1.5;">
              Waiting for host <strong style="color: #38bdf8;">${escapeHtml(this.pendingHostName)}</strong> to grant permission to join the War Room...
            </p>
            <div style="font-size: 12px; color: #94a3b8; margin-top: 12px; background: #1e293b; border-radius: 6px; padding: 10px 14px; border: 1px solid #334155;">
              🔔 The host has received an alert banner on their screen. You will automatically be admitted into the lobby as soon as they approve!
            </div>
          </div>

          <div style="width: 100%; border-top: 1px solid #334155; padding-top: 16px; margin-top: 8px;">
            <button id="btn-cancel-join-req" style="background: transparent; border: 1px solid #ef4444; color: #f87171; border-radius: 6px; padding: 10px 24px; font-size: 13px; font-weight: 600; cursor: pointer;">
              Cancel Request
            </button>
          </div>
        </div>
      `;

      this.rootElem.querySelector('#btn-cancel-join-req')?.addEventListener('click', () => {
        if (this.pendingRequestId) {
          this.callbacks.onCancelJoinRequest?.(this.pendingRequestId);
        }
        this.pendingRequestId = null;
        soundManager.playClick();
        this.render();
      });
      return;
    }

    this.rootElem.innerHTML = `
      <div style="
        width: 580px;
        max-width: 95vw;
        background: #0f172a;
        border: 2px solid #334155;
        border-radius: 14px;
        padding: 24px;
        color: #f8fafc;
        display: flex;
        flex-direction: column;
        gap: 16px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7);
      ">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e293b; padding-bottom: 12px;">
          <div>
            <h2 class="cinzel" style="font-size: 22px; color: #4ade80; font-weight: 700;">Join LAN War Room</h2>
            <div style="font-size: 12px; color: #94a3b8; margin-top: 2px;">Local Wi-Fi & Wired Network Skirmish</div>
          </div>
          <button id="btn-refresh-rooms" style="background: #1e293b; border: 1px solid #334155; color: #38bdf8; border-radius: 6px; padding: 6px 12px; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 6px;">
            <span>🔄</span> <span>${this.isSearchingRooms ? 'Scanning...' : 'Scan / Refresh'}</span>
          </button>
        </div>

        ${this.joinError ? `
          <div style="background: rgba(220, 38, 38, 0.2); border: 1px solid #ef4444; border-radius: 8px; padding: 10px 14px; font-size: 13px; color: #fca5a5; display: flex; align-items: center; gap: 8px;">
            <span>⚠️</span> <span>${escapeHtml(this.joinError)}</span>
          </div>
        ` : ''}

        <!-- Commander Profile Setup -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 12px;">
          <div>
            <label style="font-size: 11px; color: #94a3b8; display: block; margin-bottom: 4px; font-weight: 600;">Your Commander Name</label>
            <input id="join-name" type="text" value="${escapeHtml(this.joinCommanderName)}" maxlength="20" style="width: 100%; background: #0f172a; border: 1px solid #334155; color: white; border-radius: 6px; padding: 6px 10px; font-size: 13px;" />
          </div>
          <div>
            <label style="font-size: 11px; color: #94a3b8; display: block; margin-bottom: 4px; font-weight: 600;">Your Civilization</label>
            <select id="join-civ" style="width: 100%; background: #0f172a; border: 1px solid #334155; color: white; border-radius: 6px; padding: 6px 10px; font-size: 13px;">
              ${Object.keys(CIVILIZATIONS).map(c => `<option value="${c}" ${c === this.joinCommanderCiv ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>
        </div>

        <!-- Discovered Active Match Rooms -->
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div style="font-size: 12px; font-weight: 700; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.5px;">
              Active Match Rooms on Network (${this.discoveredRooms.length})
            </div>
            <div style="font-size: 11px; color: #64748b;">${this.isSearchingRooms ? 'Searching network...' : 'Auto-detected'}</div>
          </div>

          ${this.discoveredRooms.length === 0 ? `
            <div style="background: #1e293b; border: 1px dashed #475569; border-radius: 8px; padding: 20px; text-align: center; color: #94a3b8;">
              <div style="font-size: 24px; margin-bottom: 6px;">📡</div>
              <div style="font-weight: 600; font-size: 13px; color: #cbd5e1;">No Active Rooms Found Yet</div>
              <div style="font-size: 12px; margin-top: 4px; color: #94a3b8;">
                Make sure your host friend clicked <strong>"Host Local LAN Game"</strong> and opened the War Room.
              </div>
            </div>
          ` : `
            <div style="display: flex; flex-direction: column; gap: 8px; max-height: 220px; overflow-y: auto;">
              ${this.discoveredRooms.map(room => `
                <div style="display: flex; align-items: center; justify-content: space-between; background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 12px 14px;">
                  <div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span style="font-weight: 700; font-size: 14px; color: #f8fafc;">${escapeHtml(room.roomName || `${room.hostName}'s War Room`)}</span>
                      ${room.inGame ? `
                        <span style="background: #78350f; color: #fde68a; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px;">IN MATCH</span>
                      ` : `
                        <span style="background: #14532d; color: #86efac; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px;">IN LOBBY</span>
                      `}
                      ${room.requireApproval ? `
                        <span style="background: #451a03; color: #f59e0b; border: 1px solid #b45309; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px;">🔒 Approval Required</span>
                      ` : `
                        <span style="background: #064e3b; color: #34d399; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px;">🔓 Open</span>
                      `}
                    </div>
                    <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">
                      Host: <strong style="color: #38bdf8;">${escapeHtml(room.hostName)}</strong> (${escapeHtml(room.hostCiv)}) • Map: <strong>${escapeHtml(room.mapType.replace('_', ' '))}</strong> (${room.mapSize}×${room.mapSize}) • <strong>${room.playerCount}/${room.maxPlayers} Players</strong>
                    </div>
                  </div>

                  <div>
                    ${room.requireApproval ? `
                      <button class="btn-ask-join-room" data-room="${escapeHtml(room.roomCode)}" data-hostname="${escapeHtml(room.hostName)}" data-addr="${escapeHtml(room.hostAddress)}" style="background: linear-gradient(180deg, #d97706 0%, #b45309 100%); border: none; color: white; border-radius: 6px; padding: 8px 16px; font-size: 13px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 2px 8px rgba(217, 119, 6, 0.4);">
                        <span>🤝</span> Ask Permission to Join
                      </button>
                    ` : `
                      <button class="btn-direct-join-room" data-room="${escapeHtml(room.roomCode)}" data-addr="${escapeHtml(room.hostAddress)}" style="background: #16a34a; border: none; color: white; border-radius: 6px; padding: 8px 16px; font-size: 13px; font-weight: 700; cursor: pointer;">
                        Join Room →
                      </button>
                    `}
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <!-- Manual LAN IP Connection (Fallback) -->
        <details style="border-top: 1px solid #1e293b; padding-top: 10px; color: #94a3b8;">
          <summary style="font-size: 12px; cursor: pointer; color: #64748b; font-weight: 600;">Direct Manual IP Connect (Advanced / Different Subnet)</summary>
          <div style="margin-top: 10px; display: flex; gap: 10px; align-items: center;">
            <input id="join-address" type="text" value="${escapeHtml(window.location.origin)}" style="flex: 1; background: #1e293b; border: 1px solid #334155; color: #4ade80; font-family: monospace; border-radius: 6px; padding: 8px 10px; font-size: 12px;" />
            <button id="btn-manual-join" style="background: #334155; border: 1px solid #475569; color: white; border-radius: 6px; padding: 8px 14px; font-size: 12px; cursor: pointer; font-weight: 600;">
              Connect by IP
            </button>
          </div>
        </details>

        <!-- Footer -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #1e293b; padding-top: 14px; margin-top: 4px;">
          <button id="btn-back" style="background: transparent; border: 1px solid #475569; color: #94a3b8; border-radius: 6px; padding: 10px 18px; font-size: 13px; cursor: pointer;">
            ← Back
          </button>
        </div>
      </div>
    `;

    this.rootElem.querySelector('#join-name')?.addEventListener('input', (e) => {
      this.joinCommanderName = sanitizeText((e.target as HTMLInputElement).value, 20);
    });

    this.rootElem.querySelector('#join-civ')?.addEventListener('change', (e) => {
      this.joinCommanderCiv = (e.target as HTMLSelectElement).value as CivName;
    });

    this.rootElem.querySelector('#btn-refresh-rooms')?.addEventListener('click', () => {
      soundManager.playClick();
      this.refreshRooms();
    });

    this.rootElem.querySelector('#btn-back')?.addEventListener('click', () => {
      this.stopJoinPolling();
      this.currentModal = 'none';
      soundManager.playClick();
      this.render();
    });

    this.rootElem.querySelectorAll('.btn-ask-join-room').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const roomCode = target.dataset.room || 'MAIN';
        const hostName = target.dataset.hostname || 'Host Commander';
        const addr = target.dataset.addr || window.location.origin;
        const name = sanitizeText(this.joinCommanderName, 20) || 'Ally Commander';
        const civ = this.joinCommanderCiv || 'Veyran Confederacy';
        soundManager.playClick();
        this.setJoinPending('pending', hostName, roomCode);
        this.callbacks.onRequestJoinLan?.(addr, name, civ, roomCode);
      });
    });

    this.rootElem.querySelectorAll('.btn-direct-join-room').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const addr = target.dataset.addr || window.location.origin;
        const name = sanitizeText(this.joinCommanderName, 20) || 'Ally Commander';
        const civ = this.joinCommanderCiv || 'Veyran Confederacy';
        this.stopJoinPolling();
        soundManager.playClick();
        this.callbacks.onJoinLan(addr, name, civ);
      });
    });

    this.rootElem.querySelector('#btn-manual-join')?.addEventListener('click', () => {
      const addr = (this.rootElem.querySelector('#join-address') as HTMLInputElement).value || window.location.origin;
      const name = sanitizeText(this.joinCommanderName, 20) || 'Ally Commander';
      const civ = this.joinCommanderCiv || 'Veyran Confederacy';
      this.stopJoinPolling();
      this.callbacks.onJoinLan(addr, name, civ);
      soundManager.playClick();
    });
  }

  private renderHowToPlay(): void {
    this.rootElem.innerHTML = `
      <div style="
        width: 680px;
        max-width: 90vw;
        max-height: 85vh;
        overflow-y: auto;
        background: #0f172a;
        border: 2px solid #334155;
        border-radius: 14px;
        padding: 26px;
        color: #f8fafc;
        display: flex;
        flex-direction: column;
        gap: 16px;
      ">
        <h2 class="cinzel" style="font-size: 22px; color: #38bdf8;">Field Manual: How to Play</h2>

        <div style="font-size: 13px; color: #cbd5e1; line-height: 1.6; display: flex; flex-direction: column; gap: 12px;">
          <div>
            <strong style="color: #f8fafc;">1. RTS Controls:</strong>
            <ul style="margin-left: 20px; margin-top: 4px;">
              <li><strong>Left-Click & Drag:</strong> Marquee box select multiple units.</li>
              <li><strong>Right-Click Terrain:</strong> Order selected units to march to destination.</li>
              <li><strong>Right-Click Resource:</strong> Workers harvest food, wood, stone, or metal and drop off automatically.</li>
              <li><strong>Right-Click Enemy:</strong> Attack enemy soldiers or fortifications.</li>
              <li><strong>Right-Click Friendly Damaged Building:</strong> Workers repair structure integrity.</li>
              <li><strong>WASD / Arrow Keys or Edge Panning:</strong> Move tactical camera.</li>
              <li><strong>Mouse Wheel:</strong> Smooth zoom in and out.</li>
              <li><strong>Ctrl + 1..9:</strong> Assign control squad. Press number key to recall.</li>
              <li><strong>Esc:</strong> Deselect or cancel building placement.</li>
            </ul>
          </div>

          <div>
            <strong style="color: #f8fafc;">2. Five Core Resources:</strong>
            <ul style="margin-left: 20px; margin-top: 4px;">
              <li>🌾 <strong>Food:</strong> Train workers and soldiers, advance ages.</li>
              <li>🪵 <strong>Wood:</strong> Construct settlement buildings and ranged equipment.</li>
              <li>🪨 <strong>Stone:</strong> Build watchtowers, fortresses, and stone ramparts.</li>
              <li>🪙 <strong>Metal:</strong> Arm cavalry, forge plate armor, assemble siege artillery.</li>
              <li>📜 <strong>Knowledge:</strong> Researched at Academy / generated by Solari to advance ages and unlock technologies.</li>
            </ul>
          </div>

          <div>
            <strong style="color: #f8fafc;">3. Tactical Combat Counter System:</strong>
            <ul style="margin-left: 20px; margin-top: 4px;">
              <li><strong>Spearmen &gt; Cavalry:</strong> Pikes inflict 2.8x damage against mounted riders.</li>
              <li><strong>Cavalry &gt; Ranged & Workers:</strong> High mobility overruns archers and raiding camps.</li>
              <li><strong>Ranged Infantry &gt; Spearmen & Melee:</strong> Standoff arrow volleys pick off unshielded foot soldiers.</li>
              <li><strong>Siege Engines &gt; Buildings:</strong> Catapults and bombards deal 4.5x devastating demolition damage to fortifications.</li>
              <li><strong>Aerial War Dragons &gt; Ground Armies:</strong> Soar freely over rivers, cliffs, and walls to incinerate ground forces and siege engines from above (countered by Marksmen and Watchtowers).</li>
            </ul>
          </div>

          <div>
            <strong style="color: #f8fafc;">4. Four Technology Ages:</strong>
            <p style="margin-top: 4px;">Founding Age → Kingdom Age → Imperial Age → Industrial Age. Advance at your Town Centre to unlock advanced buildings, siege weaponry, and elite champion vanguards.</p>
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end; margin-top: 10px; border-top: 1px solid #1e293b; padding-top: 14px;">
          <button id="btn-back" style="background: #2563eb; border: none; color: white; border-radius: 6px; padding: 10px 24px; font-size: 13px; font-weight: 700; cursor: pointer;">
            Close Manual
          </button>
        </div>
      </div>
    `;

    this.rootElem.querySelector('#btn-back')?.addEventListener('click', () => {
      this.currentModal = 'none';
      soundManager.playClick();
      this.render();
    });
  }

  private renderSettings(): void {
    this.rootElem.innerHTML = `
      <div style="
        width: 440px;
        background: #0f172a;
        border: 2px solid #334155;
        border-radius: 14px;
        padding: 24px;
        color: #f8fafc;
        display: flex;
        flex-direction: column;
        gap: 16px;
      ">
        <h2 class="cinzel" style="font-size: 22px; color: #38bdf8;">Settings & Audio</h2>

        <div style="display: flex; flex-direction: column; gap: 14px;">
          <div>
            <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px;">
              <span>Sound Effects Volume</span>
              <span id="sfx-val">50%</span>
            </div>
            <input id="slider-sfx" type="range" min="0" max="100" value="50" style="width: 100%; accent-color: #38bdf8;" />
          </div>

          <div>
            <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px;">
              <span>Music Volume</span>
              <span id="music-val">30%</span>
            </div>
            <input id="slider-music" type="range" min="0" max="100" value="30" style="width: 100%; accent-color: #38bdf8;" />
          </div>

          <div style="margin-top: 8px;">
            <button id="btn-toggle-fs" style="width: 100%; background: #1e293b; border: 1px solid #475569; color: white; padding: 10px; border-radius: 6px; font-size: 13px; cursor: pointer; font-weight: 600;">
              Toggle Fullscreen Mode
            </button>
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end; margin-top: 14px; border-top: 1px solid #1e293b; padding-top: 14px;">
          <button id="btn-back" style="background: #2563eb; border: none; color: white; border-radius: 6px; padding: 10px 24px; font-size: 13px; font-weight: 700; cursor: pointer;">
            Save & Return
          </button>
        </div>
      </div>
    `;

    const sliderSfx = this.rootElem.querySelector('#slider-sfx') as HTMLInputElement;
    const sliderMusic = this.rootElem.querySelector('#slider-music') as HTMLInputElement;

    sliderSfx?.addEventListener('input', () => {
      const val = parseInt(sliderSfx.value, 10);
      (this.rootElem.querySelector('#sfx-val') as HTMLElement).textContent = `${val}%`;
      soundManager.setSfxVolume(val / 100);
    });

    sliderMusic?.addEventListener('input', () => {
      const val = parseInt(sliderMusic.value, 10);
      (this.rootElem.querySelector('#music-val') as HTMLElement).textContent = `${val}%`;
      soundManager.setMusicVolume(val / 100);
    });

    this.rootElem.querySelector('#btn-toggle-fs')?.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    });

    this.rootElem.querySelector('#btn-back')?.addEventListener('click', () => {
      this.currentModal = 'none';
      soundManager.playClick();
      this.render();
    });
  }
}
