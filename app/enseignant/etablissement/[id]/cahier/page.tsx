"use client"

import { useEffect, useState } from "react"
import { BookOpenText, CalendarDays, CheckCircle2, FileText, Loader2, Save } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { useAuthentification } from "@/providers/authentification.provider"
import { enseignantPortalService, type TeacherHomework, type TeacherLessonEntry, type TeacherScheduleSlot } from "@/services/enseignant-portal.service"
import { TeacherShell } from "@/components/enseignant/teacher-shell"

const isoDate = (date: Date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return y + "-" + m + "-" + d
}

function dateForSlot(dayOfWeek: number) {
  const today = new Date()
  const isoToday = today.getDay() === 0 ? 7 : today.getDay()
  const delta = dayOfWeek - isoToday
  const result = new Date(today)
  result.setDate(today.getDate() + delta)
  return isoDate(result)
}

export default function TeacherCahierPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { utilisateur, contexte, estEnCoursDeChargement } = useAuthentification()
  const establishment = contexte?.establishments?.find((item) => item.id === id)
  const [schedule, setSchedule] = useState<TeacherScheduleSlot[]>([])
  const [entries, setEntries] = useState<TeacherLessonEntry[]>([])
  const [homeworks, setHomeworks] = useState<TeacherHomework[]>([])
  const [selected, setSelected] = useState<TeacherScheduleSlot | null>(null)
  const [lessonDate, setLessonDate] = useState(isoDate(new Date()))
  const [homeworkDueDate, setHomeworkDueDate] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [theme, setTheme] = useState("")
  const [content, setContent] = useState("")
  const [homework, setHomework] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const loadBusinessData = async (slot: TeacherScheduleSlot, currentEntries?: TeacherLessonEntry[], currentHomeworks?: TeacherHomework[]) => {
    const lessonEntries = currentEntries ?? await enseignantPortalService.getLessonEntries(id)
    const homeworkRows = currentHomeworks ?? await enseignantPortalService.getHomework(id)
    const date = dateForSlot(slot.day_of_week)
    const entry = lessonEntries.find((row) => row.timetable_slot_id === slot.slot_id && row.lesson_date === date)
    const hw = homeworkRows.find((row) => row.timetable_slot_id === slot.slot_id && row.lesson_entry_id === (entry?.id ?? null))
    setLessonDate(date)
    setEntries(lessonEntries)
    setHomeworks(homeworkRows)
    setTheme(entry?.topic ?? "")
    setContent(entry?.content ?? "")
    setHomework(hw?.instructions ?? "")
    setHomeworkDueDate(hw?.due_date ?? "")
  }

  useEffect(() => {
    if (!estEnCoursDeChargement && (!utilisateur || utilisateur.role !== "enseignant" || !establishment)) {
      router.replace("/enseignant")
      return
    }
    if (!estEnCoursDeChargement && establishment) {
      Promise.all([enseignantPortalService.getSchedule(id), enseignantPortalService.getLessonEntries(id), enseignantPortalService.getHomework(id)])
        .then(async ([rows, lessonEntries, homeworkRows]) => {
          setSchedule(rows)
          const todayIso = new Date().getDay() === 0 ? 7 : new Date().getDay()
          const first = rows.filter((row) => row.day_of_week === todayIso).sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0] ?? rows[0] ?? null
          setSelected(first)
          if (first) await loadBusinessData(first, lessonEntries, homeworkRows)
        })
        .catch((e) => setError(e instanceof Error ? e.message : "Impossible de charger le cahier de texte."))
        .finally(() => setLoading(false))
    }
  }, [estEnCoursDeChargement, utilisateur, establishment, id, router])

  const selectSlot = async (slot: TeacherScheduleSlot) => {
    setSelected(slot)
    setMessage("")
    setError("")
    try {
      await loadBusinessData(slot)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de charger cette séance.")
    }
  }

  const save = async () => {
    if (!selected) return
    if (!theme.trim() && !content.trim() && !homework.trim()) {
      setError("Saisissez au moins le contenu du cours ou les consignes du devoir.")
      return
    }
    setSaving(true)
    setMessage("")
    setError("")
    try {
      let entryId: string | null = null
      if (theme.trim() || content.trim()) {
        entryId = await enseignantPortalService.saveLessonEntry(id, selected.slot_id, lessonDate, theme, content)
      }
      if (homework.trim()) {
        await enseignantPortalService.saveHomework(id, selected.slot_id, entryId, "Devoir", homework, homeworkDueDate || undefined)
      }
      const [nextEntries, nextHomeworks] = await Promise.all([
        enseignantPortalService.getLessonEntries(id),
        enseignantPortalService.getHomework(id),
      ])
      setEntries(nextEntries)
      setHomeworks(nextHomeworks)
      setMessage("Le cahier et le devoir ont été enregistrés dans l’établissement.")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Enregistrement impossible.")
    } finally {
      setSaving(false)
    }
  }

  if (estEnCoursDeChargement || !utilisateur || !establishment) return <main className="min-h-screen flex items-center justify-center bg-[#f8f8fc]"><Loader2 className="h-5 w-5 animate-spin" /></main>

  return (
    <TeacherShell establishmentId={id} establishmentName={establishment.name} active="cahier">
      <header className="border-b border-[#e4e6ef] pb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#3152c8]">Suivi pédagogique</p>
        <h1 className="mt-1 text-2xl font-bold">Cahier de texte & devoirs</h1>
        <p className="mt-1 text-sm text-[#6d7280]">Le contenu est maintenant enregistré dans l’établissement et non plus seulement sur le téléphone.</p>
      </header>

      {error && <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {loading ? <div className="py-16 text-center text-sm text-[#6d7280]"><Loader2 className="mx-auto h-5 w-5 animate-spin" /><p className="mt-2">Chargement des cours…</p></div> : (
        <>
          <section className="mt-5">
            <div className="mb-3 flex items-center justify-between"><div><h2 className="font-bold">Séances</h2><p className="text-sm text-[#6d7280]">Choisissez le cours à renseigner.</p></div><CalendarDays className="h-5 w-5 text-[#707788]" /></div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {schedule.slice(0, 12).map((slot) => <button key={slot.slot_id} type="button" onClick={() => void selectSlot(slot)} className={"min-w-[190px] rounded-md border p-3 text-left " + (selected?.slot_id === slot.slot_id ? "border-[#7890ef] bg-[#edf1ff]" : "border-[#e1e3eb] bg-white")}>
                <p className="text-xs text-[#6d7280]">{["","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"][slot.day_of_week] ?? "Jour"} · {slot.starts_at.slice(0,5)}</p>
                <p className="mt-1 font-semibold">{slot.subject_name}</p>
                <p className="mt-0.5 text-xs text-[#6d7280]">{slot.class_name}</p>
              </button>)}
              {!schedule.length && <div className="w-full rounded-md border border-dashed p-6 text-center text-sm text-[#6d7280]">Aucun cours disponible dans votre emploi du temps.</div>}
            </div>
          </section>

          {selected && <section className="mt-5 grid gap-4 lg:grid-cols-[1.3fr_.7fr]">
            <div className="rounded-md border border-[#e1e3eb] bg-white">
              <div className="border-b px-4 py-3"><p className="text-xs text-[#6d7280]">Séance sélectionnée · {lessonDate}</p><h2 className="font-bold">{selected.subject_name} · {selected.class_name}</h2><p className="text-sm text-[#6d7280]">{selected.starts_at.slice(0,5)}–{selected.ends_at.slice(0,5)}{selected.room ? " · Salle " + selected.room : ""}</p></div>
              <div className="space-y-4 p-4">
                <label className="block text-sm font-medium">Thème du cours<input value={theme} onChange={(e) => setTheme(e.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-[#dfe2ec] px-3 outline-none focus:border-[#7890ef]" /></label>
                <label className="block text-sm font-medium">Contenu et activités<textarea value={content} onChange={(e) => setContent(e.target.value)} rows={7} placeholder="Décrivez ce qui a été enseigné et les activités réalisées…" className="mt-1.5 w-full resize-y rounded-md border border-[#dfe2ec] p-3 outline-none focus:border-[#7890ef]" /></label>
              </div>
            </div>

            <div className="rounded-md border border-[#e1e3eb] bg-white">
              <div className="border-b px-4 py-3"><div className="flex items-center gap-2"><FileText className="h-4 w-4 text-[#2944a8]" /><h2 className="font-semibold">Devoir à donner</h2></div></div>
              <div className="space-y-4 p-4">
                <label className="block text-sm font-medium">Consignes<textarea value={homework} onChange={(e) => setHomework(e.target.value)} rows={7} placeholder="Exercices, lecture, recherche ou travail à préparer…" className="mt-1.5 w-full resize-y rounded-md border border-[#dfe2ec] p-3 outline-none focus:border-[#7890ef]" /></label>
                <label className="block text-sm font-medium">Date de remise<input type="date" value={homeworkDueDate} onChange={(e) => setHomeworkDueDate(e.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-[#dfe2ec] px-3" /></label>
                <button type="button" onClick={() => void save()} disabled={saving} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#0b2b83] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Enregistrer
                </button>
                {message && <p className="flex items-center gap-2 text-sm text-[#277047]"><CheckCircle2 className="h-4 w-4" />{message}</p>}
              </div>
            </div>
          </section>}

          {!selected && <div className="mt-6 rounded-md border border-dashed p-8 text-center text-sm text-[#6d7280]"><BookOpenText className="mx-auto h-7 w-7" /><p className="mt-2">Sélectionnez une séance pour commencer.</p></div>}
        </>
      )}
    </TeacherShell>
  )
}
