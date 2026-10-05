"use client"

import { useMemo, useState } from "react"
import { Download, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useParentPortal } from "@/hooks/use-parent-portal"
import { ParentPageHeader } from "@/components/parent/ParentPageHeader"
import { ParentChildSelect } from "@/components/parent/ParentChildSelect"
import { ParentEmptyState } from "@/components/parent/ParentEmptyState"

export default function ParentNotes() {
  const params = useSearchParams()
  const { loading, error, refresh, children, grades } = useParentPortal()
  const [childId, setChildId] = useState(params.get("eleve") || "tous")
  const allowed = useMemo(() => children.filter((c) => c.can_view_academic), [children])
  const list = useMemo(() => grades.filter((g) => childId === "tous" ? allowed.some((c) => c.id === g.student_id) : g.student_id === childId), [grades, childId, allowed])
  const avg = list.length ? list.reduce((s, g) => s + g.score, 0) / list.length : null

  return <div className="space-y-7">
    <ParentPageHeader eyebrow="Scolarité" title="Résultats" description="Consultez les notes et évaluations de vos enfants." onRefresh={() => void refresh()} refreshing={loading} />
    {error && <div className="flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><span>{error}</span><Button size="sm" variant="outline" onClick={() => void refresh()}>Réessayer</Button></div>}
    {!loading && allowed.length > 0 && <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <ParentChildSelect children={allowed} value={childId} onChange={setChildId} />
      <div className="flex items-center gap-3 text-sm text-slate-500"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-600"><TrendingUp className="h-4 w-4" /></span><span>Moyenne affichée <strong className="ml-1 text-slate-900">{avg === null ? "—" : avg.toFixed(1) + "/20"}</strong></span></div>
    </div>}
    {!loading && allowed.length === 0 ? <ParentEmptyState title="Résultats non disponibles" description="Votre compte n’a pas actuellement l’autorisation de consulter les résultats scolaires." /> :
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Élève</th><th className="px-5 py-3">Matière</th><th className="px-5 py-3">Évaluation</th><th className="px-5 py-3">Date</th><th className="px-5 py-3 text-right">Note</th></tr></thead><tbody className="divide-y divide-slate-100">{list.map((g) => { const child = children.find(c => c.id === g.student_id); return <tr key={g.id} className="transition-colors hover:bg-slate-50"><td className="px-5 py-4 font-medium text-slate-900">{child?.first_name} {child?.last_name}</td><td className="px-5 py-4 text-slate-600">{g.subject ?? "—"}</td><td className="px-5 py-4 font-medium text-slate-800">{g.title ?? "Évaluation"}</td><td className="px-5 py-4 text-slate-500">{g.assessment_date ? new Date(g.assessment_date).toLocaleDateString("fr-FR") : "—"}</td><td className="px-5 py-4 text-right font-semibold text-slate-900">{g.score}{g.max_score ? `/${g.max_score}` : "/20"}</td></tr> })}</tbody></table></div>
        {list.length === 0 && <p className="px-5 py-12 text-center text-sm text-slate-500">Aucun résultat pour cette sélection.</p>}
      </div>}
    <div className="flex items-center gap-3 border-t border-slate-200 pt-4 text-sm text-slate-500"><Download className="h-4 w-4 shrink-0" />Les bulletins officiels seront disponibles dans Documents lorsqu’ils seront publiés.</div>
  </div>
}