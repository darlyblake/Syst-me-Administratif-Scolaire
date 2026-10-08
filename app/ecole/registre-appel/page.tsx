"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Check, Clock, Save, UserCheck, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useUserContext } from "@/hooks/useUserContext"
import { useAcademicStructure } from "@/hooks/useAcademicStructure"
import { useAcademicYears } from "@/hooks/useAcademicYears"
import { listStudentsPaginated } from "@/lib/supabase/services/student.service"
import {
  listAttendanceForLesson,
  listAttendanceForLessons,
  listAttendanceSubjects,
  listTeacherClassSubjects,
  recordLessonAttendance,
  type AttendanceSubject,
  type TeacherClassSubject,
} from "@/lib/supabase/services/absence.service"
import { serviceEmploiDuTempsClasses, type CreneauEmploiDuTemps } from "@/services/emploi-du-temps-classes.service"

type AttendanceStatus = "present" | "absent" | "late" | "justified"

type CallStudent = {
  id: string
  first_name: string
  last_name: string
  student_number?: string | null
}

type AttendanceEntry = {
  status: AttendanceStatus
  reason: string
}

type LessonCallState = {
  recordCount: number
  status: "a_venir" | "en_cours" | "fait" | "non_fait"
}

const statusLabels: Record<AttendanceStatus, string> = {
  present: "Présent",
  absent: "Absent",
  late: "Retard",
  justified: "Justifié",
}

const statusClasses: Record<AttendanceStatus, string> = {
  present: "bg-green-50 text-green-700 border-green-200",
  absent: "bg-red-50 text-red-700 border-red-200",
  late: "bg-amber-50 text-amber-700 border-amber-200",
  justified: "bg-blue-50 text-blue-700 border-blue-200",
}

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return year + "-" + month + "-" + day
}

const getDayName = (date: string): CreneauEmploiDuTemps["jour"] | null => {
  const day = new Date(date + "T12:00:00").getDay()
  const names: Array<CreneauEmploiDuTemps["jour"] | null> = [
    null,
    "lundi",
    "mardi",
    "mercredi",
    "jeudi",
    "vendredi",
    "samedi",
  ]
  return names[day] ?? null
}

const toSeconds = (value: string) => {
  const [hours, minutes, seconds = 0] = value.slice(0, 8).split(":").map(Number)
  return hours * 3600 + minutes * 60 + seconds
}

const getCurrentSeconds = (date: Date) =>
  date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds()

const TEACHER_CALL_GRACE_MINUTES = 15
const TEACHER_CALL_GRACE_SECONDS = TEACHER_CALL_GRACE_MINUTES * 60

export default function RegistreAppelPage() {
  const { primaryEstablishment, utilisateur } = useUserContext()
  const establishmentId = primaryEstablishment?.id ?? null
  const establishmentRole = primaryEstablishment?.role ?? null
  const { data: academicStructure } = useAcademicStructure(establishmentId)
  const { data: academicYears, selectedYear, activeYear, selectYear, isLoading: isYearLoading } = useAcademicYears(establishmentId)

  const academicYear = selectedYear ?? activeYear
  const establishmentPermissions = primaryEstablishment?.permissions ?? []
  const canManageAll =
    utilisateur?.role !== "enseignant" &&
    (["owner", "admin", "director", "supervisor"].includes(establishmentRole ?? "") ||
      establishmentPermissions.includes("attendance") ||
      establishmentPermissions.includes("attendance.manage"))
  const isTeacher = utilisateur?.role === "enseignant"

  const [selectedClassId, setSelectedClassId] = useState("")
  const [date, setDate] = useState(() => getLocalDateString())
  const [lessons, setLessons] = useState<CreneauEmploiDuTemps[]>([])
  const [selectedLessonKey, setSelectedLessonKey] = useState("")
  const [teacherAssignments, setTeacherAssignments] = useState<TeacherClassSubject[]>([])
  const [subjects, setSubjects] = useState<AttendanceSubject[]>([])
  const [students, setStudents] = useState<CallStudent[]>([])
  const [attendance, setAttendance] = useState<Record<string, AttendanceEntry>>({})
  const [lessonStates, setLessonStates] = useState<Record<string, LessonCallState>>({})
  const [search, setSearch] = useState("")
  const [currentTime, setCurrentTime] = useState(() => new Date())
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const classes = useMemo(
    () =>
      academicStructure.flatMap((cycle) =>
        (cycle.grade_levels ?? []).flatMap((level) =>
          (level.school_classes ?? []).map((schoolClass) => ({
            id: schoolClass.id,
            name: schoolClass.name,
          }))
        )
      ),
    [academicStructure]
  )

  const teacherClassIds = useMemo(
    () => new Set(teacherAssignments.map((item) => item.class_id)),
    [teacherAssignments]
  )

  const visibleClasses = useMemo(
    () => (isTeacher && !canManageAll ? classes.filter((item) => teacherClassIds.has(item.id)) : classes),
    [canManageAll, classes, isTeacher, teacherClassIds]
  )

  const selectedClass = visibleClasses.find((item) => item.id === selectedClassId)
  const selectedLesson = lessons.find((lesson) => lesson.id === selectedLessonKey)
  const selectedSubject = selectedLesson
    ? subjects.find((subject) => subject.id === selectedLesson.matiereId)
    : null

  const selectedLessonState = selectedLesson ? lessonStates[selectedLesson.id] : null

  const selectedLessonIsCurrent = useMemo(() => {
    if (!selectedLesson || date !== getLocalDateString(currentTime)) return false
    const nowSeconds = getCurrentSeconds(currentTime)
    return (
      nowSeconds >= toSeconds(selectedLesson.heureDebut) &&
      nowSeconds < toSeconds(selectedLesson.heureFin)
    )
  }, [currentTime, date, selectedLesson])

  const selectedLessonIsWithinTeacherWindow = useMemo(() => {
    if (!selectedLesson || date !== getLocalDateString(currentTime)) return false
    const nowSeconds = getCurrentSeconds(currentTime)
    const starts = toSeconds(selectedLesson.heureDebut)
    const ends = toSeconds(selectedLesson.heureFin)
    return nowSeconds >= starts && nowSeconds <= ends + TEACHER_CALL_GRACE_SECONDS
  }, [currentTime, date, selectedLesson])

  const canAdministrativeRecordSelectedLesson = useMemo(() => {
    if (!canManageAll || !selectedLesson) return false
    const today = getLocalDateString(currentTime)
    if (date < today) return true
    if (date > today) return false
    return getCurrentSeconds(currentTime) >= toSeconds(selectedLesson.heureDebut)
  }, [canManageAll, currentTime, date, selectedLesson])

  const canRecordSelectedLesson =
    canAdministrativeRecordSelectedLesson || (!canManageAll && selectedLessonIsWithinTeacherWindow)

  const loadLessonStates = useCallback(async (lessonList: CreneauEmploiDuTemps[]) => {
    if (!selectedClassId || !date || !lessonList.length) {
      setLessonStates({})
      return
    }

    try {
      const records = await listAttendanceForLessons(
        selectedClassId,
        date,
        lessonList.map((lesson) => lesson.id),
      )

      const recordCounts = new Map<string, number>()
      records.forEach((record) => {
        recordCounts.set(record.lesson_key, (recordCounts.get(record.lesson_key) ?? 0) + 1)
      })

      const now = new Date()
      const today = getLocalDateString(now)
      const nowSeconds = getCurrentSeconds(now)
      const next: Record<string, LessonCallState> = {}

      lessonList.forEach((lesson) => {
        const recordCount = recordCounts.get(lesson.id) ?? 0
        const starts = toSeconds(lesson.heureDebut)
        const ends = toSeconds(lesson.heureFin)

        let status: LessonCallState["status"] = "a_venir"
        if (date === today && nowSeconds >= starts && nowSeconds < ends) {
          status = recordCount > 0 ? "fait" : "en_cours"
        } else if (date !== today || nowSeconds >= ends) {
          status = recordCount > 0 ? "fait" : "non_fait"
        }

        next[lesson.id] = { recordCount, status }
      })

      setLessonStates(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de vérifier l'état des appels.")
    }
  }, [date, selectedClassId])

  const loadBaseAccess = useCallback(async () => {
    if (!establishmentId) return
    try {
      const [assignments, loadedSubjects] = await Promise.all([
        listTeacherClassSubjects(establishmentId),
        listAttendanceSubjects(establishmentId),
      ])
      setTeacherAssignments(assignments)
      setSubjects(loadedSubjects)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les autorisations d'appel.")
    }
  }, [establishmentId])

  useEffect(() => {
    if (!isYearLoading) void loadBaseAccess()
  }, [isYearLoading, loadBaseAccess])

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!selectedClassId && visibleClasses.length) setSelectedClassId(visibleClasses[0].id)
    if (selectedClassId && !visibleClasses.some((item) => item.id === selectedClassId)) setSelectedClassId("")
  }, [selectedClassId, visibleClasses])

  useEffect(() => {
    let cancelled = false
    let clock: number | undefined

    const loadLessons = async () => {
      if (!selectedClass) {
        setLessons([])
        setSelectedLessonKey("")
        return
      }

      try {
        setError(null)
        const day = getDayName(date)
        if (!day) {
          setLessons([])
          setSelectedLessonKey("")
          return
        }

        const allLessons = await serviceEmploiDuTempsClasses.obtenirTousLesCreneaux(academicYear?.id)
        if (cancelled) return

        const classLessons = allLessons
          .filter((lesson) => lesson.jour === day && lesson.classeId === selectedClass.id)
          .sort((a, b) => toSeconds(a.heureDebut) - toSeconds(b.heureDebut))

        const allowedLessons =
          isTeacher && !canManageAll
            ? classLessons.filter((lesson) =>
                teacherAssignments.some(
                  (assignment) =>
                    assignment.class_id === selectedClass.id &&
                    assignment.subject_id === lesson.matiereId
                )
              )
            : classLessons

        if (cancelled) return
        setLessons(allowedLessons)
        void loadLessonStates(allowedLessons)

        const selectCurrentLesson = () => {
          const now = new Date()
          const today = getLocalDateString(now)
          const nowSeconds = getCurrentSeconds(now)
          const currentLesson =
            today === date
              ? allowedLessons.find(
                  (lesson) =>
                    nowSeconds >= toSeconds(lesson.heureDebut) &&
                    nowSeconds < toSeconds(lesson.heureFin)
                )
              : null

          // Aucun cours n'est sélectionné automatiquement si aucun créneau
          // n'est en cours. Les autres cours restent sélectionnables manuellement.
          setSelectedLessonKey(currentLesson?.id ?? "")
        }

        selectCurrentLesson()

        // L'heure du navigateur peut changer pendant que la page reste ouverte.
        // On recalcule donc le cours en cours toutes les 30 secondes.
        clock = window.setInterval(selectCurrentLesson, 30_000)
      } catch (err) {
        if (!cancelled) {
          setLessons([])
          setSelectedLessonKey("")
          setLessonStates({})
          setError(err instanceof Error ? err.message : "Impossible de charger l'emploi du temps.")
        }
      }
    }

    void loadLessons()
    return () => {
      cancelled = true
      if (clock) window.clearInterval(clock)
    }
  }, [academicYear?.id, canManageAll, date, isTeacher, selectedClass, teacherAssignments, loadLessonStates])

  const loadCall = useCallback(async () => {
    if (!establishmentId || !academicYear?.id || !selectedClassId || !selectedLesson) {
      setStudents([])
      setAttendance({})
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      const [studentPage, records] = await Promise.all([
        listStudentsPaginated(establishmentId, 1, 1000, "", true, selectedClassId, academicYear.id),
        listAttendanceForLesson(selectedClassId, date, selectedLesson.id),
      ])

      const loadedStudents = (studentPage.items ?? []) as CallStudent[]
      const nextAttendance: Record<string, AttendanceEntry> = {}
      loadedStudents.forEach((student) => {
        nextAttendance[student.id] = { status: "present", reason: "" }
      })

      records.forEach((record) => {
        if (nextAttendance[record.student_id]) {
          nextAttendance[record.student_id] = {
            status: record.status === "excused" ? "justified" : (record.status as AttendanceStatus),
            reason: record.reason ?? "",
          }
        }
      })

      setStudents(loadedStudents)
      setAttendance(nextAttendance)
    } catch (err) {
      setStudents([])
      setAttendance({})
      setError(err instanceof Error ? err.message : "Impossible de charger les élèves de ce cours.")
    } finally {
      setIsLoading(false)
    }
  }, [academicYear?.id, date, establishmentId, selectedClassId, selectedLesson])

  useEffect(() => {
    void loadCall()
  }, [loadCall])

  const filteredStudents = useMemo(() => {
    const value = search.trim().toLowerCase()
    if (!value) return students
    return students.filter((student) =>
      `${student.first_name} ${student.last_name} ${student.student_number ?? ""}`.toLowerCase().includes(value)
    )
  }, [search, students])

  const setStudentStatus = (studentId: string, status: AttendanceStatus) => {
    setAttendance((current) => ({
      ...current,
      [studentId]: { status, reason: current[studentId]?.reason ?? "" },
    }))
  }

  const markAllPresent = () => {
    setAttendance((current) => {
      const next = { ...current }
      students.forEach((student) => { next[student.id] = { status: "present", reason: "" } })
      return next
    })
  }

  const saveCall = async () => {
    if (!establishmentId || !selectedClassId || !selectedLesson || !selectedSubject || !students.length) return

    if (!canManageAll && !selectedLessonIsWithinTeacherWindow) {
      setError("En tant qu'enseignant, l'appel doit être fait pendant le cours ou dans les " + TEACHER_CALL_GRACE_MINUTES + " minutes qui suivent. Après ce délai, le rattrapage est réservé au compte administratif habilité.")
      return
    }

    const teacherAllowed = canManageAll || teacherAssignments.some(
      (assignment) =>
        assignment.class_id === selectedClassId &&
        assignment.subject_id === selectedSubject.id
    )

    if (!teacherAllowed) {
      setError("Vous n'êtes pas l'enseignant affecté à cette matière dans cette classe.")
      return
    }

    try {
      setIsSaving(true)
      setError(null)
      setMessage(null)

      await Promise.all(
        students.map((student) => {
          const entry = attendance[student.id] ?? { status: "present", reason: "" }
          return recordLessonAttendance({
            establishmentId,
            studentId: student.id,
            classId: selectedClassId,
            subjectId: selectedSubject.id,
            date,
            lessonKey: selectedLesson.id,
            status: entry.status,
            reason: entry.reason || undefined,
          })
        })
      )

      setMessage(`Appel enregistré pour ${selectedClass?.name} · ${selectedLesson.matiere} · ${selectedLesson.heureDebut}–${selectedLesson.heureFin}.`)
      await loadCall()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'enregistrer l'appel.")
    } finally {
      setIsSaving(false)
    }
  }

  const counts = useMemo(() => {
    const values = students.map((student) => attendance[student.id]?.status ?? "present")
    return {
      total: students.length,
      present: values.filter((status) => status === "present").length,
      absent: values.filter((status) => status === "absent").length,
      late: values.filter((status) => status === "late").length,
      justified: values.filter((status) => status === "justified").length,
    }
  }, [attendance, students])

  return (
    <main translate="no" className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <div className="mb-6 flex flex-col gap-3 border-b pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Vie scolaire</div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Registre d'appel</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Sélectionnez une classe et un cours pour enregistrer les présences. Les enseignants voient uniquement leurs cours.
            </p>
          </div>
          <div className="text-sm text-slate-500">
            {academicYear?.name ?? "Année scolaire"} · {currentTime.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
          </div>
        </div>

        <section className="mb-5 border-b pb-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Année scolaire</label>
              <Select value={academicYear?.id ?? ""} onValueChange={selectYear} disabled={isYearLoading || academicYears.length === 0}>
                <SelectTrigger><SelectValue placeholder="Année scolaire" /></SelectTrigger>
                <SelectContent>
                  {academicYears.map((year) => <SelectItem key={year.id} value={year.id}>{year.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Classe</label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger><SelectValue placeholder="Choisir une classe" /></SelectTrigger>
                <SelectContent>
                  {visibleClasses.map((classe) => <SelectItem key={classe.id} value={classe.id}>{classe.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Date</label>
              <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </div>

            <div className="flex items-end">
              <div className="w-full border bg-slate-50 px-3 py-2">
                <div className="text-xs text-slate-500">Heure locale</div>
                <div className="font-semibold tabular-nums">{currentTime.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</div>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Rechercher un élève</label>
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nom ou matricule" disabled={!selectedClassId} />
            </div>
          </div>
        </section>

        {message && <div className="mb-4 border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{message}</div>}
        {error && <div className="mb-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

        {!selectedClassId ? (
          <div className="border px-6 py-12 text-center">
            <UserCheck className="mx-auto mb-3 h-8 w-8 text-slate-400" />
            <p className="font-medium">{isTeacher ? "Aucune classe ne vous est affectée" : "Choisissez une classe"}</p>
            <p className="mt-1 text-sm text-slate-500">
              {isTeacher ? "Les appels sont limités aux classes et matières qui vous sont affectées." : "Les cours de la journée apparaîtront ici."}
            </p>
          </div>
        ) : lessons.length === 0 ? (
          <div className="border px-6 py-12 text-center">
            <Clock className="mx-auto mb-3 h-8 w-8 text-slate-400" />
            <p className="font-medium">Aucun cours prévu pour cette classe ce jour</p>
            <p className="mt-1 text-sm text-slate-500">
              L'appel n'est disponible que lorsqu'un cours existe dans l'emploi du temps.
            </p>
          </div>
        ) : (
          <>
            <section className="mb-5 border-b pb-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold">{selectedClass?.name}</h2>
                  <p className="text-sm text-slate-500">Cours du {new Date(date + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</p>
                </div>
                <span className="text-sm text-slate-500">{lessons.length} créneau{lessons.length > 1 ? "x" : ""}</span>
              </div>

              {Object.values(lessonStates).filter((state) => state.status === "non_fait").length > 0 && (
                <div className="mb-3 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  <span className="font-semibold">Attention :</span> un ou plusieurs cours sont terminés sans appel enregistré.
                </div>
              )}
              <div className="overflow-x-auto">
                <div className="flex min-w-max gap-2">
                  {lessons.map((lesson) => {
                    const active = lesson.id === selectedLessonKey
                    return (
                      <button
                        key={lesson.id}
                        type="button"
                        onClick={() => setSelectedLessonKey(lesson.id)}
                        className={`min-w-[180px] border px-3 py-2 text-left ${active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white hover:bg-slate-50"} ${date === getLocalDateString(currentTime) && getCurrentSeconds(currentTime) >= toSeconds(lesson.heureDebut) && getCurrentSeconds(currentTime) < toSeconds(lesson.heureFin) ? "ring-2 ring-green-500 ring-offset-1" : ""}`}
                      >
                        <div className="flex items-center justify-between gap-2 text-xs opacity-70">
                          <span>{lesson.heureDebut}–{lesson.heureFin}</span>
                          {lessonStates[lesson.id]?.status === "non_fait" && <span className="font-semibold text-red-600">NON FAIT</span>}
                          {lessonStates[lesson.id]?.status === "fait" && <span className="font-semibold text-green-600">FAIT</span>}
                          {date === getLocalDateString(currentTime) && getCurrentSeconds(currentTime) >= toSeconds(lesson.heureDebut) && getCurrentSeconds(currentTime) < toSeconds(lesson.heureFin) && <span className="font-semibold">EN COURS</span>}
                        </div>
                        <div className="mt-1 font-medium">{lesson.matiere || "Cours"}</div>
                        <div className="text-xs opacity-70">{lesson.enseignantNom || "Enseignant non renseigné"}</div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </section>

            <div className="mb-4 flex flex-col gap-3 border-b pb-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Saisie des présences</div>
                <h2 className="mt-1 font-semibold">Appel · {selectedLesson?.matiere}</h2>
                <p className="text-sm text-slate-500">
                  {selectedLesson?.heureDebut}–{selectedLesson?.heureFin}{selectedLesson?.salle ? ` · ${selectedLesson.salle}` : ""}
                  {" · "}{counts.total} élève(s)
                </p>
                {selectedLessonState?.status === "non_fait" && (
                  <div className="mt-2 border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
                    Le cours est terminé et aucun appel n'a été enregistré par l'enseignant.
                    {canManageAll ? " Le compte administratif habilité peut maintenant faire le rattrapage." : ""}
                  </div>
                )}
                {selectedLessonState?.status === "fait" && (
                  <div className="mt-2 border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                    L'appel a été enregistré pour ce cours.
                  </div>
                )}
                {!canManageAll && !selectedLessonIsWithinTeacherWindow && selectedLessonState?.status !== "non_fait" && (
                  <p className="mt-1 text-xs text-amber-700">
                    L'appel enseignant est fermé. Il est possible pendant le cours et jusqu'à {TEACHER_CALL_GRACE_MINUTES} minutes après sa fin.
                  </p>
                )}
                {canManageAll && selectedLessonState?.status !== "fait" && canAdministrativeRecordSelectedLesson && !selectedLessonIsCurrent && (
                  <p className="mt-1 text-xs text-blue-700">
                    Mode administratif : vous pouvez enregistrer ou rattraper cet appel, même si le cours est terminé.
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="border px-2.5 py-1 text-slate-700">Total {counts.total}</span>
                <span className="border px-2.5 py-1 text-green-700">Présents {counts.present}</span>
                <span className="border px-2.5 py-1 text-red-700">Absents {counts.absent}</span>
                <span className="border px-2.5 py-1 text-amber-700">Retards {counts.late}</span>
                <span className="border px-2.5 py-1 text-blue-700">Justifiés {counts.justified}</span>
                <Button variant="outline" size="sm" onClick={markAllPresent} disabled={!students.length || isSaving}>Tous présents</Button>
                <Button size="sm" onClick={saveCall} disabled={!students.length || isSaving || !selectedSubject || !canRecordSelectedLesson}>
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? "Enregistrement…" : canManageAll && !selectedLessonIsCurrent ? "Rattraper l'appel" : "Enregistrer l'appel"}
                </Button>
              </div>
            </div>

            {isLoading ? (
              <div className="border px-6 py-12 text-center text-sm text-slate-500">Chargement des élèves…</div>
            ) : students.length === 0 ? (
              <div className="border px-6 py-12 text-center">
                <p className="font-medium">Aucun élève trouvé dans cette classe.</p>
                <p className="mt-1 text-sm text-slate-500">Vérifiez l'année scolaire et les inscriptions.</p>
              </div>
            ) : (
              <div className="overflow-x-auto border">
                <table className="min-w-[900px] w-full text-sm">
                  <thead className="border-b bg-slate-50">
                    <tr>
                      <th className="w-12 px-3 py-3 text-left font-medium text-slate-500">N°</th>
                      <th className="px-3 py-3 text-left font-medium text-slate-700">Élève</th>
                      <th className="w-40 px-3 py-3 text-left font-medium text-slate-700">Matricule</th>
                      <th className="px-3 py-3 text-left font-medium text-slate-700">Présence</th>
                      <th className="w-64 px-3 py-3 text-left font-medium text-slate-700">Motif</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student, index) => {
                      const entry = attendance[student.id] ?? { status: "present" as AttendanceStatus, reason: "" }
                      return (
                        <tr key={student.id} className="border-b last:border-0 hover:bg-slate-50">
                          <td className="px-3 py-3 text-slate-500">{index + 1}</td>
                          <td className="px-3 py-3 font-medium">{student.last_name} {student.first_name}</td>
                          <td className="px-3 py-3 text-slate-500">{student.student_number || "—"}</td>
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap gap-1.5">
                              {(Object.keys(statusLabels) as AttendanceStatus[]).map((status) => (
                                <button
                                  key={status}
                                  type="button"
                                  onClick={() => setStudentStatus(student.id, status)}
                                  className={`inline-flex items-center gap-1.5 border px-2.5 py-1.5 text-xs font-medium ${entry.status === status ? statusClasses[status] : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                                >
                                  {status === "present" && <Check className="h-3.5 w-3.5" />}
                                  {status === "absent" && <X className="h-3.5 w-3.5" />}
                                  {status === "late" && <Clock className="h-3.5 w-3.5" />}
                                  {status === "justified" && <UserCheck className="h-3.5 w-3.5" />}
                                  {statusLabels[status]}
                                </button>
                              ))}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <Input value={entry.reason} onChange={(event) => setAttendance((current) => ({ ...current, [student.id]: { ...entry, reason: event.target.value } }))} placeholder={entry.status === "present" ? "—" : "Motif"} disabled={entry.status === "present"} className="h-8" />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}
