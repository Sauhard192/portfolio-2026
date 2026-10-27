import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import Lenis from 'lenis'
import type { GalleryPositionMemory, HomeView, InfiniteGalleryItem } from '../types/home'
import { measureBoundedList, measureGridCycle } from '../components/home/galleryMeasurements'

interface GalleryScrollOptions {
  projects: InfiniteGalleryItem[]
  view: HomeView
  boundedList: boolean
  positionMemory?: GalleryPositionMemory
}

// Owns responsive cycle sizing, scroll position, zoom, and centered List selection.
export function useProjectGalleryScroll({ projects, view, boundedList, positionMemory }: GalleryScrollOptions) {
  const galleryRef = useRef<HTMLDivElement>(null)
  const zoomLayerRef = useRef<HTMLDivElement>(null)
  const galleryTrackRef = useRef<HTMLDivElement>(null)
  const previousViewRef = useRef(view)
  const [gridLayout, setGridLayout] = useState({ count: projects.length, cardWidth: 280 })
  const [centeredProject, setCenteredProject] = useState<InfiniteGalleryItem | null>(() => projects[0] ?? null)

  useEffect(() => { setCenteredProject(projects[0] ?? null) }, [projects])

  useEffect(() => {
    const switchingView = previousViewRef.current !== view
    previousViewRef.current = view
    if (view !== 'list') return
    const surface = galleryRef.current?.querySelector<HTMLElement>('.project-gallery__surface')
    if (!surface) return
    const tween = gsap.fromTo(surface, { opacity: 0 }, {
      opacity: 1, duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : switchingView ? 0.46 : 0.25,
      ease: 'power2.out', clearProps: 'opacity',
    })
    return () => { tween.kill() }
  }, [projects, view])

  useLayoutEffect(() => {
    if (view !== 'grid' || !projects.length) return
    const cycle = galleryTrackRef.current?.querySelector<HTMLElement>('.project-cycle')
    const card = cycle?.querySelector<HTMLElement>('.project-card')
    if (!cycle || !card) return
    const measure = () => {
      const measured = measureGridCycle(cycle, projects.length)
      if (!measured) return
      const { count, cardWidth } = measured
      setGridLayout((previous) => previous.count === count && previous.cardWidth === cardWidth
        ? previous : { count, cardWidth })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(cycle)
    observer.observe(card)
    window.addEventListener('resize', measure)
    return () => { observer.disconnect(); window.removeEventListener('resize', measure) }
  }, [projects.length, view])

  useEffect(() => {
    const gallery = galleryRef.current
    const zoomLayer = zoomLayerRef.current
    const galleryTrack = galleryTrackRef.current
    const firstCycle = galleryTrack?.querySelector<HTMLElement>('.project-cycle')
    if (!gallery || !zoomLayer || !galleryTrack || !firstCycle) return

    // Wait for responsive repeat rows before positioning or announcing readiness.
    if (view === 'grid') {
      if (firstCycle.children.length !== measureGridCycle(firstCycle, projects.length)?.count) return
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const previousScrollRestoration = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
    const lenis = new Lenis({
      autoRaf: true,
      duration: reducedMotion ? 0 : 0.5,
      easing: (progress) => 1 - Math.pow(1 - progress, 4),
      infinite: false,
      overscroll: false,
      smoothWheel: !reducedMotion,
      syncTouch: !reducedMotion,
      wheelMultiplier: 0.85,
    })

    let cycleHeight = 0
    let scrollOrigin = 0
    let listStart = 0
    let listScrollRange = 0
    let listFits = false
    let listFocusCenter = window.innerHeight / 2
    let zoomPhase: 'idle' | 'out' | 'hold' | 'return' = 'idle'
    let scrolling = false

    const recoverZoom = () => {
      // Finish the full zoom-out before allowing recovery.
      if (zoomPhase !== 'hold' || scrolling) return
      zoomPhase = 'return'
      gsap.to(zoomLayer, { scale: 1, duration: 0.75, ease: 'power3.out', overwrite: true })
    }

    const startZoom = () => {
      zoomPhase = 'out'
      gsap.to(zoomLayer, {
        scale: 0.97,
        duration: 0.12,
        ease: 'power2.out',
        overwrite: true,
        onComplete: () => { zoomPhase = 'hold'; recoverZoom() },
      })
    }
    let centeredProjectSlug = ''
    let listItemPositions: Array<{ centerAtLoopStart: number; projectIndex: number }> = []

    const getLoopPosition = (scrollPosition: number) => {
      if (boundedList) return Math.max(0, Math.min(scrollPosition, listScrollRange))
      const virtualScroll = scrollPosition - scrollOrigin
      return ((virtualScroll % cycleHeight) + cycleHeight) % cycleHeight
    }

    const updateCenteredProject = (loopPosition: number) => {
      if (view !== 'list' || listItemPositions.length === 0) return

      const viewportCenter = boundedList ? listFocusCenter : window.innerHeight / 2
      let closestItem = listItemPositions[0]
      let closestDistance = Math.abs(closestItem.centerAtLoopStart - loopPosition - viewportCenter)

      for (let index = 1; index < listItemPositions.length; index += 1) {
        const item = listItemPositions[index]
        const distance = Math.abs(item.centerAtLoopStart - loopPosition - viewportCenter)

        if (distance < closestDistance) {
          closestItem = item
          closestDistance = distance
        }
      }

      const project = projects[closestItem.projectIndex]
      if (!project || project.slug === centeredProjectSlug) return

      centeredProjectSlug = project.slug
      setCenteredProject(project)
    }

    const updateTrackPosition = (scrollPosition: number) => {
      if (!cycleHeight) return

      const loopPosition = getLoopPosition(scrollPosition)
      galleryTrack.style.transform = `translate3d(0, ${boundedList ? listStart - loopPosition : -cycleHeight - loopPosition}px, 0)`
      updateCenteredProject(loopPosition)
    }

    const measureListItems = (scrollPosition: number) => {
      if (view !== 'list') return

      const loopPosition = getLoopPosition(scrollPosition)
      const listItems = galleryTrack.querySelectorAll<HTMLElement>('.project-list-item')
      listItemPositions = Array.from(listItems, (item) => {
        const bounds = item.getBoundingClientRect()

        return {
          centerAtLoopStart: bounds.top + bounds.height / 2 + loopPosition,
          projectIndex: Number(item.dataset.projectIndex),
        }
      })
      updateCenteredProject(loopPosition)
    }

    const handleResize = () => {
      // Measure layout height, not the temporary scroll-zoom transform.
      cycleHeight = Number.parseFloat(getComputedStyle(firstCycle).height)
      if (boundedList) {
        const layout = measureBoundedList(gallery, firstCycle)
        if (layout) {
          listFits = layout.fits
          listStart = layout.start
          listFocusCenter = layout.focusCenter
          listScrollRange = layout.scrollRange
          gallery.dataset.listFits = String(listFits)
          gallery.style.height = `${window.innerHeight + listScrollRange}px`
          lenis.resize()
          if (listFits) {
            lenis.scrollTo(0, { immediate: true, force: true })
            lenis.stop()
            gsap.killTweensOf(zoomLayer)
            gsap.set(zoomLayer, { scale: 1 })
            zoomPhase = 'idle'
          } else if (lenis.isStopped) lenis.start()
        }
      }
      updateTrackPosition(lenis.animatedScroll)
      measureListItems(lenis.animatedScroll)
    }

    const handleScroll = (scrollState: Lenis) => {
      if (positionMemory && cycleHeight > 0 && !document.documentElement.dataset.routeScrollLocked) positionMemory.gridPosition = getLoopPosition(scrollState.animatedScroll) / cycleHeight
      updateTrackPosition(scrollState.animatedScroll)

      scrolling = scrollState.isScrolling !== false

      if (listFits || reducedMotion || window.innerWidth <= 900) return
      if (scrolling && (zoomPhase === 'idle' || zoomPhase === 'return')) {
        startZoom()
      }
      // Recover immediately at scroll completion, without an extra pause.
      recoverZoom()
    }

    const cycleObserver = new ResizeObserver(handleResize)
    cycleObserver.observe(firstCycle)
    window.addEventListener('resize', handleResize)
    handleResize()

    scrollOrigin = boundedList ? 0 : lenis.limit / 2
    const restoredPosition = boundedList ? 0 : scrollOrigin + (positionMemory?.gridPosition ?? 0) * cycleHeight
    lenis.scrollTo(restoredPosition, { immediate: true, force: true })
    updateTrackPosition(restoredPosition)
    measureListItems(restoredPosition)
    lenis.on('scroll', handleScroll)
    gallery.dataset.entranceReady = 'true'
    gallery.dispatchEvent(new Event('portfolio:gallery-ready'))

    return () => {
      delete gallery.dataset.entranceReady
      delete gallery.dataset.listFits
      cycleObserver.disconnect()
      window.removeEventListener('resize', handleResize)
      lenis.off('scroll', handleScroll)
      lenis.destroy()
      gsap.killTweensOf(zoomLayer)
      galleryTrack.style.removeProperty('transform')
      gallery.style.removeProperty('height')
      window.history.scrollRestoration = previousScrollRestoration
      window.scrollTo(0, 0)
    }
  }, [view, projects, gridLayout.count, positionMemory, boundedList])

  return { galleryRef, zoomLayerRef, galleryTrackRef, gridLayout, centeredProject }
}
