import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { normalizePath, type Plugin } from 'vite'
import type { MediaCollection, MediaItem } from '../src/types/media.ts'
import { createImageOptimizer } from './mediaImages.ts'

interface ContentEntry extends Omit<MediaItem, 'image'> {
  imagePath: string
  infoPath: string
  image: Pick<MediaItem['image'], 'alt' | 'width' | 'height'>
}

export function formatContentDate(value: string): string {
  if (/^(?!0000)\d{4}$/.test(value)) return value
  if (!/^(?!0000)\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Invalid date "${value}". Use YYYY-MM-DD, or YYYY when only the year is known.`)
  }
  const date = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error(`Invalid date "${value}". Use a real YYYY-MM-DD date.`)
  }
  return new Intl.DateTimeFormat('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  }).format(date)
}

// Build-time only: no filesystem or metadata library enters the browser.
export async function readMediaCollection(directory: string): Promise<ContentEntry[]> {
  const folders = await readdir(directory, { withFileTypes: true })
  const entries = await Promise.all(folders
    .filter((folder) => folder.isDirectory() && !/^[._]/.test(folder.name))
    .map(async (folder): Promise<ContentEntry> => {
      const itemDirectory = path.join(directory, folder.name)
      try {
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(folder.name)) {
          throw new Error('Folder names must use lowercase letters, numbers and single hyphens.')
        }
        const infoPath = path.join(itemDirectory, 'info.json')
        const info: unknown = JSON.parse(await readFile(infoPath, 'utf8'))
        if (!info || typeof info !== 'object' || Array.isArray(info)) {
          throw new Error('info.json must contain an object.')
        }
        const fields = info as Record<string, unknown>
        const requiredText = (key: string) => {
          const value = fields[key]
          if (typeof value !== 'string' || !value.trim()) {
            throw new Error(`info.json needs a non-empty "${key}" string.`)
          }
          return value.trim()
        }
        const title = requiredText('title')
        const caption = requiredText('caption')
        const dateISO = requiredText('date')
        const date = formatContentDate(dateISO)
        if (fields.location !== undefined && typeof fields.location !== 'string') {
          throw new Error('info.json "location" must be a string or omitted.')
        }
        const location = (fields.location as string | undefined)?.trim() || undefined
        const alt = fields.alt === undefined ? caption : requiredText('alt')
        const files = await readdir(itemDirectory, { withFileTypes: true })
        const images = files.filter((file) => file.isFile() && /^image\.(webp|avif|jpe?g|png)$/i.test(file.name))
        if (images.length !== 1) {
          throw new Error('Keep exactly one image.webp, image.avif, image.jpg, image.jpeg or image.png in this folder.')
        }
        const imagePath = path.join(itemDirectory, images[0].name)
        const dimensions = await sharp(imagePath).metadata()
        // Browsers apply EXIF orientation when displaying camera photographs.
        const rotated = dimensions.orientation !== undefined && dimensions.orientation >= 5 && dimensions.orientation <= 8
        const width = rotated ? dimensions.height : dimensions.width
        const height = rotated ? dimensions.width : dimensions.height
        if (!width || !height) throw new Error('Could not determine image dimensions.')
        return {
          slug: folder.name, title, caption, date, dateISO, location,
          imagePath, infoPath, image: { alt, width, height },
        }
      } catch (error) {
        throw new Error(`${itemDirectory}: ${error instanceof Error ? error.message : String(error)}`)
      }
    }))
  // Newest first; year-only entries follow dated entries in that year. Slugs break ties.
  return entries.sort((a, b) => b.dateISO.localeCompare(a.dateISO) || a.slug.localeCompare(b.slug, 'en'))
}

const prefix = 'virtual:portfolio-media/'
const collections: MediaCollection[] = ['art', 'photography']

export function mediaContent(): Plugin {
  let contentRoot: string
  let building = false
  let optimizeImage: ReturnType<typeof createImageOptimizer>
  const isContentFile = (file: string) => collections.some((collection) =>
    normalizePath(file).startsWith(`${normalizePath(path.join(contentRoot, collection))}/`),
  )
  return {
    name: 'portfolio-media-content',
    configResolved(config) {
      contentRoot = path.resolve(config.root, 'src/content')
      building = config.command === 'build'
      optimizeImage = createImageOptimizer(path.resolve(config.root, 'node_modules/.cache/portfolio-media'))
    },
    resolveId(id) {
      if (collections.some((collection) => id === `${prefix}${collection}`)) return `\0${id}`
    },
    async load(id) {
      const collection = collections.find((name) => id === `\0${prefix}${name}`)
      if (!collection) return
      const directory = path.join(contentRoot, collection)
      if (building) this.addWatchFile(directory)
      const entries = await readMediaCollection(directory)
      const imports: string[] = []
      const items: string[] = []
      for (const [index, { imagePath, infoPath, image, ...item }] of entries.entries()) {
        if (building) {
          this.addWatchFile(imagePath)
          this.addWatchFile(infoPath)
        }
        const variants = await optimizeImage(imagePath)
        for (const [name, variant] of Object.entries(variants)) {
          imports.push(`import image${index}_${name} from ${JSON.stringify(`${normalizePath(variant.path)}?url&no-inline`)};`)
        }
        const small = `image${index}_small`
        const medium = `image${index}_medium`
        const srcSet = variants.small.width === variants.medium.width
          ? `${medium} + ' ${variants.medium.width}w'`
          : `${small} + ' ${variants.small.width}w, ' + ${medium} + ' ${variants.medium.width}w'`
        items.push(`{...${JSON.stringify(item)},image:{...${JSON.stringify(image)},src:image${index}_detail,spiralSrc:image${index}_spiral,thumbnail:{src:${small},srcSet:${srcSet}}}}`)
      }
      return `${imports.join('\n')}\nexport default [${items.join(',\n')}];`
    },
    configureServer(server) {
      // New/deleted folders also change the dataset, not just edited files.
      server.watcher.add(collections.map((collection) => path.join(contentRoot, collection)))
      let timer: ReturnType<typeof setTimeout> | undefined
      const refresh = (file: string) => {
        if (!isContentFile(file)) return
        clearTimeout(timer)
        timer = setTimeout(() => {
          for (const collection of collections) {
            const module = server.moduleGraph.getModuleById(`\0${prefix}${collection}`)
            if (module) server.moduleGraph.invalidateModule(module)
          }
          server.ws.send({ type: 'full-reload' })
        }, 150)
      }
      for (const event of ['add', 'change', 'unlink', 'addDir', 'unlinkDir'] as const) {
        server.watcher.on(event, refresh)
      }
      server.httpServer?.once('close', () => {
        clearTimeout(timer)
        for (const event of ['add', 'change', 'unlink', 'addDir', 'unlinkDir'] as const) {
          server.watcher.off(event, refresh)
        }
      })
    },
    handleHotUpdate(context) {
      if (isContentFile(context.file)) return [] // Refresh the collection together.
    },
  }
}
