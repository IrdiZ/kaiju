import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import type { BuildingState } from '../types/data';
import { getMaterial, getMaterialLibrary } from '../textures/materials';
import { useGameStore } from '../stores/gameStore';

interface BuildingsProps {
  buildings: BuildingState[];
  physicsWorld: CANNON.World;
}

interface Chunk {
  mesh: THREE.Mesh;
  body: CANNON.Body;
  life: number;
}

interface DustParticle {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  vx: number; vy: number; vz: number;
  life: number; maxLife: number;
}

interface BuildingMeshGroup {
  parts: THREE.Object3D[];
  index: number;
}

// Window material (shared)
let windowMat: THREE.MeshStandardMaterial;
let windowLitMat: THREE.MeshStandardMaterial;
let windowFrameMat: THREE.MeshStandardMaterial;
let corniceMat: THREE.MeshStandardMaterial;

function initBuildingDetails() {
  if (windowMat) return;
  windowMat = new THREE.MeshStandardMaterial({
    color: 0x2a4a6a,
    roughness: 0.1,
    metalness: 0.5,
    transparent: true,
    opacity: 0.8,
  });
  windowLitMat = new THREE.MeshStandardMaterial({
    color: 0xffe8a0,
    roughness: 0.3,
    metalness: 0.1,
    emissive: new THREE.Color(0x443300),
    emissiveIntensity: 0.3,
  });
  windowFrameMat = new THREE.MeshStandardMaterial({
    color: 0xf0ece0,
    roughness: 0.6,
    metalness: 0.05,
  });
  corniceMat = new THREE.MeshStandardMaterial({
    color: 0xe8e0d0,
    roughness: 0.5,
    metalness: 0.08,
  });
}

// Add windows to a building along its longest face
function addWindows(
  group: THREE.Object3D[],
  scene: THREE.Scene,
  poly: number[][],
  height: number,
  style: string
) {
  if (style === 'industrial') return; // No windows on industrial
  
  const floorHeight = 3.2;
  const numFloors = Math.max(1, Math.floor(height / floorHeight));
  const windowW = 1.2;
  const windowH = 1.6;
  const windowGeo = new THREE.PlaneGeometry(windowW, windowH);
  const frameGeo = new THREE.PlaneGeometry(windowW + 0.3, windowH + 0.3);

  // Process each wall segment
  for (let pi = 0; pi < poly.length; pi++) {
    const p1 = poly[pi];
    const p2 = poly[(pi + 1) % poly.length];
    const wallDx = p2[0] - p1[0];
    const wallDz = p2[1] - p1[1];
    const wallLen = Math.sqrt(wallDx * wallDx + wallDz * wallDz);
    
    if (wallLen < 4) continue; // Skip short walls
    
    // Normal pointing outward (perpendicular to wall)
    const nx = -wallDz / wallLen;
    const nz = wallDx / wallLen;
    const angle = Math.atan2(nx, nz);
    
    // Window spacing
    const windowSpacing = style === 'modern' ? 2.8 : 3.5;
    const numWindows = Math.max(1, Math.floor((wallLen - 2) / windowSpacing));
    const startOffset = (wallLen - (numWindows - 1) * windowSpacing) / 2;
    
    for (let wi = 0; wi < numWindows; wi++) {
      const t = (startOffset + wi * windowSpacing) / wallLen;
      const wx = p1[0] + wallDx * t;
      const wz = p1[1] + wallDz * t;
      
      for (let floor = 0; floor < numFloors; floor++) {
        const wy = floor * floorHeight + floorHeight * 0.55;
        if (wy + windowH / 2 > height - 0.5) continue;
        
        // Frame (slightly behind window)
        const frame = new THREE.Mesh(frameGeo, windowFrameMat);
        frame.position.set(wx + nx * 0.02, wy, wz + nz * 0.02);
        frame.rotation.y = angle;
        scene.add(frame);
        group.push(frame);
        
        // Window pane
        const isLit = Math.random() > 0.6;
        const win = new THREE.Mesh(windowGeo, isLit ? windowLitMat : windowMat);
        win.position.set(wx + nx * 0.05, wy, wz + nz * 0.05);
        win.rotation.y = angle;
        scene.add(win);
        group.push(win);
      }
    }
  }
}

// Add cornice/ledge lines at floor levels
function addCornices(
  group: THREE.Object3D[],
  scene: THREE.Scene,
  poly: number[][],
  height: number,
  style: string
) {
  if (style === 'modern' || style === 'industrial') return;
  
  const corniceH = 0.25;
  const corniceD = 0.3;
  
  // Add cornice at top and every ~6m
  const levels = [height];
  if (height > 8) levels.push(height * 0.5);
  if (height > 14) levels.push(height * 0.33);
  
  for (const level of levels) {
    for (let pi = 0; pi < poly.length; pi++) {
      const p1 = poly[pi];
      const p2 = poly[(pi + 1) % poly.length];
      const wallDx = p2[0] - p1[0];
      const wallDz = p2[1] - p1[1];
      const wallLen = Math.sqrt(wallDx * wallDx + wallDz * wallDz);
      if (wallLen < 2) continue;
      
      const nx = -wallDz / wallLen;
      const nz = wallDx / wallLen;
      const mx = (p1[0] + p2[0]) / 2;
      const mz = (p1[1] + p2[1]) / 2;
      const angle = Math.atan2(wallDx, wallDz);
      
      const geo = new THREE.BoxGeometry(wallLen, corniceH, corniceD);
      const cornice = new THREE.Mesh(geo, corniceMat);
      cornice.position.set(mx + nx * corniceD * 0.5, level, mz + nz * corniceD * 0.5);
      cornice.rotation.y = angle;
      cornice.castShadow = true;
      scene.add(cornice);
      group.push(cornice);
    }
  }
}

// Create a gabled roof for residential buildings
function addGabledRoof(
  group: THREE.Object3D[],
  scene: THREE.Scene,
  poly: number[][],
  height: number,
  centroid: [number, number],
  radius: number,
  style: string
) {
  const lib = getMaterialLibrary();
  
  // Find the longest axis of the building for the ridge direction
  let longestIdx = 0, longestLen = 0;
  for (let i = 0; i < poly.length; i++) {
    const p1 = poly[i];
    const p2 = poly[(i + 1) % poly.length];
    const len = Math.sqrt((p2[0] - p1[0]) ** 2 + (p2[1] - p1[1]) ** 2);
    if (len > longestLen) { longestLen = len; longestIdx = i; }
  }
  
  // Get bounding box oriented to longest wall
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const p of poly) {
    minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]);
    minZ = Math.min(minZ, p[1]); maxZ = Math.max(maxZ, p[1]);
  }
  const bw = maxX - minX;
  const bd = maxZ - minZ;
  
  // Gable height proportional to building width
  const gableH = Math.min(bw, bd) * 0.35;
  if (gableH < 1) return; // Too small for a gable
  
  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;
  
  // Simple ridge roof using a shape
  const roofMat = style === 'church' || style === 'basilica' ? lib.roofChurch : lib.roof;
  
  // Create roof as two sloped planes
  const ridgeY = height + gableH;
  const eaveY = height;
  
  // Determine ridge direction (along longest dimension)
  if (bw > bd) {
    // Ridge runs east-west
    const hw = bw / 2 + 0.3; // slight overhang
    const hd = bd / 2 + 0.3;
    
    // North slope
    const nGeo = new THREE.BufferGeometry();
    const nVerts = new Float32Array([
      cx - hw, eaveY, cz - hd,    cx + hw, eaveY, cz - hd,
      cx - hw, ridgeY, cz,        cx + hw, ridgeY, cz,
    ]);
    nGeo.setAttribute('position', new THREE.BufferAttribute(nVerts, 3));
    nGeo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0,0, bw/4,0, 0,1, bw/4,1]), 2));
    nGeo.setIndex([0,1,2, 1,3,2]);
    nGeo.computeVertexNormals();
    const nMesh = new THREE.Mesh(nGeo, roofMat);
    nMesh.castShadow = true;
    scene.add(nMesh);
    group.push(nMesh);
    
    // South slope
    const sGeo = new THREE.BufferGeometry();
    const sVerts = new Float32Array([
      cx - hw, ridgeY, cz,        cx + hw, ridgeY, cz,
      cx - hw, eaveY, cz + hd,    cx + hw, eaveY, cz + hd,
    ]);
    sGeo.setAttribute('position', new THREE.BufferAttribute(sVerts, 3));
    sGeo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0,1, bw/4,1, 0,0, bw/4,0]), 2));
    sGeo.setIndex([0,1,2, 1,3,2]);
    sGeo.computeVertexNormals();
    const sMesh = new THREE.Mesh(sGeo, roofMat);
    sMesh.castShadow = true;
    scene.add(sMesh);
    group.push(sMesh);
    
    // Gable ends (triangles)
    const wallMat = getMaterial(style);
    for (const gx of [cx - hw, cx + hw]) {
      const gGeo = new THREE.BufferGeometry();
      const gVerts = new Float32Array([
        gx, eaveY, cz - hd,
        gx, eaveY, cz + hd,
        gx, ridgeY, cz,
      ]);
      gGeo.setAttribute('position', new THREE.BufferAttribute(gVerts, 3));
      gGeo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0,0, 1,0, 0.5,1]), 2));
      gGeo.setIndex([0,1,2]);
      gGeo.computeVertexNormals();
      const gMesh = new THREE.Mesh(gGeo, wallMat);
      gMesh.castShadow = true;
      scene.add(gMesh);
      group.push(gMesh);
    }
  } else {
    // Ridge runs north-south
    const hw = bw / 2 + 0.3;
    const hd = bd / 2 + 0.3;
    
    // West slope
    const wGeo = new THREE.BufferGeometry();
    const wVerts = new Float32Array([
      cx - hw, eaveY, cz - hd,    cx - hw, eaveY, cz + hd,
      cx, ridgeY, cz - hd,        cx, ridgeY, cz + hd,
    ]);
    wGeo.setAttribute('position', new THREE.BufferAttribute(wVerts, 3));
    wGeo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0,0, bd/4,0, 0,1, bd/4,1]), 2));
    wGeo.setIndex([0,1,2, 1,3,2]);
    wGeo.computeVertexNormals();
    const wMesh = new THREE.Mesh(wGeo, wGeo.getAttribute('normal') ? getMaterialLibrary().roof : roofMat);
    wMesh.castShadow = true;
    scene.add(wMesh);
    group.push(wMesh);
    
    // East slope
    const eGeo = new THREE.BufferGeometry();
    const eVerts = new Float32Array([
      cx, ridgeY, cz - hd,        cx, ridgeY, cz + hd,
      cx + hw, eaveY, cz - hd,    cx + hw, eaveY, cz + hd,
    ]);
    eGeo.setAttribute('position', new THREE.BufferAttribute(eVerts, 3));
    eGeo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0,1, bd/4,1, 0,0, bd/4,0]), 2));
    eGeo.setIndex([0,1,2, 1,3,2]);
    eGeo.computeVertexNormals();
    const eMesh = new THREE.Mesh(eGeo, roofMat);
    eMesh.castShadow = true;
    scene.add(eMesh);
    group.push(eMesh);
    
    // Gable ends
    const wallMat = getMaterial(style);
    for (const gz of [cz - hd, cz + hd]) {
      const gGeo = new THREE.BufferGeometry();
      const gVerts = new Float32Array([
        cx - hw, eaveY, gz,
        cx + hw, eaveY, gz,
        cx, ridgeY, gz,
      ]);
      gGeo.setAttribute('position', new THREE.BufferAttribute(gVerts, 3));
      gGeo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0,0, 1,0, 0.5,1]), 2));
      gGeo.setIndex([0,1,2]);
      gGeo.computeVertexNormals();
      const gMesh = new THREE.Mesh(gGeo, wallMat);
      gMesh.castShadow = true;
      scene.add(gMesh);
      group.push(gMesh);
    }
  }
}

export function Buildings({ buildings, physicsWorld }: BuildingsProps) {
  const { scene } = useThree();
  const buildingMeshes = useRef<BuildingMeshGroup[]>([]);
  const chunks = useRef<Chunk[]>([]);
  const dust = useRef<DustParticle[]>([]);
  const initialized = useRef(false);
  const destroyedSet = useRef<Set<number>>(new Set());
  const addShake = useGameStore((s) => s.addShake);

  useEffect(() => {
    if (initialized.current || buildings.length === 0) return;
    initialized.current = true;
    initBuildingDetails();

    const lib = getMaterialLibrary();

    for (let i = 0; i < buildings.length; i++) {
      const b = buildings[i];
      const poly = b.data.p;
      const h = b.height;
      const style = b.style;
      const parts: THREE.Object3D[] = [];

      const shape = new THREE.Shape();
      shape.moveTo(poly[0][0], -poly[0][1]);
      for (let j = 1; j < poly.length; j++) {
        shape.lineTo(poly[j][0], -poly[j][1]);
      }
      shape.closePath();

      let mesh: THREE.Mesh;
      try {
        const extrudeGeo = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false });
        extrudeGeo.rotateX(-Math.PI / 2);

        const posAttr = extrudeGeo.getAttribute('position');
        const uvAttr = extrudeGeo.getAttribute('uv');
        if (uvAttr) {
          for (let j = 0; j < posAttr.count; j++) {
            const px = posAttr.getX(j);
            const py = posAttr.getY(j);
            const pz = posAttr.getZ(j);
            (uvAttr as THREE.BufferAttribute).setXY(j, (px + pz) * 0.05, py * 0.05);
          }
        }

        const mat = getMaterial(style);
        mesh = new THREE.Mesh(extrudeGeo, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
        parts.push(mesh);
      } catch {
        const bbox = b.bbox;
        const w = Math.max(3, bbox.w), d = Math.max(3, bbox.d);
        const boxGeo = new THREE.BoxGeometry(w, h, d);
        mesh = new THREE.Mesh(boxGeo, getMaterial(style));
        mesh.position.set((bbox.minX + bbox.maxX) / 2, h / 2, -(bbox.minZ + bbox.maxZ) / 2);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
        parts.push(mesh);
      }

      // Game-coord polygon for window placement
      const gamePoly = poly.map(p => [p[0], -p[1]]);

      // Windows (on every 3rd building to save perf, or all landmarks)
      if (b.isLandmark || i % 3 === 0) {
        addWindows(parts, scene, gamePoly, h, style);
      }

      // Cornices
      if (b.isLandmark || i % 4 === 0) {
        addCornices(parts, scene, gamePoly, h, style);
      }

      // Roofs
      if (style === 'residential' || style === 'commercial') {
        // Gabled roof for most residential
        if (h < 20 && Math.random() > 0.3) {
          addGabledRoof(parts, scene, gamePoly, h, b.centroid, b.radius, style);
        } else {
          // Flat roof cap
          try {
            const roofShape = new THREE.Shape();
            roofShape.moveTo(poly[0][0], -poly[0][1]);
            for (let j = 1; j < poly.length; j++) {
              roofShape.lineTo(poly[j][0], -poly[j][1]);
            }
            roofShape.closePath();
            const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: 0.5, bevelEnabled: false });
            roofGeo.rotateX(-Math.PI / 2);
            const roofMesh = new THREE.Mesh(roofGeo, lib.roof);
            roofMesh.position.set(0, h, 0);
            roofMesh.castShadow = true;
            scene.add(roofMesh);
            parts.push(roofMesh);
          } catch { /* skip */ }
        }
      }

      // Church spire
      if (style === 'church' || style === 'basilica' || b.data.l === 'church' || b.data.l === 'basilica') {
        const spireH = 15 + Math.random() * 15;
        const spireR = Math.min(b.radius * 0.3, 3);
        const spireGeo = new THREE.ConeGeometry(spireR, spireH, 6);
        const spire = new THREE.Mesh(spireGeo, lib.roofChurch);
        spire.position.set(b.centroid[0], h + spireH / 2, b.centroid[1]);
        spire.castShadow = true;
        scene.add(spire);
        parts.push(spire);

        const crossMat = new THREE.MeshStandardMaterial({ color: 0xddcc88, metalness: 0.7, roughness: 0.3 });
        const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3, 0.3), crossMat);
        crossV.position.set(b.centroid[0], h + spireH + 1.5, b.centroid[1]);
        scene.add(crossV);
        parts.push(crossV);
        const crossH = new THREE.Mesh(new THREE.BoxGeometry(2, 0.3, 0.3), crossMat);
        crossH.position.set(b.centroid[0], h + spireH + 2, b.centroid[1]);
        scene.add(crossH);
        parts.push(crossH);

        // Rose window for churches
        const roseGeo = new THREE.CircleGeometry(1.5, 12);
        const roseMat = new THREE.MeshStandardMaterial({
          color: 0x3366aa,
          emissive: new THREE.Color(0x112244),
          emissiveIntensity: 0.5,
          roughness: 0.1,
          metalness: 0.3,
          transparent: true,
          opacity: 0.9,
        });
        // Place on the longest wall
        if (gamePoly.length >= 2) {
          let bestLen = 0, bestIdx = 0;
          for (let pi = 0; pi < gamePoly.length; pi++) {
            const p1 = gamePoly[pi];
            const p2 = gamePoly[(pi + 1) % gamePoly.length];
            const l = Math.sqrt((p2[0]-p1[0])**2 + (p2[1]-p1[1])**2);
            if (l > bestLen) { bestLen = l; bestIdx = pi; }
          }
          const p1 = gamePoly[bestIdx];
          const p2 = gamePoly[(bestIdx + 1) % gamePoly.length];
          const mx = (p1[0]+p2[0])/2, mz = (p1[1]+p2[1])/2;
          const dx = p2[0]-p1[0], dz = p2[1]-p1[1];
          const len = Math.sqrt(dx*dx+dz*dz);
          const wnx = -dz/len, wnz = dx/len;
          const rose = new THREE.Mesh(roseGeo, roseMat);
          rose.position.set(mx + wnx*0.1, h*0.75, mz + wnz*0.1);
          rose.rotation.y = Math.atan2(wnx, wnz);
          scene.add(rose);
          parts.push(rose);
        }
      }

      buildingMeshes.current.push({ parts, index: i });
    }

    return () => {
      for (const bg of buildingMeshes.current) {
        for (const part of bg.parts) {
          scene.remove(part);
          if ((part as THREE.Mesh).geometry) (part as THREE.Mesh).geometry.dispose();
        }
      }
      buildingMeshes.current = [];
    };
  }, [buildings, scene]);

  const destroyBuilding = (bIndex: number, kaijuX: number, kaijuZ: number) => {
    if (destroyedSet.current.has(bIndex)) return;
    destroyedSet.current.add(bIndex);

    const b = buildings[bIndex];
    useGameStore.getState().destroyBuilding(bIndex);
    addShake(0.8);

    const bg = buildingMeshes.current.find(m => m.index === bIndex);
    if (bg) {
      for (const part of bg.parts) {
        scene.remove(part);
        if ((part as THREE.Mesh).geometry) (part as THREE.Mesh).geometry.dispose();
      }
      bg.parts = [];
    }

    const { bbox, height, centroid, style } = b;
    const bw = bbox.w, bd = bbox.d;
    const nx = Math.max(2, Math.round(bw / 3));
    const nz = Math.max(2, Math.round(bd / 3));
    const ny = Math.max(2, Math.round(height / 4));
    const cw = bw / nx, cd = bd / nz, ch = height / ny;

    const chunkMat = getMaterial(style).clone();

    const dirX = centroid[0] - kaijuX;
    const dirZ = centroid[1] - kaijuZ;
    const dirLen = Math.sqrt(dirX * dirX + dirZ * dirZ) || 1;

    for (let ix = 0; ix < nx; ix++) {
      for (let iz = 0; iz < nz; iz++) {
        for (let iy = 0; iy < ny; iy++) {
          const cx = bbox.minX + cw * (ix + 0.5);
          const cy = ch * (iy + 0.5);
          const cz = -(bbox.minZ + cd * (iz + 0.5));

          const sw = cw * (0.65 + Math.random() * 0.35);
          const sh = ch * (0.65 + Math.random() * 0.35);
          const sd = cd * (0.65 + Math.random() * 0.35);

          const geo = new THREE.BoxGeometry(sw, sh, sd);
          const m = new THREE.Mesh(geo, chunkMat);
          m.position.set(cx, cy, cz);
          m.castShadow = true;
          scene.add(m);

          const body = new CANNON.Body({
            mass: 5 + Math.random() * 10,
            shape: new CANNON.Box(new CANNON.Vec3(sw / 2, sh / 2, sd / 2)),
            position: new CANNON.Vec3(cx, cy, cz),
            linearDamping: 0.3,
            angularDamping: 0.4,
          });

          const force = 40 + Math.random() * 60;
          const upForce = 15 + Math.random() * 45;
          body.velocity.set(
            (dirX / dirLen + (Math.random() - 0.5) * 0.8) * force,
            upForce,
            (dirZ / dirLen + (Math.random() - 0.5) * 0.8) * force
          );
          body.angularVelocity.set(
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10
          );

          physicsWorld.addBody(body);
          chunks.current.push({ mesh: m, body, life: 5 + Math.random() * 3 });
        }
      }
    }

    spawnDust(centroid[0], height / 2, centroid[1], Math.max(bw, bd, height));
    flashScreen();
  };

  const spawnDust = (x: number, y: number, z: number, size: number) => {
    const count = 25 + Math.floor(size * 1.5);
    const geo = new THREE.SphereGeometry(1, 4, 4);
    for (let i = 0; i < count; i++) {
      const scale = 1.5 + Math.random() * 3.5;
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(0.7 + Math.random() * 0.15, 0.65 + Math.random() * 0.1, 0.55 + Math.random() * 0.1),
        transparent: true, opacity: 0.5, fog: true,
      });
      const m = new THREE.Mesh(geo, mat);
      m.scale.set(scale, scale, scale);
      m.position.set(x + (Math.random() - 0.5) * size, y * Math.random(), z + (Math.random() - 0.5) * size);
      scene.add(m);
      dust.current.push({
        mesh: m, mat,
        vx: (Math.random() - 0.5) * 12,
        vy: 2 + Math.random() * 8,
        vz: (Math.random() - 0.5) * 12,
        life: 2 + Math.random() * 2.5,
        maxLife: 2 + Math.random() * 2.5,
      });
    }
  };

  const flashScreen = () => {
    const flash = document.createElement('div');
    flash.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(255,120,0,0.12);pointer-events:none;z-index:50;';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 80);
  };

  useEffect(() => {
    (window as any).__destroyBuilding = destroyBuilding;
    return () => { delete (window as any).__destroyBuilding; };
  });

  useFrame((_, dt) => {
    dt = Math.min(dt, 0.05);
    for (let i = chunks.current.length - 1; i >= 0; i--) {
      const c = chunks.current[i];
      c.life -= dt;
      if (c.life <= 0) {
        scene.remove(c.mesh); c.mesh.geometry.dispose();
        physicsWorld.removeBody(c.body);
        chunks.current.splice(i, 1);
      } else {
        c.mesh.position.copy(c.body.position as any);
        c.mesh.quaternion.copy(c.body.quaternion as any);
        if (c.life < 1.5) {
          (c.mesh.material as THREE.MeshStandardMaterial).transparent = true;
          (c.mesh.material as THREE.MeshStandardMaterial).opacity = c.life / 1.5;
        }
      }
    }
    while (chunks.current.length > 400) {
      const c = chunks.current.shift()!;
      scene.remove(c.mesh); c.mesh.geometry.dispose();
      physicsWorld.removeBody(c.body);
    }
    for (let i = dust.current.length - 1; i >= 0; i--) {
      const p = dust.current[i];
      p.life -= dt;
      if (p.life <= 0) { scene.remove(p.mesh); dust.current.splice(i, 1); }
      else {
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.y += p.vy * dt;
        p.mesh.position.z += p.vz * dt;
        p.vy -= 1.5 * dt; p.vx *= 0.97; p.vz *= 0.97;
        const s = 1 + (1 - p.life / p.maxLife) * 4;
        p.mesh.scale.set(s, s, s);
        p.mat.opacity = (p.life / p.maxLife) * 0.4;
      }
    }
  });

  return null;
}
