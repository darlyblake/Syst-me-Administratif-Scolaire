"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { AcademicYear } from "@/lib/supabase/types"

interface AcademicYearSelectorProps {
  value?: string
  years: AcademicYear[]
  onChange: (yearId: string) => void
  placeholder?: string
}

export function AcademicYearSelector({ value, years, onChange, placeholder = "Choisir une année" }: AcademicYearSelectorProps) {
  return (
    <Select value={value || ""} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {years.map((year) => (
          <SelectItem key={year.id} value={year.id}>
            {year.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
