import { readFileSync, writeFileSync } from 'node:fs'
import { readdir, readFile, realpath, stat } from 'node:fs/promises'
import path from 'node:path'
import type { ProjectBody, ProjectInfo } from '../src/types/caseStudy.ts'

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
export const PROJECT_ORDER_FILE = 'project-order.json'
export interface ProjectFile { path: string; alt: string; position?: string }
export interface ProjectEntry {
  folder: string
  created: number
  infoPath: string
  info: Omit<ProjectInfo, 'hero' | 'thumbnail' | 'sections'> & { slug: string }
  hero: ProjectFile
  thumbnail?: ProjectFile
  sections: Array<
    | { type: 'notes'; title: string; body: ProjectBody }
    | { type: 'images'; images: ProjectFile[]; aspectRatio?: string }
  >
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object.`)
  return value as Record<string, unknown>
}

function keys(fields: Record<string, unknown>, allowed: string[], label: string) {
  for (const key of Object.keys(fields)) {
    if (!allowed.includes(key)) throw new Error(`${label}: unknown field "${key}".`)
  }
}

function text(value: unknown, label: string, allowEmpty = true): string {
  if (typeof value !== 'string' || (!allowEmpty && !value.trim())) throw new Error(`${label} must be ${allowEmpty ? 'a' : 'a non-empty'} string.`)
  return value // Dates and copy are intentionally not normalized.
}

function ratio(value: unknown, label: string): string | undefined {
  if (value === undefined) return
  const result = text(value, label)
  if (!/^\s*(?:\d+(?:\.\d+)?|\.\d+)\s*(?:\/\s*(?:\d+(?:\.\d+)?|\.\d+)\s*)?$/.test(result)
    || result.split('/').some(part => Number(part) <= 0)) throw new Error(`${label} needs a positive ratio such as "2 / 1".`)
  return result
}

function url(value: unknown, label: string): string {
  const result = text(value, label)
  if (result && !/^(https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i.test(result)) throw new Error(`${label} needs an http(s), mailto, tel, or local URL.`)
  return result
}

function body(value: unknown, label: string): ProjectBody {
  if (typeof value === 'string') return value
  if (!Array.isArray(value)) throw new Error(`${label} must be text or an array of paragraph/list blocks.`)
  const runs = (items: unknown, context: string) => {
    if (!Array.isArray(items)) throw new Error(`${context} must be an array.`)
    return items.map(item => {
      if (typeof item === 'string') return item
      const run = object(item, context)
      keys(run, ['text', 'href'], context)
      return { text: text(run.text, `${context}.text`), href: url(run.href, `${context}.href`) }
    })
  }
  return value.map((item, index) => {
    const context = `${label}[${index}]`
    const block = object(item, context)
    if (block.type === 'paragraph') {
      keys(block, ['type', 'content'], context)
      return { type: 'paragraph', content: runs(block.content, `${context}.content`) }
    }
    if (block.type !== 'list' || !Array.isArray(block.items)) throw new Error(`${context} needs a paragraph or list block.`)
    keys(block, ['type', 'items', 'ordered'], context)
    if (block.ordered !== undefined && typeof block.ordered !== 'boolean') throw new Error(`${context}.ordered must be true or false.`)
    return { type: 'list', items: block.items.map(item => runs(item, `${context}.items`)), ordered: block.ordered as boolean | undefined }
  })
}

async function readProject(directory: string, folder: string, placeholderPath: string): Promise<ProjectEntry | undefined> {
  const infoPath = path.join(directory, 'info.json')
  let source: string
  try { source = await readFile(infoPath, 'utf8') } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return // Empty/new folders are not published yet.
    throw error
  }
  try {
    if (!slugPattern.test(folder)) throw new Error('Folder names must use lowercase letters, numbers and single hyphens.')
    const fields = object(JSON.parse(source), 'info.json')
    keys(fields, ['slug', 'title', 'roles', 'projectType', 'date', 'description', 'labels', 'siteUrl', 'hero', 'heroAspectRatio', 'thumbnail', 'sections'], 'info.json')
    const title = text(fields.title, 'title', false)
    const slug = fields.slug === undefined ? folder : text(fields.slug, 'slug', false)
    if (!slugPattern.test(slug)) throw new Error('slug must use lowercase letters, numbers and single hyphens.')
    const roles = fields.roles ?? []
    if (!Array.isArray(roles)) throw new Error('roles must be an array of strings.')
    const projectRoot = await realpath(directory)
    const image = async (value: unknown, label: string): Promise<ProjectFile> => {
      const imageFields = typeof value === 'string' ? { file: value } : object(value, label)
      keys(imageFields, ['file', 'alt', 'position'], label)
      const file = text(imageFields.file, `${label}.file`, false)
      let imagePath: string
      if (file === '@placeholder') imagePath = placeholderPath
      else {
        if (path.isAbsolute(file) || file.includes('\\') || file.split('/').includes('..') || /[?#]/.test(file)) throw new Error(`${label}: use a filename inside this project folder.`)
        imagePath = await realpath(path.join(directory, file))
        if (!imagePath.startsWith(projectRoot + path.sep)) throw new Error(`${label}: image must stay inside this project folder.`)
        if (!/\.(jpe?g|png|webp|avif|gif)$/i.test(file) || !(await stat(imagePath)).isFile()) throw new Error(`${label}: use JPG, PNG, WebP, AVIF or GIF.`)
      }
      return {
        path: imagePath,
        alt: imageFields.alt === undefined ? (file === '@placeholder' ? 'Temporary project image' : title) : text(imageFields.alt, `${label}.alt`),
        position: imageFields.position === undefined ? undefined : text(imageFields.position, `${label}.position`),
      }
    }
    let labels: ProjectInfo['labels']
    if (fields.labels !== undefined) {
      const values = object(fields.labels, 'labels')
      keys(values, ['projectType', 'date', 'description'], 'labels')
      labels = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, text(value, `labels.${key}`)]))
    }
    const rawSections = fields.sections ?? []
    if (!Array.isArray(rawSections)) throw new Error('sections must be an array.')
    const sections: ProjectEntry['sections'] = []
    for (const [index, rawSection] of rawSections.entries()) {
      const label = `sections[${index}]`
      const section = object(rawSection, label)
      if ('images' in section) {
        keys(section, ['images', 'aspectRatio'], label)
        if (!Array.isArray(section.images) || section.images.length < 1 || section.images.length > 3) throw new Error(`${label}.images needs one, two or three filenames.`)
        sections.push({ type: 'images', images: await Promise.all(section.images.map((value, i) => image(value, `${label}.images[${i}]`))), aspectRatio: ratio(section.aspectRatio, `${label}.aspectRatio`) })
      } else {
        keys(section, ['title', 'body'], label)
        sections.push({ type: 'notes', title: text(section.title, `${label}.title`), body: body(section.body, `${label}.body`) })
      }
    }
    return {
      folder, created: (await stat(directory)).birthtimeMs, infoPath,
      info: {
        slug, title, roles: roles.map(role => text(role, 'roles[]')),
        projectType: text(fields.projectType ?? '', 'projectType'), date: text(fields.date ?? '', 'date'),
        description: body(fields.description ?? '', 'description'), labels,
        siteUrl: fields.siteUrl === undefined ? undefined : url(fields.siteUrl, 'siteUrl'),
        heroAspectRatio: ratio(fields.heroAspectRatio, 'heroAspectRatio'),
      },
      hero: await image(fields.hero, 'hero'),
      thumbnail: fields.thumbnail === undefined ? undefined : await image(fields.thumbnail, 'thumbnail'), sections,
    }
  } catch (error) {
    throw new Error(`${infoPath}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

export async function readProjectCollection(directory: string, placeholderPath: string): Promise<ProjectEntry[]> {
  let folders
  try { folders = await readdir(directory, { withFileTypes: true }) } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }
  const entries: ProjectEntry[] = []
  for (const folder of folders) {
    if (!folder.isDirectory() || /^[._]/.test(folder.name)) continue
    const entry = await readProject(path.join(directory, folder.name), folder.name, placeholderPath)
    if (entry) entries.push(entry)
  }
  const slugs = new Set<string>()
  for (const entry of entries) {
    if (slugs.has(entry.info.slug)) throw new Error(`${entry.infoPath}: duplicate slug "${entry.info.slug}".`)
    slugs.add(entry.info.slug)
  }

  const orderPath = path.join(directory, PROJECT_ORDER_FILE)
  // Keep this small read/update synchronous so concurrent Vite loads cannot interleave it.
  let order: unknown = []
  let missingOrderFile = false
  try { order = JSON.parse(readFileSync(orderPath, 'utf8')) } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw new Error(`${orderPath}: ${String(error)}`)
    missingOrderFile = true
  }
  if (!Array.isArray(order) || order.some(item => typeof item !== 'string' || !slugPattern.test(item)) || new Set(order).size !== order.length) {
    throw new Error(`${orderPath}: use an array of unique project folder names.`)
  }
  const newFolders = entries.filter(entry => !order.includes(entry.folder))
    .sort((a, b) => b.created - a.created || a.folder.localeCompare(b.folder, 'en')).map(entry => entry.folder)
  const nextOrder: string[] = [...newFolders, ...order]
  if (newFolders.length || missingOrderFile) writeFileSync(orderPath, JSON.stringify(nextOrder, null, 2) + '\n')
  // Retain missing/draft entries in the file so restoring a folder preserves its place.
  return entries.sort((a, b) => nextOrder.indexOf(a.folder) - nextOrder.indexOf(b.folder))
}
