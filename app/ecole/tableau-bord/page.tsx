"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  AlertTriangle, ArrowRight, CalendarDays, CheckCircle2, ClipboardCheck,
  Clock3, CreditCard, FileWarning, GraduationCap, History, Plus,
  ReceiptText, School, UserPlus, Users
} from "lucide-react"
import { financeService } from "@/lib/supabase/services/finance.service"
import { useUserContext } from "@/hooks/useUserContext"
import { useAcademicYears } from "@/hooks/useAcademicYears"
import { useEnrollments } from "@/hooks/useEnrollments"

const money = (value: number) =>
  new Intl.NumberFormat("fr-FR").format(Math.max(0, Math.round(value))) + " FCFA"

export default function PageTableauBord() {
  const { primaryEstablishment } = useUserContext()
  const establishmentId = primaryEstablishment?.id ?? null
  const { activeYear, isLoading: academicYearLoading } = useAcademicYears(establishmentId)
  const { total: activeEnrollmentCount, isLoading: enrollmentCountLoading, error: enrollmentCountError } = useEnrollments({
    establishmentId: activeYear?.id ? establishmentId : null,
    page: 1,
    pageSize: 1,
    academicYearId: activeYear?.id ?? null,
    status: "active",
  })
  const [dashboardSummary, setDashboardSummary] = useState<any | null>(null)
  const [dashboardLoading, setDashboardLoading] = useState(false)
  const [dashboardError, setDashboardError] = useState<string | null>(null)
  const [overdueSchedules, setOverdueSchedules] = useState<any[]>([])
  const [overdueLoading, setOverdueLoading] = useState(false)
  const [overdueError, setOverdueError] = useState<string | null>(null)

  useEffect(() => {
    if (!establishmentId || !activeYear?.id) {
      setDashboardSummary(null)
      setDashboardLoading(false)
      return
    }

    let active = true
    setDashboardLoading(true)
    setDashboardError(null)
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Libreville" })
    const monthStart = today.slice(0, 7) + "-01"

    void financeService.getSchoolDashboardSummary(establishmentId, activeYear.id, today, monthStart)
      .then((summary) => { if (active) setDashboardSummary(summary) })
      .catch((error: any) => {
        if (active) {
          setDashboardSummary(null)
          setDashboardError(error?.message || "Impossible de charger les indicateurs.")
        }
      })
      .finally(() => { if (active) setDashboardLoading(false) })

    return () => { active = false }
  }, [establishmentId, activeYear?.id])

  useEffect(() => {
    if (!establishmentId || !activeYear?.id) {
      setOverdueSchedules([])
      return
    }

    let active = true
    setOverdueLoading(true)
    setOverdueError(null)
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Libreville" })

    void financeService.getOverdueSchedules(establishmentId, activeYear.id, today)
      .then((rows) => { if (active) setOverdueSchedules(rows) })
      .catch((error: any) => {
        if (active) {
          setOverdueSchedules([])
          setOverdueError(error?.message || "Impossible de vérifier les échéances.")
        }
      })
      .finally(() => { if (active) setOverdueLoading(false) })

    return () => { active = false }
  }, [establishmentId, activeYear?.id])

  const overdueSummary = useMemo(() => ({
    schedules: overdueSchedules.length,
    students: new Set(overdueSchedules.map((row) => row.student_id)).size,
    amount: overdueSchedules.reduce((sum, row) => sum + Number(row.remaining_amount || 0), 0),
  }), [overdueSchedules])

  const indicatorsLoading = academicYearLoading || dashboardLoading
  const evenements = dashboardSummary?.upcomingEvents ?? []
  const activitesRecentes = dashboardSummary?.recentActivity ?? []

  const dateLabel = useMemo(
    () => new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Libreville" }),
    []
  )

  const actions = [
    { href: "/ecole/inscriptions", label: "Nouvelle inscription", icon: UserPlus, primary: true },
    { href: "/ecole/finance/paiements", label: "Enregistrer un paiement", icon: CreditCard },
    { href: "/ecole/students", label: "Ajouter un élève", icon: Plus },
    { href: "/ecole/registre-appel", label: "Registre d'appel du jour", icon: ClipboardCheck },
    { href: "/ecole/evenements", label: "Ajouter un événement", icon: CalendarDays },
  ]

  const situations = [
    {
      label: "Finance",
      tone: "finance",
      text: overdueLoading
        ? "Vérification des échéances de l’année scolaire en cours…"
        : overdueError
          ? overdueError
          : overdueSummary.schedules > 0
            ? overdueSummary.schedules + " échéance(s) en retard pour " + overdueSummary.students + " élève(s) — " + money(overdueSummary.amount) + " restant dû."
            : "Aucune échéance échue et impayée pour l’année scolaire en cours.",
      href: "/ecole/finance/paiements",
      action: "Consulter la liste",
    },
    {
      label: "Vie scolaire",
      tone: "school",
      text: dashboardLoading
        ? "Vérification des présences et retards du jour…"
        : dashboardError
          ? dashboardError
          : (dashboardSummary?.absences ?? 0) + (dashboardSummary?.lateArrivals ?? 0) > 0
            ? (dashboardSummary?.absences ?? 0) + " absence(s) et " + (dashboardSummary?.lateArrivals ?? 0) + " retard(s) signalés aujourd'hui."
            : "Aucune absence ni aucun retard signalé aujourd'hui.",
      href: "/ecole/absences",
      action: "Traiter les absences",
    },
    {
      label: "Inscriptions",
      tone: "registration",
      text: dashboardLoading ? "Vérification des dossiers…" : dashboardError ? dashboardError : (dashboardSummary?.pendingEnrollments ?? 0) > 0 ? (dashboardSummary?.pendingEnrollments ?? 0) + " dossier(s) d'inscription en attente de validation." : "Aucun dossier d'inscription en attente pour l'année scolaire active.",
      href: "/ecole/inscriptions",
      action: "Examiner",
    },
    {
      label: "Personnel",
      tone: "staff",
      text: dashboardLoading ? "Vérification du pointage du personnel…" : dashboardError ? dashboardError : (dashboardSummary?.staffAttendanceRecorded ?? 0) === 0 ? "Aucun pointage du personnel enregistré aujourd'hui." : (dashboardSummary?.staffPresent ?? 0) + " membre(s) du personnel présent(s) ou en retard sur " + (dashboardSummary?.activeStaff ?? 0) + " actif(s).",
      href: "/ecole/personnel",
      action: "Gérer l'affectation",
    },
  ]

  const metrics = [
    { label: "Élèves actifs", value: enrollmentCountLoading ? "…" : enrollmentCountError ? "—" : activeEnrollmentCount.toLocaleString("fr-FR"), note: enrollmentCountError ? "Données indisponibles" : "Inscriptions de l’année active", icon: School },
    { label: "Classes ouvertes", value: indicatorsLoading ? "…" : dashboardError ? "—" : (dashboardSummary?.activeClasses ?? 0).toLocaleString("fr-FR"), note: "Classes actives configurées", icon: GraduationCap },
    { label: "Enseignants", value: indicatorsLoading ? "…" : dashboardError ? "—" : (dashboardSummary?.activeTeachers ?? 0).toLocaleString("fr-FR"), note: "Enseignants actifs", icon: Users },
    { label: "Présence personnel", value: indicatorsLoading ? "…" : dashboardError ? "—" : (dashboardSummary?.staffAttendanceRecorded ?? 0) === 0 ? "Non pointé" : (dashboardSummary?.staffPresent ?? 0) + "/" + (dashboardSummary?.activeStaff ?? 0), note: indicatorsLoading ? "Chargement…" : dashboardError ? "Données indisponibles" : (dashboardSummary?.staffAttendanceRecorded ?? 0) === 0 ? "Aucun pointage aujourd’hui" : (dashboardSummary?.staffAttendanceRecorded ?? 0) + " pointage(s) saisi(s) aujourd’hui", icon: CheckCircle2 },
    { label: "Recettes du mois", value: indicatorsLoading ? "…" : dashboardError ? "—" : money(dashboardSummary?.monthlyReceipts ?? 0), note: "Encaissements enregistrés ce mois", icon: CreditCard },
    { label: "Échéances en retard", value: overdueLoading ? "…" : overdueError ? "—" : overdueSummary.schedules.toLocaleString("fr-FR"), note: overdueLoading ? "Vérification…" : overdueError ? "Données indisponibles" : overdueSummary.students + " élève(s) concernés", icon: AlertTriangle, danger: overdueSummary.schedules > 0 },
    { label: "Absences du jour", value: indicatorsLoading ? "…" : dashboardError ? "—" : (dashboardSummary?.absences ?? 0).toLocaleString("fr-FR"), note: indicatorsLoading ? "Chargement…" : dashboardError ? "Données indisponibles" : (dashboardSummary?.lateArrivals ?? 0) + " retard(s) · " + (dashboardSummary?.justifiedAbsences ?? 0) + " justifiée(s)", icon: CalendarDays },
    { label: "Inscriptions en attente", value: indicatorsLoading ? "…" : dashboardError ? "—" : (dashboardSummary?.pendingEnrollments ?? 0).toLocaleString("fr-FR"), note: "Dossiers à valider · année active", icon: ClipboardCheck },
  ]

  const urgentCount = (overdueSummary.schedules > 0 ? 1 : 0) + (((dashboardSummary?.absences ?? 0) + (dashboardSummary?.lateArrivals ?? 0)) > 0 ? 1 : 0) + ((dashboardSummary?.pendingEnrollments ?? 0) > 0 ? 1 : 0)

  return (
    <div className="w-full">
      <section className="flex flex-col gap-3 border-b border-[#c5c5d3]/45 pb-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-[24px] font-semibold leading-8 tracking-tight text-[#00236f]">Tableau de bord</h1>
          <p className="mt-0.5 text-[13px] text-[#515f74]">
            Vue générale de l'établissement — Année scolaire en cours
          </p>
        </div>

        <div className="flex max-w-3xl flex-wrap gap-1.5">
          {actions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={[
                "inline-flex h-8 items-center gap-1.5 rounded border px-3 text-[12px] font-medium transition-colors",
                action.primary
                  ? "border-[#00236f] bg-[#1e3a8a] text-white hover:bg-[#00236f]"
                  : "border-[#c5c5d3]/70 bg-white text-[#131b2e] hover:bg-[#f2f3ff]",
              ].join(" ")}
            >
              <action.icon className="h-4 w-4" strokeWidth={1.7} />
              <span>{action.label}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="min-h-[88px] rounded border border-[#c5c5d3]/55 bg-white p-2.5">
            <div className="flex items-start justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#515f74]">{metric.label}</span>
              <metric.icon className={`h-[17px] w-[17px] ${metric.danger ? "text-[#ba1a1a]" : "text-[#515f74]"}`} strokeWidth={1.7} />
            </div>
            <p className={`mt-1.5 text-[21px] font-semibold leading-6 tabular-nums ${metric.danger ? "text-[#ba1a1a]" : "text-[#131b2e]"}`}>{metric.value}</p>
            <p className={`mt-0.5 text-[11px] ${metric.danger ? "text-[#ba1a1a]" : "text-[#515f74]"}`}>{metric.note}</p>
          </div>
        ))}
      </section>

      <section className="mt-4 overflow-hidden rounded border border-[#c5c5d3]/55 bg-white">
        <div className="flex items-center justify-between border-b border-[#c5c5d3]/55 bg-[#f2f3ff] px-3 py-2">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-[#131b2e]">
            <AlertTriangle className="h-[17px] w-[17px] text-[#ba1a1a]" strokeWidth={1.8} />
            Situations nécessitant une action immédiate
          </h2>
          <span className="rounded bg-[#ffdad6] px-2 py-1 text-[10px] font-semibold text-[#93000a]">{urgentCount} point(s) à traiter</span>
        </div>

        <div className="divide-y divide-[#c5c5d3]/45">
          {situations.map((item) => (
            <div key={item.label} className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center">
              <span className={[
                "w-fit rounded px-2 py-1 text-[10px] font-semibold",
                item.tone === "finance" ? "bg-[#ffdad6] text-[#93000a]" :
                item.tone === "school" ? "bg-[#d5e3fc] text-[#264191]" :
                item.tone === "registration" ? "bg-[#dce1ff] text-[#264191]" :
                "bg-[#89f5e7] text-[#00312c]"
              ].join(" ")}>{item.label}</span>
              <p className="min-w-0 flex-1 text-[12px] text-[#131b2e]">{item.text}</p>
              <Link href={item.href} className="inline-flex shrink-0 items-center gap-1 rounded border border-[#c5c5d3]/65 px-2.5 py-1.5 text-[11px] font-medium text-[#00236f] hover:bg-[#f2f3ff]">
                {item.action}<ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-3 overflow-hidden rounded border border-[#c5c5d3]/55 bg-white">
        <div className="flex flex-col gap-1 border-b border-[#c5c5d3]/55 bg-[#fff1f0] px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-[14px] font-semibold text-[#93000a]">
              <FileWarning className="h-4 w-4" /> Échéances de scolarité en retard
            </h2>
            <p className="text-[11px] text-[#7f1d1d]">Année scolaire active · Montants restant réellement à payer</p>
          </div>
          <Link href="/ecole/finance/paiements" className="inline-flex w-fit items-center gap-1 rounded border border-[#e5b8b5] bg-white px-2.5 py-1.5 text-[11px] font-medium text-[#93000a] hover:bg-[#fff7f6]">
            Voir toutes les échéances <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {overdueLoading ? (
          <p className="px-3 py-4 text-[12px] text-[#515f74]">Chargement des échéances en retard…</p>
        ) : overdueError ? (
          <p className="px-3 py-4 text-[12px] text-red-700">{overdueError}</p>
        ) : overdueSchedules.length === 0 ? (
          <p className="px-3 py-4 text-[12px] text-[#515f74]">Aucune échéance en retard détectée pour cette année scolaire.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-x-5 gap-y-1 border-b border-[#c5c5d3]/45 px-3 py-2 text-[11px]">
              <span><strong className="text-[#93000a]">{overdueSummary.schedules}</strong> échéance(s)</span>
              <span><strong className="text-[#93000a]">{overdueSummary.students}</strong> élève(s)</span>
              <span className="font-semibold text-[#93000a]">{money(overdueSummary.amount)} à recouvrer</span>
            </div>
            <div className="divide-y divide-[#c5c5d3]/40">
              {overdueSchedules.slice(0, 8).map((row) => (
                <div key={row.schedule_id} className="flex flex-col gap-1 px-3 py-2 sm:flex-row sm:items-center sm:gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-semibold text-[#131b2e]">{row.last_name || ""} {row.first_name || ""}</p>
                    <p className="text-[11px] text-[#515f74]">{row.class_name || "Classe non renseignée"} · {row.label} · échéance du {new Date(row.due_date).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric", timeZone: "Africa/Libreville" })}</p>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <span className="text-[10px] font-medium text-[#93000a]">{Math.max(0, Number(row.days_overdue) || 0)} jour(s) de retard</span>
                    <strong className="text-[12px] tabular-nums text-[#93000a]">{money(Number(row.remaining_amount || 0))}</strong>
                  </div>
                </div>
              ))}
            </div>
            {overdueSchedules.length > 8 && <p className="border-t border-[#c5c5d3]/45 px-3 py-2 text-[11px] text-[#515f74]">Et {overdueSchedules.length - 8} autre(s) échéance(s) en retard dans le suivi financier.</p>}
          </>
        )}
      </section>
      <section className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="overflow-hidden rounded border border-[#c5c5d3]/55 bg-white">
          <div className="flex items-center justify-between border-b border-[#c5c5d3]/55 bg-[#f2f3ff] px-3 py-2">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-[#131b2e]">
              <History className="h-[17px] w-[17px] text-[#515f74]" strokeWidth={1.8} />
              Activité récente du système
            </h2>
            <span className="text-[11px] text-[#515f74]">{dateLabel}</span>
          </div>

          <div className="divide-y divide-[#c5c5d3]/45">
            {activitesRecentes.length ? activitesRecentes.map((event: any, index: number) => (
              <div key={event.id ?? index} className="flex items-start gap-3 px-3 py-2.5">
                <span className="mt-0.5 w-10 shrink-0 font-mono text-[11px] text-[#515f74]">{String(index + 1).padStart(2, "0")}</span>
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-[#131b2e]">{String(event.action || "Opération enregistrée").replace(/[._]/g, " ")}</p>
                  <p className="mt-0.5 text-[11px] leading-4 text-[#515f74]">{event.entity_type ? "Élément concerné : " + event.entity_type : "Opération enregistrée dans l'établissement."}</p>
                  <p className="mt-0.5 text-[11px] text-[#64748b]">Effectuée par : <span className="font-medium text-[#334155]">{event.actor_name || "Auteur non renseigné"}</span></p>
                </div>
              </div>
            )) : (
              <div className="px-3 py-5 text-[12px] text-[#515f74]">Aucune activité récente.</div>
            )}
          </div>

          <Link href="/ecole/activite" className="flex items-center justify-center gap-1 border-t border-[#c5c5d3]/55 px-3 py-2 text-[11px] font-medium text-[#00236f] hover:bg-[#f2f3ff]">
            Consulter le journal d’activité <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="overflow-hidden rounded border border-[#c5c5d3]/55 bg-white">
          <div className="flex items-center justify-between border-b border-[#c5c5d3]/55 bg-[#f2f3ff] px-3 py-2">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-[#131b2e]">
              <CalendarDays className="h-[17px] w-[17px] text-[#515f74]" strokeWidth={1.8} />
              Calendrier institutionnel
            </h2>
            <span className="text-[11px] text-[#515f74]">{(dashboardSummary?.upcomingEventsCount ?? 0) + " événement(s) à venir"}</span>
          </div>

          <div className="divide-y divide-[#c5c5d3]/45">
            {evenements.slice(0, 8).map((event: any, index: number) => {
              const date = event.starts_at ? new Date(event.starts_at) : null
              return (
                <div key={event.id ?? index} className="flex gap-3 px-3 py-3">
                  <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded border border-[#c5c5d3]/60 bg-[#f2f3ff]">
                    <span className="text-[9px] font-semibold uppercase text-[#515f74]">{date ? date.toLocaleDateString("fr-FR", { month: "short" }).replace(".", "") : "—"}</span>
                    <span className="text-[16px] font-semibold text-[#00236f]">{date ? date.getDate() : "—"}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-[#131b2e]">{event.title}</p>
                    <p className="mt-0.5 text-[11px] leading-4 text-[#515f74]">{event.description ?? "Événement institutionnel"}</p>
                  </div>
                </div>
              )
            })}
            {!evenements.length && <div className="px-3 py-5 text-[12px] text-[#515f74]">Aucun événement institutionnel à venir pour cette année scolaire.</div>}
          </div>

          <Link href="/ecole/evenements" className="flex items-center justify-center gap-1 border-t border-[#c5c5d3]/55 px-3 py-2 text-[11px] font-medium text-[#00236f] hover:bg-[#f2f3ff]">
            Ouvrir l'agenda académique complet <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>
    </div>
  )
}
