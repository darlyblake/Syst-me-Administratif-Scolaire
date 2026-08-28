"use client"

import type { ReactNode } from "react"

interface BlurFadeProps {
  children: ReactNode
  delay?: number
  className?: string
}

export function BlurFade({ children, delay = 0, className = "" }: BlurFadeProps) {
  return (
    <div className={`blur-fade ${className}`} style={{ animationDelay: `${delay}s` }}>
      {children}
    </div>
  )
}
