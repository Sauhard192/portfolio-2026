import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { MediaItem } from '../../types/media'
import { createPosterTexture } from './posterTexture'
import { getCachedSpiralImage, loadSpiralImage } from './spiralImageRequests'

export interface SpiralImageState {
  status: 'loading' | 'ready' | 'error'
  texture: THREE.Texture | null
  readyAt: number
  retry: () => void
}

export function useSpiralImages(items: MediaItem[], aspect: number, anisotropy: number,
  onErrors: (items: Array<{ title: string; retry: () => void }>) => void) {
  const entries = useMemo<SpiralImageState[]>(() => items.map(() => ({
    status: 'loading', texture: null, readyAt: Infinity, retry: () => {},
  })), [items])

  useEffect(() => {
    let active = true
    const publishErrors = () => onErrors(entries.flatMap((entry, index) => entry.status === 'error'
      ? [{ title: items[index].title, retry: entry.retry }] : []))
    const start = (index: number, retry = false) => {
      const entry = entries[index]
      const item = items[index]
      entry.status = 'loading'
      const cached = Boolean(getCachedSpiralImage(item.image.spiralSrc)) && !retry
      publishErrors()
      void loadSpiralImage(item.image.spiralSrc, retry).then(image => {
        if (!active) return
        const source = new THREE.Texture(image)
        const texture = createPosterTexture(source, item.image.width / item.image.height, aspect)
        source.dispose()
        texture.anisotropy = anisotropy
        entry.texture?.dispose()
        entry.texture = texture
        entry.readyAt = cached ? -Infinity : performance.now()
        entry.status = 'ready'
      }, () => {
        if (!active) return
        entry.status = 'error'
        publishErrors()
      })
    }
    entries.forEach((entry, index) => {
      entry.retry = () => { if (active && entry.status === 'error') start(index, true) }
      start(index)
    })
    return () => {
      active = false
      entries.forEach(entry => { entry.texture?.dispose(); entry.texture = null })
    }
  }, [anisotropy, aspect, entries, items, onErrors])
  return entries
}
