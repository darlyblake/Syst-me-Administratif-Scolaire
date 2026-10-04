"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ParentChild } from "@/hooks/use-parent-portal"

export function ParentChildSelect({ children, value, onChange, financeOnly = false }: {
  children: ParentChild[]
  value: string
  onChange: (value: string) => void
  financeOnly?: boolean
}) {
  const visible = financeOnly ? children.filter((child) => child.can_view_finance) : children
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-terre">Enfant</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[220px] bg-papier"><SelectValue placeholder="Tous les enfants" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="tous">Tous les enfants</SelectItem>
          {visible.map((child) => (
            <SelectItem key={child.id} value={child.id}>{child.first_name} {child.last_name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
