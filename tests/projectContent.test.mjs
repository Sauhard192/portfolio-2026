import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtemp, mkdir, copyFile, writeFile, readFile, rm, realpath, stat, symlink } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import sharp from 'sharp'
import { createServer } from 'vite'
import { readProjectCollection, PROJECT_ORDER_FILE } from '../build/projectContent.ts'
import { mediaContent } from '../build/mediaContent.ts'
import { createImageOptimizer, createAnimationOptimizer } from '../build/mediaImages.ts'

const placeholder = path.resolve('src/assets/projects/project-placeholder.jpeg')
const info = { title: 'Sample', hero: 'original-name.jpg', date: 'Summer 2026' }
async function fixture(t) {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), 'portfolio-project-test-')))
  t.after(() => rm(root, { recursive: true, force: true }))
  return root
}
async function addProject(root, name, fields = {}) {
  const directory = path.join(root, name)
  await mkdir(directory, { recursive: true })
  await copyFile(placeholder, path.join(directory, 'original-name.jpg'))
  await writeFile(path.join(directory, 'info.json'), JSON.stringify({ ...info, ...fields }))
  return directory
}
const read = root => readProjectCollection(root, placeholder)
const ordered = entries => entries.map(entry => entry.folder)

test('new folders prepend once; manual order, unrestricted dates and missing entries survive', async t => {
  const root = await fixture(t)
  await addProject(root, 'older', { date: 'Future, or any text' })
  await addProject(root, 'existing', { date: '1900' })
  const orderPath = path.join(root, PROJECT_ORDER_FILE)
  await writeFile(orderPath, JSON.stringify(['existing', 'older', 'missing']))
  assert.deepEqual(ordered(await read(root)), ['existing', 'older'])
  await addProject(root, 'new-project', { date: 'long ago', slug: 'preserved-url' })
  const discovered = await read(root)
  assert.deepEqual(ordered(discovered), ['new-project', 'existing', 'older'])
  assert.equal(discovered[0].info.slug, 'preserved-url')
  assert.equal(discovered[0].info.date, 'long ago')
  assert.deepEqual(JSON.parse(await readFile(orderPath, 'utf8')), ['new-project', 'existing', 'older', 'missing'])
  await writeFile(orderPath, JSON.stringify(['older', 'existing', 'new-project', 'missing']))
  const mtime = (await stat(orderPath)).mtimeMs
  assert.deepEqual(ordered(await read(root)), ['older', 'existing', 'new-project'])
  assert.equal((await stat(orderPath)).mtimeMs, mtime)
  await rm(path.join(root, 'existing'), { recursive: true })
  assert.deepEqual(ordered(await read(root)), ['older', 'new-project'])
  assert.ok(JSON.parse(await readFile(orderPath, 'utf8')).includes('existing'))
})

test('new batch discovery uses folder creation time, never project dates', async t => {
  const root = await fixture(t)
  await addProject(root, 'alpha', { date: '3000' })
  await addProject(root, 'beta', { date: '1000' })
  const expected = await Promise.all(['alpha', 'beta'].map(async folder => ({ folder, created: (await stat(path.join(root, folder))).birthtimeMs })))
  expected.sort((a, b) => b.created - a.created || a.folder.localeCompare(b.folder, 'en'))
  assert.deepEqual(ordered(await read(root)), expected.map(item => item.folder))
})

test('simple sections, optional metadata and original filenames compile without renaming', async t => {
  const root = await fixture(t)
  await addProject(root, 'sample', {
    hero: { file: 'original-name.jpg', alt: 'A descriptive title', position: '50% 30%' },
    thumbnail: '@placeholder', roles: ['Branding', 'Logo'], labels: { date: 'YEAR' },
    sections: [
      { images: ['original-name.jpg'] },
      { title: 'Notes', body: 'First\n\nSecond' },
      { images: ['@placeholder', 'original-name.jpg'], aspectRatio: '2 / 3' },
      { images: ['@placeholder', '@placeholder', '@placeholder'] },
    ],
  })
  const [entry] = await read(root)
  assert.equal(entry.info.slug, 'sample')
  assert.equal(entry.info.date, 'Summer 2026')
  assert.equal(entry.hero.alt, 'A descriptive title')
  assert.equal(entry.hero.position, '50% 30%')
  assert.equal(entry.thumbnail.path, placeholder)
  assert.deepEqual(entry.sections.map(section => section.type), ['images', 'notes', 'images', 'images'])
  assert.deepEqual(entry.sections.filter(section => section.type === 'images').map(section => section.images.length), [1, 2, 3])
  assert.equal(entry.sections[2].aspectRatio, '2 / 3')
  assert.equal(entry.info.description, '')
  assert.equal(entry.info.siteUrl, undefined)
})

test('drafts and empty folders are ignored; invalid content leaves manual ordering untouched', async t => {
  const root = await fixture(t)
  await mkdir(path.join(root, 'empty'))
  await addProject(root, '_draft')
  assert.deepEqual(await read(root), [])
  const folder = await addProject(root, 'sample')
  const orderPath = path.join(root, PROJECT_ORDER_FILE)
  const before = await readFile(orderPath, 'utf8')
  for (const [fields, error] of [
    [{ hero: 'missing.jpg' }, /ENOENT/],
    [{ hero: '../elsewhere.jpg' }, /inside this project/],
    [{ date: 2026 }, /date must be/],
    [{ roles: 'Designer' }, /roles must be/],
    [{ sections: [{ images: [] }] }, /one, two or three/],
    [{ sections: [{ images: Array(4).fill('@placeholder') }] }, /one, two or three/],
    [{ sections: [{ images: ['@placeholder'], aspectRatio: '0 / 1' }] }, /positive ratio/],
    [{ sections: [{ title: 'Notes', body: 123 }] }, /text or an array/],
    [{ sections: [{ title: 'Notes', body: [{ type: 'unknown' }] }] }, /paragraph or list/],
    [{ heroo: 'original-name.jpg' }, /unknown field/],
    [{ siteUrl: 'javascript:alert(1)' }, /URL/],
  ]) {
    await writeFile(path.join(folder, 'info.json'), JSON.stringify({ ...info, ...fields }))
    await assert.rejects(read(root), error)
    assert.equal(await readFile(orderPath, 'utf8'), before)
  }
  await writeFile(path.join(folder, 'info.json'), '{')
  await assert.rejects(read(root), /sample\/info.json/)
  await symlink(placeholder, path.join(folder, 'outside.jpg'))
  await writeFile(path.join(folder, 'info.json'), JSON.stringify({ ...info, hero: 'outside.jpg' }))
  await assert.rejects(read(root), /inside this project folder/)
})

test('duplicate slugs and malformed ordering give actionable errors', async t => {
  const root = await fixture(t)
  await addProject(root, 'first', { slug: 'same' })
  await addProject(root, 'second', { slug: 'same' })
  await assert.rejects(read(root), /duplicate slug/)
  await addProject(root, 'second')
  for (const value of [['first', 'first'], ['Wrong name'], 'first', {}]) {
    await writeFile(path.join(root, PROJECT_ORDER_FILE), JSON.stringify(value))
    await assert.rejects(read(root), /unique project folder names/)
  }
})

test('GIFs produce still thumbnails and a cached animation with preserved frames', async t => {
  const root = await fixture(t)
  const gif = path.join(root, 'test.gif')
  const pixels = Buffer.concat([Buffer.alloc(20 * 20 * 3, 50), Buffer.alloc(20 * 20 * 3, 200)])
  await sharp(pixels, { raw: { width: 20, height: 40, channels: 3, pageHeight: 20 } })
    .gif({ delay: [100, 200], loop: 0 }).toFile(gif)
  const original = await readFile(gif)
  const cache = path.join(root, 'cache')
  const variants = await createImageOptimizer(cache)(gif)
  for (const variant of Object.values(variants)) {
    assert.equal((await sharp(variant.path).metadata()).pages ?? 1, 1)
    assert.equal(variant.width, 20)
    assert.equal(variant.height, 20)
  }
  const optimize = createAnimationOptimizer(cache)
  const animation = await optimize(gif)
  const metadata = await sharp(animation, { animated: true }).metadata()
  assert.equal(metadata.pages, 2)
  assert.equal(metadata.width, 20)
  assert.equal(metadata.pageHeight, 20)
  assert.deepEqual(metadata.delay, [100, 200])
  const mtime = (await stat(animation)).mtimeMs
  assert.equal(await createAnimationOptimizer(cache)(gif), animation)
  assert.equal((await stat(animation)).mtimeMs, mtime)
  assert.equal(await optimize(placeholder), undefined)
  assert.deepEqual(await readFile(gif), original)
})

test('Vite discovers projects, respects URL base, and refreshes JSON/order/image edits', async t => {
  const root = await fixture(t)
  const projects = path.join(root, 'src/content/projects')
  const first = await addProject(projects, 'first')
  const server = await createServer({
    configFile: false, root, base: '/portfolio-2026/', plugins: [mediaContent()], logLevel: 'silent',
    server: { middlewareMode: true, watch: { usePolling: true, interval: 30 } }, optimizeDeps: { noDiscovery: true },
  })
  t.after(() => server.close())
  await new Promise(resolve => server.watcher.once('ready', resolve))
  const id = 'virtual:portfolio-projects'
  assert.match((await server.transformRequest(id)).code, /"slug":"first"/)
  const imageId = '/src/content/projects/first/original-name.jpg?portfolio-image'
  const initialImage = (await server.transformRequest(imageId)).code
  assert.match(initialImage, /portfolio-2026\/node_modules\/.cache\/portfolio-media/)
  const eventually = async check => {
    const deadline = Date.now() + 5000
    while (Date.now() < deadline) {
      if (await check()) return
      await new Promise(resolve => setTimeout(resolve, 60))
    }
    assert.fail('Expected content refresh within five seconds')
  }
  await writeFile(path.join(first, 'info.json'), JSON.stringify({ ...info, title: 'Edited title' }))
  await eventually(async () => /Edited title/.test((await server.transformRequest(id)).code))
  const second = await addProject(projects, 'second')
  await eventually(async () => {
    const code = (await server.transformRequest(id)).code
    return code.includes('"slug":"second"') && code.indexOf('"slug":"second"') < code.indexOf('"slug":"first"')
  })
  assert.deepEqual(JSON.parse(await readFile(path.join(projects, PROJECT_ORDER_FILE), 'utf8')), ['second', 'first'])
  await writeFile(path.join(projects, PROJECT_ORDER_FILE), JSON.stringify(['first', 'second']))
  await eventually(async () => {
    const code = (await server.transformRequest(id)).code
    return code.indexOf('"slug":"first"') < code.indexOf('"slug":"second"')
  })
  await sharp({ create: { width: 70, height: 50, channels: 3, background: '#bcdefa' } }).jpeg().toFile(path.join(first, 'original-name.jpg'))
  await eventually(async () => /width:70,height:50/.test((await server.transformRequest(imageId)).code))
  assert.notEqual((await server.transformRequest(imageId)).code, initialImage)
  await rm(second, { recursive: true })
  await eventually(async () => !(await server.transformRequest(id)).code.includes('"slug":"second"'))
})
