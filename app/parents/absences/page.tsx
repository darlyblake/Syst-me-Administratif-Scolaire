"use client"

import { useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { UserX, Clock, CheckCircle2, AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { serviceParents } from "@/services/parents.service"
import type { Absence } from "@/types/models"

const STATUT_CONFIG: Record<
  Absence["statut"],
  { label: string; className: string; icon: typeof UserX }
> = {
  absent: { label: "Absent", className: "bg-rose-50 text-rose-700", icon: UserX },
  justifie: { label: "Justifié", className: "bg-emerald-50 text-emerald-700", icon: CheckCircle2 },
  non_justifie: { label: "Non justifié", className: "bg-amber-50 text-amber-700", icon: AlertCircle },
  retard: { label: "Retard", className: "bg-orange-50 text-orange-700", icon: Clock },
}

export default function ParentsAbsencesPage() {
  const searchParams = useSearchParams()
  const enfants = useMemo(() => serviceParents.obtenirEnfants(), [])
  const [eleveId, setEleveId] = useState(searchParams.get("eleve") || "tous")

  const absences = useMemo(() => {
    return serviceParents.obtenirAbsences(eleveId === "tous" ? undefined : eleveId)
  }, [eleveId])

  const stats = useMemo(() => {
    return {
      total: absences.length,
      justifiees: absences.filter((a) => a.statut === "justifie").length,
      retards: absences.filter((a) => a.statut === "retard").length,
      nonJustifiees: absences.filter((a) => a.statut === "non_justifie" || a.statut === "absent").length,
    }
  }, [absences])

  const nomEleve = (id: string) => {
    const e = enfants.find((x) => x.id === id)
    return e ? `${e.prenom} ${e.nom}` : id
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-terre">
          <UserX className="h-6 w-6 text-terre" />
          Absences & retards
        </h1>
        <p className="text-pierre">Historique de présence de vos enfants</p>
      </div>

      <Select value={eleveId} onValueChange={setEleveId}>
        <SelectTrigger className="w-[240px]">
          <SelectValue placeholder="Filtrer par enfant" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="tous">Tous les enfants</SelectItem>
          {enfants.map((e) => (
            <SelectItem key={e.id} value={e.id}>
              {e.prenom} {e.nom}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Total", value: stats.total, color: "text-terre" },
          { label: "Justifiées", value: stats.justifiees, color: "text-emerald-700" },
          { label: "Retards", value: stats.retards, color: "text-orange-700" },
          { label: "Non justifiées", value: stats.nonJustifiees, color: "text-rose-700" },
        ].map((s) => (
          <Card key={s.label} className="border-terre/10">
            <CardContent className="p-4 text-center">
              <p className="text-xs uppercase text-pierre">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {absences.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-pierre">
            Aucune absence enregistrée pour cette sélection.
          </CardContent>
        </Card>
      ) : (
        <Card className="border-terre/10">
          <CardHeader>
            <CardTitle className="text-base">Historique</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {absences.map((a) => {
              const cfg = STATUT_CONFIG[a.statut]
              const Icon = cfg.icon
              return (
                <div
                  key={a.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-terre/10 p-4"
                >
                  <div className="flex gap-3">
                    <div className={`rounded-lg p-2 ${cfg.className}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-terre">
                        {new Date(a.date).toLocaleDateString("fr-FR", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                      <p className="text-sm text-pierre">{nomEleve(a.eleveId)}</p>
                      {a.motif && <p className="mt-1 text-sm text-pierre">Motif : {a.motif}</p>}
                      {a.justificatif && (
                        <p className="text-xs text-emerald-600">Justificatif : {a.justificatif}</p>
                      )}
                    </div>
                  </div>
                  <Badge className={cfg.className}>{cfg.label}</Badge>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
