"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Check, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { serviceEnseignants } from "@/services/enseignants.service"
import { enseignantPointageService, type TeacherLessonPointage, type TeacherLessonSlot } from "@/services/enseignant-pointage.service"
import { useAuthentification } from "@/providers/authentification.provider"
import type { DonneesEnseignant } from "@/types/models"

const jours = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"]

const localDate = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

const toMinutes = (value: string) => {
  const [h, m] = value.slice(0, 5).split(":").map(Number)
  return h * 60 + m
}

const plannedHours = (slot: TeacherLessonSlot) => Math.ceil((toMinutes(slot.ends_at) - toMinutes(slot.starts_at)) / 60)

export default function PointageEnseignantPage() {
  const params = useParams<{ enseignantId: string }>()
  const router = useRouter()
  const { etablissementActif } = useAuthentification()
  const enseignantId = params.enseignantId
  const establishmentId = etablissementActif?.id ?? ""

  const [enseignant, setEnseignant] = useState<DonneesEnseignant | null>(null)
  const [date, setDate] = useState(localDate)
  const [slots, setSlots] = useState<TeacherLessonSlot[]>([])
  const [pointages, setPointages] = useState<TeacherLessonPointage[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")

  const charger = async () => {
    if (!establishmentId || !enseignant) return
    setLoading(true)
    try {
      const year = await enseignantPointageService.getActiveAcademicYear(establishmentId)
      if (!year?.id) throw new Error("Aucune année scolaire active.")
      const dayOfWeek = new Date(`${date}T12:00:00`).getDay() || 7
      const [schedule, records] = await Promise.all([
        enseignantPointageService.getSchedule(establishmentId, year.id, enseignantId),
        enseignantPointageService.getPointages(establishmentId, enseignantId, date, date),
      ])
      setSlots(schedule.filter((slot) => slot.day_of_week === dayOfWeek))
      setPointages(records)
      setMessage("")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossible de charger le pointage.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const tous = serviceEnseignants.obtenirTousLesEnseignants()
    setEnseignant(tous.find((item) => item.id === enseignantId) ?? null)
  }, [enseignantId])

  useEffect(() => { void charger() }, [enseignant, establishmentId, date]) // eslint-disable-line react-hooks/exhaustive-deps

  const pointageBySlot = useMemo(() => new Map(pointages.map((p) => [p.timetable_slot_id, p])), [pointages])
  const planned = slots.reduce((sum, slot) => sum + plannedHours(slot), 0)
  const counted = pointages.reduce((sum, p) => sum + Number(p.counted_hours || 0), 0)
  const dayOfWeek = new Date(`${date}T12:00:00`).getDay() || 7

  if (!enseignant) return <div className="p-6">Enseignant introuvable.</div>

  return (
    <main className="min-h-screen bg-white p-4 md:p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <Button variant="ghost" onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4" />Retour</Button>

        <div>
          <h1 className="text-2xl font-semibold">Pointage — {enseignant.prenom} {enseignant.nom}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Suivi des cours pointés à partir de l'emploi du temps.</p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm font-medium">Date
            <input type="date" className="mt-1 block rounded-md border px-3 py-2" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <div className="rounded-md border px-4 py-2 text-sm"><span className="text-muted-foreground">Prévu : </span><strong>{planned} h</strong></div>
          <div className="rounded-md border px-4 py-2 text-sm"><span className="text-muted-foreground">Pointé : </span><strong>{counted} h</strong></div>
        </div>

        {message && <p className="text-sm text-red-600">{message}</p>}

        <Card>
          <CardHeader><CardTitle className="text-base">Cours du {jours[dayOfWeek - 1] ?? "jour"}</CardTitle></CardHeader>
          <CardContent className="p-0">
            {loading ? <div className="p-8 text-center text-muted-foreground">Chargement…</div> : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead className="border-b bg-muted/30 text-left">
                    <tr><th className="px-4 py-3">Horaire</th><th className="px-4 py-3">Classe</th><th className="px-4 py-3">Matière</th><th className="px-4 py-3">Prévu</th><th className="px-4 py-3">Début</th><th className="px-4 py-3">Fin</th><th className="px-4 py-3">Compté</th><th className="px-4 py-3">Situation</th></tr>
                  </thead>
                  <tbody className="divide-y">
                    {slots.map((slot) => {
                      const record = pointageBySlot.get(slot.slot_id)
                      return <tr key={slot.slot_id}>
                        <td className="px-4 py-3 font-medium">{slot.starts_at} – {slot.ends_at}</td>
                        <td className="px-4 py-3">{slot.class_name}</td>
                        <td className="px-4 py-3">{slot.subject_name}</td>
                        <td className="px-4 py-3">{plannedHours(slot)} h</td>
                        <td className="px-4 py-3">{record?.started_time?.slice(0, 5) ?? "—"}</td>
                        <td className="px-4 py-3">{record?.ended_time?.slice(0, 5) ?? "—"}</td>
                        <td className="px-4 py-3 font-medium">{record ? `${record.counted_hours} h` : "0 h"}</td>
                        <td className="px-4 py-3">
                          {record?.status === "completed" ? <span className="inline-flex items-center gap-1 text-green-700"><Check className="h-4 w-4" />Terminé</span>
                            : record?.status === "in_progress" ? <Badge variant="outline">En cours</Badge>
                            : <span className="inline-flex items-center gap-1 text-red-600"><XCircle className="h-4 w-4" />Non pointé</span>}
                        </td>
                      </tr>
                    })}
                    {!slots.length && <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Aucun cours prévu ce jour.</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">Règle appliquée : un cours de 08h00 à 09h40 compte 2 h. À 08h40, il compte encore 2 h ; à partir de 08h41, il compte 1 h.</p>
      </div>
    </main>
  )
}
