import { useEffect, useRef, useState } from 'react'

import arrowTopLeft from '../../assets/icons/arrow-top-left.svg'

interface TooltipContent {
  title: string
  year: string
}

interface CustomCursorProps {
  showTooltipIcon?: boolean
  initialTooltip?: string
  onInitialTooltipDismiss?: () => void
}

interface CursorDetail {
  interactive: boolean
  tooltip?: string
  year?: string
}

export function CustomCursor({
  showTooltipIcon = true,
  initialTooltip,
  onInitialTooltipDismiss,
}: CustomCursorProps) {
  const cursorRef = useRef<HTMLDivElement>(null)
  const target = useRef({ x: -100, y: -100 })
  const current = useRef({ x: -100, y: -100 })
  const [isInteractive, setIsInteractive] = useState(false)
  const [tooltip, setTooltip] = useState<TooltipContent | null>(() =>
    initialTooltip ? { title: initialTooltip, year: '' } : null,
  )

  useEffect(() => {
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)')
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

    if (!finePointer.matches || reducedMotion.matches) return

    setTooltip(initialTooltip ? { title: initialTooltip, year: '' } : null)
    document.documentElement.dataset.customCursor = 'enabled'
    let frame = 0
    let scrollEndTimer = 0
    let tooltipSuppressedByScroll = false
    let introTooltipActive = Boolean(initialTooltip)

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

    const updateFromElement = (element: HTMLElement | null) => {
      setIsInteractive(Boolean(element))
      if (introTooltipActive) return
      const title = element?.dataset.tooltip
      setTooltip(title ? { title, year: element?.dataset.year ?? '' } : null)
    }

    const restoreTooltipAfterScroll = () => {
      tooltipSuppressedByScroll = false
      const elementAtPointer = document.elementFromPoint(target.current.x, target.current.y)
      updateFromElement(findCursorTarget(elementAtPointer))
    }

    const handleScrollActivity = () => {
      if (introTooltipActive) onInitialTooltipDismiss?.()
      introTooltipActive = false
      tooltipSuppressedByScroll = true
      setTooltip(null)
      window.clearTimeout(scrollEndTimer)
      scrollEndTimer = window.setTimeout(restoreTooltipAfterScroll, 160)
    }

    const handlePointerOver = (event: PointerEvent) => {
      const element = findCursorTarget(event.target)
      if (!element) return

      setIsInteractive(true)
      if (tooltipSuppressedByScroll || introTooltipActive) return

      const title = element.dataset.tooltip
      setTooltip(title ? { title, year: element.dataset.year ?? '' } : null)
    }

    const handlePointerOut = (event: PointerEvent) => {
      const from = findCursorTarget(event.target)
      const to = findCursorTarget(event.relatedTarget)
      if (!from || from === to) return

      setIsInteractive(Boolean(to))
      if (tooltipSuppressedByScroll || introTooltipActive) return

      const title = to?.dataset.tooltip
      setTooltip(title ? { title, year: to?.dataset.year ?? '' } : null)
    }

    const handleVirtualTarget = (event: Event) => {
      const detail = (event as CustomEvent<CursorDetail>).detail
      setIsInteractive(detail.interactive)
      if (tooltipSuppressedByScroll || introTooltipActive) return

      setTooltip(
        detail.tooltip
          ? { title: detail.tooltip, year: detail.year ?? '' }
          : null,
      )
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    window.addEventListener('wheel', handleScrollActivity, { passive: true })
    window.addEventListener('touchmove', handleScrollActivity, { passive: true })
    window.addEventListener('scroll', handleScrollActivity, { passive: true })
    document.addEventListener('pointerover', handlePointerOver)
    document.addEventListener('pointerout', handlePointerOut)
    window.addEventListener('portfolio:cursor-target', handleVirtualTarget)
    frame = requestAnimationFrame(tick)

    return () => {
      delete document.documentElement.dataset.customCursor
      cancelAnimationFrame(frame)
      window.clearTimeout(scrollEndTimer)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('wheel', handleScrollActivity)
      window.removeEventListener('touchmove', handleScrollActivity)
      window.removeEventListener('scroll', handleScrollActivity)
      document.removeEventListener('pointerover', handlePointerOver)
      document.removeEventListener('pointerout', handlePointerOut)
      window.removeEventListener('portfolio:cursor-target', handleVirtualTarget)
    }
  }, [initialTooltip, onInitialTooltipDismiss])

  return (
    <div
      ref={cursorRef}
      className="site-cursor"
      data-interactive={isInteractive}
      data-tooltip-visible={Boolean(tooltip)}
      data-tooltip-icon={showTooltipIcon}
      aria-hidden="true"
    >
      <span className="site-cursor__dot" />
      <span className="site-cursor__ring" />
      <span className="site-cursor__tooltip">
        {showTooltipIcon && <img className="site-cursor__arrow" src={arrowTopLeft} alt="" />}
        <span>
          <strong>{tooltip?.title}</strong>
          <small>{tooltip?.year}</small>
        </span>
      </span>
    </div>
  )
}
