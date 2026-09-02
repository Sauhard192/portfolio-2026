import { useEffect, useRef, useState } from 'react'

interface ScrambleTextProps {
  children: string
  duration?: number
  className?: string
}

const FRAME_INTERVAL = 32

export function ScrambleText({
  children,
  duration = 300,
  className = '',
}: ScrambleTextProps) {
  const [displayText, setDisplayText] = useState(children)
  const animationFrameRef = useRef<number | null>(null)
  const lastFrameTimeRef = useRef(0)

  const stopAnimation = () => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
  }

  useEffect(() => {
    setDisplayText(children)
    return stopAnimation
  }, [children])

  const scramble = (event: React.PointerEvent<HTMLSpanElement>) => {
    if (
      event.pointerType === 'touch' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return
    }

    stopAnimation()

    const characters = Array.from(children)
    const characterPool = characters.filter((character) => character.trim().length > 0)
    const startedAt = performance.now()
    lastFrameTimeRef.current = 0

    if (characterPool.length === 0) return

    const animate = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1)

      if (now - lastFrameTimeRef.current >= FRAME_INTERVAL || progress === 1) {
        const resolvedCount = Math.floor(progress * characters.length)
        const nextText = characters
          .map((character, index) => {
            if (character.trim().length === 0 || index < resolvedCount || progress === 1) {
              return character
            }

            return characterPool[Math.floor(Math.random() * characterPool.length)]
          })
          .join('')

        setDisplayText(nextText)
        lastFrameTimeRef.current = now
      }

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate)
      } else {
        animationFrameRef.current = null
      }
    }

    animationFrameRef.current = requestAnimationFrame(animate)
  }

  const restore = () => {
    stopAnimation()
    setDisplayText(children)
  }

  return (
    <span
      className={`scramble-text ${className}`.trim()}
      aria-label={children}
      onPointerEnter={scramble}
      onPointerLeave={restore}
    >
      <span className="scramble-text__measure" aria-hidden="true">
        {children}
      </span>
      <span className="scramble-text__visual" aria-hidden="true">
        {displayText}
      </span>
    </span>
  )
}
