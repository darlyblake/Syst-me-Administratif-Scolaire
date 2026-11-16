"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, Check, CheckCircle2, History, Loader2, Save, Search } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuthentification } from "@/providers/authentification.provider"
import { TeacherShell } from "@/components/enseignant/teacher-shell"
import { enseignantPortalService, type TeacherAttendanceStudent, type TeacherClass, type TeacherScheduleSlot } from "@/services/enseignant-portal.service"

const statuses = [
  { value: "present", label: "Présent" },
  { value: "absent", label: "Absent" },
  { value: "late", label: "En retard" },
] as const

const localDate = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}

const secondsOfDay = (value: string) => {
  const [hours, minutes, seconds = 0] = value.slice(0, 8).split(":").map(Number)
  return hours * 3600 + minutes * 60 + seconds
}

const TEACHER_ATTENDANCE_GRACE_SECONDS = 15 * 60
const dayOfWeek = (date: Date) => {
  const day = date.getDay()
  return day === 0 ? 7 : day
}

export default function PresencesEnseignantPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { utilisateur, contexte, estEnCoursDeChargement } = useAuthentification()

  const [classes, setClasses] = useState<TeacherClass[]>([])
  const [schedule, setSchedule] = useState<TeacherScheduleSlot[]>([])
  const [classId, setClassId] = useState("")
  const [students, setStudents] = useState<TeacherAttendanceStudent[]>([])
  const [statusesByStudent, setStatusesByStudent] = useState<Record<string, string>>({})
  const [reasons] = useState<Record<string, string>>({})
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [savedCount, setSavedCount] = useState<number | null>(null)
  const [clockNow, setClockNow] = useState(() => new Date())

  const establishment = contexte?.establishments?.find((item) => item.id === id)

  useEffect(() => {
    if (!estEnCoursDeChargement && (!utilisateur || utilisateur.role !== "enseignant" || !establishment)) {
      router.replace("/enseignant")
    }
  }, [estEnCoursDeChargement, utilisateur, establishment, router])

  useEffect(() => {
    const timer = window.setInterval(() => setClockNow(new Date()), 10_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!id || !establishment) return
    Promise.all([
      enseignantPortalService.getClasses(id),
      enseignantPortalService.getSchedule(id),
    ]).then(([classRows, scheduleRows]) => {
      setClasses(classRows)
      setSchedule(scheduleRows)
    }).catch((e) => setError(e instanceof Error ? e.message : "Impossible de charger votre emploi du temps."))
  }, [id, establishment])

  const todayCourses = useMemo(() => {
    const today = dayOfWeek(clockNow)
    const nowSeconds = clockNow.getHours() * 3600 + clockNow.getMinutes() * 60 + clockNow.getSeconds()
    return schedule.filter((slot) =>
      slot.day_of_week === today &&
      nowSeconds >= secondsOfDay(slot.starts_at) &&
      nowSeconds <= secondsOfDay(slot.ends_at) + TEACHER_ATTENDANCE_GRACE_SECONDS
    )
  }, [schedule, clockNow])

  const currentCourses = useMemo(() => {
    const seen = new Set<string>()
    return todayCourses.filter((slot) => {
      if (seen.has(slot.class_id)) return false
      seen.add(slot.class_id)
      return true
    })
  }, [todayCourses])

  useEffect(() => {
    if (!currentCourses.length) {
      setClassId("")
      setStudents([])
      return
    }
    if (!currentCourses.some((slot) => slot.class_id === classId)) {
      setClassId(currentCourses[0].class_id)
    }
  }, [currentCourses, classId])

  const currentCourse = useMemo(
    () => todayCourses.find((slot) => slot.class_id === classId) ?? null,
    [todayCourses, classId],
  )
  const isAfterCourseEnd = currentCourse !== null &&
    clockNow.getHours() * 3600 + clockNow.getMinutes() * 60 + clockNow.getSeconds() > secondsOfDay(currentCourse.ends_at)
  const correctionDeadline = currentCourse ? secondsOfDay(currentCourse.ends_at) + TEACHER_ATTENDANCE_GRACE_SECONDS : 0
  const correctionDeadlineLabel = String(Math.floor((correctionDeadline % 86400) / 3600)).padStart(2, "0") + ":" + String(Math.floor((correctionDeadline % 3600) / 60)).padStart(2, "0")

  useEffect(() => {
    if (!classId || !currentCourse || !id) return
    setLoading(true)
    setError(null)
    setMessage(null)
    setSearch("")
    enseignantPortalService.getAttendance(id, classId, localDate())
      .then((rows) => {
        setStudents(rows)
        setStatusesByStudent(Object.fromEntries(rows.map((row) => [row.student_id, row.status ?? "present"])))
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Impossible de charger les élèves."))
      .finally(() => setLoading(false))
  }, [classId, currentCourse, id])

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return students
    return students.filter((student) =>
      `${student.last_name} ${student.first_name} ${student.student_number ?? ""}`.toLowerCase().includes(q),
    )
  }, [students, search])

  const counts = useMemo(() => students.reduce((acc, student) => {
    const status = statusesByStudent[student.student_id] ?? "present"
    acc[status] = (acc[status] ?? 0) + 1
    return acc
  }, {} as Record<string, number>), [students, statusesByStudent])

  const markAll = (status: string) => {
    setStatusesByStudent(Object.fromEntries(students.map((student) => [student.student_id, status])))
    setSavedCount(null)
    setMessage(status === "present" ? "Tous les élèves sont marqués présents." : "Le statut a été appliqué à tous les élèves.")
  }

  const saveAll = async () => {
    if (!currentCourse || !students.length) return
    setSaving(true)
    setError(null)
    setMessage(null)
    setSavedCount(null)
    try {
      const count = await enseignantPortalService.recordAttendanceBatch(
        id,
        classId,
        currentCourse.slot_id,
        localDate(),
        students.map((student) => ({
          student_id: student.student_id,
          status: statusesByStudent[student.student_id] ?? "present",
          reason: reasons[student.student_id],
        })),
      )
      setStudents((current) => current.map((student) => ({
        ...student,
        status: statusesByStudent[student.student_id] ?? "present",
      })))
      setSavedCount(count)
      setMessage(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible d'enregistrer l'appel.")
    } finally {
      setSaving(false)
    }
  }

  if (estEnCoursDeChargement || !utilisateur || !establishment) {
    return <main className="min-h-screen bg-creme flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></main>
  }

  return (
    <TeacherShell establishmentId={id} establishmentName={establishment.name} active="attendance">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push(`/enseignant/etablissement/${id}`)}>
              <ArrowLeft className="mr-2 h-4 w-4" />Retour à mon espace
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push(`/enseignant/etablissement/${id}/presences/historique`)}>
              <History className="mr-2 h-4 w-4" />Historique des appels
            </Button>
          </div>
          <div className="mt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-terre">Appel</p>
            <h1 className="text-2xl font-semibold">Présences des élèves</h1>
            <p className="mt-1 text-sm text-muted-foreground">{establishment.name} · appel modifiable pendant le cours et jusqu’à 15 minutes après sa fin.</p>
          </div>
        </header>

        {error && <div role="alert" className="mb-5 border border-rouge-terre/30 bg-white p-3 text-sm text-rouge-terre">{error}</div>}
        {savedCount !== null && (
          <div role="status" aria-live="polite" className="mb-5 flex items-center gap-3 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-6 w-6 attendance-success-icon" />
            </span>
            <span><strong className="block">Appel validé avec succès</strong>{savedCount} présence(s) enregistrée(s). Vous pouvez encore corriger cet appel jusqu’à 15 minutes après la fin du cours.</span>
          </div>
        )}
        {message && savedCount === null && <div role="status" className="mb-5 border bg-white p-3 text-sm">{message}</div>}

        {!currentCourses.length ? (
          <div className="border bg-white p-8 text-center">
            <p className="font-medium">Aucun cours en cours.</p>
            <p className="mt-1 text-sm text-muted-foreground">L’appel apparaît pendant le cours et reste modifiable pendant 15 minutes après sa fin.</p>
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-col gap-3 border bg-white p-4 md:flex-row md:items-end">
              <label className="text-sm font-medium md:min-w-64">
                Classe
                <select
                  aria-label="Classe"
                  className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={classId}
                  onChange={(event) => setClassId(event.target.value)}
                >
                  {currentCourses.map((course) => (
                    <option key={course.slot_id} value={course.class_id}>{course.class_name}</option>
                  ))}
                </select>
              </label>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input aria-label="Rechercher un élève" className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un élève…" />
              </div>
              <Button variant="outline" onClick={() => markAll("present")} disabled={!students.length || loading || saving}>
                <CheckCircle2 className="mr-2 h-4 w-4" />Tous présents
              </Button>
            </div>

            {currentCourse && (
              <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-1 border-b pb-3 text-sm">
                <span className="font-medium">{currentCourse.class_name}</span>
                <span>{currentCourse.subject_name}</span>
                <span>{currentCourse.starts_at.slice(0, 5)}–{currentCourse.ends_at.slice(0, 5)}</span>
                {isAfterCourseEnd && <span className="font-medium text-amber-700">Délai de correction · jusqu’à {correctionDeadlineLabel}</span>}
                <span className="text-muted-foreground">{students.length} élève(s) · {counts.present ?? 0} présents · {counts.absent ?? 0} absents · {counts.late ?? 0} retards</span>
              </div>
            )}

            {loading ? (
              <div className="flex justify-center border bg-white p-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : !students.length ? (
              <div className="border bg-white p-8 text-center text-sm text-muted-foreground">Aucun élève dans cette classe.</div>
            ) : (
              <div className="overflow-x-auto border bg-white">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="border-b bg-muted/30 text-left text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Élève</th>
                      <th className="px-4 py-3">Présence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredStudents.map((student) => {
                      const selected = statusesByStudent[student.student_id] ?? "present"
                      return (
                        <tr key={student.student_id}>
                          <td className="px-4 py-3 font-medium">
                            {student.last_name} {student.first_name}
                            {student.student_number && <span className="ml-2 text-xs font-normal text-muted-foreground">{student.student_number}</span>}
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex gap-2">
                              {statuses.map((status) => (
                                <Button
                                  key={status.value}
                                  type="button"
                                  size="sm"
                                  variant={selected === status.value ? "default" : "outline"}
                                  onClick={() => { setSavedCount(null); setMessage(null); setStatusesByStudent((current) => ({ ...current, [student.student_id]: status.value })) }}
                                >
                                  {selected === status.value && <Check className="mr-1 h-3.5 w-3.5" />}
                                  {status.label}
                                </Button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {!filteredStudents.length && <p className="p-8 text-center text-sm text-muted-foreground">Aucun élève trouvé.</p>}
              </div>
            )}

            <div className="mt-4 flex items-center justify-between border-t pt-4">
              <p className="text-sm text-muted-foreground">Les modifications sont enregistrées en une seule fois pour toute la classe.</p>
              <Button onClick={() => void saveAll()} disabled={saving || loading || !students.length}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {saving ? "Enregistrement…" : "Enregistrer l'appel"}
              </Button>
            </div>
          </>
        )}
      </div>
      <style jsx>{`
        @keyframes attendance-success-pop {
          0% { transform: scale(.55); opacity: .25; }
          70% { transform: scale(1.18); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .attendance-success-icon { animation: attendance-success-pop 520ms cubic-bezier(.2,.8,.2,1) both; }
        @media (prefers-reduced-motion: reduce) { .attendance-success-icon { animation: none; } }
      `}</style>
    </TeacherShell>
  )
}
