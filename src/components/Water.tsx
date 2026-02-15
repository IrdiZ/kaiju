import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface WaterPolygon {
  pts: number[][];
  name: string;
  type: string;
}

interface WaterLine {
  pts: number[][];
  name: string;
  type: string;
  width: number;
}

interface WaterData {
  polygons: WaterPolygon[];
  lines: WaterLine[];
}

// Animated water shader
const waterVertexShader = `
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  
  void main() {
    vUv = uv;
    vec3 pos = position;
    
    // Wave displacement
    float wave1 = sin(pos.x * 0.05 + uTime * 0.8) * 0.3;
    float wave2 = sin(pos.z * 0.08 + uTime * 1.2) * 0.2;
    float wave3 = sin((pos.x + pos.z) * 0.03 + uTime * 0.5) * 0.4;
    pos.y += wave1 + wave2 + wave3;
    
    // Compute perturbed normal from wave derivatives
    float dx = cos(pos.x * 0.05 + uTime * 0.8) * 0.05 * 0.3
             + cos((pos.x + pos.z) * 0.03 + uTime * 0.5) * 0.03 * 0.4;
    float dz = cos(pos.z * 0.08 + uTime * 1.2) * 0.08 * 0.2
             + cos((pos.x + pos.z) * 0.03 + uTime * 0.5) * 0.03 * 0.4;
    vNormal = normalize(vec3(-dx, 1.0, -dz));
    
    vec4 worldPos = modelMatrix * vec4(pos, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const waterFragmentShader = `
  uniform float uTime;
  uniform vec3 uSunDir;
  uniform vec3 uCameraPos;
  
  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  
  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(uCameraPos - vWorldPos);
    vec3 sunDir = normalize(uSunDir);
    
    // Fresnel
    float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.0);
    fresnel = mix(0.3, 1.0, fresnel);
    
    // Deep water color
    vec3 deepColor = vec3(0.04, 0.18, 0.28);
    vec3 shallowColor = vec3(0.1, 0.35, 0.45);
    vec3 waterColor = mix(deepColor, shallowColor, fresnel * 0.5);
    
    // Sky reflection (fake)
    vec3 skyColor = vec3(0.5, 0.65, 0.8);
    waterColor = mix(waterColor, skyColor, fresnel * 0.6);
    
    // Sun specular
    vec3 halfDir = normalize(sunDir + viewDir);
    float spec = pow(max(dot(normal, halfDir), 0.0), 256.0);
    vec3 specColor = vec3(1.0, 0.95, 0.8) * spec * 2.0;
    
    // Caustic-like shimmer
    float caustic = sin(vWorldPos.x * 0.3 + uTime * 2.0) * sin(vWorldPos.z * 0.4 + uTime * 1.5);
    caustic = caustic * caustic * 0.05;
    
    // Flow lines
    float flow = sin(vWorldPos.z * 0.15 + uTime * 0.6 + vWorldPos.x * 0.05) * 0.03;
    
    vec3 finalColor = waterColor + specColor + vec3(caustic) + vec3(flow * 0.5, flow, flow * 0.8);
    
    // Slight transparency at edges
    float alpha = mix(0.85, 0.95, fresnel);
    
    gl_FragColor = vec4(finalColor, alpha);
  }
`;

export function Water() {
  const { scene, camera } = useThree();
  const meshesRef = useRef<THREE.Mesh[]>([]);
  const uniformsRef = useRef({
    uTime: { value: 0 },
    uSunDir: { value: new THREE.Vector3(300, 180, -200).normalize() },
    uCameraPos: { value: new THREE.Vector3() },
  });
  const [waterData, setWaterData] = useState<WaterData | null>(null);

  // Load water geometry
  useEffect(() => {
    fetch('/water-markt.json')
      .then((r) => r.json())
      .then((data: WaterData) => setWaterData(data))
      .catch(() => {
        // Fallback if water.json doesn't exist
        setWaterData({ polygons: [], lines: [] });
      });
  }, []);

  // Build water meshes
  useEffect(() => {
    if (!waterData) return;

    const material = new THREE.ShaderMaterial({
      vertexShader: waterVertexShader,
      fragmentShader: waterFragmentShader,
      uniforms: uniformsRef.current,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const meshes: THREE.Mesh[] = [];

    // River polygons (actual OSM shapes)
    for (const poly of waterData.polygons) {
      if (poly.pts.length < 3) continue;
      const shape = new THREE.Shape();
      shape.moveTo(poly.pts[0][0], -poly.pts[0][1]);
      for (let i = 1; i < poly.pts.length; i++) {
        shape.lineTo(poly.pts[i][0], -poly.pts[i][1]);
      }
      shape.closePath();

      try {
        const geo = new THREE.ShapeGeometry(shape, 4);
        geo.rotateX(-Math.PI / 2);
        const mesh = new THREE.Mesh(geo, material);
        mesh.position.y = 0.3;
        mesh.renderOrder = 1;
        scene.add(mesh);
        meshes.push(mesh);
      } catch { /* skip invalid polygons */ }
    }

    // Stream lines (as wide strips)
    for (const line of waterData.lines) {
      if (line.pts.length < 2) continue;
      const w = line.width || 4;

      for (let i = 0; i < line.pts.length - 1; i++) {
        const x1 = line.pts[i][0], z1 = -line.pts[i][1];
        const x2 = line.pts[i + 1][0], z2 = -line.pts[i + 1][1];
        const dx = x2 - x1, dz = z2 - z1;
        const len = Math.sqrt(dx * dx + dz * dz);
        if (len < 0.5) continue;

        const nx = -dz / len, nz = dx / len;
        const hw = w / 2;

        const geo = new THREE.BufferGeometry();
        const verts = new Float32Array([
          x1 + nx * hw, 0, z1 + nz * hw,
          x1 - nx * hw, 0, z1 - nz * hw,
          x2 + nx * hw, 0, z2 + nz * hw,
          x2 - nx * hw, 0, z2 - nz * hw,
        ]);
        const uvs = new Float32Array([0, 0, 1, 0, 0, len / w, 1, len / w]);
        geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
        geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
        geo.setIndex([0, 1, 2, 1, 3, 2]);
        geo.computeVertexNormals();

        const mesh = new THREE.Mesh(geo, material);
        mesh.position.y = 0.25;
        mesh.renderOrder = 1;
        scene.add(mesh);
        meshes.push(mesh);
      }
    }

    // If no OSM water data, add fallback river strips
    if (waterData.polygons.length === 0 && waterData.lines.length === 0) {
      const maasGeo = new THREE.PlaneGeometry(80, 1200, 20, 60);
      maasGeo.rotateX(-Math.PI / 2);
      const maas = new THREE.Mesh(maasGeo, material);
      maas.position.set(320, 0.3, 30);
      maas.renderOrder = 1;
      scene.add(maas);
      meshes.push(maas);

      const jekerGeo = new THREE.PlaneGeometry(15, 400, 4, 20);
      jekerGeo.rotateX(-Math.PI / 2);
      const jeker = new THREE.Mesh(jekerGeo, material);
      jeker.position.set(-50, 0.25, -200);
      jeker.renderOrder = 1;
      scene.add(jeker);
      meshes.push(jeker);
    }

    meshesRef.current = meshes;

    return () => {
      for (const m of meshes) {
        scene.remove(m);
        m.geometry.dispose();
      }
    };
  }, [waterData, scene]);

  useFrame((_, dt) => {
    uniformsRef.current.uTime.value += dt;
    uniformsRef.current.uCameraPos.value.copy(camera.position);
  });

  return null;
}
