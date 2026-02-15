import { useMemo } from 'react'
import { Sky, Environment } from '@react-three/drei'
import * as THREE from 'three'

/**
 * Photorealistic sky dome for Maastricht, Netherlands (50.85°N).
 * Late afternoon setting with European haze.
 */
export function AtmosphericSky() {
  // Sun position: elevation ~25°, azimuth ~210° (afternoon west-southwest)
  const sunPosition = useMemo(() => {
    const elevation = 25 * (Math.PI / 180)
    const azimuth = 210 * (Math.PI / 180)
    const distance = 1000
    return new THREE.Vector3(
      distance * Math.cos(elevation) * Math.sin(azimuth),
      distance * Math.sin(elevation),
      distance * Math.cos(elevation) * Math.cos(azimuth)
    )
  }, [])

  return (
    <>
      <Sky
        distance={450000}
        sunPosition={sunPosition}
        turbidity={8}
        rayleigh={1.5}
        mieCoefficient={0.005}
        mieDirectionalG={0.8}
        inclination={undefined as never}
        azimuth={undefined as never}
      />
      {/* HDRI environment map for realistic reflections on buildings */}
      <Environment
        files="/textures/sky/kloofendal_48d_partly_cloudy_1k.hdr"
        background={false}
        environmentIntensity={0.4}
      />
    </>
  )
}

export default AtmosphericSky
