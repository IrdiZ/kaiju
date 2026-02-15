import { useMemo } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import type { BuildingState, LandmarkData } from '../types/data';
import { useEffect } from 'react';

interface TreesProps {
  landmarks: LandmarkData[];
  buildings: BuildingState[];
}

export function Trees({ landmarks, buildings }: TreesProps) {
  const { scene } = useThree();

  useEffect(() => {
    const treePositions: { x: number; z: number }[] = [];
    const parks = landmarks.filter((l) => l.c === 'park');

    for (const park of parks) {
      const count = 15 + Math.floor(Math.random() * 20);
      for (let i = 0; i < count; i++) {
        treePositions.push({
          x: park.x + (Math.random() - 0.5) * 80,
          z: -park.z + (Math.random() - 0.5) * 80,
        });
      }
    }

    // Scatter periphery trees
    for (let i = 0; i < 100; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 300 + Math.random() * 500;
      treePositions.push({ x: Math.cos(angle) * r, z: Math.sin(angle) * r });
    }

    const trunkGeo = new THREE.CylinderGeometry(0.3, 0.5, 4, 5);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.9 });
    const canopyGeo = new THREE.SphereGeometry(3, 6, 5);
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x2a6a1a, roughness: 0.8 });

    const meshes: THREE.Mesh[] = [];

    for (const pos of treePositions) {
      let blocked = false;
      for (const b of buildings) {
        const dx = pos.x - b.centroid[0];
        const dz = pos.z - b.centroid[1];
        if (Math.abs(dx) < b.bbox.w / 2 + 2 && Math.abs(dz) < b.bbox.d / 2 + 2) {
          blocked = true;
          break;
        }
      }
      if (blocked) continue;

      const scale = 0.7 + Math.random() * 0.8;
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.set(pos.x, 2 * scale, pos.z);
      trunk.scale.set(scale, scale, scale);
      trunk.castShadow = true;
      scene.add(trunk);
      meshes.push(trunk);

      const canopy = new THREE.Mesh(canopyGeo, canopyMat);
      canopy.position.set(pos.x, 5.5 * scale, pos.z);
      canopy.scale.set(scale, scale * (0.8 + Math.random() * 0.4), scale);
      canopy.castShadow = true;
      scene.add(canopy);
      meshes.push(canopy);
    }

    return () => {
      for (const m of meshes) {
        scene.remove(m);
        m.geometry.dispose();
      }
    };
  }, [landmarks, buildings, scene]);

  return null;
}
