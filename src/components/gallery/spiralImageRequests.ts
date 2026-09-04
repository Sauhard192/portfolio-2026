// Cache decoded images, not GPU textures. Each mounted scene owns its textures.
const decoded = new Map<string, HTMLImageElement>()
const pending = new Map<string, Promise<HTMLImageElement>>()
export const getCachedSpiralImage = (src: string) => decoded.get(src)

export function loadSpiralImage(src: string, retry = false): Promise<HTMLImageElement> {
  if (retry) decoded.delete(src)
  const cached = decoded.get(src)
  if (cached) return Promise.resolve(cached)
  const active = pending.get(src)
  if (active) return active
  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    let settled = false
    const finish = (error?: Error) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      image.onload = image.onerror = null
      if (error) { reject(error); return }
      decoded.set(src, image)
      if (decoded.size > 64) decoded.delete(decoded.keys().next().value!)
      resolve(image)
    }
    const timeout = setTimeout(() => finish(new Error('Image request timed out')), 30000)
    image.crossOrigin = 'anonymous'
    image.decoding = 'async'
    image.onload = () => { image.decode().then(() => finish(), () => finish(new Error('Image could not be decoded'))) }
    image.onerror = () => finish(new Error('Image unavailable'))
    const url = new URL(src, document.baseURI)
    if (retry) url.searchParams.set('image-retry', String(Date.now()))
    image.src = url.href
  })
  pending.set(src, promise)
  void promise.then(() => pending.delete(src), () => pending.delete(src))
  return promise
}
