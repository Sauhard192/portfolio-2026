import { galleryMemory } from './galleryMemory'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, type ThreeEvent, useFrame, useThree } from '@react-three/fiber'
import { Link, useNavigate } from 'react-router-dom'
import * as THREE from 'three'

import type { MediaCollection, MediaItem } from '../../types/media'
import { useSpiralImages } from './useSpiralImages'
import { createSpiralPlaceholders } from './spiralPlaceholders'
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
  const [errors, setErrors] = useState<Array<{ title: string; retry: () => void }>>([])
  const markReady = useCallback(() => setReady(true), [])
  const motionRef = useRef<SpiralMotion>({
    position: galleryMemory[collection].spiralPosition,
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
      if (delta === 0) return
      window.dispatchEvent(new Event('portfolio:scroll-intent'))
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
      galleryMemory[collection].spiralPosition = motionRef.current.position
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
          <SpiralScene
            collection={collection}
            items={items}
            motion={motionRef}
            onReady={markReady}
            onErrors={setErrors}
          />
      </Canvas>

      {errors.length > 0 && <div className="spiral-gallery__errors" role="status">
        <span>Image unavailable</span>
        {errors.map((error, index) => <button key={index} type="button" data-cursor="interactive"
          onPointerDown={event => event.stopPropagation()} onClick={error.retry}>
          Retry: {error.title}
        </button>)}
      </div>}

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
  onErrors: (items: Array<{ title: string; retry: () => void }>) => void
}

function SpiralScene({ collection, items, motion, onReady, onErrors }: SpiralSceneProps) {
  const navigate = useNavigate()
  const { camera, gl, size, viewport } = useThree()
  const layout = getSpiralLayout(size.width)
  const slotCount = HELIX_TURNS * layout.cardsPerTurn
  const images = useSpiralImages(items, CARD_ASPECT_RATIO, Math.min(4, gl.capabilities.getMaxAnisotropy()), onErrors)
  const placeholders = useMemo(createSpiralPlaceholders, [])
  const motionPreference = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)'), [])
  const imageMaterials = useRef<Array<THREE.MeshBasicMaterial | null>>([])
  const firstFrame = useRef(false)
  const readyFrame = useRef(0)
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
    placeholders.error.needsUpdate = true
    return () => {
      cancelAnimationFrame(readyFrame.current)
      firstFrame.current = false
      placeholders.error.dispose()
    }
  }, [placeholders])

  useFrame((_, delta) => {
    const state = motion.current
    if (!state || !state.pageVisible) return

    const safeDelta = Math.min(delta, 0.05)
    const reducedMotion = motionPreference.matches
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
      const image = images[itemIndex]
      const imageMaterial = imageMaterials.current[index]
      // Each image fades once when ready; recycled cards keep their opacity.
      const opacity = image.status === 'ready' ? Math.min(1, (performance.now() - image.readyAt) / 250) : 0
      material.visible = image.status === 'error'
      if (imageMaterial) {
        if (imageMaterial.map !== image.texture) { imageMaterial.map = image.texture; imageMaterial.needsUpdate = true }
        imageMaterial.visible = image.status === 'ready'
        imageMaterial.opacity = reducedMotion && image.status === 'ready' ? 1 : opacity
        imageMaterial.color.copy(material.color)
        // Keep each image's depth ordering aligned with its card.
        mesh.children[0].renderOrder = mesh.renderOrder + 1
      }
    }
    // Start the scene immediately, independent of image loading.
    if (!firstFrame.current) {
      firstFrame.current = true
      readyFrame.current = requestAnimationFrame(onReady)
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
      raycast={function (this: THREE.Mesh, raycaster, intersections) {
        const { itemIndex } = getSpiralSlot(index, slotCount, motion.current.position, items.length)
        if (images[itemIndex].status !== 'loading') {
          THREE.Mesh.prototype.raycast.call(this, raycaster, intersections)
        }
      }}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={(event) => {
        event.stopPropagation()
        const { itemIndex } = getSpiralSlot(index, slotCount, motion.current.position, items.length)
        const item = items[itemIndex]
        if (images[itemIndex].status === 'error') { images[itemIndex].retry(); return }
        navigate(`/${collection}/${item.slug}`)
      }}
      key={index}
    >
      <meshBasicMaterial
        ref={(material) => {
          materialRefs.current[index] = material
        }}
        map={placeholders.error}
        visible={false}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
      <mesh geometry={geometry} raycast={() => {}}>
        <meshBasicMaterial ref={material => { imageMaterials.current[index] = material }}
          transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
    </mesh>
  ))
}
