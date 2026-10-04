"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, BarChart3, BookOpen, CalendarCheck, ClipboardList, FileText, Loader2 } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { useAuthentification } from "@/providers/authentification.provider"
import { enseignantPortalService, type TeacherAssessment, type TeacherAssessmentStudent, type TeacherAttendanceHistoryRow, type TeacherHomework, type TeacherLessonEntry, type TeacherStudent } from "@/services/enseignant-portal.service"
import { TeacherShell } from "@/components/enseignant/teacher-shell"

type Tab = "overview" | "notes" | "presences" | "cahier"

export default function EleveEnseignantPage() {
  const { id, studentId } = useParams<{ id: string; studentId: string }>()
  const router = useRouter()
  const { utilisateur, contexte, estEnCoursDeChargement } = useAuthentification()
  const establishment = contexte?.establishments?.find((item) => item.id === id)
  const [student, setStudent] = useState<TeacherStudent | null>(null)
  const [assessments, setAssessments] = useState<TeacherAssessment[]>([])
  const [grades, setGrades] = useState<Record<string, TeacherAssessmentStudent>>({})
  const [attendance, setAttendance] = useState<TeacherAttendanceHistoryRow[]>([])
  const [lessons, setLessons] = useState<TeacherLessonEntry[]>([])
  const [homework, setHomework] = useState<TeacherHomework[]>([])
  const [tab, setTab] = useState<Tab>("overview")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!estEnCoursDeChargement && (!utilisateur || utilisateur.role !== "enseignant" || !establishment)) {
      router.replace("/enseignant")
      return
    }
    if (!estEnCoursDeChargement && establishment) {
      setLoading(true)
      Promise.all([
        enseignantPortalService.getStudents(id),
        enseignantPortalService.getAssessments(id),
        enseignantPortalService.getAttendanceHistory(id, 1, 200, undefined, studentId),
        enseignantPortalService.getLessonEntries(id),
        enseignantPortalService.getHomework(id),
      ]).then(async ([students, assessmentRows, attendanceRows, lessonRows, homeworkRows]) => {
        const found = students.find((item) => item.student_id === studentId)
        if (!found) throw new Error("Cet élève n'est pas accessible avec votre compte enseignant.")
        setStudent(found)
        setAssessments(assessmentRows.filter((item) => item.class_id === found.class_id))
        setAttendance(attendanceRows.data.filter((item) => item.student_id === studentId))
        setLessons(lessonRows.filter((item) => item.class_id === found.class_id))
        setHomework(homeworkRows.filter((item) => item.class_id === found.class_id))
        const pairs = await Promise.all(assessmentRows.filter((item) => item.class_id === found.class_id).map(async (assessment) => {
          const rows = await enseignantPortalService.getAssessmentStudents(assessment.assessment_id)
          return [assessment.assessment_id, rows.find((row) => row.student_id === studentId) ?? null] as const
        }))
        const next: Record<string, TeacherAssessmentStudent> = {}
        pairs.forEach(([assessmentId, row]) => { if (row) next[assessmentId] = row })
        setGrades(next)
      }).catch((e) => setError(e instanceof Error ? e.message : "Impossible de charger le dossier de l'élève."))
        .finally(() => setLoading(false))
    }
  }, [estEnCoursDeChargement, utilisateur, establishment, id, studentId, router])

  const gradeRows = useMemo(() => assessments.map((assessment) => ({ assessment, grade: grades[assessment.assessment_id] })).filter((row) => row.grade), [assessments, grades])
  const average = useMemo(() => {
    if (!gradeRows.length) return null
    const total = gradeRows.reduce((sum, row) => sum + Number(row.grade?.score ?? 0), 0)
    const max = gradeRows.reduce((sum, row) => sum + row.assessment.max_score, 0)
    return max ? Math.round((total / max) * 1000) / 10 : null
  }, [gradeRows])
  const attendanceCounts = useMemo(() => ({
    present: attendance.filter((r) => r.status === "present").length,
    absent: attendance.filter((r) => r.status === "absent").length,
    late: attendance.filter((r) => r.status === "late").length,
    excused: attendance.filter((r) => r.status === "excused").length,
  }), [attendance])

  if (estEnCoursDeChargement || !utilisateur || !establishment || loading) return <main className="min-h-screen flex items-center justify-center bg-[#f8f8fc]"><Loader2 className="h-5 w-5 animate-spin" /></main>

  if (!student) return <TeacherShell establishmentId={id} establishmentName={establishment.name} active="today"><div className="border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error || "Élève introuvable."}</div></TeacherShell>

  const tabs: Array<{ key: Tab; label: string; icon: typeof FileText }> = [
    { key: "overview", label: "Vue d'ensemble", icon: FileText },
    { key: "notes", label: "Notes", icon: BarChart3 },
    { key: "presences", label: "Présences", icon: CalendarCheck },
    { key: "cahier", label: "Cahier / Devoirs", icon: BookOpen },
  ]

  return <TeacherShell establishmentId={id} establishmentName={establishment.name} active="today">
    <header className="border-b border-[#e4e6ef] pb-4">
      <button type="button" onClick={() => router.push("/enseignant/etablissement/" + id + "/classes")} className="mb-3 inline-flex items-center gap-2 text-sm text-[#6d7280] hover:text-[#172033]"><ArrowLeft className="h-4 w-4" /> Retour à mes classes</button>
      <p className="text-xs font-semibold uppercase tracking-wide text-[#3152c8]">Dossier pédagogique</p>
      <h1 className="mt-1 text-2xl font-bold">{student.last_name} {student.first_name}</h1>
      <p className="mt-1 text-sm text-[#6d7280]">{student.class_name} · Matricule {student.student_number || "non renseigné"} · {establishment.name}</p>
    </header>

    {error && <div className="mt-4 border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

    <nav className="mt-5 flex overflow-x-auto border-b border-[#dfe2e9]">
      {tabs.map(({ key, label, icon: Icon }) => <button key={key} type="button" onClick={() => setTab(key)} className={"inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold " + (tab === key ? "border-[#3152c8] text-[#2441a5]" : "border-transparent text-[#6d7280] hover:text-[#172033]")}><Icon className="h-4 w-4" />{label}</button>)}
    </nav>

    {tab === "overview" && <section className="mt-5 space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Évaluations notées" value={gradeRows.length} />
        <Metric label="Moyenne" value={average == null ? "—" : average + "%"} />
        <Metric label="Présences" value={attendanceCounts.present} />
        <Metric label="Absences" value={attendanceCounts.absent} />
      </div>
      <section className="border border-[#e1e3eb] bg-white">
        <div className="border-b bg-[#f7f8fa] px-4 py-3 text-sm font-semibold text-[#555e73]">Dernières notes</div>
        <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-sm"><thead className="border-b text-left text-[#6d7280]"><tr><th className="px-4 py-3">Évaluation</th><th className="px-4 py-3">Matière</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Note</th></tr></thead><tbody className="divide-y">{gradeRows.slice(0, 5).map(({ assessment, grade }) => <tr key={assessment.assessment_id}><td className="px-4 py-3 font-medium">{assessment.title}</td><td className="px-4 py-3">{assessment.subject_name}</td><td className="px-4 py-3 text-[#6d7280]">{assessment.assessment_date}</td><td className="px-4 py-3 font-semibold">{grade?.score} / {assessment.max_score}</td></tr>)}</tbody></table></div>
        {!gradeRows.length && <p className="p-8 text-center text-sm text-[#6d7280]">Aucune note enregistrée pour cet élève.</p>}
      </section>
    </section>}

    {tab === "notes" && <section className="mt-5 border border-[#e1e3eb] bg-white"><div className="border-b bg-[#f7f8fa] px-4 py-3 text-sm font-semibold text-[#555e73]">Résultats de l'élève</div><div className="overflow-x-auto"><table className="w-full min-w-[800px] text-sm"><thead className="border-b text-left text-[#6d7280]"><tr><th className="px-4 py-3">Évaluation</th><th className="px-4 py-3">Matière</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Note</th><th className="px-4 py-3">Commentaire</th></tr></thead><tbody className="divide-y">{gradeRows.map(({ assessment, grade }) => <tr key={assessment.assessment_id}><td className="px-4 py-3 font-medium">{assessment.title}</td><td className="px-4 py-3">{assessment.subject_name}</td><td className="px-4 py-3">{assessment.assessment_date}</td><td className="px-4 py-3 font-semibold">{grade?.score} / {assessment.max_score}</td><td className="px-4 py-3 text-[#6d7280]">{grade?.comment || "—"}</td></tr>)}</tbody></table></div>{!gradeRows.length && <p className="p-8 text-center text-sm text-[#6d7280]">Aucune note enregistrée.</p>}</section>}

    {tab === "presences" && <section className="mt-5 border border-[#e1e3eb] bg-white"><div className="border-b bg-[#f7f8fa] px-4 py-3 text-sm font-semibold text-[#555e73]">Historique des présences</div><div className="overflow-x-auto"><table className="w-full min-w-[750px] text-sm"><thead className="border-b text-left text-[#6d7280]"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Cours</th><th className="px-4 py-3">Statut</th><th className="px-4 py-3">Motif</th></tr></thead><tbody className="divide-y">{attendance.map((row) => <tr key={row.id}><td className="px-4 py-3">{row.attendance_date}</td><td className="px-4 py-3">{row.first_name} {row.last_name}</td><td className="px-4 py-3 font-medium">{statusLabel(row.status)}</td><td className="px-4 py-3 text-[#6d7280]">{row.reason || "—"}</td></tr>)}</tbody></table></div>{!attendance.length && <p className="p-8 text-center text-sm text-[#6d7280]">Aucun enregistrement de présence trouvé.</p>}</section>}

    {tab === "cahier" && <section className="mt-5 space-y-5">
      <div className="border border-[#e1e3eb] bg-white"><div className="border-b bg-[#f7f8fa] px-4 py-3 text-sm font-semibold text-[#555e73]">Séances de cours</div><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-sm"><thead className="border-b text-left text-[#6d7280]"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Matière</th><th className="px-4 py-3">Thème</th><th className="px-4 py-3">Contenu</th></tr></thead><tbody className="divide-y">{lessons.slice(0, 50).map((lesson) => <tr key={lesson.id}><td className="px-4 py-3">{lesson.lesson_date}</td><td className="px-4 py-3">{lesson.subject_name}</td><td className="px-4 py-3 font-medium">{lesson.topic}</td><td className="px-4 py-3 text-[#6d7280]">{lesson.content}</td></tr>)}</tbody></table></div>{!lessons.length && <p className="p-8 text-center text-sm text-[#6d7280]">Aucune séance enregistrée.</p>}</div>
      <div className="border border-[#e1e3eb] bg-white"><div className="border-b bg-[#f7f8fa] px-4 py-3 text-sm font-semibold text-[#555e73]">Devoirs</div><div className="overflow-x-auto"><table className="w-full min-w-[800px] text-sm"><thead className="border-b text-left text-[#6d7280]"><tr><th className="px-4 py-3">Devoir</th><th className="px-4 py-3">Matière</th><th className="px-4 py-3">Cours</th><th className="px-4 py-3">À rendre</th></tr></thead><tbody className="divide-y">{homework.map((item) => <tr key={item.id}><td className="px-4 py-3 font-medium">{item.title}</td><td className="px-4 py-3">{item.subject_name}</td><td className="px-4 py-3">{item.lesson_date}</td><td className="px-4 py-3">{item.due_date || "—"}</td></tr>)}</tbody></table></div>{!homework.length && <p className="p-8 text-center text-sm text-[#6d7280]">Aucun devoir pour cette classe.</p>}</div>
    </section>}
  </TeacherShell>
}

function Metric({ label, value }: { label: string; value: number | string }) { return <div className="border border-[#e1e3eb] bg-white p-4"><p className="text-sm text-[#6d7280]">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div> }
function statusLabel(status: string) { return ({ present: "Présent", absent: "Absent", late: "En retard", excused: "Excusé" } as Record<string, string>)[status] || status }
