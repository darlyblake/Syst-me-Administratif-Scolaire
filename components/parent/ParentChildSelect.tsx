"use client"

import type { ParentChild } from "@/hooks/use-parent-portal"
import { ChevronDown, Users } from "lucide-react"

export function ParentChildSelect({
  children,
  value,
  onChange,
  financeOnly = false,
}: {
  children: ParentChild[]
  value: string
  onChange: (value: string) => void
  financeOnly?: boolean
}) {
  const visible = financeOnly ? children.filter((child) => child.can_view_finance) : children
  const selected = visible.find((child) => child.id === value)

  return (
    <label className="inline-flex min-w-0 items-center gap-2.5 rounded-full border border-slate-200 bg-white px-3 py-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-700">
        <Users className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Afficher pour</span>
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-6 w-full min-w-[130px] max-w-[220px] border-0 bg-transparent p-0 pr-6 text-sm font-semibold text-slate-900 outline-none focus:ring-0"
          aria-label="Sélectionner un enfant"
        >
          <option value="tous">Tous les enfants</option>
          {visible.map((child) => (
            <option key={child.id} value={child.id}>
              {child.first_name || ""} {child.last_name || ""}
            </option>
          ))}
        </select>
      </span>
      <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
      <span className="sr-only">{selected ? "Enfant sélectionné" : "Tous les enfants"}</span>
    </label>
  )
}
