import { useLayoutEffect, useRef, useState, type CSSProperties, type ImgHTMLAttributes, type RefObject } from 'react'

interface ProgressiveImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'onLoad' | 'onError'> {
  containerRef?: RefObject<HTMLSpanElement | null>
  onReady?: (image: HTMLImageElement) => void
  onFailure?: () => void
  retryTabIndex?: number
  fill?: boolean
  enterImage?: boolean
}

// The wrapper owns page motion; only the inner image owns the loading fade.
export function ProgressiveImage({ containerRef, onReady, onFailure, retryTabIndex, fill = false, enterImage = false,
  className = '', style, width, height, src, srcSet, sizes, ...props }: ProgressiveImageProps) {
  const imageRef = useRef<HTMLImageElement>(null)
  const callbacks = useRef({ onReady, onFailure })
  callbacks.current = { onReady, onFailure }
  const sourceKey = `${src}|${srcSet}`
  const [retry, setRetry] = useState({ sourceKey: '', count: 0 })
  const attempt = retry.sourceKey === sourceKey ? retry.count : 0
  const key = `${src}|${srcSet}|${attempt}`
  const [result, setResult] = useState({ key: '', status: 'loading', cached: false })
  const status = result.key === key ? result.status : 'loading'
  const requestSrc = attempt && src ? retryImageUrl(src, attempt) : src
  // Retry the selected candidate directly, avoiding a cached failed srcset request.
  const retrySource = useRef<string | undefined>(undefined)

  useLayoutEffect(() => {
    const image = imageRef.current
    if (!image) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let timeoutStarted = false
    const fail = () => {
      if (cancelled) return
      clearTimeout(timer)
      setResult({ key, status: 'error', cached: false })
      callbacks.current.onFailure?.()
    }
    const ready = async (cached: boolean) => {
      try { await image.decode() } catch { if (!image.naturalWidth) { fail(); return } }
      if (cancelled) return
      clearTimeout(timer)
      setResult({ key, status: 'ready', cached })
      callbacks.current.onReady?.(image)
    }
    const load = () => { void ready(false) }
    image.addEventListener('load', load)
    image.addEventListener('error', fail)
    // A cached image skips the skeleton and loading transition before paint.
    if (image.complete && image.naturalWidth) {
      setResult({ key, status: 'ready', cached: true })
      callbacks.current.onReady?.(image)
    } else if (image.complete && image.currentSrc) fail()
    // Start the timeout only when a lazy image approaches the viewport.
    const observer = new IntersectionObserver(([entry]) => {
      image.parentElement?.setAttribute('data-in-view', String(entry.isIntersecting))
      if (entry.isIntersecting && !timeoutStarted && !image.complete) {
        timeoutStarted = true
        timer = setTimeout(fail, 30000)
      }
    }, { rootMargin: '300px' })
    observer.observe(image)
    return () => {
      cancelled = true
      clearTimeout(timer)
      observer.disconnect()
      image.removeEventListener('load', load)
      image.removeEventListener('error', fail)
    }
  }, [key])

  return <span ref={containerRef} className={`progressive-image ${className}`} data-image-status={status} data-enter-image={enterImage ? '' : undefined}
    data-cached={result.key === key && result.cached} data-fill={fill} aria-busy={status === 'loading'}
    style={{ '--image-ratio': width && height ? `${width} / ${height}` : undefined } as CSSProperties}>
    <span className="image-skeleton" aria-hidden="true" />
    <img {...props} key={key} ref={imageRef} src={attempt && retrySource.current ? retryImageUrl(retrySource.current, attempt) : requestSrc}
      srcSet={attempt ? undefined : srcSet} sizes={sizes} width={width} height={height} style={style} />
    {status === 'error' && <span className="image-error" role="status">
      <span>Image unavailable</span>
      <button type="button" data-cursor="interactive" tabIndex={retryTabIndex} aria-label={`Retry image${props.alt ? `: ${props.alt}` : ''}`}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          retrySource.current = imageRef.current?.currentSrc || src
          setRetry({ sourceKey, count: attempt + 1 })
        }}>Retry</button>
    </span>}
  </span>
}

export function retryImageUrl(src: string, attempt: number) {
  if (/^(data:|blob:)/.test(src)) return src
  const url = new URL(src, document.baseURI)
  url.searchParams.set('image-retry', String(attempt))
  return url.href
}
