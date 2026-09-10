import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { ProjectVideo } from '../../types/caseStudy'

export function CaseVideo({ video }: { video: ProjectVideo }) {
  const elementRef = useRef<HTMLVideoElement>(null)
  const visibleRef = useRef(false)
  const userPausedRef = useRef(false)
  const userInitiatedRef = useRef(false)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [paused, setPaused] = useState(true)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

    const syncPlayback = () => {
      const shouldPlay = visibleRef.current
        && !document.hidden
        && !userPausedRef.current
        && (!reducedMotion.matches || userInitiatedRef.current)
      if (!shouldPlay) {
        element.pause()
        return
      }
      void element.play().catch(() => {
        // Muted autoplay can still be blocked by browser or user settings.
        setPaused(true)
      })
    }

    const observer = new IntersectionObserver(([entry]) => {
      visibleRef.current = entry.isIntersecting
      syncPlayback()
    }, { threshold: 0.15 })
    observer.observe(element)
    reducedMotion.addEventListener('change', syncPlayback)
    document.addEventListener('visibilitychange', syncPlayback)
    return () => {
      observer.disconnect()
      reducedMotion.removeEventListener('change', syncPlayback)
      document.removeEventListener('visibilitychange', syncPlayback)
      element.pause()
    }
  }, [video.src])

  const togglePlayback = () => {
    const element = elementRef.current
    if (!element || status === 'error') return
    userInitiatedRef.current = true
    if (element.paused) {
      userPausedRef.current = false
      void element.play().catch(() => setPaused(true))
    } else {
      userPausedRef.current = true
      element.pause()
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLVideoElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    togglePlayback()
  }

  const action = paused ? 'Play' : 'Pause'
  const description = video.alt.trim() ? `: ${video.alt}` : ''
  return <div className="case-study__video-frame" data-video-status={status}
    style={{ aspectRatio: `${video.width} / ${video.height}` }}>
    {!video.poster && <span className="image-skeleton" aria-hidden="true" />}
    <video
      ref={elementRef}
      className="case-study__video-element"
      src={video.src}
      poster={video.poster?.src}
      width={video.width}
      height={video.height}
      muted
      loop
      playsInline
      preload="metadata"
      role="button"
      tabIndex={0}
      aria-label={`${action} video${description}`}
      aria-pressed={!paused}
      data-cursor="interactive"
      onClick={togglePlayback}
      onKeyDown={handleKeyDown}
      onLoadedData={() => setStatus('ready')}
      onCanPlay={() => {
        setStatus('ready')
      }}
      onPlay={() => setPaused(false)}
      onPause={() => setPaused(true)}
      onError={() => setStatus('error')}
    />
    {status === 'error' && <span className="case-study__video-error" role="status">Video unavailable</span>}
  </div>
}
