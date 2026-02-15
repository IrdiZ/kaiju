import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';

export default function CameraHUD() {
  const { camera } = useThree();
  const ref = useRef<HTMLDivElement>(null);

  useFrame(() => {
    if (!ref.current) return;
    const fc = (window as any).__flyCamera;
    const speed = fc?.baseSpeed?.current ?? 30;
    const isCinematic = fc?.cinematic?.current ?? false;
    const x = camera.position.x.toFixed(1);
    const z = camera.position.z.toFixed(1);
    const alt = camera.position.y.toFixed(1);

    ref.current.innerHTML = `
      <div>POS ${x}, ${z}</div>
      <div>ALT ${alt}m</div>
      <div>SPD ${speed.toFixed(0)} m/s</div>
      ${isCinematic ? '<div style="color:#00ffaa">● CINEMATIC</div>' : '<div style="opacity:0.5">Press C for cinematic mode</div>'}
    `;
  });

  return (
    <Html fullscreen style={{ pointerEvents: 'none' }}>
      <div
        ref={ref}
        style={{
          position: 'fixed',
          bottom: 16,
          left: 16,
          fontFamily: 'monospace',
          fontSize: 13,
          color: 'white',
          textShadow: '0 1px 4px rgba(0,0,0,0.8)',
          lineHeight: 1.6,
          pointerEvents: 'none',
          background: 'rgba(0,0,0,0.3)',
          padding: '8px 12px',
          borderRadius: 6,
        }}
      />
    </Html>
  );
}
