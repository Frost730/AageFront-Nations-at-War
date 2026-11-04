import * as THREE from 'three';
import { MapType } from '@agefront/shared';

// Cache generated textures to avoid redundant canvas rendering
const textureCache = new Map<string, THREE.CanvasTexture>();

/**
 * Creates a seamless procedural grass and soil detail texture for terrain.
 * Features individual grass blade strokes, organic dirt patches, and natural micro-variation.
 */
export function getTerrainGrassTexture(biome: MapType = 'green_frontier'): THREE.CanvasTexture {
  const key = 'terrain_grass_' + biome;
  if (textureCache.has(key)) return textureCache.get(key)!;

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // 1. Biome-specific earthy base underlayer
  let baseColor = '#3a5f22'; // default temperate
  let loamColors = ['rgba(43, 68, 25, 0.15)', 'rgba(74, 52, 28, 0.12)'];
  let grassColors = ['#4a7c2a', '#589432', '#365a1e', '#629e38', '#406c24', '#72ab3e', '#88ba4c', '#2c4a17'];
  let floraPalette = ['#ffffff', '#fef08a', '#93c5fd']; // Daisy, buttercup, bluebell

  if (biome === 'highland_kingdom') {
    baseColor = '#2b3b28';
    loamColors = ['rgba(30, 41, 32, 0.22)', 'rgba(63, 74, 66, 0.18)'];
    grassColors = ['#3d5236', '#4d6645', '#2b3d26', '#597350', '#34472f', '#64805c'];
    floraPalette = ['#9333ea', '#a855f7', '#7e22ce', '#c084fc', '#d8b4fe']; // Highland Heather
  } else if (biome === 'riverlands') {
    baseColor = '#273c1c';
    loamColors = ['rgba(28, 43, 20, 0.25)', 'rgba(63, 51, 34, 0.2)'];
    grassColors = ['#3f6927', '#4f7e32', '#5e943c', '#2f521c', '#6fa644', '#385c22'];
    floraPalette = ['#fbbf24', '#f59e0b', '#ffffff', '#e0e7ff']; // Marsh marigolds & rushes
  } else if (biome === 'desert_oasis') {
    baseColor = '#947e4d';
    loamColors = ['rgba(184, 157, 97, 0.28)', 'rgba(124, 99, 58, 0.22)'];
    grassColors = ['#a39158', '#b5a467', '#877644', '#c4b373', '#9c8850', '#baa86e'];
    floraPalette = ['#ef4444', '#f97316', '#fef08a', '#d4c29a']; // Desert succulents & sands
  } else if (biome === 'black_forest') {
    baseColor = '#182614';
    loamColors = ['rgba(20, 31, 16, 0.35)', 'rgba(36, 27, 18, 0.28)'];
    grassColors = ['#233d1c', '#2d4d24', '#192e14', '#385c2c', '#142610', '#416634'];
    floraPalette = ['#ef4444', '#f3f4f6', '#86efac', '#4ade80']; // Toadstools & deep moss
  }

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, size, size);

  // 2. Organic soil & loam noise clusters
  for (let i = 0; i < 600; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = Math.random() * 18 + 4;
    ctx.fillStyle = loamColors[Math.floor(Math.random() * loamColors.length)];
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    if (x - r < 0) { ctx.beginPath(); ctx.arc(x + size, y, r, 0, Math.PI * 2); ctx.fill(); }
    if (x + r > size) { ctx.beginPath(); ctx.arc(x - size, y, r, 0, Math.PI * 2); ctx.fill(); }
    if (y - r < 0) { ctx.beginPath(); ctx.arc(x, y + size, r, 0, Math.PI * 2); ctx.fill(); }
    if (y + r > size) { ctx.beginPath(); ctx.arc(x, y - size, r, 0, Math.PI * 2); ctx.fill(); }
  }

  // 3. Dense individual grass blades
  ctx.lineWidth = 1.2;
  ctx.lineCap = 'round';
  const bladeCount = biome === 'desert_oasis' ? 9000 : 18000;

  for (let i = 0; i < bladeCount; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const len = Math.random() * 6 + 3;
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.85;
    const dx = Math.cos(angle) * len;
    const dy = Math.sin(angle) * len;

    ctx.strokeStyle = grassColors[Math.floor(Math.random() * grassColors.length)];
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + dx, y + dy);
    ctx.stroke();

    if (x + dx < 0) { ctx.beginPath(); ctx.moveTo(x + size, y); ctx.lineTo(x + size + dx, y + dy); ctx.stroke(); }
    if (x + dx > size) { ctx.beginPath(); ctx.moveTo(x - size, y); ctx.lineTo(x - size + dx, y + dy); ctx.stroke(); }
    if (y + dy < 0) { ctx.beginPath(); ctx.moveTo(x, y + size); ctx.lineTo(x + dx, y + size + dy); ctx.stroke(); }
    if (y + dy > size) { ctx.beginPath(); ctx.moveTo(x, y - size); ctx.lineTo(x + dx, y - size + dy); ctx.stroke(); }
  }

  // 4. Micro flora & detail scatter
  for (let i = 0; i < 350; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    ctx.fillStyle = floraPalette[Math.floor(Math.random() * floraPalette.length)];
    ctx.beginPath();
    ctx.arc(x, y, Math.random() * 1.5 + 0.8, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(36, 36);
  textureCache.set(key, texture);
  return texture;
}

/**
 * Creates a high-fidelity bump/height map for the terrain ground.
 */
export function getTerrainBumpTexture(): THREE.CanvasTexture {
  const key = 'terrain_bump';
  if (textureCache.has(key)) return textureCache.get(key)!;

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);

  // High frequency noise for grass relief
  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const n = (Math.random() - 0.5) * 55;
    const val = Math.min(255, Math.max(0, 128 + n));
    data[i] = val;
    data[i + 1] = val;
    data[i + 2] = val;
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(36, 36);
  textureCache.set(key, texture);
  return texture;
}

/**
 * Creates authentic Age of Empires Ashlar Stone Masonry texture.
 * Features staggered rectangular stone blocks, dark recessed mortar lines, and chiseled highlights.
 */
export function getStoneBrickTexture(): THREE.CanvasTexture {
  const key = 'stone_brick';
  if (textureCache.has(key)) return textureCache.get(key)!;

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Dark mortar background
  ctx.fillStyle = '#26292e';
  ctx.fillRect(0, 0, size, size);

  const rows = 16;
  const rowHeight = size / rows;
  const cols = 8;
  const colWidth = size / cols;
  const mortar = 3;

  for (let r = 0; r < rows; r++) {
    const y = r * rowHeight;
    const xOffset = (r % 2 === 0) ? 0 : colWidth / 2;

    for (let c = -1; c <= cols + 1; c++) {
      const x = c * colWidth + xOffset;

      // Realistic stone color variation (granite, fieldstone, sandstone tints)
      const stoneTones = [
        '#8f9ca8', '#7b8793', '#9ca8b4', '#6c7782', '#a6b1bd', '#84909c', '#757c85'
      ];
      ctx.fillStyle = stoneTones[(r * 5 + c * 3 + 17) % stoneTones.length];
      ctx.fillRect(x + mortar / 2, y + mortar / 2, colWidth - mortar, rowHeight - mortar);

      // Chiseled bevel highlights on top and left of brick
      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.fillRect(x + mortar / 2, y + mortar / 2, colWidth - mortar, 2);
      ctx.fillRect(x + mortar / 2, y + mortar / 2, 2, rowHeight - mortar);

      // Deep shadow on bottom and right of brick
      ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
      ctx.fillRect(x + mortar / 2, y + rowHeight - mortar / 2 - 2, colWidth - mortar, 2);
      ctx.fillRect(x + colWidth - mortar / 2 - 2, y + mortar / 2, 2, rowHeight - mortar);

      // Surface texture micro-speckles
      for (let s = 0; s < 12; s++) {
        const sx = x + mortar + Math.random() * (colWidth - mortar * 2);
        const sy = y + mortar + Math.random() * (rowHeight - mortar * 2);
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.12)';
        ctx.fillRect(sx, sy, 2, 1);
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  textureCache.set(key, texture);
  return texture;
}

/**
 * Normal / Bump Map for Stone Masonry
 */
export function getStoneBrickBumpTexture(): THREE.CanvasTexture {
  const key = 'stone_brick_bump';
  if (textureCache.has(key)) return textureCache.get(key)!;

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Deep recessed mortar
  ctx.fillStyle = '#101010';
  ctx.fillRect(0, 0, size, size);

  const rows = 16;
  const rowHeight = size / rows;
  const cols = 8;
  const colWidth = size / cols;
  const mortar = 3;

  for (let r = 0; r < rows; r++) {
    const y = r * rowHeight;
    const xOffset = (r % 2 === 0) ? 0 : colWidth / 2;

    for (let c = -1; c <= cols + 1; c++) {
      const x = c * colWidth + xOffset;

      // Elevated brick face
      ctx.fillStyle = '#d0d0d0';
      ctx.fillRect(x + mortar / 2, y + mortar / 2, colWidth - mortar, rowHeight - mortar);

      // Bevel gradient on edges
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + mortar / 2, y + mortar / 2, colWidth - mortar, 2);
      ctx.fillRect(x + mortar / 2, y + mortar / 2, 2, rowHeight - mortar);

      ctx.fillStyle = '#404040';
      ctx.fillRect(x + mortar / 2, y + rowHeight - mortar / 2 - 2, colWidth - mortar, 2);
      ctx.fillRect(x + colWidth - mortar / 2 - 2, y + mortar / 2, 2, rowHeight - mortar);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  textureCache.set(key, texture);
  return texture;
}

/**
 * Mediterranean & Medieval Curved Terracotta Roof Tile Texture.
 */
export function getTerracottaRoofTexture(): THREE.CanvasTexture {
  const key = 'terracotta_roof';
  if (textureCache.has(key)) return textureCache.get(key)!;

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#450a0a';
  ctx.fillRect(0, 0, size, size);

  const rows = 20;
  const rowHeight = size / rows;
  const cols = 14;
  const colWidth = size / cols;

  for (let r = 0; r < rows; r++) {
    const y = r * rowHeight;
    const xOffset = (r % 2 === 0) ? 0 : colWidth / 2;

    for (let c = -1; c <= cols + 1; c++) {
      const x = c * colWidth + xOffset;

      // Terracotta gradient per curved tile
      const grad = ctx.createLinearGradient(x, y, x + colWidth, y);
      grad.addColorStop(0, '#7f1d1d');
      grad.addColorStop(0.35, '#b91c1c');
      grad.addColorStop(0.7, '#c2410c');
      grad.addColorStop(1, '#601111');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x + 1, y + 1, colWidth - 2, rowHeight - 2, [0, 0, 4, 4]);
      ctx.fill();

      // Lower tile lip shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(x + 1, y + rowHeight - 3, colWidth - 2, 2);

      // Top ridge highlight
      ctx.fillStyle = 'rgba(254, 202, 202, 0.25)';
      ctx.fillRect(x + 2, y + 2, colWidth - 4, 1.5);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  textureCache.set(key, texture);
  return texture;
}

/**
 * Hewn Wood Planks & Structural Timber Texture.
 */
export function getWoodPlankTexture(): THREE.CanvasTexture {
  const key = 'wood_plank';
  if (textureCache.has(key)) return textureCache.get(key)!;

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#291407';
  ctx.fillRect(0, 0, size, size);

  const planks = 8;
  const plankH = size / planks;

  for (let p = 0; p < planks; p++) {
    const y = p * plankH;
    const woodTones = ['#5c2e0b', '#6f390e', '#522809', '#63320c', '#4a2307'];
    ctx.fillStyle = woodTones[p % woodTones.length];
    ctx.fillRect(0, y + 2, size, plankH - 4);

    // Longitudinal grain lines
    for (let g = 0; g < 14; g++) {
      const gy = y + 2 + Math.random() * (plankH - 6);
      ctx.strokeStyle = Math.random() > 0.5 ? 'rgba(0, 0, 0, 0.25)' : 'rgba(217, 119, 6, 0.15)';
      ctx.lineWidth = Math.random() * 1.5 + 0.5;
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.bezierCurveTo(
        size * 0.3, gy + (Math.random() - 0.5) * 3,
        size * 0.7, gy + (Math.random() - 0.5) * 3,
        size, gy
      );
      ctx.stroke();
    }

    // Iron bolt rivets on beam ends
    [24, size - 24].forEach(bx => {
      ctx.fillStyle = '#1c1917';
      ctx.beginPath();
      ctx.arc(bx, y + plankH / 2, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      ctx.arc(bx - 1, y + plankH / 2 - 1, 1, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  textureCache.set(key, texture);
  return texture;
}

/**
 * Weathered Cobblestone Plinth Texture (for foundations & roads).
 */
export function getCobblestoneTexture(): THREE.CanvasTexture {
  const key = 'cobblestone';
  if (textureCache.has(key)) return textureCache.get(key)!;

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Dark dirt packing
  ctx.fillStyle = '#29211a';
  ctx.fillRect(0, 0, size, size);

  const stoneCols = 16;
  const stoneRows = 16;
  const cw = size / stoneCols;
  const ch = size / stoneRows;

  for (let r = 0; r < stoneRows; r++) {
    const y = r * ch;
    const xShift = (r % 2 === 0) ? 0 : cw / 2;

    for (let c = -1; c <= stoneCols; c++) {
      const x = c * cw + xShift;
      const stones = ['#64748b', '#475569', '#78716c', '#57534e', '#94a3b8', '#52525b'];
      ctx.fillStyle = stones[(r * 7 + c * 3 + 11) % stones.length];

      ctx.beginPath();
      ctx.ellipse(x + cw / 2, y + ch / 2, cw * 0.42, ch * 0.38, (r + c) * 0.1, 0, Math.PI * 2);
      ctx.fill();

      // Top light reflection
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.ellipse(x + cw / 2 - 1, y + ch / 2 - 2, cw * 0.25, ch * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  textureCache.set(key, texture);
  return texture;
}

/**
 * Animated dynamic water ripple normal/bump map.
 */
export function getWaterRippleTexture(): THREE.CanvasTexture {
  const key = 'water_ripple';
  if (textureCache.has(key)) return textureCache.get(key)!;

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#1e5f8a';
  ctx.fillRect(0, 0, size, size);

  // Concentric caustic rings & interference wave patterns
  for (let i = 0; i < 45; i++) {
    const cx = Math.random() * size;
    const cy = Math.random() * size;
    const maxR = Math.random() * 40 + 20;

    for (let r = 8; r < maxR; r += 6) {
      ctx.strokeStyle = `rgba(180, 230, 255, ${0.12 * (1 - r / maxR)})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      // Seamless tile wraps
      if (cx - r < 0) { ctx.beginPath(); ctx.arc(cx + size, cy, r, 0, Math.PI * 2); ctx.stroke(); }
      if (cx + r > size) { ctx.beginPath(); ctx.arc(cx - size, cy, r, 0, Math.PI * 2); ctx.stroke(); }
      if (cy - r < 0) { ctx.beginPath(); ctx.arc(cx, cy + size, r, 0, Math.PI * 2); ctx.stroke(); }
      if (cy + r > size) { ctx.beginPath(); ctx.arc(cx, cy - size, r, 0, Math.PI * 2); ctx.stroke(); }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(16, 16);
  textureCache.set(key, texture);
  return texture;
}


/**
 * Creates a seamless procedural billowing cloud shadow texture.
 * When scrolled with MultiplyBlending over terrain, it casts natural drifting cloud shadows.
 */
export function getCloudShadowTexture(): THREE.CanvasTexture {
  const key = 'cloud_shadow_tex';
  if (textureCache.has(key)) return textureCache.get(key)!;

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 48; i++) {
    const cx = Math.random() * size;
    const cy = Math.random() * size;
    const r = Math.random() * 95 + 45;
    const grad = ctx.createRadialGradient(cx, cy, r * 0.05, cx, cy, r);
    grad.addColorStop(0, 'rgba(85, 95, 110, 0.42)');
    grad.addColorStop(0.55, 'rgba(130, 140, 155, 0.22)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    const offsets = [
      { x: size, y: 0 }, { x: -size, y: 0 },
      { x: 0, y: size }, { x: 0, y: -size }
    ];
    offsets.forEach(off => {
      ctx.beginPath();
      ctx.arc(cx + off.x, cy + off.y, r, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3.2, 3.2);
  textureCache.set(key, texture);
  return texture;
}

/**
 * Creates dynamic shoreline water foam with lacy sea foam rings and frothy crests.
 * When applied to shoreline ribbon quads, it creates animated lapping foam where water meets land.
 */
export function getShorelineFoamTexture(): THREE.CanvasTexture {
  const key = 'shoreline_foam_tex';
  if (textureCache.has(key)) return textureCache.get(key)!;

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Transparent base
  ctx.clearRect(0, 0, size, size);

  // Gradient froth density from water (V=0) to shoreline crest (V=1)
  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.0)');
  grad.addColorStop(0.35, 'rgba(230, 248, 255, 0.25)');
  grad.addColorStop(0.75, 'rgba(245, 252, 255, 0.82)');
  grad.addColorStop(1.0, 'rgba(255, 255, 255, 0.95)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Lacy foam bubble cells and voronoi-like frothy web
  ctx.lineWidth = 1.8;
  for (let i = 0; i < 400; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = Math.random() * 12 + 3;
    const alpha = (y / size) * (Math.random() * 0.6 + 0.3);

    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();

    // Subtle bright bubble core
    if (Math.random() > 0.4) {
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.75})`;
      ctx.beginPath();
      ctx.arc(x, y, r * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }

    // Wrap horizontally for seamless scrolling
    if (x - r < 0) {
      ctx.beginPath(); ctx.arc(x + size, y, r, 0, Math.PI * 2); ctx.stroke();
    }
    if (x + r > size) {
      ctx.beginPath(); ctx.arc(x - size, y, r, 0, Math.PI * 2); ctx.stroke();
    }
  }

  // Wavy surf crest lines
  for (let c = 0; c < 5; c++) {
    const yBase = size * (0.6 + c * 0.08);
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.45 + c * 0.1})`;
    ctx.lineWidth = 2.2 + c * 0.4;
    ctx.beginPath();
    for (let x = 0; x <= size; x += 10) {
      const yWave = yBase + Math.sin(x * 0.04 + c * 1.5) * 6 + Math.cos(x * 0.08) * 3;
      if (x === 0) ctx.moveTo(x, yWave);
      else ctx.lineTo(x, yWave);
    }
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  textureCache.set(key, texture);
  return texture;
}

/**
 * Creates dynamic river caustics: undulating sunlight refractions dancing across riverbeds.
 */
export function getWaterCausticsTexture(): THREE.CanvasTexture {
  const key = 'water_caustics_tex';
  if (textureCache.has(key)) return textureCache.get(key)!;

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, size, size);

  // Intersecting undulating bright caustic light webs
  ctx.strokeStyle = 'rgba(165, 243, 252, 0.45)';
  ctx.lineWidth = 3.5;

  for (let i = 0; i < 35; i++) {
    const cx = Math.random() * size;
    const cy = Math.random() * size;
    const r = Math.random() * 45 + 20;

    ctx.beginPath();
    for (let a = 0; a <= Math.PI * 2; a += 0.25) {
      const rad = r + Math.sin(a * 5 + i) * (r * 0.25);
      const px = cx + Math.cos(a) * rad;
      const py = cy + Math.sin(a) * rad;
      if (a === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();

    // Wrap around for seamless tiling
    const offsets = [
      { x: size, y: 0 }, { x: -size, y: 0 },
      { x: 0, y: size }, { x: 0, y: -size }
    ];
    for (const off of offsets) {
      ctx.beginPath();
      for (let a = 0; a <= Math.PI * 2; a += 0.25) {
        const rad = r + Math.sin(a * 5 + i) * (r * 0.25);
        const px = cx + off.x + Math.cos(a) * rad;
        const py = cy + off.y + Math.sin(a) * rad;
        if (a === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }

  // Soft blur over caustics for fluid dispersion
  ctx.fillStyle = 'rgba(125, 211, 252, 0.15)';
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = Math.random() * 25 + 10;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 8);
  textureCache.set(key, texture);
  return texture;
}

/**
 * Creates high-detail procedural deciduous leaf canopy texture (Age of Empires II: DE style).
 * Features dense stippled leaf clusters, organic chlorophyll gradients, and dappled sun highlights.
 */
export function getFoliageTexture(): THREE.CanvasTexture {
  const key = 'foliage_leaves';
  if (textureCache.has(key)) return textureCache.get(key)!;

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Deep forest shadow base
  ctx.fillStyle = '#1c3813';
  ctx.fillRect(0, 0, size, size);

  // Dense leaf speckles in natural organic layers
  const leafColors = [
    '#254d19', '#2e5e1f', '#397026', '#45852e', '#539e37', '#62b542', '#1f4214', '#2d541c'
  ];

  for (let i = 0; i < 9000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const rx = Math.random() * 5 + 3;
    const ry = Math.random() * 3 + 2;
    const angle = Math.random() * Math.PI;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = leafColors[Math.floor(Math.random() * leafColors.length)];
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Sunlight dappling highlights
  for (let i = 0; i < 800; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    ctx.fillStyle = 'rgba(163, 230, 53, 0.28)';
    ctx.beginPath();
    ctx.arc(x, y, Math.random() * 3 + 1, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  textureCache.set(key, texture);
  return texture;
}

/**
 * Creates high-detail procedural pine needle branch texture.
 */
export function getPineNeedleTexture(): THREE.CanvasTexture {
  const key = 'pine_needles';
  if (textureCache.has(key)) return textureCache.get(key)!;

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0f260d';
  ctx.fillRect(0, 0, size, size);

  const needleColors = [
    '#163813', '#1e481a', '#275922', '#316b2b', '#1a3d16', '#3b7d34'
  ];

  ctx.lineWidth = 1.4;
  for (let i = 0; i < 12000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const len = Math.random() * 7 + 4;
    const angle = (Math.random() - 0.5) * 1.8 + Math.PI / 2; // downward sloping needles

    ctx.strokeStyle = needleColors[Math.floor(Math.random() * needleColors.length)];
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  textureCache.set(key, texture);
  return texture;
}


/**
 * Creates high-detail procedural granite mountain cliff & crag texture.
 * Features stratified rock layers, vertical tectonic fissures, mineral veins, and alpine lichen.
 */
export function getMountainCliffTexture(biome: MapType = 'green_frontier'): THREE.CanvasTexture {
  const key = 'mountain_cliff_' + biome;
  if (textureCache.has(key)) return textureCache.get(key)!;

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  let baseFill = '#7a8594'; // default weathered alpine granite
  let strataColors = ['#8893a2', '#97a2b2', '#727d8c', '#a6b1c0', '#697482', '#b3becd', '#8f9baa'];
  let fissureColor = 'rgba(42, 48, 56, 0.65)';
  let ledgeColor = 'rgba(235, 242, 250, 0.45)';
  let accentColor = 'rgba(92, 116, 75, 0.55)'; // alpine moss/lichen

  if (biome === 'highland_kingdom') {
    baseFill = '#434c59'; // Dark volcanic basalt & slate
    strataColors = ['#4f5968', '#38414d', '#5a6677', '#313843', '#68768a', '#2c333d'];
    fissureColor = 'rgba(22, 26, 33, 0.82)';
    ledgeColor = 'rgba(240, 248, 255, 0.65)'; // Crisp frost ledge
    accentColor = 'rgba(163, 184, 205, 0.45)';
  } else if (biome === 'riverlands') {
    baseFill = '#7a4e38'; // Terracotta & red-clay mudstone
    strataColors = ['#8e5d45', '#6b3f2b', '#a26d52', '#593220', '#b57c60', '#744530'];
    fissureColor = 'rgba(46, 25, 15, 0.75)';
    ledgeColor = 'rgba(235, 196, 175, 0.45)';
    accentColor = 'rgba(74, 107, 62, 0.55)'; // River algae
  } else if (biome === 'desert_oasis') {
    baseFill = '#994a26'; // Vibrant canyon red sandstone (Monument Valley / Petra)
    strataColors = ['#b85e33', '#cc7241', '#e08552', '#7d3718', '#d67a48', '#f09867'];
    fissureColor = 'rgba(64, 22, 9, 0.8)';
    ledgeColor = 'rgba(254, 215, 170, 0.65)'; // Golden sunlit mineral shelf
    accentColor = 'rgba(194, 120, 60, 0.4)';
  } else if (biome === 'black_forest') {
    baseFill = '#2d3632'; // Brooding ancient monolith
    strataColors = ['#38433e', '#232b27', '#45524c', '#1b221f', '#4f5e57', '#313c37'];
    fissureColor = 'rgba(15, 20, 18, 0.85)';
    ledgeColor = 'rgba(167, 186, 177, 0.35)';
    accentColor = 'rgba(46, 92, 56, 0.75)'; // Thick ancient forest lichen
  }

  ctx.fillStyle = baseFill;
  ctx.fillRect(0, 0, size, size);

  // Horizontal sedimentary rock strata bands
  for (let y = 0; y < size; y += 8) {
    ctx.fillStyle = strataColors[Math.floor(Math.random() * strataColors.length)];
    ctx.fillRect(0, y, size, Math.random() * 14 + 6);
  }

  // Vertical tectonic cracks & geological fissures
  ctx.strokeStyle = fissureColor;
  ctx.lineWidth = 1.8;
  for (let i = 0; i < 35; i++) {
    let x = Math.random() * size;
    let y = 0;
    ctx.beginPath();
    ctx.moveTo(x, y);
    while (y < size) {
      y += Math.random() * 25 + 10;
      x += (Math.random() - 0.5) * 14;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Angular rock ledge highlights
  ctx.strokeStyle = ledgeColor;
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 50; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const len = Math.random() * 35 + 15;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + len, y + (Math.random() - 0.5) * 6);
    ctx.stroke();
  }

  // Lichen / moss / mineral flecks
  for (let i = 0; i < 700; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    ctx.fillStyle = accentColor;
    ctx.fillRect(x, y, Math.random() * 4 + 2, Math.random() * 3 + 1);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  textureCache.set(key, texture);
  return texture;
}

/**
 * Creates high-detail procedural feather palm frond texture for Date Palms (Desert Oasis).
 */
export function getPalmFrondTexture(): THREE.CanvasTexture {
  const key = 'foliage_palm_frond';
  if (textureCache.has(key)) return textureCache.get(key)!;

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#1e3814';
  ctx.fillRect(0, 0, size, size);

  // Central thick stem spine
  ctx.strokeStyle = '#6b7280';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(size / 2, size);
  ctx.quadraticCurveTo(size / 2 + 30, size / 2, size / 2, 20);
  ctx.stroke();

  // Radiating palm feather leaflets
  const frondColors = ['#2d5a1e', '#3b7428', '#4b9134', '#5dae41', '#6fca4f', '#244818'];
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';

  for (let y = size - 20; y > 30; y -= 5) {
    const spineX = size / 2 + Math.sin(y * 0.01) * 20;
    const frondLen = Math.min(180, (y / size) * 220);

    for (const dir of [-1, 1]) {
      ctx.strokeStyle = frondColors[Math.floor(Math.random() * frondColors.length)];
      ctx.beginPath();
      ctx.moveTo(spineX, y);
      const angle = (dir * 0.7) - (y / size) * 0.4;
      const ex = spineX + Math.cos(angle) * frondLen * dir;
      const ey = y - Math.sin(angle) * frondLen * 0.6;
      ctx.quadraticCurveTo(spineX + (ex - spineX) * 0.6, y - 25, ex, ey);
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  textureCache.set(key, texture);
  return texture;
}

/**
 * Creates high-detail procedural weeping willow leaf garland texture (Riverlands).
 */
export function getWillowFoliageTexture(): THREE.CanvasTexture {
  const key = 'foliage_willow';
  if (textureCache.has(key)) return textureCache.get(key)!;

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#1c3315';
  ctx.fillRect(0, 0, size, size);

  // Cascading pendulous vertical willow tendrils
  const willowColors = ['#385e26', '#497733', '#5a9040', '#6ba94d', '#2c4b1e', '#7fc35d'];
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';

  for (let i = 0; i < 400; i++) {
    let x = Math.random() * size;
    let y = Math.random() * 80;
    const len = Math.random() * 320 + 120;
    ctx.strokeStyle = willowColors[Math.floor(Math.random() * willowColors.length)];
    ctx.beginPath();
    ctx.moveTo(x, y);

    let cy = y;
    while (cy < y + len && cy < size) {
      cy += Math.random() * 20 + 10;
      x += (Math.random() - 0.5) * 8;
      ctx.lineTo(x, cy);
    }
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  textureCache.set(key, texture);
  return texture;
}

/**
 * Creates high-detail procedural flat umbrella acacia canopy texture (Desert Oasis).
 */
export function getAcaciaFoliageTexture(): THREE.CanvasTexture {
  const key = 'foliage_acacia';
  if (textureCache.has(key)) return textureCache.get(key)!;

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#263b19';
  ctx.fillRect(0, 0, size, size);

  // Feathery horizontal acacia leaflets
  const acaciaColors = ['#4a6e2e', '#5c873a', '#70a248', '#84be57', '#3a5723', '#96d465'];
  for (let i = 0; i < 6000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const rx = Math.random() * 8 + 4;
    const ry = Math.random() * 2.5 + 1;
    ctx.fillStyle = acaciaColors[Math.floor(Math.random() * acaciaColors.length)];
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, (Math.random() - 0.5) * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  textureCache.set(key, texture);
  return texture;
}
