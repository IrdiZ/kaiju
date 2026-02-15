import { useRef, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const DEG85 = (85 * Math.PI) / 180;
const LERP = 0.1;
const SENSITIVITY = 0.002;
const ORBIT_RADIUS = 300;
const ORBIT_SPEED = 0.05;
const ORBIT_ALT = 200;
const ORBIT_ALT_VAR = 30;

interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  fast: boolean;
}

export default function FlyCamera() {
  const { camera, gl } = useThree();

  const input = useRef<InputState>({ forward: false, backward: false, left: false, right: false, up: false, down: false, fast: false });
  const velocity = useRef(new THREE.Vector3());
  const yaw = useRef(0);
  const pitch = useRef(0);
  const locked = useRef(false);
  const baseSpeed = useRef(30);
  const cinematic = useRef(false);
  const cinematicT = useRef(0);
  const cinematicBlend = useRef(0);

  // Expose state for HUD/minimap
  useEffect(() => {
    (window as any).__flyCamera = { yaw, pitch, baseSpeed, cinematic, velocity };
  }, []);

  // Initial position — Markt square, Maastricht
  useEffect(() => {
    // Markt center is at approximately x=150, z=-360 in game coords
    camera.position.set(150, 15, -320);
    camera.lookAt(150, 10, -380);
    const dir = new THREE.Vector3(150, 10, -380).sub(camera.position).normalize();
    yaw.current = Math.atan2(-dir.x, -dir.z);
    pitch.current = Math.asin(dir.y);
  }, [camera]);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!locked.current) return;
    yaw.current -= e.movementX * SENSITIVITY;
    pitch.current -= e.movementY * SENSITIVITY;
    pitch.current = Math.max(-DEG85, Math.min(DEG85, pitch.current));
  }, []);

  const onWheel = useCallback((e: WheelEvent) => {
    baseSpeed.current = Math.max(5, Math.min(200, baseSpeed.current - e.deltaY * 0.05));
  }, []);

  const keyMap: Record<string, keyof InputState> = { w: 'forward', s: 'backward', a: 'left', d: 'right', q: 'down', e: 'up' };

  const onKeyDown = useCallback((e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (k === 'shift') { input.current.fast = true; return; }
    if (k === 'c') { cinematic.current = !cinematic.current; return; }
    const mapped = keyMap[k];
    if (mapped) input.current[mapped] = true;
  }, []);

  const onKeyUp = useCallback((e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (k === 'shift') { input.current.fast = false; return; }
    const mapped = keyMap[k];
    if (mapped) input.current[mapped] = false;
  }, []);

  const onClick = useCallback(() => {
    gl.domElement.requestPointerLock();
  }, [gl]);

  const onPointerLockChange = useCallback(() => {
    locked.current = document.pointerLockElement === gl.domElement;
  }, [gl]);

  useEffect(() => {
    const el = gl.domElement;
    el.addEventListener('click', onClick);
    el.addEventListener('wheel', onWheel, { passive: true });
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('pointerlockchange', onPointerLockChange);
    return () => {
      el.removeEventListener('click', onClick);
      el.removeEventListener('wheel', onWheel);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
    };
  }, [gl, onClick, onWheel, onMouseMove, onKeyDown, onKeyUp, onPointerLockChange]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    const blend = cinematic.current
      ? Math.min(1, cinematicBlend.current + dt * 2)
      : Math.max(0, cinematicBlend.current - dt * 2);
    cinematicBlend.current = blend;

    // === Manual flight ===
    const speed = baseSpeed.current * (input.current.fast ? 3 : 1);
    const inp = input.current;
    const desired = new THREE.Vector3(
      (inp.right ? 1 : 0) - (inp.left ? 1 : 0),
      (inp.up ? 1 : 0) - (inp.down ? 1 : 0),
      (inp.backward ? 1 : 0) - (inp.forward ? 1 : 0)
    );
    if (desired.lengthSq() > 0) desired.normalize().multiplyScalar(speed);

    velocity.current.lerp(desired, LERP);

    // Build manual orientation
    const euler = new THREE.Euler(pitch.current, yaw.current, 0, 'YXZ');
    const manualQuat = new THREE.Quaternion().setFromEuler(euler);

    // Move in camera-local space
    const move = velocity.current.clone().multiplyScalar(dt).applyQuaternion(manualQuat);
    const manualPos = camera.position.clone().add(move);

    if (blend < 0.001) {
      // Pure manual
      camera.position.copy(manualPos);
      camera.quaternion.copy(manualQuat);
    } else {
      // === Cinematic orbit ===
      cinematicT.current += dt * ORBIT_SPEED;
      const t = cinematicT.current;
      const cx = Math.sin(t) * ORBIT_RADIUS;
      const cz = Math.cos(t) * ORBIT_RADIUS;
      const cy = ORBIT_ALT + Math.sin(t * 0.7) * ORBIT_ALT_VAR;
      const cinematicPos = new THREE.Vector3(cx, cy, cz);

      const lookDir = new THREE.Vector3(-cx, -cy, -cz).normalize();
      const cinematicQuat = new THREE.Quaternion().setFromRotationMatrix(
        new THREE.Matrix4().lookAt(cinematicPos, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0))
      );

      if (blend > 0.999) {
        camera.position.copy(cinematicPos);
        camera.quaternion.copy(cinematicQuat);
      } else {
        camera.position.lerpVectors(manualPos, cinematicPos, blend);
        camera.quaternion.slerpQuaternions(manualQuat, cinematicQuat, blend);
      }

      // Sync yaw/pitch from cinematic so transition back is smooth
      if (blend > 0.5) {
        const e = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
        yaw.current = e.y;
        pitch.current = e.x;
      }
    }
  });

  return null;
}
