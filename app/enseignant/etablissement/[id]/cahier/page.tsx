"use client"

import { useEffect, useMemo, useState } from "react"
import { BookOpenText, CalendarDays, CheckCircle2, FileText, Loader2, Save, Search } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { useAuthentification } from "@/providers/authentification.provider"
import {
  enseignantPortalService,
  type TeacherHomework,
  type TeacherLessonEntry,
  type TeacherScheduleSlot,
} from "@/services/enseignant-portal.service"
import { TeacherShell } from "@/components/enseignant/teacher-shell"

const isoDate = (date: Date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return y + "-" + m + "-" + d
}

const dayNames = ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]

function dateForSlot(dayOfWeek: number) {
  const today = new Date()
  const isoToday = today.getDay() === 0 ? 7 : today.getDay()
  const result = new Date(today)
  result.setDate(today.getDate() + dayOfWeek - isoToday)
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
  const [search, setSearch] = useState("")
  const [classFilter, setClassFilter] = useState("all")
  const [subjectFilter, setSubjectFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("all")

  const loadBusinessData = async (
    slot: TeacherScheduleSlot,
    currentEntries?: TeacherLessonEntry[],
    currentHomeworks?: TeacherHomework[],
  ) => {
    const lessonEntries = currentEntries ?? await enseignantPortalService.getLessonEntries(id)
    const homeworkRows = currentHomeworks ?? await enseignantPortalService.getHomework(id)
    const date = dateForSlot(slot.day_of_week)
    const entry = lessonEntries.find(
      (row) => row.timetable_slot_id === slot.slot_id && row.lesson_date === date,
    )
    const hw = homeworkRows.find(
      (row) => row.timetable_slot_id === slot.slot_id && row.lesson_entry_id === (entry?.id ?? null),
    )

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
      Promise.all([
        enseignantPortalService.getSchedule(id),
        enseignantPortalService.getLessonEntries(id),
        enseignantPortalService.getHomework(id),
      ])
        .then(async ([rows, lessonEntries, homeworkRows]) => {
          setSchedule(rows)
          setEntries(lessonEntries)
          setHomeworks(homeworkRows)

          const todayIso = new Date().getDay() === 0 ? 7 : new Date().getDay()
          const first =
            rows
              .filter((row) => row.day_of_week === todayIso)
              .sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0] ??
            rows[0] ??
            null

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

  const filteredSchedule = useMemo(() => {
    const query = search.trim().toLowerCase()
    return schedule
      .filter((slot) => classFilter === "all" || slot.class_id === classFilter)
      .filter((slot) => subjectFilter === "all" || slot.subject_id === subjectFilter)
      .filter((slot) => {
        if (dateFilter === "all") return true
        if (dateFilter === "today") {
          const today = new Date().getDay() === 0 ? 7 : new Date().getDay()
          return slot.day_of_week === today
        }
        return dateFilter === String(slot.day_of_week)
      })
      .filter((slot) => {
        if (!query) return true
        return [slot.class_name, slot.subject_name, slot.room ?? ""].some((value) =>
          value.toLowerCase().includes(query),
        )
      })
      .sort((a, b) => a.day_of_week - b.day_of_week || a.starts_at.localeCompare(b.starts_at))
  }, [schedule, search, classFilter, subjectFilter, dateFilter])

  const recentEntries = useMemo(() => {
    const query = search.trim().toLowerCase()
    return entries
      .filter((entry) => classFilter === "all" || entry.class_id === classFilter)
      .filter((entry) => subjectFilter === "all" || entry.subject_id === subjectFilter)
      .filter((entry) => {
        if (!query) return true
        return [entry.class_name, entry.subject_name, entry.topic, entry.content]
          .join(" ")
          .toLowerCase()
          .includes(query)
      })
      .sort((a, b) => b.lesson_date.localeCompare(a.lesson_date))
      .slice(0, 6)
  }, [entries, search, classFilter, subjectFilter])

  const recentHomeworks = useMemo(() => {
    const query = search.trim().toLowerCase()
    return homeworks
      .filter((item) => classFilter === "all" || item.class_id === classFilter)
      .filter((item) => subjectFilter === "all" || item.subject_id === subjectFilter)
      .filter((item) => {
        if (!query) return true
        return [item.title, item.instructions, item.class_name, item.subject_name]
          .join(" ")
          .toLowerCase()
          .includes(query)
      })
      .slice(0, 6)
  }, [homeworks, search, classFilter, subjectFilter])

  const activeHomeworks = homeworks.filter((item) => item.active).length
  const classOptions = Array.from(new Map(schedule.map((item) => [item.class_id, item.class_name])).entries())
  const subjectOptions = Array.from(new Map(schedule.map((item) => [item.subject_id, item.subject_name])).entries())

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
        entryId = await enseignantPortalService.saveLessonEntry(
          id,
          selected.slot_id,
          lessonDate,
          theme,
          content,
        )
      }

      if (homework.trim()) {
        await enseignantPortalService.saveHomework(
          id,
          selected.slot_id,
          entryId,
          "Devoir",
          homework,
          homeworkDueDate || undefined,
        )
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
        <h1 className="mt-1 text-2xl font-bold">Cahier de texte & devoirs</h1>
        <p className="mt-1 text-sm text-[#6d7280]">
          Consultez, renseignez et retrouvez les séances et devoirs de l’année académique active.
        </p>
      </header>

      {error && (
        <div className="mt-4 border-l-4 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-sm text-[#6d7280]">
          <Loader2 className="mx-auto h-5 w-5 animate-spin" />
          <p className="mt-2">Chargement du cahier…</p>
        </div>
      ) : (
        <>
          <section className="mt-5 border-y border-[#dfe2eb] bg-white">
            <div className="grid divide-y divide-[#e5e7ee] sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
              <div className="px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-[#737989]">Cours au programme</p>
                <p className="mt-1 text-xl font-bold">{schedule.length}</p>
                <p className="text-xs text-[#7b8190]">Emploi du temps actif</p>
              </div>
              <div className="px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-[#737989]">Séances renseignées</p>
                <p className="mt-1 text-xl font-bold">{entries.length}</p>
                <p className="text-xs text-[#7b8190]">Entrées enregistrées</p>
              </div>
              <div className="px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-[#737989]">Devoirs actifs</p>
                <p className="mt-1 text-xl font-bold">{activeHomeworks}</p>
                <p className="text-xs text-[#7b8190]">Travaux suivis</p>
              </div>
              <div className="px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-[#737989]">Année académique</p>
                <p className="mt-1 truncate text-xl font-bold">{schedule[0]?.academic_year_name ?? "—"}</p>
                <p className="text-xs text-[#7b8190]">Année active</p>
              </div>
            </div>
          </section>

          <section className="mt-6 border-b border-[#dfe2eb] pb-5">
            <div className="mb-3">
              <h2 className="font-bold">Filtres</h2>
              <p className="text-sm text-[#6d7280]">Filtrez les séances affichées sans quitter la page.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <label className="relative block">
                <span className="sr-only">Rechercher</span>
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a90a0]" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Classe, matière, salle…"
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
              <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="h-10 border border-[#dfe2ec] bg-white px-3 text-sm">
                <option value="all">Toutes les journées</option>
                <option value="today">Aujourd’hui</option>
                {dayNames.slice(1).map((label, index) => <option key={index + 1} value={String(index + 1)}>{label}</option>)}
              </select>
            </div>
          </section>

          <section className="mt-6">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#dfe2eb] pb-3">
              <div>
                <h2 className="text-lg font-bold">Séances de l’emploi du temps</h2>
                <p className="text-sm text-[#6d7280]">Sélectionnez une ligne pour renseigner le cahier et le devoir.</p>
              </div>
              <span className="text-sm text-[#6d7280]">{filteredSchedule.length} séance(s)</span>
            </div>

            <div className="mt-3 overflow-x-auto border border-[#dfe2eb] bg-white">
              <table className="min-w-full text-sm">
                <thead className="border-b border-[#dfe2eb] bg-[#f7f8fb] text-left text-xs uppercase tracking-wide text-[#737989]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Jour</th>
                    <th className="px-4 py-3 font-semibold">Horaire</th>
                    <th className="px-4 py-3 font-semibold">Classe</th>
                    <th className="px-4 py-3 font-semibold">Matière</th>
                    <th className="px-4 py-3 font-semibold">Salle</th>
                    <th className="px-4 py-3 font-semibold">État</th>
                    <th className="px-4 py-3 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf0f5]">
                  {filteredSchedule.map((slot) => {
                    const date = dateForSlot(slot.day_of_week)
                    const entry = entries.find((row) => row.timetable_slot_id === slot.slot_id && row.lesson_date === date)
                    const isSelected = selected?.slot_id === slot.slot_id
                    return (
                      <tr key={slot.slot_id} className={isSelected ? "bg-[#eef2ff]" : "hover:bg-[#fafbfe]"}>
                        <td className="whitespace-nowrap px-4 py-3">{dayNames[slot.day_of_week]}</td>
                        <td className="whitespace-nowrap px-4 py-3">{slot.starts_at.slice(0, 5)}–{slot.ends_at.slice(0, 5)}</td>
                        <td className="px-4 py-3 font-medium">{slot.class_name}</td>
                        <td className="px-4 py-3">{slot.subject_name}</td>
                        <td className="px-4 py-3">{slot.room || "—"}</td>
                        <td className="px-4 py-3">
                          {entry ? (
                            <span className="inline-flex items-center gap-1 text-[#277047]">
                              <CheckCircle2 className="h-4 w-4" /> Renseignée
                            </span>
                          ) : (
                            <span className="text-[#8a90a0]">À renseigner</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button type="button" onClick={() => void selectSlot(slot)} className="font-semibold text-[#2944a8] hover:underline">
                            {isSelected ? "Sélectionnée" : "Ouvrir"}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {!filteredSchedule.length && <p className="p-8 text-center text-sm text-[#6d7280]">Aucune séance ne correspond aux filtres.</p>}
            </div>
          </section>

          {selected && (
            <section className="mt-8 border-y border-[#dfe2eb] py-6">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#e5e7ee] pb-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-[#737989]">Séance sélectionnée · {lessonDate}</p>
                  <h2 className="mt-1 text-xl font-bold">{selected.subject_name} · {selected.class_name}</h2>
                  <p className="text-sm text-[#6d7280]">
                    {selected.starts_at.slice(0, 5)}–{selected.ends_at.slice(0, 5)}
                    {selected.room ? " · Salle " + selected.room : ""}
                  </p>
                </div>
                <span className="text-sm text-[#6d7280]">{selected.academic_year_name}</span>
              </div>

              <div className="grid gap-8 pt-5 lg:grid-cols-2">
                <div>
                  <div className="mb-4 flex items-center gap-2">
                    <BookOpenText className="h-4 w-4 text-[#2944a8]" />
                    <h3 className="font-bold">Cours</h3>
                  </div>
                  <label className="block text-sm font-medium">
                    Thème du cours
                    <input value={theme} onChange={(e) => setTheme(e.target.value)} className="mt-1.5 h-10 w-full border border-[#dfe2ec] px-3 outline-none focus:border-[#7890ef]" />
                  </label>
                  <label className="mt-4 block text-sm font-medium">
                    Contenu et activités
                    <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={8} placeholder="Décrivez ce qui a été enseigné et les activités réalisées…" className="mt-1.5 w-full resize-y border border-[#dfe2ec] p-3 outline-none focus:border-[#7890ef]" />
                  </label>
                </div>

                <div>
                  <div className="mb-4 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[#2944a8]" />
                    <h3 className="font-bold">Devoir</h3>
                  </div>
                  <label className="block text-sm font-medium">
                    Consignes
                    <textarea value={homework} onChange={(e) => setHomework(e.target.value)} rows={8} placeholder="Exercices, lecture, recherche ou travail à préparer…" className="mt-1.5 w-full resize-y border border-[#dfe2ec] p-3 outline-none focus:border-[#7890ef]" />
                  </label>
                  <label className="mt-4 block text-sm font-medium">
                    Date de remise
                    <input type="date" value={homeworkDueDate} onChange={(e) => setHomeworkDueDate(e.target.value)} className="mt-1.5 h-10 w-full border border-[#dfe2ec] px-3" />
                  </label>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#e5e7ee] pt-4">
                <div className="text-sm">
                  {message && <p className="flex items-center gap-2 text-[#277047]"><CheckCircle2 className="h-4 w-4" />{message}</p>}
                </div>
                <button type="button" onClick={() => void save()} disabled={saving} className="inline-flex items-center justify-center gap-2 bg-[#0b2b83] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Enregistrer
                </button>
              </div>
            </section>
          )}

          <section className="mt-8 border-t border-[#dfe2eb] pt-6">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#dfe2eb] pb-3">
              <div>
                <h2 className="text-lg font-bold">Dernières séances renseignées</h2>
                <p className="text-sm text-[#6d7280]">Les entrées récentes de l’année académique active.</p>
              </div>
              <button type="button" onClick={() => router.push(`/enseignant/etablissement/${id}/cahier/historique`)} className="text-sm font-semibold text-[#2944a8] hover:underline">
                Voir l’historique
              </button>
            </div>
            <div className="mt-3 overflow-x-auto border border-[#dfe2eb] bg-white">
              <table className="min-w-full text-sm">
                <thead className="border-b border-[#dfe2eb] bg-[#f7f8fb] text-left text-xs uppercase tracking-wide text-[#737989]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Classe</th>
                    <th className="px-4 py-3 font-semibold">Matière</th>
                    <th className="px-4 py-3 font-semibold">Thème</th>
                    <th className="px-4 py-3 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf0f5]">
                  {recentEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-[#fafbfe]">
                      <td className="whitespace-nowrap px-4 py-3">{entry.lesson_date}</td>
                      <td className="px-4 py-3">{entry.class_name}</td>
                      <td className="px-4 py-3">{entry.subject_name}</td>
                      <td className="px-4 py-3">{entry.topic || "Sans thème"}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            const slot = schedule.find((item) => item.slot_id === entry.timetable_slot_id)
                            if (slot) void selectSlot(slot)
                          }}
                          className="font-semibold text-[#2944a8] hover:underline"
                        >
                          Ouvrir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!recentEntries.length && <p className="p-6 text-sm text-[#6d7280]">Aucune séance renseignée avec ces filtres.</p>}
            </div>
          </section>

          <section className="mt-8 border-t border-[#dfe2eb] pt-6 pb-8">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#dfe2eb] pb-3">
              <div>
                <h2 className="text-lg font-bold">Devoirs récents</h2>
                <p className="text-sm text-[#6d7280]">Travaux enregistrés pour vos classes.</p>
              </div>
              <button type="button" onClick={() => router.push(`/enseignant/etablissement/${id}/cahier/devoirs`)} className="text-sm font-semibold text-[#2944a8] hover:underline">
                Voir les devoirs
              </button>
            </div>
            <div className="mt-3 overflow-x-auto border border-[#dfe2eb] bg-white">
              <table className="min-w-full text-sm">
                <thead className="border-b border-[#dfe2eb] bg-[#f7f8fb] text-left text-xs uppercase tracking-wide text-[#737989]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Devoir</th>
                    <th className="px-4 py-3 font-semibold">Classe</th>
                    <th className="px-4 py-3 font-semibold">Matière</th>
                    <th className="px-4 py-3 font-semibold">Remise</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf0f5]">
                  {recentHomeworks.map((item) => (
                    <tr key={item.id} className="hover:bg-[#fafbfe]">
                      <td className="px-4 py-3">
                        <p className="font-medium">{item.title}</p>
                        {item.instructions && <p className="mt-1 max-w-xl truncate text-xs text-[#6d7280]">{item.instructions}</p>}
                      </td>
                      <td className="px-4 py-3">{item.class_name}</td>
                      <td className="px-4 py-3">{item.subject_name}</td>
                      <td className="whitespace-nowrap px-4 py-3">{item.due_date || "Sans date"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!recentHomeworks.length && <p className="p-6 text-sm text-[#6d7280]">Aucun devoir enregistré.</p>}
            </div>
          </section>
        </>
      )}
    </TeacherShell>
  )
}
