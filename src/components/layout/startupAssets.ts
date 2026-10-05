export const wait = (duration: number) => new Promise<void>((resolve) => {
  window.setTimeout(resolve, duration)
})

const waitForImage = (image: HTMLImageElement) => {
  if (image.complete) return image.decode?.().catch(() => undefined) ?? Promise.resolve()

  return new Promise<void>((resolve) => {
    const finish = () => resolve()
    image.addEventListener('load', finish, { once: true })
    image.addEventListener('error', finish, { once: true })
  })
}

export const waitForInitialMedia = async () => {
  // Let responsive galleries finish their first measurement before finding visible media.
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))

  const seenSources = new Set<string>()
  const visibleImages = Array.from(document.querySelectorAll<HTMLImageElement>('main img'))
    .filter((image) => {
      const bounds = image.getBoundingClientRect()
      const source = image.currentSrc || image.src
      if (!source || seenSources.has(source)) return false

      const visible = bounds.width > 0
        && bounds.height > 0
        && bounds.bottom > 0
        && bounds.top < window.innerHeight
      if (visible) seenSources.add(source)
      return visible
    })
    .slice(0, 4)

  await Promise.all(visibleImages.map(waitForImage))
}
