import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Routes, useLocation, type Location } from 'react-router-dom'
import { gsap } from 'gsap'
import { shouldAnimateRouteChange } from './routeTransitionRules'
import { useTransitionScrollLock } from '../../hooks/useTransitionScrollLock'

interface RouteTransitionProps {
  children: ReactNode
}

export function RouteTransition({ children }: RouteTransitionProps) {
  const location = useLocation()
  // Keeps the old page visible during the transition.
  const [displayLocation, setDisplayLocation] = useState<Location>(location)
  const [transitionActive, setTransitionActive] = useState(false)
  const dimmerRef = useRef<HTMLDivElement>(null)
  const curtainRef = useRef<HTMLDivElement>(null)
  const pendingLocationRef = useRef(location)
  useTransitionScrollLock(transitionActive, location.pathname.startsWith('/case-studies/'))

  useEffect(() => {
    if (location.key === displayLocation.key) {
      setTransitionActive(false)
      return
    }

    pendingLocationRef.current = location

    const shouldAnimate = shouldAnimateRouteChange(displayLocation.pathname, location.pathname)

    if (!shouldAnimate) {
      setTransitionActive(false)
      window.scrollTo(0, 0)
      setDisplayLocation(location)
      return
    }

    setTransitionActive(true)
  }, [displayLocation, location])

  useLayoutEffect(() => {
    if (!transitionActive) return

    const dimmer = dimmerRef.current
    const curtain = curtainRef.current
    // This effect runs after React commits the active overlay, so both refs
    // are guaranteed in normal operation. Recover instead of trapping input
    // if the overlay is ever removed unexpectedly.
    if (!dimmer || !curtain) {
      window.scrollTo(0, 0)
      setDisplayLocation(pendingLocationRef.current)
      setTransitionActive(false)
      return
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timeline = gsap.timeline({
      onComplete: () => {
        // Swap pages after the curtain reaches the top.
        window.scrollTo(0, 0)
        setDisplayLocation(pendingLocationRef.current)
        setTransitionActive(false)
      },
    })

    if (reducedMotion) {
      // Reduced motion: quick opacity transition only.
      timeline
        .to(dimmer, { opacity: 0.14, duration: 0.2, ease: 'power2.out' })
        .to(curtain, { opacity: 1, duration: 0.2, ease: 'power2.out' })
    } else {
      timeline
        // Step 1: dark overlay
        .to(dimmer, { opacity: 0.2, duration: 0.2, ease: 'power2.out' })
        .fromTo(
          curtain,
          // y controls the page's starting offset.
          { y: '100vh' },
          // Step 2: new page slides in
          { y: 0, duration: 1.2, ease: 'power4.inOut' },
        )
    }

    return () => {
      timeline.kill()
      gsap.killTweensOf([dimmer, curtain])
    }
  }, [transitionActive])

  return (
    <>
      <Routes location={displayLocation}>{children}</Routes>

      {transitionActive && (
        <div className="route-transition" aria-hidden="true">
          <div ref={dimmerRef} className="route-transition__dimmer" />
          <div ref={curtainRef} className="route-transition__curtain portfolio-background" />
        </div>
      )}
    </>
  )
}
