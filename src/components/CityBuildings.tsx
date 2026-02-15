import { useEffect, useRef, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { BuildingState } from '../types/data';
import { getMaterial, getMaterialLibrary } from '../textures/materials';

interface CityBuildingsProps {
  buildings: BuildingState[];
}

/**
 * Optimized city renderer:
 * - Regular houses: merged into a few large BufferGeometries (minimal draw calls)
 * - Landmarks: individual meshes with detail (windows, spires, etc.)
 * - No wireframe outlines
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

    // Separate landmarks from regular buildings
    const landmarks = buildings.filter(b => b.isLandmark);
    const regular = buildings.filter(b => !b.isLandmark);

    // ==========================================
    // REGULAR BUILDINGS: Simple box extrusions, merged per style
    // ==========================================
    const styleGroups: Record<string, THREE.BufferGeometry[]> = {};

    for (const b of regular) {
      const { bbox, height } = b;
      const w = Math.max(2, bbox.w);
      const d = Math.max(2, bbox.d);
      const cx = (bbox.minX + bbox.maxX) / 2;
      const cz = -(bbox.minZ + bbox.maxZ) / 2;

      // Simple box for each regular building (fast, no extrude)
      const geo = new THREE.BoxGeometry(w, height, d);
      geo.translate(cx, height / 2, cz);

      const style = b.style === 'church' ? 'church' : 
                    b.style === 'modern' ? 'modern' :
                    b.style === 'commercial' ? 'commercial' :
                    'residential';
      
      if (!styleGroups[style]) styleGroups[style] = [];
      styleGroups[style].push(geo);
    }

    // Merge each style group into one mesh
    for (const [style, geos] of Object.entries(styleGroups)) {
      if (geos.length === 0) continue;

      // Batch merge in chunks of 500 to avoid memory spikes
      const chunkSize = 500;
      for (let ci = 0; ci < geos.length; ci += chunkSize) {
        const chunk = geos.slice(ci, ci + chunkSize);
        const merged = mergeGeometries(chunk);
        if (!merged) continue;

        const mat = getMaterial(style);
        const mesh = new THREE.Mesh(merged, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
        allMeshes.push(mesh);

        // Dispose individual geometries
        for (const g of chunk) g.dispose();
      }
    }

    // Simple merged roof layer for all regular buildings
    const roofGeos: THREE.BufferGeometry[] = [];
    for (const b of regular) {
      const { bbox, height } = b;
      const w = Math.max(2, bbox.w) + 0.4;
      const d = Math.max(2, bbox.d) + 0.4;
      const cx = (bbox.minX + bbox.maxX) / 2;
      const cz = -(bbox.minZ + bbox.maxZ) / 2;
      const rGeo = new THREE.BoxGeometry(w, 0.3, d);
      rGeo.translate(cx, height + 0.15, cz);
      roofGeos.push(rGeo);
    }
    // Merge roofs in chunks
    for (let ci = 0; ci < roofGeos.length; ci += 500) {
      const chunk = roofGeos.slice(ci, ci + 500);
      const merged = mergeGeometries(chunk);
      if (merged) {
        const roofMesh = new THREE.Mesh(merged, lib.roof);
        roofMesh.castShadow = true;
        scene.add(roofMesh);
        allMeshes.push(roofMesh);
      }
      for (const g of chunk) g.dispose();
    }

    // ==========================================
    // LANDMARKS: Individual detailed meshes
    // ==========================================
    const windowMat = new THREE.MeshStandardMaterial({ color: 0x2a4a6a, roughness: 0.1, metalness: 0.5, transparent: true, opacity: 0.8 });
    const windowLitMat = new THREE.MeshStandardMaterial({ color: 0xffe8a0, roughness: 0.3, metalness: 0.1, emissive: new THREE.Color(0x443300), emissiveIntensity: 0.3 });
    const windowFrameMat = new THREE.MeshStandardMaterial({ color: 0xf0ece0, roughness: 0.6, metalness: 0.05 });
    const corniceMat = new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.5, metalness: 0.08 });
    const windowGeo = new THREE.PlaneGeometry(1.2, 1.6);
    const frameGeo = new THREE.PlaneGeometry(1.5, 1.9);

    for (const b of landmarks) {
      const poly = b.data.p;
      const h = b.height;
      const style = b.style;

      // Full polygon extrusion for landmarks
      const shape = new THREE.Shape();
      shape.moveTo(poly[0][0], -poly[0][1]);
      for (let j = 1; j < poly.length; j++) shape.lineTo(poly[j][0], -poly[j][1]);
      shape.closePath();

      let mesh: THREE.Mesh;
      try {
        const extGeo = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false });
        extGeo.rotateX(-Math.PI / 2);
        const posA = extGeo.getAttribute('position');
        const uvA = extGeo.getAttribute('uv');
        if (uvA) {
          for (let j = 0; j < posA.count; j++) {
            (uvA as THREE.BufferAttribute).setXY(j, (posA.getX(j) + posA.getZ(j)) * 0.05, posA.getY(j) * 0.05);
          }
        }
        mesh = new THREE.Mesh(extGeo, getMaterial(style));
      } catch {
        const bw = Math.max(3, b.bbox.w), bd = Math.max(3, b.bbox.d);
        mesh = new THREE.Mesh(new THREE.BoxGeometry(bw, h, bd), getMaterial(style));
        mesh.position.set((b.bbox.minX + b.bbox.maxX) / 2, h / 2, -(b.bbox.minZ + b.bbox.maxZ) / 2);
      }
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
      allMeshes.push(mesh);

      const gamePoly = poly.map(p => [p[0], -p[1]]);

      // Windows on landmarks
      const floorH = 3.2;
      const numFloors = Math.max(1, Math.floor(h / floorH));
      for (let pi = 0; pi < gamePoly.length; pi++) {
        const p1 = gamePoly[pi], p2 = gamePoly[(pi + 1) % gamePoly.length];
        const wdx = p2[0] - p1[0], wdz = p2[1] - p1[1];
        const wLen = Math.sqrt(wdx * wdx + wdz * wdz);
        if (wLen < 4) continue;
        const wnx = -wdz / wLen, wnz = wdx / wLen;
        const angle = Math.atan2(wnx, wnz);
        const spacing = 3.5;
        const nw = Math.max(1, Math.floor((wLen - 2) / spacing));
        const startOff = (wLen - (nw - 1) * spacing) / 2;
        for (let wi = 0; wi < nw; wi++) {
          const t = (startOff + wi * spacing) / wLen;
          const wx = p1[0] + wdx * t, wz = p1[1] + wdz * t;
          for (let fl = 0; fl < numFloors; fl++) {
            const wy = fl * floorH + floorH * 0.55;
            if (wy + 0.8 > h - 0.5) continue;
            const frame = new THREE.Mesh(frameGeo, windowFrameMat);
            frame.position.set(wx + wnx * 0.02, wy, wz + wnz * 0.02);
            frame.rotation.y = angle;
            scene.add(frame); allMeshes.push(frame);
            const win = new THREE.Mesh(windowGeo, Math.random() > 0.6 ? windowLitMat : windowMat);
            win.position.set(wx + wnx * 0.05, wy, wz + wnz * 0.05);
            win.rotation.y = angle;
            scene.add(win); allMeshes.push(win);
          }
        }
      }

      // Cornices on landmarks
      const levels = [h];
      if (h > 8) levels.push(h * 0.5);
      for (const lv of levels) {
        for (let pi = 0; pi < gamePoly.length; pi++) {
          const p1 = gamePoly[pi], p2 = gamePoly[(pi + 1) % gamePoly.length];
          const wdx = p2[0] - p1[0], wdz = p2[1] - p1[1];
          const wLen = Math.sqrt(wdx * wdx + wdz * wdz);
          if (wLen < 2) continue;
          const wnx = -wdz / wLen, wnz = wdx / wLen;
          const cornice = new THREE.Mesh(new THREE.BoxGeometry(wLen, 0.25, 0.3), corniceMat);
          cornice.position.set((p1[0] + p2[0]) / 2 + wnx * 0.15, lv, (p1[1] + p2[1]) / 2 + wnz * 0.15);
          cornice.rotation.y = Math.atan2(wdx, wdz);
          cornice.castShadow = true;
          scene.add(cornice); allMeshes.push(cornice);
        }
      }

      // Church spires
      if (style === 'church' || style === 'basilica' || b.data.l === 'church' || b.data.l === 'basilica') {
        const spH = 15 + Math.random() * 15;
        const spR = Math.min(b.radius * 0.3, 3);
        const spire = new THREE.Mesh(new THREE.ConeGeometry(spR, spH, 6), lib.roofChurch);
        spire.position.set(b.centroid[0], h + spH / 2, b.centroid[1]);
        spire.castShadow = true;
        scene.add(spire); allMeshes.push(spire);
        const crossMat = new THREE.MeshStandardMaterial({ color: 0xddcc88, metalness: 0.7, roughness: 0.3 });
        const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3, 0.3), crossMat);
        crossV.position.set(b.centroid[0], h + spH + 1.5, b.centroid[1]);
        scene.add(crossV); allMeshes.push(crossV);
        const crossH = new THREE.Mesh(new THREE.BoxGeometry(2, 0.3, 0.3), crossMat);
        crossH.position.set(b.centroid[0], h + spH + 2, b.centroid[1]);
        scene.add(crossH); allMeshes.push(crossH);

        // Rose window
        const roseGeo = new THREE.CircleGeometry(1.5, 12);
        const roseMat = new THREE.MeshStandardMaterial({
          color: 0x3366aa, emissive: new THREE.Color(0x112244), emissiveIntensity: 0.5,
          roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.9,
        });
        if (gamePoly.length >= 2) {
          let bestLen = 0, bestIdx = 0;
          for (let pi = 0; pi < gamePoly.length; pi++) {
            const p1g = gamePoly[pi], p2g = gamePoly[(pi + 1) % gamePoly.length];
            const l = Math.sqrt((p2g[0] - p1g[0]) ** 2 + (p2g[1] - p1g[1]) ** 2);
            if (l > bestLen) { bestLen = l; bestIdx = pi; }
          }
          const p1g = gamePoly[bestIdx], p2g = gamePoly[(bestIdx + 1) % gamePoly.length];
          const mx = (p1g[0] + p2g[0]) / 2, mz = (p1g[1] + p2g[1]) / 2;
          const dx = p2g[0] - p1g[0], dz = p2g[1] - p1g[1];
          const len = Math.sqrt(dx * dx + dz * dz);
          const wnx = -dz / len, wnz = dx / len;
          const rose = new THREE.Mesh(roseGeo, roseMat);
          rose.position.set(mx + wnx * 0.1, h * 0.75, mz + wnz * 0.1);
          rose.rotation.y = Math.atan2(wnx, wnz);
          scene.add(rose); allMeshes.push(rose);
        }
      } else {
        // Flat roof cap for landmark non-churches
        try {
          const rs = new THREE.Shape();
          rs.moveTo(poly[0][0], -poly[0][1]);
          for (let j = 1; j < poly.length; j++) rs.lineTo(poly[j][0], -poly[j][1]);
          rs.closePath();
          const rg = new THREE.ExtrudeGeometry(rs, { depth: 0.5, bevelEnabled: false });
          rg.rotateX(-Math.PI / 2);
          const rm = new THREE.Mesh(rg, lib.roof);
          rm.position.y = h; rm.castShadow = true;
          scene.add(rm); allMeshes.push(rm);
        } catch {}
      }
    }

    meshesRef.current = allMeshes;
    return () => {
      for (const m of allMeshes) { scene.remove(m); if ((m as THREE.Mesh).geometry) (m as THREE.Mesh).geometry.dispose(); }
      meshesRef.current = [];
    };
  }, [buildings, scene]);

  return null;
}

/** Merge an array of geometries into one (position + normal + uv) */
function mergeGeometries(geos: THREE.BufferGeometry[]): THREE.BufferGeometry | null {
  if (geos.length === 0) return null;

  let totalVerts = 0, totalIdx = 0;
  for (const g of geos) {
    totalVerts += g.getAttribute('position').count;
    totalIdx += g.index ? g.index.count : 0;
  }

  const pos = new Float32Array(totalVerts * 3);
  const norm = new Float32Array(totalVerts * 3);
  const uv = new Float32Array(totalVerts * 2);
  const idx = new Uint32Array(totalIdx);

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

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(norm, 3));
  merged.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  merged.setIndex(new THREE.BufferAttribute(idx, 1));
  return merged;
}
