import { useRef, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { BuildingState } from '../types/data';
import { getMaterial, getMaterialLibrary } from '../textures/materials';

interface CityBuildingsProps {
  buildings: BuildingState[];
}

// Shared detail materials
let windowMat: THREE.MeshStandardMaterial;
let windowLitMat: THREE.MeshStandardMaterial;
let windowFrameMat: THREE.MeshStandardMaterial;
let corniceMat: THREE.MeshStandardMaterial;

function initDetailMats() {
  if (windowMat) return;
  windowMat = new THREE.MeshStandardMaterial({ color: 0x2a4a6a, roughness: 0.1, metalness: 0.5, transparent: true, opacity: 0.8, envMapIntensity: 1.5 });
  windowLitMat = new THREE.MeshStandardMaterial({ color: 0xffe8a0, roughness: 0.3, metalness: 0.1, emissive: new THREE.Color(0x443300), emissiveIntensity: 0.3 });
  windowFrameMat = new THREE.MeshStandardMaterial({ color: 0xf0ece0, roughness: 0.6, metalness: 0.05 });
  corniceMat = new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.5, metalness: 0.08 });
}

export default function CityBuildings({ buildings }: CityBuildingsProps) {
  const { scene } = useThree();
  const meshesRef = useRef<THREE.Object3D[]>([]);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current || buildings.length === 0) return;
    initialized.current = true;
    initDetailMats();
    const lib = getMaterialLibrary();
    const allMeshes: THREE.Object3D[] = [];

    const windowGeo = new THREE.PlaneGeometry(1.2, 1.6);
    const frameGeo = new THREE.PlaneGeometry(1.5, 1.9);

    for (let i = 0; i < buildings.length; i++) {
      const b = buildings[i];
      const poly = b.data.p;
      const h = b.height;
      const style = b.style;

      // Main body
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
        const bbox = b.bbox;
        const bw = Math.max(3, bbox.w), bd = Math.max(3, bbox.d);
        mesh = new THREE.Mesh(new THREE.BoxGeometry(bw, h, bd), getMaterial(style));
        mesh.position.set((bbox.minX + bbox.maxX) / 2, h / 2, -(bbox.minZ + bbox.maxZ) / 2);
      }
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
      allMeshes.push(mesh);

      const gamePoly = poly.map(p => [p[0], -p[1]]);

      // Windows (every 2nd building + all landmarks)
      if (b.isLandmark || i % 2 === 0) {
        const floorH = 3.2;
        const numFloors = Math.max(1, Math.floor(h / floorH));
        for (let pi = 0; pi < gamePoly.length; pi++) {
          const p1 = gamePoly[pi];
          const p2 = gamePoly[(pi + 1) % gamePoly.length];
          const wdx = p2[0] - p1[0], wdz = p2[1] - p1[1];
          const wLen = Math.sqrt(wdx * wdx + wdz * wdz);
          if (wLen < 4) continue;
          const wnx = -wdz / wLen, wnz = wdx / wLen;
          const angle = Math.atan2(wnx, wnz);
          const spacing = style === 'modern' ? 2.8 : 3.5;
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
              scene.add(frame);
              allMeshes.push(frame);
              const isLit = Math.random() > 0.65;
              const win = new THREE.Mesh(windowGeo, isLit ? windowLitMat : windowMat);
              win.position.set(wx + wnx * 0.05, wy, wz + wnz * 0.05);
              win.rotation.y = angle;
              scene.add(win);
              allMeshes.push(win);
            }
          }
        }
      }

      // Cornices
      if (b.isLandmark || i % 3 === 0) {
        if (style !== 'modern' && style !== 'industrial') {
          const levels = [h];
          if (h > 8) levels.push(h * 0.5);
          for (const lv of levels) {
            for (let pi = 0; pi < gamePoly.length; pi++) {
              const p1 = gamePoly[pi], p2 = gamePoly[(pi + 1) % gamePoly.length];
              const wdx = p2[0]-p1[0], wdz = p2[1]-p1[1];
              const wLen = Math.sqrt(wdx*wdx + wdz*wdz);
              if (wLen < 2) continue;
              const wnx = -wdz/wLen, wnz = wdx/wLen;
              const cornice = new THREE.Mesh(new THREE.BoxGeometry(wLen, 0.25, 0.3), corniceMat);
              cornice.position.set((p1[0]+p2[0])/2 + wnx*0.15, lv, (p1[1]+p2[1])/2 + wnz*0.15);
              cornice.rotation.y = Math.atan2(wdx, wdz);
              cornice.castShadow = true;
              scene.add(cornice);
              allMeshes.push(cornice);
            }
          }
        }
      }

      // Gabled roofs (residential, h < 20)
      if ((style === 'residential' || style === 'commercial') && h < 20 && Math.random() > 0.25) {
        let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
        for (const p of gamePoly) { minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]); minZ = Math.min(minZ, p[1]); maxZ = Math.max(maxZ, p[1]); }
        const bw = maxX - minX, bd = maxZ - minZ;
        const gH = Math.min(bw, bd) * 0.35;
        if (gH >= 1) {
          const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
          const rY = h + gH, eY = h;
          const roofMat = lib.roof;
          const hw = bw / 2 + 0.3, hd = bd / 2 + 0.3;
          if (bw > bd) {
            for (const [v, idx] of [
              [new Float32Array([cx-hw,eY,cz-hd, cx+hw,eY,cz-hd, cx-hw,rY,cz, cx+hw,rY,cz]), [0,1,2,1,3,2]],
              [new Float32Array([cx-hw,rY,cz, cx+hw,rY,cz, cx-hw,eY,cz+hd, cx+hw,eY,cz+hd]), [0,1,2,1,3,2]],
            ] as [Float32Array, number[]][]) {
              const g = new THREE.BufferGeometry();
              g.setAttribute('position', new THREE.BufferAttribute(v, 3));
              g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0,0,bw/4,0,0,1,bw/4,1]), 2));
              g.setIndex(idx);
              g.computeVertexNormals();
              const m = new THREE.Mesh(g, roofMat);
              m.castShadow = true;
              scene.add(m);
              allMeshes.push(m);
            }
          } else {
            for (const [v, idx] of [
              [new Float32Array([cx-hw,eY,cz-hd, cx-hw,eY,cz+hd, cx,rY,cz-hd, cx,rY,cz+hd]), [0,1,2,1,3,2]],
              [new Float32Array([cx,rY,cz-hd, cx,rY,cz+hd, cx+hw,eY,cz-hd, cx+hw,eY,cz+hd]), [0,1,2,1,3,2]],
            ] as [Float32Array, number[]][]) {
              const g = new THREE.BufferGeometry();
              g.setAttribute('position', new THREE.BufferAttribute(v, 3));
              g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0,0,bd/4,0,0,1,bd/4,1]), 2));
              g.setIndex(idx);
              g.computeVertexNormals();
              const m = new THREE.Mesh(g, roofMat);
              m.castShadow = true;
              scene.add(m);
              allMeshes.push(m);
            }
          }
        }
      } else if (style === 'church' || style === 'basilica' || b.data.l === 'church' || b.data.l === 'basilica') {
        // Church spire
        const spH = 15 + Math.random() * 15, spR = Math.min(b.radius * 0.3, 3);
        const spire = new THREE.Mesh(new THREE.ConeGeometry(spR, spH, 6), lib.roofChurch);
        spire.position.set(b.centroid[0], h + spH / 2, b.centroid[1]);
        spire.castShadow = true;
        scene.add(spire);
        allMeshes.push(spire);
        const crossMat = new THREE.MeshStandardMaterial({ color: 0xddcc88, metalness: 0.7, roughness: 0.3 });
        const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3, 0.3), crossMat);
        crossV.position.set(b.centroid[0], h + spH + 1.5, b.centroid[1]);
        scene.add(crossV); allMeshes.push(crossV);
        const crossH = new THREE.Mesh(new THREE.BoxGeometry(2, 0.3, 0.3), crossMat);
        crossH.position.set(b.centroid[0], h + spH + 2, b.centroid[1]);
        scene.add(crossH); allMeshes.push(crossH);
      } else {
        // Flat roof cap
        try {
          const rs = new THREE.Shape();
          rs.moveTo(poly[0][0], -poly[0][1]);
          for (let j = 1; j < poly.length; j++) rs.lineTo(poly[j][0], -poly[j][1]);
          rs.closePath();
          const rg = new THREE.ExtrudeGeometry(rs, { depth: 0.5, bevelEnabled: false });
          rg.rotateX(-Math.PI / 2);
          const rm = new THREE.Mesh(rg, lib.roof);
          rm.position.y = h;
          rm.castShadow = true;
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
