"use client"

import { useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { FileText, TrendingUp, RefreshCw } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useParentPortal } from "@/hooks/use-parent-portal"

function noteColor(note: number) {
  if (note >= 16) return "text-emerald-700 bg-emerald-50"
  if (note >= 12) return "text-sky-700 bg-sky-50"
  if (note >= 10) return "text-amber-700 bg-amber-50"
  return "text-rose-700 bg-rose-50"
}

export default function ParentsNotesPage() {
  const searchParams = useSearchParams()
  const { loading, error, refresh, children, grades } = useParentPortal()
  const [eleveId, setEleveId] = useState(searchParams.get("eleve") || "tous")
  const [trimestre, setTrimestre] = useState("all")

  const allowedChildren = children.filter((child) => child.can_view_academic)
  const selectedIds = eleveId === "tous" ? allowedChildren.map((child) => child.id) : [eleveId]

  const notes = useMemo(() => {
    return grades.filter((grade) => {
      if (!selectedIds.includes(grade.student_id)) return false
      return trimestre === "all" || grade.term === trimestre || grade.term === `T${trimestre}`
    })
  }, [grades, selectedIds, trimestre])

  const moyenne = notes.length ? notes.reduce((sum, note) => sum + note.score, 0) / notes.length : 0
  const enfant = eleveId === "tous" ? null : allowedChildren.find((child) => child.id === eleveId)

  const subjectGroups = useMemo(() => {
    const map = new Map<string, typeof notes>()
    for (const note of notes) {
      const key = note.subject || "Matière non renseignée"
      const list = map.get(key) || []
      list.push(note)
      map.set(key, list)
    }
    return Array.from(map.entries())
  }, [notes])

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center text-pierre">Chargement des notes...</div>

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-terre"><FileText className="h-6 w-6" />Notes & bulletins</h1>
          <p className="text-pierre">Notes réellement publiées par l'établissement</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void refresh()}><RefreshCw className="mr-2 h-4 w-4" />Actualiser</Button>
      </div>

      {error && <Card className="border-red-200 bg-red-50"><CardContent className="p-4 text-sm text-red-700">{error}</CardContent></Card>}

      <div className="flex flex-wrap gap-3">
        <Select value={eleveId} onValueChange={setEleveId}>
          <SelectTrigger className="w-[240px]"><SelectValue placeholder="Choisir un enfant" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous mes enfants</SelectItem>
            {allowedChildren.map((child) => <SelectItem key={child.id} value={child.id}>{child.first_name} {child.last_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex gap-1 rounded-lg border border-terre/10 bg-papier p-1">
          {[['all','Tous'],['1','T1'],['2','T2'],['3','T3']].map(([value,label]) => (
            <Button key={value} size="sm" variant={trimestre === value ? "default" : "ghost"} onClick={() => setTrimestre(value)}>{label}</Button>
          ))}
        </div>
      </div>

      {notes.length > 0 && (
        <Card className="border-terre/10 bg-papier">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
            <div>
              <p className="text-sm text-pierre">{enfant ? `${enfant.first_name} ${enfant.last_name}` : "Tous mes enfants"}</p>
              <p className="mt-1 flex items-center gap-2 text-2xl font-bold text-terre"><TrendingUp className="h-6 w-6" />Moyenne : {moyenne.toFixed(1)} / 20</p>
            </div>
            <Badge>{notes.length} évaluation{notes.length > 1 ? "s" : ""}</Badge>
          </CardContent>
        </Card>
      )}

      {subjectGroups.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-pierre">Aucune note publiée pour cette sélection.</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {subjectGroups.map(([subject, list]) => {
            const subjectAverage = list.reduce((sum, note) => sum + note.score, 0) / list.length
            return <Card key={subject} className="border-terre/10">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div><CardTitle className="text-base text-terre">{subject}</CardTitle><CardDescription>{list.length} évaluation{list.length > 1 ? "s" : ""}</CardDescription></div>
                <div className={`rounded-lg px-3 py-1.5 text-sm font-bold ${noteColor(subjectAverage)}`}>{subjectAverage.toFixed(1)} / 20</div>
              </CardHeader>
              <CardContent className="divide-y">
                {list.map((note) => <div key={note.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div><p className="font-medium text-terre">{note.title || "Évaluation"}</p><p className="text-xs text-pierre">{note.assessment_date ? new Date(note.assessment_date).toLocaleDateString("fr-FR") : "Date non renseignée"}{note.term ? ` · ${note.term}` : ""}</p>{note.comment && <p className="mt-1 text-sm text-pierre">{note.comment}</p>}</div>
                  <span className={`rounded-lg px-2.5 py-1 text-sm font-bold ${noteColor(note.score)}`}>{note.score.toFixed(1)}{note.max_score ? ` / ${note.max_score}` : " / 20"}</span>
                </div>)}
              </CardContent>
            </Card>
          })}
        </div>
      )}
    </div>
  )
}
