import { useEffect, useRef } from 'react';

interface InputState {
  keys: Record<string, boolean>;
  yaw: number;
  pitch: number;
  clicking: boolean;
}

export function useInput() {
  const state = useRef<InputState>({
    keys: {},
    yaw: 0,
    pitch: -0.3,
    clicking: false,
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      state.current.keys[e.code] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      state.current.keys[e.code] = false;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!document.pointerLockElement) return;
      state.current.yaw -= e.movementX * 0.002;
      state.current.pitch -= e.movementY * 0.002;
      state.current.pitch = Math.max(-0.8, Math.min(0.5, state.current.pitch));
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('mousemove', onMouseMove);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      document.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  return state;
}
