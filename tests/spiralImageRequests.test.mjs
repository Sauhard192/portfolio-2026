import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getCachedSpiralImage, loadSpiralImage } from '../src/components/gallery/spiralImageRequests.ts'

test('spiral requests load independently, deduplicate, cache and retry failures', async (t) => {
  const originalImage = globalThis.Image
  const originalDocument = globalThis.document
  const requests = []
  globalThis.document = { baseURI: 'https://example.test/portfolio/' }
  globalThis.Image = class {
    constructor() { requests.push(this) }
    decode() { return Promise.resolve() }
  }
  t.after(() => {
    globalThis.Image = originalImage
    globalThis.document = originalDocument
  })
  const slow = loadSpiralImage('slow.webp')
  assert.equal(loadSpiralImage('slow.webp'), slow)
  const fast = loadSpiralImage('fast.webp')
  requests[1].onload()
  assert.equal(await fast, requests[1])
  assert.equal(getCachedSpiralImage('slow.webp'), undefined)
  assert.equal(await loadSpiralImage('fast.webp'), requests[1])
  assert.equal(requests.length, 2)
  requests[0].onload()
  await slow
  const failed = loadSpiralImage('failed.webp')
  const rejection = assert.rejects(failed, /Image unavailable/)
  requests[2].onerror()
  await rejection
  const retry = loadSpiralImage('failed.webp', true)
  assert.ok(new URL(requests[3].src).searchParams.has('image-retry'))
  requests[3].onload()
  assert.equal(await retry, requests[3])
})
