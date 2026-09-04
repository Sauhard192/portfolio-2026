import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type TouchEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { gsap } from 'gsap'

import { usePageEntrance } from '../../hooks/usePageEntrance'
import type { MediaCollection, MediaItem } from '../../types/media'
import { CustomCursor } from '../home/CustomCursor'
import { SiteHeader } from '../layout/SiteHeader'
import { getSwipeDirection, mediaDateLabel, wrapMediaIndex } from './mediaNavigation'
import { ProgressiveImage } from '../ui/ProgressiveImage'

interface MediaViewerProps {
  collection: MediaCollection
  items: MediaItem[]
  slug?: string
}

export function MediaViewer({ collection, items, slug }: MediaViewerProps) {
  const pageRef = useRef<HTMLElement>(null)
  const navigate = useNavigate()
  const index = items.findIndex((item) => item.slug === slug)
  const item = items[index]
  const touch = useRef<{ x: number; y: number; time: number } | null>(null)
  usePageEntrance(pageRef)

  const hrefAt = (offset: number) => `/${collection}/${items[wrapMediaIndex(index + offset, items.length)]?.slug}`
  const isBlocked = () => Boolean(
    pageRef.current?.querySelector('[data-menu-open="true"]') || document.querySelector('.route-transition'),
  )

  useEffect(() => {
    const previousTitle = document.title
    document.title = `${item?.title ?? 'Image not found'} — ${collection === 'art' ? 'Art' : 'Photography'} — Jhelli`
    return () => { document.title = previousTitle }
  }, [collection, item])

  useEffect(() => {
    if (!item || items.length < 2) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || isBlocked()) return
      if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable="true"], [role="slider"]')) return
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
      event.preventDefault()
      const next = wrapMediaIndex(index + (event.key === 'ArrowRight' ? 1 : -1), items.length)
      navigate(`/${collection}/${items[next].slug}`)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [collection, index, item, items, navigate])

  // Warm only the two adjacent images, not the whole collection.
  useEffect(() => {
    if (!item || items.length < 2) return
    const neighbors = new Set([-1, 1].map((step) => items[wrapMediaIndex(index + step, items.length)].image.src))
    neighbors.delete(item.image.src)
    for (const src of neighbors) {
      const image = new Image()
      image.src = src
    }
  }, [index, item, items])

  const handleTouchStart = (event: TouchEvent<HTMLElement>) => {
    touch.current = null
    if (!item || items.length < 2 || event.touches.length !== 1 || isBlocked()) return
    if (event.target instanceof Element && event.target.closest('header, a, button, figcaption')) return
    touch.current = { x: event.touches[0].clientX, y: event.touches[0].clientY, time: performance.now() }
  }

  const handleTouchEnd = (event: TouchEvent<HTMLElement>) => {
    const start = touch.current
    touch.current = null
    if (!start || event.touches.length > 0 || !event.changedTouches[0] || isBlocked()) return
    const end = event.changedTouches[0]
    const direction = getSwipeDirection(end.clientX - start.x, end.clientY - start.y, performance.now() - start.time)
    if (direction) navigate(hrefAt(direction))
  }

  return (
    <main
      ref={pageRef}
      className="media-view portfolio-background"
      data-collection={collection}
      data-media={slug}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={() => { touch.current = null }}
    >
      <SiteHeader />
      {item ? (
        <>
          <h1 className="media-view__sr-only">{item.title}</h1>
          <div className="media-view__stage" data-enter-image>
            <MediaFigure item={item} previousHref={hrefAt(-1)} nextHref={hrefAt(1)} canNavigate={items.length > 1} key={item.slug} />
          </div>
          {items.length > 1 && (
            <nav className="media-view__controls" aria-label="Image navigation">
              {([-1, 1] as const).map((direction) => (
                <Link className="media-view__arrow" to={hrefAt(direction)} aria-label={direction === -1 ? 'Previous image' : 'Next image'} data-cursor="interactive" key={direction}>
                  <span data-enter-meta>
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d={direction === -1 ? 'M19 12H5m6-6-6 6 6 6' : 'M5 12h14m-6-6 6 6-6 6'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </Link>
              ))}
            </nav>
          )}
          <p className="media-view__sr-only" role="status" aria-live="polite" aria-atomic="true">
            {item.title}. {index + 1} of {items.length}. {item.caption} {mediaDateLabel(item.date, item.location)}.
          </p>
        </>
      ) : (
        <section className="media-view__empty" data-enter-text>
          <h1>{items.length ? 'Image not found' : 'No images yet'}</h1>
          <p>Use the navigation to explore Art or Photography.</p>
        </section>
      )}
      <CustomCursor showTooltipIcon={false} />
    </main>
  )
}

interface MediaFigureProps {
  item: MediaItem
  previousHref: string
  nextHref: string
  canNavigate: boolean
}

function MediaFigure({ item, previousHref, nextHref, canNavigate }: MediaFigureProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [ratio, setRatio] = useState(item.image.width / item.image.height)

  const imageReady = (image: HTMLImageElement) => {
    setRatio(image.naturalWidth / image.naturalHeight)
  }

  useLayoutEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // Only this content fades between images; the header stays mounted.
    const context = gsap.context(() => {
      gsap.fromTo(ref.current, { opacity: 0 }, { opacity: 1, duration: reduced ? 0.12 : 0.28, ease: 'power2.out' })
    }, ref)
    return () => context.revert()
  }, [])

  return (
    <div ref={ref} className="media-view__item" style={{ '--media-aspect-ratio': ratio } as CSSProperties}>
      {canNavigate && (
        <>
          <Link to={previousHref} className="media-view__zone media-view__zone--previous" aria-label="Previous image" data-cursor="interactive" data-tooltip="Previous" />
          <Link to={nextHref} className="media-view__zone media-view__zone--next" aria-label="Next image" data-cursor="interactive" data-tooltip="Next" />
        </>
      )}
      <figure className="media-view__figure">
        <div className="media-view__image-box">
          <ProgressiveImage fill src={item.image.src} alt={item.image.alt} width={item.image.width} height={item.image.height} decoding="async" draggable={false} onReady={imageReady} />
        </div>
        <figcaption className="media-view__metadata" data-enter-meta>
          <p>{item.caption}</p>
          <time dateTime={item.dateISO.length === 10 ? item.dateISO : undefined}>{mediaDateLabel(item.date, item.location)}</time>
        </figcaption>
      </figure>
    </div>
  )
}
