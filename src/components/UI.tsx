import { useGameStore } from '../stores/gameStore';
import { Minimap } from './Minimap';
import type { BuildingState } from '../types/data';

interface UIProps {
  buildings: BuildingState[];
}

export function UI({ buildings }: UIProps) {
  const started = useGameStore((s) => s.started);
  const destroyed = useGameStore((s) => s.destroyed);
  const totalBuildings = useGameStore((s) => s.totalBuildings);
  const comboText = useGameStore((s) => s.comboText);
  const nearestLandmark = useGameStore((s) => s.nearestLandmark);
  const landmarkOpacity = useGameStore((s) => s.landmarkOpacity);

  if (!started) return null;

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', pointerEvents: 'none' }}>
      {/* Score */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          color: '#ff4400',
          fontSize: 28,
          fontWeight: 'bold',
          textShadow: '0 0 10px #000, 0 0 20px #ff2200',
          letterSpacing: 2,
          fontFamily: "'Segoe UI', sans-serif",
        }}
      >
        {destroyed} / {totalBuildings}
      </div>

      {/* Crosshair */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%,-50%)',
          width: 30,
          height: 30,
          border: '2px solid rgba(255,68,0,0.6)',
          borderRadius: '50%',
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: 2,
            height: 10,
            background: 'rgba(255,68,0,0.6)',
            top: -8,
            left: 13,
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: 10,
            height: 2,
            background: 'rgba(255,68,0,0.6)',
            top: 13,
            left: -8,
          }}
        />
      </div>

      {/* Combo */}
      {comboText && (
        <div
          style={{
            position: 'absolute',
            top: 70,
            left: '50%',
            transform: 'translateX(-50%)',
            color: '#ffaa00',
            fontSize: 36,
            fontWeight: 'bold',
            textShadow: '0 0 15px #ff6600',
            fontFamily: "'Segoe UI', sans-serif",
          }}
        >
          {comboText}
        </div>
      )}

      {/* Landmark label */}
      {nearestLandmark && (
        <div
          style={{
            position: 'absolute',
            top: 120,
            left: '50%',
            transform: 'translateX(-50%)',
            color: '#fff',
            fontSize: 16,
            opacity: landmarkOpacity,
            textShadow: '0 0 8px #000',
            letterSpacing: 1,
            fontFamily: "'Segoe UI', sans-serif",
          }}
        >
          {nearestLandmark}
        </div>
      )}

      {/* Minimap */}
      <Minimap buildings={buildings} />

      {/* Instructions */}
      <div
        style={{
          position: 'absolute',
          bottom: 30,
          left: '50%',
          transform: 'translateX(-50%)',
          color: '#fff',
          fontSize: 14,
          textAlign: 'center',
          opacity: 0.7,
          textShadow: '0 0 5px #000',
          fontFamily: "'Segoe UI', sans-serif",
        }}
      >
        WASD — Move &nbsp;|&nbsp; MOUSE — Look &nbsp;|&nbsp; CLICK — Smash &nbsp;|&nbsp; SHIFT — Sprint &nbsp;|&nbsp; SPACE — Stomp
      </div>
    </div>
  );
}
