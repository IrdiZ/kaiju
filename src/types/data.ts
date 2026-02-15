export interface BuildingData {
  p: number[][];  // polygon vertices [x,z]
  h: number;       // height
  s: string;       // style
  l?: string;      // landmark type
  n?: string;      // name
}

export interface RoadData {
  pts: number[][];  // polyline points
  w: number;        // width
  t: string;        // type: asphalt/cobble/paving
}

export interface LandmarkData {
  x: number;
  z: number;
  c: string;  // category
  n: string;  // name
}

export interface CityData {
  buildings: BuildingData[];
  roads: RoadData[];
  landmarks: LandmarkData[];
}

export interface BuildingState {
  data: BuildingData;
  index: number;
  destroyed: boolean;
  centroid: [number, number];  // x, z (game coords)
  radius: number;
  name: string;
  isLandmark: boolean;
  style: string;
  poly: number[][];  // polygon in game coords (z negated)
  height: number;
  bbox: { minX: number; maxX: number; minZ: number; maxZ: number; w: number; d: number };
}
