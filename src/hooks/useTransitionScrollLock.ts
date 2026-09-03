import { useLayoutEffect, useRef } from 'react'

// Discard the tail of the gesture that opened the next case study.
export const CASE_SCROLL_QUIET_MS = 180

export function useTransitionScrollLock(active: boolean, caseDestination: boolean) {
  const wasActive = useRef(false)
  useLayoutEffect(() => {
    if (!active && !wasActive.current) return
    wasActive.current = active
    if (!active && !caseDestination) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.dataset.routeScrollLocked = 'true'
    let timer = 0
    let maximumTimer = 0
    let released = false
    const release = () => {
      if (released) return
      released = true
      clearTimeout(timer)
      clearTimeout(maximumTimer)
      document.body.style.overflow = previousOverflow
      delete document.documentElement.dataset.routeScrollLocked
      window.removeEventListener('wheel', block, true)
      window.removeEventListener('touchmove', block, true)
      window.removeEventListener('keydown', block, true)
    }
    const block = (event: Event) => {
      if (event instanceof WheelEvent && event.ctrlKey) return
      if (event instanceof KeyboardEvent && !['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'End', 'Home', ' '].includes(event.key)) return
      event.preventDefault()
      event.stopImmediatePropagation()
      if (!active) {
        clearTimeout(timer)
        timer = window.setTimeout(release, CASE_SCROLL_QUIET_MS)
      }
    }
    window.addEventListener('wheel', block, { capture: true, passive: false })
    window.addEventListener('touchmove', block, { capture: true, passive: false })
    window.addEventListener('keydown', block, { capture: true })
    if (!active) {
      window.scrollTo(0, 0)
      timer = window.setTimeout(release, CASE_SCROLL_QUIET_MS)
      maximumTimer = window.setTimeout(release, 1200)
    }
    return release
  }, [active, caseDestination])
}
