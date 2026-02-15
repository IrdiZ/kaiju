import { useMemo } from 'react';
import * as THREE from 'three';

export function Ground() {
  const { map, normalMap, roughnessMap, aoMap } = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const load = (path: string, srgb = false) => {
      const tex = loader.load(path);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(40, 40);
      if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    };
    return {
      map: load('/textures/grass/Grass001_1K-JPG_Color.jpg', true),
      normalMap: load('/textures/grass/Grass001_1K-JPG_NormalGL.jpg'),
      roughnessMap: load('/textures/grass/Grass001_1K-JPG_Roughness.jpg'),
      aoMap: load('/textures/grass/Grass001_1K-JPG_AmbientOcclusion.jpg'),
    };
  }, []);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[3000, 3000]} />
      <meshStandardMaterial
        map={map}
        normalMap={normalMap}
        roughnessMap={roughnessMap}
        aoMap={aoMap}
        roughness={1}
        metalness={0}
      />
    </mesh>
  );
}
