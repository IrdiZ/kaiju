import { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { useGameStore } from './stores/gameStore';
import { useInput } from './hooks/useInput';
import type { CityData, BuildingState } from './types/data';
import { Sky } from './components/Sky';
import { Ground } from './components/Ground';
import { Water } from './components/Water';
import { Roads } from './components/Roads';
import { Buildings } from './components/Buildings';
import { Trees } from './components/Trees';
import { Kaiju } from './components/Kaiju';
import { TitleScreen } from './components/TitleScreen';
import { UI } from './components/UI';

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
      minX = Math.min(minX, p[0]);
      maxX2 = Math.max(maxX2, p[0]);
      minZ = Math.min(minZ, p[1]);
      maxZ = Math.max(maxZ, p[1]);
    }

    return {
      data: b,
      index: i,
      destroyed: false,
      centroid: [cx, -cz],
      radius: maxR + 2,
      name: b.n || '',
      isLandmark: !!b.l,
      style: b.s,
      poly: poly.map((p) => [p[0], -p[1]]),
      height: b.h,
      bbox: {
        minX,
        maxX: maxX2,
        minZ,
        maxZ,
        w: maxX2 - minX,
        d: maxZ - minZ,
      },
    };
  });
}

function Scene({ buildings, cityData, physicsWorld, inputRef }: {
  buildings: BuildingState[];
  cityData: CityData;
  physicsWorld: CANNON.World;
  inputRef: React.MutableRefObject<any>;
}) {
  return (
    <>
      {/* Fog */}
      <fogExp2 attach="fog" args={[0xc8d8e8, 0.0006]} />

      {/* Lighting */}
      <ambientLight intensity={0.35} color={0x7799bb} />
      <directionalLight
        position={[300, 180, -200]}
        intensity={2.0}
        color={0xffeedd}
        castShadow
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-camera-left={-400}
        shadow-camera-right={400}
        shadow-camera-top={400}
        shadow-camera-bottom={-400}
        shadow-camera-near={1}
        shadow-camera-far={1000}
        shadow-bias={-0.001}
        shadow-normalBias={0.02}
      />
      <hemisphereLight args={[0x88aadd, 0x446622, 0.5]} />
      <directionalLight position={[-200, 100, 200]} intensity={0.4} color={0xaabbdd} />

      <Sky />
      <Ground />
      <Water />
      <Roads roads={cityData.roads} />
      <Buildings buildings={buildings} physicsWorld={physicsWorld} />
      <Trees landmarks={cityData.landmarks} buildings={buildings} />
      <Kaiju inputRef={inputRef} physicsWorld={physicsWorld} buildings={buildings} />

      {/* Post-processing */}
      <EffectComposer>
        <Bloom luminanceThreshold={0.9} luminanceSmoothing={0.4} intensity={0.15} />
      </EffectComposer>
    </>
  );
}

export default function App() {
  const [cityData, setCityData] = useState<CityData | null>(null);
  const [loading, setLoading] = useState(true);
  const inputRef = useInput();
  const started = useGameStore((s) => s.started);

  const physicsWorld = useMemo(() => {
    const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -20, 0) });
    world.broadphase = new CANNON.SAPBroadphase(world);
    world.allowSleep = true;
    (world.solver as any).iterations = 5;

    // Ground
    const groundBody = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    world.addBody(groundBody);

    return world;
  }, []);

  const buildings = useMemo(() => {
    if (!cityData) return [];
    const processed = processBuildingData(cityData);
    useGameStore.getState().setBuildings(processed);
    return processed;
  }, [cityData]);

  useEffect(() => {
    fetch('/data.json')
      .then((r) => r.json())
      .then((data: CityData) => {
        setCityData(data);
        useGameStore.getState().setCityData(data);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ff4400',
          fontSize: 24,
          fontFamily: "'Segoe UI', sans-serif",
        }}
      >
        LOADING MAASTRICHT...
      </div>
    );
  }

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { overflow: hidden; background: #000; font-family: 'Segoe UI', sans-serif; }
        canvas { display: block; }
        @keyframes pulse { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
      `}</style>

      <Canvas
        shadows
        camera={{ fov: 65, near: 0.5, far: 2500 }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
        }}
        style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%' }}
      >
        {cityData && (
          <Scene
            buildings={buildings}
            cityData={cityData}
            physicsWorld={physicsWorld}
            inputRef={inputRef}
          />
        )}
      </Canvas>

      <TitleScreen />
      {started && <UI buildings={buildings} />}
    </>
  );
}
