import { type RefObject, useLayoutEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { CASE_CONTENT_READY_EVENT, isInitialCaseStudyElement } from '../components/case-study/revealOwnership'
import {
  CASE_IMAGE_STAGGER,
  CASE_IMAGE_START_SCALE,
  CASE_REVEAL_DELAY,
  CASE_REVEAL_DURATION,
  CASE_SIDE_REVEAL_START,
} from '../components/case-study/revealTiming'

const VIEWPORT_EDGE_BUFFER = 64
const CASE_META_STAGGER = 0.12

const isVisibleInViewport = (element: HTMLElement) => {
  const bounds = element.getBoundingClientRect()
  return bounds.bottom > -VIEWPORT_EDGE_BUFFER
    && bounds.top < window.innerHeight + VIEWPORT_EDGE_BUFFER
}

const isCaseImage = (element: HTMLElement) => (
  element.classList.contains('case-study__hero')
  || element.classList.contains('case-study__image')
)

const caseImageStart = (element: HTMLElement) => (
  element.classList.contains('case-study__image')
    && element.parentElement?.dataset.columns === '1'
    ? CASE_SIDE_REVEAL_START
    : 'inset(100% 0% 0% 0%)'
)

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
    const allTextLines = Array.from(scope.querySelectorAll<HTMLElement>('[data-enter-text]'))
    let allImages = Array.from(scope.querySelectorAll<HTMLElement>('[data-enter-image]'))
    const allMetadata = Array.from(scope.querySelectorAll<HTMLElement>('[data-enter-meta]'))
    const hero = scope.querySelector<HTMLElement>('.case-study__hero')
    const gallery = scope.querySelector<HTMLElement>('.project-gallery')
    let timeline: gsap.core.Timeline | null = null
    let entranceFrame = 0

    if (headerElements.length > 0) gsap.set(headerElements, { opacity: 0 })
    if (allTextLines.length > 0) gsap.set(allTextLines, { opacity: 0, y: 24 })
    if (allImages.length > 0) gsap.set(allImages, { opacity: 0 })
    if (allMetadata.length > 0) gsap.set(allMetadata, { opacity: 0, y: 14 })

    const markCaseContentReady = () => {
      scope.dataset.caseContentReady = 'true'
      scope.dispatchEvent(new Event(CASE_CONTENT_READY_EVENT))
    }

    // Case studies use one ordered entrance for what is visible at arrival.
    if (hero) {
      delete scope.dataset.caseContentReady
      const caseElements = Array.from(scope.querySelectorAll<HTMLElement>('[data-case-reveal]'))
      const initialCaseElements = caseElements.filter(isInitialCaseStudyElement)
      const title = scope.querySelector<HTMLElement>('.case-study__intro h1')
      const roles = scope.querySelector<HTMLElement>('.case-study__roles')
      const introLink = scope.querySelector<HTMLElement>('.case-study__intro .contact-link-button')

      initialCaseElements.forEach((element) => {
        element.dataset.caseRevealOwner = 'entrance'
      })

      if (!reducedMotion) {
        caseElements.forEach((element) => {
          if (isCaseImage(element)) {
            gsap.set(element, { opacity: 0, clipPath: caseImageStart(element) })
            const image = element.querySelector('.progressive-image')
            if (image) gsap.set(image, { scale: CASE_IMAGE_START_SCALE })
          } else {
            gsap.set(element, { opacity: 0, y: 20 })
          }
        })
      }

      const revealCaseElement = (
        sequence: gsap.core.Timeline,
        element: HTMLElement,
        position?: gsap.Position,
      ) => {
        if (isCaseImage(element)) {
          sequence.to(element, {
            opacity: 1,
            clipPath: 'inset(0% 0% 0% 0%)',
            duration: CASE_REVEAL_DURATION,
            ease: 'power2.out',
            clearProps: 'clipPath',
          }, position)
          const image = element.querySelector('.progressive-image')
          if (image) sequence.to(image, {
            scale: 1,
            duration: CASE_REVEAL_DURATION,
            ease: 'power2.out',
            clearProps: 'transform',
          }, '<')
        } else {
          sequence.to(element, {
            opacity: 1,
            y: 0,
            duration: 0.62,
            ease: 'power3.out',
            clearProps: 'opacity,transform',
          }, position)
        }
      }

      entranceFrame = requestAnimationFrame(() => {
        entranceFrame = requestAnimationFrame(() => {
          if (reducedMotion) {
            timeline = gsap.timeline({ onComplete: markCaseContentReady }).to(
              [...headerElements, ...allTextLines, ...allMetadata, ...initialCaseElements],
              { opacity: 1, y: 0, duration: 0.22, stagger: 0.025, ease: 'power2.out' },
            )
            return
          }

          timeline = gsap.timeline({ defaults: { ease: 'power3.out' } })

          if (headerElements.length > 0) {
            timeline.to(headerElements, { opacity: 1, duration: 0.38 })
          }
          timeline.addLabel('caseIntro')

          if (title) {
            timeline.to(title, { opacity: 1, y: 0, duration: 0.62 }, 'caseIntro')
          }
          if (hero.dataset.caseRevealOwner === 'entrance') {
            revealCaseElement(timeline, hero, 'caseIntro')
          }

          const introDetails = [roles, introLink].filter((element): element is HTMLElement => Boolean(element))
          if (introDetails.length > 0) {
            timeline.to(introDetails, {
              opacity: 1,
              y: 0,
              duration: 0.62,
              stagger: 0.08,
            }, 'caseIntro+=0.15')
          }

          const initialMetadata = initialCaseElements.filter(element => element.hasAttribute('data-case-meta'))
          if (initialMetadata.length > 0) {
            timeline.to(initialMetadata, {
              opacity: 1,
              y: 0,
              duration: 0.62,
              stagger: CASE_META_STAGGER,
              ease: 'power3.out',
              clearProps: 'opacity,transform',
            }, `+=${CASE_REVEAL_DELAY}`)
          }

          const initialSections = initialCaseElements.filter(element => (
            element !== hero && !element.hasAttribute('data-case-meta')
          ))
          initialSections.forEach((element, index) => {
            revealCaseElement(
              timeline!,
              element,
              index === 0 ? `+=${CASE_REVEAL_DELAY}` : `-=${CASE_REVEAL_DURATION - CASE_IMAGE_STAGGER}`,
            )
          })

          timeline.call(markCaseContentReady)
        })
      })

      return () => {
        cancelAnimationFrame(entranceFrame)
        timeline?.kill()
        delete scope.dataset.caseContentReady
        initialCaseElements.forEach((element) => { delete element.dataset.caseRevealOwner })
        const allElements = [
          ...headerElements,
          ...allTextLines,
          ...allImages,
          ...allMetadata,
          ...caseElements,
        ]
        gsap.set(allElements, { clearProps: 'opacity,transform,clipPath' })
        caseElements.forEach((element) => {
          const image = element.querySelector('.progressive-image')
          if (image) gsap.set(image, { clearProps: 'transform' })
        })
      }
    }

    const startEntrance = () => {
      cancelAnimationFrame(entranceFrame)
      entranceFrame = requestAnimationFrame(() => {
        entranceFrame = requestAnimationFrame(() => {
          // Responsive cycle sizing may have added cards since the first render.
          allImages = Array.from(scope.querySelectorAll<HTMLElement>('[data-enter-image]'))
          if (allImages.length) gsap.set(allImages, { opacity: 0 })
          const textLines = allTextLines.filter(isVisibleInViewport)
          const visibleImages = allImages.filter(isVisibleInViewport)
          const images = gsap.utils.shuffle([...visibleImages])
          const metadata = allMetadata.filter(isVisibleInViewport)
          const hiddenTextLines = allTextLines.filter(element => !textLines.includes(element))
          const hiddenImages = allImages.filter(element => !visibleImages.includes(element))
          const hiddenMetadata = allMetadata.filter(element => !metadata.includes(element))

          if (hiddenTextLines.length > 0) gsap.set(hiddenTextLines, { clearProps: 'opacity,transform' })
          if (hiddenImages.length > 0) gsap.set(hiddenImages, { clearProps: 'opacity,clipPath' })
          if (hiddenMetadata.length > 0) gsap.set(hiddenMetadata, { clearProps: 'opacity,transform' })

          timeline = gsap.timeline({ defaults: { ease: 'power3.out' } })
          if (headerElements.length > 0) timeline.to(headerElements, { opacity: 1, duration: reducedMotion ? 0.22 : 0.38 })
          if (textLines.length > 0) timeline.to(textLines, {
            opacity: 1,
            y: 0,
            duration: reducedMotion ? 0.22 : 0.62,
            stagger: reducedMotion ? 0.025 : 0.09,
          }, '-=0.08')
          if (images.length > 0) timeline.to(images, {
            opacity: 1,
            duration: reducedMotion ? 0.22 : 0.62,
            stagger: reducedMotion ? 0.025 : 0.075,
            ease: 'power2.out',
          }, '-=0.18')
          if (metadata.length > 0) timeline.to(metadata, {
            opacity: 1,
            y: 0,
            duration: reducedMotion ? 0.22 : 0.46,
            stagger: reducedMotion ? 0.025 : 0.07,
          }, '+=0.15')
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
      const allElements = [...headerElements, ...allTextLines, ...allImages, ...allMetadata]
      if (allElements.length > 0) gsap.set(allElements, { clearProps: 'opacity,transform,clipPath' })
    }
  }, [scopeRef, view])
}
