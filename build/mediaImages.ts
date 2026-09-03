import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, rename } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

// Maximum long edge, in pixels. Originals are never overwritten or shipped.
export const IMAGE_PRESETS = {
  small: { size: 480, quality: 82 },
  medium: { size: 960, quality: 84 },
  spiral: { size: 1024, quality: 84 },
  detail: { size: 2560, quality: 88 },
} as const

interface ImageVariant { path: string; width: number; height: number }
export type ImageVariants = Record<keyof typeof IMAGE_PRESETS, ImageVariant>

export function createImageOptimizer(cacheDirectory: string) {
  const jobs = new Map<string, Promise<ImageVariants>>()
  return async (imagePath: string): Promise<ImageVariants> => {
    const input = await readFile(imagePath)
    const hash = createHash('sha256')
      .update(input).update(JSON.stringify(IMAGE_PRESETS)).update(sharp.versions.sharp)
      .update('auto-orient-srgb-v1').digest('hex').slice(0, 24)
    const existing = jobs.get(hash)
    if (existing) return existing

    const job = (async () => {
      await mkdir(cacheDirectory, { recursive: true })
      const variants = {} as ImageVariants
      // Bound encoder work: one image/variant at a time per collection.
      for (const [name, preset] of Object.entries(IMAGE_PRESETS)) {
        const output = path.join(cacheDirectory, `${hash}-${name}.webp`)
        let metadata
        try {
          metadata = await sharp(output).metadata()
        } catch {
          const temporary = `${output}.${randomUUID()}.tmp`
          const result = await sharp(input).rotate()
            .resize({ width: preset.size, height: preset.size, fit: 'inside', withoutEnlargement: true })
            .toColourspace('srgb').webp({ quality: preset.quality }).toFile(temporary)
          await rename(temporary, output)
          metadata = result
        }
        variants[name as keyof ImageVariants] = {
          path: output, width: metadata.width!, height: metadata.height!,
        }
      }
      return variants
    })()
    jobs.set(hash, job)
    job.catch(() => jobs.delete(hash))
    return job
  }
}
