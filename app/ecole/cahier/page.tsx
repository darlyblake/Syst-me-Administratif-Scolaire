"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, BookOpenText, Loader2, Search } from "lucide-react"
import { ecoleCahierService, type SchoolCahierEntry } from "@/services/ecole-cahier.service"
import { useUserContext } from "@/hooks/useUserContext"

const days = ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]

export default function EcoleCahierPage() {
  const { primaryEstablishment } = useUserContext()
  const establishmentId = primaryEstablishment?.id ?? null

  const [entries, setEntries] = useState<SchoolCahierEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [teacherFilter, setTeacherFilter] = useState("all")
  const [subjectFilter, setSubjectFilter] = useState("all")
  const [classFilter, setClassFilter] = useState("all")
  const [periodFilter, setPeriodFilter] = useState("all")

  const load = async () => {
    if (!establishmentId) return
    setLoading(true)
    setError("")
    try {
      setEntries(await ecoleCahierService.getEntries(establishmentId))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de charger le cahier de textes.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [establishmentId])

  const teachers = useMemo(
    () => Array.from(new Map(entries.map((entry) => [entry.teacher_id, entry.teacher_name])).entries()).sort((a, b) => a[1].localeCompare(b[1])),
    [entries],
  )
  const subjects = useMemo(
    () => Array.from(new Map(entries.map((entry) => [entry.subject_id, entry.subject_name])).entries()).sort((a, b) => a[1].localeCompare(b[1])),
    [entries],
  )
  const classes = useMemo(
    () => Array.from(new Map(entries.map((entry) => [entry.class_id, entry.class_name])).entries()).sort((a, b) => a[1].localeCompare(b[1])),
    [entries],
  )
  const periods = useMemo(
    () =>
      Array.from(
        new Map(
          entries.map((entry) => [
            entry.timetable_slot_id,
            entry.starts_at.slice(0, 5) + "–" + entry.ends_at.slice(0, 5),
          ]),
        ).entries(),
      ).sort((a, b) => a[1].localeCompare(b[1])),
    [entries],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return entries.filter((entry) => {
      if (teacherFilter !== "all" && entry.teacher_id !== teacherFilter) return false
      if (subjectFilter !== "all" && entry.subject_id !== subjectFilter) return false
      if (classFilter !== "all" && entry.class_id !== classFilter) return false
      if (periodFilter !== "all" && entry.timetable_slot_id !== periodFilter) return false
      if (
        q &&
        ![entry.teacher_name, entry.subject_name, entry.class_name, entry.topic, entry.content, entry.homework_title ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(q)
      ) return false
      return true
    })
  }, [entries, search, teacherFilter, subjectFilter, classFilter, periodFilter])

  if (!establishmentId) {
    return <main className="p-6 text-sm text-muted-foreground">Aucun établissement actif.</main>
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl p-4 md:p-6">
        <header className="flex flex-col gap-4 border-b border-[#D8E0DC] pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm text-[#6f776f]">Pédagogie / Suivi des enseignements</p>
            <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <BookOpenText className="h-6 w-6" />
              Cahier de textes
            </h1>
            <p className="mt-1 text-sm text-[#6f776f]">
              Vue générale de toutes les séances renseignées par les enseignants de l'établissement.
            </p>
          </div>
          <Link href="/ecole/tableau-bord" className="inline-flex items-center gap-2 text-sm font-semibold text-[#3152c8] hover:underline">
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Link>
        </header>

        {error && <div className="mt-4 border-l-4 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <section className="mt-5 border-b border-[#D8E0DC] pb-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <label className="relative block xl:col-span-2">
              <span className="sr-only">Rechercher</span>
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9088]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Enseignant, matière, classe, chapitre…"
                className="h-10 w-full border border-[#d8e0dc] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#3152c8]"
              />
            </label>
            <select value={teacherFilter} onChange={(e) => setTeacherFilter(e.target.value)} className="h-10 border border-[#d8e0dc] bg-white px-3 text-sm">
              <option value="all">Tous les enseignants</option>
              {teachers.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className="h-10 border border-[#d8e0dc] bg-white px-3 text-sm">
              <option value="all">Toutes les matières</option>
              {subjects.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="h-10 border border-[#d8e0dc] bg-white px-3 text-sm">
              <option value="all">Toutes les classes</option>
              {classes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)} className="h-10 border border-[#d8e0dc] bg-white px-3 text-sm">
              <option value="all">Toutes les périodes de cours</option>
              {periods.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
        </section>

        <section className="mt-6">
          <div className="flex items-end justify-between gap-3 border-b border-[#D8E0DC] pb-3">
            <div>
              <h2 className="font-semibold">Historique général</h2>
              <p className="text-sm text-[#6f776f]">Année académique active · {filtered.length} séance(s)</p>
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-sm text-[#6f776f]">
              <Loader2 className="mx-auto h-5 w-5 animate-spin" />
              <p className="mt-2">Chargement du cahier…</p>
            </div>
          ) : (
            <div className="mt-3 overflow-x-auto border border-[#D8E0DC]">
              <table className="min-w-full text-sm">
                <thead className="border-b border-[#D8E0DC] bg-[#f7f8f6] text-left text-xs uppercase tracking-wide text-[#6f776f]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Période</th>
                    <th className="px-4 py-3 font-semibold">Enseignant</th>
                    <th className="px-4 py-3 font-semibold">Matière</th>
                    <th className="px-4 py-3 font-semibold">Classe</th>
                    <th className="px-4 py-3 font-semibold">Chapitre / thème</th>
                    <th className="px-4 py-3 font-semibold">Devoir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf0eb]">
                  {filtered.map((entry) => (
                    <tr key={entry.id} className="hover:bg-[#fafcf9]">
                      <td className="whitespace-nowrap px-4 py-3">{entry.lesson_date}</td>
                      <td className="whitespace-nowrap px-4 py-3">{days[entry.day_of_week]} · {entry.starts_at.slice(0, 5)}–{entry.ends_at.slice(0, 5)}</td>
                      <td className="px-4 py-3 font-medium">{entry.teacher_name || "—"}</td>
                      <td className="px-4 py-3">{entry.subject_name}</td>
                      <td className="px-4 py-3">{entry.class_name}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{entry.topic || "Sans thème"}</p>
                        {entry.content && <p className="mt-1 max-w-sm truncate text-xs text-[#6f776f]">{entry.content}</p>}
                      </td>
                      <td className="px-4 py-3">
                        {entry.homework_id ? (
                          <div>
                            <p className="font-medium">{entry.homework_title}</p>
                            <p className="mt-1 text-xs text-[#6f776f]">À rendre le {entry.homework_due_date || "—"}</p>
                          </div>
                        ) : (
                          <span className="text-[#8a9088]">Aucun</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filtered.length && <p className="p-10 text-center text-sm text-[#6f776f]">Aucune entrée ne correspond aux filtres.</p>}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
