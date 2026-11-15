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
    <header className="parent-page-head">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-sky-700">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>}
      </div>
      {(action || onRefresh) && (
        <div className="flex w-full min-w-0 flex-row flex-wrap gap-2 sm:w-auto sm:justify-end">
          {onRefresh && (
            <Button variant="outline" size="sm" className="min-h-10 rounded-lg border-slate-300 bg-white" onClick={onRefresh} disabled={refreshing}>
              <RefreshCw className={refreshing ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
              Actualiser
            </Button>
          )}
          {action}
        </div>
      )}
    </header>
  )
}
