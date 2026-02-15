import { useRef, useEffect } from 'react';
import { useGameStore } from '../stores/gameStore';
import type { BuildingState } from '../types/data';

interface MinimapProps {
  buildings: BuildingState[];
}

export function Minimap({ buildings }: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const s = 160;

    const draw = () => {
      const state = useGameStore.getState();
      const px = state.kaijuX;
      const pz = state.kaijuZ;
      const yaw = state.kaijuYaw;
      const scale = 0.12;

      ctx.fillStyle = '#0a1a0a';
      ctx.fillRect(0, 0, s, s);

      // Water
      ctx.fillStyle = 'rgba(30,80,120,0.5)';
      const wx = (320 - px) * scale + s / 2;
      ctx.fillRect(wx - 5, 0, 10, s);

      // Buildings
      for (const b of buildings) {
        const mx = (b.centroid[0] - px) * scale + s / 2;
        const mz = (b.centroid[1] - pz) * scale + s / 2;
        if (mx < -5 || mx > s + 5 || mz < -5 || mz > s + 5) continue;

        if (b.destroyed) ctx.fillStyle = '#3a1010';
        else if (b.isLandmark) ctx.fillStyle = '#ffaa44';
        else if (b.style === 'church') ctx.fillStyle = '#ddcc88';
        else ctx.fillStyle = '#887766';

        const bsz = Math.max(2, (b.radius || 5) * scale);
        ctx.fillRect(mx - bsz / 2, mz - bsz / 2, bsz, bsz);
      }

      // Kaiju dot
      ctx.fillStyle = '#ff4400';
      ctx.beginPath();
      ctx.arc(s / 2, s / 2, 4, 0, Math.PI * 2);
      ctx.fill();

      // Direction
      ctx.strokeStyle = '#ff4400';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(s / 2, s / 2);
      ctx.lineTo(s / 2 - Math.sin(yaw) * 14, s / 2 - Math.cos(yaw) * 14);
      ctx.stroke();

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [buildings]);

  return (
    <canvas
      ref={canvasRef}
      width={160}
      height={160}
      style={{
        position: 'absolute',
        bottom: 20,
        right: 20,
        width: 160,
        height: 160,
        border: '2px solid rgba(255,68,0,0.5)',
        borderRadius: 4,
        background: 'rgba(0,0,0,0.6)',
      }}
    />
  );
}
