import {
  EffectComposer,
  Bloom,
  SSAO,
  Vignette,
  ToneMapping,
  SMAA,
} from '@react-three/postprocessing'
import { BlendFunction, ToneMappingMode } from 'postprocessing'

/**
 * Post-processing stack for photorealistic rendering.
 * ACES filmic tone mapping, subtle bloom, SSAO, vignette, and SMAA.
 */
export function PostProcessing() {
  return (
    <EffectComposer multisampling={0}>
      {/* SMAA anti-aliasing */}
      <SMAA />

      {/* ACES Filmic tone mapping for cinematic look */}
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />

      {/* Subtle bloom for bright sky and light sources */}
      <Bloom
        luminanceThreshold={0.9}
        luminanceSmoothing={0.3}
        intensity={0.2}
        mipmapBlur
      />

      {/* SSAO — reduced samples for performance */}
      <SSAO
        intensity={15}
        radius={0.04}
        luminanceInfluence={0.5}
        bias={0.025}
        samples={11}
        rings={3}
      />

      {/* Subtle vignette for photo-like framing */}
      <Vignette
        offset={0.3}
        darkness={0.3}
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  )
}

export default PostProcessing
