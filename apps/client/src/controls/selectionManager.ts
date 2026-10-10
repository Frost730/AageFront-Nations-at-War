import { UnitData, BuildingData } from '@agefront/shared';
import { soundManager } from '../audio/soundManager.js';

export class SelectionManager {
  public selectedIds: Set<string> = new Set();
  public selectedType: 'none' | 'unit' | 'building' = 'none';
  private controlGroups: Map<number, string[]> = new Map();

  public clear(): void {
    this.selectedIds.clear();
    this.selectedType = 'none';
  }

  public selectSingle(id: string, type: 'unit' | 'building'): void {
    this.selectedIds.clear();
    this.selectedIds.add(id);
    this.selectedType = type;
    soundManager.playSelect();
  }

  public selectMultiple(unitIds: string[]): void {
    this.selectedIds.clear();
    unitIds.forEach(id => this.selectedIds.add(id));
    this.selectedType = unitIds.length > 0 ? 'unit' : 'none';
    if (unitIds.length > 0) {
      soundManager.playSelect();
    }
  }

  public toggle(id: string, type: 'unit' | 'building'): void {
    if (this.selectedType !== type) {
      this.clear();
      this.selectedType = type;
    }

    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
      if (this.selectedIds.size === 0) this.selectedType = 'none';
    } else {
      this.selectedIds.add(id);
      soundManager.playSelect();
    }
  }

  public assignControlGroup(groupNum: number): void {
    if (this.selectedIds.size > 0 && this.selectedType === 'unit') {
      this.controlGroups.set(groupNum, Array.from(this.selectedIds));
      soundManager.playClick();
    }
  }

  public recallControlGroup(groupNum: number, currentUnits: UnitData[]): string[] {
    const ids = this.controlGroups.get(groupNum);
    if (!ids || ids.length === 0) return [];

    // Filter alive units
    const aliveIds = ids.filter(id => currentUnits.some(u => u.id === id && u.state !== 'dead'));
    if (aliveIds.length > 0) {
      this.selectMultiple(aliveIds);
    }
    return aliveIds;
  }
}
