import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useLoader } from '@react-three/fiber';

interface TreeData { x: number; z: number; type: 'deciduous' | 'conifer' | 'ornamental'; }
interface ParkData { name: string; polygon: [number, number][]; }
interface GrassData { polygon: [number, number][]; }
interface VegetationData {
  trees: TreeData[];
  parks: ParkData[];
  grassAreas: GrassData[];
}

function seededRandom(seed: number) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

function polygonToShape(polygon: [number, number][]) {
  const shape = new THREE.Shape();
  if (polygon.length < 3) return shape;
  shape.moveTo(polygon[0][0], polygon[0][1]);
  for (let i = 1; i < polygon.length; i++) shape.lineTo(polygon[i][0], polygon[i][1]);
  shape.closePath();
  return shape;
}

function TreeInstances({ trees, type, canopyGeo, canopyColor, trunkHeight, canopyOffset }: {
  trees: TreeData[]; type: string;
  canopyGeo: THREE.BufferGeometry; canopyColor: string;
  trunkHeight: number; canopyOffset: number;
}) {
  const filtered = useMemo(() => trees.filter(t => t.type === type), [trees, type]);
  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const canopyRef = useRef<THREE.InstancedMesh>(null);
  const rng = useMemo(() => seededRandom(7), []);

  useEffect(() => {
    if (!trunkRef.current || !canopyRef.current || filtered.length === 0) return;
    const dummy = new THREE.Object3D();
    filtered.forEach((tree, i) => {
      const scale = 0.7 + rng() * 0.6;
      const rot = rng() * Math.PI * 2;
      // Trunk
      dummy.position.set(tree.x, trunkHeight * scale * 0.5, tree.z);
      dummy.rotation.set(0, rot, 0);
      dummy.scale.set(scale * 0.3, scale, scale * 0.3);
      dummy.updateMatrix();
      trunkRef.current!.setMatrixAt(i, dummy.matrix);
      // Canopy
      dummy.position.set(tree.x, canopyOffset * scale, tree.z);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      canopyRef.current!.setMatrixAt(i, dummy.matrix);
    });
    trunkRef.current.instanceMatrix.needsUpdate = true;
    canopyRef.current.instanceMatrix.needsUpdate = true;
  }, [filtered]);

  if (filtered.length === 0) return null;

  const trunkGeo = useMemo(() => new THREE.CylinderGeometry(0.15, 0.25, trunkHeight, 6), [trunkHeight]);

  return (
    <>
      <instancedMesh ref={trunkRef} args={[trunkGeo, undefined, filtered.length]} castShadow>
        <meshStandardMaterial color="#5a3a1a" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={canopyRef} args={[canopyGeo, undefined, filtered.length]} castShadow>
        <meshStandardMaterial color={canopyColor} roughness={0.8} />
      </instancedMesh>
    </>
  );
}

export default function Vegetation({ data }: { data: VegetationData }) {
  const deciduousGeo = useMemo(() => new THREE.SphereGeometry(2, 8, 6), []);
  const coniferGeo = useMemo(() => new THREE.ConeGeometry(1.5, 5, 6), []);
  const ornamentalGeo = useMemo(() => new THREE.SphereGeometry(1.2, 8, 6), []);

  return (
    <group>
      <TreeInstances trees={data.trees} type="deciduous" canopyGeo={deciduousGeo} canopyColor="#2d5a1e" trunkHeight={4} canopyOffset={5} />
      <TreeInstances trees={data.trees} type="conifer" canopyGeo={coniferGeo} canopyColor="#1a4a1a" trunkHeight={3} canopyOffset={5.5} />
      <TreeInstances trees={data.trees} type="ornamental" canopyGeo={ornamentalGeo} canopyColor="#3a7a2a" trunkHeight={2.5} canopyOffset={3.5} />

      {/* Parks */}
      {data.parks.map((park, i) => {
        const shape = polygonToShape(park.polygon);
        const geo = new THREE.ShapeGeometry(shape);
        geo.rotateX(-Math.PI / 2);
        return (
          <mesh key={`park-${i}`} geometry={geo} position={[0, 0.08, 0]} receiveShadow>
            <meshStandardMaterial color="#1a5c1a" roughness={0.95} />
          </mesh>
        );
      })}

      {/* Grass */}
      {data.grassAreas.map((area, i) => {
        const shape = polygonToShape(area.polygon);
        const geo = new THREE.ShapeGeometry(shape);
        geo.rotateX(-Math.PI / 2);
        return (
          <mesh key={`grass-${i}`} geometry={geo} position={[0, 0.05, 0]} receiveShadow>
            <meshStandardMaterial color="#2a6e2a" roughness={0.95} />
          </mesh>
        );
      })}
    </group>
  );
}
