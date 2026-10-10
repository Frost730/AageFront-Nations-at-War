import {
  PlayerState,
  UnitData,
  BuildingData,
  ResourceNodeData,
  UnitType,
  BuildingType,
  UNIT_DEFINITIONS,
  BUILDING_DEFINITIONS,
  TECHNOLOGIES,
  AGE_ADVANCEMENT_REQUIREMENTS,
  AgeName,
  ResourceType
} from '@agefront/shared';
import { soundManager } from '../audio/soundManager.js';

export interface HudCallbacks {
  onStartPlacement: (type: BuildingType) => void;
  onCancelPlacement?: () => void;
  onTrainUnit: (buildingId: string, unitType: UnitType) => void;
  onResearchTech: (buildingId: string, techId: string) => void;
  onAdvanceAge: (buildingId: string) => void;
  onSelectIdleWorker: () => void;
  onAssignWorkersToBuild: (buildingId: string) => void;
  onOpenMenu: () => void;
  onTransferResources?: (recipientId: string, resource: ResourceType, amount: number) => void;
}

export class HudView {
  public rootElem: HTMLElement;
  private callbacks: HudCallbacks;

  // Elements
  private topBarElem!: HTMLElement;
  private minimapContainer!: HTMLElement;
  private selectionDetailsElem!: HTMLElement;
  private actionMatrixElem!: HTMLElement;
  private notificationBannerElem!: HTMLElement;
  private idleWorkerBtnElem!: HTMLElement;
  private ageBadgeElem!: HTMLElement;
  private hoverTooltipElem!: HTMLElement;

  private ageModalElem: HTMLElement | null = null;
  private coopModalElem: HTMLElement | null = null;
  private coopBtnElem!: HTMLElement;
  private allPlayers: PlayerState[] = [];
  private currentPlayer: PlayerState | null = null;
  private townCentreId: string | null = null;

  private currentContextKey: string = '';
  private activePlacementType: BuildingType | null = null;
  private placementBannerElem: HTMLElement | null = null;

  constructor(container: HTMLElement, callbacks: HudCallbacks) {
    this.callbacks = callbacks;
    this.rootElem = document.createElement('div');
    this.rootElem.id = 'hud-container';
    this.rootElem.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; display: none; flex-direction: column; justify-content: space-between; z-index: 40;';
    container.appendChild(this.rootElem);

    this.createTopBar();
    this.createNotificationBanner();
    this.createBottomBar();
    this.createHoverTooltip();
  }

  public show(): void {
    this.rootElem.style.display = 'flex';
  }

  public hide(): void {
    this.rootElem.style.display = 'none';
    if (this.ageModalElem) this.ageModalElem.style.display = 'none';
    if (this.coopModalElem) this.coopModalElem.style.display = 'none';
    if (this.placementBannerElem) this.placementBannerElem.style.display = 'none';
    this.hideResourceHoverTooltip();
  }

  public getMinimapContainer(): HTMLElement {
    return this.minimapContainer;
  }

  private createTopBar(): void {
    this.topBarElem = document.createElement('div');
    this.topBarElem.style.cssText = `
      width: 100%;
      height: 52px;
      background: linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(15, 23, 42, 0.85) 100%);
      border-bottom: 2px solid #334155;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
      pointer-events: auto;
    `;

    this.topBarElem.innerHTML = `
      <div id="hud-resources" style="display: flex; align-items: center; gap: 20px; font-weight: 600; font-size: 14px;">
        <div style="display: flex; align-items: center; gap: 6px;" title="Food: Essential for workers and military training"><span style="color: #ef4444; font-size: 16px;">🌾</span> <span id="res-food">0</span></div>
        <div style="display: flex; align-items: center; gap: 6px;" title="Timber: Essential for building construction and archery"><span style="color: #10b981; font-size: 16px;">🪵</span> <span id="res-wood">0</span></div>
        <div style="display: flex; align-items: center; gap: 6px;" title="Stone: Essential for fortresses, walls, and town centres"><span style="color: #94a3b8; font-size: 16px;">🪨</span> <span id="res-stone">0</span></div>
        <div style="display: flex; align-items: center; gap: 6px;" title="Gold (Treasury): Essential for knights, dragons, siege weapons, and age advancement"><span style="color: #fbbf24; font-size: 16px;">🪙</span> <span id="res-metal" style="color: #fbbf24; font-weight: 700;">0</span></div>
        <div style="display: flex; align-items: center; gap: 6px;" title="Knowledge: Essential for technologies and research"><span style="color: #38bdf8; font-size: 16px;">📜</span> <span id="res-knowledge">0</span></div>
      </div>

      <div style="display: flex; align-items: center; gap: 16px;">
        <button id="hud-age-badge" class="cinzel" style="background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%); border: 1.5px solid #d97706; color: #fbbf24; padding: 5px 16px; border-radius: 20px; font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; cursor: pointer; transition: all 0.2s ease;" title="Click to view Age Advancement requirements or advance age!">
          👑 Founding Age
        </button>
        <div style="display: flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 600;">
          <span style="color: #60a5fa;">👥</span> <span id="res-pop">0/15</span>
        </div>
        <button id="btn-idle-worker" style="display: none; background: #334155; border: 1px solid #475569; color: #f8fafc; border-radius: 6px; padding: 4px 10px; font-size: 12px; cursor: pointer; font-weight: 600;">
          Idle: <span id="idle-count">0</span>
        </button>
        <button id="btn-hud-coop" style="display: none; background: linear-gradient(180deg, #0284c7 0%, #0369a1 100%); border: 1.5px solid #38bdf8; color: #f8fafc; border-radius: 6px; padding: 5px 12px; font-size: 12px; cursor: pointer; font-weight: 700; align-items: center; gap: 6px;" title="Transfer resources or send tribute to co-op teammates">
          <span>🤝</span> <span>Co-op Tribute</span>
        </button>
        <button id="btn-hud-menu" style="background: #1e293b; border: 1px solid #475569; color: #f8fafc; border-radius: 6px; padding: 5px 14px; font-size: 12px; cursor: pointer; font-weight: 600;">
          Menu
        </button>
      </div>
    `;

    this.rootElem.appendChild(this.topBarElem);

    this.ageBadgeElem = this.topBarElem.querySelector('#hud-age-badge')!;
    this.ageBadgeElem.addEventListener('click', () => {
      this.toggleAgeModal();
    });

    this.idleWorkerBtnElem = this.topBarElem.querySelector('#btn-idle-worker')!;
    this.idleWorkerBtnElem.addEventListener('click', () => {
      this.callbacks.onSelectIdleWorker();
    });

    this.coopBtnElem = this.topBarElem.querySelector('#btn-hud-coop')!;
    this.coopBtnElem.addEventListener('click', () => {
      this.toggleCoopModal();
    });

    const menuBtn = this.topBarElem.querySelector('#btn-hud-menu')!;
    menuBtn.addEventListener('click', () => {
      this.callbacks.onOpenMenu();
    });
  }

  private createNotificationBanner(): void {
    this.notificationBannerElem = document.createElement('div');
    this.notificationBannerElem.style.cssText = `
      align-self: center;
      margin-top: 16px;
      padding: 8px 24px;
      background: rgba(15, 23, 42, 0.95);
      border: 1px solid #38bdf8;
      border-radius: 30px;
      color: #38bdf8;
      font-weight: 700;
      font-size: 14px;
      display: none;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5);
      animation: fadeIn 0.3s ease;
      pointer-events: none;
    `;
    this.rootElem.appendChild(this.notificationBannerElem);
  }

  public showNotification(text: string, durationMs: number = 3500): void {
    this.notificationBannerElem.textContent = text;
    this.notificationBannerElem.style.display = 'block';
    setTimeout(() => {
      this.notificationBannerElem.style.display = 'none';
    }, durationMs);
  }

  private createBottomBar(): void {
    const bottomBar = document.createElement('div');
    bottomBar.style.cssText = `
      width: 100%;
      height: 200px;
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      padding: 12px;
      pointer-events: none;
    `;

    // 1. Bottom-Left: Minimap
    this.minimapContainer = document.createElement('div');
    this.minimapContainer.style.cssText = `
      width: 180px;
      height: 180px;
      pointer-events: auto;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6);
    `;
    bottomBar.appendChild(this.minimapContainer);

    // 2. Bottom-Center: Selected Entity Card
    this.selectionDetailsElem = document.createElement('div');
    this.selectionDetailsElem.style.cssText = `
      width: 380px;
      height: 180px;
      background: rgba(15, 23, 42, 0.94);
      backdrop-filter: blur(8px);
      border: 2px solid #334155;
      border-radius: 10px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      pointer-events: auto;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6);
    `;
    this.selectionDetailsElem.innerHTML = `<div style="color: #64748b; font-size: 13px; text-align: center; margin-top: 60px;">Click any unit or building to command</div>`;
    bottomBar.appendChild(this.selectionDetailsElem);

    // 3. Bottom-Right: Context-sensitive Action Matrix
    this.actionMatrixElem = document.createElement('div');
    this.actionMatrixElem.style.cssText = `
      width: 380px;
      height: 180px;
      background: rgba(15, 23, 42, 0.94);
      backdrop-filter: blur(8px);
      border: 2px solid #334155;
      border-radius: 10px;
      padding: 10px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      grid-template-rows: repeat(3, 1fr);
      gap: 6px;
      pointer-events: auto;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6);
    `;
    bottomBar.appendChild(this.actionMatrixElem);

    this.rootElem.appendChild(bottomBar);
  }

  public updatePlayerStats(player: PlayerState, idleWorkerCount: number, townCentreId?: string, allPlayers?: PlayerState[]): void {
    this.currentPlayer = player;
    if (townCentreId) this.townCentreId = townCentreId;
    if (allPlayers) this.allPlayers = allPlayers;

    const f = (n: number) => Math.floor(n).toLocaleString();
    (this.topBarElem.querySelector('#res-food') as HTMLElement).textContent = f(player.resources.food);
    (this.topBarElem.querySelector('#res-wood') as HTMLElement).textContent = f(player.resources.wood);
    (this.topBarElem.querySelector('#res-stone') as HTMLElement).textContent = f(player.resources.stone);
    (this.topBarElem.querySelector('#res-metal') as HTMLElement).textContent = f(player.resources.metal);
    (this.topBarElem.querySelector('#res-knowledge') as HTMLElement).textContent = f(player.resources.knowledge);

    (this.topBarElem.querySelector('#res-pop') as HTMLElement).textContent = `${player.population}/${player.maxPopulation}`;
    this.ageBadgeElem.textContent = `👑 ${player.age}`;

    if (idleWorkerCount > 0) {
      this.idleWorkerBtnElem.style.display = 'block';
      (this.topBarElem.querySelector('#idle-count') as HTMLElement).textContent = idleWorkerCount.toString();
    } else {
      this.idleWorkerBtnElem.style.display = 'none';
    }

    const teammates = this.allPlayers.filter(p => p.team === player.team && p.id !== player.id && !p.isDefeated);
    if (this.coopBtnElem) {
      this.coopBtnElem.style.display = teammates.length > 0 ? 'inline-flex' : 'none';
    }
  }

  public setPlacementActive(type: BuildingType | null): void {
    this.activePlacementType = type;
    if (!type) {
      if (this.placementBannerElem) {
        this.placementBannerElem.remove();
        this.placementBannerElem = null;
      }
      this.actionMatrixElem.querySelectorAll<HTMLElement>('.build-matrix-btn').forEach(btn => {
        btn.style.borderColor = btn.dataset.unlocked === 'true' ? '#475569' : '#1e293b';
        btn.style.boxShadow = 'none';
      });
      return;
    }

    const def = BUILDING_DEFINITIONS[type];
    if (!this.placementBannerElem) {
      this.placementBannerElem = document.createElement('div');
      this.placementBannerElem.style.cssText = `
        position: absolute;
        top: 68px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(15, 23, 42, 0.96);
        border: 2px solid #38bdf8;
        border-radius: 30px;
        padding: 8px 24px;
        color: #f8fafc;
        font-size: 13px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 16px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.7);
        z-index: 1000;
        pointer-events: auto;
      `;
      this.rootElem.appendChild(this.placementBannerElem);
    }

    this.placementBannerElem.innerHTML = `
      <span>🔨 Placing <strong>${def.name}</strong></span>
      <span style="font-size: 11px; color: #94a3b8;">Left-Click terrain to build • Right-Click / ESC to cancel</span>
      <button id="btn-cancel-placement" style="background: #ef4444; border: none; color: white; border-radius: 12px; padding: 4px 12px; font-weight: 700; cursor: pointer; font-size: 11px;">Cancel</button>
    `;

    this.placementBannerElem.querySelector('#btn-cancel-placement')?.addEventListener('click', () => {
      this.callbacks.onCancelPlacement?.();
    });

    this.actionMatrixElem.querySelectorAll<HTMLElement>('.build-matrix-btn').forEach(btn => {
      if (btn.dataset.btype === type) {
        btn.style.borderColor = '#38bdf8';
        btn.style.boxShadow = '0 0 10px rgba(56, 189, 248, 0.7)';
      } else {
        btn.style.borderColor = btn.dataset.unlocked === 'true' ? '#475569' : '#1e293b';
        btn.style.boxShadow = 'none';
      }
    });
  }

  private createHoverTooltip(): void {
    this.hoverTooltipElem = document.createElement('div');
    this.hoverTooltipElem.id = 'hud-hover-tooltip';
    this.hoverTooltipElem.style.cssText = `
      position: absolute;
      display: none;
      pointer-events: none;
      z-index: 1000;
      background: rgba(15, 23, 42, 0.96);
      border: 1.5px solid #fbbf24;
      border-radius: 8px;
      padding: 8px 14px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.75), 0 0 14px rgba(251, 191, 36, 0.3);
      backdrop-filter: blur(8px);
      white-space: nowrap;
      transition: opacity 0.12s ease;
    `;
    this.rootElem.appendChild(this.hoverTooltipElem);
  }

  public showResourceHoverTooltip(
    screenX: number,
    screenY: number,
    node: ResourceNodeData
  ): void {
    let icon = '🪙';
    let name = 'Gold Vein / Mine';
    let typeName = 'Gold (Yellow)';
    let themeColor = '#fbbf24';
    let hint = 'Right-click with Workers to Mine Gold';

    if (node.type === 'metal') {
      icon = '🪙';
      name = 'Gold Mine / Ore Vein';
      typeName = 'Gold (Yellow)';
      themeColor = '#fbbf24';
      hint = 'Right-click with Workers to Mine Gold';
    } else if (node.type === 'wood') {
      icon = '🌲';
      name = 'Timber Grove / Forest';
      typeName = 'Wood / Timber';
      themeColor = '#10b981';
      hint = 'Right-click with Workers to Chop Timber';
    } else if (node.type === 'stone') {
      icon = '🪨';
      name = 'Stone Quarry Deposit';
      typeName = 'Stone';
      themeColor = '#94a3b8';
      hint = 'Right-click with Workers to Quarry Stone';
    } else if (node.type === 'food') {
      icon = '🌾';
      name = 'Forage Berry Bush';
      typeName = 'Food';
      themeColor = '#ef4444';
      hint = 'Right-click with Workers to Forage Food';
    }

    const pct = Math.max(0, Math.min(100, (node.amount / node.maxAmount) * 100));

    this.hoverTooltipElem.style.borderColor = themeColor;
    this.hoverTooltipElem.style.boxShadow = `0 8px 24px rgba(0, 0, 0, 0.75), 0 0 16px ${themeColor}44`;
    this.hoverTooltipElem.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 22px;">${icon}</span>
        <div>
          <div style="font-weight: 700; font-size: 13px; color: ${themeColor}; letter-spacing: 0.5px;">${name}</div>
          <div style="font-size: 11px; color: #cbd5e1; margin-top: 1px;">
            Resource: <strong>${typeName}</strong> • <span style="color: #f8fafc; font-weight: 600;">${node.amount.toLocaleString()}</span> / ${node.maxAmount.toLocaleString()}
          </div>
          <div style="width: 130px; height: 4px; background: #334155; border-radius: 2px; margin-top: 5px; overflow: hidden;">
            <div style="width: ${pct}%; height: 100%; background: ${themeColor};"></div>
          </div>
          <div style="font-size: 10px; color: #94a3b8; margin-top: 4px; font-style: italic;">${hint}</div>
        </div>
      </div>
    `;

    // Ensure within viewport bounds
    const tooltipWidth = 230;
    const tooltipHeight = 72;
    let posX = screenX + 16;
    let posY = screenY + 16;
    if (posX + tooltipWidth > window.innerWidth) posX = screenX - tooltipWidth - 8;
    if (posY + tooltipHeight > window.innerHeight) posY = screenY - tooltipHeight - 8;

    this.hoverTooltipElem.style.left = `${posX}px`;
    this.hoverTooltipElem.style.top = `${posY}px`;
    this.hoverTooltipElem.style.display = 'block';
  }

  public hideResourceHoverTooltip(): void {
    if (this.hoverTooltipElem) {
      this.hoverTooltipElem.style.display = 'none';
    }
  }

  public showResourceDetails(node: ResourceNodeData): void {
    let icon = '🪙';
    let name = 'Gold Vein / Mine';
    let desc = 'Rich golden ore nuggets embedded in bedrock. Crucial for hiring knights, constructing siege weapons, training war dragons, and advancing civilization.';
    let themeColor = '#fbbf24';

    if (node.type === 'metal') {
      icon = '🪙';
      name = 'Gold Vein Deposit';
      desc = 'Rich golden ore nuggets. Essential for advanced military training, war dragons, and imperial wonders.';
      themeColor = '#fbbf24';
    } else if (node.type === 'wood') {
      icon = '🌲';
      name = 'Timber Forest';
      desc = 'Dense woodland timber. Send workers to harvest lumber for buildings, archery, and siege workshops.';
      themeColor = '#10b981';
    } else if (node.type === 'stone') {
      icon = '🪨';
      name = 'Granite Stone Quarry';
      desc = 'Hard natural stone outcrop. Essential for fortresses, walls, watchtowers, and town centres.';
      themeColor = '#94a3b8';
    } else if (node.type === 'food') {
      icon = '🌾';
      name = 'Forage Berry Bush';
      desc = 'Wild agrarian food source. Immediate food supply for training workers and initial military forces.';
      themeColor = '#ef4444';
    }

    const pct = Math.max(0, Math.min(100, (node.amount / node.maxAmount) * 100));

    this.selectionDetailsElem.innerHTML = `
      <div>
        <div style="font-weight: 700; font-size: 15px; color: ${themeColor}; display: flex; align-items: center; gap: 6px;">
          <span>${icon}</span> <span>${name}</span>
        </div>
        <div style="font-size: 11px; color: #94a3b8;">Natural Resource Deposit</div>
      </div>
      <div>
        <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px;">
          <span style="color: #cbd5e1;">Remaining</span>
          <span style="font-weight: 700; color: ${themeColor};">${node.amount.toLocaleString()} / ${node.maxAmount.toLocaleString()}</span>
        </div>
        <div style="width: 100%; height: 6px; background: #334155; border-radius: 3px; overflow: hidden;">
          <div style="width: ${pct}%; height: 100%; background: ${themeColor}; transition: width 0.2s ease;"></div>
        </div>
      </div>
      <div style="font-size: 11px; color: #94a3b8; line-height: 1.4;">
        ${desc}
      </div>
      <div style="font-size: 10px; color: #38bdf8; font-style: italic; background: rgba(56, 189, 248, 0.1); border-left: 2px solid #38bdf8; padding: 4px 6px;">
        💡 Right-click this resource with selected Workers to automatically gather.
      </div>
    `;

    this.currentContextKey = 'resource_selected';
    this.actionMatrixElem.innerHTML = `
      <div style="grid-column: span 4; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #94a3b8; font-size: 11px; text-align: center; padding: 6px;">
        <span style="font-size: 24px; margin-bottom: 4px;">⛏️</span>
        <div>Right-click with Workers to extract <strong>${node.type === 'metal' ? 'GOLD' : node.type.toUpperCase()}</strong></div>
      </div>
    `;
  }

  public updateSelection(
    selectedUnits: UnitData[],
    selectedBuildings: BuildingData[],
    player: PlayerState
  ): void {
    if (selectedUnits.length === 0 && selectedBuildings.length === 0) {
      if (this.currentContextKey !== 'none' && this.currentContextKey !== 'resource_selected') {
        this.currentContextKey = 'none';
        this.selectionDetailsElem.innerHTML = `<div style="color: #64748b; font-size: 13px; text-align: center; margin-top: 60px;">Click any unit, building, or resource deposit</div>`;
        this.actionMatrixElem.innerHTML = '';
      }
      return;
    }

    // 1. Units Selected
    if (selectedUnits.length > 0) {
      if (selectedUnits.length === 1) {
        const unit = selectedUnits[0];
        const udef = UNIT_DEFINITIONS[unit.type];
        this.selectionDetailsElem.innerHTML = `
          <div>
            <div style="font-weight: 700; font-size: 15px; color: #f8fafc;">${udef.name}</div>
            <div style="font-size: 12px; color: #94a3b8;">${udef.role} • Status: <span style="color: #38bdf8; text-transform: capitalize;">${unit.state}</span></div>
          </div>
          <div>
            <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px;">
              <span>HP</span><span>${Math.ceil(unit.hp)} / ${unit.maxHp}</span>
            </div>
            <div style="width: 100%; height: 6px; background: #334155; border-radius: 3px; overflow: hidden;">
              <div style="width: ${(unit.hp / unit.maxHp) * 100}%; height: 100%; background: #22c55e;"></div>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 11px; color: #cbd5e1;">
            <div>Damage: <strong>${udef.damage}</strong></div>
            <div>Speed: <strong>${udef.speed}</strong></div>
            <div>Range: <strong>${udef.attackRange}</strong></div>
            <div>Carrying: <strong>${unit.carriedResourceAmount} ${unit.carriedResourceType || ''}</strong></div>
          </div>
        `;

        if (unit.type === 'worker' && unit.ownerId === player.id) {
          const targetKey = `worker_matrix_${player.age}`;
          if (this.currentContextKey !== targetKey) {
            this.currentContextKey = targetKey;
            this.renderWorkerBuildMatrix(player);
          } else {
            this.updateActionMatrixDynamicState(player);
          }
        } else {
          if (this.currentContextKey !== 'unit_other') {
            this.currentContextKey = 'unit_other';
            this.actionMatrixElem.innerHTML = '';
          }
        }
      } else {
        this.selectionDetailsElem.innerHTML = `
          <div>
            <div style="font-weight: 700; font-size: 15px; color: #f8fafc;">Squad Selection (${selectedUnits.length} Units)</div>
            <div style="font-size: 12px; color: #94a3b8;">Multiple Combat Units</div>
          </div>
          <div style="font-size: 12px; color: #cbd5e1;">
            Right-click ground to march in formation. Right-click enemy to attack.
          </div>
        `;

        const hasWorker = selectedUnits.some(u => u.type === 'worker' && u.ownerId === player.id);
        if (hasWorker) {
          const targetKey = `worker_matrix_${player.age}`;
          if (this.currentContextKey !== targetKey) {
            this.currentContextKey = targetKey;
            this.renderWorkerBuildMatrix(player);
          } else {
            this.updateActionMatrixDynamicState(player);
          }
        } else {
          if (this.currentContextKey !== 'squad_combat') {
            this.currentContextKey = 'squad_combat';
            this.actionMatrixElem.innerHTML = '';
          }
        }
      }
      return;
    }

    // 2. Building Selected
    if (selectedBuildings.length > 0) {
      const bldg = selectedBuildings[0];
      const bdef = BUILDING_DEFINITIONS[bldg.type];

      let activityHtml = '';

      if (!bldg.isConstructed) {
        activityHtml = `
          <div style="margin-top: 6px;">
            <div style="font-size: 11px; color: #f59e0b; display: flex; justify-content: space-between; font-weight: 700;">
              <span>🔨 Construction Progress</span>
              <span>${Math.floor(bldg.constructionProgress)}%</span>
            </div>
            <div style="width: 100%; height: 7px; background: #334155; border-radius: 4px; overflow: hidden; margin-top: 2px;">
              <div style="width: ${bldg.constructionProgress}%; height: 100%; background: linear-gradient(90deg, #f59e0b, #10b981); transition: width 0.1s linear;"></div>
            </div>
          </div>
        `;
      } else if (bldg.productionQueue.length > 0) {
        const item = bldg.productionQueue[0];
        const itemName = item.itemType.replace('_', ' ').toUpperCase();
        activityHtml = `
          <div style="margin-top: 6px;">
            <div style="font-size: 11px; color: #38bdf8; display: flex; justify-content: space-between; font-weight: 700;">
              <span>⚙️ Active: ${itemName}</span>
              <span>${Math.floor(item.progress)}%</span>
            </div>
            <div style="width: 100%; height: 7px; background: #334155; border-radius: 4px; overflow: hidden; margin-top: 2px;">
              <div style="width: ${item.progress}%; height: 100%; background: linear-gradient(90deg, #06b6d4, #38bdf8); transition: width 0.1s linear;"></div>
            </div>
            ${bldg.productionQueue.length > 1 ? `<div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">Queue: +${bldg.productionQueue.length - 1} item(s) pending</div>` : ''}
          </div>
        `;
      } else if (bldg.type === 'farm') {
        activityHtml = `
          <div style="margin-top: 6px;">
            <div style="font-size: 11px; color: #4ade80; display: flex; justify-content: space-between; font-weight: 700;">
              <span>🌾 Agrarian Food Plot</span>
              <span style="color: #86efac;">● WORKING</span>
            </div>
            <div style="width: 100%; height: 7px; background: #14532d; border-radius: 4px; overflow: hidden; margin-top: 2px;">
              <div style="width: 100%; height: 100%; background: linear-gradient(90deg, #22c55e, #86efac); opacity: 0.9;"></div>
            </div>
            <div style="font-size: 10px; color: #cbd5e1; margin-top: 2px;">Continuous food harvesting. Workers auto-deposit food.</div>
          </div>
        `;
      } else if (bldg.type === 'research_hall') {
        activityHtml = `
          <div style="margin-top: 6px;">
            <div style="font-size: 11px; color: #c084fc; display: flex; justify-content: space-between; font-weight: 700;">
              <span>🧪 Research Academy</span>
              <span style="color: #e9d5ff;">+1 Knowledge / sec</span>
            </div>
            <div style="width: 100%; height: 7px; background: #3b0764; border-radius: 4px; overflow: hidden; margin-top: 2px;">
              <div style="width: 100%; height: 100%; background: linear-gradient(90deg, #9333ea, #c084fc); opacity: 0.9;"></div>
            </div>
            <div style="font-size: 10px; color: #cbd5e1; margin-top: 2px;">Generates knowledge for advancing technology and ages.</div>
          </div>
        `;
      } else if (bldg.type === 'lumber_camp' || bldg.type === 'quarry' || bldg.type === 'mining_camp') {
        const resLabel = bldg.type === 'lumber_camp' ? 'Timber Depot' : bldg.type === 'quarry' ? 'Stone Depot' : 'Metal Depot';
        activityHtml = `
          <div style="margin-top: 6px;">
            <div style="font-size: 11px; color: #38bdf8; display: flex; justify-content: space-between; font-weight: 700;">
              <span>📦 ${resLabel}</span>
              <span style="color: #4ade80;">● ACTIVE</span>
            </div>
            <div style="width: 100%; height: 7px; background: #0f172a; border-radius: 4px; overflow: hidden; margin-top: 2px;">
              <div style="width: 100%; height: 100%; background: linear-gradient(90deg, #0284c7, #38bdf8); opacity: 0.85;"></div>
            </div>
            <div style="font-size: 10px; color: #cbd5e1; margin-top: 2px;">Local resource drop-off station for gatherers.</div>
          </div>
        `;
      } else {
        activityHtml = `
          <div style="margin-top: 6px;">
            <div style="font-size: 11px; color: #64748b; display: flex; justify-content: space-between;">
              <span>Status: Facility Idle</span>
              <span style="color: #38bdf8;">Ready</span>
            </div>
            <div style="width: 100%; height: 7px; background: #1e293b; border-radius: 4px; overflow: hidden; margin-top: 2px;">
              <div style="width: 100%; height: 100%; background: #334155;"></div>
            </div>
          </div>
        `;
      }

      const isWorking = !bldg.isConstructed || bldg.productionQueue.length > 0 || bldg.type === 'farm' || bldg.type === 'research_hall';
      const statusBadge = !bldg.isConstructed
        ? `<span style="color: #f59e0b; font-weight: 600;">🔨 Building (${Math.floor(bldg.constructionProgress)}%)</span>`
        : isWorking
        ? `<span style="color: #4ade80; font-weight: 600;">⚙️ Working</span>`
        : `<span style="color: #94a3b8;">Operational</span>`;

      const isProductionBldg = ['town_centre', 'barracks', 'archery_range', 'stable', 'workshop', 'fort'].includes(bldg.type);
      let rallyHtml = '';
      if (isProductionBldg && bldg.ownerId === player.id) {
        if (bldg.rallyPoint) {
          let rallyDesc = `Ground (${Math.round(bldg.rallyPoint.x)}, ${Math.round(bldg.rallyPoint.y)})`;
          if (bldg.rallyPoint.targetType === 'resource') {
            rallyDesc = 'Resource Node (Auto-Gather)';
          } else if (bldg.rallyPoint.targetType === 'building') {
            rallyDesc = 'Building (Auto-Construct / Defend)';
          }
          rallyHtml = `
            <div style="margin-top: 6px; padding: 5px 8px; background: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.4); border-radius: 6px; font-size: 11px; display: flex; align-items: center; justify-content: space-between;">
              <span style="color: #38bdf8; font-weight: 700;">🚩 Checkpoint:</span>
              <span style="color: #f8fafc; font-weight: 600; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 140px;" title="${rallyDesc}">${rallyDesc}</span>
            </div>
          `;
        } else {
          rallyHtml = `
            <div style="margin-top: 6px; padding: 4px 8px; background: rgba(30, 41, 59, 0.6); border: 1px dashed rgba(148, 163, 184, 0.35); border-radius: 6px; font-size: 10px; color: #94a3b8; display: flex; align-items: center; gap: 4px;">
              <span>🚩</span>
              <span>Right-click ground / resource to set checkpoint</span>
            </div>
          `;
        }
      }

      this.selectionDetailsElem.innerHTML = `
        <div>
          <div style="font-weight: 700; font-size: 15px; color: #f8fafc;">${bdef.name}</div>
          <div style="font-size: 12px; margin-top: 1px;">${statusBadge}</div>
        </div>
        <div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px;">
            <span>Structure Integrity</span><span>${Math.ceil(bldg.hp)} / ${bldg.maxHp}</span>
          </div>
          <div style="width: 100%; height: 6px; background: #334155; border-radius: 3px; overflow: hidden;">
            <div style="width: ${(bldg.hp / bldg.maxHp) * 100}%; height: 100%; background: #38bdf8;"></div>
          </div>
        </div>
        ${activityHtml}
        ${rallyHtml}
      `;


      if (bldg.ownerId === player.id) {
        const targetKey = `bldg_${bldg.id}_${bldg.type}_${bldg.isConstructed ? 'done' : 'prog'}_${player.age}`;
        if (this.currentContextKey !== targetKey) {
          this.currentContextKey = targetKey;
          if (!bldg.isConstructed) {
            this.actionMatrixElem.innerHTML = `
              <button id="btn-assign-builders" style="grid-column: span 4; grid-row: span 2; background: #16a34a; border: none; color: white; border-radius: 8px; font-weight: 700; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                <span>🔨</span> Send Workers to Build
              </button>
            `;
            this.actionMatrixElem.querySelector('#btn-assign-builders')?.addEventListener('click', () => {
              this.callbacks.onAssignWorkersToBuild(bldg.id);
              soundManager.playBuild();
              this.showNotification(`🔨 Assigned workers to construct ${bdef.name}!`);
            });
          } else {
            this.renderBuildingActionMatrix(bldg, player);
          }
        } else {
          this.updateActionMatrixDynamicState(player);
        }
      } else {
        if (this.currentContextKey !== 'bldg_enemy') {
          this.currentContextKey = 'bldg_enemy';
          this.actionMatrixElem.innerHTML = '';
        }
      }
    }
  }

  private renderWorkerBuildMatrix(player: PlayerState): void {
    this.actionMatrixElem.innerHTML = '';

    const buildingsToOffer: { type: BuildingType; label: string; icon: string; costText: string }[] = [
      { type: 'house', label: 'House', icon: '🏠', costText: '60W' },
      { type: 'farm', label: 'Farm', icon: '🌾', costText: '75W' },
      { type: 'lumber_camp', label: 'Lumber', icon: '🪵', costText: '80W' },
      { type: 'quarry', label: 'Quarry', icon: '🪨', costText: '80W 20S' },
      { type: 'mining_camp', label: 'Mining', icon: '🪙', costText: '90W 25S' },
      { type: 'barracks', label: 'Barracks', icon: '⚔️', costText: '120W 30S' },
      { type: 'archery_range', label: 'Archery', icon: '🏹', costText: '140W 40S' },
      { type: 'stable', label: 'Stable', icon: '🐎', costText: '150W 50S' },
      { type: 'workshop', label: 'Workshop', icon: '⚙️', costText: '200W 100S' },
      { type: 'research_hall', label: 'Academy', icon: '📜', costText: '120W 60S' },
      { type: 'watchtower', label: 'Tower', icon: '🗼', costText: '60W 120S' },
      { type: 'fort', label: 'Fort / Roost', icon: '🏰', costText: '180W 350S' }
    ];

    buildingsToOffer.forEach(b => {
      const def = BUILDING_DEFINITIONS[b.type];
      const ageRank = (a: AgeName) => ['Founding Age', 'Kingdom Age', 'Imperial Age', 'Industrial Age'].indexOf(a);
      const isAgeUnlocked = ageRank(player.age) >= ageRank(def.requiredAge);

      const btn = document.createElement('button');
      btn.className = 'build-matrix-btn';
      btn.dataset.btype = b.type;
      btn.dataset.unlocked = isAgeUnlocked ? 'true' : 'false';

      btn.style.cssText = `
        background: ${isAgeUnlocked ? '#1e293b' : '#0f172a'};
        border: 1.5px solid ${isAgeUnlocked ? '#475569' : '#1e293b'};
        color: ${isAgeUnlocked ? '#f8fafc' : '#475569'};
        border-radius: 6px;
        padding: 4px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        cursor: ${isAgeUnlocked ? 'pointer' : 'not-allowed'};
        font-size: 11px;
        transition: all 0.15s ease;
      `;
      btn.innerHTML = `
        <span style="font-size: 14px;">${b.icon}</span>
        <span style="font-weight: 600;">${b.label}</span>
        <span class="cost-text" style="font-size: 9px; color: ${isAgeUnlocked ? '#94a3b8' : '#334155'};">${b.costText}</span>
      `;

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!isAgeUnlocked) {
          soundManager.playError();
          this.showNotification(`🔒 Requires ${def.requiredAge}!`);
          return;
        }

        const curPlayer = this.currentPlayer || player;
        const canAfford =
          curPlayer.resources.food >= def.cost.food &&
          curPlayer.resources.wood >= def.cost.wood &&
          curPlayer.resources.stone >= def.cost.stone &&
          curPlayer.resources.metal >= def.cost.metal &&
          curPlayer.resources.knowledge >= def.cost.knowledge;

        if (!canAfford) {
          soundManager.playError();
          this.showNotification(`⚠️ Insufficient resources! Need ${b.costText} to construct ${def.name}.`);
          return;
        }

        this.callbacks.onStartPlacement(b.type);
        this.showNotification(`🔨 Selected ${def.name}. Left-Click map to place.`);
      });

      this.actionMatrixElem.appendChild(btn);
    });

    if (this.activePlacementType) {
      this.setPlacementActive(this.activePlacementType);
    }
  }

  private renderBuildingActionMatrix(bldg: BuildingData, player: PlayerState): void {
    this.actionMatrixElem.innerHTML = '';

    // If Town Centre: train worker, advance age
    if (bldg.type === 'town_centre') {
      const trainWorkerBtn = document.createElement('button');
      trainWorkerBtn.style.cssText = 'background: #1e293b; border: 1px solid #475569; color: #f8fafc; border-radius: 6px; padding: 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; font-size: 11px;';
      trainWorkerBtn.innerHTML = `
        <span style="font-size: 16px;">🧑‍🌾</span>
        <span style="font-weight: 600;">Worker</span>
        <span style="font-size: 9px; color: #94a3b8;">50 Food</span>
      `;
      trainWorkerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const curPlayer = this.currentPlayer || player;
        if (curPlayer.population >= curPlayer.maxPopulation) {
          soundManager.playError();
          this.showNotification(`⚠️ Population cap reached (${curPlayer.population}/${curPlayer.maxPopulation})! Construct Houses.`);
          return;
        }
        if (curPlayer.resources.food < 50) {
          soundManager.playError();
          this.showNotification(`⚠️ Need 50 Food to train a Worker! (Have ${Math.floor(curPlayer.resources.food)})`);
          return;
        }
        this.callbacks.onTrainUnit(bldg.id, 'worker');
        this.showNotification(`🧑‍🌾 Worker training queued at Town Centre.`);
      });
      this.actionMatrixElem.appendChild(trainWorkerBtn);

      // If Imperial or Industrial Age, summon War Dragon directly from Town Centre!
      if (player.age === 'Imperial Age' || player.age === 'Industrial Age') {
        this.addTrainButton(bldg, 'dragon', 'War Dragon', '🐉', '150F 40W 120M 60K');
      }

      // Advance Age Button
      const ageReq = AGE_ADVANCEMENT_REQUIREMENTS[player.age];
      if (ageReq && ageReq.nextAge) {
        const canAfford =
          player.resources.food >= ageReq.cost.food &&
          player.resources.wood >= ageReq.cost.wood &&
          player.resources.stone >= ageReq.cost.stone &&
          player.resources.metal >= ageReq.cost.metal &&
          player.resources.knowledge >= ageReq.cost.knowledge;

        const ageBtn = document.createElement('button');
        ageBtn.id = 'hud-advance-age-btn';
        ageBtn.style.cssText = `
          background: ${canAfford ? 'linear-gradient(180deg, #d97706 0%, #b45309 100%)' : '#1e293b'};
          border: 1.5px solid ${canAfford ? '#fbbf24' : '#475569'};
          color: ${canAfford ? '#ffffff' : '#94a3b8'};
          border-radius: 6px;
          padding: 6px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 11px;
          grid-column: span 2;
          box-shadow: ${canAfford ? '0 2px 8px rgba(217, 119, 6, 0.4)' : 'none'};
        `;
        const costItems: string[] = [];
        if (ageReq.cost.food > 0) costItems.push(`${ageReq.cost.food}F`);
        if (ageReq.cost.wood > 0) costItems.push(`${ageReq.cost.wood}W`);
        if (ageReq.cost.stone > 0) costItems.push(`${ageReq.cost.stone}S`);
        if (ageReq.cost.metal > 0) costItems.push(`${ageReq.cost.metal}M`);
        if (ageReq.cost.knowledge > 0) costItems.push(`${ageReq.cost.knowledge}K`);

        ageBtn.innerHTML = `
          <span style="font-size: 16px;">👑</span>
          <span style="font-weight: 700;">Advance to ${ageReq.nextAge}</span>
          <span style="font-size: 9px; color: ${canAfford ? '#fef3c7' : '#94a3b8'};">${costItems.join(' ')}</span>
        `;
        ageBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const curPlayer = this.currentPlayer || player;
          const missing: string[] = [];
          if (curPlayer.resources.food < ageReq.cost.food) missing.push(`${ageReq.cost.food - Math.floor(curPlayer.resources.food)} Food`);
          if (curPlayer.resources.wood < ageReq.cost.wood) missing.push(`${ageReq.cost.wood - Math.floor(curPlayer.resources.wood)} Wood`);
          if (curPlayer.resources.stone < ageReq.cost.stone) missing.push(`${ageReq.cost.stone - Math.floor(curPlayer.resources.stone)} Stone`);
          if (curPlayer.resources.metal < ageReq.cost.metal) missing.push(`${ageReq.cost.metal - Math.floor(curPlayer.resources.metal)} Metal`);
          if (curPlayer.resources.knowledge < ageReq.cost.knowledge) missing.push(`${ageReq.cost.knowledge - Math.floor(curPlayer.resources.knowledge)} Knowledge`);

          if (missing.length > 0) {
            soundManager.playError();
            this.showNotification(`⚠️ Need more resources to advance: ${missing.join(', ')}!`);
            return;
          }

          this.callbacks.onAdvanceAge(bldg.id);
          this.showNotification(`👑 Advancing civilization to ${ageReq.nextAge}...`);
        });
        this.actionMatrixElem.appendChild(ageBtn);
      }
    }

    // Barracks
    if (bldg.type === 'barracks') {
      this.addTrainButton(bldg, 'basic_infantry', 'Infantry', '⚔️', '60F 25W 10M');
      this.addTrainButton(bldg, 'spearman', 'Spearman', '🛡️', '50F 40W 5M');
    }

    // Archery Range
    if (bldg.type === 'archery_range') {
      this.addTrainButton(bldg, 'ranged_infantry', 'Marksman', '🏹', '40F 60W 15M');
    }

    // Stable
    if (bldg.type === 'stable') {
      this.addTrainButton(bldg, 'cavalry', 'Cavalry', '🐎', '80F 30W 60M');
    }

    // Workshop
    if (bldg.type === 'workshop') {
      this.addTrainButton(bldg, 'siege_unit', 'Siege Bombard', '💣', '140W 50S 90M');
    }

    // Fort (Citadel & Dragon Roost)
    if (bldg.type === 'fort') {
      this.addTrainButton(bldg, 'advanced_unit', 'Imperial Vanguard', '🛡️', '120F 50W 120M');
      this.addTrainButton(bldg, 'dragon', 'War Dragon', '🐉', '150F 40W 120M 60K');
    }

    // Research Hall (Academy)
    if (bldg.type === 'research_hall') {
      const ageRank = (a: AgeName) => ['Founding Age', 'Kingdom Age', 'Imperial Age', 'Industrial Age'].indexOf(a);
      const playerRank = ageRank(player.age);

      // Filter out technologies that are already researched
      const unresearched = Object.values(TECHNOLOGIES).filter(t => !player.researchedTechs.includes(t.id));

      // Separate into currently available (age unlocked) and upcoming technologies
      const availableTechs = unresearched.filter(t => ageRank(t.requiredAge) <= playerRank);
      availableTechs.sort((a, b) => {
        const aReady = a.prerequisites.every(p => player.researchedTechs.includes(p)) ? 0 : 1;
        const bReady = b.prerequisites.every(p => player.researchedTechs.includes(p)) ? 0 : 1;
        return aReady - bReady;
      });

      const upcomingTechs = unresearched
        .filter(t => ageRank(t.requiredAge) > playerRank)
        .sort((a, b) => ageRank(a.requiredAge) - ageRank(b.requiredAge));

      // Populate up to 8 slots
      const displayedTechs = [...availableTechs, ...upcomingTechs].slice(0, 8);

      displayedTechs.forEach(t => {
        const isQueued = bldg.productionQueue && bldg.productionQueue.some(item => item.itemType === t.id);
        const meetsAge = ageRank(t.requiredAge) <= playerRank;
        const missingPrereq = t.prerequisites.find(p => !player.researchedTechs.includes(p));
        const meetsPrereqs = !missingPrereq;
        const canAfford =
          meetsAge &&
          meetsPrereqs &&
          !isQueued &&
          player.resources.food >= t.cost.food &&
          player.resources.wood >= t.cost.wood &&
          player.resources.stone >= t.cost.stone &&
          player.resources.metal >= t.cost.metal &&
          player.resources.knowledge >= t.cost.knowledge;

        // Build compact cost summary
        const costParts: string[] = [];
        if (t.cost.food > 0) costParts.push(`${t.cost.food}F`);
        if (t.cost.wood > 0) costParts.push(`${t.cost.wood}W`);
        if (t.cost.stone > 0) costParts.push(`${t.cost.stone}S`);
        if (t.cost.metal > 0) costParts.push(`${t.cost.metal}M`);
        if (t.cost.knowledge > 0) costParts.push(`${t.cost.knowledge}K`);
        const costStr = costParts.join(' ');

        const btn = document.createElement('button');
        const prereqName = missingPrereq ? (TECHNOLOGIES[missingPrereq]?.name || missingPrereq) : '';
        btn.title = `${t.name} (${t.requiredAge})\n${t.description}\n\nCost: ${costStr}${!meetsAge ? `\n⚠️ Locked: Requires advancing to ${t.requiredAge}` : ''}${missingPrereq ? `\n⚠️ Locked: Requires researching ${prereqName} first` : ''}`;

        btn.style.cssText = `
          background: ${isQueued ? '#083344' : canAfford ? '#1e293b' : '#0f172a'};
          border: 1px solid ${isQueued ? '#06b6d4' : canAfford ? '#38bdf8' : '#334155'};
          color: ${isQueued ? '#67e8f9' : canAfford ? '#f8fafc' : '#64748b'};
          border-radius: 6px;
          padding: 4px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: ${isQueued ? 'default' : meetsAge && meetsPrereqs ? 'pointer' : 'not-allowed'};
          font-size: 10px;
          transition: all 0.15s ease;
        `;

        let subtitle = `<span style="font-size: 8px; color: ${canAfford ? '#38bdf8' : '#94a3b8'};">${costStr}</span>`;
        if (isQueued) {
          subtitle = `<span style="font-size: 8px; color: #06b6d4; font-weight: 700;">⚙️ In Queue</span>`;
        } else if (!meetsAge) {
          subtitle = `<span style="font-size: 8px; color: #f43f5e; font-weight: 600;">🔒 ${t.requiredAge}</span>`;
        } else if (!meetsPrereqs) {
          subtitle = `<span style="font-size: 8px; color: #eab308; font-weight: 600;">🔒 Req: ${prereqName}</span>`;
        }

        btn.innerHTML = `
          <span style="font-weight: 600; color: ${isQueued ? '#38bdf8' : meetsAge && meetsPrereqs ? '#f8fafc' : '#64748b'}; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 95%;">${t.name}</span>
          ${subtitle}
        `;

        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const curPlayer = this.currentPlayer || player;
          const curRank = ageRank(curPlayer.age);

          if (isQueued || (bldg.productionQueue && bldg.productionQueue.some(item => item.itemType === t.id))) {
            this.showNotification(`⚙️ ${t.name} is already being researched!`);
            return;
          }

          if (ageRank(t.requiredAge) > curRank) {
            soundManager.playError();
            this.showNotification(`🔒 ${t.name} requires advancing to ${t.requiredAge} at the Town Centre!`);
            return;
          }

          const curMissingPrereq = t.prerequisites.find(p => !curPlayer.researchedTechs.includes(p));
          if (curMissingPrereq) {
            soundManager.playError();
            const curPrereqName = TECHNOLOGIES[curMissingPrereq]?.name || curMissingPrereq;
            this.showNotification(`🔒 ${t.name} requires researching ${curPrereqName} first!`);
            return;
          }

          const missingResources: string[] = [];
          if (curPlayer.resources.food < t.cost.food) missingResources.push(`${t.cost.food - curPlayer.resources.food} Food`);
          if (curPlayer.resources.wood < t.cost.wood) missingResources.push(`${t.cost.wood - curPlayer.resources.wood} Wood`);
          if (curPlayer.resources.stone < t.cost.stone) missingResources.push(`${t.cost.stone - curPlayer.resources.stone} Stone`);
          if (curPlayer.resources.metal < t.cost.metal) missingResources.push(`${t.cost.metal - curPlayer.resources.metal} Metal`);
          if (curPlayer.resources.knowledge < t.cost.knowledge) missingResources.push(`${t.cost.knowledge - curPlayer.resources.knowledge} Knowledge`);

          if (missingResources.length > 0) {
            soundManager.playError();
            this.showNotification(`⚠️ Need ${missingResources.join(', ')} to research ${t.name}!`);
            return;
          }

          this.callbacks.onResearchTech(bldg.id, t.id);
          this.showNotification(`📜 Commenced research: ${t.name}`);
        });

        this.actionMatrixElem.appendChild(btn);
      });
    }
  }

  private updateActionMatrixDynamicState(player: PlayerState): void {
    // Dynamically update Advance Age button styles
    const ageBtn = this.actionMatrixElem.querySelector<HTMLElement>('#hud-advance-age-btn');
    if (ageBtn) {
      const ageReq = AGE_ADVANCEMENT_REQUIREMENTS[player.age];
      if (ageReq && ageReq.nextAge) {
        const canAfford =
          player.resources.food >= ageReq.cost.food &&
          player.resources.wood >= ageReq.cost.wood &&
          player.resources.stone >= ageReq.cost.stone &&
          player.resources.metal >= ageReq.cost.metal &&
          player.resources.knowledge >= ageReq.cost.knowledge;

        ageBtn.style.background = canAfford ? 'linear-gradient(180deg, #d97706 0%, #b45309 100%)' : '#1e293b';
        ageBtn.style.borderColor = canAfford ? '#fbbf24' : '#475569';
        ageBtn.style.color = canAfford ? '#ffffff' : '#94a3b8';
      }
    }
  }

  private addTrainButton(bldg: BuildingData, unitType: UnitType, label: string, icon: string, costText: string): void {
    const btn = document.createElement('button');
    const isDragon = unitType === 'dragon';
    btn.style.cssText = isDragon
      ? 'background: linear-gradient(180deg, #7f1d1d 0%, #450a0a 100%); border: 1.5px solid #f97316; color: #f8fafc; border-radius: 6px; padding: 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; font-size: 11px; box-shadow: 0 0 10px rgba(249, 115, 22, 0.45);'
      : 'background: #1e293b; border: 1px solid #475569; color: #f8fafc; border-radius: 6px; padding: 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; font-size: 11px;';
    btn.innerHTML = `
      <span style="font-size: 16px;">${icon}</span>
      <span style="font-weight: 700; ${isDragon ? 'color: #fed7aa;' : ''}">${label}</span>
      <span style="font-size: 9px; color: ${isDragon ? '#fdba74' : '#94a3b8'};">${costText}</span>
    `;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const udef = UNIT_DEFINITIONS[unitType];
      const curPlayer = this.currentPlayer;
      if (curPlayer) {
        if (curPlayer.population + udef.populationCost > curPlayer.maxPopulation) {
          soundManager.playError();
          this.showNotification(`⚠️ Population limit reached! Build Houses to recruit more troops.`);
          return;
        }
        const canAfford =
          curPlayer.resources.food >= udef.cost.food &&
          curPlayer.resources.wood >= udef.cost.wood &&
          curPlayer.resources.stone >= udef.cost.stone &&
          curPlayer.resources.metal >= udef.cost.metal &&
          curPlayer.resources.knowledge >= udef.cost.knowledge;
        if (!canAfford) {
          soundManager.playError();
          this.showNotification(`⚠️ Need ${costText} to recruit ${label}!`);
          return;
        }
      }
      this.callbacks.onTrainUnit(bldg.id, unitType);
      this.showNotification(isDragon ? `🐉 Summoning War Dragon into the skies!` : `⚔️ Recruiting ${label}...`);
    });
    this.actionMatrixElem.appendChild(btn);
  }

  // Age Advancement Modal Dialog
  private toggleAgeModal(): void {
    if (this.ageModalElem) {
      this.ageModalElem.remove();
      this.ageModalElem = null;
      return;
    }

    if (!this.currentPlayer) return;
    const player = this.currentPlayer;
    const ageReq = AGE_ADVANCEMENT_REQUIREMENTS[player.age];

    this.ageModalElem = document.createElement('div');
    this.ageModalElem.className = 'modal-backdrop interactive';

    const nextAge = ageReq ? ageReq.nextAge : null;
    const canAfford = nextAge ? (
      player.resources.food >= ageReq.cost.food &&
      player.resources.wood >= ageReq.cost.wood &&
      player.resources.stone >= ageReq.cost.stone &&
      player.resources.metal >= ageReq.cost.metal &&
      player.resources.knowledge >= ageReq.cost.knowledge
    ) : false;

    this.ageModalElem.innerHTML = `
      <div style="
        width: 520px;
        background: #0f172a;
        border: 2px solid #d97706;
        border-radius: 14px;
        padding: 24px;
        color: #f8fafc;
        display: flex;
        flex-direction: column;
        gap: 16px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8);
      ">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e293b; padding-bottom: 10px;">
          <h2 class="cinzel" style="font-size: 20px; color: #fbbf24;">CIVILIZATION ADVANCEMENT</h2>
          <span style="font-size: 12px; color: #94a3b8;">Current: <strong>${player.age}</strong></span>
        </div>

        ${nextAge ? `
          <div style="font-size: 13px; color: #cbd5e1;">
            Advancing to <strong style="color: #fbbf24;">${nextAge}</strong> unlocks advanced military buildings, stronger defensive structures, and powerful technologies.
          </div>

          <div style="background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 12px;">
            <div style="font-size: 12px; font-weight: 700; color: #94a3b8; margin-bottom: 6px; text-transform: uppercase;">Required Resources</div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; font-size: 13px;">
              <div style="color: ${player.resources.food >= ageReq.cost.food ? '#4ade80' : '#f87171'};">🌾 Food: ${player.resources.food}/${ageReq.cost.food}</div>
              <div style="color: ${player.resources.wood >= ageReq.cost.wood ? '#4ade80' : '#f87171'};">🪵 Wood: ${player.resources.wood}/${ageReq.cost.wood}</div>
              <div style="color: ${player.resources.knowledge >= ageReq.cost.knowledge ? '#4ade80' : '#f87171'};">📜 Knowledge: ${player.resources.knowledge}/${ageReq.cost.knowledge}</div>
              ${ageReq.cost.stone > 0 ? `<div style="color: ${player.resources.stone >= ageReq.cost.stone ? '#4ade80' : '#f87171'};">🪨 Stone: ${player.resources.stone}/${ageReq.cost.stone}</div>` : ''}
              ${ageReq.cost.metal > 0 ? `<div style="color: ${player.resources.metal >= ageReq.cost.metal ? '#4ade80' : '#f87171'};">🪙 Metal: ${player.resources.metal}/${ageReq.cost.metal}</div>` : ''}
            </div>
          </div>
        ` : `
          <div style="font-size: 14px; color: #4ade80; text-align: center; padding: 20px;">
            Your civilization has achieved the maximum apex era (Industrial Age)!
          </div>
        `}

        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #1e293b; padding-top: 12px;">
          <button id="btn-close-age-modal" style="background: transparent; border: 1px solid #475569; color: #94a3b8; border-radius: 6px; padding: 8px 16px; font-size: 12px; cursor: pointer;">
            Close
          </button>
          ${nextAge ? `
            <button id="btn-modal-advance-age" style="
              background: ${canAfford ? 'linear-gradient(180deg, #d97706 0%, #b45309 100%)' : '#334155'};
              border: none;
              color: white;
              border-radius: 8px;
              padding: 10px 24px;
              font-size: 13px;
              font-weight: 700;
              cursor: pointer;
              box-shadow: ${canAfford ? '0 4px 12px rgba(217, 119, 6, 0.4)' : 'none'};
            ">
              Advance to ${nextAge} 👑
            </button>
          ` : ''}
        </div>
      </div>
    `;

    this.rootElem.appendChild(this.ageModalElem);

    this.ageModalElem.querySelector('#btn-close-age-modal')?.addEventListener('click', () => {
      this.toggleAgeModal();
      soundManager.playClick();
    });

    if (nextAge) {
      this.ageModalElem.querySelector('#btn-modal-advance-age')?.addEventListener('click', () => {
        if (!canAfford) {
          soundManager.playError();
          this.showNotification('⚠️ Cannot advance: Collect the required resources highlighted above!');
          return;
        }
        if (this.townCentreId) {
          this.callbacks.onAdvanceAge(this.townCentreId);
          soundManager.playAgeUp();
          this.showNotification(`👑 Advancing civilization to ${nextAge}!`);
        }
        this.toggleAgeModal();
      });
    }
  }

  // Co-op Tribute Modal Dialog
  private toggleCoopModal(): void {
    if (this.coopModalElem) {
      this.coopModalElem.remove();
      this.coopModalElem = null;
      return;
    }

    if (!this.currentPlayer) return;
    const player = this.currentPlayer;
    const teammates = this.allPlayers.filter(p => p.team === player.team && p.id !== player.id && !p.isDefeated);
    if (teammates.length === 0) {
      this.showNotification('ℹ️ No active co-op allies in this match.');
      return;
    }

    this.coopModalElem = document.createElement('div');
    this.coopModalElem.className = 'modal-backdrop interactive';

    this.renderCoopModalContent();
    this.rootElem.appendChild(this.coopModalElem);
  }

  private renderCoopModalContent(): void {
    if (!this.coopModalElem || !this.currentPlayer) return;
    const player = this.currentPlayer;
    const teammates = this.allPlayers.filter(p => p.team === player.team && p.id !== player.id && !p.isDefeated);

    this.coopModalElem.innerHTML = `
      <div style="
        width: 580px;
        background: #0f172a;
        border: 2px solid #38bdf8;
        border-radius: 14px;
        padding: 24px;
        color: #f8fafc;
        display: flex;
        flex-direction: column;
        gap: 16px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.85);
      ">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e293b; padding-bottom: 10px;">
          <h2 class="cinzel" style="font-size: 20px; color: #38bdf8;">🤝 CO-OP ALLY TRIBUTE</h2>
          <span style="font-size: 12px; color: #94a3b8;">Team ${player.team} Allies</span>
        </div>

        <div style="font-size: 13px; color: #94a3b8;">
          Transfer resources to support your teammates' economy, building production, or age advancement.
        </div>

        <div style="display: flex; flex-direction: column; gap: 12px; max-height: 380px; overflow-y: auto;">
          ${teammates.map(tm => `
            <div style="background: #1e293b; border: 1px solid ${tm.color}; border-radius: 10px; padding: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <div style="width: 10px; height: 10px; border-radius: 50%; background: ${tm.color};"></div>
                  <strong style="font-size: 14px;">${tm.name}</strong>
                  <span style="font-size: 11px; color: #94a3b8;">(${tm.civ} • ${tm.age})</span>
                </div>
                <div style="font-size: 11px; color: #38bdf8; font-weight: 600;">
                  Pop: ${tm.population}/${tm.maxPopulation}
                </div>
              </div>

              <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px;">
                <button class="btn-tribute" data-to="${tm.id}" data-res="food" data-amt="100" ${player.resources.food < 100 ? 'disabled' : ''} style="background: #15803d; border: 1px solid #22c55e; color: white; border-radius: 6px; padding: 6px 4px; font-size: 11px; cursor: pointer; font-weight: 700;">
                  +100 🌾
                </button>
                <button class="btn-tribute" data-to="${tm.id}" data-res="wood" data-amt="100" ${player.resources.wood < 100 ? 'disabled' : ''} style="background: #047857; border: 1px solid #10b981; color: white; border-radius: 6px; padding: 6px 4px; font-size: 11px; cursor: pointer; font-weight: 700;">
                  +100 🪵
                </button>
                <button class="btn-tribute" data-to="${tm.id}" data-res="stone" data-amt="100" ${player.resources.stone < 100 ? 'disabled' : ''} style="background: #475569; border: 1px solid #64748b; color: white; border-radius: 6px; padding: 6px 4px; font-size: 11px; cursor: pointer; font-weight: 700;">
                  +100 🪨
                </button>
                <button class="btn-tribute" data-to="${tm.id}" data-res="metal" data-amt="100" ${player.resources.metal < 100 ? 'disabled' : ''} style="background: #b45309; border: 1px solid #f59e0b; color: white; border-radius: 6px; padding: 6px 4px; font-size: 11px; cursor: pointer; font-weight: 700;">
                  +100 🪙
                </button>
                <button class="btn-tribute" data-to="${tm.id}" data-res="knowledge" data-amt="50" ${player.resources.knowledge < 50 ? 'disabled' : ''} style="background: #6d28d9; border: 1px solid #8b5cf6; color: white; border-radius: 6px; padding: 6px 4px; font-size: 11px; cursor: pointer; font-weight: 700;">
                  +50 📜
                </button>
              </div>
            </div>
          `).join('')}
        </div>

        <div style="display: flex; justify-content: flex-end; border-top: 1px solid #1e293b; padding-top: 12px;">
          <button id="btn-close-coop-modal" style="background: #334155; border: none; color: white; border-radius: 6px; padding: 8px 20px; font-size: 12px; cursor: pointer; font-weight: 600;">
            Close
          </button>
        </div>
      </div>
    `;

    this.coopModalElem.querySelector('#btn-close-coop-modal')?.addEventListener('click', () => {
      this.toggleCoopModal();
    });

    this.coopModalElem.querySelectorAll('.btn-tribute').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const toId = target.dataset.to!;
        const res = target.dataset.res as ResourceType;
        const amt = parseInt(target.dataset.amt!, 10);
        if (player.resources[res] >= amt) {
          player.resources[res] -= amt;
          this.callbacks.onTransferResources?.(toId, res, amt);
          const targetPlayer = teammates.find(t => t.id === toId);
          this.showNotification(`🤝 Sent ${amt} ${res} tribute to ${targetPlayer?.name || 'ally'}!`);
          soundManager.playClick();
          this.renderCoopModalContent();
        }
      });
    });
  }
}
