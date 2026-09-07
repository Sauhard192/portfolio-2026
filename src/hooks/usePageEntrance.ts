import { type RefObject, useLayoutEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { CASE_CONTENT_READY_EVENT, isInitialCaseStudyImage } from '../components/case-study/revealOwnership'
import {
  CASE_IMAGE_STAGGER,
  CASE_IMAGE_START_SCALE,
  CASE_INITIAL_CONTENT_OVERLAP,
  CASE_REVEAL_DELAY,
  CASE_REVEAL_DURATION,
  CASE_SIDE_REVEAL_START,
} from '../components/case-study/revealTiming'

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
    if (hero) delete scope.dataset.caseContentReady
    if (hero && !reducedMotion) gsap.set(hero, { clipPath: 'inset(100% 0% 0% 0%)' })
    const initialCaseImages = hero
      ? Array.from(scope.querySelectorAll<HTMLElement>('.case-study__image[data-case-reveal]'))
        .filter(isInitialCaseStudyImage)
      : []
    initialCaseImages.forEach((element) => {
      element.dataset.caseRevealOwner = 'entrance'
    })
    if (!reducedMotion) {
      initialCaseImages.forEach((element) => {
        const sideways = element.parentElement?.dataset.columns === '1'
        gsap.set(element, {
          clipPath: sideways ? CASE_SIDE_REVEAL_START : 'inset(100% 0% 0% 0%)',
        })
        const image = element.querySelector('.progressive-image')
        if (image) gsap.set(image, { scale: CASE_IMAGE_START_SCALE })
      })
    }
    if (allMetadata.length > 0) gsap.set(allMetadata, { opacity: 0, y: 14 })

    let timeline: gsap.core.Timeline | null = null
    let entranceFrame = 0
    const gallery = scope.querySelector<HTMLElement>('.project-gallery')
    const markCaseContentReady = () => {
      scope.dataset.caseContentReady = 'true'
      scope.dispatchEvent(new Event(CASE_CONTENT_READY_EVENT))
    }

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
        const images = hero
          ? visibleImages.filter((element) => element !== hero)
          : gsap.utils.shuffle([...visibleImages])
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
          markCaseContentReady()
          timeline = gsap.timeline().to(
            [...headerElements, ...textLines, ...(hero && visibleImages.includes(hero) ? [hero] : []), ...images, ...metadata],
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

        const entranceHero = hero && visibleImages.includes(hero) ? hero : null
        if (entranceHero) {
          timeline.addLabel('caseHero', `+=${CASE_REVEAL_DELAY}`)
          timeline.to(
            entranceHero,
            {
              opacity: 1,
              clipPath: 'inset(0% 0% 0% 0%)',
              duration: CASE_REVEAL_DURATION,
              clearProps: 'clipPath',
              ease: 'power2.out',
            },
            'caseHero',
          )
          const heroImage = entranceHero.querySelector('.progressive-image')
          if (heroImage) timeline.fromTo(heroImage,
            { scale: CASE_IMAGE_START_SCALE },
            { scale: 1, duration: CASE_REVEAL_DURATION, ease: 'power2.out', clearProps: 'transform' },
            'caseHero',
          )

          const caseTimeline = timeline
          caseTimeline.addLabel(
            'caseContent',
            `caseHero+=${CASE_REVEAL_DURATION * CASE_INITIAL_CONTENT_OVERLAP}`,
          )
          caseTimeline.call(markCaseContentReady, undefined, 'caseContent')
          if (initialCaseImages.length > 0) {
            initialCaseImages.forEach((element, index) => {
              const position = `caseContent+=${index * CASE_IMAGE_STAGGER}`
              caseTimeline.to(element, {
                clipPath: 'inset(0% 0% 0% 0%)',
                duration: CASE_REVEAL_DURATION,
                ease: 'power2.out',
                clearProps: 'clipPath',
              }, position)
              const image = element.querySelector('.progressive-image')
              if (image) caseTimeline.to(image, {
                scale: 1,
                duration: CASE_REVEAL_DURATION,
                ease: 'power2.out',
                clearProps: 'transform',
              }, position)
            })
          }
        }

        if (images.length > 0) {
          timeline.to(
            images,
            { opacity: 1, duration: 0.62, stagger: 0.075, ease: 'power2.out' },
            '-=0.18',
          )
        }

        if (!entranceHero) markCaseContentReady()

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
      delete scope.dataset.caseContentReady
      const heroImage = hero?.querySelector('.progressive-image')
      if (heroImage) gsap.set(heroImage, { clearProps: 'transform' })
      initialCaseImages.forEach((element) => {
        delete element.dataset.caseRevealOwner
        gsap.set(element, { clearProps: 'clipPath' })
        const image = element.querySelector('.progressive-image')
        if (image) gsap.set(image, { clearProps: 'transform' })
      })
      const allElements = [...headerElements, ...allTextLines, ...allImages, ...allMetadata]
      if (allElements.length > 0) {
        gsap.set(allElements, { clearProps: 'opacity,transform,clipPath' })
      }
    }
  }, [scopeRef, view])
}
