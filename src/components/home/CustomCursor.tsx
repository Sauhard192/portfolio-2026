import { useEffect, useRef, useState } from 'react'

import arrowTopLeft from '../../assets/icons/arrow-top-left.svg'
import arrowLeft from '../../assets/icons/arrow-left.svg'
import arrowRight from '../../assets/icons/arrow-right.svg'

interface TooltipContent {
  title: string
  year: string
  icon?: string
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
      setIsInteractive(Boolean(element && element.dataset.cursor !== 'dot'))
      if (introTooltipActive) return
      const title = element?.dataset.tooltip
      setTooltip(title ? { title, year: element?.dataset.year ?? '', icon: element?.dataset.tooltipIcon } : null)
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

      setIsInteractive(element.dataset.cursor !== 'dot')
      if (tooltipSuppressedByScroll) return
      if (introTooltipActive) {
        setTooltip(null)
        return
      }

      const title = element.dataset.tooltip
      setTooltip(title ? { title, year: element.dataset.year ?? '', icon: element.dataset.tooltipIcon } : null)
    }

    const handlePointerOut = (event: PointerEvent) => {
      const from = findCursorTarget(event.target)
      const to = findCursorTarget(event.relatedTarget)
      if (!from || from === to) return

      setIsInteractive(Boolean(to && to.dataset.cursor !== 'dot'))
      if (tooltipSuppressedByScroll) return
      if (introTooltipActive) {
        setTooltip(to ? null : initialTooltip ? { title: initialTooltip, year: '' } : null)
        return
      }

      const title = to?.dataset.tooltip
      setTooltip(title ? { title, year: to?.dataset.year ?? '', icon: to?.dataset.tooltipIcon } : null)
    }

    const handleVirtualTarget = (event: Event) => {
      const detail = (event as CustomEvent<CursorDetail>).detail
      setIsInteractive(detail.interactive)
      if (tooltipSuppressedByScroll) return
      if (introTooltipActive) {
        setTooltip(
          detail.interactive && detail.tooltip
            ? { title: detail.tooltip, year: detail.year ?? '' }
            : initialTooltip
              ? { title: initialTooltip, year: '' }
              : null,
        )
        return
      }

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
    window.addEventListener('portfolio:scroll-intent', handleScrollActivity)
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
      window.removeEventListener('portfolio:scroll-intent', handleScrollActivity)
    }
  }, [initialTooltip, onInitialTooltipDismiss])

  const tooltipIcon = tooltip?.icon === 'left' ? arrowLeft
    : tooltip?.icon === 'right' ? arrowRight
    : showTooltipIcon ? arrowTopLeft : undefined

  return (
    <div
      ref={cursorRef}
      className="site-cursor"
      data-interactive={isInteractive}
      data-tooltip-visible={Boolean(tooltip)}
      data-tooltip-icon={Boolean(tooltipIcon)}
      aria-hidden="true"
    >
      <span className="site-cursor__dot" />
      <span className="site-cursor__ring" />
      <span className="site-cursor__tooltip">
        {tooltipIcon && <img className="site-cursor__arrow" src={tooltipIcon} alt="" />}
        <span>
          <strong>{tooltip?.title}</strong>
          <small>{tooltip?.year}</small>
        </span>
      </span>
    </div>
  )
}
