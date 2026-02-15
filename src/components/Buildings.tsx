import { useRef, useMemo, useEffect } from 'react';
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
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
}

// Store building meshes so we can remove them on destroy
interface BuildingMeshGroup {
  parts: THREE.Object3D[];
  index: number;
}

export function Buildings({ buildings, physicsWorld }: BuildingsProps) {
  const { scene } = useThree();
  const buildingMeshes = useRef<BuildingMeshGroup[]>([]);
  const chunks = useRef<Chunk[]>([]);
  const dust = useRef<DustParticle[]>([]);
  const initialized = useRef(false);
  const destroyedSet = useRef<Set<number>>(new Set());

  const addShake = useGameStore((s) => s.addShake);

  // Build all meshes imperatively (needed for ExtrudeGeometry + complex logic)
  useEffect(() => {
    if (initialized.current || buildings.length === 0) return;
    initialized.current = true;

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

        // Fix UVs
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
        // Fallback box
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

      // Roof for residential/commercial
      if (style === 'residential' || style === 'commercial') {
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
      }

      buildingMeshes.current.push({ parts, index: i });
    }

    return () => {
      // Cleanup
      for (const bg of buildingMeshes.current) {
        for (const part of bg.parts) {
          scene.remove(part);
          if ((part as THREE.Mesh).geometry) (part as THREE.Mesh).geometry.dispose();
        }
      }
      buildingMeshes.current = [];
    };
  }, [buildings, scene]);

  // Destroy building function
  const destroyBuilding = (bIndex: number, kaijuX: number, kaijuZ: number) => {
    if (destroyedSet.current.has(bIndex)) return;
    destroyedSet.current.add(bIndex);

    const b = buildings[bIndex];
    const store = useGameStore.getState();
    store.destroyBuilding(bIndex);
    addShake(0.8);

    // Remove mesh parts
    const bg = buildingMeshes.current.find(m => m.index === bIndex);
    if (bg) {
      for (const part of bg.parts) {
        scene.remove(part);
        if ((part as THREE.Mesh).geometry) (part as THREE.Mesh).geometry.dispose();
      }
      bg.parts = [];
    }

    // Create chunks
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

    // Dust
    spawnDust(centroid[0], height / 2, centroid[1], Math.max(bw, bd, height));

    // Flash
    flashScreen();
  };

  const spawnDust = (x: number, y: number, z: number, size: number) => {
    const count = 25 + Math.floor(size * 1.5);
    const geo = new THREE.SphereGeometry(1, 4, 4);
    for (let i = 0; i < count; i++) {
      const scale = 1.5 + Math.random() * 3.5;
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(0.7 + Math.random() * 0.15, 0.65 + Math.random() * 0.1, 0.55 + Math.random() * 0.1),
        transparent: true,
        opacity: 0.5,
        fog: true,
      });
      const m = new THREE.Mesh(geo, mat);
      m.scale.set(scale, scale, scale);
      m.position.set(
        x + (Math.random() - 0.5) * size,
        y * Math.random(),
        z + (Math.random() - 0.5) * size
      );
      scene.add(m);
      dust.current.push({
        mesh: m,
        mat,
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

  // Expose destroyBuilding to parent via ref-like pattern on window
  useEffect(() => {
    (window as any).__destroyBuilding = destroyBuilding;
    return () => { delete (window as any).__destroyBuilding; };
  });

  // Update chunks and dust each frame
  useFrame((_, dt) => {
    dt = Math.min(dt, 0.05);

    // Chunks
    for (let i = chunks.current.length - 1; i >= 0; i--) {
      const c = chunks.current[i];
      c.life -= dt;
      if (c.life <= 0) {
        scene.remove(c.mesh);
        c.mesh.geometry.dispose();
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

    // Cap chunks
    while (chunks.current.length > 400) {
      const c = chunks.current.shift()!;
      scene.remove(c.mesh);
      c.mesh.geometry.dispose();
      physicsWorld.removeBody(c.body);
    }

    // Dust
    for (let i = dust.current.length - 1; i >= 0; i--) {
      const p = dust.current[i];
      p.life -= dt;
      if (p.life <= 0) {
        scene.remove(p.mesh);
        dust.current.splice(i, 1);
      } else {
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.y += p.vy * dt;
        p.mesh.position.z += p.vz * dt;
        p.vy -= 1.5 * dt;
        p.vx *= 0.97;
        p.vz *= 0.97;
        const s = 1 + (1 - p.life / p.maxLife) * 4;
        p.mesh.scale.set(s, s, s);
        p.mat.opacity = (p.life / p.maxLife) * 0.4;
      }
    }
  });

  return null; // All rendering is imperative
}
