import * as THREE from 'three'

// Scroll tuning: repeated inputs build speed; ~99% settles within one second.
export const SCROLL_MOTION = {
  sensitivity: 0.004,
  inputKick: 0.11,
  frequencyBoost: 2,
  maxSpeed: 2,
  deceleration: 4.6,
  radiusFirstInput: 0.85,
  radiusDecay: 3,
} as const

// Radius only: card sizes and vertical spacing are controlled in SpiralGallery.
export const RADIUS_LAYOUT = {
  mobile: 1.12,
  tabletMin: 2.05,
  tabletMultiplier: 1.2,
  desktopMax: 2.85,
  desktopViewportRatio: 0.22,
} as const

export interface ScrollMotion {
  velocity: number
  radiusDrive: number
  cadence: number
  lastInputTime: number
  lastInputDirection: number
}

export function applyScrollInput(state: ScrollMotion, delta: number, now: number) {
  if (!Number.isFinite(delta) || delta === 0) return
  const direction = Math.sign(delta)
  const magnitude = Math.abs(delta)
  const gap = Math.max(0, now - state.lastInputTime)
  const repeating = direction === state.lastInputDirection && gap < 300
  // Time-weight the boost so high-frequency trackpads cannot overwhelm wheels.
  const timeWeight = Math.min(gap / 32, 1)
  state.cadence = repeating
    ? Math.min(1, state.cadence * Math.exp(-gap / 300) + 0.2 * timeWeight * Math.min(magnitude / 6, 1))
    : 0
  const kick = SCROLL_MOTION.inputKick * (1 + state.cadence * SCROLL_MOTION.frequencyBoost)
    * Math.min(magnitude / 6, 1) * timeWeight
  state.velocity = THREE.MathUtils.clamp(
    state.velocity + delta * SCROLL_MOTION.sensitivity + direction * kick,
    -SCROLL_MOTION.maxSpeed,
    SCROLL_MOTION.maxSpeed,
  )
  // Radius follows the latest direction, independent of accumulated rotation.
  // Subpixel wheel tails taper off instead of repeatedly retriggering full strength.
  state.radiusDrive = direction * Math.min(magnitude / 3, 1)
    * Math.max(SCROLL_MOTION.radiusFirstInput, Math.min(magnitude / 70 + state.cadence * 0.25, 1))
  state.lastInputTime = now
  state.lastInputDirection = direction
}

export function decayScrollMotion(state: ScrollMotion, seconds: number) {
  state.velocity *= Math.exp(-SCROLL_MOTION.deceleration * seconds)
  state.radiusDrive *= Math.exp(-SCROLL_MOTION.radiusDecay * seconds)
}

export function getResponsiveRadius(screenWidth: number, viewportWidth: number) {
  const desktop = Math.min(RADIUS_LAYOUT.desktopMax, viewportWidth * RADIUS_LAYOUT.desktopViewportRatio)
  const tablet = Math.max(RADIUS_LAYOUT.tabletMin, Math.min(RADIUS_LAYOUT.desktopMax, desktop * RADIUS_LAYOUT.tabletMultiplier))
  const mobileToTablet = THREE.MathUtils.smoothstep(screenWidth, 600, 800)
  const tabletToDesktop = THREE.MathUtils.smoothstep(screenWidth, 900, 1100)
  return THREE.MathUtils.lerp(
    THREE.MathUtils.lerp(RADIUS_LAYOUT.mobile, tablet, mobileToTablet),
    desktop,
    tabletToDesktop,
  )
}

export const wrapPhase = (phase: number) => ((phase + 0.5) % 1 + 1) % 1 - 0.5

// Recycle display slots while keeping the complete collection in sequence.
export function getSpiralSlot(index: number, slotCount: number, position: number, itemCount: number) {
  const progress = index / slotCount + position
  const cycle = Math.floor(progress + 0.5)
  const logicalIndex = index - cycle * slotCount
  return {
    phase: progress - cycle,
    itemIndex: ((logicalIndex % itemCount) + itemCount) % itemCount,
  }
}

// One fixed path: at phase 0, every card faces forward at y = 0.
export function getHelixPose(phase: number, turns: number, verticalSpan: number) {
  return { angle: phase * Math.PI * 2 * turns, y: -phase * verticalSpan }
}

export function getRadiusScale(velocity: number, fullStrengthSpeed: number, range: number) {
  return 1 - THREE.MathUtils.clamp(velocity / fullStrengthSpeed, -1, 1) * range
}

export function createPosterGeometry(
  width: number,
  height: number,
  sourceAspect: number,
  radius: number,
) {
  const geometry = new THREE.PlaneGeometry(width, height, 20, 1)
  const positions = geometry.getAttribute('position')
  const uvs = geometry.getAttribute('uv')
  const unwrappedX = new Float32Array(positions.count)
  const aspect = width / height
  const cropX = Math.min(1, aspect / sourceAspect)
  const cropY = Math.min(1, sourceAspect / aspect)

  for (let index = 0; index < positions.count; index += 1) {
    unwrappedX[index] = positions.getX(index)
    // Center crop in UV space; leave the shared image texture unchanged.
    uvs.setXY(
      index,
      0.5 + (uvs.getX(index) - 0.5) * cropX,
      0.5 + (uvs.getY(index) - 0.5) * cropY,
    )
  }

  if (positions instanceof THREE.BufferAttribute) positions.setUsage(THREE.DynamicDrawUsage)
  const normals = geometry.getAttribute('normal')
  if (normals instanceof THREE.BufferAttribute) normals.setUsage(THREE.DynamicDrawUsage)
  bendPosterGeometry(geometry, unwrappedX, radius)
  return { geometry, unwrappedX }
}

export function bendPosterGeometry(
  geometry: THREE.PlaneGeometry,
  unwrappedX: Float32Array,
  radius: number,
) {
  const positions = geometry.getAttribute('position')
  const normals = geometry.getAttribute('normal')

  for (let index = 0; index < positions.count; index += 1) {
    // Fixed arc length keeps poster width unchanged as the cylinder expands.
    const angle = unwrappedX[index] / radius
    const sine = Math.sin(angle)
    const cosine = Math.cos(angle)
    positions.setXYZ(index, radius * sine, positions.getY(index), radius * cosine)
    normals.setXYZ(index, sine, 0, cosine)
  }

  positions.needsUpdate = true
  normals.needsUpdate = true
  // Keep culling and pointer hit tests correct while bending.
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
}
