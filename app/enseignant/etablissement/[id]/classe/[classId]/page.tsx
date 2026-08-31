"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, BarChart3, BookOpen, CalendarCheck, ClipboardList, Loader2, Users } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuthentification } from "@/providers/authentification.provider"
import { enseignantPortalService, type TeacherClassOverview, type TeacherStudent } from "@/services/enseignant-portal.service"

export default function ClasseEnseignantPage() {
  const { id, classId } = useParams<{ id: string; classId: string }>()
  const router = useRouter()
  const { utilisateur, contexte, estEnCoursDeChargement } = useAuthentification()
  const [overview, setOverview] = useState<TeacherClassOverview | null>(null)
  const [students, setStudents] = useState<TeacherStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const establishment = contexte?.establishments?.find((item) => item.id === id)

  useEffect(() => {
    if (!estEnCoursDeChargement && (!utilisateur || utilisateur.role !== "enseignant" || !establishment)) {
      router.replace("/enseignant")
      return
    }
    if (!estEnCoursDeChargement && establishment) {
      setLoading(true)
      Promise.all([enseignantPortalService.getClassOverview(id, classId), enseignantPortalService.getStudents(id)])
        .then(([stats, roster]) => { setOverview(stats[0] ?? null); setStudents(roster.filter((student) => student.class_id === classId)) })
        .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Impossible de charger la classe."))
        .finally(() => setLoading(false))
    }
  }, [classId, establishment, estEnCoursDeChargement, id, router, utilisateur])

  const attendanceTotal = useMemo(() => overview ? overview.attendance_present + overview.attendance_absent + overview.attendance_late + overview.attendance_excused : 0, [overview])

  if (estEnCoursDeChargement || !utilisateur || !establishment) return <main className="min-h-screen bg-creme flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></main>
  if (loading) return <main className="min-h-screen bg-creme flex items-center justify-center"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Chargement de la classe…</div></main>

  return <main className="min-h-screen bg-creme"><div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
    <header className="mb-6"><Button variant="ghost" size="sm" onClick={() => router.push(`/enseignant/etablissement/${id}`)}><ArrowLeft className="mr-2 h-4 w-4" />Retour à mon espace</Button><div className="mt-4"><p className="text-xs font-medium uppercase tracking-wide text-terre">Classe</p><h1 className="text-2xl font-semibold">{overview?.class_name ?? "Classe"}</h1><p className="mt-1 text-sm text-muted-foreground">{establishment.name} · suivi pédagogique</p></div></header>
    {error && <div className="mb-5 rounded-lg border p-4 text-sm text-rouge-terre">{error}</div>}
    {!overview ? <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Cette classe n'est pas accessible avec votre compte enseignant.</CardContent></Card> : <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Élèves" value={overview.student_count} icon={<Users className="h-4 w-4" />} /><Metric label="Évaluations" value={overview.assessment_count} icon={<ClipboardList className="h-4 w-4" />} /><Metric label="Notes saisies" value={overview.graded_count} icon={<BarChart3 className="h-4 w-4" />} /><Metric label="Moyenne" value={overview.average_percentage == null ? "—" : `${overview.average_percentage}%`} icon={<BookOpen className="h-4 w-4" />} /></div>
      <div className="mt-6 grid gap-5 lg:grid-cols-[1.4fr_1fr]"><Card><CardHeader><CardTitle className="text-base">Élèves de la classe</CardTitle></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="border-b bg-muted/30 text-left text-muted-foreground"><tr><th className="px-5 py-3">Élève</th><th className="px-5 py-3">Matricule</th></tr></thead><tbody className="divide-y">{students.map((student) => <tr key={student.student_id}><td className="px-5 py-3 font-medium">{student.last_name} {student.first_name}</td><td className="px-5 py-3 text-muted-foreground">{student.student_number ?? "—"}</td></tr>)}</tbody></table></div>{students.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">Aucun élève actif.</p>}</CardContent></Card>
      <Card><CardHeader><CardTitle className="text-base">Présences enregistrées</CardTitle></CardHeader><CardContent><div className="space-y-3 text-sm"><Attendance label="Présents" value={overview.attendance_present} /><Attendance label="Absents" value={overview.attendance_absent} /><Attendance label="En retard" value={overview.attendance_late} /><Attendance label="Excusés" value={overview.attendance_excused} /><p className="border-t pt-3 text-xs text-muted-foreground">Total des enregistrements : {attendanceTotal}</p></div></CardContent></Card></div>
      <div className="mt-5 flex flex-wrap gap-2"><Button onClick={() => router.push(`/enseignant/etablissement/${id}/notes`)}><ClipboardList className="mr-2 h-4 w-4" />Gérer les notes</Button><Button variant="outline" onClick={() => router.push(`/enseignant/etablissement/${id}/presences`)}><CalendarCheck className="mr-2 h-4 w-4" />Gérer les présences</Button></div>
    </>}
  </div></main>
}

function Metric({ label, value, icon }: { label: string; value: number | string; icon: React.ReactNode }) { return <div className="rounded-lg border bg-white p-4"><div className="flex items-center gap-2 text-muted-foreground">{icon}<span className="text-sm">{label}</span></div><p className="mt-2 text-2xl font-semibold">{value}</p></div> }
function Attendance({ label, value }: { label: string; value: number }) { return <div className="flex items-center justify-between"><span>{label}</span><span className="font-semibold">{value}</span></div> }
