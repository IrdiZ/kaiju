import { useMemo } from 'react';
import { createGroundTexture } from '../textures/procedural';

export function Ground() {
  const tex = useMemo(() => createGroundTexture(), []);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[3000, 3000]} />
      <meshStandardMaterial map={tex} roughness={0.95} metalness={0} color={0x5a8a4a} />
    </mesh>
  );
}
