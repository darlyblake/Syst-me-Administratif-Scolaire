"use client"

import type { ParentChild } from "@/hooks/use-parent-portal"

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

  return (
    <label className="flex items-center gap-3">
      <span className="text-sm font-medium text-slate-700">Enfant</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full min-w-0 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:w-[220px]"
        aria-label="Sélectionner un enfant"
      >
        <option value="tous">Tous les enfants</option>
        {visible.map((child) => (
          <option key={child.id} value={child.id}>
            {child.first_name || ""} {child.last_name || ""}
          </option>
        ))}
      </select>
    </label>
  )
}
