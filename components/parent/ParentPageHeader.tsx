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
    <header className="flex flex-col gap-4 border-b border-terre/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.12em] text-terre">{eyebrow}</p>}
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-terre sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm leading-6 text-pierre">{description}</p>}
      </div>
      {(action || onRefresh) && (
        <div className="flex shrink-0 flex-wrap gap-2">
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={refreshing}>
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
