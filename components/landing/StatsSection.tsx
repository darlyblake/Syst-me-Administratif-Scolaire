"use client"

import { BookOpen, CalendarCheck, CreditCard, BellRing, Users } from "lucide-react"

const items = [
  { icon: Users, label: "Élèves et classes" },
  { icon: BookOpen, label: "Notes et résultats" },
  { icon: CalendarCheck, label: "Présences et emplois du temps" },
  { icon: CreditCard, label: "Scolarité et paiements" },
  { icon: BellRing, label: "Informations aux familles" },
]

export function StatsSection() {
  return (
    <section className="border-y border-blue-100 bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-4 px-5 py-6 sm:px-8 lg:justify-between">
        {items.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-2.5 text-sm font-medium text-slate-600">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-800">
              <Icon className="h-4 w-4" />
            </span>
            {label}
          </div>
        ))}
      </div>
    </section>
  )
}
