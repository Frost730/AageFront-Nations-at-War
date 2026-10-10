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
    this.rootElem.className = 'modal-backdrop interactive';
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
      <div style="
        width: 820px;
        max-width: 95vw;
        background: #0f172a;
        border: 2px solid #334155;
        border-radius: 14px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7);
        padding: 24px;
        color: #f8fafc;
        display: flex;
        flex-direction: column;
        gap: 18px;
      ">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e293b; padding-bottom: 14px;">
          <div>
            <h2 class="cinzel" style="font-size: 24px; color: #38bdf8; font-weight: 700;">LAN WAR ROOM LOBBY</h2>
            <div style="font-size: 13px; color: #94a3b8; margin-top: 4px;">Local Area Network Co-op & Skirmish</div>
          </div>
          <div style="text-align: right; background: #1e293b; border: 1px solid #38bdf8; border-radius: 8px; padding: 6px 14px;">
            <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase;">Direct LAN Connection URL</div>
            <div style="font-family: monospace; font-size: 15px; color: #4ade80; font-weight: 700;">${escapeHtml(state.hostAddress)}</div>
          </div>
        </div>

        <!-- Incoming Join Requests (Host Only) -->
        ${isHost && state.pendingRequests && state.pendingRequests.length > 0 ? `
          <div style="background: linear-gradient(135deg, rgba(180, 83, 9, 0.25) 0%, rgba(120, 53, 15, 0.35) 100%); border: 2px solid #f59e0b; border-radius: 10px; padding: 14px 18px; box-shadow: 0 0 15px rgba(245, 158, 11, 0.25);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
              <div style="display: flex; align-items: center; gap: 8px; font-weight: 700; color: #fbbf24; font-size: 14px;">
                <span style="font-size: 18px;">🔔</span>
                <span>INCOMING JOIN REQUESTS (${state.pendingRequests.length})</span>
              </div>
              <span style="font-size: 12px; color: #fde68a;">Friend is asking permission to join your match</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${state.pendingRequests.map(req => `
                <div style="display: flex; align-items: center; justify-content: space-between; background: #0f172a; border: 1px solid #78350f; border-radius: 8px; padding: 10px 14px;">
                  <div>
                    <div style="font-weight: 700; font-size: 14px; color: #f8fafc;">${escapeHtml(req.name)}</div>
                    <div style="font-size: 11px; color: #94a3b8;">Civilization: <strong style="color: #38bdf8;">${escapeHtml(req.civ)}</strong> • Preferred Team: <strong style="color: #4ade80;">Team ${req.team}</strong></div>
                  </div>
                  <div style="display: flex; gap: 10px;">
                    <button class="btn-approve-join" data-id="${req.requestId}" style="background: linear-gradient(180deg, #16a34a 0%, #15803d 100%); border: none; color: white; border-radius: 6px; padding: 8px 16px; font-size: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 2px 6px rgba(22, 163, 74, 0.4);">
                      <span>✅</span> Approve & Admit
                    </button>
                    <button class="btn-decline-join" data-id="${req.requestId}" style="background: #334155; border: 1px solid #64748b; color: #f87171; border-radius: 6px; padding: 8px 14px; font-size: 12px; font-weight: 600; cursor: pointer;">
                      Decline
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Middle Content: Players Roster & Match Settings -->
        <div style="display: grid; grid-template-columns: 1.3fr 1fr; gap: 20px;">
          <!-- Left: Player Roster -->
          <div style="background: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: 14px; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="font-weight: 700; font-size: 14px; margin-bottom: 10px; color: #cbd5e1; display: flex; justify-content: space-between;">
                <span>ACTIVE COMMANDERS (${state.players.length}/8)</span>
                <span style="font-size: 12px; color: #64748b;">Co-op Team: Allies share Team 1</span>
              </div>
              <div id="roster-list" style="display: flex; flex-direction: column; gap: 8px;">
                ${state.players.map(p => `
                  <div style="
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    background: #0f172a;
                    border: 1px solid ${p.color};
                    border-radius: 8px;
                    padding: 8px 12px;
                  ">
                    <div style="display: flex; align-items: center; gap: 10px;">
                      <div style="width: 12px; height: 12px; border-radius: 50%; background: ${p.color};"></div>
                      <div>
                        <div style="font-weight: 600; font-size: 13px;">${escapeHtml(p.name)} ${p.isHost ? '<span style="color: #fbbf24; font-size: 11px;">[HOST]</span>' : ''}</div>
                        <div style="font-size: 11px; color: #94a3b8;">${escapeHtml(p.civ)} • Team ${p.team}</div>
                      </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span style="font-size: 11px; font-weight: 700; color: ${p.isReady ? '#4ade80' : '#f87171'};">
                        ${p.isReady ? 'READY' : 'NOT READY'}
                      </span>
                      ${isHost && p.isAi ? `<button class="btn-remove-ai" data-id="${p.id}" style="background: #dc2626; border: none; color: white; border-radius: 4px; padding: 2px 6px; font-size: 11px; cursor: pointer;">Remove</button>` : ''}
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- Add AI button (Host only) -->
            ${isHost && state.players.length < 8 ? `
              <div style="margin-top: 14px; display: flex; gap: 8px;">
                <button id="btn-add-ai-enemy" style="flex: 1; background: #334155; border: 1px solid #475569; color: #f8fafc; border-radius: 6px; padding: 8px; font-size: 12px; cursor: pointer; font-weight: 600;">
                  + Add AI Enemy (Team 2)
                </button>
                <button id="btn-add-ai-ally" style="flex: 1; background: #334155; border: 1px solid #475569; color: #f8fafc; border-radius: 6px; padding: 8px; font-size: 12px; cursor: pointer; font-weight: 600;">
                  + Add AI Ally (Team 1)
                </button>
              </div>
            ` : ''}
          </div>

          <!-- Right: Game Settings -->
          <div style="background: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: 14px; display: flex; flex-direction: column; gap: 12px;">
            <div style="font-weight: 700; font-size: 14px; color: #cbd5e1;">MATCH CONFIGURATION</div>

            <div>
              <label style="font-size: 11px; color: #94a3b8; display: block; margin-bottom: 4px;">My Civilization</label>
              <select id="select-my-civ" style="width: 100%; background: #0f172a; border: 1px solid #334155; color: #f8fafc; border-radius: 6px; padding: 6px 10px; font-size: 13px;">
                ${Object.keys(CIVILIZATIONS).map(civ => `
                  <option value="${civ}" ${me && me.civ === civ ? 'selected' : ''}>${civ}</option>
                `).join('')}
              </select>
            </div>

            <div>
              <label style="font-size: 11px; color: #94a3b8; display: block; margin-bottom: 4px;">My Team</label>
              <select id="select-my-team" style="width: 100%; background: #0f172a; border: 1px solid #334155; color: #f8fafc; border-radius: 6px; padding: 6px 10px; font-size: 13px;">
                <option value="1" ${me && me.team === 1 ? 'selected' : ''}>Team 1 (Human Co-op / Allies)</option>
                <option value="2" ${me && me.team === 2 ? 'selected' : ''}>Team 2 (Opponents)</option>
                <option value="3" ${me && me.team === 3 ? 'selected' : ''}>Team 3 (Opponents)</option>
                <option value="4" ${me && me.team === 4 ? 'selected' : ''}>Team 4 (Opponents)</option>
              </select>
            </div>

            <div>
              <label style="font-size: 11px; color: #94a3b8; display: block; margin-bottom: 4px;">Map Size & Scale</label>
              <select id="select-map-size" ${!isHost ? 'disabled' : ''} style="width: 100%; background: #0f172a; border: 1px solid #334155; color: #38bdf8; border-radius: 6px; padding: 6px 10px; font-size: 13px; font-weight: 700;">
                <option value="60" ${state.settings.mapSize === 60 ? 'selected' : ''}>Small (60×60) — Fast Skirmish</option>
                <option value="80" ${state.settings.mapSize === 80 || !state.settings.mapSize ? 'selected' : ''}>Standard (80×80) — Balanced</option>
                <option value="100" ${state.settings.mapSize === 100 ? 'selected' : ''}>Large (100×100) — Expansive Kingdoms</option>
                <option value="120" ${state.settings.mapSize === 120 ? 'selected' : ''}>Huge (120×120) — Grand Theater of War</option>
                <option value="140" ${state.settings.mapSize === 140 ? 'selected' : ''}>Massive (140×140) — True World War (4-8 Nations)</option>
              </select>
            </div>

            <div>
              <label style="font-size: 11px; color: #94a3b8; display: block; margin-bottom: 4px;">Battlefield Map</label>
              <select id="select-map-type" ${!isHost ? 'disabled' : ''} style="width: 100%; background: #0f172a; border: 1px solid #334155; color: #f8fafc; border-radius: 6px; padding: 6px 10px; font-size: 13px;">
                <option value="green_frontier" ${state.settings.mapType === 'green_frontier' ? 'selected' : ''}>Green Frontier (Temperate Hills & Rivers)</option>
                <option value="highland_kingdom" ${state.settings.mapType === 'highland_kingdom' ? 'selected' : ''}>Highland Kingdom (Rugged Mountains & Minerals)</option>
                <option value="riverlands" ${state.settings.mapType === 'riverlands' ? 'selected' : ''}>Riverlands (Lush Valley & Crossing Fords)</option>
              </select>
            </div>

            <div>
              <label style="font-size: 11px; color: #94a3b8; display: block; margin-bottom: 4px;">AI Difficulty</label>
              <select id="select-ai-diff" ${!isHost ? 'disabled' : ''} style="width: 100%; background: #0f172a; border: 1px solid #334155; color: #f8fafc; border-radius: 6px; padding: 6px 10px; font-size: 13px;">
                <option value="easy" ${state.settings.aiDifficulty === 'easy' ? 'selected' : ''}>Easy (Relaxed Expansion)</option>
                <option value="medium" ${state.settings.aiDifficulty === 'medium' ? 'selected' : ''}>Medium (Standard Tactical Challenge)</option>
                <option value="hard" ${state.settings.aiDifficulty === 'hard' ? 'selected' : ''}>Hard (Aggressive Counters & Expansion)</option>
              </select>
            </div>

            <div>
              <label style="font-size: 11px; color: #94a3b8; display: block; margin-bottom: 4px;">Victory Condition</label>
              <select id="select-victory" ${!isHost ? 'disabled' : ''} style="width: 100%; background: #0f172a; border: 1px solid #334155; color: #f8fafc; border-radius: 6px; padding: 6px 10px; font-size: 13px;">
                <option value="conquest" ${state.settings.victoryCondition === 'conquest' ? 'selected' : ''}>Conquest (Destroy Enemy Town Centres)</option>
                <option value="territorial" ${state.settings.victoryCondition === 'territorial' ? 'selected' : ''}>Territorial Control (Control > 60% Map)</option>
                <option value="technology" ${state.settings.victoryCondition === 'technology' ? 'selected' : ''}>Technology Victory (Industrial Age Mastery)</option>
                <option value="elimination" ${state.settings.victoryCondition === 'elimination' ? 'selected' : ''}>Total Elimination (Wipe Out All Units)</option>
              </select>
            </div>

            ${isHost ? `
              <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 4px;">
                <div style="display: flex; align-items: center; justify-content: space-between; background: #0f172a; padding: 10px 12px; border-radius: 8px; border: 1px solid #334155;">
                  <div>
                    <div style="font-size: 12px; font-weight: 700; color: #f8fafc; display: flex; align-items: center; gap: 6px;">
                      <span>🔒</span> Require Host Approval
                    </div>
                    <div style="font-size: 11px; color: #94a3b8;">Friends must ask permission to join your match</div>
                  </div>
                  <input type="checkbox" id="check-require-approval" ${state.requireApproval !== false ? 'checked' : ''} style="cursor: pointer; width: 18px; height: 18px; accent-color: #38bdf8;" />
                </div>

                <div style="display: flex; align-items: center; justify-content: space-between; background: #0f172a; padding: 10px 12px; border-radius: 8px; border: 1px solid #334155;">
                  <div>
                    <div style="font-size: 12px; font-weight: 700; color: #f8fafc; display: flex; align-items: center; gap: 6px;">
                      <span>👁️</span> Private Match (Stealth Mode)
                    </div>
                    <div style="font-size: 11px; color: #94a3b8;">Hide room from LAN match browser (direct IP only)</div>
                  </div>
                  <input type="checkbox" id="check-room-private" ${state.isPrivate ? 'checked' : ''} style="cursor: pointer; width: 18px; height: 18px; accent-color: #f59e0b;" />
                </div>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Footer Buttons -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #1e293b; padding-top: 16px;">
          <button id="btn-leave-lobby" style="background: transparent; border: 1px solid #475569; color: #94a3b8; border-radius: 6px; padding: 10px 20px; font-size: 13px; cursor: pointer; font-weight: 600;">
            Leave Lobby
          </button>

          <div style="display: flex; gap: 12px;">
            ${!isHost ? `
              <button id="btn-toggle-ready" style="background: ${me && me.isReady ? '#15803d' : '#2563eb'}; border: none; color: white; border-radius: 8px; padding: 10px 24px; font-size: 14px; font-weight: 700; cursor: pointer;">
                ${me && me.isReady ? 'READY ✓' : 'READY UP'}
              </button>
            ` : ''}

            ${isHost ? `
              <button id="btn-start-match" style="background: linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%); border: none; color: white; border-radius: 8px; padding: 12px 32px; font-size: 15px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);">
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
