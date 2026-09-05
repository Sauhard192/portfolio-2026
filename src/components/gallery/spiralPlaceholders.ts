import * as THREE from 'three'

export function createSpiralPlaceholders() {
  const styles = getComputedStyle(document.documentElement)
  const base = styles.getPropertyValue('--image-skeleton-base').trim() || '#e4e4e4'
  const failure = document.createElement('canvas')
  failure.width = 512
  failure.height = 384
  const text = failure.getContext('2d')!
  text.fillStyle = base
  text.fillRect(0, 0, 512, 384)
  text.fillStyle = styles.getPropertyValue('--color-text-primary').trim() || '#100f0f'
  text.textAlign = 'center'
  text.font = '28px sans-serif'
  text.fillText('Image unavailable', 256, 175)
  text.strokeStyle = text.fillStyle
  text.strokeRect(176, 209, 160, 60)
  text.fillText('Retry', 256, 248)
  const error = new THREE.CanvasTexture(failure)
  error.colorSpace = THREE.SRGBColorSpace
  return { error }
}
