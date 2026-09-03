import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getSwipeDirection, mediaDateTime, wrapMediaIndex } from '../src/components/gallery/mediaNavigation.ts'
import { shouldAnimateRouteChange } from '../src/components/layout/routeTransitionRules.ts'

test('image navigation wraps within its own collection, including empty and singleton collections', () => {
  assert.equal(wrapMediaIndex(12, 12), 0)
  assert.equal(wrapMediaIndex(-1, 12), 11)
  assert.equal(wrapMediaIndex(25, 12), 1)
  assert.equal(wrapMediaIndex(-1, 1), 0)
  assert.equal(wrapMediaIndex(0, 0), -1)
})

test('intentional horizontal swipes navigate in the expected direction', () => {
  assert.equal(getSwipeDirection(-80, 8, 250), 1)
  assert.equal(getSwipeDirection(80, -8, 250), -1)
  assert.equal(getSwipeDirection(10, 0, 250), 0)
  assert.equal(getSwipeDirection(60, 70, 250), 0)
  assert.equal(getSwipeDirection(80, 0, 1500), 0)
})

test('full human dates produce machine-readable dates without changing displayed text', () => {
  assert.equal(mediaDateTime('July 19, 2021'), '2021-07-19')
  assert.equal(mediaDateTime('December 2, 2024'), '2024-12-02')
  assert.equal(mediaDateTime('Unknown'), undefined)
})

test('gallery-to-viewer and viewer-to-gallery use cinematic transitions', () => {
  for (const collection of ['art', 'photography']) {
    assert.equal(shouldAnimateRouteChange(`/${collection}`, `/${collection}/example`), true)
    assert.equal(shouldAnimateRouteChange(`/${collection}/example`, `/${collection}`), true)
    assert.equal(shouldAnimateRouteChange(`/${collection}/example`, '/contact'), true)
    assert.equal(shouldAnimateRouteChange('/', `/${collection}/example`), true)
  }
})

test('image-to-image navigation keeps the header and avoids replaying the curtain', () => {
  assert.equal(shouldAnimateRouteChange('/art/first', '/art/second'), false)
  assert.equal(shouldAnimateRouteChange('/photography/last', '/photography/first'), false)
  assert.equal(shouldAnimateRouteChange('/art/first', '/art/first'), false)
  assert.equal(shouldAnimateRouteChange('/art/first', '/photography/first'), true)
})

test('existing top-level transitions and excluded case studies retain their behavior', () => {
  assert.equal(shouldAnimateRouteChange('/', '/contact'), true)
  assert.equal(shouldAnimateRouteChange('/', '/case-studies/example'), false)
})
