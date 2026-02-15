import { create } from 'zustand';
import type { BuildingState, CityData } from '../types/data';

interface GameState {
  // Data
  cityData: CityData | null;
  buildings: BuildingState[];

  // Game state
  started: boolean;
  destroyed: number;
  totalBuildings: number;
  comboCount: number;
  comboTimer: number;
  comboText: string;
  shakeAmount: number;
  nearestLandmark: string;
  landmarkOpacity: number;

  // Kaiju position (for minimap etc)
  kaijuX: number;
  kaijuZ: number;
  kaijuYaw: number;

  // Actions
  setCityData: (data: CityData) => void;
  setBuildings: (b: BuildingState[]) => void;
  startGame: () => void;
  destroyBuilding: (index: number) => void;
  addShake: (amount: number) => void;
  setShake: (amount: number) => void;
  setCombo: (text: string) => void;
  tickCombo: (dt: number) => void;
  setKaijuPos: (x: number, z: number, yaw: number) => void;
  setNearestLandmark: (name: string, opacity: number) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  cityData: null,
  buildings: [],
  started: false,
  destroyed: 0,
  totalBuildings: 0,
  comboCount: 0,
  comboTimer: 0,
  comboText: '',
  shakeAmount: 0,
  nearestLandmark: '',
  landmarkOpacity: 0,
  kaijuX: 0,
  kaijuZ: 0,
  kaijuYaw: 0,

  setCityData: (data) => set({ cityData: data }),
  setBuildings: (b) => set({ buildings: b, totalBuildings: b.length }),
  startGame: () => set({ started: true }),
  destroyBuilding: (index) => {
    const state = get();
    const b = state.buildings[index];
    if (!b || b.destroyed) return;
    b.destroyed = true;
    const newDestroyed = state.destroyed + 1;
    const newCombo = state.comboCount + 1;
    const comboText = b.name
      ? `💥 ${b.name} DESTROYED!`
      : newCombo > 2
        ? `🔥 ${newCombo}x COMBO!`
        : '';
    set({
      destroyed: newDestroyed,
      comboCount: newCombo,
      comboTimer: 2.5,
      comboText: comboText || state.comboText,
    });
  },
  addShake: (amount) => set((s) => ({ shakeAmount: Math.min(s.shakeAmount + amount, 3.0) })),
  setShake: (amount) => set({ shakeAmount: amount }),
  tickCombo: (dt) => {
    const s = get();
    if (s.comboTimer > 0) {
      const newTimer = s.comboTimer - dt;
      if (newTimer <= 0) {
        set({ comboTimer: 0, comboCount: 0, comboText: '' });
      } else {
        set({ comboTimer: newTimer });
      }
    }
    // Decay shake
    if (s.shakeAmount > 0) {
      const newShake = s.shakeAmount * 0.88;
      set({ shakeAmount: newShake < 0.01 ? 0 : newShake });
    }
  },
  setKaijuPos: (x, z, yaw) => set({ kaijuX: x, kaijuZ: z, kaijuYaw: yaw }),
  setNearestLandmark: (name, opacity) => set({ nearestLandmark: name, landmarkOpacity: opacity }),
}));
