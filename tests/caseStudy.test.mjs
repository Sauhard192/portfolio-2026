import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFile } from 'node:fs/promises'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { mediaContent } from '../build/mediaContent.ts'
import { footerProgress, nextProjectIndex } from '../src/components/case-study/caseStudyNavigation.ts'

test('next-project navigation follows the shared sequence and wraps', () => {
  assert.equal(nextProjectIndex(2, 12), 3)
  assert.equal(nextProjectIndex(11, 12), 0)
  assert.equal(nextProjectIndex(0, 1), -1)
  assert.equal(nextProjectIndex(-1, 12), -1)
  assert.equal(nextProjectIndex(0, 0), -1)
})

test('footer progress starts at pinning, fills over one screen, reverses and clamps', () => {
  assert.equal(footerProgress(900, 1000, 800), 0)
  assert.equal(footerProgress(1000, 1000, 800), 0)
  assert.equal(footerProgress(1400, 1000, 800), 0.5)
  assert.equal(footerProgress(1200, 1000, 800), 0.25)
  assert.equal(footerProgress(1800, 1000, 800), 1)
  assert.equal(footerProgress(1799.5, 1000.03, 800), 1)
  assert.equal(footerProgress(2000, 1000, 800), 1)
  assert.equal(footerProgress(1000, 1000, 0), 0)
})

test('project files share optimized images, ordered sections and independent metadata', async (t) => {
  const server = await createServer({
    configFile: false, base: '/portfolio-2026/', plugins: [react(), mediaContent()],
    logLevel: 'silent', server: { middlewareMode: true }, optimizeDeps: { noDiscovery: true },
  })
  t.after(() => server.close())
  const { caseStudies } = await server.ssrLoadModule('/src/content/caseStudies.ts')
  assert.equal(caseStudies.length, 12)
  assert.equal(new Set(caseStudies.map(p => p.slug)).size, caseStudies.length)
  const project = caseStudies[2]
  assert.equal(project.slug, 'jelli-studios')
  assert.equal(caseStudies[3].slug, 'uptrendly-app')
  assert.equal(project.date, '2022')
  const projectInfo = JSON.parse(await readFile(new URL('../src/content/projects/jelli-studio/info.json', import.meta.url), 'utf8'))
  assert.deepEqual(project.roles, projectInfo.roles)
  assert.deepEqual(project.sections.map(s => s.type), projectInfo.sections.map(s => s.images ? 'images' : 'notes'))
  assert.deepEqual(project.sections.filter(s => s.type === 'images').map(s => s.images.length),
    projectInfo.sections.filter(s => s.images).map(s => s.images.length))
  assert.equal(project.siteUrl, '')
  for (const p of caseStudies) {
    assert.equal(typeof p.hero, 'object')
    assert.match(p.hero.src, /-detail\.webp/)
    assert.match(p.hero.thumbnail.src, /-small\.webp/)
    assert.match(p.hero.thumbnail.srcSet, /\d+w/)
    assert.ok(p.hero.width > 0 && p.hero.height > 0)
    if (p !== project) assert.equal(p.sections.length, 0)
  }
  // The custom query must beat Vite's ordinary image-URL resolver in the client too.
  const transformed = await server.transformRequest('/src/assets/projects/project-placeholder.jpeg?portfolio-image')
  assert.match(transformed.code, /thumbnail:/)
  assert.match(transformed.code, /-small.webp/)

  const { CaseImage, ProjectSection, ProjectText } = await server.ssrLoadModule('/src/components/case-study/ProjectSections.tsx')
  const initialAnimation = renderToStaticMarkup(createElement(CaseImage, { image: { ...project.hero, animatedSrc: '/animation.webp' } }))
  assert.doesNotMatch(initialAnimation, /animation.webp/)
  assert.match(initialAnimation, /srcSet=/)
  const section = renderToStaticMarkup(createElement(ProjectSection, { section: {
    type: 'images', images: [project.hero, project.hero, project.hero],
  } }))
  assert.equal((section.match(/<img /g) ?? []).length, 3)
  assert.match(section, /loading="lazy"/)
  assert.match(section, /data-columns="3"/)
  for (const count of [1, 2, 3]) {
    const markup = renderToStaticMarkup(createElement(ProjectSection, { section: {
      type: 'images', images: Array(count).fill(project.hero), aspectRatio: '4 / 1',
    } }))
    assert.doesNotMatch(markup, /--case-image-ratio/)
    assert.equal((markup.match(/<img /g) ?? []).length, count)
  }
  const notes = renderToStaticMarkup(createElement(ProjectText, { body: [
    { type: 'paragraph', content: ['Read ', { text: 'the research', href: 'https://example.com/research' }] },
    { type: 'list', ordered: true, items: [['First'], ['Second']] },
  ] }))
  assert.match(notes, /<a href="https:\/\/example.com\/research"/)
  assert.match(notes, /<ol><li>First<\/li><li>Second<\/li><\/ol>/)
  assert.equal(renderToStaticMarkup(createElement(ProjectText, { body: 'First paragraph\n\nSecond paragraph' })),
    '<div class="case-study__prose"><p>First paragraph</p><p>Second paragraph</p></div>')
})
