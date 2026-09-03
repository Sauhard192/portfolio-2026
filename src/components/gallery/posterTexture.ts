import { SRGBColorSpace, type Texture } from 'three'

// Own the crop settings; never mutate useLoader's shared cached texture.
export function createPosterTexture(source: Texture, sourceAspect: number, cardAspect: number) {
  const texture = source.clone()
  const cropX = Math.min(1, cardAspect / sourceAspect)
  const cropY = Math.min(1, sourceAspect / cardAspect)
  texture.repeat.set(cropX, cropY)
  texture.offset.set((1 - cropX) / 2, (1 - cropY) / 2)
  texture.colorSpace = SRGBColorSpace
  texture.needsUpdate = true
  return texture
}
