import { useLayoutEffect, useRef, type PointerEvent, type MouseEvent, type DragEvent, type RefObject } from 'react'
import { gsap } from 'gsap'

export type MediaDirection = -1 | 1
// Release after 10% of the viewport, or a deliberate quick flick.
export function mediaDragDirection(dx: number, velocity: number, width: number): MediaDirection | 0 {
  if (Math.abs(dx) >= width * 0.1) return dx < 0 ? 1 : -1
  if (Math.abs(dx) >= 32 && Math.abs(velocity) >= 0.5 && Math.sign(dx) === Math.sign(velocity)) return dx < 0 ? 1 : -1
  return 0
}

export function useMediaDrag(track: RefObject<HTMLDivElement | null>, key: string | undefined,
  enabled: boolean, navigate: (direction: MediaDirection) => void) {
  const gesture = useRef<{ id: number; x: number; y: number; lastX: number; time: number; velocity: number; dx: number; horizontal: boolean; target: HTMLElement } | null>(null)
  const tween = useRef<gsap.core.Tween | null>(null)
  const suppressedUntil = useRef(0)
  const navigateRef = useRef(navigate)
  navigateRef.current = navigate
  const reset = () => {
    tween.current?.kill()
    tween.current = null
    const drag = gesture.current
    gesture.current = null
    if (drag?.target.hasPointerCapture(drag.id)) drag.target.releasePointerCapture(drag.id)
    if (track.current) {
      gsap.set(track.current, { clearProps: 'transform,willChange' })
      delete track.current.dataset.dragging
    }
  }
  useLayoutEffect(() => {
    reset()
    window.addEventListener('resize', reset)
    window.addEventListener('blur', reset)
    return () => {
      reset()
      window.removeEventListener('resize', reset)
      window.removeEventListener('blur', reset)
    }
  }, [key, track])

  const settle = (direction: MediaDirection | 0) => {
    const element = track.current
    if (!element) return
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    tween.current = gsap.to(element, {
      x: direction ? -direction * element.clientWidth : 0,
      duration: reduced ? 0 : direction ? 0.32 : 0.24,
      ease: 'power3.out',
      onComplete: () => { if (direction) navigateRef.current(direction); else reset() },
    })
  }
  const finish = (event: PointerEvent<HTMLElement>, cancelled = false) => {
    const drag = gesture.current
    if (!drag || drag.id !== event.pointerId) return
    gesture.current = null
    if (drag.target.hasPointerCapture(drag.id)) drag.target.releasePointerCapture(drag.id)
    if (!drag.horizontal) return
    suppressedUntil.current = performance.now() + 400
    const velocity = performance.now() - drag.time > 100 ? 0 : drag.velocity
    settle(cancelled ? 0 : mediaDragDirection(drag.dx, velocity, track.current?.clientWidth ?? innerWidth))
  }
  return { reset, events: {
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if (!event.isPrimary) { reset(); return }
      if (!enabled || event.button !== 0 || !track.current) return
      suppressedUntil.current = 0
      if (event.target instanceof Element && event.target.closest('header, button, figcaption, .media-view__controls, .image-error')) return
      reset()
      gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, lastX: event.clientX,
        time: performance.now(), velocity: 0, dx: 0, horizontal: false, target: event.currentTarget }
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      const drag = gesture.current
      if (!drag || drag.id !== event.pointerId || !track.current) return
      const dx = event.clientX - drag.x, dy = event.clientY - drag.y
      if (!drag.horizontal) {
        if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) { reset(); return }
        if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return
        drag.horizontal = true
        drag.target.setPointerCapture(drag.id)
        track.current.style.willChange = 'transform'
        track.current.dataset.dragging = 'true'
      }
      event.preventDefault()
      const now = performance.now()
      drag.velocity = (event.clientX - drag.lastX) / Math.max(1, now - drag.time)
      drag.lastX = event.clientX
      drag.time = now
      drag.dx = Math.max(-track.current.clientWidth, Math.min(track.current.clientWidth, dx))
      gsap.set(track.current, { x: drag.dx })
    },
    onPointerUp: (event: PointerEvent<HTMLElement>) => finish(event),
    onPointerCancel: (event: PointerEvent<HTMLElement>) => finish(event, true),
    onLostPointerCapture: (event: PointerEvent<HTMLElement>) => finish(event, true),
    onDragStart: (event: DragEvent<HTMLElement>) => event.preventDefault(),
    onClickCapture: (event: MouseEvent<HTMLElement>) => {
      if (performance.now() < suppressedUntil.current) { event.preventDefault(); event.stopPropagation() }
    },
  } }
}
