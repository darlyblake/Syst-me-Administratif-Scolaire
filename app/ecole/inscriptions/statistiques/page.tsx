"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { CalendarDays, Filter, RefreshCw, Users, X } from "lucide-react"
import { useUserContext } from "@/hooks/useUserContext"
import { supabaseBrowser } from "@/lib/supabase/client"
import { financeService } from "@/lib/supabase/services/finance.service"

type EnrollmentRow = {
  id: string
  student_id: string
  academic_year_id: string | null
  enrollment_date: string
  class_name: string
  birth_date: string
  academic_year_name: string
  academic_year_rank: number | null
}

type RevenueRow = { date: string; amount: number }

const numberFormat = new Intl.NumberFormat("fr-FR")
const moneyFormat = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 })

function formatDate(value: string) {
  if (!value) return "—"
  return new Date(value + "T12:00:00").toLocaleDateString("fr-FR")
}

function getAgeGroup(birthDate: string) {
  if (!birthDate) return null
  const birth = new Date(birthDate + "T12:00:00")
  if (Number.isNaN(birth.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--
  if (age < 3) return null
  if (age <= 5) return "3 à 5 ans"
  if (age <= 8) return "6 à 8 ans"
  if (age <= 11) return "9 à 11 ans"
  if (age <= 15) return "12 à 15 ans"
  return "16 ans et plus"
}

export default function StatistiquesInscriptions() {
  const { primaryEstablishment, estEnCoursDeChargement } = useUserContext()
  const establishmentId = primaryEstablishment?.id ?? null
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([])
  const [revenues, setRevenues] = useState<RevenueRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [draftStart, setDraftStart] = useState("")
  const [draftEnd, setDraftEnd] = useState("")
  const [dateStart, setDateStart] = useState("")
  const [dateEnd, setDateEnd] = useState("")

  const loadData = useCallback(async (quiet = false) => {
    if (!establishmentId) {
      setEnrollments([])
      setRevenues([])
      setLoading(Boolean(estEnCoursDeChargement))
      return
    }
    if (quiet) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const allRows: EnrollmentRow[] = []
      const pageSize = 500
      for (let from = 0; ; from += pageSize) {
        const { data, error: enrollmentError } = await supabaseBrowser
          .from("enrollments")
          .select("id, student_id, academic_year_id, enrollment_date, student:students!enrollments_student_id_fkey(birth_date), class:school_classes!enrollments_class_id_fkey(name)")
          .eq("establishment_id", establishmentId)
          .order("enrollment_date", { ascending: true })
          .range(from, from + pageSize - 1)
        if (enrollmentError) throw enrollmentError
        const batch = (data ?? []) as any[]
        allRows.push(...batch.map((row) => ({
          id: row.id,
          student_id: row.student_id,
          academic_year_id: row.academic_year_id ?? null,
          enrollment_date: row.enrollment_date || "",
          class_name: row.class?.name || "Classe non renseignée",
          birth_date: row.student?.birth_date || "",
          academic_year_name: "Année non renseignée",
          academic_year_rank: null,
        })))
        if (batch.length < pageSize) break
      }

      const yearIds = [...new Set(allRows.map((row) => row.academic_year_id).filter((id): id is string => Boolean(id)))]
      if (yearIds.length) {
        const { data: years, error: yearsError } = await supabaseBrowser
          .from("academic_years")
          .select("id, name, start_date")
          .eq("establishment_id", establishmentId)
          .in("id", yearIds)
        if (yearsError) throw yearsError
        const orderedYears = [...(years ?? [])].sort((a, b) => String(a.start_date ?? "").localeCompare(String(b.start_date ?? "")))
        const ranks = new Map(orderedYears.map((year, index) => [year.id, index]))
        const names = new Map(orderedYears.map((year) => [year.id, year.name]))
        allRows.forEach((row) => {
          if (!row.academic_year_id) return
          row.academic_year_name = names.get(row.academic_year_id) ?? "Année non renseignée"
          row.academic_year_rank = ranks.get(row.academic_year_id) ?? null
        })
      }

      const movements = await financeService.getMovements(establishmentId, undefined, undefined, "credit")
      setEnrollments(allRows)
      setRevenues(movements.map((row) => ({ date: row.transaction_date, amount: Number(row.amount) || 0 })))
    } catch (cause) {
      setEnrollments([])
      setRevenues([])
      setError(cause instanceof Error ? cause.message : "Les statistiques n'ont pas pu être chargées.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [establishmentId, estEnCoursDeChargement])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const stats = useMemo(() => {
    const inRange = (date: string) => Boolean(date) && (!dateStart || date.slice(0, 10) >= dateStart) && (!dateEnd || date.slice(0, 10) <= dateEnd)
    const filtered = enrollments.filter((row) => inRange(row.enrollment_date))
    const filteredRevenue = revenues.filter((row) => inRange(row.date))
    const firstYearByStudent = new Map<string, number>()
    enrollments.forEach((row) => {
      if (!row.student_id || row.academic_year_rank === null) return
      const current = firstYearByStudent.get(row.student_id)
      if (current === undefined || row.academic_year_rank < current) firstYearByStudent.set(row.student_id, row.academic_year_rank)
    })
    const uniqueEnrollments = new Set<string>()
    const reinscriptionKeys = new Set<string>()
    filtered.forEach((row) => {
      const key = row.student_id + ":" + (row.academic_year_id ?? row.id)
      uniqueEnrollments.add(key)
      const firstRank = firstYearByStudent.get(row.student_id)
      if (firstRank !== undefined && row.academic_year_rank !== null && row.academic_year_rank > firstRank) reinscriptionKeys.add(key)
    })

    const byClass: Record<string, number> = {}
    const byAge: Record<string, number> = { "3 à 5 ans": 0, "6 à 8 ans": 0, "9 à 11 ans": 0, "12 à 15 ans": 0, "16 ans et plus": 0, "Âge non renseigné": 0 }
    const byDay: Record<string, number> = {}
    const byYear: Record<string, number> = {}
    filtered.forEach((row) => {
      byClass[row.class_name] = (byClass[row.class_name] || 0) + 1
      const ageGroup = getAgeGroup(row.birth_date)
      if (ageGroup) byAge[ageGroup]++
      else byAge["Âge non renseigné"]++
      const date = row.enrollment_date.slice(0, 10)
      if (date) {
        byDay[date] = (byDay[date] || 0) + 1
        byYear[row.academic_year_name] = (byYear[row.academic_year_name] || 0) + 1
      }
    })
    const classRows = Object.entries(byClass).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
    const dayRows = Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b)).slice(-7).map(([date, count]) => ({ date, count }))
    const yearRows = Object.entries(byYear).sort(([a], [b]) => a.localeCompare(b)).map(([name, count], index, all) => ({
      name,
      count,
      change: index > 0 && all[index - 1][1] > 0 ? ((count - all[index - 1][1]) / all[index - 1][1]) * 100 : null,
    }))
    const total = uniqueEnrollments.size
    const reinscriptions = reinscriptionKeys.size
    return {
      total,
      reinscriptions,
      rate: total ? reinscriptions / total * 100 : 0,
      revenue: filteredRevenue.reduce((sum, row) => sum + row.amount, 0),
      classRows,
      ageRows: Object.entries(byAge).map(([name, count]) => ({ name, count })),
      dayRows,
      yearRows,
    }
  }, [enrollments, revenues, dateStart, dateEnd])

  const activePeriod = dateStart || dateEnd
    ? (dateStart ? formatDate(dateStart) : "Début") + " — " + (dateEnd ? formatDate(dateEnd) : "Aujourd'hui")
    : "Toutes les dates"

  const openFilters = () => {
    setDraftStart(dateStart)
    setDraftEnd(dateEnd)
    setFilterOpen(true)
  }

  const applyFilters = () => {
    if (draftStart && draftEnd && draftStart > draftEnd) {
      setError("La date de début doit précéder la date de fin.")
      return
    }
    setDateStart(draftStart)
    setDateEnd(draftEnd)
    setFilterOpen(false)
    setError(null)
  }

  const maxClass = Math.max(1, ...stats.classRows.map((row) => row.count))
  const maxDay = Math.max(1, ...stats.dayRows.map((row) => row.count))
  const hasData = enrollments.length > 0

  return (
    <main className="min-h-screen bg-white px-4 py-5 text-[#172033] md:px-8 md:py-7">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 border-b border-[#dce2eb] pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-[0.12em] text-[#64748b]">Scolarité / Inscriptions</p>
            <h1 className="text-2xl font-semibold tracking-tight text-[#102a56] md:text-[28px]">Statistiques des inscriptions</h1>
            <p className="mt-1 text-sm text-[#64748b]">Suivi des inscriptions et des réinscriptions de l'établissement.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={openFilters} className="inline-flex h-9 items-center gap-2 border border-[#cbd5e1] px-3 text-sm font-medium text-[#243b60] hover:bg-[#f5f8fc]">
              <Filter className="h-4 w-4" /> Période {dateStart || dateEnd ? "•" : ""}
            </button>
            <button type="button" onClick={() => void loadData(true)} disabled={loading || refreshing} className="inline-flex h-9 items-center gap-2 border border-[#cbd5e1] px-3 text-sm font-medium text-[#243b60] hover:bg-[#f5f8fc] disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Actualiser
            </button>
          </div>
        </header>

        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e5eaf1] py-3 text-xs text-[#64748b]">
          <span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Période : {activePeriod}</span>
          <span>{primaryEstablishment?.name || "Établissement actif"}</span>
        </div>

        {error && <div role="alert" className="mt-4 border-l-4 border-[#b42318] bg-[#fff5f4] px-4 py-3 text-sm text-[#912018]">{error}</div>}
        {loading ? (
          <div role="status" className="py-16 text-center text-sm text-[#64748b]">Chargement des données de l'établissement…</div>
        ) : !establishmentId ? (
          <div className="py-16 text-center text-sm text-[#64748b]">Sélectionnez un établissement pour consulter ses statistiques.</div>
        ) : (
          <>
            <section aria-label="Indicateurs principaux" className="grid grid-cols-2 border-b border-[#dce2eb] py-5 md:grid-cols-4">
              <div className="border-r border-[#e5eaf1] px-3 py-2 first:pl-0">
                <p className="text-xs text-[#64748b]">Inscriptions</p>
                <p className="mt-1 text-3xl font-semibold tabular-nums text-[#102a56]">{numberFormat.format(stats.total)}</p>
              </div>
              <div className="border-r border-[#e5eaf1] px-3 py-2 md:pl-6">
                <p className="text-xs text-[#64748b]">Réinscriptions</p>
                <p className="mt-1 text-3xl font-semibold tabular-nums text-[#102a56]">{numberFormat.format(stats.reinscriptions)}</p>
              </div>
              <div className="border-r border-[#e5eaf1] px-3 py-2 md:pl-6">
                <p className="text-xs text-[#64748b]">Taux de réinscription</p>
                <p className="mt-1 text-3xl font-semibold tabular-nums text-[#102a56]">{stats.rate.toFixed(1)}%</p>
              </div>
              <div className="px-3 py-2 md:pl-6">
                <p className="text-xs text-[#64748b]">Recettes encaissées</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-[#102a56]">{moneyFormat.format(stats.revenue)} <span className="text-xs font-medium">FCFA</span></p>
              </div>
            </section>

            <section className="grid gap-8 border-b border-[#dce2eb] py-6 md:grid-cols-[1.15fr_0.85fr]">
              <div>
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-[#172b4d]">Inscriptions par classe</h2>
                    <p className="mt-1 text-xs text-[#64748b]">Répartition des dossiers sur la période sélectionnée</p>
                  </div>
                  <span className="text-xs text-[#64748b]">{stats.classRows.length} classe(s)</span>
                </div>
                {stats.classRows.length ? (
                  <div className="space-y-4">
                    {stats.classRows.map((row) => (
                      <div key={row.name} className="grid grid-cols-[minmax(90px,140px)_1fr_36px] items-center gap-3 text-sm">
                        <span className="truncate text-[#34445d]">{row.name}</span>
                        <div className="h-2 overflow-hidden bg-[#edf1f6]"><div className="h-full bg-[#2856a6]" style={{ width: `${row.count / maxClass * 100}%` }} /></div>
                        <span className="text-right font-semibold tabular-nums text-[#172b4d]">{row.count}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="py-8 text-sm text-[#64748b]">Aucune inscription sur cette période.</p>}
              </div>
              <div className="border-t border-[#e5eaf1] pt-6 md:border-l md:border-t-0 md:pl-7 md:pt-0">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-[#172b4d]">Activité récente</h2>
                    <p className="mt-1 text-xs text-[#64748b]">Nombre d'inscriptions par jour</p>
                  </div>
                  <span className="text-xs text-[#64748b]">7 derniers jours actifs</span>
                </div>
                {stats.dayRows.length ? (
                  <div className="space-y-3">
                    {stats.dayRows.map((row) => (
                      <div key={row.date} className="grid grid-cols-[76px_1fr_24px] items-center gap-2 text-xs">
                        <span className="text-[#64748b]">{formatDate(row.date)}</span>
                        <div className="h-2 overflow-hidden bg-[#edf1f6]"><div className="h-full bg-[#6686bd]" style={{ width: `${row.count / maxDay * 100}%` }} /></div>
                        <span className="text-right font-semibold tabular-nums">{row.count}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="py-8 text-sm text-[#64748b]">Aucune activité à afficher.</p>}
              </div>
            </section>

            <section className="border-b border-[#dce2eb] py-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-[#172b4d]">Évolution par année scolaire</h2>
                  <p className="mt-1 text-xs text-[#64748b]">Comparaison des inscriptions enregistrées dans Supabase.</p>
                </div>
                <button type="button" onClick={() => setDetailsOpen(true)} className="h-9 self-start border border-[#cbd5e1] px-3 text-sm font-medium text-[#243b60] hover:bg-[#f5f8fc] sm:self-auto">
                  Voir la répartition détaillée
                </button>
              </div>
              {stats.yearRows.length ? (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[420px] text-left text-sm">
                    <thead className="border-y border-[#e5eaf1] text-xs text-[#64748b]">
                      <tr><th className="py-2 font-medium">Année scolaire</th><th className="py-2 text-right font-medium">Inscriptions</th><th className="py-2 text-right font-medium">Évolution</th></tr>
                    </thead>
                    <tbody>
                      {stats.yearRows.map((row) => (
                        <tr key={row.name} className="border-b border-[#edf1f6]">
                          <td className="py-3 font-medium text-[#34445d]">{row.name}</td>
                          <td className="py-3 text-right font-semibold tabular-nums">{numberFormat.format(row.count)}</td>
                          <td className="py-3 text-right tabular-nums text-[#64748b]">{row.change === null ? "—" : `${row.change > 0 ? "+" : ""}${row.change.toFixed(1)}%`}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="py-8 text-sm text-[#64748b]">Aucun historique disponible.</p>}
            </section>
            {!hasData && <p className="py-6 text-center text-xs text-[#64748b]">Aucun dossier d'inscription n'est encore enregistré pour cet établissement.</p>}
            <footer className="flex flex-wrap items-center justify-between gap-2 py-4 text-xs text-[#64748b]">
              <span><Users className="mr-1 inline h-3.5 w-3.5" /> Données issues de la base de l'établissement.</span>
              <span>{numberFormat.format(enrollments.length)} dossier(s) chargé(s)</span>
            </footer>
          </>
        )}
      </div>

      {filterOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0b1730]/45 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setFilterOpen(false) }}>
          <section role="dialog" aria-modal="true" aria-labelledby="filters-title" className="w-full max-w-md bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#e5eaf1] px-5 py-4">
              <div><h2 id="filters-title" className="font-semibold text-[#172b4d]">Filtrer les statistiques</h2><p className="mt-1 text-xs text-[#64748b]">Choisissez la période à analyser.</p></div>
              <button type="button" onClick={() => setFilterOpen(false)} aria-label="Fermer" className="p-2 text-[#64748b] hover:bg-[#f1f5f9]"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-4 px-5 py-5">
              <label className="block text-sm font-medium text-[#34445d]">Date de début<input type="date" value={draftStart} onChange={(event) => setDraftStart(event.target.value)} className="mt-1 h-10 w-full border border-[#cbd5e1] px-3 text-sm" /></label>
              <label className="block text-sm font-medium text-[#34445d]">Date de fin<input type="date" value={draftEnd} onChange={(event) => setDraftEnd(event.target.value)} className="mt-1 h-10 w-full border border-[#cbd5e1] px-3 text-sm" /></label>
            </div>
            <div className="flex justify-between border-t border-[#e5eaf1] px-5 py-4">
              <button type="button" onClick={() => { setDraftStart(""); setDraftEnd(""); setDateStart(""); setDateEnd(""); setFilterOpen(false) }} className="text-sm text-[#64748b] hover:text-[#172b4d]">Effacer les filtres</button>
              <button type="button" onClick={applyFilters} className="h-9 bg-[#173b78] px-4 text-sm font-medium text-white hover:bg-[#102e61]">Appliquer</button>
            </div>
          </section>
        </div>
      )}

      {detailsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0b1730]/45 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDetailsOpen(false) }}>
          <section role="dialog" aria-modal="true" aria-labelledby="details-title" className="max-h-[85vh] w-full max-w-xl overflow-y-auto bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-[#e5eaf1] bg-white px-5 py-4">
              <div><h2 id="details-title" className="font-semibold text-[#172b4d]">Répartition détaillée</h2><p className="mt-1 text-xs text-[#64748b]">Tranches d'âge des élèves inscrits sur la période.</p></div>
              <button type="button" onClick={() => setDetailsOpen(false)} aria-label="Fermer" className="p-2 text-[#64748b] hover:bg-[#f1f5f9]"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-4 px-5 py-5">
              {stats.ageRows.map((row) => (
                <div key={row.name} className="grid grid-cols-[1fr_2fr_36px] items-center gap-3 text-sm">
                  <span className="text-[#34445d]">{row.name}</span>
                  <div className="h-2 overflow-hidden bg-[#edf1f6]"><div className="h-full bg-[#2856a6]" style={{ width: `${stats.total ? row.count / stats.total * 100 : 0}%` }} /></div>
                  <span className="text-right font-semibold tabular-nums">{row.count}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-[#e5eaf1] px-5 py-4 text-right"><button type="button" onClick={() => setDetailsOpen(false)} className="h-9 bg-[#173b78] px-4 text-sm font-medium text-white">Fermer</button></div>
          </section>
        </div>
      )}
    </main>
  )
}
