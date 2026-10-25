import { UnitData } from '../types/game.js';

/**
 * Fast 2D Spatial Partitioning Grid for O(N) local spatial queries,
 * proximity tests, and unit separation on large maps with high unit counts.
 */
export class SpatialUnitGrid {
  public readonly cellSize: number;
  public readonly cols: number;
  public readonly rows: number;
  private readonly cells: UnitData[][];

  constructor(mapWidth: number, mapHeight: number, cellSize: number = 4) {
    this.cellSize = cellSize;
    this.cols = Math.ceil(mapWidth / cellSize) + 1;
    this.rows = Math.ceil(mapHeight / cellSize) + 1;
    const totalCells = this.cols * this.rows;
    this.cells = new Array(totalCells);
    for (let i = 0; i < totalCells; i++) {
      this.cells[i] = [];
    }
  }

  public clear(): void {
    for (let i = 0; i < this.cells.length; i++) {
      this.cells[i].length = 0;
    }
  }

  public insert(unit: UnitData): void {
    const cx = Math.floor(unit.x / this.cellSize);
    const cy = Math.floor(unit.y / this.cellSize);
    if (cx >= 0 && cx < this.cols && cy >= 0 && cy < this.rows) {
      this.cells[cy * this.cols + cx].push(unit);
    }
  }

  public build(units: Iterable<UnitData>): void {
    this.clear();
    for (const u of units) {
      if (u.state !== 'dead') {
        this.insert(u);
      }
    }
  }

  /**
   * Efficiently iterates over all candidate neighbor pairs within separation distance
   * in O(N) time without O(N^2) pairwise comparisons.
   */
  public forEachNearbyPair(callback: (u1: UnitData, u2: UnitData) => void): void {
    const cols = this.cols;
    const rows = this.rows;

    for (let cy = 0; cy < rows; cy++) {
      for (let cx = 0; cx < cols; cx++) {
        const cellIdx = cy * cols + cx;
        const cell = this.cells[cellIdx];
        const cellLen = cell.length;
        if (cellLen === 0) continue;

        // 1. Intra-cell pairs
        for (let i = 0; i < cellLen; i++) {
          const u1 = cell[i];
          for (let j = i + 1; j < cellLen; j++) {
            callback(u1, cell[j]);
          }
        }

        // 2. Inter-cell pairs with forward adjacent neighbor cells
        // (cx+1, cy), (cx-1, cy+1), (cx, cy+1), (cx+1, cy+1)
        const checkNeighbor = (ncx: number, ncy: number) => {
          if (ncx >= 0 && ncx < cols && ncy >= 0 && ncy < rows) {
            const ncell = this.cells[ncy * cols + ncx];
            const nlen = ncell.length;
            for (let i = 0; i < cellLen; i++) {
              const u1 = cell[i];
              for (let j = 0; j < nlen; j++) {
                callback(u1, ncell[j]);
              }
            }
          }
        };

        checkNeighbor(cx + 1, cy);
        checkNeighbor(cx - 1, cy + 1);
        checkNeighbor(cx, cy + 1);
        checkNeighbor(cx + 1, cy + 1);
      }
    }
  }

  /**
   * Fast radial query returning all live units within radius of (x, y).
   */
  public queryInRadius(x: number, y: number, radius: number): UnitData[] {
    const results: UnitData[] = [];
    const minCx = Math.max(0, Math.floor((x - radius) / this.cellSize));
    const maxCx = Math.min(this.cols - 1, Math.floor((x + radius) / this.cellSize));
    const minCy = Math.max(0, Math.floor((y - radius) / this.cellSize));
    const maxCy = Math.min(this.rows - 1, Math.floor((y + radius) / this.cellSize));
    const rSq = radius * radius;

    for (let cy = minCy; cy <= maxCy; cy++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        const cell = this.cells[cy * this.cols + cx];
        const len = cell.length;
        for (let i = 0; i < len; i++) {
          const u = cell[i];
          const dx = u.x - x;
          const dy = u.y - y;
          if (dx * dx + dy * dy <= rSq) {
            results.push(u);
          }
        }
      }
    }

    return results;
  }
}
