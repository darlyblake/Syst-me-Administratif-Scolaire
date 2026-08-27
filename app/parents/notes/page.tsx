"use client"

import { useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { FileText, TrendingUp } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { serviceParents, type NoteEleve } from "@/services/parents.service"

const TYPE_LABELS: Record<NoteEleve["type"], string> = {
  devoir: "Devoir",
  controle: "Contrôle",
  oral: "Oral",
  composition: "Composition",
}

function noteColor(note: number) {
  if (note >= 16) return "text-emerald-700 bg-emerald-50"
  if (note >= 12) return "text-sky-700 bg-sky-50"
  if (note >= 10) return "text-amber-700 bg-amber-50"
  return "text-rose-700 bg-rose-50"
}

export default function ParentsNotesPage() {
  const searchParams = useSearchParams()
  const enfants = useMemo(() => serviceParents.obtenirEnfants(), [])
  const [eleveId, setEleveId] = useState(searchParams.get("eleve") || enfants[0]?.id || "")
  const [trimestre, setTrimestre] = useState<"all" | "1" | "2" | "3">("1")

  const notes = useMemo(() => {
    const t = trimestre === "all" ? undefined : (Number(trimestre) as 1 | 2 | 3)
    return serviceParents.obtenirNotes(eleveId || undefined, t)
  }, [eleveId, trimestre])

  const moyenne = useMemo(() => {
    if (!eleveId) return 0
    const t = trimestre === "all" ? undefined : (Number(trimestre) as 1 | 2 | 3)
    return serviceParents.calculerMoyenne(eleveId, t)
  }, [eleveId, trimestre])

  const parMatiere = useMemo(() => {
    const map = new Map<string, NoteEleve[]>()
    notes.forEach((n) => {
      const list = map.get(n.matiere) || []
      list.push(n)
      map.set(n.matiere, list)
    })
    return Array.from(map.entries()).map(([matiere, list]) => {
      const coef = list.reduce((s, n) => s + n.coefficient, 0)
      const moy = list.reduce((s, n) => s + n.note * n.coefficient, 0) / (coef || 1)
      return { matiere, notes: list, moyenne: Math.round(moy * 10) / 10 }
    })
  }, [notes])

  const enfant = enfants.find((e) => e.id === eleveId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-terre">
          <FileText className="h-6 w-6 text-terre" />
          Notes & bulletins
        </h1>
        <p className="text-pierre">Suivi des évaluations par enfant et par trimestre</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={eleveId} onValueChange={setEleveId}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Choisir un enfant" />
          </SelectTrigger>
          <SelectContent>
            {enfants.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.prenom} {e.nom} ({e.classe})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-1 rounded-lg border bg-papier p-1">
          {(
            [
              ["1", "T1"],
              ["2", "T2"],
              ["3", "T3"],
              ["all", "Tous"],
            ] as const
          ).map(([v, label]) => (
            <Button
              key={v}
              size="sm"
              variant={trimestre === v ? "default" : "ghost"}
              className={trimestre === v ? "bg-violet-600" : ""}
              onClick={() => setTrimestre(v)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {enfant && (
        <Card className="border-terre/10 bg-gradient-to-r from-violet-50 to-fuchsia-50">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
            <div>
              <p className="text-sm text-pierre">
                {enfant.prenom} {enfant.nom} · Classe {enfant.classe}
              </p>
              <p className="mt-1 flex items-center gap-2 text-2xl font-bold text-terre">
                <TrendingUp className="h-6 w-6" />
                Moyenne : {moyenne.toFixed(1)} / 20
              </p>
            </div>
            <Badge className="bg-violet-600 text-white hover:bg-violet-600">
              {notes.length} note{notes.length > 1 ? "s" : ""}
            </Badge>
          </CardContent>
        </Card>
      )}

      {parMatiere.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-pierre">
            Aucune note pour cette sélection.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {parMatiere.map(({ matiere, notes: list, moyenne: moy }) => (
            <Card key={matiere} className="border-terre/10">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-base">{matiere}</CardTitle>
                  <CardDescription>{list.length} évaluation(s)</CardDescription>
                </div>
                <div className={`rounded-lg px-3 py-1.5 text-sm font-bold ${noteColor(moy)}`}>
                  {moy.toFixed(1)} / 20
                </div>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {list.map((n) => (
                    <div
                      key={n.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-normal">
                            {TYPE_LABELS[n.type]}
                          </Badge>
                          <span className="text-xs text-pierre">
                            Coef. {n.coefficient} ·{" "}
                            {new Date(n.date).toLocaleDateString("fr-FR")}
                          </span>
                        </div>
                        {n.appreciation && (
                          <p className="mt-1 text-sm text-pierre">{n.appreciation}</p>
                        )}
                      </div>
                      <span className={`rounded-lg px-2.5 py-1 text-sm font-bold ${noteColor(n.note)}`}>
                        {n.note.toFixed(1)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
