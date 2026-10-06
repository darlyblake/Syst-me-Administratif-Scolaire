"use client"

import Link from "next/link"
import { CalendarDays } from "lucide-react"
import AcademicYearsTab from "@/components/academic/AcademicYearsTab"

export default function AcademicYearSettingsPage() {
  return (
    <div className="w-full min-w-0 space-y-4">
      <div className="border-b border-[#d7dae3] pb-4">
        <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-[#6b7280]">
          Paramètres <span className="px-1">/</span> Année académique
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[24px] font-semibold leading-8 tracking-tight text-[#172033]">
              Année académique &amp; Périodes
            </h1>
            <p className="mt-1 text-[13px] leading-5 text-[#5d6677]">
              Gérez l'année scolaire active et les périodes officielles de l'établissement.
            </p>
          </div>
          <Link
            href="/ecole/settings"
            className="inline-flex h-9 items-center justify-center rounded-md border border-[#cfd3dc] bg-white px-3 text-[12px] font-medium text-[#36445a] hover:bg-[#f5f6f8]"
          >
            <CalendarDays className="mr-2 h-4 w-4" />
            Tous les paramètres
          </Link>
        </div>
      </div>

      <AcademicYearsTab />
    </div>
  )
}
