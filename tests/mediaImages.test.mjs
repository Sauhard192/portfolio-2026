import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtemp, rm, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import sharp from 'sharp'
import { createImageOptimizer, IMAGE_PRESETS } from '../build/mediaImages.ts'
import { gridCycleLength } from '../src/components/home/gridCycle.ts'

test('grid cycles have complete rows and preserve item order across both repeat seams', () => {
  for (const count of [1, 2, 3, 5, 7, 12, 13, 19, 24]) {
    for (const columns of [2, 3, 4]) {
      const length = gridCycleLength(count, columns, 8)
      assert.equal(length % columns, 0)
      assert.equal(length % count, 0)
      assert.ok(length / columns >= 8)
      // Previous copy, current copy, next copy all form the same sequence.
      for (let index = -length; index < length * 2; index++) {
        const item = ((index % length) + length) % length % count
        assert.equal(item, ((index % count) + count) % count)
      }
    }
  }
  assert.equal(gridCycleLength(0, 4), 0)
  assert.equal(gridCycleLength(5, 4), 20)
  assert.equal(gridCycleLength(3, 4), 12)
})

test('optimized variants preserve originals, aspect ratio, orientation and cached output', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'portfolio-images-test-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const source = path.join(root, 'source.jpg')
  await sharp({ create: { width: 3000, height: 2000, channels: 3, background: '#38748b' } })
    .withMetadata({ orientation: 6 }).jpeg().toFile(source)
  const original = await readFile(source)
  const cache = path.join(root, 'cache')
  const optimize = createImageOptimizer(cache)
  const variants = await optimize(source)
  for (const [name, image] of Object.entries(variants)) {
    const metadata = await sharp(image.path).metadata()
    assert.equal(metadata.format, 'webp')
    assert.equal(Math.max(image.width, image.height), IMAGE_PRESETS[name].size)
    assert.ok(Math.abs(image.width / image.height - 2 / 3) < 0.002)
    assert.equal(metadata.orientation, undefined)
    assert.ok((await stat(image.path)).size < original.length)
  }
  assert.deepEqual(await readFile(source), original)
  const mtime = (await stat(variants.small.path)).mtimeMs
  assert.deepEqual(await createImageOptimizer(cache)(source), variants)
  assert.equal((await stat(variants.small.path)).mtimeMs, mtime)
  await sharp({ create: { width: 100, height: 200, channels: 4, background: '#349abc88' } })
    .png().toFile(path.join(root, 'small.png'))
  const small = await optimize(path.join(root, 'small.png'))
  assert.equal(small.detail.width, 100)
  assert.equal(small.detail.height, 200)
  assert.equal((await sharp(small.detail.path).metadata()).hasAlpha, true)
})
