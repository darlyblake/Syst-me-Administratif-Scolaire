"use client"

import { useEffect, useRef, useState } from "react"

interface AnimatedCounterProps {
  value: number
  label: string
  duration?: number
  suffix?: string
}

export function AnimatedCounter({ value, label, duration = 1300, suffix = "+" }: AnimatedCounterProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [count, setCount] = useState(0)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        } else {
          setIsVisible(false)
          setCount(0)
        }
      },
      { threshold: 0.6 }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!isVisible) {
      setCount(0)
      return
    }

    const start = performance.now()
    let frameId = 0

    const animate = (time: number) => {
      const progress = Math.min((time - start) / duration, 1)
      // Easing: ease-out-quart
      const eased = 1 - Math.pow(1 - progress, 4)
      setCount(Math.round(value * eased))

      if (progress < 1) {
        frameId = requestAnimationFrame(animate)
      }
    }

    frameId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameId)
  }, [isVisible, value, duration])

  return (
    <div ref={ref} className="text-center">
      <div className="text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl">
        {count}{suffix}
      </div>
      <div className="mt-1 text-sm text-slate-500">{label}</div>
    </div>
  )
}
