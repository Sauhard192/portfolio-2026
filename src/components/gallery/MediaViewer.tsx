import { useEffect, useRef, type CSSProperties, type MouseEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import closeIcon from '../../assets/icons/close.svg'
import chevronLeft from '../../assets/icons/chevron-left.svg'
import chevronRight from '../../assets/icons/chevron-right.svg'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { usePageEntrance } from '../../hooks/usePageEntrance'
import { useMediaDrag, type MediaDirection } from '../../hooks/useMediaDrag'
import type { MediaCollection, MediaItem } from '../../types/media'
import { CustomCursor } from '../home/CustomCursor'
import { mediaDateLabel, wrapMediaIndex } from './mediaNavigation'
import { ProgressiveImage } from '../ui/ProgressiveImage'

interface MediaViewerProps { collection: MediaCollection; items: MediaItem[]; slug?: string }
const imageStyle = (item: MediaItem) => ({ '--media-aspect-ratio': item.image.width / item.image.height }) as CSSProperties

export function MediaViewer({ collection, items, slug }: MediaViewerProps) {
  const pageRef = useRef<HTMLElement>(null)
  usePageEntrance(pageRef)
  const navigate = useNavigate()
  const track = useRef<HTMLDivElement>(null)
  const index = items.findIndex(item => item.slug === slug)
  const item = items[index]
  const requested = useRef(index)
  const routeIndex = useRef(index)
  if (routeIndex.current !== index) { requested.current = index; routeIndex.current = index }
  useDocumentTitle(`${item?.title ?? 'Image not found'} — Sauhard Shrestha`)
  const canNavigate = Boolean(item && items.length > 1)
  const hrefAt = (offset: number) => `/${collection}/${items[wrapMediaIndex(index + offset, items.length)]?.slug}`
  const go = (direction: MediaDirection) => {
    if (!canNavigate) return
    requested.current = wrapMediaIndex(requested.current + direction, items.length)
    navigate(`/${collection}/${items[requested.current].slug}`)
  }
  const drag = useMediaDrag(track, slug, canNavigate, go)
  const instant = (direction: MediaDirection) => { drag.reset(); go(direction) }
  const follow = (direction: MediaDirection) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    instant(direction)
  }
  useEffect(() => {
    if (!canNavigate) return
    const keydown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
      if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable="true"], [role="slider"]')) return
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
      event.preventDefault()
      instant(event.key === 'ArrowRight' ? 1 : -1)
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  }, [collection, index, items, canNavigate])

  return <main ref={pageRef} className="media-view portfolio-background" data-collection={collection} data-media={slug} {...drag.events}>
    <header className="media-view__header" data-page-header>
      <Link className="media-view__close" to={`/${collection}`} aria-label={`Close image and return to ${collection === 'art' ? 'Art' : 'Photography'}`} data-cursor="interactive">
        <span className="media-view__close-icon" style={{ maskImage: `url("${closeIcon}")` }} aria-hidden="true" />
      </Link>
    </header>
    {item ? <>
      <h1 className="media-view__sr-only">{item.title}</h1>
      <div className="media-view__stage" data-enter-image>
        <div ref={track} className="media-view__track">
          {(canNavigate ? [-1, 0, 1] : [0]).map(offset => {
            const panel = items[wrapMediaIndex(index + offset, items.length)]
            return <div className="media-view__item media-view__panel" key={`${offset}:${panel.slug}`}
              style={{ ...imageStyle(panel), transform: `translateX(${offset * 100}%)` }}
              aria-hidden={offset !== 0 ? true : undefined} inert={offset !== 0}>
              <figure className="media-view__figure">
                <div className="media-view__image-box">
                  {/* Only the current image and its neighbors load; all reuse shimmer/retry. */}
                  <ProgressiveImage fill src={panel.image.src} alt={panel.image.alt} width={panel.image.width} height={panel.image.height}
                    decoding="async" draggable={false} fetchPriority={offset === 0 ? 'high' : 'low'} />
                </div>
              </figure>
            </div>
          })}
        </div>
        <div className="media-view__item media-view__overlay" style={imageStyle(item)}>
          {canNavigate && <>
            <Link to={hrefAt(-1)} onClick={follow(-1)} className="media-view__zone media-view__zone--previous" aria-label="Previous image" data-cursor="dot" data-tooltip="Previous" data-tooltip-icon="left" />
            <Link to={hrefAt(1)} onClick={follow(1)} className="media-view__zone media-view__zone--next" aria-label="Next image" data-cursor="dot" data-tooltip="Next" data-tooltip-icon="right" />
          </>}
          <figure className="media-view__figure">
            <figcaption className="media-view__metadata" data-enter-meta>
              <p>{item.caption}</p>
              <time dateTime={item.dateISO.length === 10 ? item.dateISO : undefined}>{mediaDateLabel(item.date, item.location)}</time>
            </figcaption>
          </figure>
        </div>
      </div>
      {canNavigate && <nav className="media-view__controls" aria-label="Image navigation">
        {([-1, 1] as const).map(direction => <Link className={`media-view__arrow media-view__arrow--${direction === -1 ? 'previous' : 'next'}`}
          to={hrefAt(direction)} onClick={follow(direction)} aria-label={direction === -1 ? 'Previous image' : 'Next image'}
          data-cursor="interactive" key={direction}>
          <img src={direction === -1 ? chevronLeft : chevronRight} width={32} height={32} alt="" aria-hidden="true" />
        </Link>)}
      </nav>}
      <p className="media-view__sr-only" role="status" aria-live="polite" aria-atomic="true">
        {item.title}. {index + 1} of {items.length}. {item.caption} {mediaDateLabel(item.date, item.location)}.
      </p>
    </> : <section className="media-view__empty">
      <h1>{items.length ? 'Image not found' : 'No images yet'}</h1>
      <p>Use the navigation to explore Art or Photography.</p>
    </section>}
    <CustomCursor showTooltipIcon={false} />
  </main>
}
