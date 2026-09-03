import assert from 'node:assert/strict'
import { mkdtemp, mkdir, copyFile, writeFile, rm, rename, realpath } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import sharp from 'sharp'
import { createServer } from 'vite'
import { Texture, SRGBColorSpace } from 'three'
import { formatContentDate, readMediaCollection, mediaContent } from '../build/mediaContent.ts'
import { createPosterTexture } from '../src/components/gallery/posterTexture.ts'

const placeholder = new URL('../src/assets/projects/project-placeholder.jpeg', import.meta.url)
const info = { title: 'Sample', caption: 'A quiet afternoon.', date: '2021-07-19' }

async function fixture(t) {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), 'portfolio-media-test-')))
  t.after(() => rm(root, { recursive: true, force: true }))
  return root
}

async function addItem(root, slug, fields = {}) {
  const directory = path.join(root, slug)
  await mkdir(directory, { recursive: true })
  await copyFile(placeholder, path.join(directory, 'image.jpeg'))
  await writeFile(path.join(directory, 'info.json'), JSON.stringify({ ...info, ...fields }))
  return directory
}

test('both real collections validate independently, regardless of item count', async () => {
  for (const collection of ['art', 'photography']) {
    const entries = await readMediaCollection(path.resolve(`src/content/${collection}`))
    assert.equal(new Set(entries.map((item) => item.slug)).size, entries.length)
    for (const [index, entry] of entries.entries()) {
      assert.ok(entry.image.width > 0 && entry.image.height > 0)
      assert.ok(entry.imagePath.includes(`/src/content/${collection}/`))
      if (index > 0) assert.ok(entry.dateISO <= entries[index - 1].dateISO)
      assert.equal('order' in entry, false)
    }
  }
})

test('date formatting accepts valid full dates and year-only dates, but rejects ambiguous labels', () => {
  assert.equal(formatContentDate('2021-07-19'), 'July 19, 2021')
  assert.equal(formatContentDate('2024-02-29'), 'February 29, 2024')
  assert.equal(formatContentDate('2025'), '2025')
  assert.throws(() => formatContentDate('Lumbini, 2025'), /Invalid date/)
  assert.throws(() => formatContentDate('July 19, 2021'), /Invalid date/)
  assert.throws(() => formatContentDate('2025-2-9'), /Invalid date/)
  assert.throws(() => formatContentDate('0000'), /Invalid date/)
  assert.throws(() => formatContentDate('2025-02-29'), /Invalid date/)
  assert.throws(() => formatContentDate('2025-13-01'), /Invalid date/)
})

test('discovery sorts newest first then slug, uses stable folder URLs and ignores drafts', async (t) => {
  const root = await fixture(t)
  await addItem(root, 'last', { date: '2020-12-31' })
  await addItem(root, 'beta', { title: 'Renamed title' })
  await addItem(root, 'alpha', { alt: 'Custom accessible description' })
  await mkdir(path.join(root, '_draft'))
  await mkdir(path.join(root, '.hidden'))
  const entries = await readMediaCollection(root)
  assert.deepEqual(entries.map((item) => item.slug), ['alpha', 'beta', 'last'])
  assert.equal(entries[0].image.alt, 'Custom accessible description')
  assert.equal(entries[1].image.alt, info.caption)
  assert.equal(entries[1].title, 'Renamed title')
  assert.equal(entries[1].date, 'July 19, 2021')
  assert.equal(entries[1].dateISO, '2021-07-19')
})

test('year-only entries follow full dates in that year and ties use folder names', async (t) => {
  const root = await fixture(t)
  await addItem(root, 'oldest', { date: '2023-12-31' })
  await addItem(root, 'year-beta', { date: '2024' })
  await addItem(root, 'year-alpha', { date: '2024' })
  await addItem(root, 'january', { date: '2024-01-01' })
  await addItem(root, 'december', { date: '2024-12-31' })
  await addItem(root, 'newest-year', { date: '2025' })
  assert.deepEqual((await readMediaCollection(root)).map((item) => item.slug), [
    'newest-year', 'december', 'january', 'year-alpha', 'year-beta', 'oldest',
  ])
})

test('locations are trimmed, optional, independent of dates and never used for sorting', async (t) => {
  const root = await fixture(t)
  await addItem(root, 'alpha', { location: '  Lumbini  ' })
  await addItem(root, 'beta', { location: '' })
  await addItem(root, 'gamma', { location: '   ' })
  await addItem(root, 'delta')
  const entries = await readMediaCollection(root)
  assert.deepEqual(entries.map((item) => item.slug), ['alpha', 'beta', 'delta', 'gamma'])
  assert.equal(entries[0].location, 'Lumbini')
  assert.equal(entries[0].dateISO, '2021-07-19')
  for (const entry of entries.slice(1)) assert.equal(entry.location, undefined)
  await addItem(root, 'invalid', { location: 123 })
  await assert.rejects(readMediaCollection(root), /invalid:.*location.*string/)
})

test('missing, duplicate and corrupt images produce actionable folder errors', async (t) => {
  const root = await fixture(t)
  const directory = await addItem(root, 'sample')
  const image = path.join(directory, 'image.jpeg')
  await copyFile(image, path.join(directory, 'image.webp'))
  await assert.rejects(readMediaCollection(root), /sample: Keep exactly one image/)
  await rm(path.join(directory, 'image.webp'))
  await rm(image)
  await assert.rejects(readMediaCollection(root), /sample: Keep exactly one image/)
  await writeFile(image, 'not an image')
  await assert.rejects(readMediaCollection(root), /sample:.*unsupported image format/i)
})

test('metadata validation catches missing fields, invalid JSON and invalid slugs', async (t) => {
  const root = await fixture(t)
  const directory = await addItem(root, 'sample')
  const metadata = path.join(directory, 'info.json')
  for (const field of ['title', 'caption', 'date']) {
    const fields = { ...info }
    delete fields[field]
    await writeFile(metadata, JSON.stringify(fields))
    await assert.rejects(readMediaCollection(root), new RegExp(`sample:.*${field}`))
  }
  await writeFile(metadata, '{')
  await assert.rejects(readMediaCollection(root), /sample:/)
  await writeFile(metadata, JSON.stringify(info))
  await rename(directory, path.join(root, 'Wrong Name'))
  await assert.rejects(readMediaCollection(root), /Folder names must use lowercase/)
})

test('all supported formats infer dimensions and camera orientation is respected', async (t) => {
  const root = await fixture(t)
  for (const extension of ['webp', 'avif', 'jpg', 'jpeg', 'png']) {
    const directory = await addItem(root, `sample-${extension}`)
    await rm(path.join(directory, 'image.jpeg'))
    await sharp({ create: { width: 80, height: 40, channels: 3, background: '#789abc' } })
      .toFile(path.join(directory, `image.${extension}`))
  }
  const rotated = await addItem(root, 'rotated')
  await sharp({ create: { width: 80, height: 40, channels: 3, background: '#abcdef' } })
    .withMetadata({ orientation: 6 }).jpeg().toFile(path.join(rotated, 'image.jpeg'))
  const entries = await readMediaCollection(root)
  assert.equal(entries.length, 6)
  for (const entry of entries) {
    assert.equal(entry.image.width, entry.slug === 'rotated' ? 40 : 80)
    assert.equal(entry.image.height, entry.slug === 'rotated' ? 80 : 40)
  }
})

test('empty collections are valid', async (t) => {
  assert.deepEqual(await readMediaCollection(await fixture(t)), [])
})

test('poster crops support mixed aspect ratios without mutating cached originals', () => {
  for (const [sourceAspect, expected] of [[2, [0.5, 1]], [0.5, [1, 0.5]], [1, [1, 1]]]) {
    const source = new Texture({ id: sourceAspect })
    const cropped = createPosterTexture(source, sourceAspect, 1)
    assert.notEqual(cropped, source)
    assert.equal(cropped.image, source.image)
    assert.deepEqual(cropped.repeat.toArray(), expected)
    assert.deepEqual(cropped.offset.toArray(), expected.map((size) => (1 - size) / 2))
    assert.deepEqual(source.repeat.toArray(), [1, 1])
    assert.deepEqual(source.offset.toArray(), [0, 0])
    assert.equal(cropped.colorSpace, SRGBColorSpace)
    cropped.dispose()
    source.dispose()
  }
})

test('Vite exports asset URLs and refreshes discovery after file edits, additions and removals', async (t) => {
  const root = await fixture(t)
  const art = path.join(root, 'src/content/art')
  await mkdir(path.join(root, 'src/content/photography'), { recursive: true })
  const first = await addItem(art, 'first')
  const server = await createServer({
    configFile: false, root, base: '/portfolio-2026/', plugins: [mediaContent()],
    logLevel: 'silent', server: { middlewareMode: true, watch: { usePolling: true, interval: 50 } },
    optimizeDeps: { noDiscovery: true },
  })
  t.after(() => server.close())
  await new Promise((resolve) => server.watcher.once('ready', resolve))
  const id = 'virtual:portfolio-media/art'
  const initial = await server.transformRequest(id)
  assert.match(initial.code, /portfolio-2026\/node_modules\/.cache\/portfolio-media\/.*-small.webp/)
  assert.match(initial.code, /spiralSrc:image0_spiral/)
  assert.match(initial.code, /src:image0_detail/)
  assert.doesNotMatch(initial.code, /first\/image.jpeg/)
  assert.match(initial.code, /"slug":"first"/)

  const waitForRefresh = () => new Promise((resolve, reject) => {
    const previous = server.ws.send
    const timeout = setTimeout(() => {
      server.ws.send = previous
      reject(new Error('Content refresh did not arrive'))
    }, 5000)
    server.ws.send = (...args) => {
      previous.apply(server.ws, args)
      if (args[0]?.type === 'full-reload') {
        clearTimeout(timeout)
        server.ws.send = previous
        resolve()
      }
    }
  })
  let refreshed = waitForRefresh()
  await writeFile(path.join(first, 'info.json'), JSON.stringify({ ...info, title: 'Edited title' }))
  await refreshed
  assert.match((await server.transformRequest(id)).code, /Edited title/)
  refreshed = waitForRefresh()
  const second = await addItem(art, 'second', { date: '2025-07-19', location: 'Lumbini' })
  await refreshed
  const added = (await server.transformRequest(id)).code
  assert.ok(added.indexOf('"slug":"second"') < added.indexOf('"slug":"first"'))
  assert.match(added, /"location":"Lumbini"/)
  refreshed = waitForRefresh()
  await writeFile(path.join(second, 'info.json'), JSON.stringify({ ...info, date: '2020-07-19' }))
  await refreshed
  const reordered = (await server.transformRequest(id)).code
  assert.ok(reordered.indexOf('"slug":"first"') < reordered.indexOf('"slug":"second"'))
  refreshed = waitForRefresh()
  await rm(second, { recursive: true })
  await refreshed
  assert.doesNotMatch((await server.transformRequest(id)).code, /"slug":"second"/)
  refreshed = waitForRefresh()
  await sharp({ create: { width: 90, height: 60, channels: 3, background: '#345678' } })
    .jpeg().toFile(path.join(first, 'image.jpeg'))
  await refreshed
  const replaced = (await server.transformRequest(id)).code
  assert.match(replaced, /"width":90,"height":60/)
  assert.notEqual(replaced.match(/[a-f0-9]{24}-small/)[0], initial.code.match(/[a-f0-9]{24}-small/)[0])
})
