import { useEffect, useRef, type RefObject } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { footerProgress, NEXT_PROJECT_SCROLL_SCREENS } from '../components/case-study/caseStudyNavigation'
import { CASE_CONTENT_READY_EVENT } from '../components/case-study/revealOwnership'
import {
  CASE_CAPTION_REVEAL_DELAY,
  CASE_CAPTION_REVEAL_DURATION,
  CASE_CAPTION_START_Y,
  CASE_REVEAL_DELAY,
  CASE_REVEAL_DURATION,
  CASE_IMAGE_STAGGER,
  CASE_IMAGE_START_SCALE,
  CASE_SCROLL_REVEAL_START_OPACITY,
  CASE_SCROLL_REVEAL_START_Y,
  CASE_SCROLL_SIDE_REVEAL_START,
  CASE_SCROLL_VERTICAL_REVEAL_START,
  CASE_SIDE_REVEAL_START,
} from '../components/case-study/revealTiming'

gsap.registerPlugin(ScrollTrigger)
if (import.meta.env.DEV) Object.assign(window, { ScrollTrigger })

export function useCaseStudyScroll(
  pageRef: RefObject<HTMLElement | null>,
  footerRef: RefObject<HTMLElement | null>,
  progressRef: RefObject<HTMLDivElement | null>,
  onComplete: () => void,
) {
  const completeRef = useRef(onComplete)
  completeRef.current = onComplete

  // The footer is a child: wait until React has attached the parent page ref too.
  useEffect(() => {
    const page = pageRef.current
    const footer = footerRef.current
    const progress = progressRef.current
    const fill = progress?.firstElementChild as HTMLElement | null
    if (!page || !footer || !progress || !fill) return

    const media = gsap.matchMedia()
    let disposed = false
    let navigationFrame = 0
    let lastInput = -Infinity
    const resetInput = () => { lastInput = -Infinity }
    ScrollTrigger.addEventListener('refreshInit', resetInput)
    const noteInput = (event: Event) => {
      if (event instanceof WheelEvent && (event.ctrlKey || Math.abs(event.deltaY) <= Math.abs(event.deltaX))) return
      if (event instanceof KeyboardEvent && !['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'End', 'Home', ' '].includes(event.key)) return
      if (document.documentElement.dataset.routeScrollLocked) return
      lastInput = performance.now()
    }
    for (const event of ['wheel', 'touchmove', 'keydown']) window.addEventListener(event, noteInput, { passive: true })

    media.add('(prefers-reduced-motion: no-preference)', () => {
      let navigating = false
      let lastProgress = 0
      let revealsInitialized = false
      const caseReveals: gsap.core.Timeline[] = []
      const pin = ScrollTrigger.create({
        id: 'next-project', trigger: footer, start: 'top top',
        end: () => `+=${footer.offsetHeight * NEXT_PROJECT_SCROLL_SCREENS}`,
        pin: true, pinSpacing: true, invalidateOnRefresh: true,
        onUpdate: (self) => {
          const value = footerProgress(self.scroll(), self.start, self.end - self.start)
          fill.style.transform = `scaleY(${value})`
          progress.setAttribute('aria-valuenow', String(Math.round(value * 100)))
          progress.dataset.active = String(value > 0)
          // Resizes, font loading, and history restoration must not navigate.
          const userScrolling = performance.now() - lastInput < 1200
          if (value >= 1 && lastProgress < 1 && self.direction > 0 && userScrolling &&
              !document.documentElement.dataset.routeScrollLocked && !navigating) {
            navigating = true
            // Paint the full bar before starting the existing route transition.
            navigationFrame = requestAnimationFrame(() => {
              if (disposed) return
              if (footerProgress(pin.scroll(), pin.start, pin.end - pin.start) < 1) { navigating = false; return }
              completeRef.current()
            })
          }
          lastProgress = value
        },
      })

      const setupCaseReveals = () => {
        if (revealsInitialized) return
        revealsInitialized = true
        const metadata = Array.from(page.querySelectorAll<HTMLElement>('[data-case-meta]'))
        const pendingElements = Array.from(page.querySelectorAll<HTMLElement>('[data-case-reveal]'))
          .filter(element => element.dataset.caseRevealOwner !== 'entrance')
        const alreadyReachedDelays = new Map<HTMLElement, number>()
        let queuedDelay = CASE_REVEAL_DELAY
        let queuedMetadata = false

        pendingElements
          .filter(element => element.getBoundingClientRect().top < window.innerHeight * 0.9)
          .forEach((element) => {
            const isMetadata = element.hasAttribute('data-case-meta')
            if (!isMetadata && queuedMetadata) {
              // Let the final metadata item finish before queued sections begin.
              queuedDelay += 0.5
              queuedMetadata = false
            }
            alreadyReachedDelays.set(element, queuedDelay)
            queuedDelay += isMetadata ? 0.12 : CASE_IMAGE_STAGGER
            queuedMetadata ||= isMetadata
          })

        pendingElements.forEach((element) => {
          const isImage = element.classList.contains('case-study__image')
            || element.classList.contains('case-study__hero')
            || element.classList.contains('case-study__video')
          // Only stagger images sharing a row; stacked mobile images trigger individually.
          const rowIndex = element.classList.contains('case-study__image') && element.parentElement
            ? Array.from(element.parentElement.children).filter(sibling =>
              sibling instanceof HTMLElement && sibling.offsetTop === element.offsetTop,
            ).indexOf(element)
            : 0
          const metaIndex = element.hasAttribute('data-case-meta')
            ? metadata.indexOf(element)
            : 0
          const queuedRevealDelay = alreadyReachedDelays.get(element)
          const alreadyReached = queuedRevealDelay !== undefined
          const reveal = gsap.timeline({
            delay: queuedRevealDelay ?? (
              CASE_REVEAL_DELAY
                + Math.max(0, rowIndex) * CASE_IMAGE_STAGGER
                + Math.max(0, metaIndex) * 0.12
            ),
            defaults: { duration: CASE_REVEAL_DURATION, ease: 'power2.out' },
            scrollTrigger: alreadyReached
              ? undefined
              : { trigger: element, start: 'top 90%', once: true },
          })
          const sideways = element.classList.contains('case-study__video')
            || (element.classList.contains('case-study__image') && element.parentElement?.dataset.columns === '1')
          const revealTarget = isImage
            ? element.querySelector<HTMLElement>('.case-study__media-frame') ?? element
            : element
          if (isImage) reveal.fromTo(revealTarget,
            {
              opacity: 1,
              clipPath: sideways ? CASE_SCROLL_SIDE_REVEAL_START : CASE_SCROLL_VERTICAL_REVEAL_START,
            },
            {
              opacity: 1,
              clipPath: 'inset(0% 0% 0% 0%)',
              clearProps: 'opacity,clipPath',
            },
            0,
          )
          const image = isImage ? element.querySelector('.progressive-image, .case-study__video-element') : null
          if (image) reveal.fromTo(image, { scale: CASE_IMAGE_START_SCALE }, { scale: 1, clearProps: 'transform' }, 0)
          if (!isImage) reveal.fromTo(element,
            { opacity: CASE_SCROLL_REVEAL_START_OPACITY, y: CASE_SCROLL_REVEAL_START_Y },
            { opacity: 1, y: 0, clearProps: 'opacity,transform' },
            0,
          )
          const caption = isImage ? element.querySelector<HTMLElement>('[data-case-caption]') : null
          if (caption) reveal.fromTo(caption,
            { opacity: CASE_SCROLL_REVEAL_START_OPACITY, y: CASE_CAPTION_START_Y },
            {
              opacity: 1,
              y: 0,
              duration: CASE_CAPTION_REVEAL_DURATION,
              ease: 'power2.out',
              clearProps: 'opacity,transform',
            },
            CASE_CAPTION_REVEAL_DELAY,
          )
          caseReveals.push(reveal)
        })
      }
      page.addEventListener(CASE_CONTENT_READY_EVENT, setupCaseReveals)
      if (page.dataset.caseContentReady === 'true') setupCaseReveals()

      const heading = footer.querySelector('.next-project-heading')
      const preview = footer.querySelector('.next-project__image')
      const details = footer.querySelectorAll('.next-project__eyebrow, .next-project__title')
      const footerEntrance = gsap.timeline({
        scrollTrigger: { trigger: footer, start: 'top bottom', once: true },
        defaults: { ease: 'power2.out' },
      })
      if (heading) footerEntrance.fromTo(heading, { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.7, clearProps: 'opacity,transform' }, 0)
      if (preview) footerEntrance.fromTo(preview,
        { clipPath: CASE_SIDE_REVEAL_START, scale: CASE_IMAGE_START_SCALE },
        { clipPath: 'inset(0% 0% 0% 0%)', scale: 1, duration: CASE_REVEAL_DURATION,
          clearProps: 'clipPath,transform' }, CASE_REVEAL_DELAY)
      // Opacity preserves the label's existing tilt and position.
      footerEntrance.fromTo(details, { opacity: 0 },
        { opacity: 1, duration: 0.55, stagger: 0.1, clearProps: 'opacity' })
      return () => {
        page.removeEventListener(CASE_CONTENT_READY_EVENT, setupCaseReveals)
        caseReveals.forEach((reveal) => {
          reveal.scrollTrigger?.kill()
          reveal.kill()
        })
        cancelAnimationFrame(navigationFrame)
        fill.style.transform = 'scaleY(0)'
        progress.dataset.active = 'false'
      }
    })

    // Keep the shared header legible over the dark footer, in either motion mode.
    const theme = ScrollTrigger.create({ trigger: footer, start: 'top 90px', end: 'max',
      onToggle: (self) => { page.dataset.footerActive = String(self.isActive) },
    })
    const frame = requestAnimationFrame(() => ScrollTrigger.refresh())
    void document.fonts.ready.then(() => { if (!disposed) ScrollTrigger.refresh() })
    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      cancelAnimationFrame(navigationFrame)
      for (const event of ['wheel', 'touchmove', 'keydown']) window.removeEventListener(event, noteInput)
      media.revert()
      ScrollTrigger.removeEventListener('refreshInit', resetInput)
      theme.kill()
      delete page.dataset.footerActive
    }
  }, [pageRef, footerRef, progressRef])
}
