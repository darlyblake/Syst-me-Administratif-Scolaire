"use client"

import { useEffect, useMemo, useState } from "react"
import { BookOpenText, CheckCircle2, FileText, Loader2, Plus, Save, Search } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { useAuthentification } from "@/providers/authentification.provider"
import {
  enseignantPortalService,
  type TeacherHomework,
  type TeacherLessonEntry,
  type TeacherScheduleSlot,
} from "@/services/enseignant-portal.service"
import { TeacherShell } from "@/components/enseignant/teacher-shell"

const dayNames = ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]

const isoDate = (date: Date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return y + "-" + m + "-" + d
}

function dateForSlot(dayOfWeek: number) {
  const today = new Date()
  const todayIso = today.getDay() === 0 ? 7 : today.getDay()
  const result = new Date(today)
  result.setDate(today.getDate() + dayOfWeek - todayIso)
  return isoDate(result)
}

export default function TeacherCahierPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { utilisateur, contexte, estEnCoursDeChargement } = useAuthentification()
  const establishment = contexte?.establishments?.find((item) => item.id === id)

  const [section, setSection] = useState<"cahier" | "devoirs">("cahier")
  const [schedule, setSchedule] = useState<TeacherScheduleSlot[]>([])
  const [entries, setEntries] = useState<TeacherLessonEntry[]>([])
  const [homeworks, setHomeworks] = useState<TeacherHomework[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const [search, setSearch] = useState("")
  const [classFilter, setClassFilter] = useState("all")
  const [subjectFilter, setSubjectFilter] = useState("all")
  const [periodFilter, setPeriodFilter] = useState("all")

  const [selectedSlotId, setSelectedSlotId] = useState("")
  const [lessonDate, setLessonDate] = useState(isoDate(new Date()))
  const [topic, setTopic] = useState("")
  const [content, setContent] = useState("")
  const [activities, setActivities] = useState("")

  const [homeworkEntryId, setHomeworkEntryId] = useState("")
  const [homeworkTitle, setHomeworkTitle] = useState("")
  const [homeworkInstructions, setHomeworkInstructions] = useState("")
  const [homeworkDueDate, setHomeworkDueDate] = useState("")

  const selectedSlot = schedule.find((slot) => slot.slot_id === selectedSlotId) ?? null
  const selectedEntry = entries.find((entry) => entry.id === homeworkEntryId) ?? null

  const load = async () => {
    const [rows, lessonRows, homeworkRows] = await Promise.all([
      enseignantPortalService.getSchedule(id),
      enseignantPortalService.getLessonEntries(id),
      enseignantPortalService.getHomework(id),
    ])
    setSchedule(rows)
    setEntries(lessonRows)
    setHomeworks(homeworkRows)

    const firstEntry = lessonRows[0]
    const firstSlot = rows.find((slot) => slot.slot_id === firstEntry?.timetable_slot_id) ?? rows[0]
    if (firstSlot) {
      setSelectedSlotId(firstSlot.slot_id)
      setLessonDate(firstEntry?.lesson_date ?? dateForSlot(firstSlot.day_of_week))
    }
    if (firstEntry) {
      const existingHomework = homeworkRows.find((item) => item.lesson_entry_id === firstEntry.id)
      if (existingHomework) {
        setHomeworkEntryId(firstEntry.id)
        setHomeworkTitle(existingHomework.title)
        setHomeworkInstructions(existingHomework.instructions)
        setHomeworkDueDate(existingHomework.due_date ?? "")
      }
    }
  }

  useEffect(() => {
    if (!estEnCoursDeChargement && (!utilisateur || utilisateur.role !== "enseignant" || !establishment)) {
      router.replace("/enseignant")
      return
    }

    if (!estEnCoursDeChargement && establishment) {
      load()
        .catch((e) => setError(e instanceof Error ? e.message : "Impossible de charger le cahier de textes."))
        .finally(() => setLoading(false))
    }
  }, [estEnCoursDeChargement, utilisateur, establishment, id, router])

  const classOptions = useMemo(
    () => Array.from(new Map(schedule.map((item) => [item.class_id, item.class_name])).entries()),
    [schedule],
  )
  const subjectOptions = useMemo(
    () => Array.from(new Map(schedule.map((item) => [item.subject_id, item.subject_name])).entries()),
    [schedule],
  )

  const periodOptions = useMemo(
    () =>
      Array.from(
        new Map(
          schedule.map((item) => [
            item.slot_id,
            item.starts_at.slice(0, 5) + "–" + item.ends_at.slice(0, 5),
          ]),
        ).entries(),
      ).sort((a, b) => a[1].localeCompare(b[1])),
    [schedule],
  )

  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase()
    return entries.filter((entry) => {
      const matchClass = classFilter === "all" || entry.class_id === classFilter
      const matchSubject = subjectFilter === "all" || entry.subject_id === subjectFilter
      const matchPeriod = periodFilter === "all" || entry.timetable_slot_id === periodFilter
      const matchSearch =
        !q ||
        [entry.class_name, entry.subject_name, entry.topic, entry.content, entry.activities ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(q)
      return matchClass && matchSubject && matchPeriod && matchSearch
    })
  }, [entries, search, classFilter, subjectFilter, periodFilter])

  const filteredHomework = useMemo(() => {
    const q = search.trim().toLowerCase()
    return homeworks.filter((item) => {
      const matchClass = classFilter === "all" || item.class_id === classFilter
      const matchSubject = subjectFilter === "all" || item.subject_id === subjectFilter
      const matchSearch =
        !q ||
        [item.title, item.instructions, item.class_name, item.subject_name]
          .join(" ")
          .toLowerCase()
          .includes(q)
      return matchClass && matchSubject && matchSearch
    })
  }, [homeworks, search, classFilter, subjectFilter])

  const availableHomeworkEntries = useMemo(
    () =>
      entries
        .filter((entry) => classFilter === "all" || entry.class_id === classFilter)
        .filter((entry) => subjectFilter === "all" || entry.subject_id === subjectFilter)
        .sort((a, b) => b.lesson_date.localeCompare(a.lesson_date)),
    [entries, classFilter, subjectFilter],
  )

  const resetMessage = () => {
    setMessage("")
    setError("")
  }

  const openLessonForm = () => {
    resetMessage()
    setShowAdd(true)
    setSection("cahier")
    if (!selectedSlotId && schedule[0]) {
      setSelectedSlotId(schedule[0].slot_id)
      setLessonDate(dateForSlot(schedule[0].day_of_week))
    }
  }

  const openHomeworkForm = () => {
    resetMessage()
    setShowAdd(true)
    setSection("devoirs")
    if (!homeworkEntryId && availableHomeworkEntries[0]) {
      const entry = availableHomeworkEntries[0]
      setHomeworkEntryId(entry.id)
      const existing = homeworks.find((item) => item.lesson_entry_id === entry.id)
      setHomeworkTitle(existing?.title ?? "")
      setHomeworkInstructions(existing?.instructions ?? "")
      setHomeworkDueDate(existing?.due_date ?? "")
    }
  }

  const handleSlotChange = (slotId: string) => {
    setSelectedSlotId(slotId)
    const slot = schedule.find((item) => item.slot_id === slotId)
    if (!slot) return
    const existing = entries
      .filter((entry) => entry.timetable_slot_id === slotId)
      .sort((a, b) => b.lesson_date.localeCompare(a.lesson_date))[0]
    setLessonDate(existing?.lesson_date ?? dateForSlot(slot.day_of_week))
    setTopic(existing?.topic ?? "")
    setContent(existing?.content ?? "")
    setActivities(existing?.activities ?? "")
  }

  const handleLessonDateChange = (value: string) => {
    setLessonDate(value)
    const date = new Date(value + "T12:00:00")
    const isoDay = date.getDay() === 0 ? 7 : date.getDay()
    if (selectedSlot && selectedSlot.day_of_week !== isoDay) {
      setError(
        "La date choisie ne correspond pas au jour de ce créneau. Sélectionnez une date qui tombe un " +
          dayNames[selectedSlot.day_of_week] +
          ".",
      )
    } else {
      setError("")
    }
  }

  const saveLesson = async () => {
    if (!selectedSlot) {
      setError("Sélectionnez une période de cours.")
      return
    }
    if (!topic.trim() && !content.trim() && !activities.trim()) {
      setError("Renseignez au moins le thème, le contenu ou les activités.")
      return
    }
    const date = new Date(lessonDate + "T12:00:00")
    const isoDay = date.getDay() === 0 ? 7 : date.getDay()
    if (isoDay !== selectedSlot.day_of_week) {
      setError("La date doit correspondre au jour du créneau choisi dans l'emploi du temps.")
      return
    }

    setSaving(true)
    resetMessage()
    try {
      await enseignantPortalService.saveLessonEntry(
        id,
        selectedSlot.slot_id,
        lessonDate,
        topic,
        content,
        activities,
      )
      await load()
      setShowAdd(false)
      setMessage("La séance a été enregistrée dans le cahier de textes.")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible d'enregistrer la séance.")
    } finally {
      setSaving(false)
    }
  }

  const handleHomeworkEntryChange = (entryId: string) => {
    setHomeworkEntryId(entryId)
    const existing = homeworks.find((item) => item.lesson_entry_id === entryId)
    setHomeworkTitle(existing?.title ?? "")
    setHomeworkInstructions(existing?.instructions ?? "")
    setHomeworkDueDate(existing?.due_date ?? "")
  }

  const saveHomework = async () => {
    const entry = entries.find((item) => item.id === homeworkEntryId)
    if (!entry) {
      setError("Sélectionnez d'abord un chapitre du cahier de textes.")
      return
    }
    if (!homeworkTitle.trim() || !homeworkInstructions.trim()) {
      setError("Le titre et les consignes du devoir sont obligatoires.")
      return
    }

    setSaving(true)
    resetMessage()
    try {
      await enseignantPortalService.saveHomework(
        id,
        entry.timetable_slot_id,
        entry.id,
        homeworkTitle,
        homeworkInstructions,
        homeworkDueDate || undefined,
      )
      await load()
      setShowAdd(false)
      setMessage("Le devoir a été rattaché à la séance du cahier de textes.")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible d'enregistrer le devoir.")
    } finally {
      setSaving(false)
    }
  }

  if (estEnCoursDeChargement || !utilisateur || !establishment) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8f8fc]">
        <Loader2 className="h-5 w-5 animate-spin" />
      </main>
    )
  }

  return (
    <TeacherShell establishmentId={id} establishmentName={establishment.name} active="cahier">
      <header className="border-b border-[#e4e6ef] pb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#3152c8]">Suivi pédagogique</p>
        <h1 className="mt-1 text-2xl font-bold">Cahier de textes</h1>
        <p className="mt-1 text-sm text-[#6d7280]">
          Historique des séances et devoirs rattachés à l'enseignement de l'année académique active.
        </p>
      </header>

      {message && (
        <div className="mt-4 flex items-center gap-2 border-l-4 border-[#277047] bg-[#eef8f1] px-4 py-3 text-sm text-[#277047]">
          <CheckCircle2 className="h-4 w-4" />
          {message}
        </div>
      )}
      {error && (
        <div className="mt-4 border-l-4 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <nav className="mt-5 flex border-b border-[#dfe2eb]" aria-label="Sections du cahier">
        <button
          type="button"
          onClick={() => { setSection("cahier"); setShowAdd(false); resetMessage() }}
          className={section === "cahier" ? "border-b-2 border-[#0b2b83] px-4 py-3 text-sm font-semibold text-[#0b2b83]" : "px-4 py-3 text-sm font-medium text-[#6d7280] hover:text-[#202532]"}
        >
          Cahier de textes
        </button>
        <button
          type="button"
          onClick={() => { setSection("devoirs"); setShowAdd(false); resetMessage() }}
          className={section === "devoirs" ? "border-b-2 border-[#0b2b83] px-4 py-3 text-sm font-semibold text-[#0b2b83]" : "px-4 py-3 text-sm font-medium text-[#6d7280] hover:text-[#202532]"}
        >
          Devoirs
        </button>
      </nav>

      <section className="mt-5 border-b border-[#dfe2eb] pb-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex-1">
            <h2 className="font-bold">{section === "cahier" ? "Historique du cahier de textes" : "Historique des devoirs"}</h2>
            <p className="text-sm text-[#6d7280]">
              {section === "cahier"
                ? "Les séances sont liées uniquement aux classes, matières et périodes prévues dans votre emploi du temps."
                : "Chaque devoir est rattaché à une séance précise du cahier de textes."}
            </p>
          </div>
          <button
            type="button"
            onClick={section === "cahier" ? openLessonForm : openHomeworkForm}
            className="inline-flex h-10 items-center justify-center gap-2 bg-[#0b2b83] px-4 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
            {section === "cahier" ? "Ajouter une séance" : "Ajouter un devoir"}
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="relative block">
            <span className="sr-only">Rechercher</span>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a90a0]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={section === "cahier" ? "Thème, contenu, classe…" : "Devoir, consignes, classe…"}
              className="h-10 w-full border border-[#dfe2ec] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#7890ef]"
            />
          </label>
          <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="h-10 border border-[#dfe2ec] bg-white px-3 text-sm">
            <option value="all">Toutes les classes</option>
            {classOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className="h-10 border border-[#dfe2ec] bg-white px-3 text-sm">
            <option value="all">Toutes les matières</option>
            {subjectOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          {section === "cahier" ? (
            <select value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)} className="h-10 border border-[#dfe2ec] bg-white px-3 text-sm">
              <option value="all">Toutes les périodes de cours</option>
              {periodOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          ) : (
            <div className="h-10 border border-[#eef0f5] bg-[#fafbfc] px-3 py-2 text-xs text-[#6d7280]">
              Année, établissement et enseignant déjà définis
            </div>
          )}
        </div>
      </section>

      {loading ? (
        <div className="py-16 text-center text-sm text-[#6d7280]">
          <Loader2 className="mx-auto h-5 w-5 animate-spin" />
          <p className="mt-2">Chargement…</p>
        </div>
      ) : section === "cahier" ? (
        <section className="mt-5">
          <div className="overflow-x-auto border border-[#dfe2eb] bg-white">
            <table className="min-w-full text-sm">
              <thead className="border-b border-[#dfe2eb] bg-[#f7f8fb] text-left text-xs uppercase tracking-wide text-[#737989]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Période</th>
                  <th className="px-4 py-3 font-semibold">Classe</th>
                  <th className="px-4 py-3 font-semibold">Matière</th>
                  <th className="px-4 py-3 font-semibold">Thème / chapitre</th>
                  <th className="px-4 py-3 font-semibold">Devoir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf0f5]">
                {filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-[#fafbfe]">
                    <td className="whitespace-nowrap px-4 py-3">{entry.lesson_date}</td>
                    <td className="whitespace-nowrap px-4 py-3">{entry.starts_at.slice(0, 5)}–{entry.ends_at.slice(0, 5)}</td>
                    <td className="px-4 py-3 font-medium">{entry.class_name}</td>
                    <td className="px-4 py-3">{entry.subject_name}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{entry.topic || "Sans titre"}</p>
                      {entry.content && <p className="mt-1 max-w-md truncate text-xs text-[#6d7280]">{entry.content}</p>}
                    </td>
                    <td className="px-4 py-3">
                      {homeworks.some((item) => item.lesson_entry_id === entry.id) ? (
                        <span className="inline-flex items-center gap-1 text-[#277047]"><FileText className="h-4 w-4" /> Rattaché</span>
                      ) : (
                        <span className="text-[#8a90a0]">Aucun</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filteredEntries.length && <p className="p-10 text-center text-sm text-[#6d7280]">Aucune séance ne correspond aux filtres.</p>}
          </div>
        </section>
      ) : (
        <section className="mt-5">
          <div className="overflow-x-auto border border-[#dfe2eb] bg-white">
            <table className="min-w-full text-sm">
              <thead className="border-b border-[#dfe2eb] bg-[#f7f8fb] text-left text-xs uppercase tracking-wide text-[#737989]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Devoir</th>
                  <th className="px-4 py-3 font-semibold">Chapitre du cahier</th>
                  <th className="px-4 py-3 font-semibold">Classe</th>
                  <th className="px-4 py-3 font-semibold">Matière</th>
                  <th className="px-4 py-3 font-semibold">Donné le</th>
                  <th className="px-4 py-3 font-semibold">À rendre le</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf0f5]">
                {filteredHomework.map((item) => {
                  const entry = entries.find((row) => row.id === item.lesson_entry_id)
                  return (
                    <tr key={item.id} className="hover:bg-[#fafbfe]">
                      <td className="px-4 py-3">
                        <p className="font-medium">{item.title}</p>
                        <p className="mt-1 max-w-md truncate text-xs text-[#6d7280]">{item.instructions}</p>
                      </td>
                      <td className="px-4 py-3">{entry?.topic || "Séance du " + item.lesson_date}</td>
                      <td className="px-4 py-3">{item.class_name}</td>
                      <td className="px-4 py-3">{item.subject_name}</td>
                      <td className="whitespace-nowrap px-4 py-3">{item.lesson_date}</td>
                      <td className="whitespace-nowrap px-4 py-3">{item.due_date || "—"}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {!filteredHomework.length && <p className="p-10 text-center text-sm text-[#6d7280]">Aucun devoir ne correspond aux filtres.</p>}
          </div>
        </section>
      )}

      {showAdd && (
        <section className="mt-8 border-y border-[#dfe2eb] bg-[#fbfcff] py-6">
          {section === "cahier" ? (
            <>
              <div className="flex items-start justify-between gap-4 border-b border-[#e5e7ee] pb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#3152c8]">Nouvelle entrée</p>
                  <h2 className="mt-1 text-lg font-bold">Renseigner une séance du cahier de textes</h2>
                  <p className="mt-1 text-sm text-[#6d7280]">La classe, la matière et la période proviennent de votre emploi du temps.</p>
                </div>
                <button type="button" onClick={() => setShowAdd(false)} className="text-sm font-semibold text-[#6d7280] hover:text-[#202532]">Fermer</button>
              </div>
              <div className="grid gap-5 pt-5 lg:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium">
                    Période de cours
                    <select value={selectedSlotId} onChange={(e) => handleSlotChange(e.target.value)} className="mt-1.5 h-10 w-full border border-[#dfe2ec] bg-white px-3">
                      <option value="">Choisir une période</option>
                      {schedule.map((slot) => (
                        <option key={slot.slot_id} value={slot.slot_id}>
                          {dayNames[slot.day_of_week]} · {slot.starts_at.slice(0, 5)}–{slot.ends_at.slice(0, 5)} · {slot.class_name} · {slot.subject_name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm font-medium">
                      Classe
                      <input readOnly value={selectedSlot?.class_name ?? ""} className="mt-1.5 h-10 w-full border border-[#dfe2ec] bg-[#f5f6f8] px-3 text-sm" />
                    </label>
                    <label className="block text-sm font-medium">
                      Matière
                      <input readOnly value={selectedSlot?.subject_name ?? ""} className="mt-1.5 h-10 w-full border border-[#dfe2ec] bg-[#f5f6f8] px-3 text-sm" />
                    </label>
                  </div>
                  <label className="mt-4 block text-sm font-medium">
                    Date de la séance
                    <input type="date" value={lessonDate} onChange={(e) => handleLessonDateChange(e.target.value)} className="mt-1.5 h-10 w-full border border-[#dfe2ec] bg-white px-3" />
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium">
                    Chapitre / thème
                    <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Ex. Les fonctions affines" className="mt-1.5 h-10 w-full border border-[#dfe2ec] bg-white px-3" />
                  </label>
                  <label className="mt-4 block text-sm font-medium">
                    Contenu du cours
                    <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={5} placeholder="Ce qui a été enseigné pendant la séance…" className="mt-1.5 w-full resize-y border border-[#dfe2ec] bg-white p-3" />
                  </label>
                  <label className="mt-4 block text-sm font-medium">
                    Activités / travaux réalisés en classe
                    <textarea value={activities} onChange={(e) => setActivities(e.target.value)} rows={4} placeholder="Exercices, activités pratiques, correction…" className="mt-1.5 w-full resize-y border border-[#dfe2ec] bg-white p-3" />
                  </label>
                </div>
              </div>
              <div className="mt-5 flex justify-end border-t border-[#e5e7ee] pt-4">
                <button type="button" onClick={() => void saveLesson()} disabled={saving} className="inline-flex items-center gap-2 bg-[#0b2b83] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Enregistrer la séance
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start justify-between gap-4 border-b border-[#e5e7ee] pb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#3152c8]">Nouveau devoir</p>
                  <h2 className="mt-1 text-lg font-bold">Rattacher un devoir à un chapitre du cahier</h2>
                  <p className="mt-1 text-sm text-[#6d7280]">Le devoir sera transmis avec la séance de référence aux espaces de suivi concernés.</p>
                </div>
                <button type="button" onClick={() => setShowAdd(false)} className="text-sm font-semibold text-[#6d7280] hover:text-[#202532]">Fermer</button>
              </div>
              <div className="grid gap-5 pt-5 lg:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium">
                    Chapitre / séance du cahier de textes
                    <select value={homeworkEntryId} onChange={(e) => handleHomeworkEntryChange(e.target.value)} className="mt-1.5 h-10 w-full border border-[#dfe2ec] bg-white px-3">
                      <option value="">Choisir un chapitre</option>
                      {availableHomeworkEntries.map((entry) => (
                        <option key={entry.id} value={entry.id}>
                          {entry.lesson_date} · {entry.class_name} · {entry.subject_name} · {entry.topic || "Sans thème"}
                        </option>
                      ))}
                    </select>
                  </label>
                  {selectedEntry && (
                    <div className="mt-4 border-l-4 border-[#3152c8] bg-white px-4 py-3 text-sm">
                      <p className="font-semibold">{selectedEntry.topic || "Sans thème"}</p>
                      <p className="mt-1 text-[#6d7280]">{selectedEntry.class_name} · {selectedEntry.subject_name} · {selectedEntry.lesson_date}</p>
                      {selectedEntry.content && <p className="mt-2 text-[#4f5665]">{selectedEntry.content}</p>}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium">
                    Titre du devoir
                    <input value={homeworkTitle} onChange={(e) => setHomeworkTitle(e.target.value)} placeholder="Ex. Exercices sur les fonctions affines" className="mt-1.5 h-10 w-full border border-[#dfe2ec] bg-white px-3" />
                  </label>
                  <label className="mt-4 block text-sm font-medium">
                    Consignes
                    <textarea value={homeworkInstructions} onChange={(e) => setHomeworkInstructions(e.target.value)} rows={6} placeholder="Travail à réaliser à la maison, exercices, lecture, recherche…" className="mt-1.5 w-full resize-y border border-[#dfe2ec] bg-white p-3" />
                  </label>
                  <label className="mt-4 block text-sm font-medium">
                    Date de remise
                    <input type="date" value={homeworkDueDate} onChange={(e) => setHomeworkDueDate(e.target.value)} className="mt-1.5 h-10 w-full border border-[#dfe2ec] bg-white px-3" />
                  </label>
                </div>
              </div>
              <div className="mt-5 flex justify-end border-t border-[#e5e7ee] pt-4">
                <button type="button" onClick={() => void saveHomework()} disabled={saving || !availableHomeworkEntries.length} className="inline-flex items-center gap-2 bg-[#0b2b83] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Enregistrer le devoir
                </button>
              </div>
            </>
          )}
        </section>
      )}

      <div className="mt-8 border-t border-[#dfe2eb] py-6 text-xs text-[#7b8190]">
        Les données saisies ici sont rattachées à l'établissement, à l'enseignant, à la classe, à la matière, au créneau et à l'année académique active.
      </div>
    </TeacherShell>
  )
}
