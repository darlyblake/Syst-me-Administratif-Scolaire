"use client"

import { useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Download, GraduationCap, RefreshCw } from "lucide-react"
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
  const list = useMemo(() => grades.filter((g) => (childId === "tous" ? allowed.some((c) => c.id === g.student_id) : g.student_id === childId)), [grades, childId, allowed])
  const avg = list.length ? list.reduce((s,g)=>s+g.score,0)/list.length : null

  return <div className="space-y-6">
    <ParentPageHeader eyebrow="Scolarité" title="Résultats" description="Consultez les notes, moyennes et évaluations accessibles pour vos enfants." onRefresh={() => void refresh()} refreshing={loading} />
    {error && <ErrorBox message={error} onRetry={() => void refresh()} />}
    {!loading && allowed.length > 0 && <div className="flex flex-col gap-3 border-b border-terre/10 pb-4 sm:flex-row sm:items-center sm:justify-between"><ParentChildSelect children={allowed} value={childId} onChange={setChildId} /><div className="text-sm text-pierre">Moyenne affichée : <strong className="text-terre">{avg === null ? "—" : avg.toFixed(1)+"/20"}</strong></div></div>}
    {!loading && allowed.length === 0 ? <ParentEmptyState title="Résultats non disponibles" description="Votre compte n’a pas actuellement l’autorisation de consulter les résultats scolaires." /> :
      <div className="overflow-x-auto border border-terre/10 bg-papier"><table className="w-full min-w-[680px] text-sm"><thead className="border-b border-terre/10 bg-creme text-left text-xs uppercase tracking-wide text-pierre"><tr><th className="px-4 py-3">Élève</th><th className="px-4 py-3">Matière</th><th className="px-4 py-3">Évaluation</th><th className="px-4 py-3">Date</th><th className="px-4 py-3 text-right">Note</th></tr></thead><tbody className="divide-y divide-terre/10">{list.map((g)=><tr key={g.id} className="hover:bg-creme"><td className="px-4 py-3">{children.find(c=>c.id===g.student_id)?.first_name} {children.find(c=>c.id===g.student_id)?.last_name}</td><td className="px-4 py-3">{g.subject ?? "—"}</td><td className="px-4 py-3 font-medium text-terre">{g.title ?? "Évaluation"}</td><td className="px-4 py-3 text-pierre">{g.assessment_date ? new Date(g.assessment_date).toLocaleDateString("fr-FR") : "—"}</td><td className="px-4 py-3 text-right font-semibold">{g.score}{g.max_score ? `/${g.max_score}` : "/20"}</td></tr>)}</tbody></table>{list.length===0 && <p className="px-5 py-10 text-center text-sm text-pierre">Aucun résultat pour cette sélection.</p>}</div>}
    <section className="flex items-center gap-3 border-t border-terre/10 pt-4 text-sm text-pierre"><Download className="h-4 w-4" />Les bulletins officiels seront téléchargeables depuis la rubrique Documents lorsqu’ils sont publiés.</section>
  </div>
}

function ErrorBox({ message, onRetry }: { message:string; onRetry:()=>void }) { return <div className="flex items-center justify-between border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><span>{message}</span><Button size="sm" variant="outline" onClick={onRetry}>Réessayer</Button></div> }
