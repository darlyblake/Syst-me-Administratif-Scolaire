"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Activity, ArrowRight, BookOpen, CalendarDays, FileText, MessageSquare, RefreshCw, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuthentification } from "@/providers/authentification.provider"
import { useParentPortal } from "@/hooks/use-parent-portal"
import { ParentEmptyState } from "@/components/parent/ParentEmptyState"
import { ParentChildSelect } from "@/components/parent/ParentChildSelect"

const dateLabel = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "Date indisponible" : new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(date)
}
const money = (value: number) => new Intl.NumberFormat("fr-FR").format(value) + " FCFA"
const todayInGabon = () => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Africa/Libreville", year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date())
const statusLabel = (status: string) => status === "present" ? "Présent" : status === "absent" ? "Absent" : status === "late" ? "En retard" : status === "justified" ? "Justifié" : status

export default function ParentsDashboard() {
  const { utilisateur } = useAuthentification()
  const { loading, error, refresh, children, attendance, events, paymentSchedules, grades, homework } = useParentPortal()
  const [selectedChildId, setSelectedChildId] = useState("tous")
  const today = todayInGabon()
  const selectedChildren = useMemo(() => children.filter(child => selectedChildId === "tous" || child.id === selectedChildId), [children, selectedChildId])
  const academicChildren = useMemo(() => selectedChildren.filter(child => child.can_view_academic), [selectedChildren])
  const financeChildren = useMemo(() => selectedChildren.filter(child => child.can_view_finance), [selectedChildren])
  const financeEnrollmentIds = useMemo(() => new Set(financeChildren.map(child => child.enrollment_id).filter(Boolean)), [financeChildren])
  const todayAttendance = useMemo(() => attendance.filter(item =>
    item.attendance_date.slice(0, 10) === today && academicChildren.some(child => child.id === item.student_id),
  ), [attendance, today, academicChildren])
  const issues = useMemo(() => attendance
    .filter(item => item.status !== "present" && academicChildren.some(child => child.id === item.student_id))
    .sort((a, b) => Date.parse(b.attendance_date) - Date.parse(a.attendance_date)).slice(0, 4), [attendance, academicChildren])
  const classIds = useMemo(() => new Set(academicChildren.map(child => child.class_id).filter(Boolean)), [academicChildren])
  const recentGrades = useMemo(() => grades.filter(grade => academicChildren.some(child => child.id === grade.student_id)).sort((a, b) => Date.parse(b.assessment_date ?? "") - Date.parse(a.assessment_date ?? "")).slice(0, 3), [grades, academicChildren])
  const classHomework = useMemo(() => homework.filter(item => classIds.has(item.class_id)).slice(0, 3), [homework, classIds])
  const upcoming = useMemo(() => events
    .filter(event => Date.parse(event.starts_at) >= Date.now())
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at)).slice(0, 3), [events])
  const dueSchedules = useMemo(() => paymentSchedules
    .filter(item => financeEnrollmentIds.has(item.enrollment_id) && item.amount_due > item.amount_paid)
    .sort((a, b) => Date.parse(a.due_date) - Date.parse(b.due_date)), [paymentSchedules, financeEnrollmentIds])
  const totalDue = dueSchedules.reduce((sum, item) => sum + Math.max(0, item.amount_due - item.amount_paid), 0)
  const visibleSchedules = paymentSchedules.filter(item => financeEnrollmentIds.has(item.enrollment_id))
  const totalAnnual = visibleSchedules.reduce((sum, item) => sum + item.amount_due, 0)
  const totalPaid = visibleSchedules.reduce((sum, item) => sum + item.amount_paid, 0)
  const completion = totalAnnual > 0 ? Math.min(100, Math.round(totalPaid / totalAnnual * 100)) : 0
  const presentCount = todayAttendance.filter(item => item.status === "present").length
  const absentCount = todayAttendance.filter(item => item.status === "absent").length
  const lateCount = todayAttendance.filter(item => item.status === "late").length

  if (loading) return <div className="flex min-h-[45vh] items-center justify-center text-sm text-slate-500"><RefreshCw className="mr-2 h-4 w-4 animate-spin text-blue-700" />Chargement de votre espace parent…</div>

  return (
    <div className="space-y-5 sm:space-y-6">
      <header className="parent-page-head">
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-blue-700">Votre famille</p>
          <h1>{utilisateur?.nomUtilisateur ? `Bonjour, ${utilisateur.nomUtilisateur}` : "Bonjour"}</h1>
          <p className="mt-1 text-sm text-slate-500">Retrouvez ici les informations scolaires et les démarches concernant vos enfants.</p>
        </div>
        <Button variant="outline" size="sm" className="min-h-10 rounded-md border-slate-300 bg-white" onClick={() => void refresh()} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" />Actualiser
        </Button>
      </header>

      {children.length > 1 && <div className="flex justify-start"><ParentChildSelect children={children} value={selectedChildId} onChange={setSelectedChildId} /></div>}

      {error && <div role="alert" className="flex flex-col gap-3 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between"><span>{error}</span><Button variant="outline" size="sm" className="bg-white" onClick={() => void refresh()}>Réessayer</Button></div>}

      {!children.length ? (
        <ParentEmptyState title="Aucun enfant associé à votre compte" description="Associez votre enfant avec le code ou le QR remis par l’établissement pour accéder à ses informations." action={<Button asChild><Link href="/parents/enfants">Associer un enfant</Link></Button>} />
      ) : (
        <>
          <section className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 sm:px-5">
              <div><h2>Présences du jour</h2><p className="mt-0.5 text-xs text-slate-500">{new Intl.DateTimeFormat("fr-FR", { timeZone: "Africa/Libreville", weekday: "long", day: "numeric", month: "long" }).format(new Date())}</p></div>
              <Link href="/parents/absences" className="inline-flex min-h-10 items-center gap-1 text-sm font-medium text-blue-700">Voir le suivi <ArrowRight className="h-4 w-4" /></Link>
            </div>
            {academicChildren.length === 0 ? (
              <p className="px-4 py-4 text-sm text-slate-500">Le suivi des présences n’est pas autorisé pour les enfants associés à ce compte.</p>
            ) : todayAttendance.length === 0 ? (
              <p className="px-4 py-4 text-sm text-slate-500">Aucun pointage n’a encore été communiqué pour aujourd’hui. Cela ne signifie pas que votre enfant est absent.</p>
            ) : (
              <div className="grid grid-cols-3 divide-x divide-slate-200">
                <div className="px-3 py-4 text-center"><p className="text-2xl font-semibold tabular-nums text-emerald-700">{presentCount}</p><p className="mt-1 text-xs text-slate-500">Présent{presentCount > 1 ? "s" : ""}</p></div>
                <div className="px-3 py-4 text-center"><p className="text-2xl font-semibold tabular-nums text-red-700">{absentCount}</p><p className="mt-1 text-xs text-slate-500">Absent{absentCount > 1 ? "s" : ""}</p></div>
                <div className="px-3 py-4 text-center"><p className="text-2xl font-semibold tabular-nums text-amber-700">{lateCount}</p><p className="mt-1 text-xs text-slate-500">En retard</p></div>
              </div>
            )}
          </section>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Link href="/parents/enfants" className="flex min-h-[88px] flex-col justify-between border border-slate-200 bg-white p-3 transition-colors hover:border-blue-300">
              <Users className="h-5 w-5 text-blue-700" /><span className="text-sm font-medium text-slate-800">Mes enfants</span>
            </Link>
            <Link href="/parents/notes" className="flex min-h-[88px] flex-col justify-between border border-slate-200 bg-white p-3 transition-colors hover:border-blue-300">
              <Activity className="h-5 w-5 text-blue-700" /><span className="text-sm font-medium text-slate-800">Résultats scolaires</span>
            </Link>
            <Link href="/parents/cahier-de-textes" className="flex min-h-[88px] flex-col justify-between border border-slate-200 bg-white p-3 transition-colors hover:border-blue-300">
              <BookOpen className="h-5 w-5 text-blue-700" /><span className="text-sm font-medium text-slate-800">Leçons et devoirs</span>
            </Link>
            <Link href="/parents/messages" className="flex min-h-[88px] flex-col justify-between border border-slate-200 bg-white p-3 transition-colors hover:border-blue-300">
              <MessageSquare className="h-5 w-5 text-blue-700" /><span className="text-sm font-medium text-slate-800">Messagerie</span>
            </Link>
          </div>

          <div className="parent-two-columns">
            <div className="space-y-4">
              <section>
                <div className="parent-surface-title"><div><h2>À suivre</h2><p className="mt-1 text-xs text-slate-500">Absences, retards et échéances signalés.</p></div></div>
                {issues.length || dueSchedules.length ? <div>
                  {issues.map(item => {
                    const child = children.find(entry => entry.id === item.student_id)
                    return <div key={item.id} className="parent-list-row">
                      <div className="min-w-0 flex-1"><p className="text-sm font-medium text-slate-900">{item.status === "absent" ? "Absence enregistrée" : item.status === "late" ? "Retard enregistré" : statusLabel(item.status)}{child ? ` — ${child.first_name} ${child.last_name}` : ""}</p><p className="text-xs text-slate-500">{dateLabel(item.attendance_date)}{item.reason ? ` · ${item.reason}` : ""}</p></div>
                      <Button asChild variant="outline" size="sm" className="rounded-md"><Link href="/parents/absences">Voir</Link></Button>
                    </div>
                  })}
                  {dueSchedules.slice(0, 3).map(item => <div key={item.id} className="parent-list-row">
                    <div className="min-w-0 flex-1"><p className="text-sm font-medium text-slate-900">{item.label || "Échéance de scolarité"}</p><p className="text-xs text-slate-500">{money(Math.max(0, item.amount_due - item.amount_paid))} · échéance {dateLabel(item.due_date)}</p></div>
                    <Button asChild variant="outline" size="sm" className="rounded-md"><Link href="/parents/paiements">Voir</Link></Button>
                  </div>)}
                </div> : <p className="px-4 py-5 text-sm text-slate-500">Aucun point nécessitant votre attention n’est signalé actuellement.</p>}
              </section>

              <section>
                <div className="parent-surface-title"><h2>Vos enfants</h2><Link href="/parents/enfants" className="text-sm font-medium text-blue-700">Gérer</Link></div>
                {selectedChildren.map(child => {
                  const latestToday = todayAttendance.find(item => item.student_id === child.id)
                  return <div key={child.id} className="parent-list-row">
                    <div className="min-w-0 flex-1"><p className="text-sm font-medium text-slate-900">{child.first_name} {child.last_name}</p><p className="text-xs text-slate-500">{child.class_name ?? "Classe non attribuée"}</p></div>
                    <div className="text-right"><p className="text-xs text-slate-500">{child.can_view_academic ? (latestToday ? statusLabel(latestToday.status) : "Présence non renseignée") : "Suivi non autorisé"}</p></div>
                  </div>
                })}
              </section>

              {academicChildren.length > 0 && <section>
                <div className="parent-surface-title"><h2>Dernières évaluations</h2><Link href="/parents/notes" className="text-sm font-medium text-blue-700">Tous les résultats</Link></div>
                {recentGrades.length ? recentGrades.map(grade => {
                  const child = selectedChildren.find(entry => entry.id === grade.student_id)
                  return <div key={grade.id} className="parent-list-row">
                    <div className="min-w-0 flex-1"><p className="text-sm font-medium text-slate-900">{grade.subject ?? "Évaluation"}{child ? ` · ${child.first_name}` : ""}</p><p className="text-xs text-slate-500">{grade.title ?? "Résultat"} · {grade.assessment_date ? dateLabel(grade.assessment_date) : "Date non précisée"}</p></div>
                    <span className="shrink-0 rounded-lg bg-sky-50 px-3 py-2 text-sm font-bold text-sky-800">{grade.score}{grade.max_score ? `/${grade.max_score}` : "/20"}</span>
                  </div>
                }) : <p className="px-4 py-5 text-sm text-slate-500">Aucune note publiée pour cette sélection.</p>}
              </section>}
            </div>

            <div className="space-y-4">
              {financeChildren.length > 0 && <section>
                <div className="parent-surface-title"><h2>Scolarité et paiements</h2><Link href="/parents/paiements" className="text-sm font-medium text-blue-700">Détails</Link></div>
                <div className="p-4">
                  <p className="text-xs text-slate-500">Reste à régler par la famille</p><p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{money(totalDue)}</p>
                  {visibleSchedules.length > 0 ? <>
                    <div className="my-3 h-1.5 overflow-hidden bg-slate-100"><div className="h-full bg-blue-700" style={{ width: `${completion}%` }} /></div>
                    <div className="flex justify-between gap-3 text-xs text-slate-500"><span>Réglé <b className="font-medium text-slate-800">{money(totalPaid)}</b></span><span>Total <b className="font-medium text-slate-800">{money(totalAnnual)}</b></span></div>
                  </> : <p className="mt-2 text-xs text-slate-500">Aucune échéance financière disponible.</p>}
                </div>
              </section>}

              {academicChildren.length > 0 && <section>
                <div className="parent-surface-title"><h2>Travail à venir</h2><Link href="/parents/cahier-de-textes?tab=homework" className="text-sm font-medium text-blue-700">Tous les devoirs</Link></div>
                {classHomework.length ? classHomework.map(item => <div key={item.id} className="parent-list-row">
                  <div className="min-w-0 flex-1"><p className="text-sm font-medium text-slate-900">{item.subject} · {item.title}</p><p className="text-xs text-slate-500">{item.due_date ? `À rendre le ${dateLabel(item.due_date)}` : "Date de remise non précisée"}</p></div>
                </div>) : <p className="px-4 py-5 text-sm text-slate-500">Aucun devoir publié pour cette sélection.</p>}
              </section>}

              <section>
                <div className="parent-surface-title"><h2>Agenda</h2><Link href="/parents/evenements" className="text-sm font-medium text-blue-700">Tout voir</Link></div>
                {upcoming.length ? upcoming.map(event => {
                  const date = new Date(event.starts_at)
                  return <div key={event.id} className="parent-list-row">
                    <div className="w-11 shrink-0 border-r border-slate-200 pr-3 text-center"><p className="text-[11px] text-slate-500">{date.toLocaleDateString("fr-FR", { month: "short" })}</p><p className="text-lg font-semibold leading-5 text-slate-800">{date.getDate()}</p></div>
                    <div className="min-w-0 flex-1"><p className="text-sm font-medium text-slate-900">{event.title}</p><p className="text-xs text-slate-500">{dateLabel(event.starts_at)}{event.location ? ` · ${event.location}` : ""}</p></div>
                  </div>
                }) : <p className="px-4 py-5 text-sm text-slate-500">Aucun événement à venir.</p>}
              </section>

              <section className="p-4">
                <div className="flex items-start gap-3"><FileText className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" /><div><h2>Documents scolaires</h2><p className="mt-1 text-sm text-slate-500">Retrouvez les bulletins et les documents transmis par l’établissement.</p><Link href="/parents/documents" className="mt-2 inline-flex min-h-9 items-center text-sm font-medium text-blue-700">Accéder aux documents <ArrowRight className="ml-1 h-4 w-4" /></Link></div></div>
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function UsersIcon() {
  return <CalendarDays className="h-5 w-5 text-blue-700" />
}
