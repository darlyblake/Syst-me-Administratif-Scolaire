"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Check, Clock3, LogIn, LogOut, RefreshCw, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuthentification } from "@/providers/authentification.provider"
import { enseignantPointageService, type TeacherLessonPointage, type TeacherLessonSlot, type TeacherWeeklySummary } from "@/services/enseignant-pointage.service"
import { toast } from "sonner"

const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"]

const localDate = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}
const localTime = () => {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}
const minutes = (v: string) => {
  const [h, m] = v.slice(0, 5).split(":").map(Number)
  return h * 60 + m
}
const volume = (slot: TeacherLessonSlot) => Math.max(0, Math.ceil((minutes(slot.ends_at) - minutes(slot.starts_at)) / 60))

function weekStart(date: string) {
  const d = new Date(`${date}T12:00:00`)
  const day = d.getDay() || 7
  d.setDate(d.getDate() - day + 1)
  return d.toISOString().slice(0, 10)
}
function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
}

export default function EnseignantPointagePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const establishmentId = params.id
  const { utilisateur, contexte, estEnCoursDeChargement } = useAuthentification()
  const establishment = contexte?.establishments?.find((item) => item.id === establishmentId)

  const [teacherId, setTeacherId] = useState<string | null>(null)
  const [academicYearId, setAcademicYearId] = useState<string | null>(null)
  const [schedule, setSchedule] = useState<TeacherLessonSlot[]>([])
  const [pointages, setPointages] = useState<TeacherLessonPointage[]>([])
  const [weekly, setWeekly] = useState<TeacherWeeklySummary | null>(null)
  const [date, setDate] = useState(localDate)
  const [now, setNow] = useState(localTime)
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)

  const load = async () => {
    if (!establishmentId) return
    setLoading(true)
    try {
      const [contextRows, year] = await Promise.all([
        enseignantPointageService.getContext(establishmentId),
        enseignantPointageService.getActiveAcademicYear(establishmentId),
      ])
      const context = contextRows?.[0]
      if (!context?.teacher_id) throw new Error("Votre profil enseignant n'est pas associé à cet établissement.")
      if (!year?.id) throw new Error("Aucune année scolaire active n'est configurée.")

      setTeacherId(context.teacher_id)
      setAcademicYearId(year.id)

      const [slots, records, summary] = await Promise.all([
        enseignantPointageService.getTeacherSchedule(establishmentId),
        enseignantPointageService.getPointages(establishmentId, context.teacher_id, date, date),
        enseignantPointageService.getWeeklySummary(establishmentId, context.teacher_id, weekStart(date)),
      ])
      setSchedule(slots)
      setPointages(records)
      setWeekly(summary)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de charger le pointage.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!estEnCoursDeChargement && (!utilisateur || utilisateur.role !== "enseignant" || !establishment)) {
      router.replace("/enseignant")
      return
    }
    if (!estEnCoursDeChargement && establishment) void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estEnCoursDeChargement, utilisateur, establishmentId, establishment, date])

  useEffect(() => {
    const id = window.setInterval(() => setNow(localTime()), 30000)
    return () => window.clearInterval(id)
  }, [])

  const day = useMemo(() => {
    const d = new Date(`${date}T12:00:00`)
    return d.getDay() || 7
  }, [date])

  const todaySlots = useMemo(
    () => schedule.filter((slot) => slot.day_of_week === day).sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
    [schedule, day],
  )
  const pointageBySlot = useMemo(() => new Map(pointages.map((item) => [item.timetable_slot_id, item])), [pointages])
  const plannedToday = todaySlots.reduce((sum, slot) => sum + volume(slot), 0)
  const countedToday = pointages.reduce((sum, item) => sum + Number(item.counted_hours || 0), 0)
  const activeLesson = todaySlots.find((slot) => {
    const record = pointageBySlot.get(slot.slot_id)
    const current = minutes(now)
    return (current >= minutes(slot.starts_at) && current <= minutes(slot.ends_at)) || record?.status === "in_progress"
  })
  const nextLesson = todaySlots.find((slot) => minutes(slot.starts_at) > minutes(now))
  const activeRecord = activeLesson ? pointageBySlot.get(activeLesson.slot_id) : undefined

  const canStart = (slot: TeacherLessonSlot) => {
    const current = minutes(now)
    return current >= minutes(slot.starts_at) - 15 && current <= minutes(slot.ends_at)
  }

  const status = (slot: TeacherLessonSlot, record?: TeacherLessonPointage) => {
    if (record?.status === "completed") return "Terminé"
    if (record?.status === "in_progress") return "En cours"
    if (canStart(slot)) return "À pointer"
    if (minutes(now) < minutes(slot.starts_at)) return "À venir"
    return "Non pointé"
  }

  const start = async (slot: TeacherLessonSlot) => {
    if (!teacherId || !academicYearId) return
    setSavingId(slot.slot_id)
    try {
      await enseignantPointageService.startLesson({ establishmentId, academicYearId, timetableSlotId: slot.slot_id, teacherId, attendanceDate: date, startedTime: localTime() })
      toast.success("Début du cours enregistré.")
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible d'enregistrer le début du cours.")
    } finally {
      setSavingId(null)
    }
  }

  const end = async (record: TeacherLessonPointage) => {
    setSavingId(record.id)
    try {
      await enseignantPointageService.endLesson(record.id, localTime())
      toast.success("Fin du cours enregistrée.")
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible d'enregistrer la fin du cours.")
    } finally {
      setSavingId(null)
    }
  }

  if (estEnCoursDeChargement || !utilisateur || !establishment) {
    return <main className="min-h-screen flex items-center justify-center"><p className="text-sm text-muted-foreground">Chargement…</p></main>
  }

  const ecart = Number(weekly?.difference_hours ?? 0)

  return (
    <main className="min-h-screen bg-creme">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <header className="mb-5 flex flex-wrap items-center gap-3 border-b pb-5">
          <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Retour"><ArrowLeft className="h-5 w-5" /></Button>
          <div><p className="text-xs font-medium uppercase tracking-wide text-terre">Pointage enseignant</p><h1 className="text-2xl font-semibold">{establishment.name}</h1></div>
          <Button variant="outline" size="sm" className="ml-auto" onClick={() => void load()} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Actualiser</Button>
        </header>

        <section className="mb-5 border bg-white">
          <div className="border-b px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-terre">Ma journée</p>
            <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">{formatDate(date)}</p>
              <span className="text-sm font-medium">Heure actuelle : {now}</span>
            </div>
          </div>
          <div className="grid divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            <div className="p-5">
              {activeLesson ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Cours en cours</p>
                  <p className="mt-2 text-xl font-semibold">{activeLesson.subject_name}</p>
                  <p className="text-sm text-muted-foreground">{activeLesson.class_name} · {activeLesson.starts_at} – {activeLesson.ends_at}{activeLesson.room ? " · Salle " + activeLesson.room : ""}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {!activeRecord && <Button onClick={() => void start(activeLesson)} disabled={savingId === activeLesson.slot_id}><LogIn className="mr-2 h-4 w-4" />Pointer mon début</Button>}
                    {activeRecord?.status === "in_progress" && <Button variant="outline" onClick={() => void end(activeRecord)} disabled={savingId === activeRecord.id}><LogOut className="mr-2 h-4 w-4" />Pointer ma fin</Button>}
                  </div>
                </div>
              ) : nextLesson ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-terre">Prochain cours</p>
                  <p className="mt-2 text-xl font-semibold">{nextLesson.subject_name}</p>
                  <p className="text-sm text-muted-foreground">{nextLesson.class_name} · {nextLesson.starts_at} – {nextLesson.ends_at}</p>
                  <p className="mt-4 text-sm">Le bouton de pointage apparaîtra à l’approche du cours.</p>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fin de journée</p>
                  <p className="mt-2 text-lg font-semibold">Aucun autre cours prévu aujourd’hui</p>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 divide-x">
              <Metric label="Prévu aujourd’hui" value={`${plannedToday} h`} />
              <Metric label="Pointé aujourd’hui" value={`${countedToday} h`} />
            </div>
          </div>
        </section>

        <section className="mb-5 border-y bg-white">
          <div className="grid divide-y sm:grid-cols-5 sm:divide-x sm:divide-y-0">
            <Metric label="Prévu cette semaine" value={`${weekly?.planned_hours ?? 0} h`} />
            <Metric label="Pointé" value={`${weekly?.counted_hours ?? 0} h`} />
            <Metric label="Cours pointés" value={`${weekly?.pointed_courses ?? 0} / ${weekly?.scheduled_courses ?? 0}`} />
            <Metric label="Cours non pointés" value={String(weekly?.missing_courses ?? 0)} />
            <Metric label="Écart" value={`${ecart > 0 ? "+" : ""}${ecart} h`} />
          </div>
        </section>

        <div className="mb-5 flex flex-wrap items-end gap-3">
          <label className="text-sm font-medium">Date
            <input type="date" className="mt-1 block rounded-md border bg-white px-3 py-2" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <div className="border bg-white px-4 py-2 text-sm"><span className="text-muted-foreground">Jour : </span><strong>{JOURS[day - 1] ?? "—"}</strong></div>
          <div className="border bg-white px-4 py-2 text-sm"><span className="text-muted-foreground">Prévu aujourd'hui : </span><strong>{plannedToday} h</strong></div>
          <div className="border bg-white px-4 py-2 text-sm"><span className="text-muted-foreground">Pointé aujourd'hui : </span><strong>{countedToday} h</strong></div>
        </div>

        <section className="border bg-white">
          <div className="border-b px-4 py-4">
            <h2 className="font-semibold">Cours du {formatDate(date)}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Seuls les cours prévus dans votre emploi du temps peuvent être pointés.</p>
          </div>

          {loading ? <div className="p-10 text-center text-sm text-muted-foreground">Chargement…</div> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-sm">
                <thead className="border-b bg-muted/30 text-left text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Horaire</th><th className="px-4 py-3 font-medium">Classe</th><th className="px-4 py-3 font-medium">Matière</th><th className="px-4 py-3 font-medium">Prévu</th><th className="px-4 py-3 font-medium">Début</th><th className="px-4 py-3 font-medium">Fin</th><th className="px-4 py-3 font-medium">Compté</th><th className="px-4 py-3 font-medium">Situation</th><th className="px-4 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {todaySlots.map((slot) => {
                    const record = pointageBySlot.get(slot.slot_id)
                    const state = status(slot, record)
                    const ready = canStart(slot)
                    return (
                      <tr key={slot.slot_id} className={state === "À pointer" ? "bg-amber-50/60" : ""}>
                        <td className="px-4 py-4 font-medium">{slot.starts_at} – {slot.ends_at}</td>
                        <td className="px-4 py-4">{slot.class_name}{slot.room ? <span className="block text-xs text-muted-foreground">Salle {slot.room}</span> : null}</td>
                        <td className="px-4 py-4">{slot.subject_name}</td>
                        <td className="px-4 py-4">{volume(slot)} h</td>
                        <td className="px-4 py-4">{record?.started_time?.slice(0, 5) ?? "—"}</td>
                        <td className="px-4 py-4">{record?.ended_time?.slice(0, 5) ?? "—"}</td>
                        <td className="px-4 py-4 font-medium">{record ? `${record.counted_hours} h` : "0 h"}</td>
                        <td className="px-4 py-4">
                          {state === "Terminé" ? <span className="inline-flex items-center gap-1 font-medium text-green-700"><Check className="h-4 w-4" />Terminé</span>
                            : state === "En cours" ? <span className="inline-flex items-center gap-1 font-medium text-blue-700"><Clock3 className="h-4 w-4" />En cours</span>
                            : state === "À pointer" ? <span className="inline-flex items-center gap-1 font-medium text-amber-700"><Clock3 className="h-4 w-4" />À pointer</span>
                            : state === "Non pointé" ? <span className="inline-flex items-center gap-1 font-medium text-red-700"><AlertTriangle className="h-4 w-4" />Non pointé</span>
                            : <span className="text-muted-foreground">À venir</span>}
                        </td>
                        <td className="px-4 py-4">
                          {!record && <Button size="sm" onClick={() => void start(slot)} disabled={!ready || savingId === slot.slot_id}><LogIn className="mr-2 h-4 w-4" />Pointer le début</Button>}
                          {record?.status === "in_progress" && <Button size="sm" variant="outline" onClick={() => void end(record)} disabled={savingId === record.id}><LogOut className="mr-2 h-4 w-4" />Pointer la fin</Button>}
                          {record?.status === "completed" && <span className="text-xs text-muted-foreground">Pointage enregistré</span>}
                          {!record && !ready && minutes(now) > minutes(slot.ends_at) && <span className="text-xs text-red-600">Cours terminé sans pointage</span>}
                        </td>
                      </tr>
                    )
                  })}
                  {!todaySlots.length && <tr><td colSpan={9} className="px-4 py-12 text-center text-sm text-muted-foreground">Aucun cours prévu ce jour.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-5 border bg-white px-4 py-4 text-sm">
          <p className="font-medium">Règle de comptabilisation</p>
          <p className="mt-1 text-muted-foreground">Pour un cours de 08h00 à 09h40, le volume prévu est de 2 h. Un début pointé à 08h40 conserve 2 h ; à partir de 08h41, le cours compte 1 h. La fin du cours est enregistrée séparément.</p>
        </section>
      </div>
    </main>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="px-4 py-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-lg font-semibold">{value}</p></div>
}
