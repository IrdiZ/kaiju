import * as THREE from 'three';
import { createBrickTexture, createStoneTexture, createGlassTexture, createRoofTexture } from './procedural';

export interface MaterialLibrary {
  residential: THREE.MeshStandardMaterial[];
  church: THREE.MeshStandardMaterial[];
  basilica: THREE.MeshStandardMaterial[];
  commercial: THREE.MeshStandardMaterial[];
  modern: THREE.MeshStandardMaterial[];
  industrial: THREE.MeshStandardMaterial[];
  civic: THREE.MeshStandardMaterial[];
  theatre: THREE.MeshStandardMaterial[];
  museum: THREE.MeshStandardMaterial[];
  roof: THREE.MeshStandardMaterial;
  roofChurch: THREE.MeshStandardMaterial;
  roofSlate: THREE.MeshStandardMaterial;
}

let _materials: MaterialLibrary | null = null;

export function getMaterialLibrary(): MaterialLibrary {
  if (_materials) return _materials;

  const brickTex1 = createBrickTexture('#a0705a', '#706050');
  brickTex1.repeat.set(2, 3);
  const brickTex2 = createBrickTexture('#8a6048', '#605040');
  brickTex2.repeat.set(2, 3);
  const brickTex3 = createBrickTexture('#b08060', '#807060');
  brickTex3.repeat.set(2, 3);

  const stoneTex = createStoneTexture('#d4c8b0');
  stoneTex.repeat.set(1, 2);
  const stoneTex2 = createStoneTexture('#c8bca4');
  stoneTex2.repeat.set(1, 2);

  const glassTex = createGlassTexture();
  glassTex.repeat.set(3, 4);

  const roofTex = createRoofTexture();
  roofTex.repeat.set(2, 2);

  _materials = {
    residential: [
      new THREE.MeshStandardMaterial({ map: brickTex1, roughness: 0.85, metalness: 0.05 }),
      new THREE.MeshStandardMaterial({ map: brickTex2, roughness: 0.9, metalness: 0.05 }),
      new THREE.MeshStandardMaterial({ map: brickTex3, roughness: 0.85, metalness: 0.05 }),
    ],
    church: [
      new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.7, metalness: 0.05, color: 0xe8dcc8 }),
      new THREE.MeshStandardMaterial({ map: stoneTex2, roughness: 0.7, metalness: 0.05, color: 0xd8ccb8 }),
    ],
    basilica: [
      new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.6, metalness: 0.08, color: 0xf0e0c0 }),
    ],
    commercial: [
      new THREE.MeshStandardMaterial({ map: brickTex1, roughness: 0.8, metalness: 0.1 }),
      new THREE.MeshStandardMaterial({ color: 0xd0c8b8, roughness: 0.6, metalness: 0.15 }),
    ],
    modern: [
      new THREE.MeshStandardMaterial({ map: glassTex, roughness: 0.2, metalness: 0.6, color: 0x8aabbf }),
      new THREE.MeshStandardMaterial({ color: 0x707880, roughness: 0.3, metalness: 0.7 }),
      new THREE.MeshStandardMaterial({ map: glassTex, roughness: 0.15, metalness: 0.5, color: 0x6a99b0 }),
    ],
    industrial: [
      new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0.7, metalness: 0.3 }),
      new THREE.MeshStandardMaterial({ color: 0x909080, roughness: 0.8, metalness: 0.2 }),
    ],
    civic: [
      new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.5, metalness: 0.1, color: 0xe0d8c8 }),
    ],
    theatre: [
      new THREE.MeshStandardMaterial({ color: 0xd0c0a0, roughness: 0.4, metalness: 0.15 }),
    ],
    museum: [
      new THREE.MeshStandardMaterial({ color: 0xf0e8e0, roughness: 0.3, metalness: 0.2 }),
    ],
    roof: new THREE.MeshStandardMaterial({ map: roofTex, roughness: 0.8, metalness: 0.05 }),
    roofChurch: new THREE.MeshStandardMaterial({ color: 0x3a4a4a, roughness: 0.5, metalness: 0.3 }),
    roofSlate: new THREE.MeshStandardMaterial({ color: 0x4a4a50, roughness: 0.6, metalness: 0.2 }),
  };

  return _materials;
}

export function getMaterial(style: string): THREE.MeshStandardMaterial {
  const lib = getMaterialLibrary();
  const mats = (lib as Record<string, THREE.MeshStandardMaterial | THREE.MeshStandardMaterial[]>)[style] || lib.residential;
  if (Array.isArray(mats)) return mats[Math.floor(Math.random() * mats.length)];
  return mats as THREE.MeshStandardMaterial;
}
