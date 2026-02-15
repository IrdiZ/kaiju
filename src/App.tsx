import { useState, useEffect, useMemo, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import type { CityData, BuildingState } from './types/data';

// Scene components
import { AtmosphericSky } from './components/AtmosphericSky';
import { Lighting } from './components/Lighting';
import { PostProcessing } from './components/PostProcessing';
import Terrain from './components/Terrain';
import { Water } from './components/Water';
import { Roads } from './components/Roads';
import CityBuildings from './components/CityBuildings';
import Vegetation from './components/Vegetation';
import StreetFurniture from './components/StreetFurniture';
import FlyCamera from './components/FlyCamera';
import CameraMinimap from './components/CameraMinimap';
import CameraHUD from './components/CameraHUD';

function processBuildingData(data: CityData): BuildingState[] {
  return data.buildings.map((b, i) => {
    const poly = b.p;
    let cx = 0, cz = 0;
    for (const p of poly) { cx += p[0]; cz += p[1]; }
    cx /= poly.length; cz /= poly.length;

    let maxR = 0;
    let minX = Infinity, maxX2 = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const p of poly) {
      const dr = Math.sqrt((p[0] - cx) ** 2 + (p[1] - cz) ** 2);
      maxR = Math.max(maxR, dr);
      minX = Math.min(minX, p[0]); maxX2 = Math.max(maxX2, p[0]);
      minZ = Math.min(minZ, p[1]); maxZ = Math.max(maxZ, p[1]);
    }

    return {
      data: b, index: i, destroyed: false,
      centroid: [cx, -cz] as [number, number],
      radius: maxR + 2,
      name: b.n || '', isLandmark: !!b.l, style: b.s,
      poly: poly.map(p => [p[0], -p[1]]),
      height: b.h,
      bbox: { minX, maxX: maxX2, minZ, maxZ, w: maxX2 - minX, d: maxZ - minZ },
    };
  });
}

interface VegetationData {
  trees: { x: number; z: number; type: 'deciduous' | 'conifer' | 'ornamental' }[];
  parks: { name: string; polygon: [number, number][] }[];
  grassAreas: { polygon: [number, number][] }[];
}

interface FurnitureData {
  lamps: { x: number; z: number }[];
  benches: { x: number; z: number; angle: number }[];
}

function Scene({ buildings, cityData, vegData, furnitureData }: {
  buildings: BuildingState[];
  cityData: CityData;
  vegData: VegetationData | null;
  furnitureData: FurnitureData | null;
}) {
  return (
    <>
      <fogExp2 attach="fog" args={[0xc8d8e8, 0.0004]} />

      <Suspense fallback={null}>
        <AtmosphericSky />
      </Suspense>
      <Lighting />

      <Terrain />
      <Water />
      <Roads roads={cityData.roads} />
      <CityBuildings buildings={buildings} />

      {vegData && <Vegetation data={vegData} />}
      {furnitureData && <StreetFurniture data={furnitureData} />}

      <FlyCamera />
      <CameraMinimap />
      <CameraHUD />

      <PostProcessing />
    </>
  );
}

export default function App() {
  const [cityData, setCityData] = useState<CityData | null>(null);
  const [vegData, setVegData] = useState<VegetationData | null>(null);
  const [furnitureData, setFurnitureData] = useState<FurnitureData | null>(null);
  const [loading, setLoading] = useState(true);

  const buildings = useMemo(() => {
    if (!cityData) return [];
    return processBuildingData(cityData);
  }, [cityData]);

  useEffect(() => {
    Promise.all([
      fetch('/data.json').then(r => r.json()),
      fetch('/vegetation.json').then(r => r.json()).catch(() => null),
    ]).then(([city, veg]) => {
      setCityData(city);
      if (veg) {
        setVegData({ trees: veg.trees || [], parks: veg.parks || [], grassAreas: veg.grassAreas || [] });
        if (veg.furniture) {
          setFurnitureData({ lamps: veg.furniture.lamps || [], benches: veg.furniture.benches || [] });
        }
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
        background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: 20, fontFamily: "'Segoe UI', sans-serif",
        flexDirection: 'column', gap: 12,
      }}>
        <div style={{ fontSize: 36, letterSpacing: 4 }}>MAASTRICHT</div>
        <div style={{ opacity: 0.6 }}>Loading city data...</div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { overflow: hidden; background: #000; }
      `}</style>
      <Canvas
        shadows
        camera={{ fov: 65, near: 0.5, far: 5000 }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
        }}
        style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%' }}
      >
        {cityData && (
          <Scene buildings={buildings} cityData={cityData} vegData={vegData} furnitureData={furnitureData} />
        )}
      </Canvas>
    </>
  );
}
