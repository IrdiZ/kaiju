import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { BuildingState } from '../types/data';
import { getMaterial, getMaterialLibrary } from '../textures/materials';

interface CityBuildingsProps {
  buildings: BuildingState[];
}

/**
 * Focused Markt renderer — manual wall quads (no ExtrudeGeometry).
 * Every building gets: real polygon walls, windows, cornices, hip roofs.
 * All geometry uses game convention: Z = -rawZ.
 */
export default function CityBuildings({ buildings }: CityBuildingsProps) {
  const { scene } = useThree();
  const meshesRef = useRef<THREE.Object3D[]>([]);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current || buildings.length === 0) return;
    initialized.current = true;

    const lib = getMaterialLibrary();
    const allMeshes: THREE.Object3D[] = [];

    // Detail materials
    const windowMat = new THREE.MeshStandardMaterial({
      color: 0x2a4a6a, roughness: 0.1, metalness: 0.5,
      transparent: true, opacity: 0.8, side: THREE.DoubleSide,
    });
    const windowLitMat = new THREE.MeshStandardMaterial({
      color: 0xffe8a0, roughness: 0.3, metalness: 0.1,
      emissive: new THREE.Color(0x443300), emissiveIntensity: 0.3,
      side: THREE.DoubleSide,
    });
    const windowFrameMat = new THREE.MeshStandardMaterial({
      color: 0xf0ece0, roughness: 0.6, metalness: 0.05,
      side: THREE.DoubleSide,
    });
    const corniceMat = new THREE.MeshStandardMaterial({
      color: 0xe8e0d0, roughness: 0.5, metalness: 0.08,
    });

    const isChurch = (b: BuildingState) =>
      b.style === 'church' || b.style === 'basilica' ||
      b.data.l === 'church' || b.data.l === 'basilica';

    const churches = buildings.filter(isChurch);
    const nonChurches = buildings.filter(b => !isChurch(b));

    // ==========================================
    // 1. BUILDING WALLS — manual quads, merged per style
    // ==========================================
    const styleWalls: Record<string, THREE.BufferGeometry[]> = {};

    for (const b of buildings) {
      const poly = b.data.p;
      const h = b.height;
      const styleKey =
        isChurch(b) ? 'church' :
        b.style === 'modern' ? 'modern' :
        b.style === 'commercial' ? 'commercial' : 'residential';

      const geo = createWallGeo(poly, h);
      if (!styleWalls[styleKey]) styleWalls[styleKey] = [];
      styleWalls[styleKey].push(geo);
    }

    for (const [style, geos] of Object.entries(styleWalls)) {
      batchMergeAdd(geos, getMaterial(style), scene, allMeshes, true);
    }

    // ==========================================
    // 2. WINDOWS — on all buildings, merged
    // ==========================================
    const windowDarkGeos: THREE.BufferGeometry[] = [];
    const windowLitGeos: THREE.BufferGeometry[] = [];
    const frameGeos: THREE.BufferGeometry[] = [];

    for (const b of buildings) {
      const gamePoly = b.data.p.map(p => [p[0], -p[1]] as [number, number]);
      const h = b.height;
      const floorH = 3.2;
      const numFloors = Math.max(1, Math.floor(h / floorH));

      for (let pi = 0; pi < gamePoly.length; pi++) {
        const p1 = gamePoly[pi], p2 = gamePoly[(pi + 1) % gamePoly.length];
        const dx = p2[0] - p1[0], dz = p2[1] - p1[1];
        const wallLen = Math.sqrt(dx * dx + dz * dz);
        if (wallLen < 3) continue;

        const nx = -dz / wallLen, nz = dx / wallLen;
        const angle = Math.atan2(nx, nz);
        const spacing = 3.0;
        const nWin = Math.max(1, Math.floor((wallLen - 1.5) / spacing));
        const startOff = (wallLen - (nWin - 1) * spacing) / 2;

        for (let wi = 0; wi < nWin; wi++) {
          const t = (startOff + wi * spacing) / wallLen;
          const wx = p1[0] + dx * t, wz = p1[1] + dz * t;

          for (let fl = 0; fl < numFloors; fl++) {
            const wy = fl * floorH + floorH * 0.55;
            if (wy + 0.8 > h - 0.5) continue;

            const fg = new THREE.PlaneGeometry(1.5, 1.9);
            applyPlaneXform(fg, wx + nx * 0.02, wy, wz + nz * 0.02, angle);
            frameGeos.push(fg);

            const wg = new THREE.PlaneGeometry(1.2, 1.6);
            applyPlaneXform(wg, wx + nx * 0.05, wy, wz + nz * 0.05, angle);
            if (Math.random() > 0.65) windowLitGeos.push(wg);
            else windowDarkGeos.push(wg);
          }
        }
      }
    }

    batchMergeAdd(frameGeos, windowFrameMat, scene, allMeshes, false);
    batchMergeAdd(windowDarkGeos, windowMat, scene, allMeshes, false);
    batchMergeAdd(windowLitGeos, windowLitMat, scene, allMeshes, false);

    // ==========================================
    // 3. CORNICES — roofline + mid-height, merged
    // ==========================================
    const corniceGeos: THREE.BufferGeometry[] = [];

    for (const b of buildings) {
      const gamePoly = b.data.p.map(p => [p[0], -p[1]] as [number, number]);
      const h = b.height;
      const levels = [h];
      if (h > 8) levels.push(h * 0.5);

      for (const lv of levels) {
        for (let pi = 0; pi < gamePoly.length; pi++) {
          const p1 = gamePoly[pi], p2 = gamePoly[(pi + 1) % gamePoly.length];
          const dx = p2[0] - p1[0], dz = p2[1] - p1[1];
          const wallLen = Math.sqrt(dx * dx + dz * dz);
          if (wallLen < 2) continue;

          const nx = -dz / wallLen, nz = dx / wallLen;
          const cg = new THREE.BoxGeometry(wallLen, 0.25, 0.3);
          cg.applyMatrix4(new THREE.Matrix4().compose(
            new THREE.Vector3(
              (p1[0] + p2[0]) / 2 + nx * 0.15,
              lv,
              (p1[1] + p2[1]) / 2 + nz * 0.15,
            ),
            new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.atan2(dx, dz), 0)),
            new THREE.Vector3(1, 1, 1),
          ));
          corniceGeos.push(cg);
        }
      }
    }

    batchMergeAdd(corniceGeos, corniceMat, scene, allMeshes, true);

    // ==========================================
    // 4. HIP ROOFS — non-church buildings, merged
    // ==========================================
    const roofGeos: THREE.BufferGeometry[] = [];

    for (const b of nonChurches) {
      const gamePoly = b.data.p.map(p => [p[0], -p[1]] as [number, number]);
      const h = b.height;
      const cx = b.centroid[0], cz = b.centroid[1];
      const minDim = Math.min(b.bbox.w, b.bbox.d);
      const roofH = Math.min(4, Math.max(1.5, minDim * 0.35));

      for (let pi = 0; pi < gamePoly.length; pi++) {
        const p1 = gamePoly[pi];
        const p2 = gamePoly[(pi + 1) % gamePoly.length];

        const verts = new Float32Array([
          p1[0], h, p1[1],
          p2[0], h, p2[1],
          cx, h + roofH, cz,
        ]);
        const uvs = new Float32Array([0, 0, 1, 0, 0.5, 1]);
        const rg = new THREE.BufferGeometry();
        rg.setAttribute('position', new THREE.BufferAttribute(verts, 3));
        rg.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
        rg.setIndex([0, 1, 2]);
        rg.computeVertexNormals();
        roofGeos.push(rg);
      }
    }

    batchMergeAdd(roofGeos, lib.roof, scene, allMeshes, true);

    // ==========================================
    // 5. CHURCH FEATURES — spires, crosses, rose windows
    // ==========================================
    const crossMat = new THREE.MeshStandardMaterial({ color: 0xddcc88, metalness: 0.7, roughness: 0.3 });
    const roseMat = new THREE.MeshStandardMaterial({
      color: 0x3366aa, emissive: new THREE.Color(0x112244), emissiveIntensity: 0.5,
      roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.9,
    });

    for (const b of churches) {
      const h = b.height;
      const gamePoly = b.data.p.map(p => [p[0], -p[1]] as [number, number]);
      const cx = b.centroid[0], cz = b.centroid[1];

      // Flat roof cap
      const capGeos: THREE.BufferGeometry[] = [];
      for (let i = 1; i < gamePoly.length - 1; i++) {
        const v = new Float32Array([
          gamePoly[0][0], h, gamePoly[0][1],
          gamePoly[i][0], h, gamePoly[i][1],
          gamePoly[i + 1][0], h, gamePoly[i + 1][1],
        ]);
        const rg = new THREE.BufferGeometry();
        rg.setAttribute('position', new THREE.BufferAttribute(v, 3));
        rg.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 0.5, 1]), 2));
        rg.setIndex([0, 1, 2]);
        rg.computeVertexNormals();
        capGeos.push(rg);
      }
      batchMergeAdd(capGeos, lib.roofChurch, scene, allMeshes, true);

      // Spire
      const spH = 15 + Math.random() * 15;
      const spR = Math.min(b.radius * 0.3, 3);
      const spire = new THREE.Mesh(new THREE.ConeGeometry(spR, spH, 6), lib.roofChurch);
      spire.position.set(cx, h + spH / 2, cz);
      spire.castShadow = true;
      scene.add(spire);
      allMeshes.push(spire);

      // Cross
      const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3, 0.3), crossMat);
      crossV.position.set(cx, h + spH + 1.5, cz);
      scene.add(crossV); allMeshes.push(crossV);
      const crossH = new THREE.Mesh(new THREE.BoxGeometry(2, 0.3, 0.3), crossMat);
      crossH.position.set(cx, h + spH + 2, cz);
      scene.add(crossH); allMeshes.push(crossH);

      // Rose window on longest wall
      if (gamePoly.length >= 2) {
        let bestLen = 0, bestIdx = 0;
        for (let pi = 0; pi < gamePoly.length; pi++) {
          const p1 = gamePoly[pi], p2 = gamePoly[(pi + 1) % gamePoly.length];
          const l = Math.sqrt((p2[0] - p1[0]) ** 2 + (p2[1] - p1[1]) ** 2);
          if (l > bestLen) { bestLen = l; bestIdx = pi; }
        }
        const p1 = gamePoly[bestIdx], p2 = gamePoly[(bestIdx + 1) % gamePoly.length];
        const mx = (p1[0] + p2[0]) / 2, mz = (p1[1] + p2[1]) / 2;
        const dx = p2[0] - p1[0], dz = p2[1] - p1[1];
        const len = Math.sqrt(dx * dx + dz * dz);
        const nx = -dz / len, nz = dx / len;
        const rose = new THREE.Mesh(new THREE.CircleGeometry(1.5, 12), roseMat);
        rose.position.set(mx + nx * 0.1, h * 0.75, mz + nz * 0.1);
        rose.rotation.y = Math.atan2(nx, nz);
        scene.add(rose); allMeshes.push(rose);
      }
    }

    meshesRef.current = allMeshes;
    return () => {
      for (const m of allMeshes) {
        scene.remove(m);
        if ((m as THREE.Mesh).geometry) (m as THREE.Mesh).geometry.dispose();
      }
      meshesRef.current = [];
    };
  }, [buildings, scene]);

  return null;
}

/* ── Manual wall geometry ────────────────────── */

/** Create wall quads from polygon edges. All in game coords (Z = -rawZ). */
function createWallGeo(poly: number[][], h: number): THREE.BufferGeometry {
  const verts: number[] = [];
  const norms: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  let vi = 0;

  for (let i = 0; i < poly.length; i++) {
    const p1 = poly[i], p2 = poly[(i + 1) % poly.length];
    // Game convention: Z = -rawZ
    const x1 = p1[0], z1 = -p1[1];
    const x2 = p2[0], z2 = -p2[1];
    const dx = x2 - x1, dz = z2 - z1;
    const len = Math.sqrt(dx * dx + dz * dz);
    if (len < 0.01) continue;

    // Outward-facing normal
    const nx = -dz / len, nz = dx / len;

    // Quad: bottom-left → bottom-right → top-right → top-left
    verts.push(
      x1, 0, z1,
      x2, 0, z2,
      x2, h, z2,
      x1, h, z1,
    );
    norms.push(
      nx, 0, nz,
      nx, 0, nz,
      nx, 0, nz,
      nx, 0, nz,
    );
    uvs.push(
      0, 0,
      len * 0.05, 0,
      len * 0.05, h * 0.05,
      0, h * 0.05,
    );
    // CCW winding (front face)
    indices.push(vi, vi + 1, vi + 2, vi, vi + 2, vi + 3);
    vi += 4;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(norms, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return geo;
}

/* ── Helpers ─────────────────────────────────── */

function applyPlaneXform(geo: THREE.BufferGeometry, x: number, y: number, z: number, rotY: number) {
  geo.applyMatrix4(new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotY, 0)),
    new THREE.Vector3(1, 1, 1),
  ));
}

function batchMergeAdd(
  geos: THREE.BufferGeometry[],
  mat: THREE.Material,
  scene: THREE.Scene,
  out: THREE.Object3D[],
  castShadow: boolean,
) {
  const CHUNK = 500;
  for (let ci = 0; ci < geos.length; ci += CHUNK) {
    const chunk = geos.slice(ci, ci + CHUNK);
    const merged = mergeGeos(chunk);
    if (merged) {
      const mesh = new THREE.Mesh(merged, mat);
      if (castShadow) mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
      out.push(mesh);
    }
    for (const g of chunk) g.dispose();
  }
}

function mergeGeos(geos: THREE.BufferGeometry[]): THREE.BufferGeometry | null {
  if (geos.length === 0) return null;
  let totalV = 0, totalI = 0;
  for (const g of geos) {
    totalV += g.getAttribute('position').count;
    totalI += g.index ? g.index.count : 0;
  }
  const pos = new Float32Array(totalV * 3);
  const norm = new Float32Array(totalV * 3);
  const uv = new Float32Array(totalV * 2);
  const idx = new Uint32Array(totalI);
  let vo = 0, io = 0;
  for (const g of geos) {
    const gp = g.getAttribute('position');
    const gn = g.getAttribute('normal');
    const gu = g.getAttribute('uv');
    const gi = g.index;
    for (let i = 0; i < gp.count; i++) {
      pos[(vo + i) * 3] = gp.getX(i);
      pos[(vo + i) * 3 + 1] = gp.getY(i);
      pos[(vo + i) * 3 + 2] = gp.getZ(i);
      if (gn) { norm[(vo + i) * 3] = gn.getX(i); norm[(vo + i) * 3 + 1] = gn.getY(i); norm[(vo + i) * 3 + 2] = gn.getZ(i); }
      if (gu) { uv[(vo + i) * 2] = gu.getX(i); uv[(vo + i) * 2 + 1] = gu.getY(i); }
    }
    if (gi) { for (let i = 0; i < gi.count; i++) idx[io + i] = gi.getX(i) + vo; io += gi.count; }
    vo += gp.count;
  }
  const m = new THREE.BufferGeometry();
  m.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  m.setAttribute('normal', new THREE.BufferAttribute(norm, 3));
  m.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  m.setIndex(new THREE.BufferAttribute(idx, 1));
  return m;
}
