import { useRef, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
// ContactShadows removed for performance
import * as THREE from 'three'

/**
 * Photorealistic lighting for Maastricht city scene.
 * Late afternoon sun with warm tones, hemisphere ambient, and bounce fill.
 */
export function Lighting() {
  const directionalRef = useRef<THREE.DirectionalLight>(null)

  // Match sun position from AtmosphericSky: elevation 25°, azimuth 210°
  const sunDirection = useMemo(() => {
    const elevation = 25 * (Math.PI / 180)
    const azimuth = 210 * (Math.PI / 180)
    return new THREE.Vector3(
      Math.cos(elevation) * Math.sin(azimuth),
      Math.sin(elevation),
      Math.cos(elevation) * Math.cos(azimuth)
    ).multiplyScalar(100)
  }, [])

  // Bounce fill from opposite direction (cooler)
  const bounceDirection = useMemo(() => {
    return sunDirection.clone().negate().setY(20)
  }, [sunDirection])

  const { gl } = useThree()

  // Enable soft shadows
  useMemo(() => {
    gl.shadowMap.enabled = true
    gl.shadowMap.type = THREE.PCFSoftShadowMap
  }, [gl])

  return (
    <>
      {/* Main sun light — warm afternoon */}
      <directionalLight
        ref={directionalRef}
        position={sunDirection}
        color="#ffeedd"
        intensity={2.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={500}
        shadow-camera-left={-150}
        shadow-camera-right={150}
        shadow-camera-top={150}
        shadow-camera-bottom={-150}
        shadow-bias={-0.0002}
        shadow-normalBias={0.02}
      />

      {/* Hemisphere ambient: sky blue top, warm ground bottom */}
      <hemisphereLight
        color="#87ceeb"
        groundColor="#5a7a3a"
        intensity={0.6}
      />

      {/* Subtle ambient fill for deep shadows */}
      <ambientLight color="#304060" intensity={0.15} />

      {/* Bounce fill light — cooler, from opposite side */}
      <directionalLight
        position={bounceDirection}
        color="#8eaacc"
        intensity={0.4}
        castShadow={false}
      />

      {/* Contact shadows removed for performance */}
    </>
  )
}

export default Lighting
