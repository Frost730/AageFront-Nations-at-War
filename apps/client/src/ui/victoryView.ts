import { PlayerState, escapeHtml } from '@agefront/shared';
import { soundManager } from '../audio/soundManager.js';

export interface VictoryCallbacks {
  onRematch: () => void;
  onMainMenu: () => void;
  onDownloadReplay?: () => void;
}

export class VictoryView {
  public rootElem: HTMLElement;
  private callbacks: VictoryCallbacks;

  constructor(container: HTMLElement, callbacks: VictoryCallbacks) {
    this.callbacks = callbacks;
    this.rootElem = document.createElement('div');
    this.rootElem.className = 'modal-backdrop interactive';
    this.rootElem.style.display = 'none';
    container.appendChild(this.rootElem);
  }

  public show(isVictory: boolean, reason: string, player: PlayerState | undefined, matchDurationSec: number): void {
    if (isVictory) {
      soundManager.playVictory();
    } else {
      soundManager.playDefeat();
    }

    const mins = Math.floor((matchDurationSec || 0) / 60);
    const secs = Math.floor((matchDurationSec || 0) % 60).toString().padStart(2, '0');

    const stats = player?.stats || {
      score: 100,
      enemiesDefeated: 0,
      buildingsConstructed: 1,
      technologiesResearched: 0,
      resourcesGathered: { food: 0, wood: 0, stone: 0, metal: 0, knowledge: 0 }
    };
    const gathered = stats.resourcesGathered || { food: 0, wood: 0, stone: 0, metal: 0, knowledge: 0 };

    this.rootElem.style.display = 'flex';
    this.rootElem.innerHTML = `
      <div class="aoe-parchment-card" style="
        width: 620px;
        max-width: 95vw;
        padding: 30px 34px 26px 34px;
        text-align: center;
        display: flex;
        flex-direction: column;
        gap: 16px;
        border: 2.5px solid ${isVictory ? '#8c6a34' : '#7f1d1d'};
        box-shadow: 0 22px 65px rgba(0, 0, 0, 0.92), inset 0 0 60px ${isVictory ? 'rgba(120, 75, 25, 0.35)' : 'rgba(127, 29, 29, 0.35)'};
        position: relative;
      ">
        <!-- Historical Corner Rivets -->
        <div class="aoe-corner-rivet" style="top: 8px; left: 8px;"></div>
        <div class="aoe-corner-rivet" style="top: 8px; right: 8px;"></div>
        <div class="aoe-corner-rivet" style="bottom: 8px; left: 8px;"></div>
        <div class="aoe-corner-rivet" style="bottom: 8px; right: 8px;"></div>

        <!-- Triumph / Defeat Header -->
        <div>
          <div style="font-size: 42px; margin-bottom: 2px; filter: drop-shadow(0 3px 6px rgba(0,0,0,0.35));">
            ${isVictory ? '👑' : '⚔️'}
          </div>
          <h1 class="cinzel" style="
            font-size: 38px;
            font-weight: 900;
            color: ${isVictory ? '#451a03' : '#7f1d1d'};
            letter-spacing: 4px;
            margin: 0;
            line-height: 1.1;
            text-shadow: 0 1px 0 rgba(254, 240, 138, 0.9), 0 2px 4px rgba(74, 4, 4, 0.35);
          ">
            ${isVictory ? 'VICTORY' : 'DEFEAT'}
          </h1>
          <div class="cinzel" style="font-size: 13px; font-weight: 700; color: ${isVictory ? '#78350f' : '#991b1b'}; letter-spacing: 0.5px; margin-top: 6px;">
            ${escapeHtml(reason)}
          </div>
          <div style="font-size: 11px; font-weight: 600; color: #8c6a34; font-family: 'Cinzel', serif; letter-spacing: 0.5px; margin-top: 3px;">
            Campaign Duration: <strong>${mins}m ${secs}s</strong>
          </div>
        </div>

        <div style="height: 2px; background: linear-gradient(90deg, transparent, #8c6a34 25%, #d4af37 50%, #8c6a34 75%, transparent); margin: 0 10px;"></div>

        <!-- Battlefield Performance Summary (Aged Parchment Inner Panel) -->
        <div class="aoe-parchment-inner" style="
          padding: 16px 20px;
          text-align: left;
          display: flex;
          flex-direction: column;
          gap: 12px;
          border: 1.5px solid #a38249;
          background: rgba(255, 255, 255, 0.45);
        ">
          <div class="cinzel" style="
            font-size: 11px;
            font-weight: 800;
            color: #451a03;
            text-transform: uppercase;
            letter-spacing: 1px;
            border-bottom: 1.5px solid #a38249;
            padding-bottom: 6px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          ">
            <span>📜 Battlefield Performance Summary</span>
            <span style="font-size: 10px; color: #78350f; font-weight: 700;">
              ${escapeHtml(player?.civ || 'Imperial Sovereign')} • Team ${player?.team || 1}
            </span>
          </div>

          <!-- Primary 4 Combat Stats -->
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
            <div style="background: rgba(255, 255, 255, 0.55); border: 1.5px solid #c2a66e; border-radius: 4px; padding: 8px 6px; text-align: center; box-shadow: inset 1px 1px 2px rgba(0,0,0,0.06);">
              <div class="cinzel" style="font-size: 9px; font-weight: 800; color: #78350f; text-transform: uppercase;">Score</div>
              <div class="cinzel" style="font-size: 19px; font-weight: 900; color: #1e3a8a; margin-top: 2px;">${stats.score}</div>
            </div>
            <div style="background: rgba(255, 255, 255, 0.55); border: 1.5px solid #c2a66e; border-radius: 4px; padding: 8px 6px; text-align: center; box-shadow: inset 1px 1px 2px rgba(0,0,0,0.06);">
              <div class="cinzel" style="font-size: 9px; font-weight: 800; color: #78350f; text-transform: uppercase;">Defeated</div>
              <div class="cinzel" style="font-size: 19px; font-weight: 900; color: #991b1b; margin-top: 2px;">${stats.enemiesDefeated}</div>
            </div>
            <div style="background: rgba(255, 255, 255, 0.55); border: 1.5px solid #c2a66e; border-radius: 4px; padding: 8px 6px; text-align: center; box-shadow: inset 1px 1px 2px rgba(0,0,0,0.06);">
              <div class="cinzel" style="font-size: 9px; font-weight: 800; color: #78350f; text-transform: uppercase;">Constructed</div>
              <div class="cinzel" style="font-size: 19px; font-weight: 900; color: #15803d; margin-top: 2px;">${stats.buildingsConstructed}</div>
            </div>
            <div style="background: rgba(255, 255, 255, 0.55); border: 1.5px solid #c2a66e; border-radius: 4px; padding: 8px 6px; text-align: center; box-shadow: inset 1px 1px 2px rgba(0,0,0,0.06);">
              <div class="cinzel" style="font-size: 9px; font-weight: 800; color: #78350f; text-transform: uppercase;">Researched</div>
              <div class="cinzel" style="font-size: 19px; font-weight: 900; color: #854d0e; margin-top: 2px;">${stats.technologiesResearched}</div>
            </div>
          </div>

          <!-- Total Resources Harvested -->
          <div>
            <div class="cinzel" style="font-size: 10px; font-weight: 800; color: #78350f; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
              Total Tributes & Harvested Resources:
            </div>
            <div style="display: flex; gap: 8px; justify-content: space-between; flex-wrap: wrap;">
              <div style="flex: 1; min-width: 90px; background: #fbf3e0; border: 1.5px solid #c2a66e; border-radius: 3px; padding: 4px 6px; font-size: 11px; display: flex; align-items: center; justify-content: center; gap: 4px;">
                <span>🌾 Food:</span> <strong style="color: #15803d; font-family: monospace; font-size: 12px;">${gathered.food}</strong>
              </div>
              <div style="flex: 1; min-width: 90px; background: #fbf3e0; border: 1.5px solid #c2a66e; border-radius: 3px; padding: 4px 6px; font-size: 11px; display: flex; align-items: center; justify-content: center; gap: 4px;">
                <span>🪵 Wood:</span> <strong style="color: #9a3412; font-family: monospace; font-size: 12px;">${gathered.wood}</strong>
              </div>
              <div style="flex: 1; min-width: 90px; background: #fbf3e0; border: 1.5px solid #c2a66e; border-radius: 3px; padding: 4px 6px; font-size: 11px; display: flex; align-items: center; justify-content: center; gap: 4px;">
                <span>🪨 Stone:</span> <strong style="color: #475569; font-family: monospace; font-size: 12px;">${gathered.stone}</strong>
              </div>
              <div style="flex: 1; min-width: 90px; background: #fbf3e0; border: 1.5px solid #c2a66e; border-radius: 3px; padding: 4px 6px; font-size: 11px; display: flex; align-items: center; justify-content: center; gap: 4px;">
                <span>🪙 Metal:</span> <strong style="color: #854d0e; font-family: monospace; font-size: 12px;">${gathered.metal}</strong>
              </div>
              <div style="flex: 1; min-width: 90px; background: #fbf3e0; border: 1.5px solid #c2a66e; border-radius: 3px; padding: 4px 6px; font-size: 11px; display: flex; align-items: center; justify-content: center; gap: 4px;">
                <span>📜 Lore:</span> <strong style="color: #1e40af; font-family: monospace; font-size: 12px;">${gathered.knowledge}</strong>
              </div>
            </div>
          </div>
        </div>

        <!-- Historic Crimson & Gilded Action Buttons -->
        <div style="display: flex; justify-content: center; gap: 14px; margin-top: 6px;">
          <button id="btn-download-replay" class="aoe-btn-crimson" style="padding: 10px 18px; font-size: 12px;" title="Export Match Recording">
            💾 Download Replay (.afr)
          </button>
          <button id="btn-rematch" class="aoe-btn-crimson" style="padding: 10px 26px; font-size: 13px;" title="Begin Rematch with Current Settings">
            ⚔️ Rematch
          </button>
          <button id="btn-return-menu" class="aoe-btn-crimson" style="
            padding: 10px 20px;
            font-size: 12px;
            background: linear-gradient(180deg, #3f2512 0%, #29170a 100%) !important;
            border-color: #8c6a34 !important;
          " title="Leave Battlefield to War Room">
            🏛️ Return to Main Menu
          </button>
        </div>
      </div>
    `;

    this.rootElem.querySelector('#btn-download-replay')?.addEventListener('click', () => {
      soundManager.playClick();
      this.callbacks.onDownloadReplay?.();
    });

    this.rootElem.querySelector('#btn-rematch')?.addEventListener('click', () => {
      this.rootElem.style.display = 'none';
      this.callbacks.onRematch();
      soundManager.playClick();
    });

    this.rootElem.querySelector('#btn-return-menu')?.addEventListener('click', () => {
      this.rootElem.style.display = 'none';
      this.callbacks.onMainMenu();
      soundManager.playClick();
    });
  }

  public hide(): void {
    this.rootElem.style.display = 'none';
  }
}
