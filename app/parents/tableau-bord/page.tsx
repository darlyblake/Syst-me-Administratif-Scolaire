"use client"

import Link from "next/link"
import { Bell, CalendarDays, ChevronRight, CreditCard, GraduationCap, RefreshCw, UserX, Users } from "lucide-react"
import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { useAuthentification } from "@/providers/authentification.provider"
import { useParentPortal } from "@/hooks/use-parent-portal"
import { ParentPageHeader } from "@/components/parent/ParentPageHeader"
import { ParentEmptyState } from "@/components/parent/ParentEmptyState"

const money = (n: number) => new Intl.NumberFormat("fr-FR").format(n) + " FCFA"

export default function ParentsDashboard() {
  const { utilisateur } = useAuthentification()
  const { loading, error, refresh, children, grades, payments, attendance, notifications, events } = useParentPortal()
  const academicIds = useMemo(() => new Set(children.filter((c) => c.can_view_academic).map((c) => c.id)), [children])
  const financeIds = useMemo(() => new Set(children.filter((c) => c.can_view_finance).map((c) => c.id)), [children])
  const visibleGrades = grades.filter((g) => academicIds.has(g.student_id))
  const visibleAttendance = attendance.filter((a) => academicIds.has(a.student_id) && a.status !== "present")
  const visiblePayments = payments.filter((p) => { const c = children.find((x) => x.enrollment_id === p.enrollment_id); return !!c && financeIds.has(c.id) })
  const upcoming = events.filter((e) => Date.parse(e.starts_at) >= Date.now()).sort((a,b) => Date.parse(a.starts_at)-Date.parse(b.starts_at)).slice(0,4)
  const unread = notifications.filter((n) => !n.read_at).length
  const totalPaid = visiblePayments.reduce((s,p) => s+p.amount,0)

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center text-sm text-pierre"><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Chargement de votre espace parent…</div>

  return (
    <div className="space-y-7">
      <ParentPageHeader eyebrow="Espace parent" title={utilisateur?.nomUtilisateur ? `Bonjour, ${utilisateur.nomUtilisateur}` : "Bonjour"} description="Un aperçu simple de la scolarité de vos enfants." onRefresh={() => void refresh()} refreshing={loading} />
      {error && <div className="flex flex-col gap-3 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between"><span>{error}</span><Button variant="outline" size="sm" onClick={() => void refresh()}>Réessayer</Button></div>}

      {children.length === 0 && !error ? (
        <ParentEmptyState title="Aucun enfant associé à votre compte" description="Ajoutez un enfant depuis « Mes enfants » pour commencer à consulter son suivi scolaire." action={<Button asChild><Link href="/parents/enfants">Ajouter un enfant</Link></Button>} />
      ) : (
        <>
          <section className="grid grid-cols-2 divide-x divide-y border-y border-terre/10 bg-papier sm:grid-cols-4 sm:divide-y-0">
            <Summary icon={Users} label="Enfants" value={String(children.length)} href="/parents/enfants" />
            <Summary icon={GraduationCap} label="Notes disponibles" value={String(visibleGrades.length)} href="/parents/notes" />
            <Summary icon={UserX} label="Absences / retards" value={String(visibleAttendance.length)} href="/parents/absences" />
            <Summary icon={Bell} label="À lire" value={String(unread)} href="/parents/notifications" />
          </section>

          <section className="border border-terre/10 bg-papier">
            <div className="flex items-center justify-between border-b border-terre/10 px-5 py-4"><div><h2 className="font-semibold text-terre">Mes enfants</h2><p className="text-sm text-pierre">Leur situation en un coup d’œil.</p></div><Button variant="ghost" size="sm" asChild>Tout voir<ChevronRight className="ml-1 h-4 w-4" /></Button></div>
            <div className="divide-y divide-terre/10">
              {children.map((child) => {
                const childGrades = child.can_view_academic ? grades.filter((g) => g.student_id === child.id) : []
                const avg = childGrades.length ? childGrades.reduce((s,g) => s+g.score,0)/childGrades.length : null
                const issues = child.can_view_academic ? attendance.filter((a) => a.student_id === child.id && a.status !== "present").length : null
                return <div key={child.id} className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-terre text-xs font-bold text-white">{child.first_name[0]}{child.last_name[0]}</div><div className="min-w-0"><p className="truncate font-semibold text-terre">{child.first_name} {child.last_name}</p><p className="text-sm text-pierre">{child.class_name ?? "Classe non attribuée"}</p></div></div>
                  <div className="grid grid-cols-3 gap-6 text-sm lg:min-w-[330px]"><Metric label="Moyenne" value={avg === null ? "—" : avg.toFixed(1)+"/20"} /><Metric label="Incidents" value={issues === null ? "—" : String(issues)} /><Metric label="Accès" value={child.can_view_finance ? "Scolarité" : child.can_view_academic ? "Scolaire" : "Limité"} /></div>
                  <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" asChild><Link href={`/parents/notes?eleve=${child.id}`}>Résultats</Link></Button>{child.can_view_finance && <Button size="sm" variant="outline" asChild><Link href={`/parents/paiements?eleve=${child.id}`}>Paiements</Link></Button>}</div>
                </div>
              })}
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <InfoList title="Notifications récentes" href="/parents/notifications" items={notifications.slice(0,4).map((n) => ({ id:n.id, title:n.title, detail:n.body, date:n.created_at }))} empty="Aucune notification." />
            <InfoList title="Prochains événements" href="/parents/evenements" items={upcoming.map((e) => ({ id:e.id, title:e.title, detail:e.location ?? "Établissement", date:e.starts_at }))} empty="Aucun événement à venir." />
          </div>

          {financeIds.size > 0 && <section className="flex flex-col gap-3 border-y border-terre/10 bg-papier px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-terre">Paiements enregistrés</p><p className="text-sm text-pierre">Total des paiements visibles pour votre compte.</p></div><div className="flex items-center gap-4"><span className="font-bold text-terre">{money(totalPaid)}</span><Button size="sm" variant="outline" asChild><Link href="/parents/paiements">Voir l’historique</Link></Button></div></section>}

          <section><h2 className="mb-3 text-base font-semibold text-terre">Accès rapides</h2><div className="grid border border-terre/10 bg-papier sm:grid-cols-2 lg:grid-cols-4">{[
            ["/parents/notes","Résultats",GraduationCap],[ "/parents/absences","Présences",UserX],[ "/parents/cahier-de-textes","Cahier de textes",CalendarDays],[ "/parents/messages","Messages",CreditCard]
          ].map(([href,label,Icon]) => <Link key={String(href)} href={String(href)} className="flex items-center gap-3 border-b border-terre/10 px-4 py-4 text-sm font-medium text-terre hover:bg-creme sm:border-l lg:border-b-0 lg:border-l first:sm:border-l-0 first:lg:border-l-0"><Icon className="h-4 w-4" />{String(label)}</Link>)}</div></section>
        </>
      )}
    </div>
  )
}

function Summary({ icon: Icon, label, value, href }: { icon: typeof Users; label: string; value: string; href: string }) {
  return <Link href={href} className="px-4 py-4 hover:bg-creme"><Icon className="h-4 w-4 text-terre" /><p className="mt-2 text-xs text-pierre">{label}</p><p className="mt-0.5 text-xl font-bold text-terre">{value}</p></Link>
}
function Metric({ label, value }: { label:string; value:string }) { return <div><p className="text-xs text-pierre">{label}</p><p className="mt-1 font-semibold text-terre">{value}</p></div> }
function InfoList({ title, href, items, empty }: { title:string; href:string; items:{id:string;title:string;detail:string;date:string}[]; empty:string }) {
  return <section className="border border-terre/10 bg-papier"><div className="flex items-center justify-between border-b border-terre/10 px-5 py-4"><h2 className="font-semibold text-terre">{title}</h2><Button variant="ghost" size="sm" asChild><Link href={href}>Voir tout</Link></Button></div>{items.length ? <div className="divide-y divide-terre/10">{items.map((item)=><Link key={item.id} href={href} className="block px-5 py-3 hover:bg-creme"><p className="truncate text-sm font-medium text-terre">{item.title}</p><p className="mt-0.5 line-clamp-1 text-xs text-pierre">{item.detail}</p><p className="mt-1 text-[11px] text-pierre">{new Date(item.date).toLocaleString("fr-FR")}</p></Link>)}</div> : <p className="px-5 py-8 text-sm text-pierre">{empty}</p>}</section>
}
