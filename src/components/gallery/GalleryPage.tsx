import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ErrorInfo,
  type ReactNode,
} from 'react'
import { gsap } from 'gsap'

import { usePageEntrance } from '../../hooks/usePageEntrance'
import type { MediaGalleryView } from '../../types/home'
import type { MediaCollection, MediaItem } from '../../types/media'
import { CustomCursor } from '../home/CustomCursor'
import { InfiniteProjectGallery } from '../home/InfiniteProjectGallery'
import { SiteHeader } from '../layout/SiteHeader'

import { galleryMemory } from './galleryMemory'

const SpiralGallery = lazy(() => import('./SpiralGallery'))

const VIEW_OPTIONS = [
  { value: 'spiral', label: 'SPIRAL' },
  { value: 'grid', label: 'GRID' },
] as const

interface GalleryPageProps {
  collection: MediaCollection
  items: MediaItem[]
}

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const supportsWebGL = () => {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}

export function GalleryPage({ collection, items }: GalleryPageProps) {
  const pageRef = useRef<HTMLElement>(null)
  const viewRef = useRef<HTMLDivElement>(null)
  const [view, setView] = useState<MediaGalleryView>(() =>
    prefersReducedMotion() || !supportsWebGL() ? 'grid' : galleryMemory[collection].view ?? 'spiral',
  )
  const [showScrollHint, setShowScrollHint] = useState(view === 'spiral')
  usePageEntrance(pageRef, view)

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handlePreference = () => {
      if (motionQuery.matches) setView('grid')
    }

    motionQuery.addEventListener('change', handlePreference)
    return () => motionQuery.removeEventListener('change', handlePreference)
  }, [])

  useEffect(() => {
    if (view === 'grid') return
    const element = viewRef.current
    if (!element) return

    const tween = gsap.fromTo(
      element,
      { opacity: 0 },
      {
        opacity: 1,
        duration: prefersReducedMotion() ? 0.16 : 0.46,
        ease: 'power2.out',
        clearProps: 'opacity',
      },
    )

    return () => {
      tween.kill()
    }
  }, [view])

  const gridItems = useMemo(() => items.map((item) => ({
    slug: item.slug,
    title: item.title,
    year: item.date,
    href: `/${collection}/${item.slug}`,
    gridTooltip: 'VIEW',
    listTooltip: 'VIEW',
    cover: {
      src: item.image.thumbnail.src,
      srcSet: item.image.thumbnail.srcSet,
      alt: item.image.alt,
    },
  })), [collection, items])

  const handleViewChange = (nextView: MediaGalleryView) => {
    if (nextView !== 'spiral') setShowScrollHint(false)
    galleryMemory[collection].view = nextView
    setView(nextView)
  }

  const dismissScrollHint = useCallback(() => setShowScrollHint(false), [])

  return (
    <main
      ref={pageRef}
      className={`media-gallery-page media-gallery-page--${view} portfolio-background`}
      data-collection={collection}
    >
      <SiteHeader
        view={view}
        viewOptions={VIEW_OPTIONS}
        onViewChange={(nextView) => handleViewChange(nextView as MediaGalleryView)}
      />

      <div ref={viewRef} className="media-gallery-page__view" key={view}>
        {items.length === 0 ? (
          <section className="media-view__empty" data-enter-text>
            <p>No {collection === 'art' ? 'artworks' : 'photographs'} yet.</p>
          </section>
        ) : view === 'grid' ? (
          <InfiniteProjectGallery
            projects={gridItems}
            view="grid"
            showTouchMetadata={false}
            positionMemory={galleryMemory[collection]}
          />
        ) : (
          <SpiralErrorBoundary onError={() => setView('grid')}>
            <Suspense fallback={null}>
              <SpiralGallery collection={collection} items={items} />
            </Suspense>
          </SpiralErrorBoundary>
        )}
      </div>

      <CustomCursor
        initialTooltip={items.length > 0 && showScrollHint && view === 'spiral' ? 'SCROLL' : undefined}
        onInitialTooltipDismiss={dismissScrollHint}
      />
    </main>
  )
}

interface SpiralErrorBoundaryProps {
  children: ReactNode
  onError: () => void
}

class SpiralErrorBoundary extends Component<
  SpiralErrorBoundaryProps,
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    this.props.onError()
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}
