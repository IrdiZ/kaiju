import { useMemo } from 'react';
import * as THREE from 'three';
import { createSkyTexture } from '../textures/procedural';

export function Sky() {
  const tex = useMemo(() => createSkyTexture(), []);
  return (
    <mesh>
      <sphereGeometry args={[1200, 16, 16]} />
      <meshBasicMaterial map={tex} side={THREE.BackSide} fog={false} />
    </mesh>
  );
}
