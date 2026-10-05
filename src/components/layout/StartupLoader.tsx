import { useLayoutEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { acquireDocumentScrollLock } from '../../hooks/documentScrollLock'
import { isStartupPending, STARTUP_READY_EVENT } from './startupTransition'
import { wait, waitForInitialMedia } from './startupAssets'
import logo from '../../assets/icons/jhelli-logo.svg'

// Seconds: pause → fade in → fill → hold → fade out → page rises.
const OPENING_PAUSE = 0.3
const LOGO_FADE = 0.4
const LOGO_FILL = 2.2
const READY_HOLD = 0.25
const ASSET_DEADLINE_MS = 4500

export function StartupLoader() {
  const rootRef = useRef<HTMLDivElement>(null)
  const logoRef = useRef<HTMLSpanElement>(null)
  const fillRef = useRef<HTMLSpanElement>(null)
  const curtainRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(isStartupPending)

  useLayoutEffect(() => {
    const root = rootRef.current
    const mark = logoRef.current
    const fill = fillRef.current
    const curtain = curtainRef.current
    if (!root || !mark || !fill || !curtain) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const release = acquireDocumentScrollLock('startup-loader')
    window.scrollTo(0, 0)
    let cancelled = false
    let entrance: gsap.core.Timeline | undefined
    let exit: gsap.core.Timeline | undefined

    const assets = Promise.race([
      Promise.all([document.fonts?.ready.catch(() => undefined), waitForInitialMedia()]),
      wait(ASSET_DEADLINE_MS),
    ])
    gsap.set(mark, { opacity: reduced ? 1 : 0 })
    gsap.set(fill, { clipPath: reduced ? 'inset(0% 0 0 0)' : 'inset(100% 0 0 0)' })

    const enter = reduced ? Promise.resolve() : new Promise<void>((resolve) => {
      entrance = gsap.timeline({ delay: OPENING_PAUSE, onComplete: resolve, onInterrupt: resolve })
        .to(mark, { opacity: 1, duration: LOGO_FADE, ease: 'power3.out' })
        .to(fill, { clipPath: 'inset(0% 0 0 0)', duration: LOGO_FILL, ease: 'sine.inOut' })
    })

    void Promise.all([enter, assets]).then(async () => {
      if (cancelled) return
      await wait(READY_HOLD * 1000)
      if (cancelled) return
      exit = gsap.timeline({
        onComplete: () => {
          document.documentElement.dataset.startup = 'complete'
          window.dispatchEvent(new Event(STARTUP_READY_EVENT))
          release()
          setVisible(false)
        },
      }).to(mark, { opacity: 0, duration: reduced ? 0.2 : 0.3, ease: 'power2.in' })
      if (reduced) {
        exit.to(root, { opacity: 0, duration: 0.22, ease: 'power2.out' })
      } else {
        // Preserve the existing startup curtain and page-entrance handoff.
        exit.fromTo(curtain, { y: '100vh' }, { y: 0, duration: 1.2, ease: 'power4.inOut' })
      }
    })

    return () => {
      cancelled = true
      entrance?.kill()
      exit?.kill()
      gsap.killTweensOf([root, mark, fill, curtain])
      release()
    }
  }, [])

  if (!visible) return null
  return (
    <div ref={rootRef} className="startup-loader startup-loader--logo" role="status" aria-label="Loading portfolio">
      <span ref={logoRef} className="startup-loader__logo" style={{ maskImage: `url("${logo}")`, WebkitMaskImage: `url("${logo}")` }} aria-hidden="true">
        <span ref={fillRef} className="startup-loader__fill" />
      </span>
      <div ref={curtainRef} className="startup-loader__curtain portfolio-background" aria-hidden="true" />
    </div>
  )
}
