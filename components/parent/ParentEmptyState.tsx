"use client"

import type { ReactNode } from "react"
import { Inbox } from "lucide-react"

export function ParentEmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="parent-empty-state flex min-w-0 flex-col items-center justify-center px-5 py-10 text-center sm:py-12">
      <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-sky-50 text-sky-700">
        <Inbox className="h-5 w-5" aria-hidden="true" />
      </span>
      <p className="font-semibold text-slate-900">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-lg text-sm leading-6 text-slate-500">{description}</p>}
      {action && <div className="mt-5 flex w-full justify-center sm:w-auto">{action}</div>}
    </div>
  )
}
