import { type RefObject, useLayoutEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { CASE_REVEAL_DELAY, CASE_REVEAL_DURATION, CASE_IMAGE_START_SCALE } from '../components/case-study/revealTiming'

const VIEWPORT_EDGE_BUFFER = 64

const isVisibleInViewport = (element: HTMLElement) => {
  const bounds = element.getBoundingClientRect()
  return (
    bounds.bottom > -VIEWPORT_EDGE_BUFFER &&
    bounds.top < window.innerHeight + VIEWPORT_EDGE_BUFFER
  )
}

export function usePageEntrance(scopeRef: RefObject<HTMLElement | null>, view?: string) {
  const previousView = useRef(view)
  useLayoutEffect(() => {
    const scope = scopeRef.current
    if (!scope) return
    const switchingView = previousView.current !== view
    previousView.current = view
    // Other view switches keep their existing whole-surface fade.
    if (switchingView && view !== 'grid') return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const headerElements = Array.from(
      switchingView ? [] : scope.querySelectorAll<HTMLElement>('[data-page-header]'),
    )
    const allTextLines = Array.from(
      scope.querySelectorAll<HTMLElement>('[data-enter-text]'),
    )
    let allImages = Array.from(
      scope.querySelectorAll<HTMLElement>('[data-enter-image]'),
    )
    const allMetadata = Array.from(
      scope.querySelectorAll<HTMLElement>('[data-enter-meta]'),
    )

    if (headerElements.length > 0) gsap.set(headerElements, { opacity: 0 })
    if (allTextLines.length > 0) gsap.set(allTextLines, { opacity: 0, y: 24 })
    if (allImages.length > 0) {
      gsap.set(allImages, { opacity: 0 })
    }
    const hero = scope.querySelector<HTMLElement>('.case-study__hero')
    if (hero && !reducedMotion) gsap.set(hero, { clipPath: 'inset(100% 0% 0% 0%)' })
    if (allMetadata.length > 0) gsap.set(allMetadata, { opacity: 0, y: 14 })

    let timeline: gsap.core.Timeline | null = null
    let entranceFrame = 0
    const gallery = scope.querySelector<HTMLElement>('.project-gallery')

    const startEntrance = () => {
      cancelAnimationFrame(entranceFrame)
      entranceFrame = requestAnimationFrame(() => {
        // Let native scroll and Lenis settle the repeated track before measuring.
        entranceFrame = requestAnimationFrame(() => {
        // Responsive cycle sizing may have added cards since the first render.
        allImages = Array.from(scope.querySelectorAll<HTMLElement>('[data-enter-image]'))
        if (allImages.length) gsap.set(allImages, { opacity: 0 })
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
          gsap.set(hiddenImages, { clearProps: 'opacity,clipPath' })
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
          const maskedHero = hero && images.includes(hero)
          timeline.to(
            images,
            {
              opacity: 1,
              ...(maskedHero ? { clipPath: 'inset(0% 0% 0% 0%)', clearProps: 'clipPath' } : {}),
              duration: maskedHero ? CASE_REVEAL_DURATION : 0.62,
              stagger: 0.075,
              ease: 'power2.out',
            },
            maskedHero ? `+=${CASE_REVEAL_DELAY}` : '-=0.18',
          )
          const heroImage = maskedHero ? hero.querySelector('.progressive-image') : null
          if (heroImage) timeline.fromTo(heroImage,
            { scale: CASE_IMAGE_START_SCALE },
            { scale: 1, duration: CASE_REVEAL_DURATION, ease: 'power2.out', clearProps: 'transform' },
            '<',
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
      const heroImage = hero?.querySelector('.progressive-image')
      if (heroImage) gsap.set(heroImage, { clearProps: 'transform' })
      const allElements = [...headerElements, ...allTextLines, ...allImages, ...allMetadata]
      if (allElements.length > 0) {
        gsap.set(allElements, { clearProps: 'opacity,transform,clipPath' })
      }
    }
  }, [scopeRef, view])
}
