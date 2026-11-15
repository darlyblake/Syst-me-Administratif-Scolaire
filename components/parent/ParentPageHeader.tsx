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

export function ParentPageHeader({ title, description, action, onRefresh, refreshing }: Props) {
  return (
    <header className="parent-page-head flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1>{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>}
      </div>
      {(action || onRefresh) && (
        <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          {onRefresh && <Button variant="outline" size="sm" className="rounded-md border-slate-300 bg-white" onClick={onRefresh} disabled={refreshing}><RefreshCw className={refreshing ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />Actualiser</Button>}
          {action}
        </div>
      )}
    </header>
  )
}
