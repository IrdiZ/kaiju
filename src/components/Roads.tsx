import { useMemo } from 'react';
import * as THREE from 'three';
import type { RoadData } from '../types/data';
import { createAsphaltTexture, createCobbleTexture, createPavingTexture } from '../textures/procedural';

interface RoadsProps {
  roads: RoadData[];
}

export function Roads({ roads }: RoadsProps) {
  const { geometries, materials } = useMemo(() => {
    const asphaltTex = createAsphaltTexture();
    const cobbleTex = createCobbleTexture();
    const pavingTex = createPavingTexture();

    const mats: Record<string, THREE.MeshStandardMaterial> = {
      asphalt: new THREE.MeshStandardMaterial({ map: asphaltTex, roughness: 0.85, metalness: 0.05 }),
      cobble: new THREE.MeshStandardMaterial({ map: cobbleTex, roughness: 0.9, metalness: 0.02 }),
      paving: new THREE.MeshStandardMaterial({ map: pavingTex, roughness: 0.85, metalness: 0.03 }),
    };

    // Merge all road segments into per-material merged geometries
    const geosByMat: Record<string, THREE.BufferGeometry[]> = { asphalt: [], cobble: [], paving: [] };

    for (const road of roads) {
      const pts = road.pts;
      const w = road.w;
      const matKey = road.t in mats ? road.t : 'asphalt';

      for (let i = 0; i < pts.length - 1; i++) {
        const x1 = pts[i][0], z1 = -pts[i][1];
        const x2 = pts[i + 1][0], z2 = -pts[i + 1][1];
        const dx = x2 - x1, dz = z2 - z1;
        const len = Math.sqrt(dx * dx + dz * dz);
        if (len < 0.5) continue;

        const nx = -dz / len, nz = dx / len;
        const hw = w / 2;

        const geo = new THREE.BufferGeometry();
        const verts = new Float32Array([
          x1 + nx * hw, 0.08, z1 + nz * hw,
          x1 - nx * hw, 0.08, z1 - nz * hw,
          x2 + nx * hw, 0.08, z2 + nz * hw,
          x2 - nx * hw, 0.08, z2 - nz * hw,
        ]);
        const uvs = new Float32Array([0, 0, 1, 0, 0, len / w, 1, len / w]);
        geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
        geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
        geo.setIndex([0, 1, 2, 1, 3, 2]);
        geo.computeVertexNormals();
        geosByMat[matKey].push(geo);
      }
    }

    // Merge geometries per material
    const merged: { geo: THREE.BufferGeometry; mat: THREE.MeshStandardMaterial }[] = [];
    for (const key of Object.keys(geosByMat)) {
      const geos = geosByMat[key];
      if (geos.length === 0) continue;
      const mergedGeo = mergeBufferGeometries(geos);
      if (mergedGeo) {
        merged.push({ geo: mergedGeo, mat: mats[key] });
      }
      // Dispose individual geometries
      for (const g of geos) g.dispose();
    }

    return { geometries: merged, materials: mats };
  }, [roads]);

  return (
    <>
      {geometries.map((item, i) => (
        <mesh key={i} geometry={item.geo} material={item.mat} receiveShadow />
      ))}
    </>
  );
}

// Simple merge utility
function mergeBufferGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry | null {
  if (geometries.length === 0) return null;

  let totalVerts = 0;
  let totalIndices = 0;
  for (const geo of geometries) {
    totalVerts += geo.getAttribute('position').count;
    totalIndices += geo.index ? geo.index.count : 0;
  }

  const positions = new Float32Array(totalVerts * 3);
  const uvs = new Float32Array(totalVerts * 2);
  const normals = new Float32Array(totalVerts * 3);
  const indices = new Uint32Array(totalIndices);

  let vertOffset = 0;
  let idxOffset = 0;
  let vertCount = 0;

  for (const geo of geometries) {
    const pos = geo.getAttribute('position');
    const uv = geo.getAttribute('uv');
    const norm = geo.getAttribute('normal');
    const idx = geo.index;

    for (let i = 0; i < pos.count; i++) {
      positions[(vertCount + i) * 3] = pos.getX(i);
      positions[(vertCount + i) * 3 + 1] = pos.getY(i);
      positions[(vertCount + i) * 3 + 2] = pos.getZ(i);
      if (uv) {
        uvs[(vertCount + i) * 2] = uv.getX(i);
        uvs[(vertCount + i) * 2 + 1] = uv.getY(i);
      }
      if (norm) {
        normals[(vertCount + i) * 3] = norm.getX(i);
        normals[(vertCount + i) * 3 + 1] = norm.getY(i);
        normals[(vertCount + i) * 3 + 2] = norm.getZ(i);
      }
    }

    if (idx) {
      for (let i = 0; i < idx.count; i++) {
        indices[idxOffset + i] = idx.getX(i) + vertCount;
      }
      idxOffset += idx.count;
    }

    vertCount += pos.count;
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  merged.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  merged.setIndex(new THREE.BufferAttribute(indices, 1));

  return merged;
}
