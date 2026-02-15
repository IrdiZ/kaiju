import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function Water() {
  const maasRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (maasRef.current) {
      maasRef.current.position.y = 0.15 + Math.sin(performance.now() * 0.001) * 0.08;
    }
  });

  const mat = (
    <meshStandardMaterial
      color={0x2a6a8a}
      roughness={0.1}
      metalness={0.6}
      transparent
      opacity={0.85}
    />
  );

  return (
    <>
      {/* Maas river */}
      <mesh ref={maasRef} rotation={[-Math.PI / 2, 0, 0]} position={[320, 0.15, 30]} receiveShadow>
        <planeGeometry args={[80, 1200]} />
        {mat}
      </mesh>
      {/* Jeker */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-50, 0.15, -200]} receiveShadow>
        <planeGeometry args={[15, 400]} />
        <meshStandardMaterial
          color={0x2a6a8a}
          roughness={0.1}
          metalness={0.6}
          transparent
          opacity={0.85}
        />
      </mesh>
    </>
  );
}
