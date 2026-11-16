"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, CalendarDays, Clock } from "lucide-react"
import { supabaseBrowser } from "@/lib/supabase/client"
import { ParentPageHeader } from "@/components/parent/ParentPageHeader"
import { ParentEmptyState } from "@/components/parent/ParentEmptyState"

type Exclusion = {
  id: string; student_id: string; subject_id: string; lesson_date: string; excluded_at: string;
  reason: string; scope: string; end_date: string | null; status: string; review_note: string | null;
  students: { first_name: string; last_name: string } | null
}

export default function ParentExclusionsPage() {
  const [rows, setRows] = useState<Exclusion[]>([])
  const [subjects, setSubjects] = useState<Record<string,string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      const { data, error: queryError } = await supabaseBrowser
        .from("course_exclusions")
        .select("id,student_id,subject_id,lesson_date,excluded_at,reason,scope,end_date,status,review_note,students(first_name,last_name)")
        .eq("status","approved")
        .order("excluded_at",{ascending:false})
      if (!active) return
      if (queryError) {
        setError("Impossible de charger les informations disciplinaires.")
        setRows([])
      } else {
        const items = (data ?? []) as unknown as Exclusion[]
        setRows(items)
        const ids = [...new Set(items.map((item) => item.subject_id))]
        if (ids.length) {
          const { data: subjectRows } = await supabaseBrowser.from("subjects").select("id,name").in("id",ids)
          if (active) setSubjects(Object.fromEntries((subjectRows ?? []).map((item) => [item.id,item.name])))
        }
      }
      setLoading(false)
    }
    void load()
    return () => { active = false }
  }, [])

  const scopeLabel = (row: Exclusion) => row.scope === "current_lesson" ? "Ce cours uniquement" : row.scope === "same_subject_until" ? `Cette matière jusqu'au ${row.end_date ? new Date(row.end_date + "T12:00:00").toLocaleDateString("fr-FR") : "—"}` : `Tous les cours jusqu'au ${row.end_date ? new Date(row.end_date + "T12:00:00").toLocaleDateString("fr-FR") : "—"}`

  return (
    <div className="space-y-5">
      <ParentPageHeader eyebrow="Vie scolaire" title="Exclusions de cours" description="Les informations disciplinaires validées et communiquées par l'établissement." />
      {error && <p role="alert" className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {!loading && !rows.length ? <ParentEmptyState title="Aucune exclusion publiée" description="Les exclusions validées par l'établissement apparaîtront ici." /> : (
        <div className="divide-y divide-slate-100 border-y border-slate-200 bg-white sm:rounded-xl sm:border">
          {loading && <p className="p-5 text-sm text-slate-500">Chargement des informations…</p>}
          {rows.map((row) => (
            <article key={row.id} className="p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-700"><AlertTriangle className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-slate-900">Exclusion de cours</h2>
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">Validée</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{row.students ? `${row.students.first_name} ${row.students.last_name}` : "Votre enfant"} · {subjects[row.subject_id] ?? "Cours"}</p>
                  <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-800">{row.reason}</p>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{new Date(row.lesson_date + "T12:00:00").toLocaleDateString("fr-FR")}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{new Date(row.excluded_at).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}</span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-slate-700">Durée : {scopeLabel(row)}</p>
                  {row.review_note && <p className="mt-2 text-xs text-slate-500">Précision de l'administration : {row.review_note}</p>}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
