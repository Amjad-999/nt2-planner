import { useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'

interface Props {
  position?: [number, number, number]
  rotation?: [number, number, number]
  width?: number
  height?: number
  floatSpeed?: number
  floatAmplitude?: number
  children?: ReactNode
}

export function FloatingCard({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  width = 2.2,
  height = 1.1,
  floatSpeed = 0.7,
  floatAmplitude = 0.06,
  children,
}: Props) {
  const groupRef = useRef<THREE.Group>(null)
  const baseY = position[1]

  useFrame(({ clock }) => {
    if (!groupRef.current) return
    const t = clock.getElapsedTime()
    groupRef.current.position.y = baseY + Math.sin(t * floatSpeed) * floatAmplitude
    // Very subtle tilt
    groupRef.current.rotation.z = Math.sin(t * floatSpeed * 0.6) * 0.012
  })

  return (
    <group ref={groupRef} position={position} rotation={rotation as unknown as THREE.Euler}>
      {/* Glass backing */}
      <RoundedBox args={[width, height, 0.04]} radius={0.05} smoothness={4}>
        <meshPhysicalMaterial
          color="#8B9FFF"
          transmission={0.72}
          thickness={0.05}
          roughness={0.08}
          metalness={0.05}
          transparent
          opacity={0.55}
          side={THREE.DoubleSide}
        />
      </RoundedBox>

      {/* Glass border line */}
      <RoundedBox args={[width + 0.02, height + 0.02, 0.01]} radius={0.055} smoothness={4}>
        <meshBasicMaterial
          color="#C7CCFF"
          transparent
          opacity={0.18}
          side={THREE.BackSide}
        />
      </RoundedBox>

      {/* HTML content portal */}
      {children && (
        <Html
          center
          distanceFactor={4}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
          transform
          occlude={false}
        >
          <div style={{ width: 220, textAlign: 'center', fontFamily: "'Cairo','Readex Pro',sans-serif", direction: 'rtl' }}>
            {children}
          </div>
        </Html>
      )}
    </group>
  )
}
