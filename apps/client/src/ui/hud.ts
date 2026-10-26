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
  TechDefinition,
  AGE_ADVANCEMENT_REQUIREMENTS,
  AgeName,
  ResourceType,
  UnitStance,
  FormationType
} from '@agefront/shared';
import { soundManager } from '../audio/soundManager.js';

export interface HudCallbacks {
  onStartPlacement: (type: BuildingType) => void;
  onCancelPlacement?: () => void;
  onTrainUnit: (buildingId: string, unitType: UnitType) => void;
  onResearchTech: (buildingId: string, techId: string) => void;
  onAdvanceAge: (buildingId: string) => void;
  onCancelProduction?: (buildingId: string, queueIndex: number) => void;
  onSelectIdleWorker: () => void;
  onSelectAllMilitary?: () => void;
  onAssignWorkersToBuild: (buildingId: string) => void;
  onTradeCommodity?: (buyResource: ResourceType, sellResource: ResourceType, buyAmount: number, sellAmount: number) => void;
  onSetStance?: (stance: UnitStance) => void;
  onSetFormation?: (formation: FormationType) => void;
  onOpenMenu: () => void;
  onTransferResources?: (recipientId: string, resource: ResourceType, amount: number) => void;
}

const TECH_DISPLAY_INFO: Record<string, { line1: string; line2?: string }> = {
  forestry_axes: { line1: 'Forestry', line2: 'Axes' },
  crop_rotation: { line1: 'Crop', line2: 'Rotation' },
  deep_shaft_mining: { line1: 'Deep Shaft', line2: 'Mining' },
  logistics_caravans: { line1: 'Logistics', line2: 'Caravans' },
  forged_blades: { line1: 'Forged Steel', line2: 'Blades' },
  bodkin_arrows: { line1: 'Bodkin', line2: 'Arrows' },
  barding_stirrups: { line1: 'Barding &', line2: 'Stirrups' },
  siege_engineering: { line1: 'Siege', line2: 'Engineering' },
  masonry: { line1: 'Reinforced', line2: 'Masonry' },
  architecture: { line1: 'Urban', line2: 'Architecture' },
  arrow_slits: { line1: 'Arrow Slits', line2: 'Embrasures' },
  cartography: { line1: 'Cartography' },
  forced_march: { line1: 'Forced', line2: 'March' },
  urban_planning: { line1: 'Urban', line2: 'Planning' },
  scholasticism: { line1: 'Scholasticism' },
  standing_army: { line1: 'Standing', line2: 'Army' }
};

export const getQueueItemIcon = (category: string, itemType: string): string => {
  if (category === 'age') return '🏛️';
  if (category === 'tech') {
    const cat = TECHNOLOGIES[itemType]?.category;
    if (cat === 'Economy') return '🌾';
    if (cat === 'Military') return '⚔️';
    if (cat === 'Construction') return '🏛️';
    if (cat === 'Exploration') return '🧭';
    return '📜';
  }
  if (itemType === 'worker') return '👨‍🌾';
  if (itemType === 'basic_infantry') return '🗡️';
  if (itemType === 'spearman') return '🛡️';
  if (itemType === 'ranged_infantry') return '🏹';
  if (itemType === 'cavalry') return '🐎';
  if (itemType === 'siege_unit') return '🎯';
  if (itemType === 'advanced_unit') return '👑';
  if (itemType === 'dragon') return '🐉';
  if (itemType === 'trade_cart') return '🛒';
  return '⚔️';
};

export const getQueueItemName = (category: string, itemType: string): string => {
  if (category === 'age') return `Advance to ${itemType}`;
  if (category === 'tech') return TECHNOLOGIES[itemType]?.name || itemType;
  return UNIT_DEFINITIONS[itemType as UnitType]?.name || itemType.replace(/_/g, ' ');
};

export const getQueueItemRefundText = (category: string, itemType: string, playerAge?: AgeName): string => {
  if (category === 'unit') {
    const udef = UNIT_DEFINITIONS[itemType as UnitType];
    if (!udef) return '';
    const parts: string[] = [];
    if (udef.cost.food) parts.push(`${udef.cost.food}F`);
    if (udef.cost.wood) parts.push(`${udef.cost.wood}W`);
    if (udef.cost.stone) parts.push(`${udef.cost.stone}S`);
    if (udef.cost.metal) parts.push(`${udef.cost.metal}G`);
    return parts.join(' ');
  }
  if (category === 'tech') {
    const tech = TECHNOLOGIES[itemType];
    if (!tech) return '';
    const parts: string[] = [];
    if (tech.cost.food) parts.push(`${tech.cost.food}F`);
    if (tech.cost.wood) parts.push(`${tech.cost.wood}W`);
    if (tech.cost.stone) parts.push(`${tech.cost.stone}S`);
    if (tech.cost.metal) parts.push(`${tech.cost.metal}G`);
    if (tech.cost.knowledge) parts.push(`${tech.cost.knowledge}Kn`);
    return parts.join(' ');
  }
  if (category === 'age' && playerAge) {
    const req = AGE_ADVANCEMENT_REQUIREMENTS[playerAge];
    if (!req) return '';
    const parts: string[] = [];
    if (req.cost.food) parts.push(`${req.cost.food}F`);
    if (req.cost.wood) parts.push(`${req.cost.wood}W`);
    if (req.cost.stone) parts.push(`${req.cost.stone}S`);
    if (req.cost.metal) parts.push(`${req.cost.metal}G`);
    if (req.cost.knowledge) parts.push(`${req.cost.knowledge}Kn`);
    return parts.join(' ');
  }
  return '';
};


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
  private scorePanelElem!: HTMLElement;
  private narratorDialogElem!: HTMLElement;

  private ageModalElem: HTMLElement | null = null;
  private coopModalElem: HTMLElement | null = null;
  private techModalElem: HTMLElement | null = null;
  private lastTechModalSig: string = '';
  private coopBtnElem!: HTMLElement;
  private allPlayers: PlayerState[] = [];
  private currentPlayer: PlayerState | null = null;
  private currentStance: UnitStance = 'aggressive';
  private currentFormation: FormationType = 'line';
  private townCentreId: string | null = null;
  private activeTechCategory: string = 'all';
  private isHoveringTech: boolean = false;
  private allBuildings: BuildingData[] = [];

  private currentContextKey: string = '';
  private activePlacementType: BuildingType | null = null;
  private placementBannerElem: HTMLElement | null = null;
  private selectedBuildingId: string | null = null;
  private selectedBuildings: BuildingData[] = [];

  constructor(container: HTMLElement, callbacks: HudCallbacks) {
    this.callbacks = callbacks;
    this.rootElem = document.createElement('div');
    this.rootElem.id = 'hud-container';
    this.rootElem.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; display: none; flex-direction: column; justify-content: space-between; z-index: 40;';
    container.appendChild(this.rootElem);

    this.createTopBar();
    this.createNotificationBanner();
    this.createNarratorAndScorePanels();
    this.createBottomBar();
    this.createHoverTooltip();
    this.setupGlobalKeyboardShortcuts();
  }

  public show(): void {
    this.rootElem.style.display = 'flex';
  }

  public hide(): void {
    this.rootElem.style.display = 'none';
    if (this.ageModalElem) this.ageModalElem.style.display = 'none';
    if (this.coopModalElem) this.coopModalElem.style.display = 'none';
    if (this.techModalElem) this.techModalElem.style.display = 'none';
    if (this.placementBannerElem) this.placementBannerElem.style.display = 'none';
    this.hideResourceHoverTooltip();
  }

  public getMinimapContainer(): HTMLElement {
    return this.minimapContainer;
  }

  // ==========================================
  // TOP BAR (Age of Empires III Definitive Edition)
  // ==========================================
  private createTopBar(): void {
    this.topBarElem = document.createElement('div');
    this.topBarElem.className = 'aoe3-topbar';
    this.topBarElem.style.cssText = `
      width: 100%;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      pointer-events: auto;
      position: relative;
    `;

    this.topBarElem.innerHTML = `
      <!-- Left Bay: Nation Crest, Idle Settler, Pop, Resources with Worker Allocations -->
      <div style="display: flex; align-items: center; gap: 14px;">
        <!-- Nation Shield Crest & Idle Settler badge -->
        <div id="aoe3-top-crest" style="position: relative; display: flex; align-items: center; cursor: pointer;" title="Your Sovereign Civilization">
          <div style="width: 36px; height: 36px; border-radius: 50%; border: 2px solid #d4af37; background: radial-gradient(circle, #1e3a8a, #0b1120); display: flex; align-items: center; justify-content: center; font-size: 18px; box-shadow: 0 2px 8px #000;">
            <span id="aoe3-civ-flag">🇬🇧</span>
          </div>
          <!-- Idle Citizen Worker Badge -->
          <button id="aoe3-idle-badge" style="position: absolute; bottom: -4px; right: -8px; min-width: 19px; height: 19px; padding: 0 4px; border-radius: 10px; background: linear-gradient(180deg, #b45309, #78350f); border: 1px solid #d4af37; color: #fff; font-size: 10px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 4px #000;" title="Select Idle Citizen Worker (Z)">
            <span id="aoe3-idle-count">0</span>
          </button>
        </div>

        <!-- Population -->
        <div class="cinzel" style="display: flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 700; color: #fef08a;" title="Population Headcount">
          <span style="font-size: 15px;">🏠</span>
          <span id="res-pop">0/15</span>
        </div>

        <!-- Resources with Worker Assignment Pills (Food, Wood, Stone, Metal/Gold, Knowledge, Shipments) -->
        <div style="display: flex; align-items: center; gap: 12px; font-size: 12px; font-weight: 700; color: #fef08a;">
          <!-- Food -->
          <div style="display: flex; align-items: center; gap: 5px;" title="Food: Harvested from forage bushes and agrarian plots">
            <span class="aoe3-worker-pill"><span style="font-size: 9px;">👷</span><span id="worker-food">0</span></span>
            <span style="font-size: 15px;">🥩</span>
            <span id="res-food">0</span>
          </div>
          <!-- Wood -->
          <div style="display: flex; align-items: center; gap: 5px;" title="Timber: Harvested from forests and groves">
            <span class="aoe3-worker-pill"><span style="font-size: 9px;">👷</span><span id="worker-wood">0</span></span>
            <span style="font-size: 15px;">🪵</span>
            <span id="res-wood">0</span>
          </div>
          <!-- Stone -->
          <div style="display: flex; align-items: center; gap: 5px;" title="Stone: Quarried from bedrock outcrops for fortifications">
            <span class="aoe3-worker-pill"><span style="font-size: 9px;">👷</span><span id="worker-stone">0</span></span>
            <span style="font-size: 15px;">🪨</span>
            <span id="res-stone">0</span>
          </div>
          <!-- Metal / Gold -->
          <div style="display: flex; align-items: center; gap: 5px;" title="Gold (Treasury): Mined from veins for elite troops and technologies">
            <span class="aoe3-worker-pill"><span style="font-size: 9px;">👷</span><span id="worker-metal">0</span></span>
            <span style="font-size: 15px;">🪙</span>
            <span id="res-metal">0</span>
          </div>
          <!-- Knowledge -->
          <div style="display: flex; align-items: center; gap: 5px;" title="Knowledge: Generated by scholars for technologies">
            <span class="aoe3-worker-pill"><span style="font-size: 9px;">📜</span><span id="worker-knowledge">0</span></span>
            <span id="res-knowledge">0</span>
          </div>
          <!-- Shipment / Point -->
          <div style="display: flex; align-items: center; gap: 4px;" title="Imperial Shipments & Era Points">
            <span style="font-size: 15px;">📦</span>
            <span id="res-shipments">1</span>
          </div>
        </div>
      </div>

      <!-- Right Bay: Era Plaque + Clock + Utility Buttons -->
      <div style="display: flex; align-items: center; gap: 10px;">
        <!-- Era Button (Clickable for Age Advancement) -->
        <button id="aoe3-era-btn" class="aoe-btn-crimson" style="padding: 4px 12px; font-size: 11px; display: flex; align-items: center; gap: 8px;" title="Click to view Age Advancement requirements or advance era!">
          <span id="aoe3-era-roman" style="background: rgba(0,0,0,0.45); padding: 1px 6px; border-radius: 2px; font-weight: 900; border: 1px solid #d4af37;">I</span>
          <span id="aoe3-era-title">I: FOUNDING AGE</span>
          <span id="aoe3-game-clock" style="font-family: monospace; font-size: 11px; color: #fef08a; opacity: 0.9;">00:00</span>
        </button>

        <!-- Utility Buttons (Tribute, Objectives, Tech Tree, Menu) -->
        <button id="btn-hud-coop" class="aoe3-action-btn" style="width: 32px; height: 32px; font-size: 14px;" title="Co-op Ally Tribute">🤝</button>
        <button id="btn-hud-tech-tree" class="aoe3-action-btn" style="width: 32px; height: 32px; font-size: 14px;" title="Civilization Tech Tree & Academy Codex (T)">🔬</button>
        <button id="btn-hud-objectives" class="aoe3-action-btn" style="width: 32px; height: 32px; font-size: 14px;" title="Toggle Objectives & Scoreboard">🏆</button>
        <button id="btn-hud-menu" class="aoe3-action-btn" style="width: 32px; height: 32px; font-size: 14px;" title="Game Menu & Settings">⚙️</button>
      </div>
    `;

    this.rootElem.appendChild(this.topBarElem);

    this.topBarElem.querySelector('#btn-hud-tech-tree')?.addEventListener('click', () => {
      this.toggleTechTreeModal();
    });

    // Quick Action Strip right under top-left bar (Matching Image 2)
    const quickStrip = document.createElement('div');
    quickStrip.id = 'aoe3-quick-strip';
    quickStrip.style.cssText = 'position: absolute; top: 52px; left: 16px; display: flex; gap: 4px; pointer-events: auto; z-index: 45;';
    quickStrip.innerHTML = `
      <button id="quick-btn-idle" class="aoe3-action-btn" style="width: 28px; height: 28px; font-size: 12px;" title="Find Idle Settler (Z)">💤</button>
      <button id="quick-btn-military" class="aoe3-action-btn" style="width: 28px; height: 28px; font-size: 12px;" title="Select All Military Units (V)">📯</button>
      <button id="quick-btn-formation" class="aoe3-action-btn" style="width: 28px; height: 28px; font-size: 12px;" title="Formations & Combat Stances">⚔️</button>
      <button id="quick-btn-builder" class="aoe3-action-btn" style="width: 28px; height: 28px; font-size: 12px;" title="Select Builder for Construction">🔨</button>
    `;
    this.rootElem.appendChild(quickStrip);

    this.ageBadgeElem = this.topBarElem.querySelector('#aoe3-era-btn')!;
    this.ageBadgeElem.addEventListener('click', () => {
      this.toggleAgeModal();
    });

    this.idleWorkerBtnElem = this.topBarElem.querySelector('#aoe3-idle-badge')!;
    this.idleWorkerBtnElem.addEventListener('click', () => {
      this.callbacks.onSelectIdleWorker();
    });

    quickStrip.querySelector('#quick-btn-idle')?.addEventListener('click', () => {
      this.callbacks.onSelectIdleWorker();
    });

    quickStrip.querySelector('#quick-btn-military')?.addEventListener('click', () => {
      this.callbacks.onSelectAllMilitary?.();
    });

    quickStrip.querySelector('#quick-btn-formation')?.addEventListener('click', () => {
      this.showNotification('⚔️ Battle formation set: Line Formation / Aggressive Stance.');
      soundManager.playClick();
    });

    quickStrip.querySelector('#quick-btn-builder')?.addEventListener('click', () => {
      this.callbacks.onSelectIdleWorker();
    });

    this.coopBtnElem = this.topBarElem.querySelector('#btn-hud-coop')!;
    this.coopBtnElem.addEventListener('click', () => {
      this.toggleCoopModal();
    });

    this.topBarElem.querySelector('#btn-hud-objectives')?.addEventListener('click', () => {
      if (this.scorePanelElem.style.display === 'none') {
        this.scorePanelElem.style.display = 'block';
      } else {
        this.scorePanelElem.style.display = 'none';
      }
      soundManager.playClick();
    });

    const menuBtn = this.topBarElem.querySelector('#btn-hud-menu')!;
    menuBtn.addEventListener('click', () => {
      this.callbacks.onOpenMenu();
    });
  }

  // ==========================================
  // FLOATING NARRATOR & SCORE PANELS (Image 1 & 2)
  // ==========================================
  private createNarratorAndScorePanels(): void {
    // 1. Pinned Objectives & Scoreboard (Top-Right)
    this.scorePanelElem = document.createElement('div');
    this.scorePanelElem.id = 'aoe3-score-panel';
    this.scorePanelElem.style.cssText = `
      position: absolute;
      top: 56px;
      right: 16px;
      width: 250px;
      background: rgba(18, 9, 4, 0.88);
      border: 1.5px solid #8c6a34;
      border-radius: 4px;
      padding: 10px 12px;
      pointer-events: auto;
      z-index: 45;
      box-shadow: 0 8px 24px rgba(0,0,0,0.85);
      backdrop-filter: blur(4px);
    `;
    this.scorePanelElem.innerHTML = `
      <!-- Primary Objectives (Image 1) -->
      <div style="margin-bottom: 10px; border-bottom: 1px solid rgba(140, 106, 52, 0.45); padding-bottom: 8px;">
        <div class="cinzel" style="font-size: 11px; font-weight: 800; color: #fef08a; letter-spacing: 0.5px; margin-bottom: 6px;">PRIMARY OBJECTIVES</div>
        <div id="aoe3-objectives-list" style="display: flex; flex-direction: column; gap: 4px; font-size: 10.5px; color: #e2e8f0;">
          <div style="display: flex; align-items: flex-start; gap: 6px;">
            <span style="color: #fef08a;">▢</span>
            <span>Recruit citizens & gather food and lumber.</span>
          </div>
          <div style="display: flex; align-items: flex-start; gap: 6px;">
            <span style="color: #fef08a;">▢</span>
            <span>Erect a Barracks to raise armed troops.</span>
          </div>
          <div style="display: flex; align-items: flex-start; gap: 6px;">
            <span style="color: #fef08a;">▢</span>
            <span>Advance to the next Era at your Town Center.</span>
          </div>
        </div>
      </div>

      <!-- Scoreboard (Image 1 & 2) -->
      <div>
        <div class="cinzel" style="font-size: 11px; font-weight: 800; color: #fef08a; letter-spacing: 0.5px; margin-bottom: 6px;">SCORE</div>
        <div id="aoe3-scoreboard-rows" style="display: flex; flex-direction: column; gap: 4px;">
          <!-- Dynamically populated -->
        </div>
      </div>
    `;
    this.rootElem.appendChild(this.scorePanelElem);

    // 2. Center-Left Floating Narrator Tutorial Dialogue (Image 1)
    this.narratorDialogElem = document.createElement('div');
    this.narratorDialogElem.id = 'aoe3-narrator-dialog';
    this.narratorDialogElem.style.cssText = `
      position: absolute;
      top: 130px;
      left: 16px;
      width: 290px;
      background: rgba(18, 9, 4, 0.9);
      border: 2px solid #b8860b;
      border-radius: 4px;
      padding: 10px 14px;
      pointer-events: auto;
      z-index: 45;
      box-shadow: 0 8px 26px rgba(0,0,0,0.85);
      display: flex;
      gap: 10px;
      backdrop-filter: blur(4px);
    `;
    this.narratorDialogElem.innerHTML = `
      <span style="font-size: 22px;">💬</span>
      <div style="flex: 1;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <span class="cinzel" style="font-size: 11px; font-weight: 800; color: #fef08a; letter-spacing: 0.5px;">NARRATOR</span>
          <button id="aoe3-close-narrator" style="background: none; border: none; color: #94a3b8; font-size: 11px; cursor: pointer;">✕</button>
        </div>
        <div id="aoe3-narrator-text" style="font-size: 11px; color: #cbd5e1; line-height: 1.4;">
          Assign citizen workers to harvest resources, build barracks with the command console, and advance eras to vanquish your adversaries!
        </div>
      </div>
    `;
    this.rootElem.appendChild(this.narratorDialogElem);

    this.narratorDialogElem.querySelector('#aoe3-close-narrator')?.addEventListener('click', () => {
      this.narratorDialogElem.style.display = 'none';
      soundManager.playClick();
    });
  }

  private createNotificationBanner(): void {
    this.notificationBannerElem = document.createElement('div');
    this.notificationBannerElem.className = 'cinzel';
    this.notificationBannerElem.style.cssText = `
      align-self: center;
      margin-top: 14px;
      padding: 6px 24px;
      background: linear-gradient(180deg, #991b1b 0%, #600808 100%);
      border: 2px solid #d4af37;
      border-radius: 4px;
      color: #fef08a;
      font-weight: 800;
      font-size: 13px;
      letter-spacing: 1px;
      display: none;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.75);
      animation: fadeIn 0.3s ease;
      pointer-events: none;
      text-shadow: 0 1px 2px #000;
      z-index: 50;
    `;
    this.rootElem.appendChild(this.notificationBannerElem);
  }

  
  private replayBarElem: HTMLElement | null = null;
  private isReplayPaused: boolean = false;
  private currentReplaySpeed: number = 1;

  public showReplayControls(
    onTogglePause: (isPaused: boolean) => void,
    onSetSpeed: (speed: number) => void,
    onSeek: (fraction: number) => void,
    onRestart: () => void,
    onExit: () => void
  ): void {
    if (this.replayBarElem) return;
    this.replayBarElem = document.createElement('div');
    this.replayBarElem.className = 'cinzel';
    this.replayBarElem.id = 'replay-controls-bar';
    this.replayBarElem.style.cssText = `
      position: absolute;
      top: 54px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(180deg, #2b1d0c 0%, #150d05 100%);
      border: 2px solid #8c6a34;
      border-radius: 8px;
      padding: 6px 14px;
      display: flex;
      align-items: center;
      gap: 10px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.85), inset 0 0 10px rgba(140, 106, 52, 0.4);
      z-index: 999;
      color: #fef08a;
      font-size: 11px;
      font-weight: 700;
      pointer-events: auto;
      user-select: none;
    `;
    this.replayBarElem.innerHTML = `
      <span style="display: flex; align-items: center; gap: 4px; color: #f59e0b; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">
        <strong>REPLAY</strong>
      </span>
      <span id="replay-time-display" style="color: #cbd5e1; font-family: monospace; font-size: 12px; min-width: 90px; text-align: center;">00:00 / 00:00</span>
      <input id="replay-scrubber" type="range" min="0" max="1000" value="0" style="width: 140px; cursor: pointer; accent-color: #f59e0b;" title="Seek Timeline">
      <button id="btn-replay-pause" class="aoe3-action-btn" style="padding: 3px 10px; font-size: 11px; cursor: pointer; border-color: #f59e0b;">⏸ Pause</button>
      <button id="btn-replay-restart" class="aoe3-action-btn" style="padding: 3px 8px; font-size: 11px; cursor: pointer;" title="Restart from beginning">⏮</button>
      <div style="display: flex; gap: 3px; align-items: center;">
        <button class="btn-replay-spd aoe3-action-btn" data-spd="0.5" style="padding: 2px 5px; font-size: 10px; cursor: pointer;">0.5x</button>
        <button class="btn-replay-spd aoe3-action-btn" data-spd="1" style="padding: 2px 5px; font-size: 10px; cursor: pointer; border-color: #fef08a; color: #fef08a;">1x</button>
        <button class="btn-replay-spd aoe3-action-btn" data-spd="2" style="padding: 2px 5px; font-size: 10px; cursor: pointer;">2x</button>
        <button class="btn-replay-spd aoe3-action-btn" data-spd="4" style="padding: 2px 5px; font-size: 10px; cursor: pointer;">4x</button>
        <button class="btn-replay-spd aoe3-action-btn" data-spd="8" style="padding: 2px 5px; font-size: 10px; cursor: pointer;">8x</button>
      </div>
      <button id="btn-replay-exit" class="aoe3-action-btn" style="padding: 3px 8px; font-size: 11px; cursor: pointer; border-color: #ef4444; color: #fca5a5;" title="Exit Replay">✖ Exit</button>
    `;

    const pauseBtn = this.replayBarElem.querySelector<HTMLButtonElement>('#btn-replay-pause');
    pauseBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.isReplayPaused = !this.isReplayPaused;
      pauseBtn.innerText = this.isReplayPaused ? '▶ Play' : '⏸ Pause';
      pauseBtn.style.borderColor = this.isReplayPaused ? '#22c55e' : '#f59e0b';
      soundManager.playClick();
      onTogglePause(this.isReplayPaused);
    });

    const restartBtn = this.replayBarElem.querySelector<HTMLButtonElement>('#btn-replay-restart');
    restartBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.isReplayPaused = false;
      if (pauseBtn) {
        pauseBtn.innerText = '⏸ Pause';
        pauseBtn.style.borderColor = '#f59e0b';
      }
      soundManager.playClick();
      onRestart();
    });

    const exitBtn = this.replayBarElem.querySelector<HTMLButtonElement>('#btn-replay-exit');
    exitBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      soundManager.playClick();
      onExit();
    });

    const scrubber = this.replayBarElem.querySelector<HTMLInputElement>('#replay-scrubber');
    scrubber?.addEventListener('input', (e) => {
      e.stopPropagation();
      const frac = parseFloat((e.target as HTMLInputElement).value) / 1000;
      onSeek(frac);
    });

    this.replayBarElem.querySelectorAll('.btn-replay-spd').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const spd = parseFloat((btn as HTMLElement).dataset.spd || '1');
        this.currentReplaySpeed = spd;
        this.replayBarElem?.querySelectorAll('.btn-replay-spd').forEach(b => {
          (b as HTMLElement).style.borderColor = '#8c6a34';
          (b as HTMLElement).style.color = '#e2e8f0';
        });
        (btn as HTMLElement).style.borderColor = '#fef08a';
        (btn as HTMLElement).style.color = '#fef08a';
        soundManager.playClick();
        onSetSpeed(spd);
      });
    });

    this.rootElem.appendChild(this.replayBarElem);
  }

  public updateReplayTime(currentSec: number, totalSec: number, isPaused?: boolean): void {
    if (!this.replayBarElem) return;

    const disp = this.replayBarElem.querySelector('#replay-time-display');
    if (disp) {
      const curM = Math.floor(currentSec / 60);
      const curS = Math.floor(currentSec % 60).toString().padStart(2, '0');
      const totM = Math.floor(totalSec / 60);
      const totS = Math.floor(totalSec % 60).toString().padStart(2, '0');
      disp.textContent = `${curM}:${curS} / ${totM}:${totS}`;
    }

    const scrubber = this.replayBarElem.querySelector<HTMLInputElement>('#replay-scrubber');
    if (scrubber && document.activeElement !== scrubber) {
      const safeTot = Math.max(0.1, totalSec);
      scrubber.value = Math.min(1000, Math.round((currentSec / safeTot) * 1000)).toString();
    }

    if (isPaused !== undefined && isPaused !== this.isReplayPaused) {
      this.isReplayPaused = isPaused;
      const pauseBtn = this.replayBarElem.querySelector<HTMLButtonElement>('#btn-replay-pause');
      if (pauseBtn) {
        pauseBtn.innerText = isPaused ? '▶ Play' : '⏸ Pause';
        pauseBtn.style.borderColor = isPaused ? '#22c55e' : '#f59e0b';
      }
    }
  }

  public hideReplayControls(): void {
    if (this.replayBarElem) {
      this.replayBarElem.remove();
      this.replayBarElem = null;
    }
  }

  public showNotification(text: string, durationMs: number = 3500): void {
    this.notificationBannerElem.textContent = text;
    this.notificationBannerElem.style.display = 'block';
    setTimeout(() => {
      this.notificationBannerElem.style.display = 'none';
    }, durationMs);
  }

  // ==========================================
  // BOTTOM BAR (Unified Console + Circular Minimap)
  // ==========================================
  private createBottomBar(): void {
    const bottomBar = document.createElement('div');
    bottomBar.id = 'hud-bottom-bar';
    bottomBar.style.cssText = `
      width: 100%;
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      padding: 10px 16px;
      pointer-events: none;
      position: relative;
    `;

    // 1. Bottom-Left to Center: Unified AoE III Console Frame
    const consoleFrame = document.createElement('div');
    consoleFrame.className = 'aoe3-console-frame';
    consoleFrame.style.cssText = `
      display: flex;
      height: 188px;
      padding: 6px;
      gap: 8px;
      pointer-events: auto;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.95);
    `;

    // 4 Corner Rivets
    ['tl', 'tr', 'bl', 'br'].forEach(pos => {
      const rivet = document.createElement('div');
      rivet.className = `aoe-corner-rivet aoe-corner-rivet-${pos}`;
      consoleFrame.appendChild(rivet);
    });

    // Console Bay 1: Command & Action Matrix (Left)
    const actionMatrixBay = document.createElement('div');
    actionMatrixBay.style.cssText = `
      display: flex;
      flex-direction: column;
      width: 340px;
      height: 100%;
      justify-content: space-between;
    `;

    this.actionMatrixElem = document.createElement('div');
    this.actionMatrixElem.className = 'aoe3-inner-bay';
    this.actionMatrixElem.style.cssText = `
      flex: 1;
      padding: 5px;
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      grid-template-rows: repeat(3, 1fr);
      gap: 4px;
      overflow: hidden;
    `;
    actionMatrixBay.appendChild(this.actionMatrixElem);

    // Quick Action Sub-bar below Command Grid (delete, repair, stance)
    const subBar = document.createElement('div');
    subBar.style.cssText = 'display: flex; gap: 4px; margin-top: 4px; height: 22px;';
    subBar.innerHTML = `
      <button id="aoe3-btn-delete" class="aoe3-action-btn" style="flex: 1; font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 4px;" title="Disband or demolish selected entity (Delete)">
        <span style="color: #ef4444;">✕</span> delete
      </button>
      <button id="aoe3-btn-repair" class="aoe3-action-btn" style="flex: 1; font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 4px;" title="Command nearby workers to repair damaged building (R)">
        <span>🔨</span> repair
      </button>
      <button id="aoe3-btn-stance" class="aoe3-action-btn" style="flex: 1; font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 4px;" title="Defensive combat stance">
        <span>🛡️</span> defend
      </button>
    `;
    subBar.querySelector('#aoe3-btn-repair')?.addEventListener('click', () => {
      if (this.selectedBuildingId) {
        this.callbacks.onAssignWorkersToBuild(this.selectedBuildingId);
        soundManager.playBuild();
        this.showNotification('🔨 Dispatched workers to repair building!');
      } else {
        this.showNotification('ℹ️ Select a damaged building first.');
      }
    });
    subBar.querySelector('#aoe3-btn-stance')?.addEventListener('click', () => {
      this.showNotification('🛡️ Defensive combat stance assumed.');
      soundManager.playClick();
    });
    subBar.querySelector('#aoe3-btn-delete')?.addEventListener('click', () => {
      this.showNotification('ℹ️ Select entity and press Delete to disband.');
      soundManager.playClick();
    });

    actionMatrixBay.appendChild(subBar);
    consoleFrame.appendChild(actionMatrixBay);

    // Console Bay 2: Selected Entity Inspector (Right)
    this.selectionDetailsElem = document.createElement('div');
    this.selectionDetailsElem.className = 'aoe3-inner-bay';
    this.selectionDetailsElem.style.cssText = `
      width: 390px;
      height: 100%;
      padding: 8px 10px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
    `;
    this.selectionDetailsElem.innerHTML = `
      <div class="cinzel" style="color: #8c6a34; font-size: 13px; font-weight: 700; text-align: center; margin-top: 60px;">
        Click any citizen, warrior, or building to command
      </div>
    `;
    consoleFrame.appendChild(this.selectionDetailsElem);
    bottomBar.appendChild(consoleFrame);

    // 2. Bottom-Right: Circular Minimap + Flag & Resource Stack
    const minimapBay = document.createElement('div');
    minimapBay.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 6px;
      pointer-events: auto;
    `;

    // Above Minimap: Flag & Compact Resource Stack (Image 1 style)
    const miniHeader = document.createElement('div');
    miniHeader.style.cssText = 'display: flex; align-items: center; gap: 6px;';
    miniHeader.innerHTML = `
      <div id="aoe3-minimap-flag" style="display: flex; align-items: center; gap: 5px; background: rgba(18, 9, 4, 0.85); border: 2px solid #d4af37; border-radius: 4px; padding: 2px 7px; box-shadow: 0 4px 10px rgba(0,0,0,0.8);" title="Player Civilization">
        <span id="aoe3-minimap-flag-icon" style="font-size: 16px;">🇬🇧</span>
        <span id="aoe3-minimap-shipment" class="cinzel" style="font-size: 12px; font-weight: 800; color: #fef08a;">0</span>
      </div>
      <div id="aoe3-minimap-res-stack" style="display: flex; gap: 6px; background: rgba(14, 7, 3, 0.85); border: 1.5px solid #8c6a34; border-radius: 4px; padding: 2px 8px; font-size: 11px; font-weight: 700; color: #fef08a;">
        <span title="Population">🏠 <span id="mini-pop">0/15</span></span>
        <span title="Food">🥩 <span id="mini-food">0</span></span>
        <span title="Wood">🪵 <span id="mini-wood">0</span></span>
        <span title="Gold">🪙 <span id="mini-metal">0</span></span>
      </div>
    `;
    minimapBay.appendChild(miniHeader);

    // Circular Minimap Outer Frame
    const minimapFrame = document.createElement('div');
    minimapFrame.className = 'aoe3-circular-minimap-frame';
    minimapFrame.id = 'minimap-outer-wrapper';

    // Crossed Swords Alert on Rim
    const alertBtn = document.createElement('div');
    alertBtn.style.cssText = `
      position: absolute;
      top: -2px;
      left: 10px;
      width: 26px;
      height: 26px;
      background: radial-gradient(circle, #78350f, #3b1404);
      border: 1.5px solid #d4af37;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      cursor: pointer;
      box-shadow: 0 2px 6px #000;
      z-index: 5;
    `;
    alertBtn.innerHTML = '⚔️';
    alertBtn.title = 'Combat Alert';
    minimapFrame.appendChild(alertBtn);

    // Ping Flare Horn on Rim
    const pingBtn = document.createElement('div');
    pingBtn.style.cssText = `
      position: absolute;
      bottom: 8px;
      left: 10px;
      width: 24px;
      height: 24px;
      background: radial-gradient(circle, #78350f, #3b1404);
      border: 1.5px solid #d4af37;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      cursor: pointer;
      box-shadow: 0 2px 6px #000;
      z-index: 5;
    `;
    pingBtn.innerHTML = '📯';
    pingBtn.title = 'Signal Flare Ping';
    pingBtn.addEventListener('click', () => {
      this.showNotification('📯 Signal flare dispatched to allies!');
      soundManager.playClick();
    });
    minimapFrame.appendChild(pingBtn);

    // Minimap Canvas Container (Circle clipped)
    this.minimapContainer = document.createElement('div');
    this.minimapContainer.id = 'minimap-canvas-holder';
    this.minimapContainer.style.cssText = `
      width: 190px;
      height: 190px;
      border-radius: 50%;
      overflow: hidden;
      background: #090d16;
    `;
    minimapFrame.appendChild(this.minimapContainer);
    minimapBay.appendChild(minimapFrame);
    bottomBar.appendChild(minimapBay);

    this.rootElem.appendChild(bottomBar);
  }

  // ==========================================
  // DYNAMIC STATS, SCOREBOARD & OBJECTIVES UPDATE
  // ==========================================
  public updatePlayerStats(
    player: PlayerState,
    idleWorkerCount: number,
    townCentreId?: string,
    allPlayers?: PlayerState[],
    units?: UnitData[],
    buildings?: BuildingData[],
    elapsedSec?: number
  ): void {
    this.currentPlayer = player;
    if (townCentreId) this.townCentreId = townCentreId;
    if (allPlayers) this.allPlayers = allPlayers;
    if (buildings) this.allBuildings = buildings;

    if (this.techModalElem) {
      const activeHall = this.allBuildings.find(b => b.ownerId === player.id && b.type === 'research_hall' && b.isConstructed);
      const queueProgressKey = activeHall ? activeHall.productionQueue.map(q => q.itemType + ':' + Math.floor(q.progress / 5)).join('|') : '';
      const stateSig = `${player.age}_${player.researchedTechs.length}_${queueProgressKey}`;
      if (stateSig !== this.lastTechModalSig) {
        this.lastTechModalSig = stateSig;
        this.updateTechModalDynamicState(player);
      }
    }

    const f = (n: number) => Math.floor(n).toLocaleString();
    const setEl = (id: string, text: string) => {
      const el = this.rootElem.querySelector(id);
      if (el) el.textContent = text;
    };

    // 1. Stockpiles
    setEl('#res-food', f(player.resources.food));
    setEl('#res-wood', f(player.resources.wood));
    setEl('#res-stone', f(player.resources.stone));
    setEl('#res-metal', f(player.resources.metal));
    setEl('#res-knowledge', f(player.resources.knowledge));
    setEl('#res-pop', `${player.population}/${player.maxPopulation}`);

    // Minimap stack
    setEl('#mini-pop', `${player.population}/${player.maxPopulation}`);
    setEl('#mini-food', f(player.resources.food));
    setEl('#mini-wood', f(player.resources.wood));
    setEl('#mini-metal', f(player.resources.metal));

    // 2. Count Workers Assigned Per Resource
    let foodWorkers = 0;
    let woodWorkers = 0;
    let stoneWorkers = 0;
    let metalWorkers = 0;
    let knowledgeWorkers = 0;

    if (units) {
      for (const u of units) {
        if (u.ownerId === player.id && u.type === 'worker') {
          const rType = u.carriedResourceType;
          if (rType === 'food') foodWorkers++;
          else if (rType === 'wood') woodWorkers++;
          else if (rType === 'stone') stoneWorkers++;
          else if (rType === 'metal') metalWorkers++;
          else if (rType === 'knowledge') knowledgeWorkers++;
        }
      }
    }
    setEl('#worker-food', foodWorkers.toString());
    setEl('#worker-wood', woodWorkers.toString());
    setEl('#worker-stone', stoneWorkers.toString());
    setEl('#worker-metal', metalWorkers.toString());
    setEl('#worker-knowledge', knowledgeWorkers.toString());

    // 3. Idle Worker badge
    setEl('#aoe3-idle-count', idleWorkerCount.toString());
    const idleBadge = this.rootElem.querySelector<HTMLElement>('#aoe3-idle-badge');
    if (idleBadge) {
      idleBadge.style.background = idleWorkerCount > 0
        ? 'linear-gradient(180deg, #dc2626, #991b1b)'
        : 'linear-gradient(180deg, #78350f, #451a03)';
      idleBadge.style.boxShadow = idleWorkerCount > 0 ? '0 0 8px #ef4444' : 'none';
    }

    // 4. Civilization Heraldic Emblem
    const civFlags: Record<string, string> = {
      'Veyran Confederacy': '🦅',
      'Solari Dominion': '☀️',
      'Ironvale Kingdom': '⚔️',
      'Nambara Alliance': '🐉',
    };
    const flagSymbol = civFlags[player.civ] || '🇬🇧';
    setEl('#aoe3-civ-flag', flagSymbol);
    setEl('#aoe3-minimap-flag-icon', flagSymbol);

    // 5. Era Title & Roman Plaque
    const ageRomans: Record<string, string> = {
      'Founding Age': 'I',
      'Kingdom Age': 'II',
      'Imperial Age': 'III',
      'Industrial Age': 'IV'
    };
    const roman = ageRomans[player.age] || 'I';
    setEl('#aoe3-era-roman', roman);
    setEl('#aoe3-era-title', `${roman}: ${player.age.toUpperCase()}`);

    // 6. Live Clock
    if (elapsedSec !== undefined) {
      const mins = Math.floor(elapsedSec / 60);
      const secs = Math.floor(elapsedSec % 60);
      setEl('#aoe3-game-clock', `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
    }

    // 7. Scoreboard
    if (allPlayers && allPlayers.length > 0) {
      const scoreboardElem = this.rootElem.querySelector('#aoe3-scoreboard-rows');
      if (scoreboardElem) {
        const scores = allPlayers.map(p => {
          const pUnits = units ? units.filter(u => u.ownerId === p.id) : [];
          const pBldgs = buildings ? buildings.filter(b => b.ownerId === p.id) : [];
          const ageBonus = p.age === 'Kingdom Age' ? 1000 : p.age === 'Imperial Age' ? 2500 : p.age === 'Industrial Age' ? 5000 : 0;
          const resScore = (p.resources.food + p.resources.wood + p.resources.stone + p.resources.metal + p.resources.knowledge) * 0.2;
          const score = Math.floor(resScore + pUnits.length * 100 + pBldgs.length * 250 + ageBonus);
          return { player: p, score };
        }).sort((a, b) => b.score - a.score);

        scoreboardElem.innerHTML = scores.map((s, idx) => `
          <div style="display: flex; align-items: center; justify-content: space-between; font-size: 11px; background: rgba(0,0,0,0.35); border-left: 3px solid ${s.player.color}; padding: 2px 6px; border-radius: 2px;">
            <div style="display: flex; align-items: center; gap: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 140px;">
              <span style="font-weight: 800; color: #fef08a; font-size: 10px;">${idx + 1}</span>
              <span style="font-size: 11px;">${civFlags[s.player.civ] || '🛡️'}</span>
              <strong style="color: ${s.player.id === player.id ? '#67e8f9' : '#f8fafc'}; font-size: 11px;">${s.player.name}</strong>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-family: monospace; font-weight: 700; color: #fef08a;">${s.score.toLocaleString()}</span>
              <span style="font-size: 9px; color: ${s.player.team === player.team ? '#4ade80' : '#f87171'};">[${s.player.team === player.team ? '=' : '✕'}]</span>
            </div>
          </div>
        `).join('');
      }
    }

    // 8. Objectives checkmarks
    const objList = this.rootElem.querySelector('#aoe3-objectives-list');
    if (objList) {
      const hasWorkers = (units ? units.filter(u => u.ownerId === player.id && u.type === 'worker').length : player.population) >= 3;
      const hasBarracks = buildings ? buildings.some(b => b.ownerId === player.id && b.type === 'barracks' && b.isConstructed) : false;
      const hasAdvanced = player.age !== 'Founding Age';

      objList.innerHTML = `
        <div style="display: flex; align-items: flex-start; gap: 6px; color: ${hasWorkers ? '#86efac' : '#e2e8f0'};">
          <span style="color: ${hasWorkers ? '#22c55e' : '#fef08a'};">${hasWorkers ? '☑' : '▢'}</span>
          <span>Recruit citizens & gather food and lumber.</span>
        </div>
        <div style="display: flex; align-items: flex-start; gap: 6px; color: ${hasBarracks ? '#86efac' : '#e2e8f0'};">
          <span style="color: ${hasBarracks ? '#22c55e' : '#fef08a'};">${hasBarracks ? '☑' : '▢'}</span>
          <span>Erect a Barracks to raise armed troops.</span>
        </div>
        <div style="display: flex; align-items: flex-start; gap: 6px; color: ${hasAdvanced ? '#86efac' : '#e2e8f0'};">
          <span style="color: ${hasAdvanced ? '#22c55e' : '#fef08a'};">${hasAdvanced ? '☑' : '▢'}</span>
          <span>Advance to the next Era at your Town Center.</span>
        </div>
      `;
    }

    // 9. Co-op Tribute Button
    const teammates = this.allPlayers.filter(p => p.team === player.team && p.id !== player.id && !p.isDefeated);
    if (this.coopBtnElem) {
      this.coopBtnElem.style.display = teammates.length > 0 ? 'inline-flex' : 'none';
    }
  }

  // ==========================================
  // SELECTION & INSPECTOR (Matching Image 1 & 2)
  // ==========================================
  public updateSelection(
    selectedUnits: UnitData[],
    selectedBuildings: BuildingData[],
    player: PlayerState
  ): void {
    if (selectedUnits.length === 0 && selectedBuildings.length === 0) {
      this.selectedBuildingId = null;
      if (this.currentContextKey !== 'none' && this.currentContextKey !== 'resource_selected') {
        this.currentContextKey = 'none';
        this.selectionDetailsElem.innerHTML = `
          <div class="cinzel" style="color: #8c6a34; font-size: 13px; font-weight: 700; text-align: center; margin-top: 60px;">
            Click any citizen, warrior, or building to command
          </div>
        `;
        this.actionMatrixElem.innerHTML = '';
      }
      return;
    }

    const getPortrait = (type: string, isBuilding: boolean) => {
      if (isBuilding) {
        if (type === 'town_centre') return '🏰';
        if (type === 'barracks') return '⚔️';
        if (type === 'archery_range') return '🏹';
        if (type === 'stable') return '🐎';
        if (type === 'workshop') return '⚙️';
        if (type === 'farm') return '🌾';
        if (type === 'research_hall') return '📜';
        if (type === 'watchtower') return '🗼';
        if (type === 'fort') return '🏯';
        return '🏛️';
      } else {
        if (type === 'worker') return '👨‍🌾';
        if (type === 'swordsman') return '🛡️';
        if (type === 'archer') return '🏹';
        if (type === 'knight') return '🏇';
        if (type === 'dragon') return '🐉';
        if (type === 'catapult') return '🎯';
        return '⚔️';
      }
    };

    // 1. Units Selected
    if (selectedUnits.length > 0) {
      this.selectedBuildingId = null;
      if (selectedUnits.length === 1) {
        const unit = selectedUnits[0];
        const udef = UNIT_DEFINITIONS[unit.type];
        const owner = this.allPlayers.find(p => p.id === unit.ownerId) || player;
        const hpPercent = Math.max(0, Math.min(100, (unit.hp / unit.maxHp) * 100));
        const hpColor = hpPercent > 50 ? '#22c55e' : hpPercent > 25 ? '#f59e0b' : '#ef4444';

        this.selectionDetailsElem.innerHTML = `
          <div style="display: flex; flex-direction: column; height: 100%; justify-content: space-between;">
            <!-- Header: Title & Civ -->
            <div>
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                  <div class="cinzel" style="font-weight: 800; font-size: 14px; color: #fef08a; letter-spacing: 0.5px;">${udef.name.toUpperCase()}</div>
                  <div style="font-size: 11px; color: #cbd5e1; display: flex; align-items: center; gap: 4px;">
                    <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${owner.color};"></span>
                    <span>${owner.civ.toUpperCase()}</span>
                    <span style="color: #94a3b8;">(${udef.role})</span>
                  </div>
                </div>
                <div style="font-size: 11px; color: #38bdf8; font-weight: 700; text-transform: uppercase;">
                  ● ${unit.state}
                </div>
              </div>

              <!-- Health & Armor Row -->
              <div style="display: flex; align-items: center; gap: 10px; margin-top: 6px;">
                <div style="font-size: 11px; font-weight: 700; color: #f87171; display: flex; align-items: center; gap: 3px;">
                  <span>❤️</span> <span>${Math.ceil(unit.hp)}/${unit.maxHp}</span>
                </div>
                <div style="flex: 1; height: 6px; background: #331d0d; border: 1px solid #8c6a34; border-radius: 3px; overflow: hidden;">
                  <div style="width: ${hpPercent}%; height: 100%; background: ${hpColor}; transition: width 0.15s ease;"></div>
                </div>
                <div style="font-size: 11px; color: #fef08a; font-weight: 700; display: flex; gap: 6px;">
                  <span>🛡️ 4</span>
                  <span>🎯 20%</span>
                </div>
              </div>
            </div>

            <!-- Body: Portrait on left + Combat & Gather Stats on right -->
            <div style="display: flex; gap: 10px; align-items: center;">
              <!-- Portrait Box -->
              <div class="aoe3-portrait-box" style="width: 64px; height: 64px; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative;">
                <span style="font-size: 32px;">${getPortrait(unit.type, false)}</span>
                <span style="position: absolute; bottom: 2px; font-size: 9px; font-weight: 800; color: #fef08a; background: rgba(0,0,0,0.6); padding: 0 4px; border-radius: 2px;">LVL 1</span>
              </div>

              <!-- Stat Lines -->
              <div style="flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 3px; font-size: 11px; color: #f1f5f9;">
                <div>⚔️ Hand: <strong>${udef.damage}</strong></div>
                <div>🏹 Range: <strong>${udef.attackRange > 2 ? udef.attackRange : '-'}</strong></div>
                <div>🏃 Speed: <strong>${udef.speed}</strong></div>
                <div>${unit.carriedResourceAmount > 0 ? `📦 Carrying: <strong style="color: #4ade80;">${unit.carriedResourceAmount} ${unit.carriedResourceType}</strong>` : `👀 Vision: <strong>14</strong>`}</div>
              </div>
            </div>
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
          <div style="display: flex; flex-direction: column; height: 100%; justify-content: space-between;">
            <div>
              <div class="cinzel" style="font-weight: 800; font-size: 14px; color: #fef08a;">SQUAD COMMAND (${selectedUnits.length} UNITS)</div>
              <div style="font-size: 11px; color: #cbd5e1; margin-top: 2px;">Combined Tactical Battlegroup</div>
            </div>
            <div style="display: flex; gap: 10px; align-items: center;">
              <div class="aoe3-portrait-box" style="width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; font-size: 30px;">
                ⚔️
              </div>
              <div style="font-size: 11px; color: #cbd5e1; line-height: 1.4;">
                Right-click ground to march in line formation.<br />
                Right-click enemy soldiers or fortifications to charge.
              </div>
            </div>
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
      this.selectedBuildings = selectedBuildings;
      const bldg = selectedBuildings[0];
      this.selectedBuildingId = bldg.id;
      const bdef = BUILDING_DEFINITIONS[bldg.type];
      const owner = this.allPlayers.find(p => p.id === bldg.ownerId) || player;
      const hpPercent = Math.max(0, Math.min(100, (bldg.hp / bldg.maxHp) * 100));
      const hpColor = hpPercent > 50 ? '#22c55e' : hpPercent > 25 ? '#f59e0b' : '#ef4444';

      let activityHtml = '';
      if (!bldg.isConstructed) {
        activityHtml = `
          <div style="margin-top: 4px;">
            <div style="font-size: 10px; color: #f59e0b; display: flex; justify-content: space-between; font-weight: 700;">
              <span>🔨 Construction</span>
              <span>${Math.floor(bldg.constructionProgress)}%</span>
            </div>
            <div style="width: 100%; height: 6px; background: #331d0d; border: 1px solid #8c6a34; border-radius: 3px; overflow: hidden; margin-top: 2px;">
              <div style="width: ${bldg.constructionProgress}%; height: 100%; background: linear-gradient(90deg, #f59e0b, #10b981);"></div>
            </div>
          </div>
        `;
      } else if (bldg.ownerId === player.id && bldg.productionQueue.length > 0) {
        const item = bldg.productionQueue[0];
        const isTech = item.category === 'tech';
        const isAge = item.category === 'age';
        const actionLabel = isAge ? '🏛️ Advancing' : isTech ? '🔬 Researching' : '⚙️ Training';
        const itemName = getQueueItemName(item.category, item.itemType);
        const progressPct = Math.floor(item.progress);
        const progressBarGradient = isTech
          ? 'linear-gradient(90deg, #6366f1, #a78bfa)'
          : isAge
          ? 'linear-gradient(90deg, #d97706, #fbbf24)'
          : 'linear-gradient(90deg, #0284c7, #38bdf8)';

        activityHtml = `
          <div style="margin-top: 2px; background: rgba(14, 7, 3, 0.7); border: 1px solid #8c6a34; border-radius: 4px; padding: 4px 6px;">
            <div style="font-size: 10px; color: ${isTech ? '#a78bfa' : isAge ? '#f59e0b' : '#38bdf8'}; display: flex; justify-content: space-between; font-weight: 700; align-items: center;">
              <span style="display: flex; align-items: center; gap: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                <span style="font-size: 11px;">${getQueueItemIcon(item.category, item.itemType)}</span>
                <span>${actionLabel}: <strong>${itemName}</strong></span>
              </span>
              <span style="color: #fef08a; font-weight: 800; font-size: 10.5px; margin-left: 6px;">${progressPct}%</span>
            </div>

            <!-- Progress bar -->
            <div style="width: 100%; height: 5px; background: #26150a; border: 1px solid #78350f; border-radius: 2.5px; overflow: hidden; margin-top: 2px;">
              <div style="width: ${progressPct}%; height: 100%; background: ${progressBarGradient}; transition: width 0.1s linear;"></div>
            </div>

            <!-- Interactive AoE / RoN Queue Ribbon (Click to Cancel & 100% Refund) -->
            <div style="display: flex; gap: 4px; align-items: center; margin-top: 4px; overflow-x: auto; padding-bottom: 2px;">
              ${bldg.productionQueue.map((q, idx) => {
                const qIcon = getQueueItemIcon(q.category, q.itemType);
                const qName = getQueueItemName(q.category, q.itemType);
                const qRefund = getQueueItemRefundText(q.category, q.itemType, player.age);
                const isRunning = idx === 0;
                return `
                  <div class="aoe-queue-slot ${isRunning ? 'active' : ''}" data-bldgid="${bldg.id}" data-qidx="${idx}" title="${isRunning ? 'Active: ' : 'Queue #' + (idx + 1) + ': '}${qName} (Click to Cancel & Refund 100%: +${qRefund})">
                    <span style="font-size: 13px;">${qIcon}</span>
                    ${isRunning ? '<span class="aoe-queue-slot-active-dot"></span>' : `<span class="aoe-queue-slot-num">#${idx + 1}</span>`}
                    <div class="aoe-queue-slot-cancel">✕</div>
                  </div>
                `;
              }).join('')}
              ${bldg.productionQueue.length < 15 ? `
                <div style="font-size: 8.5px; color: #a16207; font-weight: 700; padding: 0 4px; white-space: nowrap;" title="Capacity: ${bldg.productionQueue.length} of 15 max queue slots">
                  ${bldg.productionQueue.length}/15
                </div>
              ` : `
                <div style="font-size: 8px; color: #ef4444; font-weight: 800; padding: 0 4px; white-space: nowrap;">
                  FULL
                </div>
              `}
            </div>
          </div>
        `;
      } else {
        activityHtml = `
          <div style="font-size: 10px; color: #4ade80; font-weight: 700; margin-top: 4px;">
            ● Operational & Garrison Ready
          </div>
        `;
      }

      if (!this.isHoveringTech) {
        this.selectionDetailsElem.innerHTML = `
        <div style="display: flex; flex-direction: column; height: 100%; justify-content: space-between;">
          <!-- Header: Title & Civ -->
          <div>
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <div class="cinzel" style="font-weight: 800; font-size: 14px; color: #fef08a; letter-spacing: 0.5px;">${bdef.name.toUpperCase()}</div>
                <div style="font-size: 11px; color: #cbd5e1; display: flex; align-items: center; gap: 4px;">
                  <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${owner.color};"></span>
                  <span>${owner.civ.toUpperCase()}</span>
                  <span style="color: #94a3b8;">(${bldg.type.replace('_', ' ')})</span>
                </div>
              </div>
            </div>

            <!-- Health & Armor Row -->
            <div style="display: flex; align-items: center; gap: 10px; margin-top: 6px;">
              <div style="font-size: 11px; font-weight: 700; color: #f87171; display: flex; align-items: center; gap: 3px;">
                <span>❤️</span> <span>${Math.ceil(bldg.hp)}/${bldg.maxHp}</span>
              </div>
              <div style="flex: 1; height: 6px; background: #331d0d; border: 1px solid #8c6a34; border-radius: 3px; overflow: hidden;">
                <div style="width: ${hpPercent}%; height: 100%; background: ${hpColor}; transition: width 0.15s ease;"></div>
              </div>
              <div style="font-size: 11px; color: #fef08a; font-weight: 700;">
                <span>🛡️ Fortified</span>
              </div>
            </div>
          </div>

          <!-- Body: Portrait & Stats -->
          <div style="display: flex; gap: 10px; align-items: center;">
            <div class="aoe3-portrait-box" style="width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; font-size: 32px;">
              ${getPortrait(bldg.type, true)}
            </div>

            <div style="flex: 1;">
              ${activityHtml}
              <div style="font-size: 10px; color: #94a3b8; margin-top: 4px;">
                Population Supported: +${bdef.populationProvided || 0} • Sight: ${bdef.visionRange}
              </div>
            </div>
          </div>
        </div>
      `;

        this.selectionDetailsElem.querySelectorAll<HTMLElement>('.aoe-queue-slot').forEach(slot => {
          slot.addEventListener('click', (e) => {
            e.stopPropagation();
            const bldgId = slot.dataset.bldgid;
            const qidx = parseInt(slot.dataset.qidx || '0', 10);
            if (bldgId && !isNaN(qidx)) {
              const b = this.allBuildings.find(item => item.id === bldgId);
              const qItem = b?.productionQueue[qidx];
              const qName = qItem ? getQueueItemName(qItem.category, qItem.itemType) : 'Item';
              const qRefund = qItem ? getQueueItemRefundText(qItem.category, qItem.itemType, player.age) : '';
              this.callbacks.onCancelProduction?.(bldgId, qidx);
              this.showNotification(`↩️ Canceled ${qName}! 100% cost refunded (${qRefund})`);
            }
          });
        });
      }

      if (bldg.ownerId === player.id) {
        const queueKey = bldg.productionQueue.map(q => `${q.itemType}:${Math.floor(q.progress)}`).join(',');
        const techKey = player.researchedTechs.length;
        const targetKey = `bldg_${bldg.id}_${bldg.type}_${bldg.isConstructed}_${player.age}_${techKey}_${queueKey}_${this.activeTechCategory}`;
        if (this.currentContextKey !== targetKey) {
          this.currentContextKey = targetKey;
          if (!bldg.isConstructed) {
            this.resetActionMatrixGrid();
            this.actionMatrixElem.innerHTML = `
              <button id="btn-assign-builders" class="aoe3-action-btn" style="grid-column: span 5; grid-row: span 2; font-weight: 700; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 8px;">
                <span>🔨</span> Send Workers to Build
              </button>
            `;
            this.actionMatrixElem.querySelector('#btn-assign-builders')?.addEventListener('click', () => {
              this.callbacks.onAssignWorkersToBuild(bldg.id);
              soundManager.playBuild();
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

  // ==========================================
  
  public getCurrentFormation(): FormationType {
    return this.currentFormation;
  }

  public getCurrentStance(): UnitStance {
    return this.currentStance;
  }

  public setStance(stance: UnitStance): void {
    this.currentStance = stance;
    this.callbacks.onSetStance?.(stance);
    this.showNotification(`⚔️ Unit Stance: ${stance.toUpperCase().replace('_', ' ')}`);
    if (this.currentContextKey === 'tactics_matrix') {
      this.renderMilitaryTacticsMatrix();
    }
  }

  public setFormation(formation: FormationType): void {
    this.currentFormation = formation;
    this.callbacks.onSetFormation?.(formation);
    this.showNotification(`🛡️ Formation: ${formation.toUpperCase()} ORDER`);
    if (this.currentContextKey === 'tactics_matrix') {
      this.renderMilitaryTacticsMatrix();
    }
  }

  private renderMilitaryTacticsMatrix(): void {
    this.actionMatrixElem.innerHTML = '';

    const stances: { id: UnitStance; label: string; icon: string; hotkey: string }[] = [
      { id: 'aggressive', label: 'Aggressive', icon: '⚔️', hotkey: 'Q' },
      { id: 'defensive', label: 'Defensive', icon: '🛡️', hotkey: 'W' },
      { id: 'stand_ground', label: 'Stand Ground', icon: '🛑', hotkey: 'E' }
    ];

    const formations: { id: FormationType; label: string; icon: string; hotkey: string }[] = [
      { id: 'line', label: 'Line', icon: '━', hotkey: 'A' },
      { id: 'box', label: 'Box', icon: '⏹', hotkey: 'S' },
      { id: 'staggered', label: 'Staggered', icon: '⁖', hotkey: 'D' },
      { id: 'column', label: 'Column', icon: '‖', hotkey: 'F' }
    ];

    // Stance Buttons
    stances.forEach(s => {
      const isActive = this.currentStance === s.id;
      const btn = document.createElement('button');
      btn.className = 'aoe3-action-btn';
      btn.style.cssText = `
        padding: 2px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        position: relative;
        ${isActive ? 'background: linear-gradient(180deg, #991b1b 0%, #450a0a 100%) !important; border-color: #fef08a !important; box-shadow: 0 0 8px rgba(254, 240, 138, 0.4);' : ''}
      `;
      btn.innerHTML = `
        <span class="aoe3-hotkey-badge">${s.hotkey}</span>
        <span style="font-size: 14px;">${s.icon}</span>
        <span style="font-weight: 700; font-size: 9.5px; line-height: 1; color: ${isActive ? '#fef08a' : '#f1f5f9'};">${s.label}</span>
        <span style="font-size: 8px; color: ${isActive ? '#86efac' : '#94a3b8'};">${isActive ? 'ACTIVE' : 'STANCE'}</span>
      `;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.setStance(s.id);
      });
      this.actionMatrixElem.appendChild(btn);
    });

    // Spacer
    for (let i = 0; i < 2; i++) {
      const dummy = document.createElement('div');
      this.actionMatrixElem.appendChild(dummy);
    }

    // Formation Buttons
    formations.forEach(f => {
      const isActive = this.currentFormation === f.id;
      const btn = document.createElement('button');
      btn.className = 'aoe3-action-btn';
      btn.style.cssText = `
        padding: 2px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        position: relative;
        ${isActive ? 'background: linear-gradient(180deg, #1e3a8a 0%, #172554 100%) !important; border-color: #fef08a !important; box-shadow: 0 0 8px rgba(254, 240, 138, 0.4);' : ''}
      `;
      btn.innerHTML = `
        <span class="aoe3-hotkey-badge">${f.hotkey}</span>
        <span style="font-size: 14px; font-weight: 900;">${f.icon}</span>
        <span style="font-weight: 700; font-size: 9.5px; line-height: 1; color: ${isActive ? '#fef08a' : '#f1f5f9'};">${f.label}</span>
        <span style="font-size: 8px; color: ${isActive ? '#86efac' : '#94a3b8'};">${isActive ? 'FORMED' : 'ORDER'}</span>
      `;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.setFormation(f.id);
      });
      this.actionMatrixElem.appendChild(btn);
    });
  }

  private resetActionMatrixGrid(): void {
    this.actionMatrixElem.style.display = 'grid';
    this.actionMatrixElem.style.gridTemplateColumns = 'repeat(5, 1fr)';
    this.actionMatrixElem.style.gridTemplateRows = 'repeat(3, 1fr)';
    this.actionMatrixElem.style.flexDirection = 'unset';
    this.actionMatrixElem.style.gap = '4px';
    this.actionMatrixElem.style.padding = '5px';
    this.actionMatrixElem.style.overflow = 'hidden';
    this.actionMatrixElem.innerHTML = '';
  }

  // ACTION MATRICES WITH AOE3 HOTKEYS (Q, W, E, R...)
  // ==========================================
  private renderWorkerBuildMatrix(player: PlayerState): void {
    this.resetActionMatrixGrid();

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
      { type: 'fort', label: 'Fortress', icon: '🏰', costText: '180W 350S' }
    ];

    const hotkeys = ['Q', 'W', 'E', 'R', 'T', 'A', 'S', 'D', 'F', 'G', 'Z', 'X'];

    buildingsToOffer.forEach((b, idx) => {
      const def = BUILDING_DEFINITIONS[b.type];
      const ageRank = (a: AgeName) => ['Founding Age', 'Kingdom Age', 'Imperial Age', 'Industrial Age'].indexOf(a);
      const isAgeUnlocked = ageRank(player.age) >= ageRank(def.requiredAge);

      const btn = document.createElement('button');
      btn.className = 'build-matrix-btn aoe3-action-btn';
      btn.dataset.btype = b.type;
      btn.dataset.unlocked = isAgeUnlocked ? 'true' : 'false';

      btn.style.cssText = `
        padding: 2px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        cursor: ${isAgeUnlocked ? 'pointer' : 'not-allowed'};
        font-size: 11px;
        ${!isAgeUnlocked ? 'opacity: 0.45;' : ''}
      `;
      btn.innerHTML = `
        <span class="aoe3-hotkey-badge">${hotkeys[idx] || ''}</span>
        <span style="font-size: 14px;">${b.icon}</span>
        <span style="font-weight: 700; font-size: 10px; line-height: 1;">${b.label}</span>
        <span class="cost-text" style="font-size: 8.5px; color: ${isAgeUnlocked ? '#fef08a' : '#94a3b8'};">${b.costText}</span>
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
    if (bldg.type !== 'research_hall') {
      this.resetActionMatrixGrid();
    } else {
      this.actionMatrixElem.innerHTML = '';
    }

    
    // If Market: train Trade Cart + Commodity Trading
    if (bldg.type === 'market') {
      this.createTrainUnitButton(bldg, 'trade_cart', 'Trade Cart', '🛒', '50F 50W', 'Q', player);

      const trades: { label: string; icon: string; buy: ResourceType; sell: ResourceType; buyAmt: number; sellAmt: number; hotkey: string }[] = [
        { label: 'Buy Food', icon: '🌾', buy: 'food', sell: 'wood', buyAmt: 100, sellAmt: 120, hotkey: 'W' },
        { label: 'Buy Wood', icon: '🪵', buy: 'wood', sell: 'food', buyAmt: 100, sellAmt: 120, hotkey: 'E' },
        { label: 'Buy Stone', icon: '🪨', buy: 'stone', sell: 'wood', buyAmt: 100, sellAmt: 130, hotkey: 'R' },
        { label: 'Buy Gold', icon: '🪙', buy: 'metal', sell: 'wood', buyAmt: 100, sellAmt: 150, hotkey: 'T' },
        { label: 'Sell Gold', icon: '💰', buy: 'food', sell: 'metal', buyAmt: 140, sellAmt: 100, hotkey: 'A' },
        { label: 'Sell Stone', icon: '🧱', buy: 'food', sell: 'stone', buyAmt: 120, sellAmt: 100, hotkey: 'S' }
      ];

      trades.forEach(t => {
        const tradeBtn = document.createElement('button');
        tradeBtn.className = 'aoe3-action-btn';
        tradeBtn.style.cssText = 'padding: 2px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 9px;';
        tradeBtn.innerHTML = `
          <span class="aoe3-hotkey-badge">${t.hotkey}</span>
          <span style="font-size: 13px;">${t.icon}</span>
          <span style="font-weight: 700; line-height: 1;">${t.label}</span>
          <span style="font-size: 8px; color: #86efac;">+${t.buyAmt}/-${t.sellAmt}</span>
        `;
        tradeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const curPlayer = this.currentPlayer || player;
          if (curPlayer.resources[t.sell] < t.sellAmt) {
            soundManager.playError();
            this.showNotification(`⚠️ Insufficient ${t.sell.toUpperCase()}! Need ${t.sellAmt}, have ${Math.floor(curPlayer.resources[t.sell])}.`);
            return;
          }
          this.callbacks.onTradeCommodity?.(t.buy, t.sell, t.buyAmt, t.sellAmt);
          soundManager.playCoin();
          this.showNotification(`🪙 Exchanged ${t.sellAmt} ${t.sell} for ${t.buyAmt} ${t.buy}!`);
        });
        this.actionMatrixElem.appendChild(tradeBtn);
      });
      return;
    }

    // If Town Centre: train worker, advance age, summon dragon in imperial age
    if (bldg.type === 'town_centre') {
      this.createTrainUnitButton(bldg, 'worker', 'Worker', '👨‍🌾', '50 Food', 'Q', player);

      // If Imperial or Industrial Age, summon War Dragon
      if (player.age === 'Imperial Age' || player.age === 'Industrial Age') {
        this.createTrainUnitButton(bldg, 'dragon', 'War Dragon', '🐉', '250F 250G', 'W', player);
      }

      // Advance Age Button
      const ageReq = AGE_ADVANCEMENT_REQUIREMENTS[player.age];
      if (ageReq && ageReq.nextAge) {
        const ageBtn = document.createElement('button');
        ageBtn.id = 'hud-advance-age-btn';
        ageBtn.dataset.hotkey = 'E';
        ageBtn.className = 'aoe3-action-btn';
        ageBtn.style.cssText = 'padding: 4px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 10px; border-color: #d4af37;';
        ageBtn.innerHTML = `
          <span class="aoe3-hotkey-badge">E</span>
          <span style="font-size: 16px;">👑</span>
          <span style="font-weight: 700; color: #fef08a;">Advance</span>
          <span style="font-size: 8.5px; color: #cbd5e1;">Requirements</span>
        `;
        ageBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleAgeModal();
        });
        this.actionMatrixElem.appendChild(ageBtn);
      }
    }

    // Barracks Units
    if (bldg.type === 'barracks') {
      this.createTrainUnitButton(bldg, 'basic_infantry', 'Infantry', '⚔️', '60F 20G', 'Q', player);
      this.createTrainUnitButton(bldg, 'spearman', 'Spearman', '🛡️', '50F 20W', 'W', player);
      if (player.age === 'Imperial Age' || player.age === 'Industrial Age') {
        this.createTrainUnitButton(bldg, 'advanced_unit', 'Royal Guard', '👑', '120F 120G', 'E', player);
      }
    }

    // Archery Range Units
    if (bldg.type === 'archery_range') {
      this.createTrainUnitButton(bldg, 'ranged_infantry', 'Archer', '🏹', '40W 30G', 'Q', player);
    }

    // Stable Units
    if (bldg.type === 'stable') {
      this.createTrainUnitButton(bldg, 'cavalry', 'Knight', '🏇', '80F 70G', 'Q', player);
    }

    // Siege Workshop Units
    if (bldg.type === 'workshop') {
      this.createTrainUnitButton(bldg, 'siege_unit', 'Catapult', '🎯', '150W 100S', 'Q', player);
    }

    // Fort / Roost: War Dragon
    if (bldg.type === 'fort') {
      this.createTrainUnitButton(bldg, 'advanced_unit', 'Royal Guard', '🛡️', '120F 120G', 'Q', player);
      this.createTrainUnitButton(bldg, 'dragon', 'War Dragon', '🐉', '250F 250G', 'W', player);
    }

    // Research Hall: Technologies
    if (bldg.type === 'research_hall') {
      const ageRank = (a: any) => ['Founding Age', 'Kingdom Age', 'Imperial Age', 'Industrial Age'].indexOf(a);
      const curPlayer = this.currentPlayer || player;
      const playerAgeRank = ageRank(curPlayer.age);

      this.actionMatrixElem.style.display = 'flex';
      this.actionMatrixElem.style.flexDirection = 'column';
      this.actionMatrixElem.style.padding = '4px';
      this.actionMatrixElem.style.gap = '3px';
      this.actionMatrixElem.style.overflow = 'hidden';
      this.actionMatrixElem.innerHTML = '';

      // Top Filter & Codex Navigation Bar
      const topBar = document.createElement('div');
      topBar.style.cssText = 'display: flex; gap: 2px; align-items: center; justify-content: space-between; flex-shrink: 0; height: 20px;';
      topBar.innerHTML = `
        <div style="display: flex; gap: 2px;">
          <button class="aoe3-tech-tab-btn ${this.activeTechCategory === 'all' ? 'active' : ''}" data-cat="all">All (16)</button>
          <button class="aoe3-tech-tab-btn ${this.activeTechCategory === 'Economy' ? 'active' : ''}" data-cat="Economy">🌾 Eco</button>
          <button class="aoe3-tech-tab-btn ${this.activeTechCategory === 'Military' ? 'active' : ''}" data-cat="Military">⚔️ Mil</button>
          <button class="aoe3-tech-tab-btn ${this.activeTechCategory === 'Construction' ? 'active' : ''}" data-cat="Construction">🏛️ Build</button>
          <button class="aoe3-tech-tab-btn ${this.activeTechCategory === 'Civilization' ? 'active' : ''}" data-cat="Civilization">📜 Civ</button>
        </div>
        <button id="btn-open-codex-bay" class="aoe3-tech-tab-btn" style="background: linear-gradient(180deg, #854d0e 0%, #713f12 100%); border-color: #fef08a; color: #fef08a; font-weight: 800;" title="Open Civilization Tech Tree & Research Codex (T)">🌳 Codex</button>
      `;

      topBar.querySelectorAll<HTMLButtonElement>('.aoe3-tech-tab-btn[data-cat]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const cat = btn.dataset.cat || 'all';
          this.activeTechCategory = cat;
          this.currentContextKey = '';
          this.renderBuildingActionMatrix(bldg, curPlayer);
        });
      });

      topBar.querySelector('#btn-open-codex-bay')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleTechTreeModal();
      });

      this.actionMatrixElem.appendChild(topBar);

      // Grid Container
      const gridContainer = document.createElement('div');
      gridContainer.id = 'aoe3-tech-matrix-grid';
      gridContainer.style.cssText = 'flex: 1; min-height: 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; overflow-y: auto; padding-right: 2px;';
      this.actionMatrixElem.appendChild(gridContainer);

      // Filter techs
      const allTechs = Object.values(TECHNOLOGIES).filter(t => !curPlayer.researchedTechs.includes(t.id));
      let filteredTechs = allTechs;
      if (this.activeTechCategory === 'Economy') {
        filteredTechs = allTechs.filter(t => t.category === 'Economy');
      } else if (this.activeTechCategory === 'Military') {
        filteredTechs = allTechs.filter(t => t.category === 'Military');
      } else if (this.activeTechCategory === 'Construction') {
        filteredTechs = allTechs.filter(t => t.category === 'Construction');
      } else if (this.activeTechCategory === 'Civilization') {
        filteredTechs = allTechs.filter(t => t.category === 'Civilization' || t.category === 'Exploration');
      }

      // Sort: Available first -> Missing prereq -> Age locked
      filteredTechs.sort((a, b) => {
        const aAgeRank = ageRank(a.requiredAge);
        const bAgeRank = ageRank(b.requiredAge);
        const aUnlocked = aAgeRank <= playerAgeRank && a.prerequisites.every(p => curPlayer.researchedTechs.includes(p));
        const bUnlocked = bAgeRank <= playerAgeRank && b.prerequisites.every(p => curPlayer.researchedTechs.includes(p));
        if (aUnlocked !== bUnlocked) return aUnlocked ? -1 : 1;
        if (aAgeRank !== bAgeRank) return aAgeRank - bAgeRank;
        return a.name.localeCompare(b.name);
      });

      const hotkeys = ['Q', 'W', 'E', 'R', 'A', 'S', 'D', 'F', 'Z', 'X', 'C', 'V', 'T', 'G', 'B', 'Y'];
      filteredTechs.forEach((t, idx) => {
        const tAgeRank = ageRank(t.requiredAge);
        const isAgeLocked = tAgeRank > playerAgeRank;
        const missingPrereqs = t.prerequisites.filter(p => !curPlayer.researchedTechs.includes(p));
        const isPrereqLocked = missingPrereqs.length > 0;
        const isLocked = isAgeLocked || isPrereqLocked;
        const isCurrentlyQueued = bldg.productionQueue.some(item => item.itemType === t.id);

        const costItems: string[] = [];
        if (t.cost.food) costItems.push(`${t.cost.food}F`);
        if (t.cost.wood) costItems.push(`${t.cost.wood}W`);
        if (t.cost.stone) costItems.push(`${t.cost.stone}S`);
        if (t.cost.metal) costItems.push(`${t.cost.metal}G`);
        if (t.cost.knowledge) costItems.push(`${t.cost.knowledge}Kn`);
        const costStr = costItems.slice(0, 2).join(' ') + (costItems.length > 2 ? '+' : '');

        const catIcons: Record<string, string> = {
          Economy: '🌾',
          Military: '⚔️',
          Construction: '🏛️',
          Exploration: '🧭',
          Civilization: '📜'
        };
        const icon = isCurrentlyQueued ? '⏳' : isLocked ? '🔒' : (catIcons[t.category] || '🔬');

        const disp = TECH_DISPLAY_INFO[t.id] || { line1: t.name };
        const titleColor = isCurrentlyQueued ? '#38bdf8' : isLocked ? '#94a3b8' : '#fef08a';
        const subColor = isCurrentlyQueued ? '#38bdf8' : isAgeLocked ? '#f87171' : isPrereqLocked ? '#f59e0b' : '#cbd5e1';
        const subText = isCurrentlyQueued ? 'Queued' : isAgeLocked ? t.requiredAge.replace(' Age', '') : isPrereqLocked ? 'Prereq' : costStr;

        const btn = document.createElement('button');
        btn.className = 'aoe3-action-btn';
        btn.dataset.hotkey = hotkeys[idx] || '';
        btn.style.cssText = `padding: 2px; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 42px; ${isCurrentlyQueued ? 'border-color: #38bdf8; background: #0c2b42;' : isLocked ? 'opacity: 0.65; border-color: #64748b;' : 'border-color: #a855f7;'}`;
        btn.title = `${t.name} (${t.category})\n${t.description}\nRequired Age: ${t.requiredAge}${isPrereqLocked ? `\nMissing Prerequisites: ${missingPrereqs.map(p => TECHNOLOGIES[p]?.name || p).join(', ')}` : ''}\nCost: ${costItems.join(', ')}`;
        btn.innerHTML = `
          <span class="aoe3-hotkey-badge">${hotkeys[idx] || ''}</span>
          <span style="font-size: 13px; line-height: 1;">${icon}</span>
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1.05; margin: 1px 0; text-align: center; max-width: 100%;">
            <span style="font-weight: 700; font-size: 8.5px; color: ${titleColor}; white-space: nowrap;">${disp.line1}</span>
            ${disp.line2 ? `<span style="font-weight: 700; font-size: 8.5px; color: ${titleColor}; white-space: nowrap;">${disp.line2}</span>` : ''}
          </div>
          <span style="font-size: 7.5px; font-weight: 700; color: ${subColor}; line-height: 1;">${subText}</span>
        `;

        btn.addEventListener('mouseenter', () => {
          this.showTechHoverDetails(t, bldg, curPlayer);
        });
        btn.addEventListener('mouseleave', () => {
          this.clearTechHoverDetails(bldg, curPlayer);
        });

        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const pState = this.currentPlayer || player;
          const pAgeRank = ageRank(pState.age);
          if (tAgeRank > pAgeRank) {
            soundManager.playError();
            this.showNotification(`🔒 ${t.name} requires ${t.requiredAge}! Advance your civilization first.`);
            return;
          }
          if (missingPrereqs.length > 0) {
            soundManager.playError();
            const prereqNames = missingPrereqs.map(p => TECHNOLOGIES[p]?.name || p).join(', ');
            this.showNotification(`🔒 Requires prerequisite: ${prereqNames}`);
            return;
          }

          if (bldg.productionQueue.some(item => item.itemType === t.id)) {
            soundManager.playError();
            this.showNotification(`⚠️ ${t.name} is already in the research queue!`);
            return;
          }

          // Check all resources
          const missingRes: string[] = [];
          if (pState.resources.food < t.cost.food) missingRes.push(`${t.cost.food - pState.resources.food} Food`);
          if (pState.resources.wood < t.cost.wood) missingRes.push(`${t.cost.wood - pState.resources.wood} Wood`);
          if (pState.resources.stone < t.cost.stone) missingRes.push(`${t.cost.stone - pState.resources.stone} Stone`);
          if (pState.resources.metal < t.cost.metal) missingRes.push(`${t.cost.metal - pState.resources.metal} Metal`);
          if (pState.resources.knowledge < t.cost.knowledge) missingRes.push(`${t.cost.knowledge - pState.resources.knowledge} Knowledge`);

          if (missingRes.length > 0) {
            soundManager.playError();
            this.showNotification(`⚠️ Insufficient resources for ${t.name}! Need: ${missingRes.join(', ')}`);
            return;
          }

          this.callbacks.onResearchTech(bldg.id, t.id);
          soundManager.playClick();
          this.showNotification(`🔬 Research started: ${t.name}`);
        });

        gridContainer.appendChild(btn);
      });
      return;
    }
  }

  private createTrainUnitButton(
    bldg: BuildingData,
    unitType: UnitType,
    label: string,
    icon: string,
    costText: string,
    hotkey: string,
    player: PlayerState
  ): void {
    const isDragon = unitType === 'dragon';
    const curPlayer = this.currentPlayer || player;

    // Find candidate buildings if multiple of the same type are selected
    const candidateBuildings = this.selectedBuildings.filter(
      b => b.ownerId === curPlayer.id && b.type === bldg.type && b.isConstructed
    );
    const buildingsToUse = candidateBuildings.length > 0 ? candidateBuildings : [bldg];

    // Total queued count of this specific unit across selected candidate buildings
    const queuedCount = buildingsToUse.reduce(
      (sum, b) => sum + b.productionQueue.filter(q => q.itemType === unitType).length,
      0
    );

    const btn = document.createElement('button');
    btn.className = 'aoe3-action-btn';
    btn.dataset.hotkey = hotkey;
    btn.style.cssText = `position: relative; padding: 4px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 10px; ${isDragon ? 'border-color: #ef4444;' : ''}`;
    btn.innerHTML = `
      <span class="aoe3-hotkey-badge">${hotkey}</span>
      ${queuedCount > 0 ? `<span class="aoe3-queue-count-badge">x${queuedCount}</span>` : ''}
      <span style="font-size: 16px;">${icon}</span>
      <span style="font-weight: 700; ${isDragon ? 'color: #f87171;' : ''}">${label}</span>
      <span style="font-size: 8.5px; color: #fef08a;">${costText}</span>
    `;

    btn.title = `${label} (${costText})\nHotkey: [${hotkey}]\nClick: Train 1\nShift+Click: Batch Train 5`;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const p = this.currentPlayer || player;
      const udef = UNIT_DEFINITIONS[unitType];
      if (!udef) return;

      const ageRank = (a: any) => ['Founding Age', 'Kingdom Age', 'Imperial Age', 'Industrial Age'].indexOf(a);
      if (ageRank(p.age) < ageRank(udef.requiredAge)) {
        soundManager.playError();
        this.showNotification(`🔒 ${label} requires ${udef.requiredAge}! Advance your civilization first.`);
        return;
      }

      // Shift+Click batch training: 5 units at once (AoE / RoN style)
      const trainTargetCount = e.shiftKey ? 5 : 1;
      let trainedCount = 0;

      let tempFood = p.resources.food;
      let tempWood = p.resources.wood;
      let tempStone = p.resources.stone;
      let tempMetal = p.resources.metal;
      let tempKnowledge = p.resources.knowledge;
      let tempPop = p.population;

      for (let i = 0; i < trainTargetCount; i++) {
        // Multi-building auto-balancing: pick building with smallest queue under 15 items
        const availableBldgs = buildingsToUse
          .filter(b => b.productionQueue.length < 15)
          .sort((a, b) => a.productionQueue.length - b.productionQueue.length);

        if (availableBldgs.length === 0) {
          if (trainedCount === 0) {
            soundManager.playError();
            this.showNotification(`⚠️ Production queue full (maximum 15 items per building)!`);
          }
          break;
        }

        if (tempPop + udef.populationCost > p.maxPopulation) {
          if (trainedCount === 0) {
            soundManager.playError();
            this.showNotification(`⚠️ Population cap reached (${tempPop}/${p.maxPopulation})! Construct Houses.`);
          }
          break;
        }

        const canAfford =
          tempFood >= udef.cost.food &&
          tempWood >= udef.cost.wood &&
          tempStone >= udef.cost.stone &&
          tempMetal >= udef.cost.metal &&
          tempKnowledge >= udef.cost.knowledge;

        if (!canAfford) {
          if (trainedCount === 0) {
            soundManager.playError();
            this.showNotification(`⚠️ Insufficient resources! Need ${costText} to recruit ${label}.`);
          }
          break;
        }

        tempFood -= udef.cost.food;
        tempWood -= udef.cost.wood;
        tempStone -= udef.cost.stone;
        tempMetal -= udef.cost.metal;
        tempKnowledge -= udef.cost.knowledge;
        tempPop += udef.populationCost;

        const targetBldg = availableBldgs[0];
        targetBldg.productionQueue.push({
          id: `client_q_${Date.now()}_${i}`,
          itemType: unitType,
          category: 'unit',
          progress: 0,
          totalTime: udef.trainingTime
        });

        this.callbacks.onTrainUnit(targetBldg.id, unitType);
        trainedCount++;
      }

      if (trainedCount > 0) {
        soundManager.playClick();
        if (trainedCount > 1) {
          this.showNotification(`⚔️ Queued ${trainedCount}x ${label} across ${buildingsToUse.length > 1 ? buildingsToUse.length + ' buildings' : bldg.type.replace('_', ' ')}!`);
        } else {
          this.showNotification(isDragon ? `🐉 Summoning War Dragon into the skies!` : `⚔️ Recruiting ${label}...`);
        }
      }
    });

    this.actionMatrixElem.appendChild(btn);
  }

  private updateActionMatrixDynamicState(player: PlayerState): void {
    const ageBtn = this.actionMatrixElem.querySelector<HTMLElement>('#hud-advance-age-btn');
    if (ageBtn) {
      const ageReq = AGE_ADVANCEMENT_REQUIREMENTS[player.age];
      if (ageReq) {
        const canAfford =
          player.resources.food >= ageReq.cost.food &&
          player.resources.wood >= ageReq.cost.wood &&
          player.resources.stone >= ageReq.cost.stone &&
          player.resources.metal >= ageReq.cost.metal &&
          player.resources.knowledge >= ageReq.cost.knowledge;
        ageBtn.style.borderColor = canAfford ? '#fbbf24' : '#64748b';
      }
    }
  }

  // ==========================================
  // PLACEMENT BANNER & RESOURCE TOOLTIPS
  // ==========================================
  public setPlacementActive(type: BuildingType | null): void {
    this.activePlacementType = type;
    if (!type) {
      if (this.placementBannerElem) {
        this.placementBannerElem.remove();
        this.placementBannerElem = null;
      }
      this.actionMatrixElem.querySelectorAll<HTMLElement>('.build-matrix-btn').forEach(btn => {
        btn.classList.remove('active');
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
        background: rgba(18, 9, 4, 0.95);
        border: 2px solid #d4af37;
        border-radius: 4px;
        padding: 6px 20px;
        color: #fef08a;
        font-size: 12px;
        font-weight: 700;
        display: flex;
        align-items: center;
        gap: 16px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.85);
        z-index: 1000;
        pointer-events: auto;
      `;
      this.rootElem.appendChild(this.placementBannerElem);
    }

    this.placementBannerElem.innerHTML = `
      <span>🔨 Placing <strong>${def.name}</strong></span>
      <span style="font-size: 11px; color: #cbd5e1;">Left-Click terrain to build • Right-Click / ESC to cancel</span>
      <button id="btn-cancel-placement" class="aoe-btn-crimson" style="padding: 2px 10px; font-size: 10px;">Cancel</button>
    `;

    this.placementBannerElem.querySelector('#btn-cancel-placement')?.addEventListener('click', () => {
      this.callbacks.onCancelPlacement?.();
    });

    this.actionMatrixElem.querySelectorAll<HTMLElement>('.build-matrix-btn').forEach(btn => {
      if (btn.dataset.btype === type) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
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
      background: rgba(18, 9, 4, 0.96);
      border: 1.5px solid #d4af37;
      border-radius: 4px;
      padding: 8px 12px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.85);
      white-space: nowrap;
      transition: opacity 0.12s ease;
    `;
    this.rootElem.appendChild(this.hoverTooltipElem);
  }

  public showResourceHoverTooltip(screenX: number, screenY: number, node: ResourceNodeData): void {
    let icon = '🪙';
    let name = 'Gold Vein / Mine';
    let typeName = 'Gold';
    let hint = 'Right-click with Workers to Mine Gold';

    if (node.type === 'metal') {
      icon = '🪙';
      name = 'Gold Vein / Ore';
      typeName = 'Gold';
      hint = 'Right-click with Workers to Mine Gold';
    } else if (node.type === 'wood') {
      icon = '🌲';
      name = 'Timber Forest';
      typeName = 'Wood';
      hint = 'Right-click with Workers to Chop Lumber';
    } else if (node.type === 'stone') {
      icon = '🪨';
      name = 'Granite Stone Quarry';
      typeName = 'Stone';
      hint = 'Right-click with Workers to Quarry Stone';
    } else if (node.type === 'food') {
      icon = '🌾';
      name = 'Forage Berry Plot';
      typeName = 'Food';
      hint = 'Right-click with Workers to Forage Food';
    }

    const maxStock = node.maxAmount || (node.type === 'wood' ? 600 : node.type === 'stone' ? 800 : node.type === 'food' ? 500 : 1000);
    const percent = Math.max(0, Math.min(100, Math.round((node.amount / maxStock) * 100)));

    this.hoverTooltipElem.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
        <span style="font-size: 18px;">${icon}</span>
        <div>
          <div class="cinzel" style="font-weight: 800; font-size: 13px; color: #fef08a;">${name}</div>
          <div style="font-size: 10px; color: #94a3b8;">${typeName} Deposit</div>
        </div>
      </div>
      <div style="font-size: 11px; color: #f8fafc; margin-bottom: 2px;">Remaining: <strong>${Math.floor(node.amount)}</strong> / ${maxStock} (${percent}%)</div>
      <div style="width: 140px; height: 5px; background: #331d0d; border-radius: 2px; overflow: hidden; margin-bottom: 4px;">
        <div style="width: ${percent}%; height: 100%; background: #22c55e;"></div>
      </div>
      <div style="font-size: 9.5px; color: #cbd5e1; font-style: italic;">${hint}</div>
    `;

    this.hoverTooltipElem.style.left = `${screenX + 16}px`;
    this.hoverTooltipElem.style.top = `${screenY - 24}px`;
    this.hoverTooltipElem.style.display = 'block';
  }

  public hideResourceHoverTooltip(): void {
    if (this.hoverTooltipElem) {
      this.hoverTooltipElem.style.display = 'none';
    }
  }

  public showResourceDetails(node: ResourceNodeData): void {
    let icon = '🪙';
    let name = 'Gold Vein Deposit';
    let desc = 'Rich golden ore nuggets. Essential for advanced military training, war dragons, and imperial wonders.';
    if (node.type === 'metal') {
      icon = '🪙';
      name = 'Gold Vein Deposit';
      desc = 'Rich golden ore nuggets. Essential for advanced military training, war dragons, and imperial wonders.';
    } else if (node.type === 'wood') {
      icon = '🌲';
      name = 'Timber Forest';
      desc = 'Dense woodland timber. Send workers to harvest lumber for buildings, archery, and siege workshops.';
    } else if (node.type === 'stone') {
      icon = '🪨';
      name = 'Granite Stone Quarry';
      desc = 'Hard natural stone outcrop. Essential for fortresses, walls, watchtowers, and town centres.';
    } else if (node.type === 'food') {
      icon = '🌾';
      name = 'Forage Berry Bush';
      desc = 'Wild agrarian food source. Immediate food supply for training workers and initial military forces.';
    }

    const maxStock = node.maxAmount || 800;
    const percent = Math.max(0, Math.min(100, Math.round((node.amount / maxStock) * 100)));

    this.currentContextKey = 'resource_selected';
    this.selectedBuildingId = null;

    this.selectionDetailsElem.innerHTML = `
      <div style="display: flex; flex-direction: column; height: 100%; justify-content: space-between;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <div class="cinzel" style="font-weight: 800; font-size: 14px; color: #fef08a;">${name.toUpperCase()}</div>
              <div style="font-size: 11px; color: #cbd5e1;">Natural Resource Node</div>
            </div>
            <span style="font-size: 20px;">${icon}</span>
          </div>

          <div style="margin-top: 8px;">
            <div style="font-size: 11px; color: #f8fafc; display: flex; justify-content: space-between;">
              <span>Stockpile</span>
              <strong>${Math.floor(node.amount)} / ${maxStock}</strong>
            </div>
            <div style="width: 100%; height: 6px; background: #331d0d; border: 1px solid #8c6a34; border-radius: 3px; overflow: hidden; margin-top: 3px;">
              <div style="width: ${percent}%; height: 100%; background: #22c55e;"></div>
            </div>
          </div>
        </div>

        <div style="font-size: 11px; color: #cbd5e1; line-height: 1.4;">
          ${desc}
        </div>
      </div>
    `;

    this.actionMatrixElem.innerHTML = `
      <div style="grid-column: span 5; grid-row: span 3; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #fef08a; font-size: 11px; text-align: center; padding: 6px;">
        <span style="font-size: 24px; margin-bottom: 4px;">👨‍🌾</span>
        <span>Right-click with citizen workers to assign them to harvest this deposit.</span>
      </div>
    `;
  }

  // ==========================================
  // AGE ADVANCEMENT & CO-OP MODALS
  // ==========================================
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
    this.ageModalElem.className = 'modal-backdrop interactive aoe-wood-backdrop';
    this.ageModalElem.style.cssText = 'position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; z-index: 2000; background: rgba(10, 6, 3, 0.78); backdrop-filter: blur(4px);';

    const nextAge = ageReq ? ageReq.nextAge : null;
    const canAfford = nextAge ? (
      player.resources.food >= ageReq.cost.food &&
      player.resources.wood >= ageReq.cost.wood &&
      player.resources.stone >= ageReq.cost.stone &&
      player.resources.metal >= ageReq.cost.metal &&
      player.resources.knowledge >= ageReq.cost.knowledge
    ) : false;

    this.ageModalElem.innerHTML = `
      <div class="aoe-parchment-card" style="
        width: 540px;
        padding: 26px;
        color: #2b1809;
        display: flex;
        flex-direction: column;
        gap: 16px;
        position: relative;
        box-shadow: 0 16px 48px rgba(0, 0, 0, 0.85);
      ">
        <div class="aoe-corner-rivet aoe-corner-rivet-tl"></div>
        <div class="aoe-corner-rivet aoe-corner-rivet-tr"></div>
        <div class="aoe-corner-rivet aoe-corner-rivet-bl"></div>
        <div class="aoe-corner-rivet aoe-corner-rivet-br"></div>

        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #8c6a34; padding-bottom: 10px;">
          <h2 class="cinzel" style="font-size: 20px; color: #451a03; margin: 0; font-weight: 800; letter-spacing: 1px;">CIVILIZATION ADVANCEMENT</h2>
          <span style="font-size: 12px; color: #78350f; font-weight: 600;">Current: <strong>${player.age}</strong></span>
        </div>

        ${nextAge ? `
          <div style="font-size: 13px; color: #451a03; line-height: 1.5;">
            Advancing to <strong style="color: #991b1b;">${nextAge}</strong> unlocks historical military units, upgraded fortifications, stronger economic structures, and era-defining technologies.
          </div>

          <div class="aoe-parchment-inner" style="padding: 14px;">
            <div style="font-size: 11px; font-weight: 800; color: #78350f; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Required Tributes & Resources</div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; font-size: 13px; font-weight: 700;">
              <div style="color: ${player.resources.food >= ageReq.cost.food ? '#166534' : '#991b1b'};">🌾 Food: ${player.resources.food}/${ageReq.cost.food}</div>
              <div style="color: ${player.resources.wood >= ageReq.cost.wood ? '#166534' : '#991b1b'};">🪵 Wood: ${player.resources.wood}/${ageReq.cost.wood}</div>
              <div style="color: ${player.resources.knowledge >= ageReq.cost.knowledge ? '#166534' : '#991b1b'};">📜 Knowledge: ${player.resources.knowledge}/${ageReq.cost.knowledge}</div>
              ${ageReq.cost.stone > 0 ? `<div style="color: ${player.resources.stone >= ageReq.cost.stone ? '#166534' : '#991b1b'};">🪨 Stone: ${player.resources.stone}/${ageReq.cost.stone}</div>` : ''}
              ${ageReq.cost.metal > 0 ? `<div style="color: ${player.resources.metal >= ageReq.cost.metal ? '#166534' : '#991b1b'};">🪙 Metal: ${player.resources.metal}/${ageReq.cost.metal}</div>` : ''}
            </div>
          </div>
        ` : `
          <div style="font-size: 14px; color: #166534; font-weight: 700; text-align: center; padding: 24px; background: rgba(34, 197, 94, 0.1); border: 1px dashed #166534; border-radius: 6px;">
            👑 Your nation has achieved the glorious Industrial Age apex!
          </div>
        `}

        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 2px solid #8c6a34; padding-top: 14px;">
          <button id="btn-close-age-modal" class="aoe-btn-crimson" style="padding: 8px 18px; font-size: 12px; background: linear-gradient(180deg, #5c4033 0%, #3a2618 100%); border-color: #8c6a34; color: #fbf1dc;">
            Close
          </button>
          ${nextAge ? `
            <button id="btn-modal-advance-age" class="aoe-btn-crimson" style="
              padding: 9px 24px;
              font-size: 13px;
              ${!canAfford ? 'opacity: 0.6; cursor: not-allowed;' : ''}
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
    this.coopModalElem.className = 'modal-backdrop interactive aoe-wood-backdrop';
    this.coopModalElem.style.cssText = 'position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; z-index: 2000; background: rgba(10, 6, 3, 0.78); backdrop-filter: blur(4px);';

    this.renderCoopModalContent();
    this.rootElem.appendChild(this.coopModalElem);
  }

  private renderCoopModalContent(): void {
    if (!this.coopModalElem || !this.currentPlayer) return;
    const player = this.currentPlayer;
    const teammates = this.allPlayers.filter(p => p.team === player.team && p.id !== player.id && !p.isDefeated);

    this.coopModalElem.innerHTML = `
      <div class="aoe-parchment-card" style="
        width: 600px;
        padding: 26px;
        color: #2b1809;
        display: flex;
        flex-direction: column;
        gap: 16px;
        position: relative;
        box-shadow: 0 16px 48px rgba(0, 0, 0, 0.85);
      ">
        <div class="aoe-corner-rivet aoe-corner-rivet-tl"></div>
        <div class="aoe-corner-rivet aoe-corner-rivet-tr"></div>
        <div class="aoe-corner-rivet aoe-corner-rivet-bl"></div>
        <div class="aoe-corner-rivet aoe-corner-rivet-br"></div>

        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #8c6a34; padding-bottom: 10px;">
          <h2 class="cinzel" style="font-size: 20px; color: #451a03; margin: 0; font-weight: 800; letter-spacing: 1px;">🤝 CO-OP ALLY TRIBUTE</h2>
          <span style="font-size: 12px; color: #78350f; font-weight: 600;">Team ${player.team} Allies</span>
        </div>

        <div style="font-size: 13px; color: #451a03; line-height: 1.4;">
          Transfer stockpiled resources to your allied commanders to reinforce their war efforts, army recruitment, or research.
        </div>

        <div style="display: flex; flex-direction: column; gap: 12px; max-height: 380px; overflow-y: auto;">
          ${teammates.map(tm => `
            <div class="aoe-parchment-inner" style="padding: 12px; border: 1.5px solid ${tm.color};">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <div style="width: 12px; height: 12px; border-radius: 50%; background: ${tm.color}; border: 1px solid #000;"></div>
                  <strong style="font-size: 14px; color: #3b1d08;">${tm.name}</strong>
                  <span style="font-size: 11px; color: #78350f;">(${tm.civ} • ${tm.age})</span>
                </div>
                <div style="font-size: 12px; color: #991b1b; font-weight: 800;">
                  Pop: ${tm.population}/${tm.maxPopulation}
                </div>
              </div>

              <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px;">
                <button class="btn-tribute aoe-btn-crimson" data-to="${tm.id}" data-res="food" data-amt="100" ${player.resources.food < 100 ? 'disabled' : ''} style="padding: 6px 2px; font-size: 11px; ${player.resources.food < 100 ? 'opacity: 0.5; cursor: not-allowed;' : ''}">
                  +100 🌾
                </button>
                <button class="btn-tribute aoe-btn-crimson" data-to="${tm.id}" data-res="wood" data-amt="100" ${player.resources.wood < 100 ? 'disabled' : ''} style="padding: 6px 2px; font-size: 11px; ${player.resources.wood < 100 ? 'opacity: 0.5; cursor: not-allowed;' : ''}">
                  +100 🪵
                </button>
                <button class="btn-tribute aoe-btn-crimson" data-to="${tm.id}" data-res="stone" data-amt="100" ${player.resources.stone < 100 ? 'disabled' : ''} style="padding: 6px 2px; font-size: 11px; ${player.resources.stone < 100 ? 'opacity: 0.5; cursor: not-allowed;' : ''}">
                  +100 🪨
                </button>
                <button class="btn-tribute aoe-btn-crimson" data-to="${tm.id}" data-res="metal" data-amt="100" ${player.resources.metal < 100 ? 'disabled' : ''} style="padding: 6px 2px; font-size: 11px; ${player.resources.metal < 100 ? 'opacity: 0.5; cursor: not-allowed;' : ''}">
                  +100 🪙
                </button>
                <button class="btn-tribute aoe-btn-crimson" data-to="${tm.id}" data-res="knowledge" data-amt="50" ${player.resources.knowledge < 50 ? 'disabled' : ''} style="padding: 6px 2px; font-size: 11px; ${player.resources.knowledge < 50 ? 'opacity: 0.5; cursor: not-allowed;' : ''}">
                  +50 📜
                </button>
              </div>
            </div>
          `).join('')}
        </div>

        <div style="display: flex; justify-content: flex-end; border-top: 2px solid #8c6a34; padding-top: 14px;">
          <button id="btn-close-coop-modal" class="aoe-btn-crimson" style="padding: 8px 24px; font-size: 12px; background: linear-gradient(180deg, #5c4033 0%, #3a2618 100%); border-color: #8c6a34; color: #fbf1dc;">
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

  // ==========================================
  // RESEARCH TREE & ACADEMY CODEX
  // ==========================================
  private showTechHoverDetails(t: TechDefinition, bldg: BuildingData, player: PlayerState): void {
    this.isHoveringTech = true;
    const curPlayer = this.currentPlayer || player;
    const ageRank = (a: any) => ['Founding Age', 'Kingdom Age', 'Imperial Age', 'Industrial Age'].indexOf(a);
    const pAgeRank = ageRank(curPlayer.age);
    const tAgeRank = ageRank(t.requiredAge);
    const isAgeLocked = tAgeRank > pAgeRank;
    const missingPrereqs = t.prerequisites.filter(p => !curPlayer.researchedTechs.includes(p));
    const isPrereqLocked = missingPrereqs.length > 0;
    const isResearched = curPlayer.researchedTechs.includes(t.id);
    const isCurrentlyQueued = bldg.productionQueue.some(item => item.itemType === t.id);

    const catIcons: Record<string, string> = {
      Economy: '🌾',
      Military: '⚔️',
      Construction: '🏛️',
      Exploration: '🧭',
      Civilization: '📜'
    };
    const icon = catIcons[t.category] || '🔬';

    const costList: string[] = [];
    if (t.cost.food) costList.push(`<span style="color: #fca5a5;">🥩 ${t.cost.food}F</span>`);
    if (t.cost.wood) costList.push(`<span style="color: #fde047;">🪵 ${t.cost.wood}W</span>`);
    if (t.cost.stone) costList.push(`<span style="color: #cbd5e1;">🪨 ${t.cost.stone}S</span>`);
    if (t.cost.metal) costList.push(`<span style="color: #fef08a;">🪙 ${t.cost.metal}G</span>`);
    if (t.cost.knowledge) costList.push(`<span style="color: #67e8f9;">📜 ${t.cost.knowledge}Kn</span>`);

    const missingRes: string[] = [];
    if (curPlayer.resources.food < t.cost.food) missingRes.push(`${t.cost.food - curPlayer.resources.food} Food`);
    if (curPlayer.resources.wood < t.cost.wood) missingRes.push(`${t.cost.wood - curPlayer.resources.wood} Wood`);
    if (curPlayer.resources.stone < t.cost.stone) missingRes.push(`${t.cost.stone - curPlayer.resources.stone} Stone`);
    if (curPlayer.resources.metal < t.cost.metal) missingRes.push(`${t.cost.metal - curPlayer.resources.metal} Metal`);
    if (curPlayer.resources.knowledge < t.cost.knowledge) missingRes.push(`${t.cost.knowledge - curPlayer.resources.knowledge} Knowledge`);

    const statusBadge = isResearched
      ? '<span style="color: #22c55e; font-weight: 800;">✅ RESEARCHED</span>'
      : isCurrentlyQueued
      ? '<span style="color: #38bdf8; font-weight: 800;">⏳ IN RESEARCH QUEUE</span>'
      : isAgeLocked
      ? `<span style="color: #ef4444; font-weight: 800;">🔒 REQUIRES ${t.requiredAge.toUpperCase()}</span>`
      : isPrereqLocked
      ? `<span style="color: #f59e0b; font-weight: 800;">🔒 REQUIRES ${missingPrereqs.map(p => TECHNOLOGIES[p]?.name || p).join(', ').toUpperCase()}</span>`
      : missingRes.length > 0
      ? `<span style="color: #f87171; font-weight: 800;">⚠️ NEED ${missingRes.join(', ').toUpperCase()}</span>`
      : '<span style="color: #4ade80; font-weight: 800;">✨ READY TO RESEARCH</span>';

    this.selectionDetailsElem.innerHTML = `
      <div style="display: flex; flex-direction: column; height: 100%; justify-content: space-between;">
        <div>
          <!-- Header -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <div class="cinzel" style="font-weight: 800; font-size: 13.5px; color: #fef08a; letter-spacing: 0.5px;">${t.name.toUpperCase()}</div>
              <div style="font-size: 10.5px; color: #cbd5e1; display: flex; align-items: center; gap: 5px; margin-top: 2px;">
                <span style="background: rgba(140, 106, 52, 0.4); border: 1px solid #8c6a34; padding: 1px 5px; border-radius: 3px; font-weight: 700; color: #fef08a;">${t.requiredAge}</span>
                <span style="color: #94a3b8;">•</span>
                <span style="color: #93c5fd; font-weight: 600;">${t.category}</span>
                <span style="color: #94a3b8;">•</span>
                <span style="color: #cbd5e1;">⏱️ ${t.researchTime}s</span>
              </div>
            </div>
            <span style="font-size: 26px;">${icon}</span>
          </div>

          <!-- Description Box -->
          <div style="margin-top: 8px; font-size: 11px; color: #f8fafc; line-height: 1.4; background: rgba(0, 0, 0, 0.45); border: 1.5px solid #8c6a34; border-radius: 4px; padding: 6px 9px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.6);">
            ${t.description}
          </div>

          <!-- Prerequisites & Status -->
          <div style="margin-top: 6px; font-size: 10px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <span style="color: #94a3b8;">Prerequisites: </span>
              ${t.prerequisites.length === 0
                ? '<span style="color: #4ade80; font-weight: 600;">None</span>'
                : t.prerequisites.map(p => {
                    const pMet = curPlayer.researchedTechs.includes(p);
                    return `<span style="color: ${pMet ? '#4ade80' : '#f87171'}; font-weight: 700;">${pMet ? '✓' : '✗'} ${TECHNOLOGIES[p]?.name || p}</span>`;
                  }).join(', ')}
            </div>
          </div>
        </div>

        <!-- Footer: Cost & Action State -->
        <div style="background: rgba(14, 7, 3, 0.85); border-top: 1.5px solid #8c6a34; padding: 5px 8px; border-radius: 4px; display: flex; flex-direction: column; gap: 4px;">
          <div style="display: flex; gap: 8px; font-size: 10.5px; font-weight: 700; flex-wrap: wrap;">
            ${costList.join(' ')}
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(140, 106, 52, 0.4); padding-top: 3px; font-size: 10px;">
            <span>${statusBadge}</span>
            <span style="color: #94a3b8; font-size: 9px;">Click action button to queue</span>
          </div>
        </div>
      </div>
    `;
  }

  private clearTechHoverDetails(bldg: BuildingData, player: PlayerState): void {
    this.isHoveringTech = false;
    this.currentContextKey = '';
    this.updateSelection([], [bldg], player);
  }

  public toggleTechTreeModal(): void {
    if (this.techModalElem) {
      this.techModalElem.remove();
      this.techModalElem = null;
      this.lastTechModalSig = '';
      return;
    }

    if (!this.currentPlayer) return;
    const player = this.currentPlayer;

    this.techModalElem = document.createElement('div');
    this.techModalElem.className = 'modal-backdrop interactive aoe-wood-backdrop';
    this.techModalElem.style.cssText = 'position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; z-index: 2100; background: rgba(10, 6, 3, 0.82); backdrop-filter: blur(5px);';

    // Click backdrop outside card to close
    this.techModalElem.addEventListener('click', (e) => {
      if (e.target === this.techModalElem) {
        e.preventDefault();
        e.stopPropagation();
        this.toggleTechTreeModal();
        soundManager.playClick();
      }
    });

    this.renderTechTreeModalContent(player);
    this.rootElem.appendChild(this.techModalElem);
  }

  private updateTechModalDynamicState(player: PlayerState): void {
    if (!this.techModalElem) return;
    const scrollPane = this.techModalElem.querySelector('.aoe-scroll-pane') as HTMLElement | null;
    const prevScroll = scrollPane ? scrollPane.scrollTop : 0;
    this.renderTechTreeModalContent(player);
    const newScrollPane = this.techModalElem.querySelector('.aoe-scroll-pane') as HTMLElement | null;
    if (newScrollPane) {
      newScrollPane.scrollTop = prevScroll;
    }
  }

  private renderTechTreeModalContent(player: PlayerState): void {
    if (!this.techModalElem) return;
    const ageRank = (a: any) => ['Founding Age', 'Kingdom Age', 'Imperial Age', 'Industrial Age'].indexOf(a);
    const pAgeRank = ageRank(player.age);

    // Find player's research hall
    const selectedHall = this.selectedBuildingId && this.allBuildings.find(b => b.id === this.selectedBuildingId && b.type === 'research_hall' && b.isConstructed);
    const activeHall = selectedHall || this.allBuildings.find(b => b.ownerId === player.id && b.type === 'research_hall' && b.isConstructed);

    const ages: AgeName[] = ['Founding Age', 'Kingdom Age', 'Imperial Age'];
    const catIcons: Record<string, string> = {
      Economy: '🌾',
      Military: '⚔️',
      Construction: '🏛️',
      Exploration: '🧭',
      Civilization: '📜'
    };

    // Filter by active tech category
    const allTechList = Object.values(TECHNOLOGIES);
    let displayTechs = allTechList;
    if (this.activeTechCategory === 'Economy') {
      displayTechs = allTechList.filter(t => t.category === 'Economy');
    } else if (this.activeTechCategory === 'Military') {
      displayTechs = allTechList.filter(t => t.category === 'Military');
    } else if (this.activeTechCategory === 'Construction') {
      displayTechs = allTechList.filter(t => t.category === 'Construction');
    } else if (this.activeTechCategory === 'Civilization') {
      displayTechs = allTechList.filter(t => t.category === 'Civilization' || t.category === 'Exploration');
    }

    this.techModalElem.innerHTML = `
      <div class="aoe-parchment-card" style="
        width: 1040px;
        max-width: 96vw;
        height: 86vh;
        max-height: 86vh;
        padding: 20px 24px;
        color: #2b1809;
        display: flex;
        flex-direction: column;
        gap: 12px;
        position: relative;
        box-shadow: 0 16px 48px rgba(0, 0, 0, 0.95);
        overflow: hidden;
      ">
        <div class="aoe-corner-rivet aoe-corner-rivet-tl"></div>
        <div class="aoe-corner-rivet aoe-corner-rivet-tr"></div>
        <div class="aoe-corner-rivet aoe-corner-rivet-bl"></div>
        <div class="aoe-corner-rivet aoe-corner-rivet-br"></div>

        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #8c6a34; padding-bottom: 8px; flex-shrink: 0;">
          <div>
            <h2 class="cinzel" style="font-size: 20px; color: #451a03; margin: 0; font-weight: 800; letter-spacing: 1px;">
              📜 ACADEMY RESEARCH CODEX & TECH TREE
            </h2>
            <div style="font-size: 11.5px; color: #78350f; margin-top: 2px;">
              Civilization: <strong>${player.civ.toUpperCase()}</strong> • Current Era: <strong>${player.age}</strong> • Researched: <strong>${player.researchedTechs.length}/16</strong>
            </div>
          </div>
          <button id="btn-close-tech-modal" class="aoe-btn-crimson" style="padding: 7px 16px; font-size: 12px; font-weight: 800; background: linear-gradient(180deg, #78350f 0%, #451a03 100%); border: 1.5px solid #d4af37; color: #fef08a; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 2px 6px rgba(0,0,0,0.4);">
            <span style="font-size: 14px; font-weight: bold; line-height: 1;">✕</span> Close (Esc)
          </button>
        </div>

        <!-- Filter Tab Bar -->
        <div style="display: flex; gap: 6px; align-items: center; flex-shrink: 0;">
          <span style="font-size: 11.5px; font-weight: 800; color: #78350f; text-transform: uppercase;">Filter Discipline:</span>
          <button class="aoe3-tech-tab-btn ${this.activeTechCategory === 'all' ? 'active' : ''}" data-cat="all" style="padding: 4px 10px; font-size: 11px;">All (16)</button>
          <button class="aoe3-tech-tab-btn ${this.activeTechCategory === 'Economy' ? 'active' : ''}" data-cat="Economy" style="padding: 4px 10px; font-size: 11px;">🌾 Economy</button>
          <button class="aoe3-tech-tab-btn ${this.activeTechCategory === 'Military' ? 'active' : ''}" data-cat="Military" style="padding: 4px 10px; font-size: 11px;">⚔️ Military</button>
          <button class="aoe3-tech-tab-btn ${this.activeTechCategory === 'Construction' ? 'active' : ''}" data-cat="Construction" style="padding: 4px 10px; font-size: 11px;">🏛️ Construction</button>
          <button class="aoe3-tech-tab-btn ${this.activeTechCategory === 'Civilization' ? 'active' : ''}" data-cat="Civilization" style="padding: 4px 10px; font-size: 11px;">📜 Civilization & Exploration</button>
        </div>

        <!-- 3 Columns for 3 Eras -->
        <div class="aoe-scroll-pane" style="
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          overflow-y: scroll;
          overflow-x: hidden;
          flex: 1 1 0px;
          min-height: 0;
          padding: 4px 6px 28px 2px;
          touch-action: pan-y;
        ">
          ${ages.map(age => {
            const ageTechs = displayTechs.filter(t => t.requiredAge === age);
            const isEraReached = pAgeRank >= ageRank(age);
            return `
              <div class="aoe-parchment-inner" style="padding: 12px; display: flex; flex-direction: column; gap: 10px; ${!isEraReached ? 'opacity: 0.85; border-color: #64748b;' : 'border-color: #8c6a34;'}">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid ${isEraReached ? '#8c6a34' : '#94a3b8'}; padding-bottom: 6px;">
                  <strong class="cinzel" style="font-size: 14px; color: ${isEraReached ? '#451a03' : '#64748b'};">${age.toUpperCase()}</strong>
                  <span style="font-size: 10.5px; font-weight: 700; color: ${isEraReached ? '#166534' : '#991b1b'};">
                    ${isEraReached ? '👑 UNLOCKED' : '🔒 ADVANCE ERA'}
                  </span>
                </div>

                <div style="display: flex; flex-direction: column; gap: 10px;">
                  ${ageTechs.length === 0 ? '<div style="font-size: 11px; color: #94a3b8; text-align: center; padding: 20px;">No technologies match this category filter.</div>' : ''}
                  ${ageTechs.map(t => {
                    const isResearched = player.researchedTechs.includes(t.id);
                    const isAgeLocked = ageRank(t.requiredAge) > pAgeRank;
                    const missingPrereqs = t.prerequisites.filter(p => !player.researchedTechs.includes(p));
                    const isPrereqLocked = missingPrereqs.length > 0;
                    const isCurrentlyQueued = activeHall ? activeHall.productionQueue.some(item => item.itemType === t.id) : false;
                    const queueItem = activeHall ? activeHall.productionQueue.find(item => item.itemType === t.id) : undefined;
                    const queueProgress = queueItem ? Math.floor(queueItem.progress) : 0;

                    const costBadges: string[] = [];
                    if (t.cost.food) costBadges.push(`<span style="color: ${player.resources.food >= t.cost.food ? '#166534' : '#991b1b'}; font-weight: 700;">🥩 ${t.cost.food}</span>`);
                    if (t.cost.wood) costBadges.push(`<span style="color: ${player.resources.wood >= t.cost.wood ? '#166534' : '#991b1b'}; font-weight: 700;">🪵 ${t.cost.wood}</span>`);
                    if (t.cost.stone) costBadges.push(`<span style="color: ${player.resources.stone >= t.cost.stone ? '#166534' : '#991b1b'}; font-weight: 700;">🪨 ${t.cost.stone}</span>`);
                    if (t.cost.metal) costBadges.push(`<span style="color: ${player.resources.metal >= t.cost.metal ? '#166534' : '#991b1b'}; font-weight: 700;">🪙 ${t.cost.metal}</span>`);
                    if (t.cost.knowledge) costBadges.push(`<span style="color: ${player.resources.knowledge >= t.cost.knowledge ? '#166534' : '#991b1b'}; font-weight: 700;">📜 ${t.cost.knowledge}</span>`);

                    const canAfford =
                      player.resources.food >= t.cost.food &&
                      player.resources.wood >= t.cost.wood &&
                      player.resources.stone >= t.cost.stone &&
                      player.resources.metal >= t.cost.metal &&
                      player.resources.knowledge >= t.cost.knowledge;

                    const missingRes: string[] = [];
                    if (player.resources.food < t.cost.food) missingRes.push(`${t.cost.food - player.resources.food} Food`);
                    if (player.resources.wood < t.cost.wood) missingRes.push(`${t.cost.wood - player.resources.wood} Wood`);
                    if (player.resources.stone < t.cost.stone) missingRes.push(`${t.cost.stone - player.resources.stone} Stone`);
                    if (player.resources.metal < t.cost.metal) missingRes.push(`${t.cost.metal - player.resources.metal} Metal`);
                    if (player.resources.knowledge < t.cost.knowledge) missingRes.push(`${t.cost.knowledge - player.resources.knowledge} Knowledge`);

                    return `
                      <div style="background: rgba(255, 255, 255, 0.45); border: 1.5px solid ${isResearched ? '#166534' : isCurrentlyQueued ? '#0284c7' : '#8c6a34'}; border-radius: 4px; padding: 10px; display: flex; flex-direction: column; gap: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                        <!-- Title & Category Row -->
                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                          <div style="display: flex; align-items: center; gap: 6px;">
                            <span style="font-size: 18px;">${catIcons[t.category] || '🔬'}</span>
                            <div>
                              <strong style="font-size: 12.5px; color: #451a03; display: block; line-height: 1.2;">${t.name}</strong>
                              <span style="font-size: 9.5px; color: #78350f; font-weight: 600;">${t.category} • ⏱️ ${t.researchTime}s</span>
                            </div>
                          </div>
                        </div>

                        <!-- Description -->
                        <div style="font-size: 11px; color: #2b1809; line-height: 1.35; background: rgba(0,0,0,0.04); padding: 5px 7px; border-radius: 3px;">
                          ${t.description}
                        </div>

                        <!-- Prerequisites -->
                        ${t.prerequisites.length > 0 ? `
                          <div style="font-size: 10px; color: #573010;">
                            <strong>Requires:</strong> ${t.prerequisites.map(p => {
                              const met = player.researchedTechs.includes(p);
                              return `<span style="color: ${met ? '#166534' : '#991b1b'}; font-weight: 700;">${met ? '✓' : '🔒'} ${TECHNOLOGIES[p]?.name || p}</span>`;
                            }).join(', ')}
                          </div>
                        ` : ''}

                        <!-- Cost Row -->
                        <div style="display: flex; gap: 8px; font-size: 11px; margin-top: 2px;">
                          ${costBadges.join(' ')}
                        </div>

                        <!-- Action Button / State -->
                        <div style="margin-top: 4px;">
                          ${isResearched ? `
                            <div style="padding: 5px; background: rgba(22, 101, 52, 0.15); border: 1.5px solid #166534; color: #166534; font-weight: 800; font-size: 11px; text-align: center; border-radius: 4px;">
                              ✅ Researched (Active)
                            </div>
                          ` : isCurrentlyQueued ? `
                            <div style="padding: 5px; background: rgba(3, 105, 161, 0.15); border: 1.5px solid #0284c7; color: #0284c7; font-weight: 800; font-size: 11px; text-align: center; border-radius: 4px;">
                              ⏳ Researching... (${queueProgress}%)
                            </div>
                          ` : isAgeLocked ? `
                            <div style="padding: 4px; background: rgba(153, 27, 27, 0.1); border: 1px solid #991b1b; color: #991b1b; font-weight: 700; font-size: 10px; text-align: center; border-radius: 4px;">
                              🔒 Requires ${t.requiredAge}
                            </div>
                          ` : isPrereqLocked ? `
                            <div style="padding: 4px; background: rgba(217, 119, 6, 0.1); border: 1px solid #d97706; color: #b45309; font-weight: 700; font-size: 10px; text-align: center; border-radius: 4px;">
                              🔒 Missing Prerequisite
                            </div>
                          ` : !canAfford ? `
                            <div style="padding: 4px; background: rgba(153, 27, 27, 0.1); border: 1px solid #991b1b; color: #991b1b; font-weight: 700; font-size: 10px; text-align: center; border-radius: 4px;">
                              ⚠️ Need: ${missingRes.join(', ')}
                            </div>
                          ` : `
                            <button class="aoe-btn-crimson tech-modal-research-btn" data-techid="${t.id}" style="width: 100%; padding: 6px; font-size: 11px; font-weight: 800; cursor: pointer; background: linear-gradient(180deg, #15803d 0%, #166534 100%); border-color: #14532d; color: #fff;">
                              🔬 Research Technology
                            </button>
                          `}
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    const closeBtn = this.techModalElem.querySelector('#btn-close-tech-modal');
    closeBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.toggleTechTreeModal();
      soundManager.playClick();
    });

    this.techModalElem.querySelectorAll<HTMLButtonElement>('.aoe3-tech-tab-btn[data-cat]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.activeTechCategory = btn.dataset.cat || 'all';
        soundManager.playClick();
        this.updateTechModalDynamicState(player);
      });
    });

    this.techModalElem.querySelectorAll<HTMLButtonElement>('.tech-modal-research-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const techId = btn.dataset.techid!;
        const tech = TECHNOLOGIES[techId];
        if (!tech) return;

        if (!activeHall) {
          soundManager.playError();
          this.showNotification('⚠️ Construct a Research Academy first to research technologies!');
          return;
        }

        this.callbacks.onResearchTech(activeHall.id, tech.id);
        soundManager.playClick();
        this.showNotification(`🔬 Research started: ${tech.name}`);
        this.updateTechModalDynamicState(player);
      });
    });
  }

  private setupGlobalKeyboardShortcuts(): void {
    window.addEventListener('keydown', (e) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      if (e.key === 'Escape') {
        if (this.techModalElem) {
          e.preventDefault();
          e.stopPropagation();
          this.toggleTechTreeModal();
          soundManager.playClick();
          return;
        }
        if (this.ageModalElem) {
          this.toggleAgeModal();
          return;
        }
        if (this.coopModalElem) {
          this.toggleCoopModal();
          return;
        }
      }

      // Check if button with matching hotkey exists in actionMatrixElem
      const key = e.key.toUpperCase();
      const targetBtn = this.actionMatrixElem.querySelector<HTMLButtonElement>(`.aoe3-action-btn[data-hotkey="${key}"]`);
      if (targetBtn && !e.ctrlKey && !e.altKey && !e.metaKey) {
        targetBtn.dispatchEvent(new MouseEvent('click', { shiftKey: e.shiftKey, bubbles: true }));
        return;
      }

      // 'T' opens Tech Tree modal when no action button uses T
      if (key === 'T' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        this.toggleTechTreeModal();
      }
    });
  }
}
