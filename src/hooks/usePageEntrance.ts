import { type RefObject, useLayoutEffect } from 'react'
import { gsap } from 'gsap'

const VIEWPORT_EDGE_BUFFER = 64

const isVisibleInViewport = (element: HTMLElement) => {
  const bounds = element.getBoundingClientRect()
  return (
    bounds.bottom > -VIEWPORT_EDGE_BUFFER &&
    bounds.top < window.innerHeight + VIEWPORT_EDGE_BUFFER
  )
}

export function usePageEntrance(scopeRef: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const scope = scopeRef.current
    if (!scope) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const headerElements = Array.from(
      scope.querySelectorAll<HTMLElement>('[data-page-header]'),
    )
    const allTextLines = Array.from(
      scope.querySelectorAll<HTMLElement>('[data-enter-text]'),
    )
    const allImages = Array.from(
      scope.querySelectorAll<HTMLElement>('[data-enter-image]'),
    )
    const allMetadata = Array.from(
      scope.querySelectorAll<HTMLElement>('[data-enter-meta]'),
    )
    const allElements = [...headerElements, ...allTextLines, ...allImages, ...allMetadata]

    if (headerElements.length > 0) gsap.set(headerElements, { opacity: 0 })
    if (allTextLines.length > 0) gsap.set(allTextLines, { opacity: 0, y: 24 })
    if (allImages.length > 0) {
      gsap.set(allImages, { opacity: 0 })
    }
    if (allMetadata.length > 0) gsap.set(allMetadata, { opacity: 0, y: 14 })

    let timeline: gsap.core.Timeline | null = null
    let entranceFrame = 0
    const gallery = scope.querySelector<HTMLElement>('.project-gallery')

    const startEntrance = () => {
      entranceFrame = requestAnimationFrame(() => {
        const textLines = allTextLines.filter(isVisibleInViewport)
        const visibleImages = allImages.filter(isVisibleInViewport)
        const images = gsap.utils.shuffle([...visibleImages])
        const metadata = allMetadata.filter(isVisibleInViewport)
        const hiddenTextLines = allTextLines.filter((element) => !textLines.includes(element))
        const hiddenImages = allImages.filter((element) => !visibleImages.includes(element))
        const hiddenMetadata = allMetadata.filter((element) => !metadata.includes(element))

        if (hiddenTextLines.length > 0) {
          gsap.set(hiddenTextLines, { clearProps: 'opacity,transform' })
        }
        if (hiddenImages.length > 0) {
          gsap.set(hiddenImages, { clearProps: 'opacity' })
        }
        if (hiddenMetadata.length > 0) {
          gsap.set(hiddenMetadata, { clearProps: 'opacity,transform' })
        }

        if (reducedMotion) {
          timeline = gsap.timeline().to(
            [...headerElements, ...textLines, ...images, ...metadata],
            {
              opacity: 1,
              y: 0,
              duration: 0.22,
              stagger: 0.025,
              ease: 'power2.out',
            },
          )
          return
        }

        timeline = gsap.timeline({ defaults: { ease: 'power3.out' } })

        if (headerElements.length > 0) {
          timeline.to(headerElements, { opacity: 1, duration: 0.38 })
        }

        if (textLines.length > 0) {
          timeline.to(
            textLines,
            { opacity: 1, y: 0, duration: 0.62, stagger: 0.09 },
            '-=0.08',
          )
        }

        if (images.length > 0) {
          timeline.to(
            images,
            {
              opacity: 1,
              duration: 0.62,
              stagger: 0.075,
              ease: 'power2.out',
            },
            '-=0.18',
          )
        }

        if (metadata.length > 0) {
          timeline.to(
            metadata,
            { opacity: 1, y: 0, duration: 0.46, stagger: 0.07 },
            '+=0.15',
          )
        }
      })
    }

    if (gallery && gallery.dataset.entranceReady !== 'true') {
      gallery.addEventListener('portfolio:gallery-ready', startEntrance, { once: true })
    } else {
      startEntrance()
    }

    return () => {
      gallery?.removeEventListener('portfolio:gallery-ready', startEntrance)
      cancelAnimationFrame(entranceFrame)
      timeline?.kill()
      if (allElements.length > 0) {
        gsap.set(allElements, { clearProps: 'opacity,transform' })
      }
    }
  }, [scopeRef])
}
