import * as THREE from 'three';

export function createBrickTexture(baseColor: string, mortarColor: string, w = 128, h = 128): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < 3000; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    ctx.fillStyle = `rgba(${Math.random() > 0.5 ? 255 : 0},${Math.random() > 0.5 ? 255 : 0},${Math.random() > 0.5 ? 255 : 0},0.03)`;
    ctx.fillRect(x, y, 1, 1);
  }
  const brickH = 8, brickW = 20, mortarW = 2;
  ctx.fillStyle = mortarColor;
  for (let row = 0; row < canvas.height / (brickH + mortarW); row++) {
    const y = row * (brickH + mortarW);
    ctx.fillRect(0, y, canvas.width, mortarW);
    const offset = (row % 2) * brickW / 2;
    for (let col = 0; col < canvas.width / brickW + 1; col++) {
      const x = col * brickW + offset;
      ctx.fillRect(x, y, mortarW, brickH + mortarW);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function createStoneTexture(baseColor: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 1.5;
  for (let row = 0; row < 8; row++) {
    const y = row * 16;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(128, y); ctx.stroke();
    const offset = (row % 2) * 16;
    const blockW = 24 + Math.random() * 12;
    for (let x = offset; x < 128; x += blockW) {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 16); ctx.stroke();
    }
  }
  for (let i = 0; i < 2000; i++) {
    ctx.fillStyle = `rgba(${128 + Math.random() * 60},${120 + Math.random() * 50},${100 + Math.random() * 40},0.04)`;
    ctx.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function createGlassTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 64, 128);
  grad.addColorStop(0, '#3a5a7a');
  grad.addColorStop(0.5, '#4a7a9a');
  grad.addColorStop(1, '#3a5a7a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 128);
  ctx.strokeStyle = 'rgba(180,200,220,0.4)';
  ctx.lineWidth = 1;
  for (let y = 0; y < 128; y += 16) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(64, y); ctx.stroke();
  }
  for (let x = 0; x < 64; x += 16) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 128); ctx.stroke();
  }
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = `rgba(200,230,255,${0.05 + Math.random() * 0.08})`;
    ctx.fillRect(Math.random() * 40, Math.random() * 100, 16, 16);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function createRoofTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#5a4a3a';
  ctx.fillRect(0, 0, 64, 64);
  for (let row = 0; row < 8; row++) {
    const offset = (row % 2) * 4;
    for (let col = 0; col < 8; col++) {
      const shade = 0.85 + Math.random() * 0.3;
      ctx.fillStyle = `rgb(${Math.floor(90 * shade)},${Math.floor(74 * shade)},${Math.floor(58 * shade)})`;
      ctx.fillRect((col * 8) + offset, row * 8, 7, 7);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function createAsphaltTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#3a3a3a';
  ctx.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 1000; i++) {
    ctx.fillStyle = `rgba(${Math.random() > 0.5 ? 80 : 30},${Math.random() > 0.5 ? 80 : 30},${Math.random() > 0.5 ? 80 : 30},0.15)`;
    ctx.fillRect(Math.random() * 64, Math.random() * 64, 1, 1);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function createCobbleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#7a7068';
  ctx.fillRect(0, 0, 64, 64);
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const shade = 0.8 + Math.random() * 0.4;
      ctx.fillStyle = `rgb(${Math.floor(110 * shade)},${Math.floor(100 * shade)},${Math.floor(90 * shade)})`;
      ctx.fillRect(c * 8 + 0.5, r * 8 + 0.5, 7, 7);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function createPavingTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#908878';
  ctx.fillRect(0, 0, 64, 64);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 8; c++) {
      const shade = 0.85 + Math.random() * 0.3;
      ctx.fillStyle = `rgb(${Math.floor(130 * shade)},${Math.floor(120 * shade)},${Math.floor(105 * shade)})`;
      const offset = (r % 2) * 4;
      ctx.fillRect((c * 8 + offset) % 64 + 0.5, r * 16 + 0.5, 7, 15);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function createGroundTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#4a7a3a';
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 20000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const g = 90 + Math.random() * 50;
    ctx.fillStyle = `rgba(${40 + Math.random() * 30},${g},${30 + Math.random() * 20},0.3)`;
    ctx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(40, 40);
  return tex;
}

export function createSkyTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1; canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#1a3a6a');
  grad.addColorStop(0.3, '#4a7aaa');
  grad.addColorStop(0.55, '#8ab8d8');
  grad.addColorStop(0.75, '#c8d8e0');
  grad.addColorStop(0.9, '#f0d8b0');
  grad.addColorStop(1.0, '#f8c888');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1, 512);
  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}
