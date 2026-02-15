import { useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { useGameStore } from '../stores/gameStore';
import type { BuildingState } from '../types/data';

interface KaijuProps {
  inputRef: React.MutableRefObject<{
    keys: Record<string, boolean>;
    yaw: number;
    pitch: number;
    clicking: boolean;
  }>;
  physicsWorld: CANNON.World;
  buildings: BuildingState[];
}

export function Kaiju({ inputRef, physicsWorld, buildings }: KaijuProps) {
  const { scene, camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<CANNON.Body | null>(null);
  const partsRef = useRef<{
    armL: THREE.Mesh;
    armR: THREE.Mesh;
    legL: THREE.Mesh;
    legR: THREE.Mesh;
    footL: THREE.Mesh;
    footR: THREE.Mesh;
    tailParts: THREE.Mesh[];
  } | null>(null);
  const punchCooldown = useRef(0);

  const started = useGameStore((s) => s.started);
  const addShake = useGameStore((s) => s.addShake);
  const shakeAmount = useGameStore((s) => s.shakeAmount);
  const tickCombo = useGameStore((s) => s.tickCombo);
  const setKaijuPos = useGameStore((s) => s.setKaijuPos);
  const setNearestLandmark = useGameStore((s) => s.setNearestLandmark);

  // Create physics body
  useEffect(() => {
    const body = new CANNON.Body({
      mass: 500,
      shape: new CANNON.Cylinder(3.5, 3.5, 18, 8),
      position: new CANNON.Vec3(0, 10, 0),
      fixedRotation: true,
      linearDamping: 0.9,
    });
    physicsWorld.addBody(body);
    bodyRef.current = body;
    return () => { physicsWorld.removeBody(body); };
  }, [physicsWorld]);

  // Build kaiju model
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1a4a1a, roughness: 0.7, metalness: 0.15 });
    const bellyMat = new THREE.MeshStandardMaterial({ color: 0x3a6a2a, roughness: 0.8, metalness: 0.1 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x0f3510, roughness: 0.7, metalness: 0.2 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff4400 });
    const toothMat = new THREE.MeshStandardMaterial({ color: 0xeeeedd, roughness: 0.4 });
    const clawMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.3, metalness: 0.5 });
    const spineMat = new THREE.MeshStandardMaterial({ color: 0xff6600, roughness: 0.4, metalness: 0.3, emissive: new THREE.Color(0x331100) });
    const crossMat = new THREE.MeshStandardMaterial({ color: 0xddcc88, metalness: 0.7, roughness: 0.3 });
    const footMat = new THREE.MeshStandardMaterial({ color: 0x1a3a1a, roughness: 0.8 });

    // Torso
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(3.5, 9, 8, 16), bodyMat);
    torso.castShadow = true;
    group.add(torso);

    // Belly
    const belly = new THREE.Mesh(new THREE.CapsuleGeometry(2.8, 6, 6, 12), bellyMat);
    belly.position.z = 1.2;
    belly.scale.set(0.8, 0.9, 0.5);
    group.add(belly);

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(3.8, 12, 10), bodyMat);
    head.position.y = 8.5;
    head.scale.set(1, 0.8, 1.2);
    head.castShadow = true;
    group.add(head);

    // Brow ridges
    const browGeo = new THREE.BoxGeometry(3.5, 0.8, 2);
    const browL = new THREE.Mesh(browGeo, darkMat);
    browL.position.set(-1.2, 9.8, 2.5);
    browL.rotation.z = -0.2;
    group.add(browL);
    const browR = browL.clone();
    browR.position.x = 1.2;
    browR.rotation.z = 0.2;
    group.add(browR);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.7, 8, 8);
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-1.6, 9.3, 3.2);
    group.add(eyeL);
    const eyeR = eyeL.clone();
    eyeR.position.x = 1.6;
    group.add(eyeR);

    // Eye glow
    const eyeGlowL = new THREE.PointLight(0xff4400, 2, 8);
    eyeGlowL.position.copy(eyeL.position);
    group.add(eyeGlowL);
    const eyeGlowR = new THREE.PointLight(0xff4400, 2, 8);
    eyeGlowR.position.copy(eyeR.position);
    group.add(eyeGlowR);

    // Jaw
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.8, 3.5), darkMat);
    jaw.position.set(0, 6.3, 1.8);
    jaw.castShadow = true;
    group.add(jaw);

    // Teeth
    const toothGeo = new THREE.ConeGeometry(0.25, 0.8, 4);
    for (let i = 0; i < 8; i++) {
      const tooth = new THREE.Mesh(toothGeo, toothMat);
      tooth.position.set(-1.5 + i * 0.43, 7.2, 3.2);
      tooth.rotation.x = Math.PI;
      group.add(tooth);
    }

    // Arms
    const armGeo = new THREE.CapsuleGeometry(1.4, 5, 6, 8);
    const armL = new THREE.Mesh(armGeo, bodyMat);
    armL.position.set(-4.5, 1.5, 1);
    armL.rotation.z = 0.5;
    armL.rotation.x = -0.3;
    armL.castShadow = true;
    group.add(armL);
    const armR = new THREE.Mesh(armGeo, bodyMat);
    armR.position.set(4.5, 1.5, 1);
    armR.rotation.z = -0.5;
    armR.rotation.x = -0.3;
    armR.castShadow = true;
    group.add(armR);

    // Claws
    const clawGeo = new THREE.ConeGeometry(0.2, 1.2, 4);
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < 3; i++) {
        const claw = new THREE.Mesh(clawGeo, clawMat);
        claw.position.set(side * 5.2 + (i - 1) * 0.5, -1.8, 2.5);
        claw.rotation.x = -0.5;
        group.add(claw);
      }
    }

    // Legs
    const legGeo = new THREE.CapsuleGeometry(2, 4, 6, 8);
    const legL = new THREE.Mesh(legGeo, bodyMat);
    legL.position.set(-2.2, -6, 0);
    legL.castShadow = true;
    group.add(legL);
    const legR = new THREE.Mesh(legGeo, bodyMat);
    legR.position.set(2.2, -6, 0);
    legR.castShadow = true;
    group.add(legR);

    // Feet
    const footGeo = new THREE.BoxGeometry(3, 1.5, 4);
    const footL = new THREE.Mesh(footGeo, footMat);
    footL.position.set(-2.2, -8.5, 1);
    footL.castShadow = true;
    group.add(footL);
    const footR = new THREE.Mesh(footGeo, footMat);
    footR.position.set(2.2, -8.5, 1);
    footR.castShadow = true;
    group.add(footR);

    // Tail
    const tailParts: THREE.Mesh[] = [];
    for (let i = 0; i < 6; i++) {
      const r = 2.2 - i * 0.3;
      const seg = new THREE.Mesh(new THREE.SphereGeometry(r, 6, 6), bodyMat);
      seg.position.set(0, -1 - i * 0.5, -3 - i * 2.5);
      seg.castShadow = true;
      group.add(seg);
      tailParts.push(seg);
    }

    // Dorsal spines
    for (let i = 0; i < 7; i++) {
      const size = i < 3 ? 2.5 - i * 0.3 : 2.5 - (6 - i) * 0.3;
      const spine = new THREE.Mesh(new THREE.ConeGeometry(0.6, size, 4), spineMat);
      spine.position.set(0, 5.5 - i * 2, -2.5 - Math.max(0, i - 2) * 1.5);
      spine.rotation.x = -0.2 - i * 0.05;
      group.add(spine);
    }

    partsRef.current = { armL, armR, legL, legR, footL, footR, tailParts };
  }, []);

  // Click handler for smash
  useEffect(() => {
    const onClick = () => {
      if (!started) return;
      if (!document.pointerLockElement) {
        const canvas = document.querySelector('canvas');
        canvas?.requestPointerLock();
      } else {
        performSmash();
      }
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [started, buildings]);

  const performSmash = () => {
    if (punchCooldown.current > 0) return;
    punchCooldown.current = 0.3;

    // Punch animation
    if (partsRef.current) {
      const armR = partsRef.current.armR;
      armR.rotation.x = -1.5;
      armR.rotation.z = -0.1;
      setTimeout(() => {
        armR.rotation.x = -0.3;
        armR.rotation.z = -0.5;
      }, 300);
    }

    const body = bodyRef.current;
    if (!body) return;
    const yaw = inputRef.current.yaw;
    const dirX = -Math.sin(yaw);
    const dirZ = -Math.cos(yaw);
    const px = body.position.x;
    const pz = body.position.z;

    const destroy = (window as any).__destroyBuilding;
    if (!destroy) return;

    for (let i = 0; i < buildings.length; i++) {
      const b = buildings[i];
      if (b.destroyed) continue;
      const dx = b.centroid[0] - px;
      const dz = b.centroid[1] - pz;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const reach = (b.radius || (b.bbox.w / 2 + b.bbox.d / 2) / 2) + 12;
      if (dist < reach) {
        const dot = dx * dirX + dz * dirZ;
        if (dot > 0 || dist < 8) {
          destroy(i, px, pz);
        }
      }
    }

    addShake(0.3);
  };

  // Game loop
  useFrame((_, rawDt) => {
    if (!started) return;
    const dt = Math.min(rawDt, 0.05);
    const body = bodyRef.current;
    const group = groupRef.current;
    if (!body || !group) return;
    const input = inputRef.current;

    // Punch cooldown
    if (punchCooldown.current > 0) punchCooldown.current -= dt;

    // Movement
    const speed = input.keys['ShiftLeft'] || input.keys['ShiftRight'] ? 80 : 40;
    const moveDir = { x: 0, z: 0 };
    if (input.keys['KeyW']) { moveDir.x -= Math.sin(input.yaw) * speed; moveDir.z -= Math.cos(input.yaw) * speed; }
    if (input.keys['KeyS']) { moveDir.x += Math.sin(input.yaw) * speed; moveDir.z += Math.cos(input.yaw) * speed; }
    if (input.keys['KeyA']) { moveDir.x -= Math.cos(input.yaw) * speed; moveDir.z += Math.sin(input.yaw) * speed; }
    if (input.keys['KeyD']) { moveDir.x += Math.cos(input.yaw) * speed; moveDir.z -= Math.sin(input.yaw) * speed; }

    body.velocity.x = moveDir.x;
    body.velocity.z = moveDir.z;

    // Stomp
    if (input.keys['Space']) {
      input.keys['Space'] = false;
      addShake(2.0);
      // Flash
      const flash = document.createElement('div');
      flash.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(255,120,0,0.12);pointer-events:none;z-index:50;';
      document.body.appendChild(flash);
      setTimeout(() => flash.remove(), 80);

      const destroy = (window as any).__destroyBuilding;
      if (destroy) {
        for (let i = 0; i < buildings.length; i++) {
          const b = buildings[i];
          if (b.destroyed) continue;
          const dx = b.centroid[0] - body.position.x;
          const dz = b.centroid[1] - body.position.z;
          if (dx * dx + dz * dz < 625) destroy(i, body.position.x, body.position.z);
        }
      }
    }

    // Keep kaiju above ground
    if (body.position.y < 10) body.position.y = 10;
    body.velocity.y = Math.max(body.velocity.y, -20);

    // Physics step
    physicsWorld.step(1 / 60, dt, 3);

    // Sync group
    group.position.set(body.position.x, body.position.y, body.position.z);
    group.rotation.y = input.yaw;

    // Walking animation
    const walkSpeed = Math.sqrt(moveDir.x ** 2 + moveDir.z ** 2);
    if (walkSpeed > 5 && partsRef.current) {
      const t = performance.now() * 0.004;
      const { legL, legR, armL, armR, tailParts } = partsRef.current;
      legL.rotation.x = Math.sin(t) * 0.35;
      legR.rotation.x = -Math.sin(t) * 0.35;
      armL.rotation.x = -Math.sin(t) * 0.25 - 0.3;
      if (armR.rotation.x > -1) armR.rotation.x = Math.sin(t) * 0.25 - 0.3;
      group.position.y += Math.sin(t * 2) * 0.4;
      for (let i = 0; i < tailParts.length; i++) {
        tailParts[i].position.x = Math.sin(t + i * 0.5) * (0.5 + i * 0.3);
      }
    }

    // Auto-destroy on walk-through
    const destroy = (window as any).__destroyBuilding;
    if (destroy) {
      for (let i = 0; i < buildings.length; i++) {
        const b = buildings[i];
        if (b.destroyed) continue;
        const dx = b.centroid[0] - body.position.x;
        const dz = b.centroid[1] - body.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const collR = (b.radius || (b.bbox.w + b.bbox.d) / 4) + 4;
        if (dist < collR) destroy(i, body.position.x, body.position.z);
      }
    }

    // Nearest landmark
    let nearestName = '';
    let nearestDist = 80;
    for (const b of buildings) {
      if (!b.name || b.destroyed) continue;
      const dx = b.centroid[0] - body.position.x;
      const dz = b.centroid[1] - body.position.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < nearestDist) { nearestDist = d; nearestName = b.name; }
    }
    setNearestLandmark(nearestName, nearestName ? Math.max(0, 1 - nearestDist / 80) : 0);

    // Camera
    const camDist = 38;
    const camX = group.position.x + Math.sin(input.yaw) * camDist * Math.cos(input.pitch);
    const camY = group.position.y + 18 - input.pitch * 22;
    const camZ = group.position.z + Math.cos(input.yaw) * camDist * Math.cos(input.pitch);
    camera.position.set(camX, camY, camZ);
    camera.lookAt(group.position.x, group.position.y + 5, group.position.z);

    // Shake
    const shake = useGameStore.getState().shakeAmount;
    if (shake > 0) {
      camera.position.x += (Math.random() - 0.5) * shake * 2;
      camera.position.y += (Math.random() - 0.5) * shake * 1.5;
      camera.position.z += (Math.random() - 0.5) * shake * 2;
    }

    // Update store
    setKaijuPos(body.position.x, body.position.z, input.yaw);
    tickCombo(dt);

    // Move sun
    const sun = scene.children.find(c => (c as THREE.DirectionalLight).isDirectionalLight) as THREE.DirectionalLight | undefined;
    if (sun) {
      sun.position.set(group.position.x + 300, 180, group.position.z - 200);
      sun.target.position.copy(group.position);
      sun.target.updateMatrixWorld();
    }
  });

  return <group ref={groupRef} position={[0, 10, 0]} />;
}
