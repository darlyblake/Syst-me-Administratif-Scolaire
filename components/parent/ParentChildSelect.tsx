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
    <label className="inline-flex min-w-0 max-w-full items-center gap-3 rounded-lg border border-[#d8e5f1] bg-white px-3 py-2.5 shadow-none">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#eaf4ff] text-[#1767a5]">
        <Users className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-[10px] font-semibold uppercase tracking-[0.09em] text-slate-500">Afficher pour</span>
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-7 w-full min-w-[130px] max-w-[220px] border-0 bg-transparent p-0 pr-6 text-sm font-semibold text-[#102b45] outline-none focus:ring-0"
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
