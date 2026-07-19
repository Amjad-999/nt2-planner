import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export type SkillKey = 'reading' | 'listening' | 'writing' | 'speaking'

interface Props {
  progress: number     // 0–100, overall readiness (drives glow strength)
  streak:   number     // streak days (drives intensity)
  weakSkill: SkillKey  // colours the orb — the skill that needs work next
}

/* لون الكرة حسب المهارة (مواصفة P4):
   أزرق = القراءة · أخضر = الاستماع · برتقالي = الكتابة · أحمر = التحدث
   نلوّنها بلون المهارة الأضعف — إشارة يومية إلى ما يستحق التركيز */
const SKILL_COLORS: Record<SkillKey, string> = {
  reading:   '#3B82F6',
  listening: '#22C55E',
  writing:   '#F58F20',
  speaking:  '#EF4444',
}

export function ReadinessOrb({ progress, streak, weakSkill }: Props) {
  const groupRef  = useRef<THREE.Group>(null)
  const outerRef  = useRef<THREE.Mesh>(null)
  const innerRef  = useRef<THREE.Mesh>(null)
  const ringRef   = useRef<THREE.Mesh>(null)
  const glowRef   = useRef<THREE.PointLight>(null)
  const pointerRef = useRef({ x: 0, y: 0 })
  const hoverRef   = useRef(0)          // 0 → عادي، 1 → hover (يُقرَّب تدريجيًا)
  const hoveredRef = useRef(false)

  const orbColor  = useMemo(() => new THREE.Color(SKILL_COLORS[weakSkill]), [weakSkill])
  const intensity = useMemo(
    () => 1.2 + Math.min(streak, 30) / 30 * 1.2 + Math.min(100, Math.max(0, progress)) / 100 * 0.6,
    [streak, progress],
  )

  // تتبّع الماوس عبر DOM — يعمل حتى عندما لا يكون المؤشر فوق الكانفس
  useEffect(() => {
    const handler = (e: PointerEvent) => {
      pointerRef.current.x = (e.clientX / window.innerWidth - 0.5) * 2
      pointerRef.current.y = -(e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener('pointermove', handler, { passive: true })
    return () => window.removeEventListener('pointermove', handler)
  }, [])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const hoverTarget = hoveredRef.current ? 1 : 0
    hoverRef.current = THREE.MathUtils.lerp(hoverRef.current, hoverTarget, 0.08)
    const hv = hoverRef.current

    // الكرة كلها: طفو ناعم + ميل نحو الماوس (مواصفة P4: تدور نحوه)
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(t * 0.7) * 0.12
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y, pointerRef.current.x * 0.45, 0.05)
      groupRef.current.rotation.x = THREE.MathUtils.lerp(
        groupRef.current.rotation.x, -pointerRef.current.y * 0.3, 0.05)
    }

    // Gentle breathe on the outer shell (+ hover shine boost)
    if (outerRef.current) {
      const scale = 1 + Math.sin(t * 0.9) * 0.025 + hv * 0.04
      outerRef.current.scale.setScalar(scale)
      outerRef.current.rotation.y = t * 0.08
      outerRef.current.rotation.x = t * 0.04
      const mat = outerRef.current.material as THREE.MeshPhysicalMaterial
      mat.emissiveIntensity = 0.35 + hv * 0.55
    }
    // Faster counter-spin on the inner glow
    if (innerRef.current) {
      innerRef.current.rotation.y = -t * 0.14
      const mat = innerRef.current.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = 0.9 + hv * 0.5
    }
    // Ring orbits on another axis
    if (ringRef.current) {
      ringRef.current.rotation.x = Math.PI / 4 + Math.sin(t * 0.3) * 0.15
      ringRef.current.rotation.y = t * 0.12
    }
    // Pulsing point light (hover = أوهج)
    if (glowRef.current) {
      glowRef.current.intensity = intensity + Math.sin(t * 1.8) * 0.4 + hv * 1.2
    }
  })

  // Outer wireframe-style icosahedron
  const outerGeo = useMemo(() => new THREE.IcosahedronGeometry(1.04, 1), [])
  // Inner dense sphere for glow core
  const innerGeo = useMemo(() => new THREE.SphereGeometry(0.72, 24, 24), [])
  // Equatorial ring
  const ringGeo  = useMemo(() => new THREE.TorusGeometry(1.22, 0.025, 8, 64), [])

  return (
    <group
      ref={groupRef}
      position={[0, 0, 0]}
      onPointerOver={() => { hoveredRef.current = true }}
      onPointerOut={() => { hoveredRef.current = false }}
    >
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
      <pointLight color="#F6C68A" intensity={0.3} distance={5} decay={2} />
    </group>
  )
}
