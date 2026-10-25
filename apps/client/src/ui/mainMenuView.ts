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
  onPlayReplay?: (replayData: any) => void;
}

export class MainMenuView {
  public rootElem: HTMLElement;
  private callbacks: MainMenuCallbacks;
  private currentModal: 'none' | 'sp_setup' | 'host_setup' | 'join_setup' | 'how_to_play' | 'settings' = 'none';
  private currentSettingsTab: 'graphics' | 'audio' | 'game' | 'hotkeys' | 'interface' = 'graphics';

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
    this.rootElem.className = 'modal-backdrop interactive aoe-wood-backdrop';
    this.rootElem.style.backdropFilter = 'none';
    container.appendChild(this.rootElem);

    this.render();
  }

  public show(): void {
    this.currentModal = 'none';
    this.stopJoinPolling();
    this.rootElem.style.display = 'flex';
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
      <div class="aoe-parchment-card" style="
        width: 520px;
        padding: 42px 38px;
        text-align: center;
        display: flex;
        flex-direction: column;
        gap: 22px;
      ">
        <!-- 4 Corner Iron Rivets -->
        <div class="aoe-corner-rivet" style="top: 10px; left: 10px;"></div>
        <div class="aoe-corner-rivet" style="top: 10px; right: 10px;"></div>
        <div class="aoe-corner-rivet" style="bottom: 10px; left: 10px;"></div>
        <div class="aoe-corner-rivet" style="bottom: 10px; right: 10px;"></div>

        <!-- Age of Empires Masterpiece Franchise Logo -->
        <div style="display: flex; flex-direction: column; align-items: center;">
          <div style="
            position: relative;
            max-width: 440px;
            width: 100%;
            border-radius: 6px;
            overflow: hidden;
            border: 2px solid #8c6a34;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.75), inset 0 0 20px rgba(0,0,0,0.5);
            margin-bottom: 6px;
            background: #0d0603;
          ">
            <img src="/logo.jpg" alt="Agefront: Nations at War Logo" style="
              width: 100%;
              height: auto;
              max-height: 215px;
              object-fit: cover;
              display: block;
            " />
          </div>
        </div>

        <!-- Crimson Gold Action Buttons (AoE style) -->
        <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 8px;">
          <button id="btn-sp" class="aoe-btn-crimson" style="padding: 14px; font-size: 16px;">
            Single Player Skirmish
          </button>

          <button id="btn-host-lan" class="aoe-btn-crimson" style="padding: 13px; font-size: 15px;">
            Host LAN Game
          </button>

          <button id="btn-join-lan" class="aoe-btn-crimson" style="padding: 13px; font-size: 15px;">
            Join LAN Game
          </button>

          
          <button id="btn-load-replay" class="aoe-btn-crimson" style="padding: 11px; font-size: 13px; opacity: 0.95;">
            Match Replay Viewer (.afr)
          </button>
            <button id="btn-how-to-play" class="aoe-btn-crimson" style="padding: 11px; font-size: 13px; opacity: 0.95;">
            Civilization Codex & Guide
          </button>

          <button id="btn-settings" class="aoe-btn-crimson" style="padding: 11px; font-size: 13px; opacity: 0.95;">
            Options & Audio
          </button>
        </div>

        <div style="font-size: 11px; color: #785a36; font-family: 'Cinzel', serif; letter-spacing: 1px; margin-top: 4px;">
          Age of Empires Historical Tactical RTS Engine
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

    
    this.rootElem.querySelector('#btn-load-replay')?.addEventListener('click', () => {
      soundManager.playClick();
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.afr,.json';
      input.onchange = (e: any) => {
        const file = e.target?.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (re) => {
          try {
            const data = JSON.parse(re.target?.result as string);
            this.callbacks.onPlayReplay?.(data);
          } catch (err) {
            alert('Invalid .afr match replay file format.');
          }
        };
        reader.readAsText(file);
      };
      input.click();
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
      <div class="aoe-parchment-card" style="
        width: 950px;
        max-width: 96vw;
        max-height: 92vh;
        padding: 28px 32px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        overflow-y: auto;
      ">
        <!-- 4 Corner Rivets -->
        <div class="aoe-corner-rivet" style="top: 8px; left: 8px;"></div>
        <div class="aoe-corner-rivet" style="top: 8px; right: 8px;"></div>
        <div class="aoe-corner-rivet" style="bottom: 8px; left: 8px;"></div>
        <div class="aoe-corner-rivet" style="bottom: 8px; right: 8px;"></div>

        <!-- Header Banner (Image 1 style) -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #8c6a34; padding-bottom: 10px;">
          <div>
            <h2 class="cinzel" style="font-size: 24px; font-weight: 900; color: #451a03; margin: 0; letter-spacing: 2px;">
              SKIRMISH WAR ROOM &bull; GAME SETTINGS
            </h2>
            <div style="font-size: 12px; color: #78350f; font-weight: 600; margin-top: 2px;">
              Age of Empires Tactical Commanders Roster & Battlefield Setup
            </div>
          </div>
          <div style="text-align: right; background: rgba(255,255,255,0.4); border: 1.5px solid #a88a53; border-radius: 4px; padding: 4px 12px;">
            <div style="font-size: 10px; color: #78350f; text-transform: uppercase; font-weight: 700;">Allied Dynamic</div>
            <div class="cinzel" style="font-size: 12px; font-weight: 800; color: #991b1b;">
              ${allyCount > 0 ? `You + ${allyCount} Allies` : 'Solo Commander'} vs ${enemyCount} Enemies
            </div>
          </div>
        </div>

        <!-- Format Preset Selector -->
        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <span class="cinzel" style="font-size: 11px; font-weight: 700; color: #451a03; text-transform: uppercase;">
            Match Presets:
          </span>
          ${presetLabels.map(p => `
            <button class="btn-preset ${this.skirmishFormat === p.id ? 'active-preset aoe-btn-crimson' : ''}" data-format="${p.id}" style="
              ${this.skirmishFormat === p.id ? '' : 'background: #e6ce9f; border: 1.5px solid #8c6a34; color: #451a03; border-radius: 3px;'}
              padding: 4px 10px;
              font-family: 'Cinzel', serif;
              font-size: 11px;
              font-weight: 700;
              cursor: pointer;
            ">
              ${p.label}
            </button>
          `).join('')}
        </div>

        <!-- 2-Column War Room Setup (Exact layout of Image 1) -->
        <div style="display: grid; grid-template-columns: 1.35fr 1fr; gap: 18px;">
          <!-- Left: Commanders Roster (Exact Image 1 table) -->
          <div class="aoe-parchment-inner" style="padding: 12px 14px; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <!-- Table Headers: Player, Civilization, Team -->
              <div style="display: grid; grid-template-columns: 24px 1.4fr 1.2fr 80px 24px; gap: 8px; align-items: center; border-bottom: 2px solid #8c6a34; padding-bottom: 6px; margin-bottom: 8px;">
                <span></span>
                <span class="cinzel" style="font-weight: 800; font-size: 12px; color: #451a03; text-transform: uppercase;">Player</span>
                <span class="cinzel" style="font-weight: 800; font-size: 12px; color: #451a03; text-transform: uppercase;">Civilization</span>
                <span class="cinzel" style="font-weight: 800; font-size: 12px; color: #451a03; text-transform: uppercase; text-align: center;">Team</span>
                <span></span>
              </div>

              <!-- Roster Cards Container -->
              <div id="roster-container" style="display: flex; flex-direction: column; gap: 6px; max-height: 290px; overflow-y: auto; padding-right: 4px;">
                ${this.skirmishRoster.map((c, idx) => {
                  const isPlayer = !c.isAi;
                  const playerColors = ['#1d4ed8', '#dc2626', '#16a34a', '#ca8a04', '#0284c7', '#9333ea', '#ea580c', '#475569'];
                  const color = playerColors[idx % playerColors.length];

                  return `
                    <div style="
                      display: grid;
                      grid-template-columns: 24px 1.4fr 1.2fr 80px 24px;
                      gap: 8px;
                      align-items: center;
                      background: rgba(255, 255, 255, 0.45);
                      border: 1px solid #b89758;
                      border-radius: 3px;
                      padding: 4px 6px;
                    ">
                      <!-- Colored Number Badge (Image 1 style) -->
                      <div style="
                        width: 22px;
                        height: 22px;
                        background: ${color};
                        border: 1.5px solid #ffffff;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.5);
                        color: white;
                        font-family: 'Cinzel', serif;
                        font-weight: 900;
                        font-size: 12px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border-radius: 2px;
                      ">
                        ${idx + 1}
                      </div>

                      <!-- Player Name / AI input -->
                      <div>
                        ${isPlayer ? `
                          <input class="roster-name-input aoe-input" data-index="${idx}" type="text" value="${c.name}" style="width: 100%; height: 26px; padding: 2px 6px;" />
                        ` : `
                          <div style="font-family: 'Cinzel', serif; font-weight: 700; font-size: 12px; color: #2b1809; padding-left: 4px;">
                            ${c.name}
                          </div>
                        `}
                      </div>

                      <!-- Civilization Select (Crimson AoE Button style as seen in Image 1!) -->
                      <div>
                        <select class="roster-civ-select aoe-select" data-index="${idx}" style="
                          width: 100%;
                          height: 26px;
                          background: linear-gradient(180deg, #991b1b 0%, #6e0c0c 100%) !important;
                          color: #fef08a !important;
                          border: 1.5px solid #d4af37 !important;
                          font-family: 'Cinzel', serif;
                          font-weight: 700;
                          font-size: 11px;
                        ">
                          ${civOptions.map(civ => `
                            <option value="${civ}" ${c.civ === civ ? 'selected' : ''}>${civ}</option>
                          `).join('')}
                        </select>
                      </div>

                      <!-- Team Select -->
                      <div>
                        <select class="roster-team-select aoe-select" data-index="${idx}" style="width: 100%; height: 26px; text-align: center;">
                          <option value="1" ${c.team === 1 ? 'selected' : ''}>Team 1</option>
                          <option value="2" ${c.team === 2 ? 'selected' : ''}>Team 2</option>
                          <option value="3" ${c.team === 3 ? 'selected' : ''}>Team 3</option>
                          <option value="4" ${c.team === 4 ? 'selected' : ''}>Team 4</option>
                        </select>
                      </div>

                      <!-- Remove Bot button -->
                      <div>
                        ${!isPlayer ? `
                          <button class="btn-remove-roster" data-index="${idx}" style="background: transparent; border: none; color: #991b1b; font-weight: 900; font-size: 14px; cursor: pointer;">
                            ✕
                          </button>
                        ` : `<span></span>`}
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- Add Buttons -->
            ${totalCount < 8 ? `
              <div style="display: flex; gap: 8px; margin-top: 10px;">
                <button id="btn-add-ally" class="aoe-btn-crimson" style="flex: 1; padding: 6px; font-size: 12px;">
                  + Add AI Ally (Team 1)
                </button>
                <button id="btn-add-enemy" class="aoe-btn-crimson" style="flex: 1; padding: 6px; font-size: 12px;">
                  + Add AI Enemy (Team 2)
                </button>
              </div>
            ` : ''}
          </div>

          <!-- Right: Game Settings (Exact Image 1 panel) -->
          <div class="aoe-parchment-inner" style="padding: 14px; display: flex; flex-direction: column; gap: 10px;">
            <div class="cinzel" style="font-weight: 800; font-size: 13px; color: #451a03; text-transform: uppercase; border-bottom: 2px solid #8c6a34; padding-bottom: 4px; text-align: center;">
              Game Settings
            </div>

            <div style="display: grid; grid-template-columns: 110px 1fr; gap: 6px; align-items: center;">
              <span class="cinzel" style="font-size: 11px; font-weight: 700; color: #451a03;">Game Mode:</span>
              <select class="aoe-select" style="width: 100%;">
                <option>Random Map</option>
                <option>Deathmatch</option>
                <option>Empire Wars</option>
              </select>

              <span class="cinzel" style="font-size: 11px; font-weight: 700; color: #451a03;">Location:</span>
              <select id="sp-map-type" class="aoe-select" style="width: 100%;">
                <option value="green_frontier" ${this.skirmishMapType === 'green_frontier' ? 'selected' : ''}>Green Frontier (Coastal / Valley)</option>
                <option value="highland_kingdom" ${this.skirmishMapType === 'highland_kingdom' ? 'selected' : ''}>Highland Kingdom (Alpine)</option>
                <option value="riverlands" ${this.skirmishMapType === 'riverlands' ? 'selected' : ''}>Riverlands (Rivers & Lakes)</option>
              </select>

              <span class="cinzel" style="font-size: 11px; font-weight: 700; color: #451a03;">Map Size:</span>
              <select id="sp-map-size" class="aoe-select" style="width: 100%;">
                <option value="200" ${this.skirmishMapSize === 200 ? 'selected' : ''}>Tiny (200x200 - 2 Players)</option>
                <option value="240" ${this.skirmishMapSize === 240 ? 'selected' : ''}>Small (240x240 - 3 Players)</option>
                <option value="280" ${this.skirmishMapSize === 280 ? 'selected' : ''}>Standard (280x280 - 4 Players)</option>
                <option value="320" ${this.skirmishMapSize === 320 ? 'selected' : ''}>Large (320x320 - 6 Players)</option>
                <option value="360" ${this.skirmishMapSize === 360 ? 'selected' : ''}>Huge (360x360 - 8 Players)</option>
                <option value="400" ${this.skirmishMapSize === 400 ? 'selected' : ''}>Big Huge (400x400 - Epic)</option>
              </select>

              <span class="cinzel" style="font-size: 11px; font-weight: 700; color: #451a03;">AI Difficulty:</span>
              <select class="aoe-select" style="width: 100%;">
                <option>Standard (Medium)</option>
                <option>Moderate</option>
                <option>Hard</option>
              </select>

              <span class="cinzel" style="font-size: 11px; font-weight: 700; color: #451a03;">Resources:</span>
              <select id="sp-res" class="aoe-select" style="width: 100%;">
                <option value="standard" ${this.skirmishResources === 'standard' ? 'selected' : ''}>Standard Stockpile</option>
                <option value="high" ${this.skirmishResources === 'high' ? 'selected' : ''}>High Resources</option>
                <option value="deathmatch" ${this.skirmishResources === 'deathmatch' ? 'selected' : ''}>Deathmatch Stockpile</option>
              </select>

              <span class="cinzel" style="font-size: 11px; font-weight: 700; color: #451a03;">Population:</span>
              <select class="aoe-select" style="width: 100%;">
                <option>200</option>
                <option>300</option>
                <option>500</option>
              </select>

              <span class="cinzel" style="font-size: 11px; font-weight: 700; color: #451a03;">Victory:</span>
              <select id="sp-victory" class="aoe-select" style="width: 100%;">
                <option value="conquest" ${this.skirmishVictory === 'conquest' ? 'selected' : ''}>Conquest</option>
                <option value="elimination" ${this.skirmishVictory === 'elimination' ? 'selected' : ''}>Total Elimination</option>
                <option value="territorial" ${this.skirmishVictory === 'territorial' ? 'selected' : ''}>Territorial Control</option>
                <option value="technology" ${this.skirmishVictory === 'technology' ? 'selected' : ''}>Technology Mastery</option>
              </select>
            </div>

            <!-- Team & Advanced Settings (Image 1 style) -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; border-top: 1.5px solid #b89758; padding-top: 8px; font-size: 11px; color: #451a03;">
              <div>
                <strong class="cinzel" style="font-size: 11px;">Team Settings</strong>
                <div style="margin-top: 4px; display: flex; flex-direction: column; gap: 3px;">
                  <label><input type="checkbox" checked /> Lock Teams</label>
                  <label><input type="checkbox" checked /> Team Together</label>
                  <label><input type="checkbox" checked /> Team Positions</label>
                </div>
              </div>
              <div>
                <strong class="cinzel" style="font-size: 11px;">Advanced Settings</strong>
                <div style="margin-top: 4px; display: flex; flex-direction: column; gap: 3px;">
                  <label><input type="checkbox" checked /> Allow Cheats</label>
                  <label><input type="checkbox" /> Turbo Mode</label>
                  <label><input type="checkbox" /> Sudden Death</label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Bottom Action Buttons (Exact Image 1 layout) -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 2px solid #8c6a34; padding-top: 12px;">
          <button id="btn-back" class="aoe-btn-crimson" style="padding: 10px 22px; font-size: 13px;">
            Return to Main Menu
          </button>
          <div style="font-size: 11px; color: #78350f; font-family: 'Cinzel', serif; font-weight: 700;">
            Age of Empires Single Player Skirmish
          </div>
          <button id="btn-launch-sp" class="aoe-btn-crimson" style="padding: 12px 36px; font-size: 15px;">
            Start Game ⚔️
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
      <div class="aoe-parchment-card" style="
        width: 500px;
        padding: 32px 30px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      ">
        <div class="aoe-corner-rivet" style="top: 8px; left: 8px;"></div>
        <div class="aoe-corner-rivet" style="top: 8px; right: 8px;"></div>
        <div class="aoe-corner-rivet" style="bottom: 8px; left: 8px;"></div>
        <div class="aoe-corner-rivet" style="bottom: 8px; right: 8px;"></div>

        <div style="border-bottom: 2px solid #8c6a34; padding-bottom: 8px;">
          <h2 class="cinzel" style="font-size: 22px; font-weight: 800; color: #451a03; margin: 0;">Host Local LAN Game</h2>
          <div style="font-size: 12px; color: #78350f; font-weight: 600; margin-top: 2px;">
            Host a match on your local network. Allies can join directly.
          </div>
        </div>

        <div class="aoe-parchment-inner" style="padding: 16px; display: flex; flex-direction: column; gap: 12px;">
          <div>
            <label class="cinzel" style="font-size: 11px; font-weight: 700; color: #451a03; display: block; margin-bottom: 4px;">Host Player Name</label>
            <input id="host-name" class="aoe-input" type="text" value="Host Commander" style="width: 100%; height: 32px;" />
          </div>

          <div>
            <label class="cinzel" style="font-size: 11px; font-weight: 700; color: #451a03; display: block; margin-bottom: 4px;">Civilization</label>
            <select id="host-civ" class="aoe-select" style="width: 100%; height: 32px;">
              ${Object.keys(CIVILIZATIONS).map(c => `<option value="${c}">${c}</option>`).join('')}
            </select>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px; border-top: 2px solid #8c6a34; padding-top: 14px;">
          <button id="btn-back" class="aoe-btn-crimson" style="padding: 8px 18px; font-size: 13px;">
            ← Back
          </button>
          <button id="btn-create-lobby" class="aoe-btn-crimson" style="padding: 10px 24px; font-size: 14px;">
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
        <div class="aoe-parchment-card" style="
          width: 500px;
          padding: 32px 28px;
          display: flex;
          flex-direction: column;
          gap: 18px;
          text-align: center;
          align-items: center;
        ">
          <div class="aoe-corner-rivet" style="top: 8px; left: 8px;"></div>
          <div class="aoe-corner-rivet" style="top: 8px; right: 8px;"></div>
          <div class="aoe-corner-rivet" style="bottom: 8px; left: 8px;"></div>
          <div class="aoe-corner-rivet" style="bottom: 8px; right: 8px;"></div>

          <div style="font-size: 42px;">⏳</div>
          <div>
            <h3 class="cinzel" style="font-size: 22px; font-weight: 800; color: #451a03; margin-bottom: 6px;">Permission Request Sent</h3>
            <p style="font-size: 13px; color: #5c3a1e; line-height: 1.5;">
              Waiting for host <strong style="color: #991b1b;">${escapeHtml(this.pendingHostName)}</strong> to admit you into the War Room...
            </p>
          </div>

          <div style="width: 100%; border-top: 2px solid #8c6a34; padding-top: 14px;">
            <button id="btn-cancel-join-req" class="aoe-btn-crimson" style="padding: 8px 24px; font-size: 13px;">
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
      <div class="aoe-parchment-card" style="
        width: 620px;
        max-width: 95vw;
        padding: 26px 28px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      ">
        <div class="aoe-corner-rivet" style="top: 8px; left: 8px;"></div>
        <div class="aoe-corner-rivet" style="top: 8px; right: 8px;"></div>
        <div class="aoe-corner-rivet" style="bottom: 8px; left: 8px;"></div>
        <div class="aoe-corner-rivet" style="bottom: 8px; right: 8px;"></div>

        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #8c6a34; padding-bottom: 10px;">
          <div>
            <h2 class="cinzel" style="font-size: 22px; font-weight: 800; color: #451a03; margin: 0;">Join LAN War Room</h2>
            <div style="font-size: 12px; color: #78350f; font-weight: 600; margin-top: 2px;">Local Wi-Fi & Wired Network Skirmish</div>
          </div>
          <button id="btn-refresh-rooms" class="aoe-btn-crimson" style="padding: 6px 14px; font-size: 12px;">
            <span>🔄</span> <span>${this.isSearchingRooms ? 'Scanning...' : 'Scan / Refresh'}</span>
          </button>
        </div>

        ${this.joinError ? `
          <div style="background: rgba(185, 28, 28, 0.15); border: 1.5px solid #991b1b; border-radius: 4px; padding: 8px 12px; font-size: 12px; color: #7f1d1d;">
            <span>⚠️</span> <span>${escapeHtml(this.joinError)}</span>
          </div>
        ` : ''}

        <!-- Commander Profile Setup -->
        <div class="aoe-parchment-inner" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 12px;">
          <div>
            <label class="cinzel" style="font-size: 11px; color: #451a03; display: block; margin-bottom: 4px; font-weight: 700;">Commander Name</label>
            <input id="join-name" class="aoe-input" type="text" value="${escapeHtml(this.joinCommanderName)}" maxlength="20" style="width: 100%; height: 30px;" />
          </div>
          <div>
            <label class="cinzel" style="font-size: 11px; color: #451a03; display: block; margin-bottom: 4px; font-weight: 700;">Civilization</label>
            <select id="join-civ" class="aoe-select" style="width: 100%; height: 30px;">
              ${Object.keys(CIVILIZATIONS).map(c => `<option value="${c}" ${c === this.joinCommanderCiv ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>
        </div>

        <!-- Discovered Active Match Rooms -->
        <div>
          <div class="cinzel" style="font-size: 12px; font-weight: 800; color: #451a03; margin-bottom: 6px;">
            Active Match Rooms on Network (${this.discoveredRooms.length})
          </div>

          ${this.discoveredRooms.length === 0 ? `
            <div class="aoe-parchment-inner" style="padding: 20px; text-align: center; color: #5c3a1e;">
              <div style="font-size: 26px; margin-bottom: 6px;">📡</div>
              <div class="cinzel" style="font-weight: 700; font-size: 13px; color: #451a03;">No Active Rooms Found Yet</div>
              <div style="font-size: 12px; margin-top: 4px;">
                Make sure your host friend clicked <strong>"Host Local LAN Game"</strong> and opened the War Room.
              </div>
            </div>
          ` : `
            <div style="display: flex; flex-direction: column; gap: 6px; max-height: 200px; overflow-y: auto;">
              ${this.discoveredRooms.map(room => `
                <div class="aoe-parchment-inner" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px;">
                  <div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span class="cinzel" style="font-weight: 800; font-size: 13px; color: #451a03;">${escapeHtml(room.roomName || `${room.hostName}'s War Room`)}</span>
                      <span style="background: #991b1b; color: #fef08a; font-size: 9px; font-weight: 700; padding: 1px 5px; border-radius: 2px;">
                        ${room.inGame ? 'IN MATCH' : 'IN LOBBY'}
                      </span>
                    </div>
                    <div style="font-size: 11px; color: #5c3a1e; margin-top: 2px;">
                      Host: <strong>${escapeHtml(room.hostName)}</strong> (${escapeHtml(room.hostCiv)}) • Map: <strong>${escapeHtml(room.mapType.replace('_', ' '))}</strong>
                    </div>
                  </div>

                  <div>
                    <button class="${room.requireApproval ? 'btn-ask-join-room' : 'btn-direct-join-room'} aoe-btn-crimson" data-room="${escapeHtml(room.roomCode)}" data-hostname="${escapeHtml(room.hostName)}" data-addr="${escapeHtml(room.hostAddress)}" style="padding: 6px 14px; font-size: 12px;">
                      ${room.requireApproval ? 'Request Join' : 'Join Room →'}
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <!-- Footer -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 2px solid #8c6a34; padding-top: 12px;">
          <button id="btn-back" class="aoe-btn-crimson" style="padding: 8px 20px; font-size: 13px;">
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
      <div class="aoe-parchment-card" style="
        width: 720px;
        max-width: 92vw;
        max-height: 88vh;
        overflow-y: auto;
        padding: 28px 32px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      ">
        <div class="aoe-corner-rivet" style="top: 8px; left: 8px;"></div>
        <div class="aoe-corner-rivet" style="top: 8px; right: 8px;"></div>
        <div class="aoe-corner-rivet" style="bottom: 8px; left: 8px;"></div>
        <div class="aoe-corner-rivet" style="bottom: 8px; right: 8px;"></div>

        <div style="border-bottom: 2px solid #8c6a34; padding-bottom: 8px;">
          <h2 class="cinzel" style="font-size: 22px; font-weight: 800; color: #451a03; margin: 0;">Field Manual: Civilization Codex</h2>
          <div style="font-size: 12px; color: #78350f; font-weight: 600; margin-top: 2px;">Age of Empires Tactical Controls & Unit Combat Counters</div>
        </div>

        <div class="aoe-parchment-inner" style="padding: 16px; font-size: 13px; color: #3b220d; line-height: 1.6; display: flex; flex-direction: column; gap: 12px;">
          <div>
            <strong class="cinzel" style="color: #991b1b; font-size: 13px;">1. Tactical RTS Controls</strong>
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
            <strong class="cinzel" style="color: #991b1b; font-size: 13px;">2. Five Core Historical Resources</strong>
            <ul style="margin-left: 20px; margin-top: 4px;">
              <li>🌾 <strong>Food:</strong> Train workers and soldiers, advance ages.</li>
              <li>🪵 <strong>Wood:</strong> Construct settlement buildings and ranged equipment.</li>
              <li>🪨 <strong>Stone:</strong> Build watchtowers, fortresses, and stone ramparts.</li>
              <li>🪙 <strong>Metal:</strong> Arm cavalry, forge plate armor, assemble siege artillery.</li>
              <li>📜 <strong>Knowledge:</strong> Researched at Academy / generated by Solari to advance ages and unlock technologies.</li>
            </ul>
          </div>

          <div>
            <strong class="cinzel" style="color: #991b1b; font-size: 13px;">3. Tactical Combat Counter System</strong>
            <ul style="margin-left: 20px; margin-top: 4px;">
              <li><strong>Spearmen &gt; Cavalry:</strong> Pikes inflict 2.8x damage against mounted riders.</li>
              <li><strong>Cavalry &gt; Ranged & Workers:</strong> High mobility overruns archers and raiding camps.</li>
              <li><strong>Ranged Infantry &gt; Spearmen & Melee:</strong> Standoff arrow volleys pick off unshielded foot soldiers.</li>
              <li><strong>Siege Engines &gt; Buildings:</strong> Catapults and bombards deal 4.5x devastating demolition damage to fortifications.</li>
              <li><strong>Aerial War Dragons &gt; Ground Armies:</strong> Soar freely over rivers, cliffs, and walls to incinerate ground forces and siege engines from above (countered by Marksmen and Watchtowers).</li>
            </ul>
          </div>

          <div>
            <strong class="cinzel" style="color: #991b1b; font-size: 13px;">4. Four Technology Ages</strong>
            <p style="margin-top: 4px;">Founding Age → Kingdom Age → Imperial Age → Industrial Age. Advance at your Town Centre to unlock advanced buildings, siege weaponry, and elite champion vanguards.</p>
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end; margin-top: 6px; border-top: 2px solid #8c6a34; padding-top: 12px;">
          <button id="btn-back" class="aoe-btn-crimson" style="padding: 8px 24px; font-size: 13px;">
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
    // Determine active tab styling
    const tabs = [
      { id: 'graphics', label: 'Graphics' },
      { id: 'audio', label: 'Audio' },
      { id: 'game', label: 'Game' },
      { id: 'hotkeys', label: 'Hotkeys' },
      { id: 'interface', label: 'Interface' }
    ] as const;

    const tabsHtml = tabs.map(t => {
      const activeClass = this.currentSettingsTab === t.id ? 'active' : '';
      return `<div class="aoe-tab ${activeClass}" data-tab="${t.id}" style="cursor: pointer; user-select: none;">${t.label}</div>`;
    }).join('');

    let contentHtml = '';

    if (this.currentSettingsTab === 'graphics') {
      contentHtml = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <!-- Left Panel: Display & Video Mode -->
          <div class="aoe-parchment-inner" style="padding: 14px; display: flex; flex-direction: column; gap: 12px;">
            <div class="cinzel" style="font-weight: 800; font-size: 12px; color: #451a03; border-bottom: 1.5px solid #a38249; padding-bottom: 4px;">
              Display & Resolution
            </div>

            <div>
              <label class="cinzel" style="font-size: 11px; font-weight: 700; color: #451a03; display: block; margin-bottom: 4px;">Display Mode</label>
              <select class="aoe-select" style="width: 100%;">
                <option>Full Screen Borderless</option>
                <option>Windowed Desktop</option>
              </select>
            </div>

            <div>
              <label class="cinzel" style="font-size: 11px; font-weight: 700; color: #451a03; display: block; margin-bottom: 4px;">Visual Quality Preset</label>
              <select class="aoe-select" style="width: 100%;">
                <option>Ultra (PBR Shading & PCF Soft Shadows)</option>
                <option>High (60 FPS Performance)</option>
                <option>Classic RTS (Low Poly Fidelity)</option>
              </select>
            </div>

            <div style="margin-top: 4px;">
              <button id="btn-toggle-fs" class="aoe-btn-crimson" style="width: 100%; padding: 8px; font-size: 12px;">
                Toggle Fullscreen Mode
              </button>
            </div>

            <div style="display: flex; flex-direction: column; gap: 6px; font-size: 11px; color: #451a03; margin-top: 4px;">
              <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;"><input type="checkbox" checked /> Anti-Aliasing (FXAA 4x)</label>
              <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;"><input type="checkbox" checked /> Cascaded Dynamic Sun Shadows</label>
            </div>
          </div>

          <!-- Right Panel: Water & Terrain -->
          <div class="aoe-parchment-inner" style="padding: 14px; display: flex; flex-direction: column; gap: 12px;">
            <div class="cinzel" style="font-weight: 800; font-size: 12px; color: #451a03; border-bottom: 1.5px solid #a38249; padding-bottom: 4px;">
              Terrain & Water Shaders
            </div>

            <div>
              <label class="cinzel" style="font-size: 11px; font-weight: 700; color: #451a03; display: block; margin-bottom: 4px;">Water Rendering Style</label>
              <select class="aoe-select" style="width: 100%;">
                <option>3D Deep Water & Shore Foam Wave</option>
                <option>Classic Flat Cerulean Surface</option>
              </select>
            </div>

            <div>
              <label class="cinzel" style="font-size: 11px; font-weight: 700; color: #451a03; display: block; margin-bottom: 4px;">Foliage Sway & Wind</label>
              <select class="aoe-select" style="width: 100%;">
                <option>Realistic Ambient Wind Waves</option>
                <option>Static Forest Canopy</option>
              </select>
            </div>

            <div style="display: flex; flex-direction: column; gap: 6px; font-size: 11px; color: #451a03; margin-top: 10px;">
              <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;"><input type="checkbox" checked /> Smooth Elevation Contours</label>
              <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;"><input type="checkbox" checked /> Construction Scaffolding Dust</label>
              <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;"><input type="checkbox" checked /> Explosive Cannon & Siege Smoke</label>
            </div>
          </div>
        </div>
      `;
    } else if (this.currentSettingsTab === 'audio') {
      contentHtml = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <!-- Left Panel: Volume Mixers -->
          <div class="aoe-parchment-inner" style="padding: 14px; display: flex; flex-direction: column; gap: 14px;">
            <div class="cinzel" style="font-weight: 800; font-size: 12px; color: #451a03; border-bottom: 1.5px solid #a38249; padding-bottom: 4px;">
              Volume Master Levels
            </div>

            <div>
              <div class="cinzel" style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 700; color: #451a03; margin-bottom: 4px;">
                <span>Sound Effects (AoE Acoustics)</span>
                <span id="sfx-val" style="color: #991b1b; font-weight: 800;">50%</span>
              </div>
              <input id="slider-sfx" type="range" min="0" max="100" value="50" style="width: 100%; accent-color: #991b1b; cursor: pointer;" />
            </div>

            <div>
              <div class="cinzel" style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 700; color: #451a03; margin-bottom: 4px;">
                <span>Imperial Symphony & Music</span>
                <span id="music-val" style="color: #991b1b; font-weight: 800;">30%</span>
              </div>
              <input id="slider-music" type="range" min="0" max="100" value="30" style="width: 100%; accent-color: #991b1b; cursor: pointer;" />
            </div>

            <div style="display: flex; flex-direction: column; gap: 6px; font-size: 11px; color: #451a03; margin-top: 6px;">
              <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;"><input type="checkbox" checked /> Play Tactical Combat Horns</label>
              <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;"><input type="checkbox" checked /> Civilization Vocal Order Acknowledgement</label>
              <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;"><input type="checkbox" checked /> Nature & Wilderness Ambient Birds</label>
            </div>
          </div>

          <!-- Right Panel: Audio Acoustic Previews -->
          <div class="aoe-parchment-inner" style="padding: 14px; display: flex; flex-direction: column; gap: 10px;">
            <div class="cinzel" style="font-weight: 800; font-size: 12px; color: #451a03; border-bottom: 1.5px solid #a38249; padding-bottom: 4px;">
              Acoustic Sound Previews
            </div>
            <div style="font-size: 11px; color: #78350f; font-family: 'Cinzel', serif; margin-bottom: 4px;">
              Test authentic Age of Empires synthesizers:
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <button id="btn-test-horn" class="aoe-btn-crimson" style="padding: 8px; font-size: 11px;">
                📯 Brass Horn
              </button>
              <button id="btn-test-sword" class="aoe-btn-crimson" style="padding: 8px; font-size: 11px;">
                ⚔️ Sword Clash
              </button>
              <button id="btn-test-hammer" class="aoe-btn-crimson" style="padding: 8px; font-size: 11px;">
                🔨 Masonry Hammer
              </button>
              <button id="btn-test-ageup" class="aoe-btn-crimson" style="padding: 8px; font-size: 11px;">
                🔔 Age Up Carillon
              </button>
            </div>

            <div style="font-size: 10px; color: #573010; font-family: 'Cinzel', serif; margin-top: 8px; line-height: 1.4;">
              Synthesizes real wood-block transients, resonant metallic parries, and majestic dual-tone brass flourishes via Web Audio.
            </div>
          </div>
        </div>
      `;
    } else if (this.currentSettingsTab === 'game') {
      contentHtml = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <!-- Left Panel: Tactical & Controls -->
          <div class="aoe-parchment-inner" style="padding: 14px; display: flex; flex-direction: column; gap: 12px;">
            <div class="cinzel" style="font-weight: 800; font-size: 12px; color: #451a03; border-bottom: 1.5px solid #a38249; padding-bottom: 4px;">
              Tactics & Automation
            </div>

            <div>
              <label class="cinzel" style="font-size: 11px; font-weight: 700; color: #451a03; display: block; margin-bottom: 4px;">Game Simulation Speed</label>
              <select class="aoe-select" style="width: 100%;">
                <option>Normal (1.0x Standard RTS)</option>
                <option>Fast (1.5x Rapid Campaign)</option>
                <option>Epic (2.0x Blitzkrieg)</option>
              </select>
            </div>

            <div>
              <label class="cinzel" style="font-size: 11px; font-weight: 700; color: #451a03; display: block; margin-bottom: 4px;">Right-Click Combat Target Priority</label>
              <select class="aoe-select" style="width: 100%;">
                <option>Threat First (Soldiers > Siege > Forts)</option>
                <option>Standard (Target Clicked Object)</option>
              </select>
            </div>

            <div style="display: flex; flex-direction: column; gap: 6px; font-size: 11px; color: #451a03; margin-top: 4px;">
              <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;"><input type="checkbox" checked /> Auto-Assign Idle Builders to Foundations</label>
              <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;"><input type="checkbox" checked /> Workers Auto-Gather Nearby After Dropoff</label>
              <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;"><input type="checkbox" checked /> Industrial Age Instant Troop Spawns</label>
              <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;"><input type="checkbox" checked /> Idle Citizen Audio Chime Notification</label>
            </div>
          </div>

          <!-- Right Panel: Camera & Navigation -->
          <div class="aoe-parchment-inner" style="padding: 14px; display: flex; flex-direction: column; gap: 12px;">
            <div class="cinzel" style="font-weight: 800; font-size: 12px; color: #451a03; border-bottom: 1.5px solid #a38249; padding-bottom: 4px;">
              Camera Navigation
            </div>

            <div>
              <div class="cinzel" style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 700; color: #451a03; margin-bottom: 4px;">
                <span>Camera Scroll Speed</span>
                <span style="color: #991b1b; font-weight: 800;">1.5x</span>
              </div>
              <input type="range" min="10" max="30" value="15" style="width: 100%; accent-color: #991b1b; cursor: pointer;" />
            </div>

            <div style="display: flex; flex-direction: column; gap: 6px; font-size: 11px; color: #451a03; margin-top: 8px;">
              <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;"><input type="checkbox" checked /> Screen Edge Panning with Mouse</label>
              <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;"><input type="checkbox" checked /> Isometric Camera Pan Smoothing & Inertia</label>
              <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;"><input type="checkbox" checked /> Double-Click Group Selection</label>
              <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;"><input type="checkbox" checked /> Smart Formation Drag Line</label>
            </div>
          </div>
        </div>
      `;
    } else if (this.currentSettingsTab === 'hotkeys') {
      contentHtml = `
        <div class="aoe-parchment-inner" style="padding: 14px; max-height: 280px; overflow-y: auto;">
          <div class="cinzel" style="font-weight: 800; font-size: 12px; color: #451a03; border-bottom: 1.5px solid #a38249; padding-bottom: 4px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
            <span>Keyboard Shortcuts & Command Matrix</span>
            <button id="btn-reset-hotkeys" class="aoe-btn-crimson" style="padding: 4px 10px; font-size: 10px;">
              Reset Hotkeys to Default
            </button>
          </div>

          <table style="width: 100%; border-collapse: collapse; font-size: 11px; color: #2b1809;">
            <thead>
              <tr style="border-bottom: 1.5px solid #8c6a34; text-align: left; font-family: 'Cinzel', serif;">
                <th style="padding: 4px 8px; color: #78350f;">Action Command</th>
                <th style="padding: 4px 8px; color: #78350f;">Primary Key</th>
                <th style="padding: 4px 8px; color: #78350f;">Alternate Key</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom: 1px solid rgba(140, 106, 52, 0.25);">
                <td style="padding: 5px 8px; font-weight: 600;">Command Console / Cheat Code</td>
                <td style="padding: 5px 8px;"><kbd style="background: #2b1809; color: #fef08a; padding: 2px 6px; border-radius: 3px; font-size: 10px;">Enter</kbd></td>
                <td style="padding: 5px 8px; color: #785a36;">—</td>
              </tr>
              <tr style="border-bottom: 1px solid rgba(140, 106, 52, 0.25);">
                <td style="padding: 5px 8px; font-weight: 600;">Select All Idle Citizens</td>
                <td style="padding: 5px 8px;"><kbd style="background: #2b1809; color: #fef08a; padding: 2px 6px; border-radius: 3px; font-size: 10px;">.</kbd></td>
                <td style="padding: 5px 8px;"><kbd style="background: #2b1809; color: #fef08a; padding: 2px 6px; border-radius: 3px; font-size: 10px;">V</kbd></td>
              </tr>
              <tr style="border-bottom: 1px solid rgba(140, 106, 52, 0.25);">
                <td style="padding: 5px 8px; font-weight: 600;">Focus Town Center Capital</td>
                <td style="padding: 5px 8px;"><kbd style="background: #2b1809; color: #fef08a; padding: 2px 6px; border-radius: 3px; font-size: 10px;">H</kbd></td>
                <td style="padding: 5px 8px; color: #785a36;">Space</td>
              </tr>
              <tr style="border-bottom: 1px solid rgba(140, 106, 52, 0.25);">
                <td style="padding: 5px 8px; font-weight: 600;">Barracks Recruitment Queue</td>
                <td style="padding: 5px 8px;"><kbd style="background: #2b1809; color: #fef08a; padding: 2px 6px; border-radius: 3px; font-size: 10px;">Q, W, E, R, T</kbd></td>
                <td style="padding: 5px 8px; color: #785a36;">Grid</td>
              </tr>
              <tr style="border-bottom: 1px solid rgba(140, 106, 52, 0.25);">
                <td style="padding: 5px 8px; font-weight: 600;">Attack Move</td>
                <td style="padding: 5px 8px;"><kbd style="background: #2b1809; color: #fef08a; padding: 2px 6px; border-radius: 3px; font-size: 10px;">A</kbd></td>
                <td style="padding: 5px 8px; color: #785a36;">Right Click</td>
              </tr>
              <tr style="border-bottom: 1px solid rgba(140, 106, 52, 0.25);">
                <td style="padding: 5px 8px; font-weight: 600;">Stop / Hold Position</td>
                <td style="padding: 5px 8px;"><kbd style="background: #2b1809; color: #fef08a; padding: 2px 6px; border-radius: 3px; font-size: 10px;">S</kbd></td>
                <td style="padding: 5px 8px; color: #785a36;">—</td>
              </tr>
              <tr style="border-bottom: 1px solid rgba(140, 106, 52, 0.25);">
                <td style="padding: 5px 8px; font-weight: 600;">Assign Control Group</td>
                <td style="padding: 5px 8px;"><kbd style="background: #2b1809; color: #fef08a; padding: 2px 6px; border-radius: 3px; font-size: 10px;">Ctrl + 1..9</kbd></td>
                <td style="padding: 5px 8px; color: #785a36;">—</td>
              </tr>
              <tr style="border-bottom: 1px solid rgba(140, 106, 52, 0.25);">
                <td style="padding: 5px 8px; font-weight: 600;">Recall Control Group</td>
                <td style="padding: 5px 8px;"><kbd style="background: #2b1809; color: #fef08a; padding: 2px 6px; border-radius: 3px; font-size: 10px;">1..9</kbd></td>
                <td style="padding: 5px 8px; color: #785a36;">Double-tap</td>
              </tr>
              <tr>
                <td style="padding: 5px 8px; font-weight: 600;">Deselect / Pause Game</td>
                <td style="padding: 5px 8px;"><kbd style="background: #2b1809; color: #fef08a; padding: 2px 6px; border-radius: 3px; font-size: 10px;">Escape</kbd></td>
                <td style="padding: 5px 8px; color: #785a36;">F10</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    } else if (this.currentSettingsTab === 'interface') {
      contentHtml = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <!-- Left Panel: HUD Styling -->
          <div class="aoe-parchment-inner" style="padding: 14px; display: flex; flex-direction: column; gap: 12px;">
            <div class="cinzel" style="font-weight: 800; font-size: 12px; color: #451a03; border-bottom: 1.5px solid #a38249; padding-bottom: 4px;">
              Interface Theme & Style
            </div>

            <div>
              <label class="cinzel" style="font-size: 11px; font-weight: 700; color: #451a03; display: block; margin-bottom: 4px;">Console HUD Framework</label>
              <select class="aoe-select" style="width: 100%;">
                <option>Age of Empires III Definitive Wood & Parchment</option>
                <option>Imperial Gilded Bronze</option>
              </select>
            </div>

            <div>
              <label class="cinzel" style="font-size: 11px; font-weight: 700; color: #451a03; display: block; margin-bottom: 4px;">Unit Overhead Status</label>
              <select class="aoe-select" style="width: 100%;">
                <option>Always Show Unit Health & Morale</option>
                <option>Show On Damage Or Selection</option>
              </select>
            </div>

            <div style="display: flex; flex-direction: column; gap: 6px; font-size: 11px; color: #451a03; margin-top: 6px;">
              <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;"><input type="checkbox" checked /> Show Tactical Damage Numbers</label>
              <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;"><input type="checkbox" checked /> Resource Production Rates (+X/min)</label>
            </div>
          </div>

          <!-- Right Panel: Minimap & Fog -->
          <div class="aoe-parchment-inner" style="padding: 14px; display: flex; flex-direction: column; gap: 12px;">
            <div class="cinzel" style="font-weight: 800; font-size: 12px; color: #451a03; border-bottom: 1.5px solid #a38249; padding-bottom: 4px;">
              Minimap & Radar
            </div>

            <div>
              <label class="cinzel" style="font-size: 11px; font-weight: 700; color: #451a03; display: block; margin-bottom: 4px;">Minimap Display Size</label>
              <select class="aoe-select" style="width: 100%;">
                <option>Standard Historical Radar (210px)</option>
                <option>Expanded Command Radar (260px)</option>
              </select>
            </div>

            <div style="display: flex; flex-direction: column; gap: 6px; font-size: 11px; color: #451a03; margin-top: 8px;">
              <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;"><input type="checkbox" checked /> High Contrast Military Radar Dots</label>
              <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;"><input type="checkbox" checked /> Show Camera Frustum Trapezoid</label>
              <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;"><input type="checkbox" checked /> Display Imperial Match Clock</label>
            </div>
          </div>
        </div>
      `;
    }

    this.rootElem.innerHTML = `
      <!-- Age of Empires Options Window -->
      <div style="display: flex; flex-direction: column; width: 740px; max-width: 95vw;">
        <!-- Top Folder Tabs -->
        <div style="display: flex; gap: 4px; padding-left: 20px;">
          ${tabsHtml}
        </div>

        <!-- Main Parchment Card -->
        <div class="aoe-parchment-card" style="
          padding: 24px 28px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        ">
          <!-- 4 Corner Rivets -->
          <div class="aoe-corner-rivet" style="top: 8px; left: 8px;"></div>
          <div class="aoe-corner-rivet" style="top: 8px; right: 8px;"></div>
          <div class="aoe-corner-rivet" style="bottom: 8px; left: 8px;"></div>
          <div class="aoe-corner-rivet" style="bottom: 8px; right: 8px;"></div>

          <!-- Ornate Filigree Header Ribbon -->
          <div style="text-align: center; border-bottom: 2px solid #8c6a34; padding-bottom: 8px;">
            <div style="font-size: 13px; color: #854d0e; letter-spacing: 4px;">⚜ &bull; ⚜ &bull; ⚜</div>
            <h2 class="cinzel" style="font-size: 22px; font-weight: 800; color: #451a03; margin: 2px 0;">
              Options — ${tabs.find(t => t.id === this.currentSettingsTab)?.label}
            </h2>
            <div style="font-size: 11px; color: #78350f; font-family: 'Cinzel', serif;">
              Age of Empires Tactical Visual & Audio Configuration
            </div>
          </div>

          <!-- Tab Content Body -->
          <div id="settings-tab-content">
            ${contentHtml}
          </div>

          <!-- Bottom Action Buttons -->
          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 2px solid #8c6a34; padding-top: 14px;">
            <button id="btn-confirm-settings" class="aoe-btn-crimson" style="padding: 10px 24px; font-size: 13px;">
              Confirm & Save
            </button>
            <button id="btn-cancel-settings" class="aoe-btn-crimson" style="padding: 10px 24px; font-size: 13px; opacity: 0.9;">
              Cancel
            </button>
            <button id="btn-reset-defaults" class="aoe-btn-crimson" style="padding: 10px 20px; font-size: 13px; opacity: 0.85;">
              Reset to Defaults
            </button>
          </div>
        </div>
      </div>
    `;

    // Connect top tab click handlers
    this.rootElem.querySelectorAll('.aoe-tab[data-tab]').forEach(tabElem => {
      tabElem.addEventListener('click', () => {
        const targetTab = tabElem.getAttribute('data-tab') as any;
        if (targetTab && targetTab !== this.currentSettingsTab) {
          this.currentSettingsTab = targetTab;
          soundManager.playClick();
          this.renderSettings();
        }
      });
    });

    // Audio Tab listeners (if present)
    const sliderSfx = this.rootElem.querySelector('#slider-sfx') as HTMLInputElement;
    const sliderMusic = this.rootElem.querySelector('#slider-music') as HTMLInputElement;

    sliderSfx?.addEventListener('input', () => {
      const val = parseInt(sliderSfx.value, 10);
      const valElem = this.rootElem.querySelector('#sfx-val');
      if (valElem) valElem.textContent = `${val}%`;
      soundManager.setSfxVolume(val / 100);
    });

    sliderMusic?.addEventListener('input', () => {
      const val = parseInt(sliderMusic.value, 10);
      const valElem = this.rootElem.querySelector('#music-val');
      if (valElem) valElem.textContent = `${val}%`;
      soundManager.setMusicVolume(val / 100);
    });

    // Sound preview buttons
    this.rootElem.querySelector('#btn-test-horn')?.addEventListener('click', () => {
      soundManager.playSelect();
    });
    this.rootElem.querySelector('#btn-test-sword')?.addEventListener('click', () => {
      soundManager.playAttack();
    });
    this.rootElem.querySelector('#btn-test-hammer')?.addEventListener('click', () => {
      soundManager.playBuild();
    });
    this.rootElem.querySelector('#btn-test-ageup')?.addEventListener('click', () => {
      soundManager.playAgeUp();
    });

    // Hotkey Reset listener
    this.rootElem.querySelector('#btn-reset-hotkeys')?.addEventListener('click', () => {
      soundManager.playOrder();
      const btn = this.rootElem.querySelector('#btn-reset-hotkeys') as HTMLButtonElement;
      if (btn) {
        btn.textContent = '✓ Defaults Restored';
        setTimeout(() => {
          if (btn) btn.textContent = 'Reset Hotkeys to Default';
        }, 1500);
      }
    });

    // Fullscreen toggle button
    this.rootElem.querySelector('#btn-toggle-fs')?.addEventListener('click', () => {
      soundManager.playClick();
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    });

    // Bottom action buttons
    this.rootElem.querySelector('#btn-confirm-settings')?.addEventListener('click', () => {
      soundManager.playSelect();
      this.currentModal = 'none';
      this.render();
    });

    this.rootElem.querySelector('#btn-cancel-settings')?.addEventListener('click', () => {
      soundManager.playClick();
      this.currentModal = 'none';
      this.render();
    });

    this.rootElem.querySelector('#btn-reset-defaults')?.addEventListener('click', () => {
      soundManager.playClick();
      soundManager.setSfxVolume(0.5);
      soundManager.setMusicVolume(0.3);
      this.renderSettings();
    });
  }
}
