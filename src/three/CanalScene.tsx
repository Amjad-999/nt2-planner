import { useRef, useEffect, useState, useMemo, Suspense } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox, Stars } from '@react-three/drei'
import * as THREE from 'three'
import { ReadinessOrb, type SkillKey } from './ReadinessOrb'
import { FloatingCard } from './FloatingCard'

interface Props {
  progress: number
  streak: number
  daysLeft: number | null
  planDay: number
  todayMins: number
  streakCount: number
  weakSkill: SkillKey
}

/* ── Floating glass panel (background decoration) ── */
function GlassPanel({
  position, rotation, width, height, opacity = 0.13, floatOffset = 0,
}: {
  position: [number, number, number]
  rotation: [number, number, number]
  width: number; height: number
  opacity?: number; floatOffset?: number
}) {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime() + floatOffset
    ref.current.position.y = position[1] + Math.sin(t * 0.4) * 0.08
  })
  return (
    <group ref={ref} position={position} rotation={rotation as unknown as THREE.Euler}>
      <RoundedBox args={[width, height, 0.025]} radius={0.06} smoothness={3}>
        <meshPhysicalMaterial
          color="#E0974A"
          transmission={0.85}
          thickness={0.02}
          roughness={0.05}
          metalness={0}
          transparent
          opacity={opacity}
          side={THREE.DoubleSide}
        />
      </RoundedBox>
      {/* thin border highlight */}
      <RoundedBox args={[width + 0.015, height + 0.015, 0.005]} radius={0.065} smoothness={3}>
        <meshBasicMaterial color="#F6C283" transparent opacity={0.12} side={THREE.BackSide} />
      </RoundedBox>
    </group>
  )
}

/* ── Low-poly windmill silhouette ── */
function Windmill({ position }: { position: [number, number, number] }) {
  const bladeRef = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (bladeRef.current) bladeRef.current.rotation.z = clock.getElapsedTime() * 0.22
  })
  return (
    <group position={position}>
      {/* Tower body */}
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.07, 0.13, 1.2, 6]} />
        <meshStandardMaterial color="#3A3A34" opacity={0.55} transparent />
      </mesh>
      {/* Blades */}
      <group ref={bladeRef} position={[0, 1.26, 0]}>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} rotation={[0, 0, (Math.PI / 2) * i]} position={[0.28, 0, 0.01]}>
            <boxGeometry args={[0.52, 0.07, 0.012]} />
            <meshStandardMaterial color="#52613F" opacity={0.5} transparent />
          </mesh>
        ))}
        {/* Hub */}
        <mesh>
          <cylinderGeometry args={[0.06, 0.06, 0.04, 8]} />
          <meshStandardMaterial color="#6E6A5E" />
        </mesh>
      </group>
    </group>
  )
}

/* ── Water plane ── */
function WaterPlane() {
  const ref = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (ref.current) {
      const mat = ref.current.material as THREE.MeshStandardMaterial
      mat.opacity = 0.18 + Math.sin(clock.getElapsedTime() * 0.5) * 0.04
    }
  })
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.2, 0]}>
      <planeGeometry args={[30, 20]} />
      <meshStandardMaterial
        color="#20281A"
        metalness={0.6}
        roughness={0.15}
        transparent
        opacity={0.22}
      />
    </mesh>
  )
}

/* ── Particle field — جسيمات زجاجية تفاعلية (مواصفة P4) ──────────────────
   أزرق فاتح + أبيض، تنجذب نحو الماوس داخل نصف قطر الجذب، وتخفت كلما
   ابتعدت عنه (الخلفية داكنة، فتعتيم اللون = تلاشٍ بصري). كل جسيم يعود
   بهدوء إلى موطنه عندما يبتعد المؤشر. */
function ParticleField() {
  // Random field generated ONCE per mount inside the useState lazy
  // initializer, keeping render pure (react-hooks/purity)
  const [{ positions, colors, home, tint }] = useState(() => {
    const n = 180
    const pos  = new Float32Array(n * 3)
    const col  = new Float32Array(n * 3)
    const base = new Float32Array(n * 3)
    const mix  = new Float32Array(n)          // 0 = أبيض، 1 = أزرق فاتح
    for (let i = 0; i < n; i++) {
      base[i * 3]     = pos[i * 3]     = (Math.random() - 0.5) * 18
      base[i * 3 + 1] = pos[i * 3 + 1] = (Math.random() - 0.5) * 8
      base[i * 3 + 2] = pos[i * 3 + 2] = (Math.random() - 0.5) * 10 - 2
      mix[i] = Math.random()
    }
    return { positions: pos, colors: col, home: base, tint: mix }
  })

  const ref = useRef<THREE.Points>(null)
  const blue  = useMemo(() => new THREE.Color('#BFDBFE'), [])
  const white = useMemo(() => new THREE.Color('#FFFFFF'), [])

  useFrame(({ clock, pointer, viewport }) => {
    const pts = ref.current
    if (!pts) return
    pts.rotation.y = clock.getElapsedTime() * 0.006

    // موضع الماوس في إحداثيات المشهد (مستوى z≈0)
    const mx = (pointer.x * viewport.width) / 2
    const my = (pointer.y * viewport.height) / 2
    const ATTRACT_R = 3.2

    // التعديل يجري على مخازن الـ GPU عبر THREE (attribute.array)، لا على
    // مراجع حالة React — home/tint تُقرأ فقط
    const posAttr = pts.geometry.getAttribute('position') as THREE.BufferAttribute
    const colAttr = pts.geometry.getAttribute('color') as THREE.BufferAttribute
    const posArr = posAttr.array as Float32Array
    const colArr = colAttr.array as Float32Array
    const n = posAttr.count
    for (let i = 0; i < n; i++) {
      const ix = i * 3
      const px = posArr[ix], py = posArr[ix + 1]
      const dx = mx - px, dy = my - py
      const dist = Math.hypot(dx, dy)

      if (dist < ATTRACT_R) {
        // انجذاب لطيف نحو المؤشر — أقوى كلما اقترب
        const pull = (1 - dist / ATTRACT_R) * 0.02
        posArr[ix]     += dx * pull
        posArr[ix + 1] += dy * pull
      } else {
        // عودة هادئة إلى الموطن
        posArr[ix]     += (home[ix]     - posArr[ix])     * 0.012
        posArr[ix + 1] += (home[ix + 1] - posArr[ix + 1]) * 0.012
      }

      // تلاشٍ بالمسافة: قريب = ساطع، بعيد = خافت
      const fade = 0.25 + Math.max(0, 1 - dist / (ATTRACT_R * 1.6)) * 0.75
      const c = tint[i] < 0.5 ? white : blue
      colArr[ix]     = c.r * fade
      colArr[ix + 1] = c.g * fade
      colArr[ix + 2] = c.b * fade
    }
    posAttr.needsUpdate = true
    colAttr.needsUpdate = true
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color"    args={[colors, 3]}    />
      </bufferGeometry>
      <pointsMaterial
        vertexColors
        size={0.05}
        sizeAttenuation
        transparent
        opacity={0.85}
        depthWrite={false}
      />
    </points>
  )
}

/* ── Camera pointer parallax ── */
function CameraRig() {
  const targetRef = useRef({ x: 0, y: 0 })

  // Camera comes from the frame-loop state (not useThree) — mutating it
  // here runs in the R3F animation loop, outside React render
  useFrame(({ camera }) => {
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetRef.current.x * 0.7, 0.04)
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetRef.current.y * 0.4 + 0.2, 0.04)
    camera.lookAt(0, 0.1, 0)
  })

  // Track pointer via DOM — safe even when canvas is off-screen.
  // useEffect (not useMemo) so the cleanup actually runs on unmount
  useEffect(() => {
    const handler = (e: PointerEvent) => {
      targetRef.current.x = (e.clientX / window.innerWidth - 0.5) * 2.0
      targetRef.current.y = -(e.clientY / window.innerHeight - 0.5) * 1.2
    }
    window.addEventListener('pointermove', handler, { passive: true })
    return () => window.removeEventListener('pointermove', handler)
  }, [])

  return null
}

/* ── Main scene ── */
export function CanalScene({ progress, streak, daysLeft, planDay, todayMins, streakCount, weakSkill }: Props) {
  return (
    <>
      {/* Environment */}
      <color attach="background" args={['#161614']} />
      <fog attach="fog" args={['#161614', 12, 28]} />

      {/* Ambient light — kept dim so the orb glow stands out */}
      <ambientLight color="#4A3C28" intensity={0.6} />
      <directionalLight position={[4, 6, 4]} color="#F9C079" intensity={0.4} />

      {/* Stars background */}
      <Stars radius={30} depth={20} count={600} factor={2.5} fade speed={0.4} />

      {/* Floating particles in mid-field */}
      <ParticleField />

      {/* The readiness orb — centre-stage */}
      <ReadinessOrb progress={progress} streak={streak} weakSkill={weakSkill} />

      {/* Background glass panels */}
      <GlassPanel position={[-3.8, 0.5, -2.5]}  rotation={[0, 0.25, 0.06]}  width={1.8} height={2.4} opacity={0.12} floatOffset={1.2} />
      <GlassPanel position={[ 3.6, 0.2, -3.0]}  rotation={[0, -0.22, -0.04]} width={1.4} height={1.9} opacity={0.10} floatOffset={2.5} />
      <GlassPanel position={[-1.2, -1.0, -4.5]} rotation={[0.08, 0.1, 0.02]} width={2.6} height={1.0} opacity={0.07} floatOffset={0.8} />
      <GlassPanel position={[ 2.0, 1.4, -5.0]}  rotation={[0, -0.1, 0.03]}  width={1.0} height={1.5} opacity={0.06} floatOffset={3.1} />

      {/* Windmill silhouette — far right background */}
      <Windmill position={[4.8, -1.5, -6.5]} />
      <Windmill position={[6.2, -1.5, -7.5]} />

      {/* Water plane at the bottom */}
      <WaterPlane />

      {/* Floating countdown card — right of orb */}
      <Suspense fallback={null}>
        <FloatingCard
          position={[2.8, 0.55, 0.5]}
          rotation={[0, -0.18, 0]}
          width={2.0}
          height={0.95}
          floatSpeed={0.65}
          floatAmplitude={0.07}
        >
          <div style={{ color: '#FBF6EE', fontSize: 13, lineHeight: 1.5 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#FBC07A', lineHeight: 1 }}>
              {daysLeft == null ? '—' : daysLeft}
            </div>
            <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>يومًا للامتحان</div>
            <div style={{ marginTop: 6, display: 'flex', gap: 10, justifyContent: 'center', fontSize: 11, opacity: 0.82 }}>
              <span>📍 {planDay}/46</span>
              <span>⏱ {todayMins}د</span>
              <span>🔥 {streakCount}</span>
            </div>
          </div>
        </FloatingCard>
      </Suspense>

      {/* Camera parallax rig */}
      <CameraRig />
    </>
  )
}
