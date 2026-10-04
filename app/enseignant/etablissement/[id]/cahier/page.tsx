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
          Une vue principale pour consulter, renseigner et retrouver les séances de l’établissement.
        </p>
      </header>

      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
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
          <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-[#e1e3eb] bg-white p-4">
              <p className="text-xs font-medium text-[#6d7280]">Cours au programme</p>
              <p className="mt-1 text-2xl font-bold">{schedule.length}</p>
              <p className="mt-1 text-xs text-[#7b8190]">Dans l’emploi du temps actif</p>
            </div>
            <div className="rounded-lg border border-[#e1e3eb] bg-white p-4">
              <p className="text-xs font-medium text-[#6d7280]">Séances renseignées</p>
              <p className="mt-1 text-2xl font-bold">{entries.length}</p>
              <p className="mt-1 text-xs text-[#7b8190]">Entrées enregistrées</p>
            </div>
            <div className="rounded-lg border border-[#e1e3eb] bg-white p-4">
              <p className="text-xs font-medium text-[#6d7280]">Devoirs actifs</p>
              <p className="mt-1 text-2xl font-bold">{activeHomeworks}</p>
              <p className="mt-1 text-xs text-[#7b8190]">Travaux encore suivis</p>
            </div>
            <div className="rounded-lg border border-[#e1e3eb] bg-white p-4">
              <p className="text-xs font-medium text-[#6d7280]">Année académique</p>
              <p className="mt-1 truncate text-lg font-bold">{schedule[0]?.academic_year_name ?? "—"}</p>
              <p className="mt-1 text-xs text-[#7b8190]">Données de l’année active</p>
            </div>
          </section>

          <section className="mt-5 rounded-lg border border-[#e1e3eb] bg-white">
            <div className="border-b border-[#e5e7ee] px-4 py-3">
              <h2 className="font-bold">Filtres du cahier</h2>
              <p className="mt-0.5 text-sm text-[#6d7280]">Affinez les séances et les entrées affichées.</p>
            </div>
            <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="relative block">
                <span className="sr-only">Rechercher</span>
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a90a0]" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher une classe, matière…"
                  className="h-10 w-full rounded-md border border-[#dfe2ec] pl-9 pr-3 text-sm outline-none focus:border-[#7890ef]"
                />
              </label>
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="h-10 rounded-md border border-[#dfe2ec] bg-white px-3 text-sm"
              >
                <option value="all">Toutes les classes</option>
                {classOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="h-10 rounded-md border border-[#dfe2ec] bg-white px-3 text-sm"
              >
                <option value="all">Toutes les matières</option>
                {subjectOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="h-10 rounded-md border border-[#dfe2ec] bg-white px-3 text-sm"
              >
                <option value="all">Toutes les journées</option>
                <option value="today">Aujourd’hui</option>
                {dayNames.slice(1).map((label, index) => <option key={index + 1} value={String(index + 1)}>{label}</option>)}
              </select>
            </div>
          </section>

          <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_1.35fr]">
            <div className="rounded-lg border border-[#e1e3eb] bg-white">
              <div className="border-b border-[#e5e7ee] px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-bold">Séances</h2>
                    <p className="text-sm text-[#6d7280]">Sélectionnez une séance à renseigner.</p>
                  </div>
                  <CalendarDays className="h-5 w-5 text-[#707788]" />
                </div>
              </div>
              <div className="max-h-[520px] overflow-y-auto">
                {filteredSchedule.length ? (
                  <div className="divide-y divide-[#edf0f5]">
                    {filteredSchedule.map((slot) => (
                      <button
                        key={slot.slot_id}
                        type="button"
                        onClick={() => void selectSlot(slot)}
                        className={
                          "w-full px-4 py-3 text-left transition-colors hover:bg-[#f7f8fc] " +
                          (selected?.slot_id === slot.slot_id ? "bg-[#edf1ff]" : "")
                        }
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold">{slot.subject_name}</p>
                            <p className="mt-0.5 text-sm text-[#6d7280]">{slot.class_name}</p>
                          </div>
                          <span className="shrink-0 text-xs font-medium text-[#6d7280]">
                            {dayNames[slot.day_of_week]} · {slot.starts_at.slice(0, 5)}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-[#7b8190]">
                          {slot.ends_at.slice(0, 5)}{slot.room ? " · Salle " + slot.room : ""}
                        </p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-sm text-[#6d7280]">Aucune séance ne correspond aux filtres.</div>
                )}
              </div>
            </div>

            {selected ? (
              <div className="rounded-lg border border-[#e1e3eb] bg-white">
                <div className="border-b border-[#e5e7ee] px-4 py-3">
                  <p className="text-xs text-[#6d7280]">Séance sélectionnée · {lessonDate}</p>
                  <h2 className="mt-1 font-bold">{selected.subject_name} · {selected.class_name}</h2>
                  <p className="text-sm text-[#6d7280]">
                    {selected.starts_at.slice(0, 5)}–{selected.ends_at.slice(0, 5)}
                    {selected.room ? " · Salle " + selected.room : ""}
                  </p>
                </div>
                <div className="grid gap-5 p-4 lg:grid-cols-2">
                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <BookOpenText className="h-4 w-4 text-[#2944a8]" />
                      <h3 className="font-semibold">Cours</h3>
                    </div>
                    <label className="block text-sm font-medium">
                      Thème du cours
                      <input
                        value={theme}
                        onChange={(e) => setTheme(e.target.value)}
                        className="mt-1.5 h-10 w-full rounded-md border border-[#dfe2ec] px-3 outline-none focus:border-[#7890ef]"
                      />
                    </label>
                    <label className="mt-4 block text-sm font-medium">
                      Contenu et activités
                      <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        rows={8}
                        placeholder="Décrivez ce qui a été enseigné et les activités réalisées…"
                        className="mt-1.5 w-full resize-y rounded-md border border-[#dfe2ec] p-3 outline-none focus:border-[#7890ef]"
                      />
                    </label>
                  </div>

                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-[#2944a8]" />
                      <h3 className="font-semibold">Devoir</h3>
                    </div>
                    <label className="block text-sm font-medium">
                      Consignes
                      <textarea
                        value={homework}
                        onChange={(e) => setHomework(e.target.value)}
                        rows={8}
                        placeholder="Exercices, lecture, recherche ou travail à préparer…"
                        className="mt-1.5 w-full resize-y rounded-md border border-[#dfe2ec] p-3 outline-none focus:border-[#7890ef]"
                      />
                    </label>
                    <label className="mt-4 block text-sm font-medium">
                      Date de remise
                      <input
                        type="date"
                        value={homeworkDueDate}
                        onChange={(e) => setHomeworkDueDate(e.target.value)}
                        className="mt-1.5 h-10 w-full rounded-md border border-[#dfe2ec] px-3"
                      />
                    </label>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e5e7ee] px-4 py-3">
                  <div className="text-sm">
                    {message && (
                      <p className="flex items-center gap-2 text-[#277047]">
                        <CheckCircle2 className="h-4 w-4" />{message}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => void save()}
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0b2b83] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Enregistrer
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center rounded-lg border border-dashed border-[#dfe2ec] bg-white p-10 text-center text-sm text-[#6d7280]">
                Sélectionnez une séance pour renseigner le cahier.
              </div>
            )}
          </section>

          <section className="mt-5 grid gap-5 lg:grid-cols-2">
            <div className="rounded-lg border border-[#e1e3eb] bg-white">
              <div className="border-b border-[#e5e7ee] px-4 py-3">
                <h2 className="font-bold">Dernières séances renseignées</h2>
                <p className="text-sm text-[#6d7280]">Les entrées les plus récentes de l’année active.</p>
              </div>
              <div className="divide-y divide-[#edf0f5]">
                {recentEntries.length ? recentEntries.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => {
                      const slot = schedule.find((item) => item.slot_id === entry.timetable_slot_id)
                      if (slot) void selectSlot(slot)
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-[#f7f8fc]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{entry.topic || "Cours sans thème"}</p>
                        <p className="mt-0.5 text-sm text-[#6d7280]">{entry.subject_name} · {entry.class_name}</p>
                      </div>
                      <span className="shrink-0 text-xs text-[#7b8190]">{entry.lesson_date}</span>
                    </div>
                  </button>
                )) : (
                  <p className="p-6 text-sm text-[#6d7280]">Aucune séance renseignée avec ces filtres.</p>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-[#e1e3eb] bg-white">
              <div className="border-b border-[#e5e7ee] px-4 py-3">
                <h2 className="font-bold">Devoirs récents</h2>
                <p className="text-sm text-[#6d7280]">Travaux enregistrés pour vos classes.</p>
              </div>
              <div className="divide-y divide-[#edf0f5]">
                {homeworks.slice(0, 6).map((item) => (
                  <div key={item.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="mt-0.5 text-sm text-[#6d7280]">{item.subject_name} · {item.class_name}</p>
                      </div>
                      <span className="shrink-0 text-xs text-[#7b8190]">
                        {item.due_date ? "À rendre " + item.due_date : "Sans date"}
                      </span>
                    </div>
                    {item.instructions && <p className="mt-2 line-clamp-2 text-sm text-[#6d7280]">{item.instructions}</p>}
                  </div>
                ))}
                {!homeworks.length && <p className="p-6 text-sm text-[#6d7280]">Aucun devoir enregistré.</p>}
              </div>
            </div>
          </section>
        </>
      )}
    </TeacherShell>
  )
}
