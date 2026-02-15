import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

interface LampData { x: number; z: number; }
interface BenchData { x: number; z: number; rotation: number; }
interface FurnitureData { lamps: LampData[]; benches: BenchData[]; }

const LAMP_HEIGHT = 5;

function LampInstances({ lamps }: { lamps: LampData[] }) {
  const poleRef = useRef<THREE.InstancedMesh>(null);
  const bulbRef = useRef<THREE.InstancedMesh>(null);

  const poleGeo = useMemo(() => new THREE.CylinderGeometry(0.06, 0.1, LAMP_HEIGHT, 6), []);
  const bulbGeo = useMemo(() => new THREE.SphereGeometry(0.2, 6, 4), []);

  useEffect(() => {
    if (!poleRef.current || !bulbRef.current || !lamps.length) return;
    const dummy = new THREE.Object3D();
    lamps.forEach((lamp, i) => {
      dummy.position.set(lamp.x, LAMP_HEIGHT / 2, lamp.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      poleRef.current!.setMatrixAt(i, dummy.matrix);

      dummy.position.set(lamp.x, LAMP_HEIGHT + 0.2, lamp.z);
      dummy.updateMatrix();
      bulbRef.current!.setMatrixAt(i, dummy.matrix);
    });
    poleRef.current.instanceMatrix.needsUpdate = true;
    bulbRef.current.instanceMatrix.needsUpdate = true;
  }, [lamps]);

  if (!lamps.length) return null;

  // Only render point lights for a small subset (performance — each light is expensive)
  const litLamps = useMemo(() => {
    const step = Math.max(1, Math.floor(lamps.length / 20));
    return lamps.filter((_, i) => i % step === 0);
  }, [lamps]);

  return (
    <>
      <instancedMesh ref={poleRef} args={[poleGeo, undefined, lamps.length]}>
        <meshStandardMaterial color="#444444" metalness={0.8} roughness={0.3} />
      </instancedMesh>
      <instancedMesh ref={bulbRef} args={[bulbGeo, undefined, lamps.length]}>
        <meshStandardMaterial color="#ffddaa" emissive="#ffddaa" emissiveIntensity={0.8} />
      </instancedMesh>
      {litLamps.map((lamp, i) => (
        <pointLight
          key={i}
          position={[lamp.x, LAMP_HEIGHT + 0.3, lamp.z]}
          color="#ffddaa"
          intensity={1}
          distance={15}
          decay={2}
        />
      ))}
    </>
  );
}

function BenchInstances({ benches }: { benches: BenchData[] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => new THREE.BoxGeometry(1.5, 0.4, 0.5), []);

  useEffect(() => {
    if (!ref.current || !benches.length) return;
    const dummy = new THREE.Object3D();
    benches.forEach((bench, i) => {
      dummy.position.set(bench.x, 0.3, bench.z);
      dummy.rotation.set(0, bench.rotation, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      ref.current!.setMatrixAt(i, dummy.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  }, [benches]);

  if (!benches.length) return null;

  return (
    <instancedMesh ref={ref} args={[geo, undefined, benches.length]} castShadow>
      <meshStandardMaterial color="#5a3a1a" roughness={0.9} />
    </instancedMesh>
  );
}

export default function StreetFurniture({ data }: { data: FurnitureData }) {
  return (
    <group>
      <LampInstances lamps={data.lamps} />
      <BenchInstances benches={data.benches} />
    </group>
  );
}
