import * as THREE from 'three'

export function createSpiralPlaceholders() {
  const styles = getComputedStyle(document.documentElement)
  const base = styles.getPropertyValue('--image-skeleton-base').trim() || '#e4e4e4'
  const highlight = styles.getPropertyValue('--image-skeleton-highlight').trim() || '#f5f5f5'
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 8
  const context = canvas.getContext('2d')!
  const gradient = context.createLinearGradient(0, 0, 256, 0)
  gradient.addColorStop(0, base)
  gradient.addColorStop(0.35, base)
  gradient.addColorStop(0.5, highlight)
  gradient.addColorStop(0.65, base)
  gradient.addColorStop(1, base)
  context.fillStyle = gradient
  context.fillRect(0, 0, 256, 8)
  const shimmer = new THREE.CanvasTexture(canvas)
  shimmer.colorSpace = THREE.SRGBColorSpace
  shimmer.wrapS = THREE.RepeatWrapping

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
  return { shimmer, error }
}
