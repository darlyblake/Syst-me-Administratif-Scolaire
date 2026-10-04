"use client"

import type { ReactNode } from "react"

export function ParentEmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="border border-dashed border-terre/15 bg-papier px-5 py-12 text-center">
      <p className="font-semibold text-terre">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-lg text-sm leading-6 text-pierre">{description}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  )
}
