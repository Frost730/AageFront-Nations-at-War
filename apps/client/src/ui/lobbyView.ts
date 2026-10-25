import {
  LobbyState,
  CivName,
  CIVILIZATIONS,
  MapType,
  VictoryConditionType,
  AIDifficulty,
  escapeHtml
} from '@agefront/shared';
import { soundManager } from '../audio/soundManager.js';

export interface LobbyCallbacks {
  onUpdatePlayer: (civ: CivName, team: number, isReady: boolean) => void;
  onUpdateSettings: (settings: any) => void;
  onAddAi: (civ: CivName, team: number) => void;
  onRemoveAi: (aiId: string) => void;
  onStartGame: () => void;
  onLeave: () => void;
  onApproveJoin?: (requestId: string) => void;
  onDeclineJoin?: (requestId: string) => void;
  onSetApprovalRequired?: (requireApproval: boolean) => void;
  onSetPrivate?: (isPrivate: boolean) => void;
}

export class LobbyView {
  public rootElem: HTMLElement;
  private callbacks: LobbyCallbacks;
  private currentLobbyState: LobbyState | null = null;
  private myPlayerId: string = '';

  constructor(container: HTMLElement, callbacks: LobbyCallbacks) {
    this.callbacks = callbacks;
    this.rootElem = document.createElement('div');
    this.rootElem.className = 'modal-backdrop interactive aoe-wood-backdrop';
    container.appendChild(this.rootElem);
  }

  public setMyPlayerId(id: string): void {
    this.myPlayerId = id;
  }

  public update(state: LobbyState): void {
    this.currentLobbyState = state;
    this.render();
  }

  public show(): void {
    this.rootElem.style.display = 'flex';
  }

  public hide(): void {
    this.rootElem.style.display = 'none';
  }

  private render(): void {
    if (!this.currentLobbyState) return;
    const state = this.currentLobbyState;
    const me = state.players.find(p => p.id === this.myPlayerId) || state.players[0];
    const isHost = me ? me.isHost : false;

    this.rootElem.innerHTML = `
      <div class="aoe-parchment-card" style="
        width: 880px;
        max-width: 96vw;
        max-height: 92vh;
        padding: 28px 32px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        overflow-y: auto;
      ">
        <div class="aoe-corner-rivet" style="top: 8px; left: 8px;"></div>
        <div class="aoe-corner-rivet" style="top: 8px; right: 8px;"></div>
        <div class="aoe-corner-rivet" style="bottom: 8px; left: 8px;"></div>
        <div class="aoe-corner-rivet" style="bottom: 8px; right: 8px;"></div>

        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #8c6a34; padding-bottom: 10px;">
          <div>
            <h2 class="cinzel" style="font-size: 24px; font-weight: 900; color: #451a03; margin: 0; letter-spacing: 2px;">
              LAN WAR ROOM LOBBY
            </h2>
            <div style="font-size: 12px; color: #78350f; font-weight: 600; margin-top: 2px;">
              Age of Empires Local Co-op & Multiplayer Skirmish
            </div>
          </div>
          <div style="text-align: right; background: rgba(255,255,255,0.45); border: 1.5px solid #a88a53; border-radius: 4px; padding: 4px 12px;">
            <div class="cinzel" style="font-size: 10px; color: #78350f; text-transform: uppercase; font-weight: 700;">Host Network IP</div>
            <div style="font-family: monospace; font-size: 14px; color: #991b1b; font-weight: 700;">${escapeHtml(state.hostAddress)}</div>
          </div>
        </div>

        <!-- Incoming Join Requests (Host Only) -->
        ${isHost && state.pendingRequests && state.pendingRequests.length > 0 ? `
          <div style="background: rgba(180, 83, 9, 0.15); border: 2px solid #b45309; border-radius: 4px; padding: 12px 16px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
              <div class="cinzel" style="font-weight: 800; color: #991b1b; font-size: 13px;">
                🔔 INCOMING JOIN REQUESTS (${state.pendingRequests.length})
              </div>
              <span style="font-size: 11px; color: #78350f;">Allied player requesting entry</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 6px;">
              ${state.pendingRequests.map(req => `
                <div class="aoe-parchment-inner" style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px;">
                  <div>
                    <div class="cinzel" style="font-weight: 800; font-size: 13px; color: #451a03;">${escapeHtml(req.name)}</div>
                    <div style="font-size: 11px; color: #5c3a1e;">Civilization: <strong>${escapeHtml(req.civ)}</strong> • Preferred Team: <strong>Team ${req.team}</strong></div>
                  </div>
                  <div style="display: flex; gap: 8px;">
                    <button class="btn-approve-join aoe-btn-crimson" data-id="${req.requestId}" style="padding: 6px 14px; font-size: 11px;">
                      Approve & Admit
                    </button>
                    <button class="btn-decline-join" data-id="${req.requestId}" style="background: transparent; border: 1px solid #991b1b; color: #991b1b; font-family: 'Cinzel', serif; border-radius: 3px; padding: 6px 12px; font-size: 11px; font-weight: 700; cursor: pointer;">
                      Decline
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Middle Content: Players Roster & Match Settings -->
        <div style="display: grid; grid-template-columns: 1.35fr 1fr; gap: 18px;">
          <!-- Left: Player Roster -->
          <div class="aoe-parchment-inner" style="padding: 14px; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div class="cinzel" style="font-weight: 800; font-size: 13px; color: #451a03; border-bottom: 2px solid #8c6a34; padding-bottom: 6px; margin-bottom: 10px; display: flex; justify-content: space-between;">
                <span>ACTIVE COMMANDERS (${state.players.length}/8)</span>
                <span style="font-size: 11px; color: #78350f;">Team 1 = Allies</span>
              </div>
              <div id="roster-list" style="display: flex; flex-direction: column; gap: 6px;">
                ${state.players.map(p => `
                  <div style="
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    background: rgba(255, 255, 255, 0.45);
                    border: 1px solid #b89758;
                    border-radius: 3px;
                    padding: 8px 10px;
                  ">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <div style="width: 14px; height: 14px; border-radius: 2px; background: ${p.color}; border: 1px solid #000;"></div>
                      <div>
                        <div class="cinzel" style="font-weight: 800; font-size: 12px; color: #451a03;">
                          ${escapeHtml(p.name)} ${p.isHost ? '<span style="color: #991b1b; font-size: 10px;">[HOST]</span>' : ''}
                        </div>
                        <div style="font-size: 11px; color: #5c3a1e;">${escapeHtml(p.civ)} • Team ${p.team}</div>
                      </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span class="cinzel" style="font-size: 11px; font-weight: 800; color: ${p.isReady ? '#15803d' : '#991b1b'};">
                        ${p.isReady ? 'READY ✓' : 'NOT READY'}
                      </span>
                      ${isHost && p.isAi ? `<button class="btn-remove-ai" data-id="${p.id}" style="background: transparent; border: none; color: #991b1b; font-weight: 900; font-size: 13px; cursor: pointer;">✕</button>` : ''}
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- Add AI button (Host only) -->
            ${isHost && state.players.length < 8 ? `
              <div style="margin-top: 12px; display: flex; gap: 8px;">
                <button id="btn-add-ai-enemy" class="aoe-btn-crimson" style="flex: 1; padding: 6px; font-size: 11px;">
                  + Add AI Enemy (Team 2)
                </button>
                <button id="btn-add-ai-ally" class="aoe-btn-crimson" style="flex: 1; padding: 6px; font-size: 11px;">
                  + Add AI Ally (Team 1)
                </button>
              </div>
            ` : ''}
          </div>

          <!-- Right: Game Settings -->
          <div class="aoe-parchment-inner" style="padding: 14px; display: flex; flex-direction: column; gap: 10px;">
            <div class="cinzel" style="font-weight: 800; font-size: 13px; color: #451a03; border-bottom: 2px solid #8c6a34; padding-bottom: 4px; text-align: center;">
              MATCH CONFIGURATION
            </div>

            <div>
              <label class="cinzel" style="font-size: 11px; font-weight: 700; color: #451a03; display: block; margin-bottom: 2px;">My Civilization</label>
              <select id="select-my-civ" class="aoe-select" style="width: 100%;">
                ${Object.keys(CIVILIZATIONS).map(civ => `
                  <option value="${civ}" ${me && me.civ === civ ? 'selected' : ''}>${civ}</option>
                `).join('')}
              </select>
            </div>

            <div>
              <label class="cinzel" style="font-size: 11px; font-weight: 700; color: #451a03; display: block; margin-bottom: 2px;">My Team</label>
              <select id="select-my-team" class="aoe-select" style="width: 100%;">
                <option value="1" ${me && me.team === 1 ? 'selected' : ''}>Team 1 (Human Co-op / Allies)</option>
                <option value="2" ${me && me.team === 2 ? 'selected' : ''}>Team 2 (Opponents)</option>
                <option value="3" ${me && me.team === 3 ? 'selected' : ''}>Team 3 (Opponents)</option>
                <option value="4" ${me && me.team === 4 ? 'selected' : ''}>Team 4 (Opponents)</option>
              </select>
            </div>

            <div>
              <label class="cinzel" style="font-size: 11px; font-weight: 700; color: #451a03; display: block; margin-bottom: 2px;">Map Size</label>
              <select id="select-map-size" class="aoe-select" ${!isHost ? 'disabled' : ''} style="width: 100%;">
                <option value="200" ${state.settings.mapSize === 200 ? 'selected' : ''}>Arena (200×200) — RoN Duel</option>
                <option value="240" ${state.settings.mapSize === 240 ? 'selected' : ''}>Small (240×240) — RoN 2–3 Players</option>
                <option value="280" ${state.settings.mapSize === 280 || !state.settings.mapSize ? 'selected' : ''}>Standard (280×280) — RoN 4 Players</option>
                <option value="320" ${state.settings.mapSize === 320 ? 'selected' : ''}>Large (320×320) — RoN 5–6 Players</option>
                <option value="360" ${state.settings.mapSize === 360 ? 'selected' : ''}>Huge (360×360) — RoN 7–8 Players</option>
                <option value="400" ${state.settings.mapSize === 400 ? 'selected' : ''}>Big Huge (400×400) — RoN World War</option>
              </select>
            </div>

            <div>
              <label class="cinzel" style="font-size: 11px; font-weight: 700; color: #451a03; display: block; margin-bottom: 2px;">Battlefield Terrain</label>
              <select id="select-map-type" class="aoe-select" ${!isHost ? 'disabled' : ''} style="width: 100%;">
                <option value="green_frontier" ${state.settings.mapType === 'green_frontier' ? 'selected' : ''}>Green Frontier (Lush Forests)</option>
                <option value="highland_kingdom" ${state.settings.mapType === 'highland_kingdom' ? 'selected' : ''}>Highland Kingdom (Mountains)</option>
                <option value="riverlands" ${state.settings.mapType === 'riverlands' ? 'selected' : ''}>Riverlands (Rivers & Valleys)</option>
              </select>
            </div>

            <div>
              <label class="cinzel" style="font-size: 11px; font-weight: 700; color: #451a03; display: block; margin-bottom: 2px;">AI Difficulty</label>
              <select id="select-ai-diff" class="aoe-select" ${!isHost ? 'disabled' : ''} style="width: 100%;">
                <option value="easy" ${state.settings.aiDifficulty === 'easy' ? 'selected' : ''}>Easy (Relaxed Expansion)</option>
                <option value="medium" ${state.settings.aiDifficulty === 'medium' ? 'selected' : ''}>Medium (Standard Tactical)</option>
                <option value="hard" ${state.settings.aiDifficulty === 'hard' ? 'selected' : ''}>Hard (Aggressive Tactical)</option>
              </select>
            </div>

            <div>
              <label class="cinzel" style="font-size: 11px; font-weight: 700; color: #451a03; display: block; margin-bottom: 2px;">Victory Condition</label>
              <select id="select-victory" class="aoe-select" ${!isHost ? 'disabled' : ''} style="width: 100%;">
                <option value="conquest" ${state.settings.victoryCondition === 'conquest' ? 'selected' : ''}>Conquest</option>
                <option value="territorial" ${state.settings.victoryCondition === 'territorial' ? 'selected' : ''}>Territorial Control</option>
                <option value="technology" ${state.settings.victoryCondition === 'technology' ? 'selected' : ''}>Technology Victory</option>
                <option value="elimination" ${state.settings.victoryCondition === 'elimination' ? 'selected' : ''}>Total Elimination</option>
              </select>
            </div>

            ${isHost ? `
              <div style="display: flex; flex-direction: column; gap: 4px; margin-top: 4px; font-size: 11px; color: #451a03;">
                <label><input type="checkbox" id="check-require-approval" ${state.requireApproval !== false ? 'checked' : ''} /> Require Host Approval to Join</label>
                <label><input type="checkbox" id="check-room-private" ${state.isPrivate ? 'checked' : ''} /> Private Room (Direct IP Only)</label>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Footer Buttons -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 2px solid #8c6a34; padding-top: 14px;">
          <button id="btn-leave-lobby" class="aoe-btn-crimson" style="padding: 10px 22px; font-size: 13px;">
            Leave Lobby
          </button>

          <div style="display: flex; gap: 12px;">
            ${!isHost ? `
              <button id="btn-toggle-ready" class="aoe-btn-crimson" style="padding: 10px 26px; font-size: 14px;">
                ${me && me.isReady ? 'READY ✓' : 'READY UP'}
              </button>
            ` : ''}

            ${isHost ? `
              <button id="btn-start-match" class="aoe-btn-crimson" style="padding: 12px 36px; font-size: 15px;">
                START MATCH ⚔️
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners(isHost, me);
  }

  private attachEventListeners(isHost: boolean, me: any): void {
    const civSelect = this.rootElem.querySelector('#select-my-civ') as HTMLSelectElement;
    const teamSelect = this.rootElem.querySelector('#select-my-team') as HTMLSelectElement;

    civSelect?.addEventListener('change', () => {
      this.callbacks.onUpdatePlayer(civSelect.value as CivName, parseInt(teamSelect.value, 10), me?.isReady ?? true);
      soundManager.playClick();
    });

    teamSelect?.addEventListener('change', () => {
      this.callbacks.onUpdatePlayer(civSelect.value as CivName, parseInt(teamSelect.value, 10), me?.isReady ?? true);
      soundManager.playClick();
    });

    if (isHost) {
      // Join approval handlers
      this.rootElem.querySelectorAll('.btn-approve-join').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const reqId = (e.currentTarget as HTMLElement).getAttribute('data-id');
          if (reqId) {
            this.callbacks.onApproveJoin?.(reqId);
            soundManager.playOrder();
          }
        });
      });

      this.rootElem.querySelectorAll('.btn-decline-join').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const reqId = (e.currentTarget as HTMLElement).getAttribute('data-id');
          if (reqId) {
            this.callbacks.onDeclineJoin?.(reqId);
            soundManager.playClick();
          }
        });
      });

      const approvalCheck = this.rootElem.querySelector('#check-require-approval') as HTMLInputElement;
      approvalCheck?.addEventListener('change', () => {
        this.callbacks.onSetApprovalRequired?.(approvalCheck.checked);
        soundManager.playClick();
      });

      const privateCheck = this.rootElem.querySelector('#check-room-private') as HTMLInputElement;
      privateCheck?.addEventListener('change', () => {
        this.callbacks.onSetPrivate?.(privateCheck.checked);
        soundManager.playClick();
      });
      const mapSizeSelect = this.rootElem.querySelector('#select-map-size') as HTMLSelectElement;
      mapSizeSelect?.addEventListener('change', () => {
        this.callbacks.onUpdateSettings({ mapSize: parseInt(mapSizeSelect.value, 10) });
        soundManager.playClick();
      });

      const mapSelect = this.rootElem.querySelector('#select-map-type') as HTMLSelectElement;
      mapSelect?.addEventListener('change', () => {
        this.callbacks.onUpdateSettings({ mapType: mapSelect.value as MapType });
        soundManager.playClick();
      });

      const aiDiffSelect = this.rootElem.querySelector('#select-ai-diff') as HTMLSelectElement;
      aiDiffSelect?.addEventListener('change', () => {
        this.callbacks.onUpdateSettings({ aiDifficulty: aiDiffSelect.value as AIDifficulty });
        soundManager.playClick();
      });

      const victorySelect = this.rootElem.querySelector('#select-victory') as HTMLSelectElement;
      victorySelect?.addEventListener('change', () => {
        this.callbacks.onUpdateSettings({ victoryCondition: victorySelect.value as VictoryConditionType });
        soundManager.playClick();
      });

      this.rootElem.querySelector('#btn-add-ai-enemy')?.addEventListener('click', () => {
        this.callbacks.onAddAi('Ironvale Kingdom', 2);
        soundManager.playClick();
      });

      this.rootElem.querySelector('#btn-add-ai-ally')?.addEventListener('click', () => {
        this.callbacks.onAddAi('Nambara Alliance', 1);
        soundManager.playClick();
      });

      this.rootElem.querySelectorAll('.btn-remove-ai').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const aiId = (e.target as HTMLElement).getAttribute('data-id');
          if (aiId) {
            this.callbacks.onRemoveAi(aiId);
            soundManager.playClick();
          }
        });
      });

      this.rootElem.querySelector('#btn-start-match')?.addEventListener('click', () => {
        this.callbacks.onStartGame();
        soundManager.playOrder();
      });
    } else {
      this.rootElem.querySelector('#btn-toggle-ready')?.addEventListener('click', () => {
        const nextReady = !me?.isReady;
        this.callbacks.onUpdatePlayer(civSelect.value as CivName, parseInt(teamSelect.value, 10), nextReady);
        soundManager.playClick();
      });
    }

    this.rootElem.querySelector('#btn-leave-lobby')?.addEventListener('click', () => {
      this.callbacks.onLeave();
      soundManager.playClick();
    });
  }
}
