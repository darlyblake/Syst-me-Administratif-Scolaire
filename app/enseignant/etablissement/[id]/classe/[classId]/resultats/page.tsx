"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, ClipboardList, Loader2, Search, Users } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useAuthentification } from "@/providers/authentification.provider"
import { enseignantPortalService, type TeacherAssessment, type TeacherAssessmentStudent } from "@/services/enseignant-portal.service"

export default function ResultatsClasseEnseignantPage() {
  const { id, classId } = useParams<{ id: string; classId: string }>()
  const router = useRouter()
  const { utilisateur, contexte, estEnCoursDeChargement } = useAuthentification()
  const [assessments, setAssessments] = useState<TeacherAssessment[]>([])
  const [students, setStudents] = useState<TeacherAssessmentStudent[]>([])
  const [selected, setSelected] = useState<TeacherAssessment | null>(null)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const establishment = contexte?.establishments?.find((item) => item.id === id)

  useEffect(() => {
    if (!estEnCoursDeChargement && (!utilisateur || utilisateur.role !== "enseignant" || !establishment)) {
      router.replace("/enseignant")
      return
    }
    if (!establishment) return
    setLoading(true)
    Promise.all([enseignantPortalService.getAssessments(id), enseignantPortalService.getStudents(id)])
      .then(([rows, roster]) => {
        setAssessments(rows.filter((row) => row.class_id === classId))
        setStudents(roster.filter((row) => row.class_id === classId).map((row) => ({ ...row, score: null, comment: null })))
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Impossible de charger les résultats."))
      .finally(() => setLoading(false))
  }, [classId, establishment, estEnCoursDeChargement, id, router, utilisateur])

  const openAssessment = async (assessment: TeacherAssessment) => {
    setSelected(assessment); setError(null); setSearch("")
    try { setStudents(await enseignantPortalService.getAssessmentStudents(assessment.assessment_id)) }
    catch (e) { setError(e instanceof Error ? e.message : "Impossible de charger les notes.") }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return students
    return students.filter((s) => `${s.last_name} ${s.first_name} ${s.student_number ?? ""}`.toLowerCase().includes(q))
  }, [search, students])
  const graded = students.filter((s) => s.score != null)
  const average = graded.length ? graded.reduce((sum, s) => sum + Number(s.score), 0) / graded.length : null

  if (estEnCoursDeChargement || !utilisateur || !establishment) return <main className="min-h-screen bg-creme flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></main>

  return <main className="min-h-screen bg-creme"><div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
    <header className="mb-6"><Button variant="ghost" size="sm" onClick={() => router.push(`/enseignant/etablissement/${id}`)}><ArrowLeft className="mr-2 h-4 w-4" />Retour à mon espace</Button><div className="mt-4"><p className="text-xs font-medium uppercase tracking-wide text-terre">Résultats pédagogiques</p><h1 className="text-2xl font-semibold">Résultats de la classe</h1><p className="mt-1 text-sm text-muted-foreground">{establishment.name} · consultation des évaluations</p></div></header>
    {error && <div role="alert" className="mb-5 rounded-lg border bg-white p-3 text-sm text-rouge-terre">{error}</div>}
    {loading ? <div className="flex justify-center p-12"><Loader2 className="h-5 w-5 animate-spin" /></div> : !selected ? <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
      <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><ClipboardList className="h-4 w-4" />Évaluations</CardTitle></CardHeader><CardContent>{assessments.length === 0 ? <p className="p-5 text-center text-sm text-muted-foreground">Aucune évaluation pour cette classe.</p> : <div className="grid gap-2">{assessments.map((a) => <button key={a.assessment_id} type="button" onClick={() => void openAssessment(a)} className="rounded-lg border p-4 text-left transition hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2"><p className="font-medium">{a.title}</p><p className="mt-1 text-sm text-muted-foreground">{a.subject_name} · {a.assessment_date}</p><p className="mt-2 text-xs text-muted-foreground">{a.grade_count} note(s) saisie(s) · sur {a.max_score}</p></button>)}</div>}</CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4" />Classe</CardTitle></CardHeader><CardContent><p className="text-3xl font-semibold">{students.length}</p><p className="text-sm text-muted-foreground">élève(s) suivi(s)</p><div className="mt-5 rounded-lg bg-muted/30 p-4 text-sm">Sélectionnez une évaluation pour consulter les notes et la moyenne.</div></CardContent></Card>
    </div> : <div><div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-xl font-semibold">{selected.title}</h2><p className="mt-1 text-sm text-muted-foreground">{selected.subject_name} · note sur {selected.max_score} · moyenne {average == null ? "—" : average.toFixed(2)}</p></div><Button variant="outline" onClick={() => setSelected(null)}>Toutes les évaluations</Button></div><div className="mb-4 relative max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un élève…" /></div><Card><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm"><thead className="border-b bg-muted/30 text-left text-muted-foreground"><tr><th className="px-5 py-3">Élève</th><th className="px-5 py-3">Matricule</th><th className="px-5 py-3 text-right">Note</th></tr></thead><tbody className="divide-y">{filtered.map((s) => <tr key={s.student_id}><td className="px-5 py-3 font-medium">{s.last_name} {s.first_name}</td><td className="px-5 py-3 text-muted-foreground">{s.student_number ?? "—"}</td><td className="px-5 py-3 text-right font-semibold">{s.score == null ? "—" : `${s.score} / ${selected.max_score}`}</td></tr>)}</tbody></table></div>{filtered.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">Aucun élève trouvé.</p>}</CardContent></Card></div>}
  </div></main>
}
