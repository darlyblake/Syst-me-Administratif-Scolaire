"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, History, Loader2 } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useAuthentification } from "@/providers/authentification.provider"
import { TeacherShell } from "@/components/enseignant/teacher-shell"
import { enseignantPortalService, type TeacherAttendanceHistoryBySlotRow, type TeacherClass, type TeacherScheduleSlot } from "@/services/enseignant-portal.service"

const days: Record<number, string> = {
  1: "Lundi", 2: "Mardi", 3: "Mercredi", 4: "Jeudi", 5: "Vendredi", 6: "Samedi", 7: "Dimanche",
}

export default function HistoriquePresencesEnseignantPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { utilisateur, contexte, estEnCoursDeChargement } = useAuthentification()

  const [classes, setClasses] = useState<TeacherClass[]>([])
  const [schedule, setSchedule] = useState<TeacherScheduleSlot[]>([])
  const [classId, setClassId] = useState("")
  const [slotId, setSlotId] = useState("")
  const [rows, setRows] = useState<TeacherAttendanceHistoryBySlotRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const establishment = contexte?.establishments?.find((item) => item.id === id)

  useEffect(() => {
    if (!estEnCoursDeChargement && (!utilisateur || utilisateur.role !== "enseignant" || !establishment)) {
      router.replace("/enseignant")
    }
  }, [estEnCoursDeChargement, utilisateur, establishment, router])

  useEffect(() => {
    if (!id || !establishment) return
    Promise.all([
      enseignantPortalService.getClasses(id),
      enseignantPortalService.getSchedule(id),
    ]).then(([classRows, scheduleRows]) => {
      setClasses(classRows)
      setSchedule(scheduleRows)
      const first = scheduleRows[0]
      if (first) {
        setSlotId(first.slot_id)
        setClassId(first.class_id)
      }
    }).catch((e) => setError(e instanceof Error ? e.message : "Impossible de charger votre emploi du temps."))
  }, [id, establishment])

  const availableSlots = useMemo(
    () => schedule.filter((slot) => !classId || slot.class_id === classId),
    [schedule, classId],
  )

  useEffect(() => {
    if (!availableSlots.length) {
      setSlotId("")
      return
    }
    if (!availableSlots.some((slot) => slot.slot_id === slotId)) {
      setSlotId(availableSlots[0].slot_id)
    }
  }, [availableSlots, slotId])

  const selectedSlot = useMemo(
    () => schedule.find((slot) => slot.slot_id === slotId) ?? null,
    [schedule, slotId],
  )

  useEffect(() => {
    if (!selectedSlot || !id) return
    setLoading(true)
    setError(null)
    enseignantPortalService.getAttendanceHistoryBySlot(id, selectedSlot.slot_id, classId || undefined)
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : "Impossible de charger l'historique des appels."))
      .finally(() => setLoading(false))
  }, [id, selectedSlot, classId])

  const classOptions = useMemo(
    () => Array.from(new Map(classes.map((item) => [item.class_id, item])).values()),
    [classes],
  )

  if (estEnCoursDeChargement || !utilisateur || !establishment) {
    return <main className="min-h-screen bg-creme flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></main>
  }

  return (
    <TeacherShell establishmentId={id} establishmentName={establishment.name} active="attendance">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/enseignant/etablissement/${id}/presences`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />Retour à l'appel
          </Button>
          <div className="mt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-terre">Suivi des appels</p>
            <h1 className="text-2xl font-semibold">Historique</h1>
            <p className="mt-1 text-sm text-muted-foreground">Seuls les cours réellement présents dans votre emploi du temps sont proposés.</p>
          </div>
        </header>

        {error && <div role="alert" className="mb-5 border border-rouge-terre/30 bg-white p-3 text-sm text-rouge-terre">{error}</div>}

        <div className="mb-5 flex flex-col gap-3 border bg-white p-4 md:flex-row md:items-end">
          <label className="text-sm font-medium md:w-64">
            Classe
            <select
              className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={classId}
              onChange={(event) => setClassId(event.target.value)}
            >
              <option value="">Toutes mes classes</option>
              {classOptions.map((item) => <option key={item.class_id} value={item.class_id}>{item.class_name}</option>)}
            </select>
          </label>

          <label className="text-sm font-medium flex-1">
            Période de cours
            <select
              className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={slotId}
              onChange={(event) => setSlotId(event.target.value)}
              disabled={!availableSlots.length}
            >
              {availableSlots.map((slot) => (
                <option key={slot.slot_id} value={slot.slot_id}>
                  {days[slot.day_of_week]} · {slot.starts_at.slice(0, 5)}–{slot.ends_at.slice(0, 5)} · {slot.class_name} · {slot.subject_name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {selectedSlot && (
          <div className="mb-4 flex flex-wrap gap-x-5 gap-y-1 border-b pb-3 text-sm">
            <span className="font-medium">{selectedSlot.class_name}</span>
            <span>{selectedSlot.subject_name}</span>
            <span>{days[selectedSlot.day_of_week]}</span>
            <span>{selectedSlot.starts_at.slice(0, 5)}–{selectedSlot.ends_at.slice(0, 5)}</span>
            <span className="text-muted-foreground">{rows.length} enregistrement(s)</span>
          </div>
        )}

        <div className="overflow-x-auto border bg-white">
          {loading ? (
            <div className="flex justify-center p-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : !selectedSlot ? (
            <div className="p-10 text-center text-sm text-muted-foreground">Aucun cours n'est disponible dans votre emploi du temps.</div>
          ) : !rows.length ? (
            <div className="p-10 text-center">
              <History className="mx-auto mb-3 h-5 w-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Aucun appel enregistré pour cette période de cours.</p>
            </div>
          ) : (
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b bg-muted/30 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Élève</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Motif</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 whitespace-nowrap">{row.attendance_date}</td>
                    <td className="px-4 py-3 font-medium">{row.last_name} {row.first_name}</td>
                    <td className="px-4 py-3">{row.status === "present" ? "Présent" : row.status === "absent" ? "Absent" : row.status === "late" ? "En retard" : "Excusé"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.reason ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </TeacherShell>
  )
}
