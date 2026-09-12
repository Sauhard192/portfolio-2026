import { useLayoutEffect, type RefObject } from 'react'

import { CASE_CONTENT_READY_EVENT } from '../components/case-study/revealOwnership'
import { isStartupPending, STARTUP_READY_EVENT } from '../components/layout/startupTransition'
import { acquireDocumentScrollLock } from './documentScrollLock'

const MAXIMUM_LOCK_MS = 5000

const isVisibleInViewport = (element: Element) => {
  const bounds = element.getBoundingClientRect()
  return bounds.width > 0
    && bounds.height > 0
    && bounds.bottom > 0
    && bounds.top < window.innerHeight
}

const isMediaReady = (element: HTMLImageElement | HTMLVideoElement) => (
  element instanceof HTMLImageElement
    ? element.complete
    : element.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA || Boolean(element.error)
)

export function useCaseStudyReadyScrollLock(
  pageRef: RefObject<HTMLElement | null>,
  enabled: boolean,
) {
  useLayoutEffect(() => {
    const page = pageRef.current
    if (!page || !enabled) return
    const casePage = page

    const releaseDocumentLock = acquireDocumentScrollLock('case-study-ready')
    const mediaCleanups: Array<() => void> = []
    let disposed = false
    let entranceReady = page.dataset.caseContentReady === 'true'
    let mediaReady = false
    let measureFrame = 0
    let maximumTimer = 0
    let readinessStarted = false

    page.dataset.caseScrollLocked = 'true'

    const release = () => {
      if (disposed) return
      disposed = true
      window.clearTimeout(maximumTimer)
      cancelAnimationFrame(measureFrame)
      mediaCleanups.forEach(cleanup => cleanup())
      page.removeEventListener(CASE_CONTENT_READY_EVENT, handleEntranceReady)
      window.removeEventListener(STARTUP_READY_EVENT, beginReadinessChecks)
      delete page.dataset.caseScrollLocked
      releaseDocumentLock()
    }

    const releaseWhenReady = () => {
      if (entranceReady && mediaReady) release()
    }

    const handleEntranceReady = () => {
      entranceReady = true
      releaseWhenReady()
    }

    const waitForMedia = (element: HTMLImageElement | HTMLVideoElement) => {
      if (isMediaReady(element)) return Promise.resolve()

      return new Promise<void>((resolve) => {
        const events = element instanceof HTMLImageElement
          ? ['load', 'error']
          : ['loadeddata', 'error']
        const finish = () => {
          events.forEach(event => element.removeEventListener(event, finish))
          resolve()
        }
        events.forEach(event => element.addEventListener(event, finish, { once: true }))
        mediaCleanups.push(() => events.forEach(event => element.removeEventListener(event, finish)))
      })
    }

    page.addEventListener(CASE_CONTENT_READY_EVENT, handleEntranceReady)

    function beginReadinessChecks() {
      if (readinessStarted || disposed) return
      readinessStarted = true
      maximumTimer = window.setTimeout(release, MAXIMUM_LOCK_MS)

      measureFrame = requestAnimationFrame(() => {
        const initialMedia = Array.from(
          casePage.querySelectorAll<HTMLImageElement | HTMLVideoElement>(
            '.case-study__hero img, [data-case-reveal] img, [data-case-reveal] video',
          ),
        ).filter(isVisibleInViewport)

        void Promise.all([
          document.fonts?.ready.catch(() => undefined) ?? Promise.resolve(),
          ...initialMedia.map(waitForMedia),
        ]).then(() => {
          if (disposed) return
          mediaReady = true
          releaseWhenReady()
        })
      })
    }

    if (isStartupPending()) {
      window.addEventListener(STARTUP_READY_EVENT, beginReadinessChecks, { once: true })
    } else {
      beginReadinessChecks()
    }

    return release
  }, [enabled, pageRef])
}
