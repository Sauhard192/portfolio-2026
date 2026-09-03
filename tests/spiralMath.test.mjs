import assert from 'node:assert/strict'
import { test } from 'node:test'
import * as THREE from 'three'

import {
  applyScrollInput,
  bendPosterGeometry,
  createPosterGeometry,
  decayScrollMotion,
  getHelixPose,
  getRadiusScale,
  getResponsiveRadius,
  getSpiralSlot,
  SCROLL_MOTION,
  wrapPhase,
} from '../src/components/gallery/spiralMath.ts'

const near = (actual, expected, tolerance = 0.00001) => {
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`)
}

test('every item passes through the same front-center point on the fixed path', () => {
  for (const count of [10, 14]) {
    for (let index = 0; index < count; index += 1) {
      const phase = wrapPhase(index / count + wrapPhase(-index / count))
      const pose = getHelixPose(phase, 2, 10)
      near(pose.y, 0)
      near(pose.angle, 0)
    }
  }
})

test('the repeat seam preserves equal center spacing in either direction', () => {
  for (const count of [10, 14]) {
    for (const offset of [-10.41, -0.0001, 0, 0.43, 0.5001, 100.2]) {
      const phases = Array.from({ length: count }, (_, index) => getSpiralSlot(index, count, offset, 12).phase)
        .sort((a, b) => a - b)
      for (let index = 0; index < count; index += 1) {
        const next = index === count - 1 ? phases[0] + 1 : phases[index + 1]
        near(next - phases[index], 1 / count)
        near((next - phases[index]) * Math.PI * 4, Math.PI * 2 / (count / 2))
      }
    }
  }
})

test('denser display slots retain collection order across recycling and position wrapping', () => {
  for (const count of [10, 14]) {
    const seen = new Set()
    for (const position of [-12.01, -6.01, -5.99, -1.01, -0.01, 0, 0.51, 1.01, 5.99, 6.01, 12.01]) {
      const slots = Array.from({ length: count }, (_, index) => {
        const slot = getSpiralSlot(index, count, position, 12)
        const bounded = getSpiralSlot(index, count, wrapPhase(position / 12) * 12, 12)
        near(slot.phase, bounded.phase)
        assert.equal(slot.itemIndex, bounded.itemIndex)
        seen.add(slot.itemIndex)
        return slot
      }).sort((a, b) => a.phase - b.phase)
      for (let index = 1; index < slots.length; index += 1) {
        assert.equal(slots[index].itemIndex, (slots[index - 1].itemIndex + 1) % 12)
      }
    }
    assert.equal(seen.size, 12)
  }
})

test('scroll direction changes radius by no more than twenty percent', () => {
  near(getRadiusScale(-100, 1, 0.2), 1.2)
  near(getRadiusScale(100, 1, 0.2), 0.8)
  near(getRadiusScale(0, 1, 0.2), 1)
  near(getRadiusScale(-0.5, 1, 0.2), 1.1)
})

const scrollState = () => ({
  velocity: 0, radiusDrive: 0, cadence: 0, lastInputTime: -Infinity, lastInputDirection: 0,
})

test('a small first input produces a visible radius response on the next frame', () => {
  for (const direction of [-1, 1]) {
    const state = scrollState()
    applyScrollInput(state, direction * 6, 0)
    assert.equal(Math.sign(state.radiusDrive), direction)
    const target = getRadiusScale(state.radiusDrive, 1, 0.2)
    const firstFrame = THREE.MathUtils.damp(1, target, 36, 1 / 60)
    assert.ok(Math.abs(firstFrame - 1) > 0.07)
  }
})

test('repeated small scrolls build capped momentum and then settle in about a second', () => {
  const state = scrollState()
  applyScrollInput(state, 6, 0)
  const firstSpeed = state.velocity
  for (let index = 1; index <= 6; index += 1) {
    decayScrollMotion(state, 0.06)
    applyScrollInput(state, 6, index * 60)
  }
  assert.ok(state.velocity > firstSpeed * 3)
  const coastSpeed = state.velocity
  for (let frame = 0; frame < 60; frame += 1) decayScrollMotion(state, 1 / 60)
  assert.ok(state.velocity < coastSpeed * 0.011)
  for (const direction of [-1, 1]) {
    for (let index = 0; index < 100; index += 1) applyScrollInput(state, direction * 200, 2000 + index * 10)
    near(Math.abs(state.velocity), SCROLL_MOTION.maxSpeed)
  }
})

test('radius reverses immediately without waiting for rotation inertia to reverse', () => {
  const state = scrollState()
  applyScrollInput(state, 500, 0)
  applyScrollInput(state, -6, 50)
  assert.ok(state.velocity > 0)
  assert.ok(state.radiusDrive < 0)
  assert.equal(state.cadence, 0)
})

test('subpixel wheel tails taper the effect and zero input does not restart it', () => {
  const state = scrollState()
  applyScrollInput(state, 6, 0)
  applyScrollInput(state, 0.1, 50)
  assert.ok(Math.abs(state.radiusDrive) < 0.04)
  const before = { ...state }
  applyScrollInput(state, 0, 100)
  applyScrollInput(state, NaN, 100)
  assert.deepEqual(state, before)
})

test('mobile is tighter horizontally, tablet is wider, and desktop remains unchanged', () => {
  near(getResponsiveRadius(390, 2.9), 1.12)
  for (const width of [800, 850, 900]) {
    const viewport = 6.1 * width / 900
    assert.ok(getResponsiveRadius(width, viewport) >= 2.05)
    assert.ok(getResponsiveRadius(width, viewport) > viewport * 0.22)
  }
  near(getResponsiveRadius(1280, 10.9), 10.9 * 0.22)
  near(getResponsiveRadius(1920, 20), 2.85)
  for (const width of [600, 700, 800, 900, 1100]) {
    assert.ok(Math.abs(getResponsiveRadius(width - 0.01, 6) - getResponsiveRadius(width + 0.01, 6)) < 0.001)
  }
})

test('portrait images center-crop vertically into square cards', () => {
  const { geometry } = createPosterGeometry(2, 2, 2 / 3, 2.85)
  const uv = geometry.getAttribute('uv')
  const u = Array.from({ length: uv.count }, (_, i) => uv.getX(i))
  const v = Array.from({ length: uv.count }, (_, i) => uv.getY(i))
  near(Math.min(...u), 0)
  near(Math.max(...u), 1)
  near(Math.min(...v), 1 / 6)
  near(Math.max(...v), 5 / 6)
  geometry.dispose()
})

test('landscape images center-crop horizontally without stretching', () => {
  const { geometry } = createPosterGeometry(2, 2, 2, 2.85)
  const uv = geometry.getAttribute('uv')
  const u = Array.from({ length: uv.count }, (_, i) => uv.getX(i))
  near(Math.min(...u), 0.25)
  near(Math.max(...u), 0.75)
  geometry.dispose()
})

test('radius bending preserves physical poster dimensions and crop', () => {
  const { geometry, unwrappedX } = createPosterGeometry(2, 2, 2 / 3, 2.85)
  const originalUv = Array.from(geometry.getAttribute('uv').array)
  const position = geometry.getAttribute('position')
  const originalBuffer = position.array
  for (const radius of [1.12 * 0.8, 2.05, 2.85 * 1.2]) {
    bendPosterGeometry(geometry, unwrappedX, radius)
    assert.equal(position.array, originalBuffer)
    for (let index = 0; index < position.count; index += 1) {
      const x = position.getX(index)
      const z = position.getZ(index)
      near(Math.hypot(x, z), radius)
      near(Math.atan2(x, z) * radius, unwrappedX[index])
      near(Math.abs(position.getY(index)), 1)
    }
    assert.deepEqual(Array.from(geometry.getAttribute('uv').array), originalUv)
  }
  geometry.dispose()
})

test('curved cards remain hittable on both sides after radius changes', () => {
  const { geometry, unwrappedX } = createPosterGeometry(2, 2, 2 / 3, 2.85)
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })
  const mesh = new THREE.Mesh(geometry, material)
  for (const radius of [1.12 * 0.8, 2.85 * 1.2]) {
    bendPosterGeometry(geometry, unwrappedX, radius)
    for (const [startZ, directionZ] of [[8, -1], [0, 1]]) {
      const ray = new THREE.Raycaster(new THREE.Vector3(0, 0, startZ), new THREE.Vector3(0, 0, directionZ))
      assert.ok(ray.intersectObject(mesh).length > 0)
    }
  }
  geometry.dispose()
  material.dispose()
})
