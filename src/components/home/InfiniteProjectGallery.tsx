import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { ProgressiveImage } from '../ui/ProgressiveImage'
import { GalleryEdgeLens } from '../gallery/GalleryEdgeLens'
import { useProjectGalleryScroll } from '../../hooks/useProjectGalleryScroll'
import type { GalleryPositionMemory, HomeView, InfiniteGalleryItem } from '../../types/home'

interface InfiniteProjectGalleryProps {
  projects: InfiniteGalleryItem[]
  view: HomeView
  showTouchMetadata?: boolean
  positionMemory?: GalleryPositionMemory
  disabledSlugs?: ReadonlySet<string>
  repeatList?: boolean
}

const COPIES = [0, 1, 2, 3]

export function InfiniteProjectGallery({
  projects,
  view,
  showTouchMetadata = true,
  positionMemory,
  disabledSlugs,
  repeatList = true,
}: InfiniteProjectGalleryProps) {
  const boundedList = view === 'list' && !repeatList
  const { galleryRef, zoomLayerRef, galleryTrackRef, gridLayout, centeredProject } =
    useProjectGalleryScroll({ projects, view, boundedList, positionMemory })
  const [hoveredProject, setHoveredProject] = useState<InfiniteGalleryItem | null>(null)
  const selectedProject = [hoveredProject, centeredProject].find(project => project && projects.includes(project))
    ?? projects[0] ?? null
  const cycleItems = view === 'grid'
    ? Array.from({ length: gridLayout.count }, (_, index) => projects[index % projects.length])
    : projects

  useEffect(() => { setHoveredProject(null) }, [projects])

  useEffect(() => {
    // Re-check the lens hit target even if the pointer has not moved.
    galleryRef.current?.dispatchEvent(new Event('portfolio:filter-change'))
  }, [disabledSlugs, galleryRef])

  return (
    <div ref={galleryRef} id="project-gallery" data-bounded={boundedList} className={`project-gallery project-gallery--${view}`}>
      <div className="project-gallery__surface">
        <div ref={zoomLayerRef} className="project-gallery__zoom-layer">
          <div ref={galleryTrackRef} className="project-gallery__track">
            {(boundedList ? [1] : COPIES).map((copyIndex) => (
              <div
                className={`project-cycle project-cycle--${view}`}
                key={`${view}-${copyIndex}`}
                aria-hidden={copyIndex !== 1}
              >
                {cycleItems.map((project, projectIndex) => {
                  const disabled = disabledSlugs?.has(project.slug) ?? false
                  const accessible = copyIndex === 1 && projectIndex < projects.length
                  return view === 'grid' ? (
                    <div
                      className="project-card"
                      data-filter-disabled={disabled || undefined}
                      inert={disabled || undefined}
                      data-cursor={disabled ? undefined : 'project'}
                      data-tooltip={disabled ? undefined : project.gridTooltip}
                      data-year={project.year}
                      aria-hidden={projectIndex >= projects.length ? true : undefined}
                      key={`${copyIndex}-${projectIndex}-${project.slug}`}
                    >
                      <Link className="project-card__link" to={project.href} aria-label={project.title}
                        aria-disabled={disabled || undefined}
                        tabIndex={!disabled && accessible ? undefined : -1} />
                      <figure>
                        <ProgressiveImage
                          enterImage
                          retryTabIndex={!disabled && accessible ? 0 : -1}
                          src={project.cover.src}
                          srcSet={project.cover.srcSet}
                          sizes={project.cover.srcSet ? `${gridLayout.cardWidth}px` : undefined}
                          decoding="async"
                          alt={copyIndex === 1 ? project.cover.alt : ''}
                          className="project-card__image"
                        />
                        {showTouchMetadata && (
                          <figcaption className="project-card__touch-meta" data-enter-meta>
                            <span className="project-card__touch-title">{project.title}</span>
                            <span className="project-card__touch-details">{project.year}</span>
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
                      <span className="project-list-item__title">{project.title}</span>
                    </Link>
                  )
                })}
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
      <GalleryEdgeLens key={view} galleryRef={galleryRef} grid={view === 'grid'} />
    </div>
  )
}
