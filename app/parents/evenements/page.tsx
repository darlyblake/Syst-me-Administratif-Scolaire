"use client"

import { useMemo } from "react"
import { Calendar, MapPin, Clock } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { serviceParents, type EvenementParent } from "@/services/parents.service"

const TYPE_LABELS: Record<EvenementParent["type"], { label: string; className: string }> = {
  reunion: { label: "Réunion", className: "bg-terre-soft text-terre" },
  examen: { label: "Examen", className: "bg-rose-100 text-rose-700" },
  fete: { label: "Fête", className: "bg-fuchsia-100 text-fuchsia-700" },
  conference: { label: "Conférence", className: "bg-sky-100 text-sky-700" },
  sport: { label: "Sport", className: "bg-emerald-100 text-emerald-700" },
  autre: { label: "Autre", className: "bg-slate-100 text-slate-700" },
}

export default function ParentsEvenementsPage() {
  const evenements = useMemo(() => serviceParents.obtenirEvenements(), [])
  const aujourdhui = new Date()
  aujourdhui.setHours(0, 0, 0, 0)

  const aVenir = evenements.filter((e) => new Date(e.date) >= aujourdhui)
  const passes = evenements.filter((e) => new Date(e.date) < aujourdhui)

  const renderList = (list: typeof evenements, empty: string) =>
    list.length === 0 ? (
      <p className="py-8 text-center text-pierre">{empty}</p>
    ) : (
      <div className="space-y-3">
        {list.map((e) => {
          const type = TYPE_LABELS[e.type]
          const d = new Date(e.date)
          return (
            <Card key={e.id} className="border-terre/10">
              <CardContent className="flex gap-4 p-5">
                <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-terre-soft text-violet-800">
                  <span className="text-[10px] font-semibold uppercase">
                    {d.toLocaleDateString("fr-FR", { month: "short" })}
                  </span>
                  <span className="text-xl font-bold leading-none">{d.getDate()}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-terre">{e.titre}</h3>
                    <Badge className={type.className}>{type.label}</Badge>
                    {e.classe && (
                      <Badge variant="outline" className="font-normal">
                        {e.classe}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-pierre">{e.description}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-pierre">
                    {(e.heureDebut || e.heureFin) && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {e.heureDebut}
                        {e.heureFin ? ` – ${e.heureFin}` : ""}
                      </span>
                    )}
                    {e.lieu && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {e.lieu}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-terre">
          <Calendar className="h-6 w-6 text-terre" />
          Événements
        </h1>
        <p className="text-pierre">Calendrier scolaire et rendez-vous</p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-pierre">
          À venir ({aVenir.length})
        </h2>
        {renderList(aVenir, "Aucun événement à venir.")}
      </section>

      {passes.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-pierre">
            Passés ({passes.length})
          </h2>
          {renderList(passes, "")}
        </section>
      )}
    </div>
  )
}
