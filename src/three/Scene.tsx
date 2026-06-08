import { Suspense, useRef, useEffect, type ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'

interface Props {
  children: ReactNode
  /** Called when the canvas enters / leaves the viewport */
  onVisibilityChange?: (visible: boolean) => void
}

function PostFX() {
  return (
    <EffectComposer>
      {/* Bloom — makes the orb and lights glow */}
      <Bloom
        luminanceThreshold={0.38}
        luminanceSmoothing={0.6}
        intensity={1.4}
        mipmapBlur
      />
      {/* Vignette — darkens edges, pulls focus to centre */}
      <Vignette
        offset={0.42}
        darkness={0.55}
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  )
}

export function Scene({ children, onVisibilityChange }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Pause the render loop when the canvas scrolls out of view
  useEffect(() => {
    const el = wrapperRef.current
    if (!el || !('IntersectionObserver' in window)) return
    const obs = new IntersectionObserver(
      ([entry]) => onVisibilityChange?.(entry.isIntersecting),
      { threshold: 0.05 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [onVisibilityChange])

  return (
    <div ref={wrapperRef} style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
      <Canvas
        dpr={[1, Math.min(window.devicePixelRatio, 2)]}
        camera={{ position: [0, 0.2, 6], fov: 50, near: 0.1, far: 40 }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          alpha: false,
        }}
        frameloop="always"
        style={{ background: 'transparent' }}
        aria-hidden="true"
      >
        <Suspense fallback={null}>
          {children}
          <PostFX />
        </Suspense>
      </Canvas>
    </div>
  )
}
