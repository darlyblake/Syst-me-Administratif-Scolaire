"use client"

import { useEffect, useMemo, useState } from "react"
import { CalendarDays, Clock3, Loader2, QrCode } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { useAuthentification } from "@/providers/authentification.provider"
import { enseignantPortalService, type TeacherScheduleSlot } from "@/services/enseignant-portal.service"
import { enseignantPointageService, type TeacherLessonPointage } from "@/services/enseignant-pointage.service"
import { TeacherShell } from "@/components/enseignant/teacher-shell"

const labels = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"]

function startOfWeek(date: Date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export default function TeacherPlanningPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { utilisateur, contexte, estEnCoursDeChargement } = useAuthentification()
  const establishment = contexte?.establishments?.find((item) => item.id === id)
  const [schedule, setSchedule] = useState<TeacherScheduleSlot[]>([])
  const [pointages, setPointages] = useState<TeacherLessonPointage[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<"planning" | "pointage">("planning")
  const [week, setWeek] = useState(new Date())

  const load = async () => {
    setLoading(true)
    try {
      const [slots, context] = await Promise.all([
        enseignantPortalService.getSchedule(id),
        enseignantPointageService.getContext(id),
      ])
      setSchedule(slots)
      const teacherId = context?.[0]?.teacher_id
      if (teacherId) {
        const start = startOfWeek(week)
        const end = new Date(start)
        end.setDate(end.getDate() + 6)
        const fmt = (d: Date) => d.toISOString().slice(0, 10)
        setPointages(await enseignantPointageService.getPointages(id, teacherId, fmt(start), fmt(end)))
      }
    } catch {
      setSchedule([])
      setPointages([])
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
  }, [estEnCoursDeChargement, utilisateur, establishment, id, week])

  const weekStart = startOfWeek(week)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  const weekLabel = weekStart.toLocaleDateString("fr-FR", { day: "2-digit", month: "long" }) + " – " + weekEnd.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })

  const grouped = useMemo(() => {
    const map = new Map<number, TeacherScheduleSlot[]>()
    schedule.forEach((slot) => {
      const list = map.get(slot.day_of_week) ?? []
      list.push(slot)
      map.set(slot.day_of_week, list)
    })
    map.forEach((list) => list.sort((a, b) => a.starts_at.localeCompare(b.starts_at)))
    return map
  }, [schedule])

  if (estEnCoursDeChargement || !utilisateur || !establishment) return <main className="min-h-screen flex items-center justify-center bg-[#f8f8fc]"><Loader2 className="h-5 w-5 animate-spin" /></main>

  return (
    <TeacherShell establishmentId={id} establishmentName={establishment.name} active="planning">
      <header className="border-b border-[#e4e6ef] pb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#3152c8]">Organisation</p>
        <h1 className="mt-1 text-2xl font-bold">Planning</h1>
        <p className="mt-1 text-sm text-[#6d7280]">Emploi du temps et suivi de votre pointage.</p>
      </header>

      <div className="mt-5 inline-flex rounded-lg border border-[#dfe2ec] bg-white p-1">
        <button type="button" onClick={() => setMode("planning")} className={"rounded-md px-4 py-2 text-sm font-semibold " + (mode === "planning" ? "bg-[#0b2b83] text-white" : "text-[#646b79]")}>Emploi du temps</button>
        <button type="button" onClick={() => setMode("pointage")} className={"rounded-md px-4 py-2 text-sm font-semibold " + (mode === "pointage" ? "bg-[#0b2b83] text-white" : "text-[#646b79]")}>Pointage personnel</button>
      </div>

      {loading ? <div className="py-16 text-center text-sm text-[#6d7280]"><Loader2 className="mx-auto h-5 w-5 animate-spin" /><p className="mt-2">Chargement…</p></div> : mode === "planning" ? (
        <>
          <div className="mt-5 flex items-center justify-between gap-3">
            <div><p className="text-sm font-semibold">Semaine</p><p className="text-sm text-[#6d7280]">{weekLabel}</p></div>
            <div className="flex gap-1"><button type="button" onClick={() => setWeek(new Date(weekStart.getTime() - 7 * 86400000))} className="rounded-md border bg-white px-3 py-2 text-sm">‹</button><button type="button" onClick={() => setWeek(new Date())} className="rounded-md border bg-white px-3 py-2 text-sm">Aujourd’hui</button><button type="button" onClick={() => setWeek(new Date(weekStart.getTime() + 7 * 86400000))} className="rounded-md border bg-white px-3 py-2 text-sm">›</button></div>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {labels.map((label, index) => {
              const date = new Date(weekStart)
              date.setDate(date.getDate() + index)
              const selected = date.toDateString() === new Date().toDateString()
              return <div key={label} className={"min-w-[88px] rounded-lg border px-3 py-2 " + (selected ? "border-[#7890ef] bg-[#edf1ff]" : "border-[#e2e4eb] bg-white")}>
                <p className="text-xs text-[#6d7280]">{label}</p><p className="mt-0.5 font-bold">{date.getDate()}</p>
              </div>
            })}
          </div>

          <div className="mt-4 space-y-2">
            {Array.from({ length: 6 }, (_, i) => i + 1).map((day) => (
              <section key={day} className="rounded-lg border border-[#e2e4eb] bg-white">
                <div className="border-b px-4 py-3"><h2 className="font-semibold">{labels[day - 1]}</h2></div>
                <div className="divide-y">
                  {(grouped.get(day) ?? []).map((slot) => <div key={slot.slot_id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-24 shrink-0 text-sm font-semibold">{slot.starts_at.slice(0,5)}–{slot.ends_at.slice(0,5)}</div>
                    <div className="min-w-0 flex-1"><p className="font-semibold">{slot.subject_name}</p><p className="text-sm text-[#6d7280]">{slot.class_name}{slot.room ? " · Salle " + slot.room : ""}</p></div>
                  </div>)}
                  {!(grouped.get(day) ?? []).length && <p className="px-4 py-3 text-sm text-[#8a90a0]">Aucun cours.</p>}
                </div>
              </section>
            ))}
          </div>
        </>
      ) : (
        <>
          <section className="mt-5 rounded-lg border border-[#e2e4eb] bg-white p-4">
            <div className="flex items-center gap-3"><Clock3 className="h-5 w-5 text-[#2944a8]" /><div><p className="font-semibold">Pointage de la semaine</p><p className="text-sm text-[#6d7280]">Les heures sont calculées à partir de vos cours pointés.</p></div></div>
            <button type="button" onClick={() => router.push("/enseignant/etablissement/" + id + "/pointage")} className="mt-4 inline-flex items-center gap-2 rounded-md bg-[#0b2b83] px-4 py-2.5 text-sm font-semibold text-white"><QrCode className="h-4 w-4" />Ouvrir le pointage</button>
          </section>
          <section className="mt-4 rounded-lg border border-[#e2e4eb] bg-white">
            <div className="border-b px-4 py-3"><h2 className="font-semibold">Historique</h2></div>
            <div className="divide-y">
              {pointages.map((p) => <div key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm"><span className="w-24 text-[#6d7280]">{new Date(p.attendance_date + "T12:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}</span><span className="min-w-0 flex-1 font-medium">{p.started_time?.slice(0,5) ?? "—"} → {p.ended_time?.slice(0,5) ?? "—"}</span><span className="text-[#6d7280]">{p.counted_hours} h</span><span className="rounded-full bg-[#eef0f4] px-2 py-1 text-xs">{p.status === "completed" ? "Terminé" : p.status === "in_progress" ? "En cours" : "À vérifier"}</span></div>)}
              {!pointages.length && <p className="p-8 text-center text-sm text-[#6d7280]">Aucun pointage sur cette semaine.</p>}
            </div>
          </section>
        </>
      )}
    </TeacherShell>
  )
}
