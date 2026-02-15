import * as THREE from 'three';

const loader = new THREE.TextureLoader();

function loadTex(path: string, repeatX = 1, repeatY = 1): THREE.Texture {
  const tex = loader.load(path);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function loadNormal(path: string, repeatX = 1, repeatY = 1): THREE.Texture {
  const tex = loader.load(path);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  // Normals stay in linear space
  return tex;
}

function loadLinear(path: string, repeatX = 1, repeatY = 1): THREE.Texture {
  const tex = loader.load(path);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  return tex;
}

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

  const rx = 2, ry = 3; // building UV repeat

  // === BRICK textures (3 variants for residential) ===
  const brick1 = new THREE.MeshStandardMaterial({
    map: loadTex('/textures/brick1/Bricks097_1K-JPG_Color.jpg', rx, ry),
    normalMap: loadNormal('/textures/brick1/Bricks097_1K-JPG_NormalGL.jpg', rx, ry),
    roughnessMap: loadLinear('/textures/brick1/Bricks097_1K-JPG_Roughness.jpg', rx, ry),
    aoMap: loadLinear('/textures/brick1/Bricks097_1K-JPG_AmbientOcclusion.jpg', rx, ry),
    roughness: 1,
    metalness: 0.02,
  });

  const brick2 = new THREE.MeshStandardMaterial({
    map: loadTex('/textures/brick2/Bricks059_1K-JPG_Color.jpg', rx, ry),
    normalMap: loadNormal('/textures/brick2/Bricks059_1K-JPG_NormalGL.jpg', rx, ry),
    roughnessMap: loadLinear('/textures/brick2/Bricks059_1K-JPG_Roughness.jpg', rx, ry),
    aoMap: loadLinear('/textures/brick2/Bricks059_1K-JPG_AmbientOcclusion.jpg', rx, ry),
    roughness: 1,
    metalness: 0.02,
  });

  const brick3 = new THREE.MeshStandardMaterial({
    map: loadTex('/textures/brick3/Bricks038_1K-JPG_Color.jpg', rx, ry),
    normalMap: loadNormal('/textures/brick3/Bricks038_1K-JPG_NormalGL.jpg', rx, ry),
    roughnessMap: loadLinear('/textures/brick3/Bricks038_1K-JPG_Roughness.jpg', rx, ry),
    aoMap: loadLinear('/textures/brick3/Bricks038_1K-JPG_AmbientOcclusion.jpg', rx, ry),
    roughness: 1,
    metalness: 0.02,
  });

  // === STONE textures (church/civic) ===
  const stone1 = new THREE.MeshStandardMaterial({
    map: loadTex('/textures/stone1/PavingStones131_1K-JPG_Color.jpg', 1, 2),
    normalMap: loadNormal('/textures/stone1/PavingStones131_1K-JPG_NormalGL.jpg', 1, 2),
    roughnessMap: loadLinear('/textures/stone1/PavingStones131_1K-JPG_Roughness.jpg', 1, 2),
    aoMap: loadLinear('/textures/stone1/PavingStones131_1K-JPG_AmbientOcclusion.jpg', 1, 2),
    roughness: 1,
    metalness: 0.05,
    color: 0xe8dcc8,
  });

  const stone2 = new THREE.MeshStandardMaterial({
    map: loadTex('/textures/stone2/Marble006_1K-JPG_Color.jpg', 1, 2),
    normalMap: loadNormal('/textures/stone2/Marble006_1K-JPG_NormalGL.jpg', 1, 2),
    roughnessMap: loadLinear('/textures/stone2/Marble006_1K-JPG_Roughness.jpg', 1, 2),
    roughness: 1,
    metalness: 0.08,
    color: 0xf0e0c0,
  });

  // === GLASS / MODERN ===
  const glass1 = new THREE.MeshStandardMaterial({
    map: loadTex('/textures/glass/MetalPlates006_1K-JPG_Color.jpg', 3, 4),
    normalMap: loadNormal('/textures/glass/MetalPlates006_1K-JPG_NormalGL.jpg', 3, 4),
    roughnessMap: loadLinear('/textures/glass/MetalPlates006_1K-JPG_Roughness.jpg', 3, 4),
    metalnessMap: loadLinear('/textures/glass/MetalPlates006_1K-JPG_Metalness.jpg', 3, 4),
    roughness: 1,
    metalness: 1,
    color: 0x8aabbf,
    envMapIntensity: 1.5,
  });

  // === ROOF ===
  const roof = new THREE.MeshStandardMaterial({
    map: loadTex('/textures/roof/RoofingTiles003_1K-JPG_Color.jpg', 2, 2),
    normalMap: loadNormal('/textures/roof/RoofingTiles003_1K-JPG_NormalGL.jpg', 2, 2),
    roughnessMap: loadLinear('/textures/roof/RoofingTiles003_1K-JPG_Roughness.jpg', 2, 2),
    roughness: 1,
    metalness: 0.05,
  });

  _materials = {
    residential: [brick1, brick2, brick3],
    church: [stone1, stone1.clone()],
    basilica: [stone2],
    commercial: [
      brick1.clone(),
      new THREE.MeshStandardMaterial({
        map: loadTex('/textures/stone1/PavingStones131_1K-JPG_Color.jpg', rx, ry),
        normalMap: loadNormal('/textures/stone1/PavingStones131_1K-JPG_NormalGL.jpg', rx, ry),
        roughness: 0.6,
        metalness: 0.15,
        color: 0xd0c8b8,
      }),
    ],
    modern: [
      glass1,
      new THREE.MeshStandardMaterial({
        map: loadTex('/textures/glass/MetalPlates006_1K-JPG_Color.jpg', 2, 3),
        normalMap: loadNormal('/textures/glass/MetalPlates006_1K-JPG_NormalGL.jpg', 2, 3),
        roughnessMap: loadLinear('/textures/glass/MetalPlates006_1K-JPG_Roughness.jpg', 2, 3),
        roughness: 0.3,
        metalness: 0.7,
        color: 0x707880,
      }),
      glass1.clone(),
    ],
    industrial: [
      new THREE.MeshStandardMaterial({
        map: loadTex('/textures/glass/MetalPlates006_1K-JPG_Color.jpg', 2, 2),
        normalMap: loadNormal('/textures/glass/MetalPlates006_1K-JPG_NormalGL.jpg', 2, 2),
        roughness: 0.7,
        metalness: 0.3,
        color: 0x808080,
      }),
      new THREE.MeshStandardMaterial({
        map: loadTex('/textures/brick1/Bricks097_1K-JPG_Color.jpg', 2, 2),
        normalMap: loadNormal('/textures/brick1/Bricks097_1K-JPG_NormalGL.jpg', 2, 2),
        roughness: 0.8,
        metalness: 0.2,
        color: 0x909080,
      }),
    ],
    civic: [stone1.clone()],
    theatre: [
      new THREE.MeshStandardMaterial({
        map: loadTex('/textures/stone2/Marble006_1K-JPG_Color.jpg', 1, 2),
        normalMap: loadNormal('/textures/stone2/Marble006_1K-JPG_NormalGL.jpg', 1, 2),
        roughness: 0.4,
        metalness: 0.15,
        color: 0xd0c0a0,
      }),
    ],
    museum: [
      new THREE.MeshStandardMaterial({
        map: loadTex('/textures/stone2/Marble006_1K-JPG_Color.jpg', 1, 1),
        normalMap: loadNormal('/textures/stone2/Marble006_1K-JPG_NormalGL.jpg', 1, 1),
        roughness: 0.3,
        metalness: 0.2,
        color: 0xf0e8e0,
      }),
    ],
    roof,
    roofChurch: new THREE.MeshStandardMaterial({
      map: loadTex('/textures/roof/RoofingTiles003_1K-JPG_Color.jpg', 1, 1),
      normalMap: loadNormal('/textures/roof/RoofingTiles003_1K-JPG_NormalGL.jpg', 1, 1),
      roughness: 0.5,
      metalness: 0.3,
      color: 0x3a4a4a,
    }),
    roofSlate: new THREE.MeshStandardMaterial({
      map: loadTex('/textures/roof/RoofingTiles003_1K-JPG_Color.jpg', 1, 1),
      normalMap: loadNormal('/textures/roof/RoofingTiles003_1K-JPG_NormalGL.jpg', 1, 1),
      roughness: 0.6,
      metalness: 0.2,
      color: 0x4a4a50,
    }),
  };

  return _materials;
}

export function getMaterial(style: string): THREE.MeshStandardMaterial {
  const lib = getMaterialLibrary();
  const mats = (lib as Record<string, THREE.MeshStandardMaterial | THREE.MeshStandardMaterial[]>)[style] || lib.residential;
  const mat = Array.isArray(mats) ? mats[Math.floor(Math.random() * mats.length)] : mats as THREE.MeshStandardMaterial;
  // DoubleSide ensures walls are visible regardless of polygon winding
  mat.side = THREE.DoubleSide;
  return mat;
}
