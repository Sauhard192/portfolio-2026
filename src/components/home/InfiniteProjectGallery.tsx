import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { gsap } from 'gsap'
import Lenis from 'lenis'

import type { CaseStudy } from '../../types/caseStudy'
import type { HomeView } from '../../types/home'

interface InfiniteProjectGalleryProps {
  projects: CaseStudy[]
  view: HomeView
}

const COPIES = [0, 1, 2, 3]

export function InfiniteProjectGallery({ projects, view }: InfiniteProjectGalleryProps) {
  const galleryRef = useRef<HTMLDivElement>(null)
  const zoomLayerRef = useRef<HTMLDivElement>(null)
  const galleryTrackRef = useRef<HTMLDivElement>(null)
  const [hoveredProject, setHoveredProject] = useState<CaseStudy | null>(null)
  const [centeredProject, setCenteredProject] = useState<CaseStudy | null>(() => projects[0] ?? null)
  const previousViewRef = useRef(view)
  const selectedProject = hoveredProject ?? centeredProject

  useEffect(() => {
    if (previousViewRef.current === view) return
    previousViewRef.current = view

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
    let isScrollScaled = false
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
      cycleHeight = firstCycle.getBoundingClientRect().height
      updateTrackPosition(lenis.animatedScroll)
      measureListItems(lenis.animatedScroll)
    }

    const handleScroll = (scrollState: Lenis) => {
      updateTrackPosition(scrollState.animatedScroll)

      if (reducedMotion || window.innerWidth <= 900) return

      if (scrollState.isScrolling === false) {
        if (!isScrollScaled) return

        // zoom in back here
        isScrollScaled = false
        gsap.to(zoomLayer, {
          scale: 1,
          duration: .75,
          ease: 'power3.out',
          overwrite: true,
        })
        return
      }

      // zoom out here
      if (!isScrollScaled) {
        isScrollScaled = true
        gsap.to(zoomLayer, {
          scale: 0.97,
          duration: 0.12,
          ease: 'power2.out',
          overwrite: true,
        })
      }
    }

    const cycleObserver = new ResizeObserver(handleResize)
    cycleObserver.observe(firstCycle)
    handleResize()

    scrollOrigin = lenis.limit / 2
    lenis.scrollTo(scrollOrigin, { immediate: true, force: true })
    updateTrackPosition(scrollOrigin)
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
  }, [view])

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
                {projects.map((project, projectIndex) =>
                  view === 'grid' ? (
                    <Link
                      className="project-card"
                      data-cursor="project"
                      data-tooltip={project.title}
                      data-year={project.year}
                      tabIndex={copyIndex === 1 ? undefined : -1}
                      to={`/case-studies/${project.slug}`}
                      key={`${copyIndex}-${project.slug}`}
                    >
                      <figure>
                        <img
                          src={project.cover.src}
                          alt={copyIndex === 1 ? project.cover.alt : ''}
                          data-enter-image
                        />
                        <figcaption className="project-card__touch-meta" data-enter-meta>
                          <span>{project.title}</span>
                          <span>{project.year}</span>
                        </figcaption>
                      </figure>
                    </Link>
                  ) : (
                    <Link
                      className="project-list-item"
                      data-cursor="project"
                      data-project-index={projectIndex}
                      data-selected={selectedProject?.slug === project.slug}
                      data-enter-text
                      data-tooltip={project.projectType}
                      data-year={project.year}
                      tabIndex={copyIndex === 1 ? undefined : -1}
                      to={`/case-studies/${project.slug}`}
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
          <div className="project-list-preview" data-visible={Boolean(selectedProject)} aria-hidden="true">
            <img src={selectedProject?.cover.src ?? projects[0]?.cover.src} alt="" />
          </div>
        )}
      </div>
    </div>
  )
}
