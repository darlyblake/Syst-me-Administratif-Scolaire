"use client"

import type { ReactNode } from "react"

type Props = {
  eyebrow?: string
  title: string
  description?: string
  action?: ReactNode
  onRefresh?: () => void
  refreshing?: boolean
}

export function ParentPageHeader({ eyebrow, title, description, action }: Props) {
  return (
    <header className="parent-page-head">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-sky-700 parent-page-eyebrow">{eyebrow}</p>}
        <h1 className="parent-page-title">{title}</h1>
        {description && <p className="parent-page-description mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>}
      </div>
      {action && (
        <div className="flex w-full min-w-0 flex-row flex-wrap items-center gap-2 sm:w-auto sm:justify-end">

          {action}
        </div>
      )}
    </header>
  )
}
