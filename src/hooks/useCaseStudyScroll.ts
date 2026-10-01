import { useEffect, useRef, type RefObject } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { footerEndpoint, footerProgress, NEXT_PROJECT_SCROLL_SCREENS } from '../components/case-study/caseStudyNavigation'
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
    let tryComplete = () => {}
    let touchPosition: { x: number; y: number } | null = null
    const touchStart = (event: TouchEvent) => {
      const touch = event.touches.length === 1 ? event.touches[0] : null
      touchPosition = touch ? { x: touch.clientX, y: touch.clientY } : null
    }
    const resetInput = () => { lastInput = -Infinity }
    ScrollTrigger.addEventListener('refreshInit', resetInput)
    const noteInput = (event: Event) => {
      let forward = false
      if (event instanceof WheelEvent) {
        forward = !event.ctrlKey && event.deltaY > Math.abs(event.deltaX)
      } else if (typeof TouchEvent !== 'undefined' && event instanceof TouchEvent) {
        const touch = event.touches.length === 1 ? event.touches[0] : null
        if (touch && touchPosition) {
          forward = touchPosition.y - touch.clientY > Math.abs(touchPosition.x - touch.clientX)
        }
        touchPosition = touch ? { x: touch.clientX, y: touch.clientY } : null
      } else if (event instanceof KeyboardEvent) {
        if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable], button, a')) return
        forward = !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey &&
          ['ArrowDown', 'PageDown', 'End', ' '].includes(event.key)
      }
      if (!forward || document.documentElement.dataset.pageScrollLocked) { resetInput(); return }
      lastInput = performance.now()
      // At the scroll limit there may be no new ScrollTrigger update.
      tryComplete()
    }
    window.addEventListener('touchstart', touchStart, { passive: true })
    for (const event of ['wheel', 'touchmove', 'keydown']) window.addEventListener(event, noteInput, { passive: true })

    media.add('(prefers-reduced-motion: no-preference)', () => {
      const lenis = new Lenis({
        autoRaf: true,
        duration: 0.35,
        easing: (progress) => 1 - Math.pow(1 - progress, 4),
        infinite: false,
        overscroll: false,
        smoothWheel: true,
        // Native touch scrolling and momentum; keep desktop wheel smoothing.
        syncTouch: false,
        wheelMultiplier: 0.85,
      })
      if (import.meta.env.DEV) Object.assign(window, { __lenis: lenis })
      lenis.on('scroll', ScrollTrigger.update)
      const resizeLenis = () => lenis.resize()
      ScrollTrigger.addEventListener('refresh', resizeLenis)
      // Stop pending inertia as well as new input while any shared lock is held.
      const syncScrollLock = () => {
        if (document.documentElement.dataset.pageScrollLocked) lenis.stop()
        else lenis.start()
      }
      const lockObserver = new MutationObserver(syncScrollLock)
      lockObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-page-scroll-locked'],
      })
      syncScrollLock()
      let navigating = false
      let revealsInitialized = false
      const caseReveals: gsap.core.Timeline[] = []
      // Read live limits: mobile browser chrome can change the reachable bottom.
      const reachableEnd = (intendedEnd: number) => footerEndpoint(intendedEnd,
        document.documentElement.scrollHeight - document.documentElement.clientHeight, lenis.limit)
      const currentProgress = (trigger: ScrollTrigger) => {
        const end = reachableEnd(trigger.end)
        return end > trigger.start ? footerProgress(trigger.scroll(), trigger.start, end - trigger.start) : 0
      }
      const pin = ScrollTrigger.create({
        id: 'next-project', trigger: footer, start: 'top top',
        end: () => `+=${footer.offsetHeight * NEXT_PROJECT_SCROLL_SCREENS}`,
        pin: true, pinSpacing: true, invalidateOnRefresh: true,
        onUpdate: (self) => {
          const value = currentProgress(self)
          fill.style.transform = `scaleY(${value})`
          progress.setAttribute('aria-valuenow', String(Math.round(value * 100)))
          progress.dataset.active = String(value > 0)
          if (value >= 1 && self.direction > 0) tryComplete()
        },
      })
      const canComplete = () => !disposed && performance.now() - lastInput < 1200 &&
        !document.documentElement.dataset.pageScrollLocked &&
        currentProgress(pin) >= 1
      tryComplete = () => {
        if (navigating || !canComplete()) return
        navigating = true
        // Paint the full bar, then recheck in case a resize or reverse swipe intervened.
        navigationFrame = requestAnimationFrame(() => {
          if (!canComplete()) { navigating = false; return }
          fill.style.transform = 'scaleY(1)'
          progress.setAttribute('aria-valuenow', '100')
          completeRef.current()
        })
      }

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
          const isPairedVideo = element.classList.contains('case-study__video')
            && element.parentElement?.classList.contains('case-study__videos')
          // Stagger media sharing a row; stacked mobile items trigger individually.
          const rowIndex = (element.classList.contains('case-study__image') || isPairedVideo) && element.parentElement
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
          const sideways = (element.classList.contains('case-study__video') && !isPairedVideo)
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
        tryComplete = () => {}
        lockObserver.disconnect()
        ScrollTrigger.removeEventListener('refresh', resizeLenis)
        lenis.off('scroll', ScrollTrigger.update)
        lenis.destroy()
        if (import.meta.env.DEV) Reflect.deleteProperty(window, '__lenis')
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
      window.removeEventListener('touchstart', touchStart)
      media.revert()
      ScrollTrigger.removeEventListener('refreshInit', resetInput)
      theme.kill()
      delete page.dataset.footerActive
    }
  }, [pageRef, footerRef, progressRef])
}
