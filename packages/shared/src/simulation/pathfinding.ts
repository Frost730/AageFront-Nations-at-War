import { Vector2D } from '../types/game.js';

interface PathNode {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: PathNode | null;
}

// High-performance Binary Min-Heap for A* Open List
class MinBinaryHeap {
  private heap: PathNode[] = [];

  public get size(): number {
    return this.heap.length;
  }

  public push(node: PathNode): void {
    this.heap.push(node);
    this.bubbleUp(this.heap.length - 1);
  }

  public clear(): void {
    this.heap.length = 0;
  }

  public pop(): PathNode | undefined {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0];
    const bottom = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = bottom;
      this.sinkDown(0);
    }
    return top;
  }

  private bubbleUp(index: number): void {
    const element = this.heap[index];
    while (index > 0) {
      const parentIdx = Math.floor((index - 1) / 2);
      const parent = this.heap[parentIdx];
      if (element.f >= parent.f) break;
      this.heap[index] = parent;
      this.heap[parentIdx] = element;
      index = parentIdx;
    }
  }

  private sinkDown(index: number): void {
    const length = this.heap.length;
    const element = this.heap[index];

    while (true) {
      let leftChildIdx = 2 * index + 1;
      let rightChildIdx = 2 * index + 2;
      let swapIdx: number | null = null;

      if (leftChildIdx < length) {
        if (this.heap[leftChildIdx].f < element.f) {
          swapIdx = leftChildIdx;
        }
      }

      if (rightChildIdx < length) {
        const compareTarget = swapIdx === null ? element : this.heap[swapIdx];
        if (this.heap[rightChildIdx].f < compareTarget.f) {
          swapIdx = rightChildIdx;
        }
      }

      if (swapIdx === null) break;
      this.heap[index] = this.heap[swapIdx];
      this.heap[swapIdx] = element;
      index = swapIdx;
    }
  }
}

export class GridPathfinder {
  public readonly width: number;
  public readonly height: number;
  private walkableGrid: boolean[];
  private searchId: number = 0;
  private closedSet: Uint32Array;
  private gScores: Float32Array;
  private gScoreSearchId: Uint32Array;
  private openHeap: MinBinaryHeap = new MinBinaryHeap();

  constructor(width: number, height: number, initialWalkable?: boolean[]) {
    this.width = width;
    this.height = height;
    if (initialWalkable && initialWalkable.length === width * height) {
      this.walkableGrid = [...initialWalkable];
    } else {
      this.walkableGrid = new Array(width * height).fill(true);
    }
    const totalCells = width * height;
    this.closedSet = new Uint32Array(totalCells);
    this.gScores = new Float32Array(totalCells);
    this.gScoreSearchId = new Uint32Array(totalCells);
  }

  public setWalkable(x: number, y: number, walkable: boolean): void {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      this.walkableGrid[y * this.width + x] = walkable;
    }
  }

  public isWalkable(x: number, y: number): boolean {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
    return this.walkableGrid[y * this.width + x];
  }

  public findNearestWalkable(targetX: number, targetY: number, maxRadius: number = 8): Vector2D | null {
    const tx = Math.floor(targetX);
    const ty = Math.floor(targetY);
    if (this.isWalkable(tx, ty)) return { x: tx, y: ty };

    for (let r = 1; r <= maxRadius; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          if (Math.abs(dx) === r || Math.abs(dy) === r) {
            const nx = tx + dx;
            const ny = ty + dy;
            if (this.isWalkable(nx, ny)) {
              return { x: nx, y: ny };
            }
          }
        }
      }
    }
    return null;
  }

  /**
   * Fast line-of-sight raycast between two world points with obstacle & corner clearance.
   */
  public hasLineOfSight(x0: number, y0: number, x1: number, y1: number, clearance: number = 0.35): boolean {
    const dist = Math.hypot(x1 - x0, y1 - y0);
    if (dist < 0.2) return true;

    const steps = Math.ceil(dist * 3);
    const dx = (x1 - x0) / steps;
    const dy = (y1 - y0) / steps;

    for (let i = 1; i < steps; i++) {
      const cx = x0 + dx * i;
      const cy = y0 + dy * i;

      // Sample core point
      if (!this.isWalkable(Math.floor(cx), Math.floor(cy))) return false;

      // Sample clearance corners so wide vehicles (catapults/chassis) do not clip wall edges
      if (!this.isWalkable(Math.floor(cx + clearance), Math.floor(cy))) return false;
      if (!this.isWalkable(Math.floor(cx - clearance), Math.floor(cy))) return false;
      if (!this.isWalkable(Math.floor(cx), Math.floor(cy + clearance))) return false;
      if (!this.isWalkable(Math.floor(cx), Math.floor(cy - clearance))) return false;
    }
    return true;
  }

  /**
   * Smooth raw grid path into direct line-of-sight waypoints (string-pulling).
   */
  public smoothPath(rawPath: Vector2D[]): Vector2D[] {
    if (rawPath.length <= 2) return rawPath;

    const smoothed: Vector2D[] = [rawPath[0]];
    let currentIdx = 0;

    while (currentIdx < rawPath.length - 1) {
      let farthestIdx = currentIdx + 1;
      // Look ahead up to 12 waypoints for direct unobstructed straight lines
      const maxLookahead = Math.min(rawPath.length - 1, currentIdx + 12);

      for (let testIdx = maxLookahead; testIdx > currentIdx + 1; testIdx--) {
        if (this.hasLineOfSight(
          rawPath[currentIdx].x, rawPath[currentIdx].y,
          rawPath[testIdx].x, rawPath[testIdx].y
        )) {
          farthestIdx = testIdx;
          break;
        }
      }

      smoothed.push(rawPath[farthestIdx]);
      currentIdx = farthestIdx;
    }

    return smoothed;
  }

  /**
   * Finds the best walkable standoff firing tile for ranged units and siege artillery.
   */
  public findOptimalRangedAttackTile(
    targetX: number,
    targetY: number,
    targetWidth: number,
    targetHeight: number,
    fromX: number,
    fromY: number,
    minRange: number,
    maxRange: number
  ): Vector2D | null {
    const centerTargetX = targetX + targetWidth / 2;
    const centerTargetY = targetY + targetHeight / 2;

    const angleToTarget = Math.atan2(centerTargetY - fromY, centerTargetX - fromX);
    const approachAngle = angleToTarget + Math.PI; // direction from building towards unit

    const idealRange = Math.max(minRange, Math.min(maxRange - 1.0, (minRange + maxRange) * 0.5));

    // Try primary approach cone (+- 60 degrees in 15 deg steps)
    const angleOffsets = [0, 0.25, -0.25, 0.5, -0.5, 0.75, -0.75, 1.0, -1.0, 1.25, -1.25, 1.5, -1.5];
    const rangeOffsets = [idealRange, idealRange - 1.5, idealRange + 1.0, idealRange - 2.5, idealRange + 2.0];

    let bestTile: Vector2D | null = null;
    let bestDist = Infinity;

    for (const r of rangeOffsets) {
      if (r < 1.5 || r > maxRange) continue;
      for (const offset of angleOffsets) {
        const testAngle = approachAngle + offset;
        const tx = Math.floor(centerTargetX + Math.cos(testAngle) * r);
        const ty = Math.floor(centerTargetY + Math.sin(testAngle) * r);

        if (this.isWalkable(tx, ty)) {
          const clampedX = Math.max(targetX, Math.min(targetX + targetWidth, tx + 0.5));
          const clampedY = Math.max(targetY, Math.min(targetY + targetHeight, ty + 0.5));
          const distToEdge = Math.hypot((tx + 0.5) - clampedX, (ty + 0.5) - clampedY);

          if (distToEdge <= maxRange && distToEdge >= minRange * 0.5) {
            const distFromUnit = Math.hypot(tx + 0.5 - fromX, ty + 0.5 - fromY);
            if (distFromUnit < bestDist) {
              bestDist = distFromUnit;
              bestTile = { x: tx + 0.5, y: ty + 0.5 };
            }
          }
        }
      }
      if (bestTile) return bestTile;
    }

    return null;
  }

  /**
   * Optimized A* pathfinding using Binary Min-Heap and typed lookup tables.
   */
  public findPath(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    maxSteps: number = 12000
  ): Vector2D[] {
    let sx = Math.floor(startX);
    let sy = Math.floor(startY);
    let ex = Math.floor(endX);
    let ey = Math.floor(endY);

    // 1. Recover if starting tile is blocked (e.g. spawned near wall or building)
    if (!this.isWalkable(sx, sy)) {
      const nearestStart = this.findNearestWalkable(sx, sy, 8);
      if (nearestStart) {
        sx = nearestStart.x;
        sy = nearestStart.y;
      } else {
        return [];
      }
    }

    // 2. Recover if destination tile is blocked (e.g. clicked on a building or wall)
    if (!this.isWalkable(ex, ey)) {
      const nearestEnd = this.findNearestWalkable(ex, ey, 8);
      if (!nearestEnd) return [];
      ex = nearestEnd.x;
      ey = nearestEnd.y;
    }

    if (sx === ex && sy === ey) return [];

    this.searchId++;
    if (this.searchId >= 0xFFFFFFFE) {
      this.closedSet.fill(0);
      this.gScoreSearchId.fill(0);
      this.searchId = 1;
    }
    const currentSearchId = this.searchId;
    this.openHeap.clear();

    const startH = Math.hypot(ex - sx, ey - sy);
    const startNode: PathNode = {
      x: sx,
      y: sy,
      g: 0,
      h: startH,
      f: startH,
      parent: null
    };

    const startIndex = sy * this.width + sx;
    this.gScores[startIndex] = 0;
    this.gScoreSearchId[startIndex] = currentSearchId;
    this.openHeap.push(startNode);

    const directions = [
      { dx: 1, dy: 0, cost: 1.0 },
      { dx: -1, dy: 0, cost: 1.0 },
      { dx: 0, dy: 1, cost: 1.0 },
      { dx: 0, dy: -1, cost: 1.0 },
      { dx: 1, dy: 1, cost: 1.414 },
      { dx: 1, dy: -1, cost: 1.414 },
      { dx: -1, dy: 1, cost: 1.414 },
      { dx: -1, dy: -1, cost: 1.414 }
    ];

    let steps = 0;
    let closestNode: PathNode = startNode;

    while (this.openHeap.size > 0 && steps++ < maxSteps) {
      const current = this.openHeap.pop()!;
      const currentIndex = current.y * this.width + current.x;

      if (this.closedSet[currentIndex] === currentSearchId) continue;
      this.closedSet[currentIndex] = currentSearchId;

      if (current.h < closestNode.h) {
        closestNode = current;
      }

      // Check reached target
      if (current.x === ex && current.y === ey) {
        const rawPath = this.reconstructPath(current);
        return this.smoothPath(rawPath);
      }

      for (const dir of directions) {
        const nx = current.x + dir.dx;
        const ny = current.y + dir.dy;
        const nIndex = ny * this.width + nx;

        if (nx < 0 || nx >= this.width || ny < 0 || ny >= this.height) continue;
        if (this.closedSet[nIndex] === currentSearchId) continue;
        if (!this.walkableGrid[nIndex]) continue;

        // Diagonal corner safety check (prevent cutting through narrow diagonal wall gaps)
        if (dir.dx !== 0 && dir.dy !== 0) {
          if (!this.isWalkable(current.x + dir.dx, current.y) || !this.isWalkable(current.x, current.y + dir.dy)) {
            continue;
          }
        }

        const tentG = current.g + dir.cost;
        const currentG = (this.gScoreSearchId[nIndex] === currentSearchId) ? this.gScores[nIndex] : Infinity;
        if (tentG < currentG) {
          this.gScores[nIndex] = tentG;
          this.gScoreSearchId[nIndex] = currentSearchId;
          const h = Math.hypot(ex - nx, ey - ny);
          const f = tentG + h;
          this.openHeap.push({ x: nx, y: ny, g: tentG, h, f, parent: current });
        }
      }
    }

    // If max steps reached before exact destination, path to the closest explored node
    if (closestNode !== startNode) {
      const partialPath = this.reconstructPath(closestNode);
      return this.smoothPath(partialPath);
    }

    return [];
  }

  private reconstructPath(endNode: PathNode): Vector2D[] {
    const path: Vector2D[] = [];
    let curr: PathNode | null = endNode;
    while (curr && curr.parent) {
      path.push({ x: curr.x + 0.5, y: curr.y + 0.5 });
      curr = curr.parent;
    }
    path.reverse();
    return path;
  }
}
