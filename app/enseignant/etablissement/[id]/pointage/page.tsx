"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Check, Clock3, LogIn, LogOut, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { useAuthentification } from "@/providers/authentification.provider"
import { enseignantPointageService, type TeacherLessonPointage, type TeacherLessonSlot } from "@/services/enseignant-pointage.service"

const jours = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"]

const localDate = () => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

const localTime = () => {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

const toMinutes = (value: string) => {
  const [h, m] = value.slice(0, 5).split(":").map(Number)
  return h * 60 + m
}

const scheduledHours = (slot: TeacherLessonSlot) =>
  Math.ceil((toMinutes(slot.ends_at) - toMinutes(slot.starts_at)) / 60)

export default function EnseignantPointagePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const establishmentId = params.id
  const { utilisateur, contexte, estEnCoursDeChargement } = useAuthentification()

  const [teacherId, setTeacherId] = useState<string | null>(null)
  const [academicYearId, setAcademicYearId] = useState<string | null>(null)
  const [schedule, setSchedule] = useState<TeacherLessonSlot[]>([])
  const [pointages, setPointages] = useState<TeacherLessonPointage[]>([])
  const [date, setDate] = useState(localDate)
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [now, setNow] = useState(localTime)

  const establishment = contexte?.establishments?.find((item) => item.id === establishmentId)

  const load = async () => {
    if (!establishmentId) return
    setLoading(true)
    try {
      const [contextRows, year] = await Promise.all([
        enseignantPointageService.getContext?.(establishmentId),
        enseignantPointageService.getActiveAcademicYear(establishmentId),
      ])
      const context = contextRows?.[0]
      if (!context?.teacher_id) throw new Error("Votre profil enseignant n'est pas associé à cet établissement.")
      if (!year?.id) throw new Error("Aucune année scolaire active n'est configurée.")

      setTeacherId(context.teacher_id)
      setAcademicYearId(year.id)

      const [slots, records] = await Promise.all([
        enseignantPointageService.getSchedule(establishmentId, year.id, context.teacher_id),
        enseignantPointageService.getPointages(establishmentId, context.teacher_id, date, date),
      ])
      setSchedule(slots)
      setPointages(records)
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
    const timer = window.setInterval(() => setNow(localTime()), 30000)
    return () => window.clearInterval(timer)
  }, [])

  const dayOfWeek = useMemo(() => {
    const d = new Date(`${date}T12:00:00`)
    const iso = d.getDay() === 0 ? 7 : d.getDay()
    return iso
  }, [date])

  const todaysSlots = useMemo(
    () => schedule.filter((slot) => slot.day_of_week === dayOfWeek).sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
    [schedule, dayOfWeek],
  )

  const pointageBySlot = useMemo(
    () => new Map(pointages.map((item) => [item.timetable_slot_id, item])),
    [pointages],
  )

  const plannedToday = todaysSlots.reduce((sum, slot) => sum + scheduledHours(slot), 0)
  const countedToday = pointages.reduce((sum, item) => sum + Number(item.counted_hours || 0), 0)

  const startLesson = async (slot: TeacherLessonSlot) => {
    if (!teacherId || !academicYearId) return
    setSavingId(slot.slot_id)
    try {
      await enseignantPointageService.startLesson({
        establishmentId,
        academicYearId,
        timetableSlotId: slot.slot_id,
        teacherId,
        attendanceDate: date,
        startedTime: localTime(),
      })
      toast.success("Début du cours enregistré.")
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible d'enregistrer le début du cours.")
    } finally {
      setSavingId(null)
    }
  }

  const endLesson = async (record: TeacherLessonPointage) => {
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

  const canStart = (slot: TeacherLessonSlot) => {
    const current = toMinutes(now)
    const start = toMinutes(slot.starts_at)
    const end = toMinutes(slot.ends_at)
    return current >= start - 15 && current <= end
  }

  if (estEnCoursDeChargement || !utilisateur || !establishment) {
    return <main className="min-h-screen flex items-center justify-center"><p className="text-sm text-muted-foreground">Chargement…</p></main>
  }

  return (
    <main className="min-h-screen bg-creme">
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-center gap-3 border-b pb-5">
          <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Retour"><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-terre">Espace enseignant</p>
            <h1 className="text-2xl font-semibold">Pointage</h1>
            <p className="text-sm text-muted-foreground">{establishment.name}</p>
          </div>
          <Button variant="outline" size="sm" className="ml-auto" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Actualiser
          </Button>
        </div>

        <div className="mb-5 flex flex-wrap items-end gap-3">
          <label className="text-sm font-medium">
            Date
            <input type="date" className="mt-1 block rounded-md border bg-white px-3 py-2" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <div className="rounded-md border bg-white px-4 py-2 text-sm">
            <span className="text-muted-foreground">Aujourd'hui : </span>{jours[dayOfWeek - 1] ?? "—"}
          </div>
          <div className="rounded-md border bg-white px-4 py-2 text-sm">
            <span className="text-muted-foreground">Prévu : </span><strong>{plannedToday} h</strong>
          </div>
          <div className="rounded-md border bg-white px-4 py-2 text-sm">
            <span className="text-muted-foreground">Pointé : </span><strong>{countedToday} h</strong>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Mes cours du {new Date(`${date}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}</CardTitle></CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Chargement…</div>
            ) : todaysSlots.length === 0 ? (
              <div className="p-10 text-center">
                <Clock3 className="mx-auto mb-3 h-7 w-7 text-muted-foreground" />
                <p className="font-medium">Aucun cours prévu ce jour.</p>
                <p className="mt-1 text-sm text-muted-foreground">Aucun pointage de cours n'est proposé pour cette journée.</p>
              </div>
            ) : (
              <div className="divide-y">
                {todaysSlots.map((slot) => {
                  const record = pointageBySlot.get(slot.slot_id)
                  const active = record?.status === "in_progress"
                  const complete = record?.status === "completed"
                  const ready = canStart(slot)
                  return (
                    <div key={slot.slot_id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-semibold">{slot.starts_at} – {slot.ends_at} · {slot.subject_name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{slot.class_name}{slot.room ? ` · Salle ${slot.room}` : ""}</p>
                        <p className="mt-2 text-xs text-muted-foreground">Volume prévu : {scheduledHours(slot)} h</p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        {!record && (
                          <Button onClick={() => void startLesson(slot)} disabled={!ready || savingId === slot.slot_id}>
                            <LogIn className="mr-2 h-4 w-4" />
                            {ready ? "Commencer le cours" : "Pas encore"}
                          </Button>
                        )}
                        {active && (
                          <Button variant="outline" onClick={() => void endLesson(record)} disabled={savingId === record.id}>
                            <LogOut className="mr-2 h-4 w-4" />Terminer le cours
                          </Button>
                        )}
                        {complete && (
                          <div className="text-right">
                            <p className="flex items-center justify-end gap-1 text-sm font-medium text-green-700"><Check className="h-4 w-4" />Cours terminé</p>
                            <p className="text-xs text-muted-foreground">{record.started_time?.slice(0, 5)} → {record.ended_time?.slice(0, 5)} · {record.counted_hours} h comptée(s)</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <p className="mt-4 text-xs text-muted-foreground">
          Un cours de 08h00 à 09h40 représente 2 h de cours. Si le début est pointé après 08h40, 1 h est comptabilisée.
        </p>
      </div>
    </main>
  )
}
