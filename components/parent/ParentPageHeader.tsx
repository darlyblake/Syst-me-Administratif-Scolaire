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
    <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-blue-600">{eyebrow}</p>}
        <h1 className="mt-1.5 text-[26px] font-bold tracking-tight text-slate-950 sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>}
      </div>
      {(action || onRefresh) && (
        <div className="flex shrink-0 flex-wrap gap-2">
          {onRefresh && <Button variant="outline" size="sm" className="rounded-lg border-slate-200 bg-white" onClick={onRefresh} disabled={refreshing}><RefreshCw className={refreshing ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />Actualiser</Button>}
          {action}
        </div>
      )}
    </header>
  )
}
