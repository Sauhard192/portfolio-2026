import { useEffect, useRef, useState } from 'react'

import arrowTopLeft from '../../assets/icons/arrow-top-left.svg'

interface TooltipContent {
  title: string
  year: string
}

export function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null)
  const target = useRef({ x: -100, y: -100 })
  const current = useRef({ x: -100, y: -100 })
  const [isInteractive, setIsInteractive] = useState(false)
  const [tooltip, setTooltip] = useState<TooltipContent | null>(null)

  useEffect(() => {
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)')
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

    if (!finePointer.matches || reducedMotion.matches) return

    document.documentElement.dataset.customCursor = 'enabled'
    let frame = 0

    const tick = () => {
      current.current.x += (target.current.x - current.current.x) * 0.16
      current.current.y += (target.current.y - current.current.y) * 0.16

      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${current.current.x}px, ${current.current.y}px, 0)`
        cursorRef.current.dataset.side = target.current.x > window.innerWidth - 260 ? 'left' : 'right'
      }

      frame = requestAnimationFrame(tick)
    }

    const handlePointerMove = (event: PointerEvent) => {
      target.current.x = event.clientX
      target.current.y = event.clientY
    }

    const findCursorTarget = (eventTarget: EventTarget | null) =>
      eventTarget instanceof Element
        ? eventTarget.closest<HTMLElement>('[data-cursor]')
        : null

    const handlePointerOver = (event: PointerEvent) => {
      const element = findCursorTarget(event.target)
      if (!element) return

      setIsInteractive(true)
      const title = element.dataset.tooltip
      setTooltip(title ? { title, year: element.dataset.year ?? '' } : null)
    }

    const handlePointerOut = (event: PointerEvent) => {
      const from = findCursorTarget(event.target)
      const to = findCursorTarget(event.relatedTarget)
      if (!from || from === to) return

      setIsInteractive(Boolean(to))
      const title = to?.dataset.tooltip
      setTooltip(title ? { title, year: to?.dataset.year ?? '' } : null)
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    document.addEventListener('pointerover', handlePointerOver)
    document.addEventListener('pointerout', handlePointerOut)
    frame = requestAnimationFrame(tick)

    return () => {
      delete document.documentElement.dataset.customCursor
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('pointerover', handlePointerOver)
      document.removeEventListener('pointerout', handlePointerOut)
    }
  }, [])

  return (
    <div
      ref={cursorRef}
      className="site-cursor"
      data-interactive={isInteractive}
      data-tooltip-visible={Boolean(tooltip)}
      aria-hidden="true"
    >
      <span className="site-cursor__dot" />
      <span className="site-cursor__ring" />
      <span className="site-cursor__tooltip">
        <img className="site-cursor__arrow" src={arrowTopLeft} alt="" />
        <span>
          <strong>{tooltip?.title}</strong>
          <small>{tooltip?.year}</small>
        </span>
      </span>
    </div>
  )
}
