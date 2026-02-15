import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';

const SIZE = 160;
const SCALE = 0.25; // world units to pixels
const GRID = 40;

export default function CameraMinimap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { camera } = useThree();

  useFrame(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = 'rgba(10, 10, 20, 0.85)';
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= SIZE; i += GRID) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, SIZE); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(SIZE, i); ctx.stroke();
    }

    // Camera dot
    const cx = SIZE / 2 + camera.position.x * SCALE;
    const cy = SIZE / 2 - camera.position.z * SCALE;

    // Direction
    const fc = (window as any).__flyCamera;
    const yaw = fc?.yaw?.current ?? 0;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-yaw);

    // Triangle indicator
    ctx.fillStyle = '#00ffaa';
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(-5, 5);
    ctx.lineTo(5, 5);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  });

  return (
    <Html fullscreen style={{ pointerEvents: 'none' }}>
      <canvas
        ref={canvasRef}
        width={SIZE}
        height={SIZE}
        style={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          width: SIZE,
          height: SIZE,
          borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.15)',
          pointerEvents: 'none',
        }}
      />
    </Html>
  );
}
