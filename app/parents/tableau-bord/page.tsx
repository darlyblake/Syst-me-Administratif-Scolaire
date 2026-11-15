"use client"

import Link from "next/link"
import { useMemo } from "react"
import { AlertCircle, CalendarDays, ChevronRight, ClipboardList, RefreshCw, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuthentification } from "@/providers/authentification.provider"
import { useParentPortal } from "@/hooks/use-parent-portal"
import { ParentEmptyState } from "@/components/parent/ParentEmptyState"

const dateLabel = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "Date indisponible" : new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(date)
}
const money = (value: number) => new Intl.NumberFormat("fr-FR").format(value) + " FCFA"

export default function ParentsDashboard() {
  const { utilisateur } = useAuthentification()
  const { loading, error, refresh, children, grades, attendance, events, paymentSchedules } = useParentPortal()
  const academicChildren = useMemo(() => children.filter(child => child.can_view_academic), [children])
  const visibleGrades = useMemo(() => grades.filter(grade => academicChildren.some(child => child.id === grade.student_id)), [grades, academicChildren])
  const issues = useMemo(() => attendance.filter(item => item.status !== "present" && academicChildren.some(child => child.id === item.student_id)).sort((a,b) => Date.parse(b.attendance_date)-Date.parse(a.attendance_date)).slice(0,4), [attendance, academicChildren])
  const upcoming = useMemo(() => events.filter(event => Date.parse(event.starts_at) >= Date.now()).sort((a,b) => Date.parse(a.starts_at)-Date.parse(b.starts_at)).slice(0,3), [events])
  const dueSchedules = useMemo(() => paymentSchedules.filter(item => item.amount_due > item.amount_paid).sort((a,b) => Date.parse(a.due_date)-Date.parse(b.due_date)), [paymentSchedules])
  const totalDue = dueSchedules.reduce((sum,item)=>sum+Math.max(0,item.amount_due-item.amount_paid),0)
  const totalAnnual = paymentSchedules.reduce((sum,item)=>sum+item.amount_due,0)
  const totalPaid = paymentSchedules.reduce((sum,item)=>sum+item.amount_paid,0)
  const completion = totalAnnual > 0 ? Math.min(100,Math.round(totalPaid/totalAnnual*100)) : 0

  if (loading) return <div className="flex min-h-[45vh] items-center justify-center text-sm text-slate-500"><RefreshCw className="mr-2 h-4 w-4 animate-spin text-blue-700" />Chargement de votre espace parent…</div>

  return (
    <div className="space-y-5">
      <header className="parent-page-head">
        <div><p className="mb-1 text-xs font-semibold uppercase tracking-wide text-blue-700">Portail des familles</p><h1>{utilisateur?.nomUtilisateur ? `Bonjour, ${utilisateur.nomUtilisateur}` : "Bonjour"}</h1><p className="mt-1 text-sm">Voici les informations importantes concernant vos enfants.</p></div>
        <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}><RefreshCw className="mr-2 h-4 w-4" />Actualiser</Button>
      </header>
      {error && <div role="alert" className="flex flex-col gap-3 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between"><span>{error}</span><Button variant="outline" size="sm" className="bg-white" onClick={() => void refresh()}>Réessayer</Button></div>}
      {!children.length ? <ParentEmptyState title="Aucun enfant associé à votre compte" description="Associez votre enfant depuis « Mes enfants » avec le code ou le QR remis par l’établissement." action={<Button asChild><Link href="/parents/enfants">Associer un enfant</Link></Button>} /> : (
        <div className="parent-two-columns">
          <div className="space-y-5">
            <section>
              <div className="parent-surface-title"><div><h2>À traiter</h2><p className="mt-1 text-xs text-slate-500">Les points qui demandent votre attention.</p></div><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800">{issues.length + dueSchedules.length} éléments</span></div>
              {issues.length || dueSchedules.length ? <div>
                {issues.map(item => { const child=children.find(entry=>entry.id===item.student_id); return <div key={item.id} className="parent-list-row"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-red-50 text-red-700"><AlertCircle className="h-4 w-4"/></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-900">{item.status==="absent"?"Absence à vérifier":"Retard enregistré"}{child? ` — ${child.first_name} ${child.last_name}`:""}</p><p className="text-xs text-slate-500">{dateLabel(item.attendance_date)}{item.reason?` · ${item.reason}`:""}</p></div><Button asChild variant="outline" size="sm"><Link href="/parents/absences">Consulter</Link></Button></div>})}
                {dueSchedules.slice(0,3).map(item => <div key={item.id} className="parent-list-row"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-amber-50 text-amber-700"><Wallet className="h-4 w-4"/></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-900">{item.label || "Échéance de scolarité"}</p><p className="text-xs text-slate-500">{money(Math.max(0,item.amount_due-item.amount_paid))} · échéance {dateLabel(item.due_date)}</p></div><Button asChild variant="outline" size="sm"><Link href="/parents/paiements">Voir</Link></Button></div>)}
              </div> : <p className="px-5 py-6 text-sm text-slate-500">Aucune action urgente pour le moment.</p>}
            </section>

            <section>
              <div className="parent-surface-title"><div><h2>Vos enfants</h2><p className="mt-1 text-xs text-slate-500">Accédez rapidement à leur suivi scolaire.</p></div><Link href="/parents/enfants" className="text-sm font-semibold text-blue-700">Tout voir <ChevronRight className="inline h-4 w-4"/></Link></div>
              {children.map(child => {
                const childGrades=grades.filter(grade=>grade.student_id===child.id)
                const average=childGrades.length?childGrades.reduce((sum,grade)=>sum+grade.score,0)/childGrades.length:null
                const attendanceCount=attendance.filter(item=>item.student_id===child.id&&item.status!=="present").length
                return <div key={child.id} className="parent-list-row">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-800">{child.first_name?.[0]}{child.last_name?.[0]}</div>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-900">{child.first_name} {child.last_name}</p><p className="text-xs text-slate-500">{child.class_name??"Classe non attribuée"}</p></div>
                  <div className="hidden text-right sm:block"><p className="text-[11px] text-slate-500">Moyenne</p><p className="text-sm font-semibold text-slate-900">{child.can_view_academic&&average!==null?`${average.toFixed(1)}/20`:"—"}</p></div>
                  <div className="hidden text-right sm:block"><p className="text-[11px] text-slate-500">Incidents</p><p className="text-sm font-semibold text-slate-900">{child.can_view_academic?attendanceCount:"—"}</p></div>
                  <Button asChild variant="outline" size="sm"><Link href={`/parents/enfants?eleve=${child.id}`}>Dossier</Link></Button>
                </div>
              })}
            </section>
          </div>

          <div className="space-y-5">
            <section>
              <div className="parent-surface-title"><h2>Scolarité et paiements</h2><Link href="/parents/paiements" className="text-sm font-semibold text-blue-700">Détails</Link></div>
              <div className="p-5">
                <p className="text-xs text-slate-500">Reste à régler</p><p className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{money(totalDue)}</p>
                <div className="my-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-700" style={{width:`${completion}%`}}/></div>
                <div className="flex justify-between gap-3 text-xs text-slate-500"><span>Réglé <b className="text-slate-800">{money(totalPaid)}</b></span><span>Total <b className="text-slate-800">{money(totalAnnual)}</b></span></div>
                {!paymentSchedules.length&&<p className="mt-3 text-xs text-slate-500">Aucune échéance disponible pour le moment.</p>}
              </div>
            </section>
            <section>
              <div className="parent-surface-title"><div><h2>Agenda</h2><p className="mt-1 text-xs text-slate-500">Les prochains rendez-vous.</p></div><Link href="/parents/evenements" className="text-sm font-semibold text-blue-700">Voir tout</Link></div>
              {upcoming.length?upcoming.map(event=><div key={event.id} className="parent-list-row"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-800"><CalendarDays className="h-4 w-4"/></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-900">{event.title}</p><p className="text-xs text-slate-500">{dateLabel(event.starts_at)}{event.location?` · ${event.location}`:""}</p></div></div>):<p className="px-5 py-6 text-sm text-slate-500">Aucun événement à venir.</p>}
            </section>
            <section>
              <div className="parent-surface-title"><h2>Résultats récents</h2><Link href="/parents/notes" className="text-sm font-semibold text-blue-700">Voir tout</Link></div>
              {visibleGrades.slice(0,3).map(grade=>{const child=children.find(entry=>entry.id===grade.student_id);return <div key={grade.id} className="parent-list-row"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-800"><ClipboardList className="h-4 w-4"/></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-900">{grade.subject??grade.title??"Évaluation"}</p><p className="text-xs text-slate-500">{child?.first_name} {child?.last_name}</p></div><span className="text-sm font-bold text-slate-900">{grade.score}/{grade.max_score??20}</span></div>})}
              {!visibleGrades.length&&<p className="px-5 py-6 text-sm text-slate-500">Aucun résultat publié pour le moment.</p>}
            </section>
          </div>
        </div>
      )}
    </div>
  )
}
