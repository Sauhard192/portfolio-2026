import { useLayoutEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'

import { acquireDocumentScrollLock } from '../../hooks/documentScrollLock'
import { isStartupPending, STARTUP_READY_EVENT } from './startupTransition'
import logo from '../../assets/icons/jhelli-logo.svg'

const MINIMUM_DISPLAY_MS = 1800
const MAXIMUM_ASSET_WAIT_MS = 4500
const READY_HOLD_MS = 250
const TEXT_CHANGE_MS = 480
const RANDOM_STAGE_HOLD_MS = 140
const RANDOM_SCRAMBLE_STAGES = 2
const CHARACTER_FRAME_MS = 34
const CHARACTER_POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
// Preview entrance timings, in seconds.
const PREVIEW_PAUSE_SECONDS = 0.3
const LOGO_FADE_SECONDS = 0.4
const TEXT_ENTER_AT_SECONDS = 0.15
const TEXT_FADE_SECONDS = 0.5
const FILL_START_SECONDS = 0.35
const SCRAMBLE_START_SECONDS = 0.45
const PREVIEW_STAGE_HOLD_MS = 50

const wait = (duration: number) => new Promise<void>((resolve) => {
  window.setTimeout(resolve, duration)
})

const waitForImage = (image: HTMLImageElement) => {
  if (image.complete) return image.decode?.().catch(() => undefined) ?? Promise.resolve()

  return new Promise<void>((resolve) => {
    const finish = () => resolve()
    image.addEventListener('load', finish, { once: true })
    image.addEventListener('error', finish, { once: true })
  })
}

const waitForInitialMedia = async () => {
  // Let responsive galleries finish their first measurement before finding visible media.
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))

  const seenSources = new Set<string>()
  const visibleImages = Array.from(document.querySelectorAll<HTMLImageElement>('main img'))
    .filter((image) => {
      const bounds = image.getBoundingClientRect()
      const source = image.currentSrc || image.src
      if (!source || seenSources.has(source)) return false

      const visible = bounds.width > 0
        && bounds.height > 0
        && bounds.bottom > 0
        && bounds.top < window.innerHeight
      if (visible) seenSources.add(source)
      return visible
    })
    .slice(0, 4)

  await Promise.all(visibleImages.map(waitForImage))
}

const createRandomText = (template: string) => Array.from(template, (character) => {
  if (character === ' ') return character
  return CHARACTER_POOL[Math.floor(Math.random() * CHARACTER_POOL.length)]
}).join('')

const scrambleTo = (
  element: HTMLElement,
  destination: string,
  duration: number,
  cancelled: () => boolean,
) => new Promise<void>((resolve) => {
  const startedAt = performance.now()
  let lastFrame = 0
  let frame = 0

  const animate = (now: number) => {
    if (cancelled()) {
      cancelAnimationFrame(frame)
      resolve()
      return
    }

    const progress = Math.min((now - startedAt) / duration, 1)
    if (now - lastFrame >= CHARACTER_FRAME_MS || progress === 1) {
      const resolvedCharacters = Math.floor(progress * destination.length)
      element.textContent = Array.from(destination, (character, index) => {
        if (character === ' ' || index < resolvedCharacters || progress === 1) return character
        return CHARACTER_POOL[Math.floor(Math.random() * CHARACTER_POOL.length)]
      }).join('')
      lastFrame = now
    }

    if (progress < 1) frame = requestAnimationFrame(animate)
    else resolve()
  }

  frame = requestAnimationFrame(animate)
})

export function StartupLoader({ preview = false }: { preview?: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLSpanElement>(null)
  const curtainRef = useRef<HTMLDivElement>(null)
  const fillRef = useRef<HTMLSpanElement>(null)
  const logoRef = useRef<HTMLSpanElement>(null)
  const [replay, setReplay] = useState(0)
  const [visible, setVisible] = useState(() => preview || isStartupPending())

  useLayoutEffect(() => {
    const root = rootRef.current
    const text = textRef.current
    const curtain = curtainRef.current
    if (!root || !text || !curtain) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const releaseScrollLock = acquireDocumentScrollLock('startup-loader')
    window.scrollTo(0, 0)

    let cancelled = false
    let timeline: gsap.core.Timeline | null = null
    const isCancelled = () => cancelled
    const fill = fillRef.current
    const logoElement = logoRef.current
    if (preview) {
      // The standalone test must not block later page entrances.
      document.documentElement.dataset.startup = 'complete'
      window.dispatchEvent(new Event(STARTUP_READY_EVENT))
      text.textContent = 'LOADING...'
      gsap.set(text, { opacity: 1, y: 0, filter: 'none' })
      if (fill) gsap.set(fill, { clipPath: reducedMotion ? 'inset(0% 0 0 0)' : 'inset(100% 0 0 0)' })
      if (logoElement) gsap.set(logoElement, {
        opacity: reducedMotion ? 1 : 0,
        y: reducedMotion ? 0 : 12,
        filter: reducedMotion ? 'none' : 'blur(8px)',
      })
    }

    const essentialAssets = Promise.all([
      document.fonts?.ready.catch(() => undefined) ?? Promise.resolve(),
      preview ? Promise.resolve() : waitForInitialMedia(),
    ])
    const assetDeadline = Promise.race([
      essentialAssets,
      wait(MAXIMUM_ASSET_WAIT_MS),
    ])

    const finish = async () => {
      if (preview && !reducedMotion && logoElement) {
        gsap.set(text, { opacity: 0, y: 12, filter: 'blur(8px)' })
        await new Promise<void>((resolve) => {
          timeline = gsap.timeline({ delay: PREVIEW_PAUSE_SECONDS, onInterrupt: resolve })
            .to(logoElement, { opacity: 1, y: 0, filter: 'blur(0px)', duration: LOGO_FADE_SECONDS, ease: 'power3.out' }, 0)
            .to(text, { opacity: 1, y: 0, filter: 'blur(0px)', duration: TEXT_FADE_SECONDS, ease: 'power3.out' }, TEXT_ENTER_AT_SECONDS)
            // Start scrambling before the text entrance finishes.
            .call(resolve, [], SCRAMBLE_START_SECONDS)
          if (fill) timeline.to(fill, {
            clipPath: 'inset(0% 0 0 0)',
            duration: SCRAMBLE_START_SECONDS - FILL_START_SECONDS
              + (RANDOM_SCRAMBLE_STAGES * (TEXT_CHANGE_MS + PREVIEW_STAGE_HOLD_MS) + TEXT_CHANGE_MS) / 1000,
            ease: 'none',
          }, FILL_START_SECONDS)
        })
      } else if (reducedMotion) {
        text.textContent = 'LOADING...'
      } else {
        gsap.fromTo(
          text,
          { opacity: 0, y: 12, filter: 'blur(8px)' },
          { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.65, ease: 'power3.out' },
        )
      }

      if (!preview) await Promise.all([wait(MINIMUM_DISPLAY_MS), assetDeadline])
      if (cancelled) return

      if (reducedMotion) {
        text.textContent = 'ALMOST READY'
      } else {
        for (let stage = 0; stage < RANDOM_SCRAMBLE_STAGES; stage += 1) {
          await scrambleTo(text, createRandomText('ALMOST READY'), TEXT_CHANGE_MS, isCancelled)
          if (cancelled) return
          await wait(preview ? PREVIEW_STAGE_HOLD_MS : RANDOM_STAGE_HOLD_MS)
        }

        await scrambleTo(text, 'ALMOST READY', TEXT_CHANGE_MS, isCancelled)
      }
      if (cancelled) return

      await wait(READY_HOLD_MS)
      if (cancelled) return
      // Hold the final frame so the test can be replayed without leaving its URL.
      if (preview) return

      timeline = gsap.timeline({
        onComplete: () => {
          document.documentElement.dataset.startup = 'complete'
          window.dispatchEvent(new Event(STARTUP_READY_EVENT))
          releaseScrollLock()
          setVisible(false)
        },
      })

      if (reducedMotion) {
        timeline
          .to(text, { opacity: 0, duration: 0.2, ease: 'power2.out' })
          .to(root, { opacity: 0, duration: 0.22, ease: 'power2.out' }, '<')
      } else {
        timeline
          .to(text, {
            opacity: 0,
            filter: 'blur(14px)',
            duration: 0.42,
            ease: 'power2.in',
          }, 0)
          .fromTo(
            curtain,
            { y: '100vh' },
            { y: 0, duration: 1.2, ease: 'power4.inOut' },
            0,
          )
      }
    }

    void finish()

    return () => {
      cancelled = true
      timeline?.kill()
      gsap.killTweensOf([root, text, curtain])
      if (fill) gsap.killTweensOf(fill)
      if (logoElement) gsap.killTweensOf(logoElement)
      releaseScrollLock()
    }
  }, [preview, replay])

  if (!visible) return null

  return (
    <div ref={rootRef} className={`startup-loader${preview ? ' startup-loader--preview' : ''}`}>
      <div className={preview ? 'startup-loader__group' : 'startup-loader__status'} role="status" aria-live="polite" aria-label={preview ? 'Loading animation preview' : 'Loading portfolio'}>
        {preview && <span ref={logoRef} className="startup-loader__logo" style={{ maskImage: `url("${logo}")`, WebkitMaskImage: `url("${logo}")` }} aria-hidden="true">
          <span ref={fillRef} className="startup-loader__fill" />
        </span>}
        <span ref={textRef} className="startup-loader__text" aria-hidden="true">LOADING...</span>
      </div>
      {preview && <button type="button" className="startup-loader__replay" onClick={() => setReplay((value) => value + 1)}>Replay</button>}
      <div ref={curtainRef} className="startup-loader__curtain portfolio-background" aria-hidden="true" />
    </div>
  )
}
