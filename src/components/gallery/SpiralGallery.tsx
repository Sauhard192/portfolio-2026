import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, type ThreeEvent, useFrame, useLoader, useThree } from '@react-three/fiber'
import { Link, useNavigate } from 'react-router-dom'
import * as THREE from 'three'

import type { MediaCollection, MediaItem } from '../../types/media'
import { createPosterTexture } from './posterTexture'
import {
  applyScrollInput,
  bendPosterGeometry,
  createPosterGeometry,
  decayScrollMotion,
  getHelixPose,
  getRadiusScale,
  getSpiralFitScale,
  getSpiralLayout,
  getSpiralSlot,
  type ScrollMotion,
  wrapPhase,
} from './spiralMath'

interface SpiralGalleryProps {
  collection: MediaCollection
  items: MediaItem[]
}

interface SpiralMotion extends ScrollMotion {
  position: number
  hovering: boolean
  pageVisible: boolean
}

// Motion controls.
// Set from 0 (stopped) to 1 (full idle speed).
const HOVER_IDLE_SPEED_MULTIPLIER = 0.5
const IDLE_ROTATION_SECONDS = 55
const SCROLL_PATH_SPEED = 0.42
const FULL_EFFECT_SPEED = 0.8
const RADIUS_SCROLL_RANGE = 0.1 // Up: up to +10%; down: up to -10%.
const RADIUS_RESPONSE = 30 // Fast response from the first scroll input.
const RADIUS_RETURN = 20 // Higher = quicker settling; no waiting timer.
const CAMERA_DISTANCE = 8
const CAMERA_FOV = 42
const CAMERA_PULLBACK = 0.06
const FIT_HOVER_ALLOWANCE = 1.05 // Reserve room for up to 5% hover enlargement.

// Layout controls (world units, not pixels).
const HELIX_TURNS = 2
const VERTICAL_SPACING = .5 // Preserves your current vertical-spacing setting.
// Edit breakpoint radius, cardWidth, cardsPerTurn and edgePadding in spiralMath.ts.
const CARD_ASPECT_RATIO = 4/3 // Width / height; 1 = square.

const dispatchCursorTarget = (interactive: boolean, tooltip?: string) => {
  window.dispatchEvent(
    new CustomEvent('portfolio:cursor-target', {
      detail: { interactive, tooltip },
    }),
  )
}

export default function SpiralGallery({ collection, items }: SpiralGalleryProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  const motionRef = useRef<SpiralMotion>({
    position: 0,
    velocity: 0,
    radiusDrive: 0,
    cadence: 0,
    lastInputTime: -Infinity,
    lastInputDirection: 0,
    hovering: false,
    pageVisible: !document.hidden,
  })

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    let dragging = false
    let lastPointerY = 0

    const addVelocity = (delta: number) => {
      applyScrollInput(motionRef.current, delta, performance.now())
    }

    const handleWheel = (event: WheelEvent) => {
      if (event.ctrlKey) return // Preserve browser pinch-to-zoom.
      event.preventDefault()
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? root.clientHeight : 1
      addVelocity(event.deltaY * unit)
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') return
      dragging = true
      lastPointerY = event.clientY
      root.setPointerCapture(event.pointerId)
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (!dragging) return
      const delta = lastPointerY - event.clientY
      lastPointerY = event.clientY
      addVelocity(delta * 1.8)
    }

    const handlePointerUp = () => {
      dragging = false
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
      event.preventDefault()
      addVelocity(event.key === 'ArrowDown' ? 90 : -90)
    }

    const handleVisibility = () => {
      motionRef.current.pageVisible = !document.hidden
    }

    root.addEventListener('wheel', handleWheel, { passive: false })
    root.addEventListener('pointerdown', handlePointerDown)
    root.addEventListener('pointermove', handlePointerMove)
    root.addEventListener('pointerup', handlePointerUp)
    root.addEventListener('pointercancel', handlePointerUp)
    root.addEventListener('keydown', handleKeyDown)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      dispatchCursorTarget(false)
      document.body.style.removeProperty('cursor')
      root.removeEventListener('wheel', handleWheel)
      root.removeEventListener('pointerdown', handlePointerDown)
      root.removeEventListener('pointermove', handlePointerMove)
      root.removeEventListener('pointerup', handlePointerUp)
      root.removeEventListener('pointercancel', handlePointerUp)
      root.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  return (
    <section
      ref={rootRef}
      className="spiral-gallery"
      data-ready={ready}
      aria-label={`${collection} spiral gallery`}
      tabIndex={0}
    >
      <Canvas
        camera={{ position: [0, 0, CAMERA_DISTANCE], fov: CAMERA_FOV, near: 0.1, far: 40 }}
        dpr={[1, 1.75]}
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: 'high-performance',
        }}
        onPointerMissed={() => {
          motionRef.current.hovering = false
          dispatchCursorTarget(false)
        }}
      >
        <Suspense fallback={null}>
          <SpiralScene
            collection={collection}
            items={items}
            motion={motionRef}
            onReady={() => setReady(true)}
          />
        </Suspense>
      </Canvas>

      <nav className="spiral-gallery__accessible-list" aria-label={`${collection} items`}>
        {items.map((item) => (
          <Link to={`/${collection}/${item.slug}`} key={item.slug}>
            {item.title}
          </Link>
        ))}
      </nav>
    </section>
  )
}

interface SpiralSceneProps extends SpiralGalleryProps {
  motion: React.RefObject<SpiralMotion>
  onReady: () => void
}

function SpiralScene({ collection, items, motion, onReady }: SpiralSceneProps) {
  const navigate = useNavigate()
  const { camera, gl, size, viewport } = useThree()
  const layout = getSpiralLayout(size.width)
  const slotCount = HELIX_TURNS * layout.cardsPerTurn
  const imageSources = useMemo(() => [...new Set(items.map((item) => item.image.spiralSrc))], [items])
  const loadedTextures = useLoader(THREE.TextureLoader, imageSources)
  const textures = useMemo(() => {
    const bySource = new Map(imageSources.map((src, index) => [src, loadedTextures[index]]))
    return items.map((item) => createPosterTexture(
      bySource.get(item.image.spiralSrc)!,
      item.image.width / item.image.height,
      CARD_ASPECT_RATIO,
    ))
  }, [imageSources, items, loadedTextures])
  const baseRadius = layout.radius
  const cardWidth = layout.cardWidth
  const cardHeight = cardWidth / CARD_ASPECT_RATIO
  const fitScale = getSpiralFitScale({
    screenWidth: size.width,
    screenHeight: size.height,
    radius: baseRadius,
    edgePadding: layout.edgePadding,
    cameraDistance: CAMERA_DISTANCE,
    cameraFov: CAMERA_FOV,
    maxRadiusScale: 1 + RADIUS_SCROLL_RANGE,
    maxHoverScale: FIT_HOVER_ALLOWANCE,
  })
  const { geometry, unwrappedX } = useMemo(
    // Full UVs: each texture handles its own aspect-ratio crop.
    () => createPosterGeometry(cardWidth, cardHeight, CARD_ASPECT_RATIO, baseRadius),
    [baseRadius, cardHeight, cardWidth],
  )
  const meshRefs = useRef<Array<THREE.Mesh | null>>([])
  const materialRefs = useRef<Array<THREE.MeshBasicMaterial | null>>([])
  const radiusScale = useRef(1)
  const cameraZ = useRef(CAMERA_DISTANCE)

  useEffect(() => {
    for (const texture of textures) {
      texture.anisotropy = Math.min(4, gl.capabilities.getMaxAnisotropy())
      texture.needsUpdate = true
    }
    return () => textures.forEach((texture) => texture.dispose())
  }, [gl, textures])

  useEffect(() => {
    const readyFrame = requestAnimationFrame(onReady)
    return () => cancelAnimationFrame(readyFrame)
  }, [onReady, textures])

  useFrame((_, delta) => {
    const state = motion.current
    if (!state || !state.pageVisible) return

    const safeDelta = Math.min(delta, 0.05)
    const idleSpeed = 1 / (HELIX_TURNS * IDLE_ROTATION_SECONDS)
    const idleMultiplier = state.hovering ? HOVER_IDLE_SPEED_MULTIPLIER : 1
    // Idle and input move along the same path, without rotating the path itself.
    // Wrap only at a full collection period, so recycled slots retain their item.
    state.position = wrapPhase(
      (state.position + (state.velocity * SCROLL_PATH_SPEED + idleSpeed * idleMultiplier) * safeDelta) / items.length,
    ) * items.length
    const targetRadiusScale = getRadiusScale(state.radiusDrive, 1, RADIUS_SCROLL_RANGE)
    const sameSide = (targetRadiusScale - 1) * (radiusScale.current - 1) >= 0
    const returning = sameSide && Math.abs(targetRadiusScale - 1) < Math.abs(radiusScale.current - 1)
    radiusScale.current = THREE.MathUtils.damp(
      radiusScale.current,
      targetRadiusScale,
      returning ? RADIUS_RETURN : RADIUS_RESPONSE,
      safeDelta,
    )
    const radius = baseRadius * radiusScale.current
    bendPosterGeometry(geometry, unwrappedX, radius)

    const velocityStrength = Math.min(Math.abs(state.velocity) / FULL_EFFECT_SPEED, 1)
    const targetCameraZ = CAMERA_DISTANCE * (1 + velocityStrength * CAMERA_PULLBACK)
    cameraZ.current = THREE.MathUtils.damp(cameraZ.current, targetCameraZ, 5, safeDelta)
    camera.position.z = cameraZ.current
    decayScrollMotion(state, safeDelta)

    // Keep the full-height path and its existing vertical spacing behavior.
    const verticalSpan = viewport.height + cardHeight * fitScale * VERTICAL_SPACING

    for (let index = 0; index < slotCount; index += 1) {
      const mesh = meshRefs.current[index]
      const material = materialRefs.current[index]
      if (!mesh || !material) continue

      const { phase, itemIndex } = getSpiralSlot(index, slotCount, state.position, items.length)
      const { angle: theta, y } = getHelixPose(phase, HELIX_TURNS, verticalSpan)
      const z = Math.cos(theta) * radius
      const depth = (z + radius) / (radius * 2)

      mesh.position.set(0, y, 0)
      mesh.rotation.y = theta
      mesh.renderOrder = Math.round(depth * 100)
      material.color.setScalar(0.48 + depth * 0.52)
      // Recycled cards display the same item that their click handler opens.
      material.map = textures[itemIndex]
    }
  })

  const handlePointerOver = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    if (motion.current) motion.current.hovering = true
    document.body.style.cursor = 'pointer'
    dispatchCursorTarget(true, 'VIEW')
  }

  const handlePointerOut = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    if (motion.current) motion.current.hovering = false
    document.body.style.removeProperty('cursor')
    dispatchCursorTarget(false)
  }

  return Array.from({ length: slotCount }, (_, index) => (
    <mesh
      ref={(mesh) => {
        meshRefs.current[index] = mesh
      }}
      geometry={geometry}
      scale={fitScale}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={(event) => {
        event.stopPropagation()
        const { itemIndex } = getSpiralSlot(index, slotCount, motion.current.position, items.length)
        const item = items[itemIndex]
        navigate(`/${collection}/${item.slug}`)
      }}
      key={index}
    >
      <meshBasicMaterial
        ref={(material) => {
          materialRefs.current[index] = material
        }}
        map={textures[getSpiralSlot(index, slotCount, motion.current.position, items.length).itemIndex]}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  ))
}
