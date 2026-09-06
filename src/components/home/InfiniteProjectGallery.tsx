import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ProgressiveImage } from '../ui/ProgressiveImage'
import { gsap } from 'gsap'
import Lenis from 'lenis'

import type { HomeView } from '../../types/home'
import { gridCycleLength } from './gridCycle'

export interface InfiniteGalleryItem {
  slug: string
  title: string
  year: string
  href: string
  gridTooltip: string
  listTooltip: string
  cover: {
    src: string
    srcSet?: string
    alt: string
  }
}

interface InfiniteProjectGalleryProps {
  projects: InfiniteGalleryItem[]
  view: HomeView
  showTouchMetadata?: boolean
  positionMemory?: { gridPosition: number }
}

const COPIES = [0, 1, 2, 3]

export function InfiniteProjectGallery({
  projects,
  view,
  showTouchMetadata = true,
  positionMemory,
}: InfiniteProjectGalleryProps) {
  const galleryRef = useRef<HTMLDivElement>(null)
  const zoomLayerRef = useRef<HTMLDivElement>(null)
  const galleryTrackRef = useRef<HTMLDivElement>(null)
  const [hoveredProject, setHoveredProject] = useState<InfiniteGalleryItem | null>(null)
  const [centeredProject, setCenteredProject] = useState<InfiniteGalleryItem | null>(
    () => projects[0] ?? null,
  )
  const previousViewRef = useRef(view)
  const selectedProject = hoveredProject ?? centeredProject
  const [gridLayout, setGridLayout] = useState({ count: projects.length, cardWidth: 280 })
  const cycleItems = view === 'grid'
    ? Array.from({ length: gridLayout.count }, (_, index) => projects[index % projects.length])
    : projects

  useLayoutEffect(() => {
    if (view !== 'grid' || !projects.length) return
    const cycle = galleryTrackRef.current?.querySelector<HTMLElement>('.project-cycle')
    const card = cycle?.querySelector<HTMLElement>('.project-card')
    if (!cycle || !card) return
    const measure = () => {
      const style = getComputedStyle(cycle)
      const columns = Math.max(1, Number.parseInt(style.getPropertyValue('--gallery-columns')) || 4)
      const rowStep = card.offsetHeight + (Number.parseFloat(style.rowGap) || 0)
      // Enough repeated rows for short collections and tall viewports.
      const minimumRows = Math.ceil(window.innerHeight / Math.max(1, rowStep)) + 1
      const count = gridCycleLength(projects.length, columns, minimumRows)
      const cardWidth = card.offsetWidth
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
    if (previousViewRef.current === view) return
    previousViewRef.current = view
    if (view === 'grid') return

    const surface = galleryRef.current?.querySelector<HTMLElement>('.project-gallery__surface')
    if (!surface) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const tween = gsap.fromTo(
      surface,
      { opacity: 0 },
      {
        opacity: 1,
        duration: reducedMotion ? 0.16 : 0.46,
        ease: 'power2.out',
        clearProps: 'opacity',
      },
    )

    return () => {
      tween.kill()
    }
  }, [view])

  useEffect(() => {
    const gallery = galleryRef.current
    const zoomLayer = zoomLayerRef.current
    const galleryTrack = galleryTrackRef.current
    const firstCycle = galleryTrack?.querySelector<HTMLElement>('.project-cycle')
    if (!gallery || !zoomLayer || !galleryTrack || !firstCycle) return

    // Wait for responsive repeat rows before positioning or announcing readiness.
    if (view === 'grid') {
      const card = firstCycle.querySelector<HTMLElement>('.project-card')
      const style = getComputedStyle(firstCycle)
      const columns = Math.max(1, Number.parseInt(style.getPropertyValue('--gallery-columns')) || 4)
      const rowStep = (card?.offsetHeight ?? 0) + (Number.parseFloat(style.rowGap) || 0)
      const rows = Math.ceil(window.innerHeight / Math.max(1, rowStep)) + 1
      if (firstCycle.children.length !== gridCycleLength(projects.length, columns, rows)) return
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const previousScrollRestoration = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
    const lenis = new Lenis({
      autoRaf: true,
      duration: reducedMotion ? 0 : 0.35,
      easing: (progress) => 1 - Math.pow(1 - progress, 4),
      infinite: false,
      overscroll: false,
      smoothWheel: !reducedMotion,
      syncTouch: !reducedMotion,
      wheelMultiplier: 0.85,
    })

    let cycleHeight = 0
    let scrollOrigin = 0
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
      const virtualScroll = scrollPosition - scrollOrigin
      return ((virtualScroll % cycleHeight) + cycleHeight) % cycleHeight
    }

    const updateCenteredProject = (loopPosition: number) => {
      if (view !== 'list' || listItemPositions.length === 0) return

      const viewportCenter = window.innerHeight / 2
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
      galleryTrack.style.transform = `translate3d(0, ${-cycleHeight - loopPosition}px, 0)`
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
      updateTrackPosition(lenis.animatedScroll)
      measureListItems(lenis.animatedScroll)
    }

    const handleScroll = (scrollState: Lenis) => {
      if (positionMemory && cycleHeight > 0 && !document.documentElement.dataset.routeScrollLocked) positionMemory.gridPosition = getLoopPosition(scrollState.animatedScroll) / cycleHeight
      updateTrackPosition(scrollState.animatedScroll)

      if (reducedMotion || window.innerWidth <= 900) return

      scrolling = scrollState.isScrolling !== false
      if (scrolling && (zoomPhase === 'idle' || zoomPhase === 'return')) {
        startZoom()
      }
      // Recover immediately at scroll completion, without an extra pause.
      recoverZoom()
    }

    const cycleObserver = new ResizeObserver(handleResize)
    cycleObserver.observe(firstCycle)
    handleResize()

    scrollOrigin = lenis.limit / 2
    const restoredPosition = scrollOrigin + (positionMemory?.gridPosition ?? 0) * cycleHeight
    lenis.scrollTo(restoredPosition, { immediate: true, force: true })
    updateTrackPosition(restoredPosition)
    lenis.on('scroll', handleScroll)
    gallery.dataset.entranceReady = 'true'
    gallery.dispatchEvent(new Event('portfolio:gallery-ready'))

    return () => {
      delete gallery.dataset.entranceReady
      cycleObserver.disconnect()
      lenis.off('scroll', handleScroll)
      lenis.destroy()
      gsap.killTweensOf(zoomLayer)
      galleryTrack.style.removeProperty('transform')
      window.history.scrollRestoration = previousScrollRestoration
      window.scrollTo(0, 0)
    }
  }, [view, projects, gridLayout.count, positionMemory])

  return (
    <div ref={galleryRef} id="project-gallery" className={`project-gallery project-gallery--${view}`}>
      <div className="project-gallery__surface">
        <div ref={zoomLayerRef} className="project-gallery__zoom-layer">
          <div ref={galleryTrackRef} className="project-gallery__track">
            {COPIES.map((copyIndex) => (
              <div
                className={`project-cycle project-cycle--${view}`}
                key={`${view}-${copyIndex}`}
                aria-hidden={copyIndex !== 1}
              >
                {cycleItems.map((project, projectIndex) =>
                  view === 'grid' ? (
                    <div
                      className="project-card"
                      data-cursor="project"
                      data-tooltip={project.gridTooltip}
                      data-year={project.year}
                      aria-hidden={projectIndex >= projects.length ? true : undefined}
                      key={`${copyIndex}-${projectIndex}-${project.slug}`}
                    >
                      <Link className="project-card__link" to={project.href} aria-label={project.title}
                        tabIndex={copyIndex === 1 && projectIndex < projects.length ? undefined : -1} />
                      <figure>
                        <ProgressiveImage
                          enterImage
                          retryTabIndex={copyIndex === 1 && projectIndex < projects.length ? 0 : -1}
                          src={project.cover.src}
                          srcSet={project.cover.srcSet}
                          sizes={project.cover.srcSet ? `${gridLayout.cardWidth}px` : undefined}
                          decoding="async"
                          alt={copyIndex === 1 ? project.cover.alt : ''}
                          className="project-card__image"
                        />
                        {showTouchMetadata && (
                          <figcaption className="project-card__touch-meta" data-enter-meta>
                            <span>{project.title}</span>
                            <span>{project.year}</span>
                          </figcaption>
                        )}
                      </figure>
                    </div>
                  ) : (
                    <Link
                      className="project-list-item"
                      data-cursor="project"
                      data-project-index={projectIndex}
                      data-selected={selectedProject?.slug === project.slug}
                      data-enter-text
                      data-tooltip={project.listTooltip}
                      data-year={project.year}
                      tabIndex={copyIndex === 1 ? undefined : -1}
                      to={project.href}
                      onMouseEnter={() => setHoveredProject(project)}
                      onMouseLeave={() => setHoveredProject(null)}
                      onFocus={() => setHoveredProject(project)}
                      onBlur={() => setHoveredProject(null)}
                      key={`${copyIndex}-${project.slug}`}
                    >
                      {project.title}
                    </Link>
                  ),
                )}
              </div>
            ))}
          </div>
        </div>

        {view === 'list' && (
          <div className="project-list-preview" data-visible={Boolean(selectedProject)}>
            <ProgressiveImage fill src={selectedProject?.cover.src ?? projects[0]?.cover.src} alt="" />
          </div>
        )}
      </div>
    </div>
  )
}
