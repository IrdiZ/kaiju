import { useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';

interface TerrainData {
  width: number;
  height: number;
  metersPerPixel: number;
  originX: number;
  originZ: number;
  minElevation: number;
  maxElevation: number;
  heightData: number[];
}

export default function Terrain() {
  const [terrainData, setTerrainData] = useState<TerrainData | null>(null);
  const [aerialTex, setAerialTex] = useState<THREE.Texture | null>(null);

  // Load terrain heightmap
  useEffect(() => {
    fetch('/terrain-markt.json')
      .then(r => r.json())
      .then(data => setTerrainData(data))
      .catch(() => console.warn('No terrain.json found'));
  }, []);

  // Load aerial texture
  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load('/textures/aerial/markt-ortho.jpg', tex => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.anisotropy = 16;
      setAerialTex(tex);
    }, undefined, () => console.warn('No aerial texture found'));
  }, []);

  const geometry = useMemo(() => {
    if (!terrainData) return null;
    const { width, height, metersPerPixel, originX, originZ, heightData } = terrainData;
    const totalW = width * metersPerPixel;
    const totalH = height * metersPerPixel;

    const geo = new THREE.PlaneGeometry(totalW, totalH, width - 1, height - 1);
    geo.rotateX(-Math.PI / 2);

    const posAttr = geo.getAttribute('position');
    for (let iz = 0; iz < height; iz++) {
      for (let ix = 0; ix < width; ix++) {
        const vertIdx = iz * width + ix;
        const elev = heightData[vertIdx] || 0;
        posAttr.setY(vertIdx, elev);
      }
    }
    posAttr.needsUpdate = true;
    geo.computeVertexNormals();

    return geo;
  }, [terrainData]);

  if (!geometry) {
    // Fallback flat ground with aerial or grass
    return (
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[600, 600]} />
        {aerialTex ? (
          <meshStandardMaterial map={aerialTex} roughness={0.95} metalness={0} />
        ) : (
          <meshStandardMaterial color={0x4a7a3a} roughness={0.95} metalness={0} />
        )}
      </mesh>
    );
  }

  return (
    <mesh geometry={geometry} receiveShadow>
      {aerialTex ? (
        <meshStandardMaterial
          map={aerialTex}
          roughness={0.92}
          metalness={0}
          envMapIntensity={0.3}
        />
      ) : (
        <meshStandardMaterial color={0x4a7a3a} roughness={0.95} metalness={0} />
      )}
    </mesh>
  );
}
