import { PlayerState } from '@agefront/shared';
import { soundManager } from '../audio/soundManager.js';

export interface VictoryCallbacks {
  onRematch: () => void;
  onMainMenu: () => void;
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
      <div style="
        width: 600px;
        background: #0f172a;
        border: 2px solid ${isVictory ? '#eab308' : '#ef4444'};
        border-radius: 16px;
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px ${isVictory ? 'rgba(234, 179, 8, 0.25)' : 'rgba(239, 68, 68, 0.25)'};
        padding: 32px;
        text-align: center;
        color: #f8fafc;
        display: flex;
        flex-direction: column;
        gap: 20px;
      ">
        <div>
          <div style="font-size: 48px; margin-bottom: 4px;">${isVictory ? '👑' : '⚔️'}</div>
          <h1 class="cinzel" style="font-size: 38px; font-weight: 900; color: ${isVictory ? '#fbbf24' : '#ef4444'}; letter-spacing: 3px; text-shadow: 0 0 20px ${isVictory ? 'rgba(251, 191, 36, 0.4)' : 'rgba(239, 68, 68, 0.4)'};">
            ${isVictory ? 'VICTORY' : 'DEFEAT'}
          </h1>
          <div style="font-size: 15px; font-weight: 500; color: #cbd5e1; margin-top: 6px;">
            ${reason}
          </div>
          <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
            Campaign Duration: ${mins}m ${secs}s
          </div>
        </div>

        <!-- Battlefield Statistics Table -->
        <div style="background: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: 18px; text-align: left; display: flex; flex-direction: column; gap: 10px;">
          <div style="font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase; border-bottom: 1px solid #334155; padding-bottom: 8px; letter-spacing: 1px;">
            Battlefield Performance Summary
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px;">
            <div>Commander Score: <strong style="color: #38bdf8;">${stats.score}</strong></div>
            <div>Enemies Defeated: <strong style="color: #ef4444;">${stats.enemiesDefeated}</strong></div>
            <div>Structures Built: <strong style="color: #10b981;">${stats.buildingsConstructed}</strong></div>
            <div>Techs Researched: <strong style="color: #f59e0b;">${stats.technologiesResearched}</strong></div>
          </div>

          <div style="font-size: 11px; color: #94a3b8; margin-top: 6px; text-transform: uppercase; font-weight: 600;">Total Resources Harvested:</div>
          <div style="display: flex; gap: 14px; font-size: 12px; color: #cbd5e1; flex-wrap: wrap;">
            <span>🌾 Food: <strong style="color: #4ade80;">${gathered.food}</strong></span>
            <span>🪵 Wood: <strong style="color: #fb923c;">${gathered.wood}</strong></span>
            <span>🪨 Stone: <strong style="color: #cbd5e1;">${gathered.stone}</strong></span>
            <span>🪙 Metal: <strong style="color: #facc15;">${gathered.metal}</strong></span>
            <span>📜 Knowledge: <strong style="color: #60a5fa;">${gathered.knowledge}</strong></span>
          </div>
        </div>

        <div style="display: flex; justify-content: center; gap: 16px; margin-top: 10px;">
          <button id="btn-rematch" style="background: linear-gradient(135deg, #2563eb, #1d4ed8); border: 1px solid #3b82f6; color: #ffffff; border-radius: 8px; padding: 12px 24px; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s;">
            ⚔️ Rematch
          </button>
          <button id="btn-return-menu" style="background: #1e293b; border: 1px solid #475569; color: #f8fafc; border-radius: 8px; padding: 12px 24px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s;">
            Return to Main Menu
          </button>
        </div>
      </div>
    `;

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
