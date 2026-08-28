"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, UserCheck, UserX, Clock, AlertCircle } from "lucide-react"
import type { DonneesEnseignant } from "@/types/models"

interface DashboardSummaryProps {
  stats: {
    total: number
    active: number
    inactive: number
    onLeave: number
    suspended: number
  }
  uniqueSubjects: string[]
  teachers: DonneesEnseignant[]
}

export function DashboardSummary({ stats }: DashboardSummaryProps) {
  const activeRate = stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0

  const items = [
    {
      label: "Total",
      value: stats.total,
      helper: `${activeRate}% actifs`,
      icon: Users,
    },
    {
      label: "Actifs",
      value: stats.active,
      helper: "Disponibles",
      icon: UserCheck,
    },
    {
      label: "En congé",
      value: stats.onLeave,
      helper: "Absences prévues",
      icon: Clock,
    },
    {
      label: "Inactifs",
      value: stats.inactive,
      helper: stats.suspended > 0 ? `${stats.suspended} suspendu${stats.suspended > 1 ? "s" : ""}` : "Aucun suspendu",
      icon: UserX,
    },
  ]

  return (
    <section aria-label="Résumé des enseignants" className="mb-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {items.map(({ label, value, helper, icon: Icon }) => (
          <Card key={label} className="border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl md:text-3xl font-bold tracking-tight">{value}</div>
              <p className="text-xs text-muted-foreground mt-1">{helper}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {stats.suspended > 0 && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-900">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            <strong>{stats.suspended}</strong> enseignant{stats.suspended > 1 ? "s" : ""} suspendu{stats.suspended > 1 ? "s" : ""} — vérification recommandée.
          </span>
        </div>
      )}
    </section>
  )
}
