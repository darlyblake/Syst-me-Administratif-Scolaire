"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import {
  ArrowRight, BookOpen, CalendarDays, CreditCard,
  FileText, GraduationCap, MessageSquare,
  ShieldCheck, Users, ChevronRight, AlertCircle,
} from "lucide-react"
import { useAuthentification } from "@/providers/authentification.provider"
import { useParentPortal } from "@/hooks/use-parent-portal"
import { ParentEmptyState } from "@/components/parent/ParentEmptyState"
import { ParentChildSelect } from "@/components/parent/ParentChildSelect"
import { Button } from "@/components/ui/button"

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */
const dateLabel = (value: string) => {
  const d = new Date(value)
  return Number.isNaN(d.getTime())
    ? "Date indisponible"
    : new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(d)
}
const money = (v: number) => new Intl.NumberFormat("fr-FR").format(v) + " FCFA"

const todayInGabon = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Libreville",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date())

const statusLabel = (s: string) =>
  s === "present" ? "Présent" : s === "absent" ? "Absent" : s === "late" ? "En retard" : s === "justified" ? "Justifié" : s

/** Badge de statut de présence — style pill Android */
function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    present:   "sp-badge sp-badge-green",
    justified: "sp-badge sp-badge-green",
    absent:    "sp-badge sp-badge-red",
    late:      "sp-badge sp-badge-amber",
  }
  return (
    <span className={map[status] ?? "sp-badge sp-badge-slate"}>
      {statusLabel(status)}
    </span>
  )
}

/** Carte d'accès rapide — icône ronde sur fond coloré */
function QuickLink({
  href, label, icon: Icon, color,
}: {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2.5 rounded-2xl bg-white p-4 text-center active:bg-slate-50"
      style={{ border: "1px solid #e8f0fb" }}
    >
      <span
        className="flex h-11 w-11 items-center justify-center rounded-full"
        style={{ background: color + "18" }}
      >
        <span style={{ color, display: "flex" }}>
          <Icon className="h-5 w-5" />
        </span>
      </span>
      <span className="text-[12px] font-medium leading-tight text-slate-700">{label}</span>
    </Link>
  )
}

/* ------------------------------------------------------------------ */
/*  Page principale                                                     */
/* ------------------------------------------------------------------ */
export default function ParentsDashboard() {
  const { utilisateur } = useAuthentification()
  const {
    loading, error,
    children, attendance, events, paymentSchedules, grades, homework,
  } = useParentPortal()

  const [selectedChildId, setSelectedChildId] = useState("tous")
  const today = todayInGabon()

  /* --- Memos (logique inchangée) --- */
  const selectedChildren   = useMemo(() => children.filter(c => selectedChildId === "tous" || c.id === selectedChildId), [children, selectedChildId])
  const academicChildren   = useMemo(() => selectedChildren.filter(c => c.can_view_academic), [selectedChildren])
  const financeChildren    = useMemo(() => selectedChildren.filter(c => c.can_view_finance),  [selectedChildren])
  const financeEnrollIds   = useMemo(() => new Set(financeChildren.map(c => c.enrollment_id).filter(Boolean)), [financeChildren])

  const todayAttendance = useMemo(() =>
    attendance.filter(a =>
      a.attendance_date.slice(0, 10) === today &&
      academicChildren.some(c => c.id === a.student_id)
    ), [attendance, today, academicChildren])

  const issues = useMemo(() =>
    attendance
      .filter(a => a.status !== "present" && academicChildren.some(c => c.id === a.student_id))
      .sort((a, b) => Date.parse(b.attendance_date) - Date.parse(a.attendance_date))
      .slice(0, 4),
    [attendance, academicChildren])

  const classIds     = useMemo(() => new Set(academicChildren.map(c => c.class_id).filter(Boolean)), [academicChildren])
  const recentGrades = useMemo(() =>
    grades
      .filter(g => academicChildren.some(c => c.id === g.student_id))
      .sort((a, b) => Date.parse(b.assessment_date ?? "") - Date.parse(a.assessment_date ?? ""))
      .slice(0, 3),
    [grades, academicChildren])

  const classHomework = useMemo(() =>
    homework.filter(h => classIds.has(h.class_id)).slice(0, 3),
    [homework, classIds])

  const upcoming = useMemo(() =>
    events
      .filter(e => Date.parse(e.starts_at) >= Date.now())
      .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))
      .slice(0, 3),
    [events])

  const dueSchedules = useMemo(() =>
    paymentSchedules
      .filter(s => financeEnrollIds.has(s.enrollment_id) && s.amount_due > s.amount_paid)
      .sort((a, b) => Date.parse(a.due_date) - Date.parse(b.due_date)),
    [paymentSchedules, financeEnrollIds])

  const visibleSchedules = paymentSchedules.filter(s => financeEnrollIds.has(s.enrollment_id))
  const totalDue    = dueSchedules.reduce((n, s) => n + Math.max(0, s.amount_due - s.amount_paid), 0)
  const totalAnnual = visibleSchedules.reduce((n, s) => n + s.amount_due,  0)
  const totalPaid   = visibleSchedules.reduce((n, s) => n + s.amount_paid, 0)
  const completion  = totalAnnual > 0 ? Math.min(100, Math.round(totalPaid / totalAnnual * 100)) : 0

  const presentCount = todayAttendance.filter(a => a.status === "present").length
  const absentCount  = todayAttendance.filter(a => a.status === "absent").length
  const lateCount    = todayAttendance.filter(a => a.status === "late").length

  /* --- Chargement --- */
  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-slate-400">
        <RefreshCw className="h-6 w-6 animate-spin text-sky-500" />
        <p className="text-sm">Chargement de votre espace…</p>
      </div>
    )
  }

  /* --- Accueil vide --- */
  const greetingName = utilisateur?.nomUtilisateur
  const dateStr = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Africa/Libreville",
    weekday: "long", day: "numeric", month: "long",
  }).format(new Date())

  return (
    <div className="space-y-5">

      {/* ---- En-tête greeting ---- */}
      <header className="flex items-start justify-between gap-3 pb-2">
        <div>
          <p className="mb-0.5 text-[11px] font-bold uppercase tracking-widest text-sky-700">
            Votre famille
          </p>
          <h1 className="text-[22px] font-bold leading-tight tracking-tight text-slate-900">
            {greetingName ? `Bonjour, ${greetingName}` : "Bonjour"}
          </h1>
          <p className="mt-1 text-[13px] capitalize text-slate-500">{dateStr}</p>
        </div>

      </header>

      {/* ---- Sélecteur enfant ---- */}
      {children.length > 1 && (
        <div className="flex justify-start">
          <ParentChildSelect children={children} value={selectedChildId} onChange={setSelectedChildId} />
        </div>
      )}

      {/* ---- Erreur ---- */}
      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <p>{error}</p>

          </div>
        </div>
      )}

      {/* ---- Aucun enfant ---- */}
      {!children.length ? (
        <ParentEmptyState
          title="Aucun enfant associé"
          description="Associez votre enfant avec le code ou le QR remis par l'établissement."
          action={
            <Button asChild>
              <Link href="/parents/enfants">Associer un enfant</Link>
            </Button>
          }
        />
      ) : (
        <>
          {/* ============================================================
              CARTE PRÉSENCES DU JOUR
              ============================================================ */}
          <section>
            {/* En-tête section */}
            <div className="parent-surface-title">
              <div>
                <h2>Présences du jour</h2>
              </div>
              <Link
                href="/parents/absences"
                className="flex items-center gap-1 text-sm font-medium text-sky-700"
              >
                Voir tout <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            {academicChildren.length === 0 ? (
              <p className="px-4 py-5 text-sm text-slate-500">
                Le suivi des présences n'est pas disponible pour ce compte.
              </p>
            ) : todayAttendance.length === 0 ? (
              <p className="px-4 py-5 text-sm text-slate-500">
                Aucun pointage communiqué pour aujourd'hui.
              </p>
            ) : (
              <div className="grid grid-cols-3 divide-x divide-slate-100">
                <div className="py-5 text-center">
                  <p className="text-2xl font-bold tabular-nums text-emerald-600">{presentCount}</p>
                  <p className="mt-1 text-xs text-slate-500">Présent{presentCount > 1 ? "s" : ""}</p>
                </div>
                <div className="py-5 text-center">
                  <p className="text-2xl font-bold tabular-nums text-red-600">{absentCount}</p>
                  <p className="mt-1 text-xs text-slate-500">Absent{absentCount > 1 ? "s" : ""}</p>
                </div>
                <div className="py-5 text-center">
                  <p className="text-2xl font-bold tabular-nums text-amber-600">{lateCount}</p>
                  <p className="mt-1 text-xs text-slate-500">En retard</p>
                </div>
              </div>
            )}
          </section>

          {/* ============================================================
              ACCÈS RAPIDE — Grille 4 cases
              ============================================================ */}
          <div>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">
              Accès express
            </p>
            <div className="grid grid-cols-4 gap-3">
              <QuickLink href="/parents/enfants"       label="Mes enfants"  icon={Users}         color="#0284c7" />
              <QuickLink href="/parents/notes"         label="Résultats"    icon={GraduationCap} color="#059669" />
              <QuickLink href="/parents/cahier-de-textes" label="Devoirs"   icon={BookOpen}      color="#7c3aed" />
              <QuickLink href="/parents/messages"      label="Messages"     icon={MessageSquare} color="#d97706" />
            </div>
          </div>

          {/* ============================================================
              À SUIVRE — Alertes absences + échéances
              ============================================================ */}
          {(issues.length > 0 || dueSchedules.length > 0) && (
            <section>
              <div className="parent-surface-title">
                <h2>À suivre</h2>
                <span className="sp-badge sp-badge-red">
                  {issues.length + Math.min(dueSchedules.length, 3)} action{issues.length + dueSchedules.length > 1 ? "s" : ""}
                </span>
              </div>
              <div>
                {issues.map(item => {
                  const child = children.find(c => c.id === item.student_id)
                  return (
                    <Link key={item.id} href="/parents/absences" className="parent-list-row group hover:bg-sky-50/40">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900">
                          {item.status === "absent" ? "Absence" : item.status === "late" ? "Retard" : statusLabel(item.status)}
                          {child ? ` · ${child.first_name}` : ""}
                        </p>
                        <p className="text-xs text-slate-500">
                          {dateLabel(item.attendance_date)}{item.reason ? ` · ${item.reason}` : ""}
                        </p>
                      </div>
                      <StatusPill status={item.status} />
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-sky-500" />
                    </Link>
                  )
                })}
                {dueSchedules.slice(0, 3).map(item => (
                  <Link key={item.id} href="/parents/paiements" className="parent-list-row group hover:bg-sky-50/40">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900">
                        {item.label || "Échéance de scolarité"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {money(Math.max(0, item.amount_due - item.amount_paid))} · échéance {dateLabel(item.due_date)}
                      </p>
                    </div>
                    <span className="sp-badge sp-badge-amber">À régler</span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-sky-500" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* ============================================================
              VOS ENFANTS
              ============================================================ */}
          <section>
            <div className="parent-surface-title">
              <h2>Vos enfants</h2>
              <Link href="/parents/enfants" className="text-sm font-medium text-sky-700">Gérer</Link>
            </div>
            {selectedChildren.map(child => {
              const latestToday = todayAttendance.find(a => a.student_id === child.id)
              return (
                <div key={child.id} className="parent-list-row">
                  {/* Avatar initial */}
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sm font-semibold text-sky-800">
                    {child.first_name?.[0]?.toUpperCase() ?? "?"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">
                      {child.first_name} {child.last_name}
                    </p>
                    <p className="text-xs text-slate-500">{child.class_name ?? "Classe non attribuée"}</p>
                  </div>
                  {child.can_view_academic && latestToday ? (
                    <StatusPill status={latestToday.status} />
                  ) : (
                    <span className="sp-badge sp-badge-slate">
                      {child.can_view_academic ? "Non renseigné" : "Suivi N/D"}
                    </span>
                  )}
                </div>
              )
            })}
          </section>

          {/* ============================================================
              DERNIÈRES ÉVALUATIONS
              ============================================================ */}
          {academicChildren.length > 0 && (
            <section>
              <div className="parent-surface-title">
                <h2>Dernières évaluations</h2>
                <Link href="/parents/notes" className="flex items-center gap-1 text-sm font-medium text-sky-700">
                  Tout voir <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
              {recentGrades.length ? (
                recentGrades.map(grade => {
                  const child = selectedChildren.find(c => c.id === grade.student_id)
                  const maxScore = Number(grade.max_score) > 0 ? Number(grade.max_score) : 20
                  return (
                    <div key={grade.id} className="parent-list-row">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900">
                          {grade.subject ?? "Évaluation"}{child ? ` · ${child.first_name}` : ""}
                        </p>
                        <p className="text-xs text-slate-500">
                          {grade.title ?? "Résultat"} · {grade.assessment_date ? dateLabel(grade.assessment_date) : "Date non précisée"}
                        </p>
                      </div>
                      {/* Score pill */}
                      <span className="shrink-0 rounded-xl bg-sky-50 px-3 py-1.5 text-sm font-bold text-sky-800">
                        {grade.score}<span className="font-normal text-slate-400">/{maxScore}</span>
                      </span>
                    </div>
                  )
                })
              ) : (
                <p className="px-4 py-5 text-sm text-slate-500">Aucune note publiée pour cette sélection.</p>
              )}
            </section>
          )}

          {/* ============================================================
              SCOLARITÉ & PAIEMENTS
              ============================================================ */}
          {financeChildren.length > 0 && (
            <section>
              <div className="parent-surface-title">
                <h2>Scolarité & paiements</h2>
                <Link href="/parents/paiements" className="flex items-center gap-1 text-sm font-medium text-sky-700">
                  Détails <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="p-4">
                <p className="text-xs text-slate-500">Reste à régler</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{money(totalDue)}</p>
                {visibleSchedules.length > 0 && (
                  <>
                    {/* Barre de progression */}
                    <div className="my-3 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-sky-600 transition-all"
                        style={{ width: `${completion}%` }}
                      />
                    </div>
                    <div className="flex justify-between gap-2 text-xs text-slate-500">
                      <span>Réglé <b className="font-semibold text-slate-800">{money(totalPaid)}</b></span>
                      <span className="font-semibold text-sky-700">{completion}%</span>
                      <span>Total <b className="font-semibold text-slate-800">{money(totalAnnual)}</b></span>
                    </div>
                  </>
                )}
              </div>
            </section>
          )}

          {/* ============================================================
              TRAVAIL À VENIR (devoirs)
              ============================================================ */}
          {academicChildren.length > 0 && classHomework.length > 0 && (
            <section>
              <div className="parent-surface-title">
                <h2>Travail à venir</h2>
                <Link href="/parents/cahier-de-textes?tab=homework" className="flex items-center gap-1 text-sm font-medium text-sky-700">
                  Tout voir <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
              {classHomework.map(item => (
                <div key={item.id} className="parent-list-row">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-50">
                    <BookOpen className="h-4 w-4 text-violet-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">{item.subject} · {item.title}</p>
                    <p className="text-xs text-slate-500">
                      {item.due_date ? `À rendre le ${dateLabel(item.due_date)}` : "Date non précisée"}
                    </p>
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* ============================================================
              AGENDA — Événements à venir
              ============================================================ */}
          {upcoming.length > 0 && (
            <section>
              <div className="parent-surface-title">
                <h2>Agenda</h2>
                <Link href="/parents/evenements" className="flex items-center gap-1 text-sm font-medium text-sky-700">
                  Tout voir <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
              {upcoming.map(event => {
                const d = new Date(event.starts_at)
                return (
                  <div key={event.id} className="parent-list-row">
                    {/* Calendrier mini */}
                    <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl bg-sky-50">
                      <span className="text-[9px] font-bold uppercase leading-none text-sky-500">
                        {d.toLocaleDateString("fr-FR", { month: "short" })}
                      </span>
                      <span className="text-[16px] font-bold leading-none text-sky-800">{d.getDate()}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900">{event.title}</p>
                      <p className="text-xs text-slate-500">
                        {dateLabel(event.starts_at)}{event.location ? ` · ${event.location}` : ""}
                      </p>
                    </div>
                  </div>
                )
              })}
            </section>
          )}

          {/* ============================================================
              DOCUMENTS SCOLAIRES
              ============================================================ */}
          <section>
            <Link
              href="/parents/documents"
              className="flex items-center gap-4 p-4 hover:bg-sky-50/40 active:bg-sky-50/60"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100">
                <FileText className="h-5 w-5 text-slate-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">Documents scolaires</p>
                <p className="text-xs text-slate-500">Bulletins et documents de l'établissement</p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-sky-500" />
            </Link>
          </section>

        </>
      )}
    </div>
  )
}
