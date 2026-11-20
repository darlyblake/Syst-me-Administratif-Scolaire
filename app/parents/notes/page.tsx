"use client"

import { useMemo, useState } from "react"
import { Download, TrendingUp } from "lucide-react"
import { useParentPortal } from "@/hooks/use-parent-portal"
import { ParentPageHeader } from "@/components/parent/ParentPageHeader"
import { ParentChildSelect } from "@/components/parent/ParentChildSelect"
import { ParentEmptyState } from "@/components/parent/ParentEmptyState"
import { PresenceScene } from "@/components/parent/PresenceScene"

type GradeFilter = "tous" | "moyenne" | "sous-moyenne"

const scoreOnTwenty = (grade: { score: number | string; max_score?: number | string | null }) => {
  const score = Number(grade.score)
  const maxScore = Number(grade.max_score) > 0 ? Number(grade.max_score) : 20
  return Number.isFinite(score) ? (score / maxScore) * 20 : null
}

export default function ParentNotes() {
  const { loading, error, children, grades } = useParentPortal()
  const [childId, setChildId] = useState("tous")
  const [gradeFilter, setGradeFilter] = useState<GradeFilter>("tous")
  const allowed = useMemo(() => children.filter((child) => child.can_view_academic), [children])

  const childAverages = useMemo(() => allowed.map((child) => {
    const scores = grades
      .filter((grade) => grade.student_id === child.id)
      .map(scoreOnTwenty)
      .filter((score): score is number => score !== null)
    return {
      child,
      average: scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null,
      count: scores.length,
    }
  }), [allowed, grades])

  const visibleAverages = childAverages.filter(({ child }) => childId === "tous" || child.id === childId)
  const selectedGrades = grades.filter((grade) =>
    childId === "tous"
      ? allowed.some((child) => child.id === grade.student_id)
      : grade.student_id === childId,
  )
  const list = selectedGrades.filter((grade) => {
    if (gradeFilter === "tous") return true
    const score = scoreOnTwenty(grade)
    if (score === null) return false
    return gradeFilter === "moyenne" ? score >= 10 : score < 10
  })

  const averageScores = selectedGrades.map(scoreOnTwenty).filter((score): score is number => score !== null)
  const avg = averageScores.length
    ? averageScores.reduce((sum, score) => sum + score, 0) / averageScores.length
    : null

  return <div className="space-y-7">
    <ParentPageHeader eyebrow="Scolarité" title="Résultats" description="Consultez les notes et évaluations de vos enfants." />
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

    {!loading && allowed.length > 0 && <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div>
          <ParentChildSelect children={allowed} value={childId} onChange={setChildId} />
        </div>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Filtrer les notes
          <select
            value={gradeFilter}
            onChange={(event) => setGradeFilter(event.target.value as GradeFilter)}
            className="h-10 min-w-[180px] rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="tous">Toutes les notes</option>
            <option value="moyenne">Moyenne (10/20 et plus)</option>
            <option value="sous-moyenne">Sous la moyenne (moins de 10)</option>
          </select>
        </label>
      </div>
      <div className="flex items-center gap-3 text-sm text-slate-500">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-600"><TrendingUp className="h-4 w-4" /></span>
        <span>Moyenne générale affichée <strong className="ml-1 text-slate-900">{avg === null ? "—" : avg.toFixed(1) + "/20"}</strong></span>
      </div>
    </div>}

    {!loading && visibleAverages.some(({ count }) => count > 0) && (
      <section aria-live="polite" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-800">{childId === "tous" ? "Situation de chaque enfant" : "Situation de l’élève"}</h2>
          <span className="text-xs text-slate-500">Seuil de moyenne : 10/20</span>
        </div>
        <div className={childId === "tous" ? "grid gap-3 sm:grid-cols-2" : "grid gap-3"}>
          {visibleAverages.filter(({ count }) => count > 0).map(({ child, average, count }) => {
            const hasAverage = average !== null && average >= 10
            return <article key={child.id} className={`flex flex-col items-center gap-2 rounded-[22px] border px-4 py-4 text-center sm:flex-row sm:gap-4 sm:text-left ${hasAverage ? "border-emerald-100 bg-[#f4fbf7]" : "border-amber-200 bg-[#fffaf3]"}`}>
              <div className="w-full shrink-0 sm:w-[140px]">
                <PresenceScene kind={hasAverage ? "results-ok" : "results-attention"} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900">{child.first_name} {child.last_name}</p>
                <p className={`mt-1 text-sm font-semibold ${hasAverage ? "text-emerald-800" : "text-amber-900"}`}>
                  {hasAverage ? "Bravo, la moyenne est obtenue !" : "La moyenne n’est pas encore atteinte"}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  {average === null ? "Aucune note exploitable pour le moment." : `Moyenne actuelle : ${average.toFixed(1)}/20 · ${count} note${count > 1 ? "s" : ""} prise${count > 1 ? "s" : ""} en compte.`}
                </p>
              </div>
            </article>
          })}
        </div>
      </section>
    )}

    {!loading && allowed.length === 0 ? <ParentEmptyState title="Résultats non disponibles" description="Votre compte n’a pas actuellement l’autorisation de consulter les résultats scolaires." /> :
      <div className="overflow-hidden border border-slate-200 bg-white">
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr><th className="px-5 py-3">Élève</th><th className="px-5 py-3">Matière</th><th className="px-5 py-3">Évaluation</th><th className="px-5 py-3">Date</th><th className="px-5 py-3 text-right">Note</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.map((grade) => {
                const child = children.find((item) => item.id === grade.student_id)
                return <tr key={grade.id} className="transition-colors hover:bg-slate-50">
                  <td className="px-5 py-4 font-medium text-slate-900">{child?.first_name} {child?.last_name}</td>
                  <td className="px-5 py-4 text-slate-600">{grade.subject ?? "—"}</td>
                  <td className="px-5 py-4 font-medium text-slate-800">{grade.title ?? "Évaluation"}</td>
                  <td className="px-5 py-4 text-slate-500">{grade.assessment_date ? new Date(grade.assessment_date).toLocaleDateString("fr-FR") : "—"}</td>
                  <td className="px-5 py-4 text-right font-semibold text-slate-900">{grade.score}{grade.max_score ? `/${grade.max_score}` : "/20"}</td>
                </tr>
              })}
            </tbody>
          </table>
        </div>
        <div className="divide-y divide-slate-100 sm:hidden">
          {list.map((grade) => {
            const child = children.find((item) => item.id === grade.student_id)
            return <article key={grade.id} className="space-y-2.5 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{grade.subject ?? "Matière non précisée"}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{child?.first_name} {child?.last_name}</p>
                </div>
                <span className="shrink-0 rounded-md bg-blue-50 px-2.5 py-1.5 text-sm font-bold text-blue-800">{grade.score}{grade.max_score ? `/${grade.max_score}` : "/20"}</span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span>{grade.title ?? "Évaluation"}</span>
                <span>{grade.assessment_date ? new Date(grade.assessment_date).toLocaleDateString("fr-FR") : "Date non précisée"}</span>
              </div>
            </article>
          })}
        </div>
        {list.length === 0 && <p className="px-4 py-10 text-center text-sm text-slate-500">Aucun résultat pour ce filtre.</p>}
      </div>}
    <div className="flex items-center gap-3 border-t border-slate-200 pt-4 text-sm text-slate-500"><Download className="h-4 w-4 shrink-0" />Les bulletins officiels seront disponibles dans Documents lorsqu’ils seront publiés.</div>
  </div>
}
