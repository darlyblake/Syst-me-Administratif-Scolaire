"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Check, AlertTriangle, Clock3, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuthentification } from "@/providers/authentification.provider"
import { obtenirEnseignantsSupabase } from "@/services/enseignants.supabase.service"
import { enseignantPointageService, type TeacherLessonPointage, type TeacherLessonSlot, type TeacherWeeklySummary } from "@/services/enseignant-pointage.service"
import type { DonneesEnseignant } from "@/types/models"

const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"]

const localDate = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}
const minutes = (v: string) => {
  const [h, m] = v.slice(0, 5).split(":").map(Number)
  return h * 60 + m
}
const volume = (slot: TeacherLessonSlot) => Math.max(0, Math.ceil((minutes(slot.ends_at) - minutes(slot.starts_at)) / 60))
const weekStart = (date: string) => {
  const d = new Date(`${date}T12:00:00`)
  const day = d.getDay() || 7
  d.setDate(d.getDate() - day + 1)
  return d.toISOString().slice(0, 10)
}
const shiftWeek = (date: string, amount: number) => {
  const d = new Date(`${date}T12:00:00`)
  d.setDate(d.getDate() + amount * 7)
  return d.toISOString().slice(0, 10)
}
const formatWeek = (start: string) => {
  const d = new Date(`${start}T12:00:00`)
  const end = new Date(d)
  end.setDate(end.getDate() + 6)
  return `${d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} au ${end.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`
}

export default function PointageEnseignantPage() {
  const params = useParams<{ enseignantId: string }>()
  const router = useRouter()
  const { etablissementActif } = useAuthentification()
  const establishmentId = etablissementActif?.id ?? ""
  const enseignantId = params.enseignantId

  const [teachers, setTeachers] = useState<DonneesEnseignant[]>([])
  const [selected, setSelected] = useState<DonneesEnseignant | null>(null)
  const [summary, setSummary] = useState<TeacherWeeklySummary | null>(null)
  const [slots, setSlots] = useState<TeacherLessonSlot[]>([])
  const [records, setRecords] = useState<TeacherLessonPointage[]>([])
  const [date, setDate] = useState(localDate)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    if (!establishmentId || !enseignantId) return
    setLoading(true)
    setError(null)
    try {
      const year = await enseignantPointageService.getActiveAcademicYear(establishmentId)
      if (!year?.id) throw new Error("Aucune année scolaire active.")
      const allTeachers = await obtenirEnseignantsSupabase(establishmentId)
      const current = allTeachers.find((item) => item.id === enseignantId)
      if (!current) throw new Error("Enseignant introuvable dans cet établissement.")
      const start = weekStart(date)
      const endDate = new Date(`${start}T12:00:00`)
      endDate.setDate(endDate.getDate() + 6)
      const end = endDate.toISOString().slice(0, 10)
      const [weekly, schedule, pointages] = await Promise.all([
        enseignantPointageService.getWeeklySummary(establishmentId, enseignantId, start),
        enseignantPointageService.getSchedule(establishmentId, year.id, enseignantId),
        enseignantPointageService.getPointages(establishmentId, enseignantId, start, end),
      ])
      setTeachers(allTeachers)
      setSelected(current)
      setSummary(weekly)
      setSlots(schedule)
      setRecords(pointages)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de charger le pointage.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [establishmentId, enseignantId, date]) // eslint-disable-line react-hooks/exhaustive-deps

  const recordsByKey = useMemo(() => new Map(records.map((record) => [`${record.attendance_date}|${record.timetable_slot_id}`, record])), [records])
  const rows = useMemo(() => slots.flatMap((slot) => {
    const start = new Date(`${weekStart(date)}T12:00:00`)
    start.setDate(start.getDate() + slot.day_of_week - 1)
    const attendanceDate = start.toISOString().slice(0, 10)
    return [{ slot, attendanceDate, record: recordsByKey.get(`${attendanceDate}|${slot.slot_id}`) }]
  }), [slots, recordsByKey, date])

  if (!selected && loading) return <main className="p-6 text-sm text-muted-foreground">Chargement du pointage…</main>
  if (!selected) return <main className="p-6"><p className="text-sm text-red-600">{error ?? "Enseignant introuvable."}</p></main>

  return (
    <main className="min-h-screen bg-white p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-wrap items-center gap-3 border-b pb-5">
          <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Retour"><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Pointage du personnel enseignant</p>
            <h1 className="text-2xl font-semibold">{selected.prenom} {selected.nom}</h1>
            <p className="text-sm text-muted-foreground">{selected.matieres?.join(", ") || "Enseignant"}</p>
          </div>
          <Button variant="outline" size="sm" className="ml-auto" onClick={() => void load()} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Actualiser</Button>
        </div>

        <div className="border bg-muted/20 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-terre">Suivi administratif</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium">Enseignant
              <select className="ml-2 border bg-white px-3 py-2 font-normal" value={enseignantId} onChange={(e) => router.push(`/ecole/enseignants/${e.target.value}/pointage`)}>
                {teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.prenom} {teacher.nom}</option>)}
              </select>
            </label>
            <span className="text-sm text-muted-foreground">Les heures insuffisantes sont signalées pour suivi, sans retenue automatique.</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setDate(shiftWeek(date, -1))}>Semaine précédente</Button>
          <div className="min-w-64 border px-4 py-2 text-center text-sm font-medium">{formatWeek(weekStart(date))}</div>
          <Button variant="outline" size="sm" onClick={() => setDate(shiftWeek(date, 1))}>Semaine suivante</Button>
          <input type="date" className="border px-3 py-2 text-sm" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        {error && <p className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        <section className="border">
          <div className="grid divide-y sm:grid-cols-5 sm:divide-x sm:divide-y-0">
            <Metric label="Heures prévues" value={`${summary?.planned_hours ?? 0} h`} />
            <Metric label="Heures pointées" value={`${summary?.counted_hours ?? 0} h`} />
            <Metric label="Cours pointés" value={`${summary?.pointed_courses ?? 0} / ${summary?.scheduled_courses ?? 0}`} />
            <Metric label="Cours non pointés" value={String(summary?.missing_courses ?? 0)} />
            <Metric label="Écart" value={`${summary?.difference_hours ?? 0} h`} />
          </div>
        </section>

        <section className="border">
          <div className="border-b px-4 py-4">
            <h2 className="font-semibold">Détail de la semaine</h2>
            <p className="mt-1 text-sm text-muted-foreground">Le responsable voit les cours prévus, les pointages et le volume réellement comptabilisé.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-sm">
              <thead className="border-b bg-muted/30 text-left text-muted-foreground">
                <tr><th className="px-4 py-3">Jour</th><th className="px-4 py-3">Horaire</th><th className="px-4 py-3">Classe</th><th className="px-4 py-3">Matière</th><th className="px-4 py-3">Prévu</th><th className="px-4 py-3">Début</th><th className="px-4 py-3">Fin</th><th className="px-4 py-3">Compté</th><th className="px-4 py-3">Situation</th></tr>
              </thead>
              <tbody className="divide-y">
                {rows.map(({ slot, attendanceDate, record }) => (
                  <tr key={`${attendanceDate}|${slot.slot_id}`}>
                    <td className="px-4 py-3 font-medium">{JOURS[slot.day_of_week - 1] ?? "—"}<span className="block text-xs text-muted-foreground">{new Date(`${attendanceDate}T12:00:00`).toLocaleDateString("fr-FR")}</span></td>
                    <td className="px-4 py-3">{slot.starts_at} – {slot.ends_at}</td>
                    <td className="px-4 py-3">{slot.class_name}</td>
                    <td className="px-4 py-3">{slot.subject_name}</td>
                    <td className="px-4 py-3">{volume(slot)} h</td>
                    <td className="px-4 py-3">{record?.started_time?.slice(0, 5) ?? "—"}</td>
                    <td className="px-4 py-3">{record?.ended_time?.slice(0, 5) ?? "—"}</td>
                    <td className="px-4 py-3 font-medium">{record ? `${record.counted_hours} h` : "0 h"}</td>
                    <td className="px-4 py-3">{record?.status === "completed" ? <span className="inline-flex items-center gap-1 text-green-700"><Check className="h-4 w-4" />Terminé</span> : record?.status === "in_progress" ? <span className="inline-flex items-center gap-1 text-blue-700"><Clock3 className="h-4 w-4" />En cours</span> : <span className="inline-flex items-center gap-1 text-red-700"><AlertTriangle className="h-4 w-4" />Non pointé</span>}</td>
                  </tr>
                ))}
                {!rows.length && <tr><td colSpan={9} className="p-10 text-center text-muted-foreground">Aucun cours dans l'emploi du temps de cette semaine.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section className="border">
          <div className="border-b px-4 py-4">
            <h2 className="font-semibold">Enseignants de l'établissement</h2>
            <p className="mt-1 text-sm text-muted-foreground">Sélectionnez un enseignant pour consulter son suivi hebdomadaire.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="border-b bg-muted/30 text-left text-muted-foreground"><tr><th className="px-4 py-3">Enseignant</th><th className="px-4 py-3">Matières</th><th className="px-4 py-3">Statut</th><th className="px-4 py-3">Action</th></tr></thead>
              <tbody className="divide-y">
                {teachers.map((teacher) => <tr key={teacher.id} className={teacher.id === enseignantId ? "bg-muted/20" : ""}><td className="px-4 py-3 font-medium">{teacher.prenom} {teacher.nom}</td><td className="px-4 py-3">{teacher.matieres?.join(", ") || "—"}</td><td className="px-4 py-3">{teacher.statut === "actif" ? "Actif" : "Inactif"}</td><td className="px-4 py-3"><Button variant="outline" size="sm" onClick={() => router.push(`/ecole/enseignants/${teacher.id}/pointage`)}>Voir le pointage</Button></td></tr>)}
              </tbody>
            </table>
          </div>
        </section>

        <p className="text-xs text-muted-foreground">Le manque d'heures est signalé pour suivi administratif. Il ne déclenche aucune sanction ni retenue automatique.</p>
      </div>
    </main>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="px-4 py-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-lg font-semibold">{value}</p></div>
}
