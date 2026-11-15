"use client"

import { useMemo, useState } from "react"
import { Download, TrendingUp } from "lucide-react"
import { useParentPortal } from "@/hooks/use-parent-portal"
import { ParentPageHeader } from "@/components/parent/ParentPageHeader"
import { ParentChildSelect } from "@/components/parent/ParentChildSelect"
import { ParentEmptyState } from "@/components/parent/ParentEmptyState"

export default function ParentNotes() {
  const { loading, error, children, grades } = useParentPortal()
  const [childId, setChildId] = useState("tous")
  const allowed = useMemo(() => children.filter((c) => c.can_view_academic), [children])
  const list = useMemo(() => grades.filter((g) => childId === "tous" ? allowed.some((c) => c.id === g.student_id) : g.student_id === childId), [grades, childId, allowed])
  const normalizedScores = list
    .map((grade) => {
      const maxScore = Number(grade.max_score) > 0 ? Number(grade.max_score) : 20
      const score = Number(grade.score)
      return Number.isFinite(score) ? (score / maxScore) * 20 : null
    })
    .filter((score): score is number => score !== null)
  const avg = normalizedScores.length
    ? normalizedScores.reduce((sum, score) => sum + score, 0) / normalizedScores.length
    : null

  return <div className="space-y-7">
    <ParentPageHeader eyebrow="Scolarité" title="Résultats" description="Consultez les notes et évaluations de vos enfants." />
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    {!loading && allowed.length > 0 && <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
      <ParentChildSelect children={allowed} value={childId} onChange={setChildId} />
      <div className="flex items-center gap-3 text-sm text-slate-500"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-600"><TrendingUp className="h-4 w-4" /></span><span>Moyenne affichée <strong className="ml-1 text-slate-900">{avg === null ? "—" : avg.toFixed(1) + "/20"}</strong></span></div>
    </div>}
    {!loading && allowed.length === 0 ? <ParentEmptyState title="Résultats non disponibles" description="Votre compte n’a pas actuellement l’autorisation de consulter les résultats scolaires." /> :
      <div className="overflow-hidden border border-slate-200 bg-white">
        <div className="hidden overflow-x-auto sm:block"><table className="w-full min-w-[680px] text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Élève</th><th className="px-5 py-3">Matière</th><th className="px-5 py-3">Évaluation</th><th className="px-5 py-3">Date</th><th className="px-5 py-3 text-right">Note</th></tr></thead><tbody className="divide-y divide-slate-100">{list.map((g) => { const child = children.find(c => c.id === g.student_id); return <tr key={g.id} className="transition-colors hover:bg-slate-50"><td className="px-5 py-4 font-medium text-slate-900">{child?.first_name} {child?.last_name}</td><td className="px-5 py-4 text-slate-600">{g.subject ?? "—"}</td><td className="px-5 py-4 font-medium text-slate-800">{g.title ?? "Évaluation"}</td><td className="px-5 py-4 text-slate-500">{g.assessment_date ? new Date(g.assessment_date).toLocaleDateString("fr-FR") : "—"}</td><td className="px-5 py-4 text-right font-semibold text-slate-900">{g.score}{g.max_score ? `/${g.max_score}` : "/20"}</td></tr> })}</tbody></table></div>
        <div className="divide-y divide-slate-100 sm:hidden">{list.map((g) => { const child = children.find(c => c.id === g.student_id); return <article key={g.id} className="space-y-2.5 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{g.subject ?? "Matière non précisée"}</p><p className="mt-0.5 text-xs text-slate-500">{child?.first_name} {child?.last_name}</p></div><span className="shrink-0 rounded-md bg-blue-50 px-2.5 py-1.5 text-sm font-bold text-blue-800">{g.score}{g.max_score ? `/${g.max_score}` : "/20"}</span></div><div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><span>{g.title ?? "Évaluation"}</span><span>{g.assessment_date ? new Date(g.assessment_date).toLocaleDateString("fr-FR") : "Date non précisée"}</span></div></article> })}</div>
        {list.length === 0 && <p className="px-4 py-10 text-center text-sm text-slate-500">Aucun résultat pour cette sélection.</p>}
      </div>}
    <div className="flex items-center gap-3 border-t border-slate-200 pt-4 text-sm text-slate-500"><Download className="h-4 w-4 shrink-0" />Les bulletins officiels seront disponibles dans Documents lorsqu’ils seront publiés.</div>
  </div>
}