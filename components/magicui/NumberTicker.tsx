"use client"

import { useEffect, useState } from "react"

interface NumberTickerProps {
  value: number
  duration?: number
  className?: string
}

export function NumberTicker({ value, duration = 650, className = "" }: NumberTickerProps) {
  const [displayValue, setDisplayValue] = useState(value)

  useEffect(() => {
    const startValue = displayValue
    const difference = value - startValue
    if (difference === 0) return

    let frameId = 0
    const startTime = performance.now()
    const update = (time: number) => {
      const progress = Math.min((time - startTime) / duration, 1)
      const easedProgress = 1 - Math.pow(1 - progress, 3)
      setDisplayValue(Math.round(startValue + difference * easedProgress))
      if (progress < 1) frameId = requestAnimationFrame(update)
    }

    frameId = requestAnimationFrame(update)
    return () => cancelAnimationFrame(frameId)
  }, [duration, value])

  return <span className={className}>{displayValue.toLocaleString("fr-FR")}</span>
}
