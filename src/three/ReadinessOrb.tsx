import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface Props {
  progress: number   // 0–100, overall readiness
  streak:   number   // streak days (drives intensity)
}

/** Maps 0–100 readiness to a hue: 0%=red, 65%=indigo, 100%=teal */
function progressToHSL(p: number): THREE.Color {
  const t = Math.max(0, Math.min(100, p)) / 100
  // Lerp across three colour stops
  let h: number, s: number, l: number
  if (t < 0.5) {
    // red(0°) → indigo(248°)
    h = THREE.MathUtils.lerp(0, 248, t * 2)
    s = 0.9
    l = THREE.MathUtils.lerp(0.55, 0.60, t * 2)
  } else {
    // indigo(248°) → teal(180°)
    h = THREE.MathUtils.lerp(248, 180, (t - 0.5) * 2)
    s = 0.8
    l = THREE.MathUtils.lerp(0.60, 0.55, (t - 0.5) * 2)
  }
  return new THREE.Color().setHSL(h / 360, s, l)
}

export function ReadinessOrb({ progress, streak }: Props) {
  const outerRef  = useRef<THREE.Mesh>(null)
  const innerRef  = useRef<THREE.Mesh>(null)
  const ringRef   = useRef<THREE.Mesh>(null)
  const glowRef   = useRef<THREE.PointLight>(null)

  const orbColor  = useMemo(() => progressToHSL(progress), [progress])
  const intensity = useMemo(() => 1.2 + Math.min(streak, 30) / 30 * 1.6, [streak])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()

    // Gentle breathe on the outer shell
    if (outerRef.current) {
      const scale = 1 + Math.sin(t * 0.9) * 0.025
      outerRef.current.scale.setScalar(scale)
      outerRef.current.rotation.y = t * 0.08
      outerRef.current.rotation.x = t * 0.04
    }
    // Faster counter-spin on the inner glow
    if (innerRef.current) {
      innerRef.current.rotation.y = -t * 0.14
    }
    // Ring orbits on another axis
    if (ringRef.current) {
      ringRef.current.rotation.x = Math.PI / 4 + Math.sin(t * 0.3) * 0.15
      ringRef.current.rotation.y = t * 0.12
    }
    // Pulsing point light
    if (glowRef.current) {
      glowRef.current.intensity = intensity + Math.sin(t * 1.8) * 0.4
    }
  })

  // Outer wireframe-style icosahedron
  const outerGeo = useMemo(() => new THREE.IcosahedronGeometry(1.04, 1), [])
  // Inner dense sphere for glow core
  const innerGeo = useMemo(() => new THREE.SphereGeometry(0.72, 24, 24), [])
  // Equatorial ring
  const ringGeo  = useMemo(() => new THREE.TorusGeometry(1.22, 0.025, 8, 64), [])

  return (
    <group position={[0, 0, 0]}>
      {/* Outer shell — physical glass-like */}
      <mesh ref={outerRef} geometry={outerGeo}>
        <meshPhysicalMaterial
          color={orbColor}
          emissive={orbColor}
          emissiveIntensity={0.35}
          metalness={0.1}
          roughness={0.05}
          transmission={0.55}
          thickness={0.4}
          transparent
          opacity={0.82}
          wireframe
        />
      </mesh>

      {/* Inner glow core */}
      <mesh ref={innerRef} geometry={innerGeo}>
        <meshStandardMaterial
          color={orbColor}
          emissive={orbColor}
          emissiveIntensity={0.9}
          metalness={0}
          roughness={0.2}
          transparent
          opacity={0.88}
        />
      </mesh>

      {/* Equatorial ring */}
      <mesh ref={ringRef} geometry={ringGeo}>
        <meshStandardMaterial
          color={orbColor}
          emissive={orbColor}
          emissiveIntensity={0.7}
          metalness={0.4}
          roughness={0.1}
        />
      </mesh>

      {/* Volumetric point light — caught by Bloom */}
      <pointLight
        ref={glowRef}
        color={orbColor}
        intensity={intensity}
        distance={8}
        decay={2}
      />

      {/* Very soft fill light */}
      <pointLight color="#B9C2FF" intensity={0.3} distance={5} decay={2} />
    </group>
  )
}
