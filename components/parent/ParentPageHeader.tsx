"use client"

import type { ReactNode } from "react"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

type Props = {
  eyebrow?: string
  title: string
  description?: string
  action?: ReactNode
  onRefresh?: () => void
  refreshing?: boolean
}

export function ParentPageHeader({ eyebrow, title, description, action, onRefresh, refreshing }: Props) {
  return (
    <header className="flex min-w-0 flex-col gap-3 border-b border-slate-200 pb-4 sm:gap-4 sm:pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-blue-600">{eyebrow}</p>}
        <h1 className="mt-1 text-[23px] font-bold leading-tight tracking-tight text-slate-950 [overflow-wrap:anywhere] sm:mt-1.5 sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-[13px] leading-5 text-slate-500 sm:mt-1.5 sm:text-sm sm:leading-6">{description}</p>}
      </div>
      {(action || onRefresh) && (
        <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          {onRefresh && <Button variant="outline" size="sm" className="rounded-lg border-slate-200 bg-white" onClick={onRefresh} disabled={refreshing}><RefreshCw className={refreshing ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />Actualiser</Button>}
          {action}
        </div>
      )}
    </header>
  )
}
