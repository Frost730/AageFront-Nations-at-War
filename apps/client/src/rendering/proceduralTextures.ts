import * as THREE from 'three';

// Cache generated textures to avoid redundant canvas rendering
const textureCache = new Map<string, THREE.CanvasTexture>();

/**
 * Creates a seamless procedural grass and soil detail texture for terrain.
 * Features individual grass blade strokes, organic dirt patches, and natural micro-variation.
 */
export function getTerrainGrassTexture(): THREE.CanvasTexture {
  const key = 'terrain_grass';
  if (textureCache.has(key)) return textureCache.get(key)!;

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // 1. Rich earthy base underlayer
  ctx.fillStyle = '#3a5f22';
  ctx.fillRect(0, 0, size, size);

  // 2. Organic soil & loam noise clusters
  for (let i = 0; i < 600; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = Math.random() * 18 + 4;
    const alpha = Math.random() * 0.18 + 0.05;
    ctx.fillStyle = Math.random() > 0.4 ? `rgba(43, 68, 25, ${alpha})` : `rgba(74, 52, 28, ${alpha * 0.8})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    // Wrap around for seamless tiling
    if (x - r < 0) { ctx.beginPath(); ctx.arc(x + size, y, r, 0, Math.PI * 2); ctx.fill(); }
    if (x + r > size) { ctx.beginPath(); ctx.arc(x - size, y, r, 0, Math.PI * 2); ctx.fill(); }
    if (y - r < 0) { ctx.beginPath(); ctx.arc(x, y + size, r, 0, Math.PI * 2); ctx.fill(); }
    if (y + r > size) { ctx.beginPath(); ctx.arc(x, y - size, r, 0, Math.PI * 2); ctx.fill(); }
  }

  // 3. Dense individual grass blades (Age of Empires II: Definitive Edition grass density)
  const grassColors = [
    '#4a7c2a', '#589432', '#365a1e', '#629e38', '#406c24', '#72ab3e', '#88ba4c', '#2c4a17'
  ];

  ctx.lineWidth = 1.2;
  ctx.lineCap = 'round';

  for (let i = 0; i < 18000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const len = Math.random() * 6 + 3;
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.85; // Mostly upright with natural wind lean
    const dx = Math.cos(angle) * len;
    const dy = Math.sin(angle) * len;

    ctx.strokeStyle = grassColors[Math.floor(Math.random() * grassColors.length)];
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + dx, y + dy);
    ctx.stroke();

    // Wrap-around strokes
    if (x + dx < 0) { ctx.beginPath(); ctx.moveTo(x + size, y); ctx.lineTo(x + size + dx, y + dy); ctx.stroke(); }
    if (x + dx > size) { ctx.beginPath(); ctx.moveTo(x - size, y); ctx.lineTo(x - size + dx, y + dy); ctx.stroke(); }
    if (y + dy < 0) { ctx.beginPath(); ctx.moveTo(x, y + size); ctx.lineTo(x + dx, y + size + dy); ctx.stroke(); }
    if (y + dy > size) { ctx.beginPath(); ctx.moveTo(x, y - size); ctx.lineTo(x + dx, y - size + dy); ctx.stroke(); }
  }

  // 4. Micro pebble and wildflower scatter
  for (let i = 0; i < 250; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const isFlower = Math.random() > 0.82;
    ctx.fillStyle = isFlower ? (Math.random() > 0.5 ? '#fef08a' : '#ffffff') : '#78716c';
    ctx.beginPath();
    ctx.arc(x, y, isFlower ? 1.0 : 1.4, 0, Math.PI * 2);
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
